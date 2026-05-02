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
    $folio = $_GET['folio'] ?? null;
    if (!$folio) {
        throw new Exception('Folio requerido');
    }

    // Buscar equipo
    $stmtTeam = $pdo->prepare("
        SELECT * FROM teams WHERE folio = ?
    ");
    $stmtTeam->execute([$folio]);
    $team = $stmtTeam->fetch();

    if (!$team) {
        throw new Exception('Registro no encontrado');
    }

    // Obtener miembros
    $stmtMembers = $pdo->prepare("
        SELECT member_number, member_name, is_captain
        FROM team_members
        WHERE team_id = ?
        ORDER BY member_number ASC
    ");
    $stmtMembers->execute([$team['id']]);
    $members = $stmtMembers->fetchAll();

    // Obtener robots
    $stmtRobots = $pdo->prepare("
        SELECT robot_number, robot_name, category, robot_price
        FROM robots
        WHERE team_id = ?
        ORDER BY robot_number ASC
    ");
    $stmtRobots->execute([$team['id']]);
    $robots = $stmtRobots->fetchAll();

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
