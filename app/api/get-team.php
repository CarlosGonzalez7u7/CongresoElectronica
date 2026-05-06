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

    // Fallback: si el folio recibido es de solicitud del congreso,
    // resolver el equipo por el correo del usuario asociado a esa solicitud.
    if (!$team) {
        try {
            $stmtFallback = $pdo->prepare("\n                SELECT t.*\n                FROM congress_enrollment_requests cer\n                INNER JOIN platform_users pu ON pu.id = cer.user_id\n                INNER JOIN teams t ON LOWER(TRIM(t.captain_email)) = LOWER(TRIM(pu.email))\n                WHERE cer.request_folio = ?\n                ORDER BY cer.id DESC, t.id DESC\n                LIMIT 1\n            ");
            $stmtFallback->execute([$folio]);
            $team = $stmtFallback->fetch();
        } catch (Throwable $ignored) {
            // Ignorar si las tablas del flujo de congreso no existen en esta instalación.
        }
    }

    // Fallback adicional: usar email del snapshot de perfil de la solicitud.
    if (!$team) {
        try {
            $stmtReq = $pdo->prepare("\n                SELECT profile_snapshot_json\n                FROM congress_enrollment_requests\n                WHERE request_folio = ?\n                ORDER BY id DESC\n                LIMIT 1\n            ");
            $stmtReq->execute([$folio]);
            $profileSnapshotRaw = (string) ($stmtReq->fetchColumn() ?: '');

            if ($profileSnapshotRaw !== '') {
                $profileSnapshot = json_decode($profileSnapshotRaw, true);
                if (is_array($profileSnapshot)) {
                    $emailCandidate = strtolower(trim((string) ($profileSnapshot['email'] ?? '')));
                    if ($emailCandidate !== '') {
                        $stmtByEmail = $pdo->prepare("\n                            SELECT *\n                            FROM teams\n                            WHERE LOWER(TRIM(captain_email)) = ?\n                            ORDER BY id DESC\n                            LIMIT 1\n                        ");
                        $stmtByEmail->execute([$emailCandidate]);
                        $team = $stmtByEmail->fetch();
                    }
                }
            }
        } catch (Throwable $ignored) {
            // No interrumpir flujo principal si este fallback falla.
        }
    }

    if (!$team) {
        throw new Exception('Registro no encontrado');
    }

    // Obtener miembros
    $stmtMembers = $pdo->prepare("\n        SELECT member_number, member_name, is_captain\n        FROM team_members\n        WHERE team_id = ?\n        ORDER BY member_number ASC\n    ");
    $stmtMembers->execute([$team['id']]);
    $members = $stmtMembers->fetchAll();

    // Obtener robots
    $stmtRobots = $pdo->prepare("\n        SELECT robot_number, robot_name, category, robot_price\n        FROM robots\n        WHERE team_id = ?\n        ORDER BY robot_number ASC\n    ");
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
