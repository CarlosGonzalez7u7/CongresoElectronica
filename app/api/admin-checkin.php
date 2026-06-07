<?php
/**
 * API: CHECK-IN DE EQUIPOS Y ROBOTS (STAFF/ADMIN)
 * POST /api/admin-checkin.php
 */

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) throw new Exception('Payload inválido');

    $action = $input['action'] ?? $_GET['action'] ?? null;
    $adminName = $input['admin_name'] ?? 'STAFF';

    // --- Auto-detección inteligente de acción ---
    $recognized_actions = ['team_checkin', 'robot_checkin', 'save_robot_checkin', 'saveRobotCheckin', 'batch_robot_checkin'];
    if (!in_array($action, $recognized_actions)) {
        if (isset($input['robots']) || isset($input['robot_id']) || isset($input['robotId']) || isset($input['arrived'])) {
            $action = 'robot_checkin';
        } elseif (isset($input['team_id']) || isset($input['teamId'])) {
            $action = 'team_checkin';
        }
    }

    // 1. Llegada general del equipo (Recepción)
    if ($action === 'team_checkin') {
        $teamId = (int)($input['team_id'] ?? 0);
        $notes = trim((string)($input['notes'] ?? ''));

        if ($teamId <= 0) throw new Exception('ID de equipo inválido');

        $stmt = $pdo->prepare("
            INSERT INTO participant_checkins (team_id, checked_in_by, notes)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE checkin_at = NOW(), checked_in_by = VALUES(checked_in_by), notes = VALUES(notes)
        ");
        $stmt->execute([$teamId, $adminName, $notes]);

        // Registrar en la auditoría
        try {
            $ip = function_exists('getRealUserIp') ? getRealUserIp() : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
            $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'participant_checkins', ?, ?, ?)")
                ->execute(['TEAM_CHECKIN', $teamId, $ip, json_encode(['notes' => $notes, 'admin' => $adminName])]);
        } catch(Throwable $e) {}

        echo json_encode(['success' => true, 'message' => 'Llegada del equipo registrada en recepción']);
        exit;
    }

    // 2. Inspección del robot (Los pits)
    if (in_array($action, ['robot_checkin', 'save_robot_checkin', 'saveRobotCheckin', 'batch_robot_checkin'])) {
        $teamId = (int)($input['team_id'] ?? $input['teamId'] ?? 0);
        $notes = trim((string)($input['notes'] ?? ''));

        $robots = [];
        if (isset($input['robots'])) {
            $robots = is_string($input['robots']) ? json_decode($input['robots'], true) : $input['robots'];
        } elseif (isset($input['robot_id']) || isset($input['robotId']) || isset($input['id'])) {
            $robots[] = ['robot_id' => $input['robot_id'] ?? $input['robotId'] ?? $input['id'], 'arrived' => $input['arrived'] ?? 0];
        }

        if (empty($robots)) throw new Exception('No se enviaron robots para actualizar en el payload');

        if ($teamId <= 0) {
            // Intenta extraer el team_id del primer robot si no se pasó a nivel general
            $firstRobotId = (int)($robots[0]['robot_id'] ?? $robots[0]['robotId'] ?? $robots[0]['id'] ?? 0);
            if ($firstRobotId > 0) {
                $stmtGetTeam = $pdo->prepare("SELECT team_id FROM robots WHERE id = ?");
                $stmtGetTeam->execute([$firstRobotId]);
                $teamId = (int)$stmtGetTeam->fetchColumn();
            }
            if ($teamId <= 0) throw new Exception('ID de equipo inválido');
        }

        $pdo->beginTransaction();

        $stmtR = $pdo->prepare("SELECT robot_name, category FROM robots WHERE id = ? AND team_id = ?");
        $stmtIns = $pdo->prepare("
            INSERT INTO participant_robot_checkins (team_id, robot_id, arrived, checked_in_by, notes, category_snapshot, robot_name_snapshot)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE arrived = VALUES(arrived), checkin_at = NOW(), checked_in_by = VALUES(checked_in_by), notes = VALUES(notes)
        ");

        foreach ($robots as $r) {
            $robotId = (int)($r['robot_id'] ?? $r['robotId'] ?? $r['id'] ?? 0);
            $arrived = (int)($r['arrived'] ?? 0);
            if ($robotId <= 0) continue;

            $stmtR->execute([$robotId, $teamId]);
            $robotInfo = $stmtR->fetch();
            if ($robotInfo) {
                $stmtIns->execute([$teamId, $robotId, $arrived, $adminName, $notes, $robotInfo['category'], $robotInfo['robot_name']]);
            }
        }

        // Registrar en la auditoría
        try {
            $ip = function_exists('getRealUserIp') ? getRealUserIp() : ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
            $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'participant_robot_checkins', ?, ?, ?)")
                ->execute(['ROBOT_CHECKIN_BATCH', $teamId, $ip, json_encode(['notes' => $notes, 'admin' => $adminName, 'count' => count($robots)])]);
        } catch(Throwable $e) {}

        $pdo->commit();

        echo json_encode(['success' => true, 'message' => 'Inspección del robot actualizada']);
        exit;
    }

    throw new Exception('Acción desconocida: ' . ($action ? htmlspecialchars((string)$action) : 'vacía'));

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}