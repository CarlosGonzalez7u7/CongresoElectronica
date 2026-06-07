<?php
/**
 * API: OBTENER DATOS DEL EQUIPO
 * GET /api/get-team.php?folio=RENOV-...
 *
 * Retorna datos del equipo para mostrar confirmación
 */

require_once __DIR__ . '/../config/database.php';

// Validar método
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

try {
    // Obtener folio
    $folio = isset($_GET['folio']) ? strtoupper(trim((string) $_GET['folio'])) : null;
    if (!$folio) {
        throw new Exception('Folio requerido');
    }

    // Buscar equipo por folio del torneo
    $stmtTeam = $pdo->prepare("\n        SELECT * FROM teams WHERE folio = ?\n    ");
    $stmtTeam->execute([$folio]);
    $team = $stmtTeam->fetch();

    if (!$team) {
        throw new Exception('Registro no encontrado');
    }

    if ($team['payment_status'] !== 'verified') {
        throw new Exception('El equipo aún no ha sido aceptado o su pago está pendiente (Estado: ' . $team['payment_status'] . '). Solo se admiten equipos verificados.');
    }

    // Obtener miembros
    $stmtMembers = $pdo->prepare("\n        SELECT member_number, member_name, is_captain\n        FROM team_members\n        WHERE team_id = ?\n        ORDER BY member_number ASC\n    ");
    $stmtMembers->execute([$team['id']]);
    $members = $stmtMembers->fetchAll();

    // Obtener robots
    $stmtRobots = $pdo->prepare("\n        SELECT r.id, r.robot_number, r.robot_name, r.category, r.robot_price, COALESCE(prc.arrived, 0) AS arrived\n        FROM robots r\n        LEFT JOIN participant_robot_checkins prc ON prc.robot_id = r.id\n        WHERE r.team_id = ?\n        ORDER BY r.robot_number ASC\n    ");
    $stmtRobots->execute([$team['id']]);
    $robots = $stmtRobots->fetchAll(PDO::FETCH_ASSOC);

    foreach ($robots as &$r) {
        $r['id'] = (int)$r['id'];
        $r['arrived'] = (int)$r['arrived'];
    }

    // Obtener etapa actual para mostrar información
    $stages = json_decode(REGISTRATION_STAGES_JSON, true);
    $stageName = $stages[$team['registration_stage']]['name'] ?? 'Desconocida';

    // Calcular total
    $totalCost = count($robots) * $team['registration_price'];

    // Respuesta
    echo json_encode([
        'success' => true,
        'data' => [
            'team' => [
                'id' => $team['id'],
                'folio' => $team['folio'],
                'captain_name' => $team['captain_name'],
                'captain_email' => $team['captain_email'],
                'captain_phone' => $team['captain_phone'],
                'school_name' => $team['school_name'],
                'state_name' => $team['state_name'],
                'country_name' => $team['country_name'],
                'registration_stage' => $stageName,
                'registration_price' => $team['registration_price'],
                'payment_status' => $team['payment_status'],
                'created_at' => $team['created_at']
            ],
            'members' => $members,
            'robots' => $robots,
            'summary' => [
                'total_members' => count($members),
                'total_robots' => count($robots),
                'price_per_robot' => $team['registration_price'],
                'total_cost' => $totalCost
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
