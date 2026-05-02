<?php
/**
 * API: CHECK-IN DE PARTICIPANTES
 * POST /api/admin-checkin.php
 */

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensureCheckinTable($pdo);
    ensureRobotCheckinTable($pdo);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('Payload inválido');
    }

    $arrived = array_key_exists('arrived', $input) ? (bool) $input['arrived'] : true;
    $checkedBy = sanitizeInput($input['checked_by'] ?? 'ADMIN');
    $notes = sanitizeInput($input['notes'] ?? '');

    $teamId = isset($input['team_id']) ? (int) $input['team_id'] : 0;
    $folio = sanitizeInput($input['folio'] ?? '');
    $robotStatuses = isset($input['robot_statuses']) && is_array($input['robot_statuses'])
        ? $input['robot_statuses']
        : null;

    if ($teamId <= 0 && $folio === '') {
        throw new Exception('Se requiere team_id o folio');
    }

    if ($teamId > 0) {
        $stmtTeam = $pdo->prepare("SELECT id, folio FROM teams WHERE id = ?");
        $stmtTeam->execute([$teamId]);
    } else {
        $stmtTeam = $pdo->prepare("SELECT id, folio FROM teams WHERE folio = ?");
        $stmtTeam->execute([$folio]);
    }

    $team = $stmtTeam->fetch();
    if (!$team) {
        throw new Exception('Equipo no encontrado');
    }

    $teamId = (int) $team['id'];
    $folio = $team['folio'];

    $stmtTeamRobots = $pdo->prepare("SELECT id, robot_name, category FROM robots WHERE team_id = ? ORDER BY robot_number ASC, id ASC");
    $stmtTeamRobots->execute([$teamId]);
    $teamRobots = $stmtTeamRobots->fetchAll();

    $robotMap = [];
    foreach ($teamRobots as $robot) {
        $robotMap[(int) $robot['id']] = $robot;
    }

    if ($robotStatuses !== null) {
        $statusMap = [];
        foreach ($robotStatuses as $item) {
            if (!is_array($item)) {
                continue;
            }

            $robotId = isset($item['robot_id']) ? (int) $item['robot_id'] : 0;
            if ($robotId <= 0 || !isset($robotMap[$robotId])) {
                continue;
            }

            $statusMap[$robotId] = [
                'arrived' => !empty($item['arrived']) ? 1 : 0,
                'robot_name' => sanitizeInput($item['robot_name'] ?? $robotMap[$robotId]['robot_name'] ?? ''),
                'category' => sanitizeInput($item['category'] ?? $robotMap[$robotId]['category'] ?? ''),
            ];
        }

        foreach ($teamRobots as $robot) {
            $robotId = (int) $robot['id'];
            $status = $statusMap[$robotId] ?? [
                'arrived' => $arrived ? 1 : 0,
                'robot_name' => sanitizeInput($robot['robot_name'] ?? ''),
                'category' => sanitizeInput($robot['category'] ?? ''),
            ];

            upsertRobotCheckin(
                $pdo,
                $teamId,
                $robotId,
                (int) $status['arrived'],
                $checkedBy,
                $notes,
                $status['category'],
                $status['robot_name']
            );
        }

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM participant_robot_checkins WHERE team_id = ? AND arrived = 1");
        $stmtCount->execute([$teamId]);
        $arrivedRobots = (int) $stmtCount->fetchColumn();

        $arrived = $arrivedRobots > 0;
        if ($arrived) {
            upsertTeamCheckin($pdo, $teamId, $checkedBy, $notes);
        } else {
            removeTeamCheckin($pdo, $teamId);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Check-in por robot actualizado',
            'data' => [
                'team_id' => $teamId,
                'folio' => $folio,
                'arrived' => $arrived,
                'arrived_robots_count' => $arrivedRobots,
                'total_robots' => count($teamRobots),
            ],
        ]);
        exit;
    }

    if ($arrived) {
        upsertTeamCheckin($pdo, $teamId, $checkedBy, $notes);

        foreach ($teamRobots as $robot) {
            upsertRobotCheckin(
                $pdo,
                $teamId,
                (int) $robot['id'],
                1,
                $checkedBy,
                $notes,
                sanitizeInput($robot['category'] ?? ''),
                sanitizeInput($robot['robot_name'] ?? '')
            );
        }

        echo json_encode([
            'success' => true,
            'message' => 'Llegada registrada correctamente',
            'data' => [
                'team_id' => $teamId,
                'folio' => $folio,
                'arrived' => true,
                'arrived_robots_count' => count($teamRobots),
                'total_robots' => count($teamRobots),
            ],
        ]);
        exit;
    }

    removeTeamCheckin($pdo, $teamId);
    $stmtReset = $pdo->prepare("UPDATE participant_robot_checkins SET arrived = 0, checkin_at = NOW(), checked_in_by = ?, notes = ? WHERE team_id = ?");
    $stmtReset->execute([$checkedBy, $notes, $teamId]);

    echo json_encode([
        'success' => true,
        'message' => 'Llegada removida',
        'data' => [
            'team_id' => $teamId,
            'folio' => $folio,
            'arrived' => false,
            'arrived_robots_count' => 0,
            'total_robots' => count($teamRobots),
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}

function ensureCheckinTable($pdo) {
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS participant_checkins (\n            id INT AUTO_INCREMENT PRIMARY KEY,\n            team_id INT NOT NULL,\n            checkin_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n            checked_in_by VARCHAR(150) DEFAULT 'ADMIN',\n            notes TEXT,\n            UNIQUE KEY unique_team_checkin (team_id),\n            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci\n    ");
}

function ensureRobotCheckinTable($pdo) {
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS participant_robot_checkins (\n            id INT AUTO_INCREMENT PRIMARY KEY,\n            team_id INT NOT NULL,\n            robot_id INT NOT NULL,\n            arrived TINYINT(1) NOT NULL DEFAULT 0,\n            checkin_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n            checked_in_by VARCHAR(150) DEFAULT 'ADMIN',\n            notes TEXT,\n            category_snapshot VARCHAR(120) NULL,\n            robot_name_snapshot VARCHAR(180) NULL,\n            UNIQUE KEY unique_robot_checkin (robot_id),\n            KEY idx_robot_team (team_id),\n            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,\n            FOREIGN KEY (robot_id) REFERENCES robots(id) ON DELETE CASCADE\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci\n    ");
}

function upsertTeamCheckin($pdo, $teamId, $checkedBy, $notes) {
    $stmtCheckin = $pdo->prepare("\n        INSERT INTO participant_checkins (team_id, checkin_at, checked_in_by, notes)\n        VALUES (?, NOW(), ?, ?)\n        ON DUPLICATE KEY UPDATE\n            checkin_at = NOW(),\n            checked_in_by = VALUES(checked_in_by),\n            notes = VALUES(notes)\n    ");
    $stmtCheckin->execute([$teamId, $checkedBy, $notes]);
}

function removeTeamCheckin($pdo, $teamId) {
    $stmtDelete = $pdo->prepare("DELETE FROM participant_checkins WHERE team_id = ?");
    $stmtDelete->execute([$teamId]);
}

function upsertRobotCheckin($pdo, $teamId, $robotId, $arrived, $checkedBy, $notes, $categorySnapshot, $robotNameSnapshot) {
    $stmtRobot = $pdo->prepare("\n        INSERT INTO participant_robot_checkins (\n            team_id, robot_id, arrived, checkin_at, checked_in_by, notes, category_snapshot, robot_name_snapshot\n        ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)\n        ON DUPLICATE KEY UPDATE\n            team_id = VALUES(team_id),\n            arrived = VALUES(arrived),\n            checkin_at = NOW(),\n            checked_in_by = VALUES(checked_in_by),\n            notes = VALUES(notes),\n            category_snapshot = VALUES(category_snapshot),\n            robot_name_snapshot = VALUES(robot_name_snapshot)\n    ");

    $stmtRobot->execute([
        $teamId,
        $robotId,
        $arrived,
        $checkedBy,
        $notes,
        $categorySnapshot,
        $robotNameSnapshot,
    ]);
}
