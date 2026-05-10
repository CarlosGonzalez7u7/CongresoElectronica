<?php
/**
 * API: GESTIÓN DE INSCRIPCIONES AL CONGRESO (ADMIN)
 * GET  /api/admin-congress-requests.php           → listar solicitudes
 * POST /api/admin-congress-requests.php           → aprobar / rechazar / pedir reenvío
 */

require_once __DIR__ . '/../config/database.php';

ensureCongressRequestsTable($pdo);

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $status = $_GET['status'] ?? 'all';
        echo json_encode(['success' => true, 'data' => listRequests($pdo, $status)]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) throw new Exception('Payload inválido');

        $action    = $input['action'] ?? '';
        $requestId = (int) ($input['request_id'] ?? 0);

        if (!$requestId) throw new Exception('request_id requerido');

        $request = getRequest($pdo, $requestId);
        if (!$request) throw new Exception('Solicitud no encontrada');

        if ($action === 'approve') {
            approveRequest($pdo, $request, $input);
            logAuditCongress($pdo, 'CONGRESS_APPROVED', $requestId, $input['admin_notes'] ?? 'Aprobado');
            echo json_encode(['success' => true, 'message' => 'Solicitud aprobada']);
            exit;
        }

        if ($action === 'reject') {
            rejectRequest($pdo, $request, $input);
            logAuditCongress($pdo, 'CONGRESS_REJECTED', $requestId, $input['rejection_reason'] ?? 'Rechazado');
            echo json_encode(['success' => true, 'message' => 'Solicitud rechazada']);
            exit;
        }

        if ($action === 'request_resubmit') {
            resubmitRequest($pdo, $request, $input);
            logAuditCongress($pdo, 'CONGRESS_RESUBMIT_REQUESTED', $requestId, $input['admin_notes'] ?? 'Reenvío solicitado');
            echo json_encode(['success' => true, 'message' => 'Solicitud de reenvío registrada']);
            exit;
        }

        if ($action === 'set_pending') {
            setPending($pdo, $request, $input);
            logAuditCongress($pdo, 'CONGRESS_SET_PENDING', $requestId, $input['admin_notes'] ?? 'Regresado a pendiente');
            echo json_encode(['success' => true, 'message' => 'Solicitud regresada a pendiente']);
            exit;
        }

        if ($action === 'update_robotics') {
            updateRobotics($pdo, $request, $input);
            logAuditCongress($pdo, 'CONGRESS_ROBOTICS_UPDATED', $requestId, 'Robots/integrantes actualizados');
            echo json_encode(['success' => true, 'message' => 'Datos de robótica actualizados']);
            exit;
        }

        throw new Exception('Acción no reconocida');
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// ─── Queries ────────────────────────────────────────────────

function listRequests(PDO $pdo, string $status): array
{
    $sql = "
        SELECT
            cer.id AS request_id,
            cer.user_id,
            cer.congress_year,
            cer.request_folio,
            cer.includes_congress,
            cer.includes_robotics,
            cer.includes_camp,
            cer.congress_fee,
            cer.robotics_fee,
            cer.camp_fee,
            cer.total_fee,
            cer.status,
            cer.receipt_path,
            cer.receipt_filename,
            cer.receipt_uploaded_at,
            cer.admin_notes,
            cer.rejection_reason,
            cer.reviewed_at,
            cer.created_at,
            cer.robots_snapshot_json,
            cer.members_snapshot_json,
            cer.profile_snapshot_json,
            -- Datos del usuario
            pu.full_name,
            pu.email,
            pu.phone,
            pu.school,
            pu.career,
            pu.semester,
            pu.country,
            pu.city,
            pu.matricula,
            pu.control_number,
            -- Equipo vinculado (si existe en tabla teams)
            (SELECT t.id FROM teams t WHERE t.captain_email = pu.email ORDER BY t.id DESC LIMIT 1) AS team_db_id,
            (SELECT t.folio FROM teams t WHERE t.captain_email = pu.email ORDER BY t.id DESC LIMIT 1) AS team_folio,
            (SELECT t.payment_status FROM teams t WHERE t.captain_email = pu.email ORDER BY t.id DESC LIMIT 1) AS team_payment_status,
            -- Robots en tabla robots (puede ser 0 si el flujo fue solo por congreso)
            (SELECT COUNT(*) FROM robots r
             INNER JOIN teams t ON t.id = r.team_id
             WHERE t.captain_email = pu.email) AS robot_count_db,
            (SELECT SUM(r.robot_price) FROM robots r
             INNER JOIN teams t ON t.id = r.team_id
             WHERE t.captain_email = pu.email) AS robots_total_cost
        FROM congress_enrollment_requests cer
        INNER JOIN platform_users pu ON pu.id = cer.user_id
    ";

    $params = [];
    if ($status !== 'all') {
        $sql .= " WHERE cer.status = ?";
        $params[] = $status;
    }

    $sql .= " ORDER BY cer.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['includes_congress'] = (bool) $r['includes_congress'];
        $r['includes_robotics'] = (bool) $r['includes_robotics'];
        $r['includes_camp']     = (bool) $r['includes_camp'];
        $r['congress_fee']      = (float) $r['congress_fee'];
        $r['robotics_fee']      = (float) $r['robotics_fee'];
        $r['camp_fee']          = (float) $r['camp_fee'];
        $r['total_fee']         = (float) $r['total_fee'];
        $r['robots_total_cost'] = (float) ($r['robots_total_cost'] ?? 0);

        // ── Decodificar snapshots ──────────────────────────────────────────
        $robotsSnapshot  = decodeJsonColumn($r['robots_snapshot_json']  ?? null);
        $membersSnapshot = decodeJsonColumn($r['members_snapshot_json'] ?? null);
        $profileSnapshot = decodeJsonColumn($r['profile_snapshot_json'] ?? null);

        // Complementar datos de usuario con el snapshot si la tabla platform_users
        // no tiene el campo completo (ej. phone puede estar solo en el snapshot)
        if (empty($r['phone']) && !empty($profileSnapshot['phone'])) {
            $r['phone'] = $profileSnapshot['phone'];
        }

        // ── Robots: usar snapshot como fuente primaria ────────────────────
        $robotCountFromDb = (int) ($r['robot_count_db'] ?? 0);

        if (!empty($robotsSnapshot)) {
            // Enriquecer snapshot con IDs reales de la tabla robots si existen
            if ($robotCountFromDb > 0 && !empty($r['team_db_id'])) {
                $stmtRobots = $pdo->prepare(
                    "SELECT id, robot_name, category, robot_number FROM robots WHERE team_id = ? ORDER BY robot_number ASC"
                );
                $stmtRobots->execute([(int)$r['team_db_id']]);
                $dbRobots = $stmtRobots->fetchAll(PDO::FETCH_ASSOC);

                foreach ($robotsSnapshot as $idx => $snap) {
                    if (isset($dbRobots[$idx])) {
                        $robotsSnapshot[$idx]['id']         = (int) $dbRobots[$idx]['id'];
                        $robotsSnapshot[$idx]['robot_name'] = $robotsSnapshot[$idx]['name'] ?? $dbRobots[$idx]['robot_name'];
                    }
                }
            }
            $r['robots']      = $robotsSnapshot;
            $r['robot_count'] = count($robotsSnapshot);
        } else {
            // Fallback: leer desde tabla robots si existe el equipo
            if ($robotCountFromDb > 0 && !empty($r['team_db_id'])) {
                $stmtRobots = $pdo->prepare(
                    "SELECT id, robot_name, category, robot_number FROM robots WHERE team_id = ? ORDER BY robot_number ASC"
                );
                $stmtRobots->execute([(int)$r['team_db_id']]);
                $r['robots'] = $stmtRobots->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $r['robots'] = [];
            }
            $r['robot_count'] = count($r['robots']);
        }

        // ── Integrantes: snapshot + enriquecimiento desde BD ────────────────
        $normalizeMember = function (mixed $m): array {
            if (is_string($m)) {
                $name = trim($m);
                return ['member_name' => $name, 'name' => $name, 'is_captain' => false];
            }
            if (is_array($m)) {
                $name = trim((string)($m['member_name'] ?? $m['name'] ?? ''));
                return [
                    'id'          => isset($m['id']) ? (int)$m['id'] : null,
                    'member_name' => $name,
                    'name'        => $name,
                    'is_captain'  => !empty($m['is_captain']) || !empty($m['isCaptain']),
                ];
            }
            return ['member_name' => '', 'name' => '', 'is_captain' => false];
        };

        if (!empty($membersSnapshot)) {
            $membersSnapshot = array_values(array_map($normalizeMember, $membersSnapshot));

            if (!empty($r['team_db_id'])) {
                $stmtMembers = $pdo->prepare(
                    "SELECT id, member_name, is_captain FROM team_members WHERE team_id = ? ORDER BY member_number ASC"
                );
                $stmtMembers->execute([(int)$r['team_db_id']]);
                $dbMembers = $stmtMembers->fetchAll(PDO::FETCH_ASSOC);

                foreach ($membersSnapshot as $idx => $snap) {
                    if (isset($dbMembers[$idx])) {
                        $membersSnapshot[$idx]['id']         = (int)$dbMembers[$idx]['id'];
                        $membersSnapshot[$idx]['is_captain'] = (bool)$dbMembers[$idx]['is_captain'];
                        if ($membersSnapshot[$idx]['member_name'] === '') {
                            $membersSnapshot[$idx]['member_name'] = $dbMembers[$idx]['member_name'];
                            $membersSnapshot[$idx]['name']        = $dbMembers[$idx]['member_name'];
                        }
                    }
                }
            }
            $r['members'] = $membersSnapshot;
        } else {
            if (!empty($r['team_db_id'])) {
                $stmtMembers = $pdo->prepare(
                    "SELECT id, member_name, is_captain FROM team_members WHERE team_id = ? ORDER BY member_number ASC"
                );
                $stmtMembers->execute([(int)$r['team_db_id']]);
                $r['members'] = $stmtMembers->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $r['members'] = [];
            }
        }

        // Limpiar columnas JSON crudas del output
        unset($r['robots_snapshot_json'], $r['members_snapshot_json'], $r['profile_snapshot_json'], $r['robot_count_db'], $r['team_db_id']);

        // ── Etiqueta del paquete ──────────────────────────────────────────
        $pkgParts = [];
        if ($r['includes_congress']) $pkgParts[] = 'Congreso ($' . number_format($r['congress_fee'], 0) . ')';
        if ($r['includes_robotics']) $pkgParts[] = 'Robótica ($' . number_format($r['robotics_fee'], 0) . ')';
        if ($r['includes_camp'])     $pkgParts[] = 'Campamento ($' . number_format($r['camp_fee'], 0) . ')';
        $r['package_label'] = implode(' + ', $pkgParts) ?: 'Solo congreso';
    }

    return $rows;
}

function getRequest(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare("SELECT * FROM congress_enrollment_requests WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX PRINCIPAL: approveRequest ahora materializa robótica cuando corresponde
// ─────────────────────────────────────────────────────────────────────────────
function approveRequest(PDO $pdo, array $request, array $input): void
{
    $notes = trim((string) ($input['admin_notes'] ?? 'Aprobado'));
    $pdo->prepare("
        UPDATE congress_enrollment_requests
        SET status = 'approved', admin_notes = ?, reviewed_at = NOW()
        WHERE id = ?
    ")->execute([$notes, $request['id']]);

    // Obtener perfil completo del usuario (necesario para materializar team)
    $stmtProfile = $pdo->prepare("SELECT * FROM platform_users WHERE id = ? LIMIT 1");
    $stmtProfile->execute([$request['user_id']]);
    $profile = $stmtProfile->fetch() ?: [];

    // ── 1. Actualizar/crear congress_registrations ────────────────────────
    $stmtCheck = $pdo->prepare("SELECT id FROM congress_registrations WHERE user_id = ? AND congress_year = ? LIMIT 1");
    $stmtCheck->execute([$request['user_id'], $request['congress_year']]);
    $existing = $stmtCheck->fetch();

    if ($existing) {
        $pdo->prepare("
            UPDATE congress_registrations
            SET registration_fee = ?, payment_status = 'paid',
                country_snapshot = ?, city_snapshot = ?,
                school_snapshot = ?, matricula_snapshot = ?,
                updated_at = NOW()
            WHERE id = ?
        ")->execute([
            (float) $request['total_fee'],
            (string) ($profile['country'] ?? ''),
            (string) ($profile['city']    ?? ''),
            (string) ($profile['school']  ?? ''),
            ($profile['matricula'] ?? null) ?: null,
            $existing['id'],
        ]);
    } else {
        $pdo->prepare("
            INSERT INTO congress_registrations
                (user_id, congress_year, registration_fee, payment_status,
                 country_snapshot, city_snapshot, school_snapshot, matricula_snapshot)
            VALUES (?, ?, ?, 'paid', ?, ?, ?, ?)
        ")->execute([
            $request['user_id'],
            $request['congress_year'],
            $request['total_fee'],
            (string) ($profile['country']  ?? ''),
            (string) ($profile['city']     ?? ''),
            (string) ($profile['school']   ?? ''),
            ($profile['matricula'] ?? null) ?: null,
        ]);
    }

    // ── 2. Si incluye robótica → materializar team + robots en sus tablas ─
    if ((int) $request['includes_robotics'] === 1) {
        materializeRoboticsTeam($pdo, $request, $profile);
    }
}

/**
 * Crea o actualiza el registro en teams, robots, team_members y payment_receipts
 * a partir de los snapshots guardados en congress_enrollment_requests.
 * Esto sincroniza el flujo de "Congreso+Robótica" con el flujo antiguo de
 * robótica independiente, para que admin-dashboard.php los vea correctamente.
 */
function materializeRoboticsTeam(PDO $pdo, array $request, array $profile): void
{
    $robotsSnapshot  = decodeJsonColumn($request['robots_snapshot_json']  ?? '');
    $membersSnapshot = decodeJsonColumn($request['members_snapshot_json'] ?? '');
    $profileSnapshot = decodeJsonColumn($request['profile_snapshot_json'] ?? '');

    // Datos del capitán: platform_users tiene prioridad sobre el snapshot
    $email    = (string) ($profile['email']     ?? $profileSnapshot['email']     ?? '');
    $fullName = (string) ($profile['full_name'] ?? $profileSnapshot['full_name'] ?? '');
    $phone    = (string) ($profile['phone']     ?? $profileSnapshot['phone']     ?? '');
    $school   = (string) ($profile['school']    ?? $profileSnapshot['school']    ?? '');
    $country  = (string) ($profile['country']   ?? $profileSnapshot['country']   ?? 'México');
    $city     = (string) ($profile['city']      ?? $profileSnapshot['city']      ?? '');

    if (!$email) return; // Sin email no podemos crear el team

    // ── Buscar o crear el team ────────────────────────────────────────────
    $stmtTeam = $pdo->prepare("SELECT id FROM teams WHERE captain_email = ? ORDER BY id DESC LIMIT 1");
    $stmtTeam->execute([$email]);
    $team = $stmtTeam->fetch();

    if ($team) {
        $teamId = (int) $team['id'];
        // Solo actualizar el estado de pago; no sobreescribir datos existentes
        $pdo->prepare("UPDATE teams SET payment_status = 'verified' WHERE id = ?")
            ->execute([$teamId]);
    } else {
        // Generar folio único legible
        $nameSlug = strtoupper(substr(preg_replace('/[^A-Z0-9]/', '', strtoupper($fullName)), 0, 4));
        $folio    = ($nameSlug ?: 'TEAM') . '-' . date('ymd') . rand(1000, 9999);

        $pdo->prepare("
            INSERT INTO teams
                (folio, school_name, captain_name, captain_email, captain_phone,
                 country_name, state_name, payment_status, registration_stage)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'verified', 1)
        ")->execute([$folio, $school, $fullName, $email, $phone, $country, $city]);

        $teamId = (int) $pdo->lastInsertId();
    }

    // ── Insertar robots desde snapshot (sin duplicar) ─────────────────────
    if (!empty($robotsSnapshot)) {
        $stmtExistingR = $pdo->prepare("SELECT robot_name, category FROM robots WHERE team_id = ?");
        $stmtExistingR->execute([$teamId]);
        $existingRobots = $stmtExistingR->fetchAll(PDO::FETCH_ASSOC);
        // Clave de deduplicación: nombre+categoría en minúsculas
        $existingKeys = array_map(
            fn($r) => strtolower($r['robot_name'] . '|' . $r['category']),
            $existingRobots
        );

        $robotNumber = count($existingRobots) + 1;
        foreach ($robotsSnapshot as $snap) {
            $robotName = trim((string) ($snap['name'] ?? $snap['robot_name'] ?? ''));
            $category  = trim((string) ($snap['category'] ?? ''));
            if (!$robotName) continue;

            $key = strtolower($robotName . '|' . $category);
            if (in_array($key, $existingKeys, true)) continue; // ya existe, no duplicar

            $pdo->prepare("
                INSERT INTO robots (team_id, robot_number, robot_name, category)
                VALUES (?, ?, ?, ?)
            ")->execute([$teamId, $robotNumber, $robotName, $category]);
            $existingKeys[] = $key;
            $robotNumber++;
        }
    }

    // ── Insertar integrantes desde snapshot (sin duplicar) ────────────────
    if (!empty($membersSnapshot)) {
        $stmtExistingM = $pdo->prepare("SELECT member_name FROM team_members WHERE team_id = ?");
        $stmtExistingM->execute([$teamId]);
        $existingNames = array_column($stmtExistingM->fetchAll(PDO::FETCH_ASSOC), 'member_name');

        // Asegurar que el capitán esté siempre en team_members
        if ($fullName && !in_array($fullName, $existingNames, true)) {
            $pdo->prepare("
                INSERT INTO team_members (team_id, member_number, member_name, is_captain)
                VALUES (?, 1, ?, 1)
            ")->execute([$teamId, $fullName]);
            $existingNames[] = $fullName;
        }

        $memberNum = count($existingNames) + 1;
        foreach ($membersSnapshot as $snap) {
            // El snapshot puede ser array de strings o array de arrays
            $name = is_string($snap)
                ? trim($snap)
                : trim((string) ($snap['member_name'] ?? $snap['name'] ?? ''));

            if (!$name || in_array($name, $existingNames, true)) continue;

            $pdo->prepare("
                INSERT INTO team_members (team_id, member_number, member_name, is_captain)
                VALUES (?, ?, ?, 0)
            ")->execute([$teamId, $memberNum, $name]);
            $existingNames[] = $name;
            $memberNum++;
        }
    }

    // ── Crear/actualizar payment_receipts para que admin-dashboard.php lo vea
    $roboticsFee  = (float) ($request['robotics_fee'] ?? 0);
    $robotCount   = count($robotsSnapshot);
    $pricePerRobot = $robotCount > 0 ? (int) round($roboticsFee / $robotCount) : 0;

    $stmtReceipt = $pdo->prepare("SELECT id FROM payment_receipts WHERE team_id = ? LIMIT 1");
    $stmtReceipt->execute([$teamId]);
    $receipt = $stmtReceipt->fetch();

    if ($receipt) {
        $pdo->prepare("
            UPDATE payment_receipts
            SET total_amount         = ?,
                number_of_robots     = ?,
                approved_robots_count = ?,
                price_per_robot      = ?,
                receipt_path         = ?,
                receipt_filename     = ?,
                upload_date          = ?,
                verification_date    = NOW()
            WHERE team_id = ?
        ")->execute([
            (int) $roboticsFee,
            $robotCount,
            $robotCount,
            $pricePerRobot,
            $request['receipt_path']        ?? null,
            $request['receipt_filename']    ?? null,
            $request['receipt_uploaded_at'] ?? null,
            $teamId,
        ]);
    } else {
        $pdo->prepare("
            INSERT INTO payment_receipts
                (team_id, total_amount, number_of_robots, approved_robots_count,
                 price_per_robot, receipt_path, receipt_filename, upload_date, verification_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ")->execute([
            $teamId,
            (int) $roboticsFee,
            $robotCount,
            $robotCount,
            $pricePerRobot,
            $request['receipt_path']        ?? null,
            $request['receipt_filename']    ?? null,
            $request['receipt_uploaded_at'] ?? null,
        ]);
    }
}

// ─── Resto de acciones (sin cambios) ────────────────────────────────────────

function rejectRequest(PDO $pdo, array $request, array $input): void
{
    $reason = trim((string) ($input['rejection_reason'] ?? 'Comprobante inválido'));
    $pdo->prepare("
        UPDATE congress_enrollment_requests
        SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW()
        WHERE id = ?
    ")->execute([$reason, $request['id']]);
}

function resubmitRequest(PDO $pdo, array $request, array $input): void
{
    $notes = trim((string) ($input['admin_notes'] ?? 'Por favor sube nuevamente tu comprobante'));
    $pdo->prepare("
        UPDATE congress_enrollment_requests
        SET status = 'resubmit_requested', admin_notes = ?, reviewed_at = NOW()
        WHERE id = ?
    ")->execute([$notes, $request['id']]);
}

function setPending(PDO $pdo, array $request, array $input): void
{
    $notes = trim((string) ($input['admin_notes'] ?? ''));
    $pdo->prepare("
        UPDATE congress_enrollment_requests
        SET status = 'pending', admin_notes = ?, rejection_reason = NULL, reviewed_at = NOW()
        WHERE id = ?
    ")->execute([$notes ?: null, $request['id']]);

    // Revertir congress_registrations a pendiente
    $pdo->prepare("
        UPDATE congress_registrations
        SET payment_status = 'pending', updated_at = NOW()
        WHERE user_id = ? AND congress_year = ?
    ")->execute([$request['user_id'], $request['congress_year']]);
}

function updateRobotics(PDO $pdo, array $request, array $input): void
{
    $userId = (int) $request['user_id'];

    $stmtUser = $pdo->prepare("SELECT email FROM platform_users WHERE id = ? LIMIT 1");
    $stmtUser->execute([$userId]);
    $userRow = $stmtUser->fetch();
    if (!$userRow) return;

    $stmtTeam = $pdo->prepare("SELECT id FROM teams WHERE captain_email = ? LIMIT 1");
    $stmtTeam->execute([$userRow['email']]);
    $team = $stmtTeam->fetch();
    if (!$team) return;

    $teamId = (int) $team['id'];

    // Actualizar robots
    if (isset($input['robots']) && is_array($input['robots'])) {
        foreach ($input['robots'] as $rob) {
            $name     = trim((string) ($rob['name'] ?? ''));
            $category = trim((string) ($rob['category'] ?? ''));
            $robotId  = isset($rob['id']) && $rob['id'] ? (int) $rob['id'] : null;

            if ($robotId) {
                $pdo->prepare("UPDATE robots SET robot_name = ?, category = ? WHERE id = ? AND team_id = ?")
                    ->execute([$name, $category, $robotId, $teamId]);
            } elseif ($name) {
                $pdo->prepare("
                    INSERT INTO robots (team_id, robot_name, category, robot_number)
                    VALUES (?, ?, ?, (SELECT COALESCE(MAX(r2.robot_number), 0) + 1 FROM robots r2 WHERE r2.team_id = ?))
                ")->execute([$teamId, $name, $category, $teamId]);
            }
        }
    }

    // Actualizar integrantes (no capitán)
    if (isset($input['members']) && is_array($input['members'])) {
        foreach ($input['members'] as $mem) {
            $name     = trim((string) ($mem['name'] ?? ''));
            $memberId = isset($mem['id']) && $mem['id'] ? (int) $mem['id'] : null;

            if ($memberId) {
                $pdo->prepare("UPDATE team_members SET member_name = ? WHERE id = ? AND team_id = ? AND is_captain = 0")
                    ->execute([$name, $memberId, $teamId]);
            } elseif ($name) {
                $maxNum = $pdo->prepare("SELECT COALESCE(MAX(member_number), 0) + 1 FROM team_members WHERE team_id = ?");
                $maxNum->execute([$teamId]);
                $nextNum = (int) $maxNum->fetchColumn();
                $pdo->prepare("INSERT INTO team_members (team_id, member_number, member_name, is_captain) VALUES (?, ?, ?, 0)")
                    ->execute([$teamId, $nextNum, $name]);
            }
        }
    }
}

function logAuditCongress(PDO $pdo, string $action, int $requestId, string $detail): void
{
    try {
        $ip = getRealUserIp();
        $pdo->prepare("
            INSERT INTO audit_log (action, table_name, record_id, ip_address, changes)
            VALUES (?, 'congress_enrollment_requests', ?, ?, ?)
        ")->execute([$action, $requestId, $ip, json_encode(['notes' => $detail])]);
    } catch (Throwable $ignored) {}
}

function ensureCongressRequestsTable(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS congress_enrollment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        congress_year YEAR NOT NULL DEFAULT 2026,
        includes_congress TINYINT(1) DEFAULT 1,
        includes_robotics TINYINT(1) DEFAULT 0,
        includes_camp TINYINT(1) DEFAULT 0,
        congress_fee DECIMAL(10,2) DEFAULT 400.00,
        robotics_fee DECIMAL(10,2) DEFAULT 0.00,
        camp_fee DECIMAL(10,2) DEFAULT 0.00,
        total_fee DECIMAL(10,2) DEFAULT 400.00,
        receipt_path VARCHAR(500) NULL,
        receipt_filename VARCHAR(300) NULL,
        receipt_uploaded_at TIMESTAMP NULL,
        status ENUM('pending','approved','rejected','resubmit_requested') DEFAULT 'pending',
        admin_notes TEXT NULL,
        rejection_reason TEXT NULL,
        reviewed_at TIMESTAMP NULL,
        reviewed_by_admin_id INT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_year (user_id, congress_year),
        INDEX idx_cer_user (user_id),
        INDEX idx_cer_status (status),
        INDEX idx_cer_year (congress_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    _ensureSnapshotColumns($pdo);
}

function _ensureSnapshotColumns(PDO $pdo): void
{
    $check = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
    );

    $snapshotCols = [
        'request_folio'         => "ALTER TABLE congress_enrollment_requests ADD COLUMN request_folio VARCHAR(50) NULL AFTER congress_year",
        'profile_snapshot_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN profile_snapshot_json LONGTEXT NULL AFTER request_folio",
        'robots_snapshot_json'  => "ALTER TABLE congress_enrollment_requests ADD COLUMN robots_snapshot_json LONGTEXT NULL AFTER profile_snapshot_json",
        'members_snapshot_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN members_snapshot_json LONGTEXT NULL AFTER robots_snapshot_json",
    ];

    foreach ($snapshotCols as $col => $sql) {
        $check->execute(['congress_enrollment_requests', $col]);
        if ((int) $check->fetchColumn() === 0) {
            try { $pdo->exec($sql); } catch (Throwable $ignored) {}
        }
    }
}

// ─── Helper: decodificar columna JSON ────────────────────────────────────────

function decodeJsonColumn($value): array
{
    if (!is_string($value) || trim($value) === '') {
        return [];
    }
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}