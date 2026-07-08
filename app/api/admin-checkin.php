<?php
/**
 * API: CHECK-IN DE EQUIPOS Y ROBOTS (STAFF/ADMIN)
 * POST /api/admin-checkin.php
 */

require_once __DIR__ . '/_auth_common.php';

ensurePlatformUsersTable($pdo);

function assertTeamCaptainCanCheckIn(PDO $pdo, int $teamId): void
{
    $stmt = $pdo->prepare("SELECT captain_email FROM teams WHERE id = ? LIMIT 1");
    $stmt->execute([$teamId]);
    $email = strtolower(trim((string) $stmt->fetchColumn()));
    if ($email === '') {
        return;
    }

    $stmtUser = $pdo->prepare("SELECT id FROM platform_users WHERE LOWER(email) = ? LIMIT 1");
    $stmtUser->execute([$email]);
    $userId = (int) $stmtUser->fetchColumn();
    if ($userId > 0) {
        assertPlatformUserCanParticipate($pdo, $userId, 'el torneo de robotica');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action === 'history') {
        try {
            $stmt = $pdo->prepare("
                SELECT 
                    t.id, t.folio, t.school_name, t.captain_name,
                    pu.account_status AS captain_account_status,
                    pu.admin_status_reason AS captain_block_reason,
                    pu.ban_expires_at AS captain_ban_expires_at,
                    (SELECT COUNT(*) FROM robots r WHERE r.team_id = t.id) as total_robots,
                    COALESCE(rc.arrived_robots_count, 0) AS arrived_robots
                FROM teams t
                LEFT JOIN platform_users pu ON LOWER(pu.email) = LOWER(t.captain_email)
                LEFT JOIN (
                    SELECT team_id, SUM(arrived) AS arrived_robots_count
                    FROM (
                        SELECT team_id, robot_id, MAX(arrived) as arrived 
                        FROM participant_robot_checkins 
                        GROUP BY team_id, robot_id
                    ) unique_prc
                    GROUP BY team_id
                ) rc ON rc.team_id = t.id
                WHERE t.payment_status = 'verified'
                ORDER BY t.created_at DESC
            ");
            $stmt->execute();
            $teams = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stats = ['total' => count($teams), 'completos' => 0, 'incompletos' => 0, 'faltantes' => 0];

            foreach ($teams as &$t) {
                $t['total_robots'] = (int)$t['total_robots'];
                $t['arrived_robots'] = (int)$t['arrived_robots'];
                
                if ($t['total_robots'] > 0) {
                    if ($t['arrived_robots'] === $t['total_robots']) {
                        $t['status'] = 'completo';
                        $stats['completos']++;
                    } elseif ($t['arrived_robots'] > 0) {
                        $t['status'] = 'incompleto';
                        $stats['incompletos']++;
                    } else {
                        $t['status'] = 'faltante';
                        $stats['faltantes']++;
                    }
                } else {
                    $t['status'] = 'sin_robots';
                }
            }
            echo json_encode(['success' => true, 'data' => ['teams' => $teams, 'stats' => $stats]]);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    if (!is_array($input)) {
        $input = $_POST;
    }
    if (empty($input)) {
        throw new Exception('Payload vacío o inválido. Raw: ' . $rawInput);
    }

    // Auto-detect action or fallback
    $action = $input['action'] ?? $_GET['action'] ?? '';
    $adminName = $input['admin_name'] ?? 'STAFF';

    $isRobotCheckin = in_array($action, ['robot_checkin', 'save_robot_checkin', 'saveRobotCheckin', 'batch_robot_checkin'])
                      || isset($input['robots']) || isset($input['robot_id']) || isset($input['robotId']);

    // 1. Inspección del robot (Los pits)
    if ($isRobotCheckin) {
        $teamId = (int)($input['team_id'] ?? $input['teamId'] ?? 0);
        $notes = trim((string)($input['notes'] ?? ''));
        $globalArrived = isset($input['arrived']) ? filter_var($input['arrived'], FILTER_VALIDATE_BOOLEAN) : null;

        $robots = [];
        
        // Si mandaron arreglo de robots
        if (!empty($input['robots'])) {
            $rawRobots = is_string($input['robots']) ? json_decode($input['robots'], true) : $input['robots'];
            if (is_array($rawRobots)) {
                foreach ($rawRobots as $r) {
                    if (is_scalar($r)) {
                        $robots[] = ['id' => (int)$r, 'arrived' => $globalArrived ?? true];
                    } else {
                        $rId = $r['robot_id'] ?? $r['robotId'] ?? $r['id'] ?? 0;
                        $rArr = isset($r['arrived']) ? filter_var($r['arrived'], FILTER_VALIDATE_BOOLEAN) : ($globalArrived ?? true);
                        $robots[] = ['id' => (int)$rId, 'arrived' => $rArr];
                    }
                }
            }
        }
        
        // Si mandaron un solo robot
        if (empty($robots)) {
            $singleId = $input['robot_id'] ?? $input['robotId'] ?? $input['id'] ?? 0;
            if ($singleId) {
                $robots[] = ['id' => (int)$singleId, 'arrived' => $globalArrived ?? true];
            }
        }

        if (empty($robots)) {
            throw new Exception('No se detectaron IDs de robots en la petición. Datos recibidos: ' . json_encode($input));
        }

        if ($teamId <= 0) {
            $stmtGetTeam = $pdo->prepare("SELECT team_id FROM robots WHERE id = ?");
            $stmtGetTeam->execute([$robots[0]['id']]);
            $teamId = (int)$stmtGetTeam->fetchColumn();
            
            if ($teamId <= 0) {
                throw new Exception("No se pudo resolver el ID de equipo para el robot #{$robots[0]['id']}. Es posible que la base de datos no lo tenga vinculado.");
            }
        }

        assertTeamCaptainCanCheckIn($pdo, $teamId);

        $pdo->beginTransaction();

        $stmtR = $pdo->prepare("SELECT robot_name, category FROM robots WHERE id = ? AND team_id = ?");
        $stmtIns = $pdo->prepare("
            INSERT INTO participant_robot_checkins (team_id, robot_id, arrived, checked_in_by, notes, category_snapshot, robot_name_snapshot)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE arrived = VALUES(arrived), checkin_at = NOW(), checked_in_by = VALUES(checked_in_by), notes = VALUES(notes)
        ");

        $procesados = 0;
        foreach ($robots as $r) {
            $robotId = $r['id'];
            $arrivedInt = $r['arrived'] ? 1 : 0;
            
            if ($robotId <= 0) continue;

            $stmtR->execute([$robotId, $teamId]);
            $robotInfo = $stmtR->fetch();
            if ($robotInfo) {
                $stmtIns->execute([$teamId, $robotId, $arrivedInt, $adminName, $notes, $robotInfo['category'], $robotInfo['robot_name']]);
                $procesados++;
            }
        }

        if ($procesados === 0) {
            $pdo->rollBack();
            throw new Exception('Ningún robot coincidió con este equipo en la base de datos.');
        }

        try {
            $ip = function_exists('getRealUserIp') ? getRealUserIp() : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
            $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'participant_robot_checkins', ?, ?, ?)")
                ->execute(['ROBOT_CHECKIN_BATCH', $teamId, $ip, json_encode(['notes' => $notes, 'admin' => $adminName, 'count' => $procesados])]);
        } catch(Throwable $e) {}

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => "Inspección guardada ($procesados robots actualizados)."]);
        exit;
    }

    // 2. Llegada general del equipo (Recepción)
    if (in_array($action, ['team_checkin', 'save_team_checkin']) || isset($input['team_id']) || isset($input['teamId'])) {
        $teamId = (int)($input['team_id'] ?? $input['teamId'] ?? 0);
        $notes = trim((string)($input['notes'] ?? ''));

        if ($teamId <= 0) throw new Exception('ID de equipo inválido para Check-In.');

        assertTeamCaptainCanCheckIn($pdo, $teamId);

        $stmt = $pdo->prepare("
            INSERT INTO participant_checkins (team_id, checked_in_by, notes)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE checkin_at = NOW(), checked_in_by = VALUES(checked_in_by), notes = VALUES(notes)
        ");
        $stmt->execute([$teamId, $adminName, $notes]);

        try {
            $ip = function_exists('getRealUserIp') ? getRealUserIp() : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
            $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'participant_checkins', ?, ?, ?)")
                ->execute(['TEAM_CHECKIN', $teamId, $ip, json_encode(['notes' => $notes, 'admin' => $adminName])]);
        } catch(Throwable $e) {}

        echo json_encode(['success' => true, 'message' => 'Llegada del equipo registrada en recepción.']);
        exit;
    }

    throw new Exception('Acción desconocida en el Payload: ' . json_encode($input));

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}
