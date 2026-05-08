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

    $action = $input['action'] ?? null;
    $adminName = $input['admin_name'] ?? 'STAFF';

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
            $ip = getRealUserIp();
            $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'participant_checkins', ?, ?, ?)")
                ->execute(['TEAM_CHECKIN', $teamId, $ip, json_encode(['notes' => $notes, 'admin' => $adminName])]);
        } catch(Throwable $e) {}

        echo json_encode(['success' => true, 'message' => 'Llegada del equipo registrada en recepción']);
        exit;
    }

    // 2. Inspección del robot (Los pits)
    if ($action === 'robot_checkin') {
        $robotId = (int)($input['robot_id'] ?? 0);
        $teamId = (int)($input['team_id'] ?? 0);
        $arrived = (int)($input['arrived'] ?? 0);
        $notes = trim((string)($input['notes'] ?? ''));

        if ($robotId <= 0 || $teamId <= 0) throw new Exception('ID de robot o equipo inválido');

        // Obtener nombre y categoría actuales para el snapshot histórico
        $stmtR = $pdo->prepare("SELECT robot_name, category FROM robots WHERE id = ? AND team_id = ?");
        $stmtR->execute([$robotId, $teamId]);
        $robot = $stmtR->fetch();

        if (!$robot) throw new Exception('Robot no encontrado en este equipo');

        $stmt = $pdo->prepare("
            INSERT INTO participant_robot_checkins (team_id, robot_id, arrived, checked_in_by, notes, category_snapshot, robot_name_snapshot)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE arrived = VALUES(arrived), checkin_at = NOW(), checked_in_by = VALUES(checked_in_by), notes = VALUES(notes)
        ");
        $stmt->execute([$teamId, $robotId, $arrived, $adminName, $notes, $robot['category'], $robot['robot_name']]);

        // Registrar en la auditoría
        try {
            $ip = getRealUserIp();
            $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'participant_robot_checkins', ?, ?, ?)")
                ->execute(['ROBOT_CHECKIN', $robotId, $ip, json_encode(['arrived' => $arrived, 'notes' => $notes, 'admin' => $adminName])]);
        } catch(Throwable $e) {}

        echo json_encode(['success' => true, 'message' => 'Inspección del robot actualizada']);
        exit;
    }

    throw new Exception('Acción desconocida');

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}