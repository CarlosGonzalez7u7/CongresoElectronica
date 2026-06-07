<?php
/**
 * API: DASHBOARD ADMINISTRATIVO
 * GET /api/admin-dashboard.php
 */

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensureCheckinTable($pdo);
    ensureRobotCheckinTable($pdo);
    ensureApprovedRobotsColumn($pdo);

    $stmtTeams = $pdo->prepare("\n        SELECT\n            t.id, t.folio, t.created_at, t.school_name, t.state_name, t.country_name,\n            t.captain_name, t.captain_email, t.captain_phone,\n            t.registration_stage, t.registration_price, t.payment_status,\n            COALESCE(pr.total_amount, 0) AS total_amount,\n            COALESCE(pr.number_of_robots, 0) AS number_of_robots,\n            COALESCE(pr.approved_robots_count, 0) AS approved_robots_count,\n            pr.price_per_robot, pr.receipt_filename, pr.receipt_path, pr.receipt_size,\n            pr.upload_date, pr.notes AS review_notes,\n            pc.checkin_at, pc.checked_in_by, pc.notes AS checkin_notes,\n            COALESCE(rc.arrived_robots_count, 0) AS arrived_robots_count,\n            (SELECT pu.control_number FROM platform_users pu WHERE pu.email = t.captain_email LIMIT 1) as control_number,\n            (SELECT pu.matricula FROM platform_users pu WHERE pu.email = t.captain_email LIMIT 1) as matricula\n        FROM teams t\n        LEFT JOIN payment_receipts pr ON pr.team_id = t.id\n        LEFT JOIN participant_checkins pc ON pc.team_id = t.id\n        LEFT JOIN (\n            SELECT\n                team_id,\n                SUM(CASE WHEN arrived = 1 THEN 1 ELSE 0 END) AS arrived_robots_count\n            FROM participant_robot_checkins\n            GROUP BY team_id\n        ) rc ON rc.team_id = t.id\n        WHERE t.payment_status = 'verified'\n        ORDER BY t.created_at DESC\n    ");
    $stmtTeams->execute();
    $teams = $stmtTeams->fetchAll();

    $stmtRobots = $pdo->prepare("\n        SELECT\n            r.id, r.team_id, r.robot_number, r.robot_name, r.category, r.robot_price,\n            COALESCE(prc.arrived, 0) AS arrived,\n            prc.checkin_at AS robot_checkin_at,\n            prc.notes AS robot_checkin_notes\n        FROM robots r\n        LEFT JOIN participant_robot_checkins prc ON prc.robot_id = r.id\n        ORDER BY r.team_id ASC, r.robot_number ASC\n    ");
    $stmtRobots->execute();
    $robots = $stmtRobots->fetchAll();

    $stmtMembers = $pdo->prepare("\n        SELECT team_id, member_number, member_name, is_captain\n        FROM team_members\n        ORDER BY team_id ASC, member_number ASC\n    ");
    $stmtMembers->execute();
    $members = $stmtMembers->fetchAll();

    $stmtCategories = $pdo->prepare("\n        SELECT\n            category,\n            COUNT(*) AS robots_count,\n            COUNT(DISTINCT team_id) AS teams_count\n        FROM robots\n        GROUP BY category\n        ORDER BY robots_count DESC, category ASC\n    ");
    $stmtCategories->execute();
    $categoryStats = $stmtCategories->fetchAll();

    $robotsByTeam = [];
    foreach ($robots as $robot) {
        $robot['id'] = (int) $robot['id'];
        $robot['arrived'] = (bool) ($robot['arrived'] ?? 0);
        $teamId = (int) $robot['team_id'];
        if (!isset($robotsByTeam[$teamId])) {
            $robotsByTeam[$teamId] = [];
        }
        $robotsByTeam[$teamId][] = $robot;
    }

    $membersByTeam = [];
    foreach ($members as $member) {
        $teamId = (int) $member['team_id'];
        if (!isset($membersByTeam[$teamId])) {
            $membersByTeam[$teamId] = [];
        }
        $membersByTeam[$teamId][] = $member;
    }

    $resultTeams = [];
    foreach ($teams as $team) {
        $teamId = (int) $team['id'];
        $teamRobots = $robotsByTeam[$teamId] ?? [];
        $arrivedRobotsCount = (int) ($team['arrived_robots_count'] ?? 0);

        $resultTeams[] = [
            'id' => $teamId,
            'folio' => $team['folio'],
            'created_at' => $team['created_at'],
            'school_name' => $team['school_name'],
            'state_name' => $team['state_name'],
            'country_name' => $team['country_name'],
            'captain_name' => $team['captain_name'],
            'captain_email' => $team['captain_email'],
            'captain_phone' => $team['captain_phone'],
            'registration_stage' => $team['registration_stage'],
            'registration_price' => $team['registration_price'],
            'payment_status' => $team['payment_status'],
            'total_amount' => (int) ($team['total_amount'] ?? 0),
            'number_of_robots' => (int) ($team['number_of_robots'] ?? count($teamRobots)),
            'approved_robots_count' => (int) ($team['approved_robots_count'] ?? 0),
            'price_per_robot' => (int) ($team['price_per_robot'] ?? 0),
            'receipt_filename' => $team['receipt_filename'],
            'receipt_path' => $team['receipt_path'],
            'receipt_size' => $team['receipt_size'] !== null ? (int) $team['receipt_size'] : null,
            'upload_date' => $team['upload_date'],
            'review_notes' => $team['review_notes'],
            'arrived' => $arrivedRobotsCount > 0 ? true : ($team['checkin_at'] ? true : false),
            'arrived_robots_count' => $arrivedRobotsCount,
            'checkin_notes' => $team['checkin_notes'],
            'checkin_at' => $team['checkin_at'],
            'checked_in_by' => $team['checked_in_by'],
            'control_number' => $team['control_number'] ?? $team['matricula'] ?? 'N/A',
            'matricula' => $team['matricula'] ?? $team['control_number'] ?? 'N/A',
            'robots' => $teamRobots,
            'members' => $membersByTeam[$teamId] ?? [],
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'teams' => $resultTeams,
            'category_stats' => $categoryStats,
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

function ensureApprovedRobotsColumn($pdo)
{
    $stmt = $pdo->query("SHOW COLUMNS FROM payment_receipts LIKE 'approved_robots_count'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE payment_receipts ADD COLUMN approved_robots_count INT NULL AFTER number_of_robots");
    }
}
