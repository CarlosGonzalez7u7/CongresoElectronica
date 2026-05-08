<?php
/**
 * API: VERIFICAR PAGO (ADMIN)
 * POST /api/verify-payment.php
 * 
 * Endpoint para administradores - verifica pagos subidos
 */

require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400 * 7,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) === 'on',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Validar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$adminId = (int)($_SESSION['admin_id'] ?? 0);

if ($adminId <= 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión de administrador inválida o expirada']);
    exit;
}

try {
    ensureApprovedRobotsColumn($pdo);

    $input = json_decode(file_get_contents('php://input'), true);

    $action = $input['action'] ?? null;
    $teamId = $input['team_id'] ?? null;

    if (!$action || !$teamId) {
        throw new Exception('Datos incompletos');
    }

    // Verificar que el equipo existe
    $stmtTeam = $pdo->prepare("SELECT * FROM teams WHERE id = ?");
    $stmtTeam->execute([$teamId]);
    $team = $stmtTeam->fetch();

    if (!$team) {
        throw new Exception('Equipo no encontrado');
    }

    // ===== ACCIÓN: APROBAR PAGO =====
    if ($action === 'approve') {
        $notes = sanitizeInput($input['notes'] ?? 'Pago verificado');
        $approvedRobots = isset($input['approved_robots_count'])
            ? max(0, (int)$input['approved_robots_count'])
            : null;

        if ($approvedRobots === null) {
            $stmtCountRobots = $pdo->prepare("SELECT COUNT(*) FROM robots WHERE team_id = ?");
            $stmtCountRobots->execute([$teamId]);
            $approvedRobots = (int)$stmtCountRobots->fetchColumn();
        }

        $stmt = $pdo->prepare("
            UPDATE payment_receipts
            SET verification_date = NOW(),
                verified_by = 'ADMIN',
                notes = ?,
                approved_robots_count = ?
            WHERE team_id = ?
        ");
        $stmt->execute([$notes, $approvedRobots, $teamId]);

        $stmtTeam = $pdo->prepare("
            UPDATE teams
            SET payment_status = 'verified'
            WHERE id = ?
        ");
        $stmtTeam->execute([$teamId]);

        // Registrar en audit
            logAudit($pdo, 'PAYMENT_VERIFIED', 'teams', $teamId, null, 'Pago aprobado');

        echo json_encode([
            'success' => true,
            'message' => 'Pago verificado correctamente',
            'folio' => $team['folio'],
            'approved_robots_count' => $approvedRobots
        ]);
    }

    // ===== ACCIÓN: RECHAZAR PAGO =====
    elseif ($action === 'reject') {
        $reason = sanitizeInput($input['reason'] ?? 'Rechazo de pago');
        $approvedRobots = isset($input['approved_robots_count'])
            ? max(0, (int)$input['approved_robots_count'])
            : 0;

        $stmt = $pdo->prepare("
            UPDATE payment_receipts
            SET verification_date = NOW(),
                verified_by = 'ADMIN',
                notes = ?,
                approved_robots_count = ?
            WHERE team_id = ?
        ");
        $stmt->execute([$reason, $approvedRobots, $teamId]);

        $stmtTeam = $pdo->prepare("
            UPDATE teams
            SET payment_status = 'rejected'
            WHERE id = ?
        ");
        $stmtTeam->execute([$teamId]);

        // Registrar en audit
            logAudit($pdo, 'PAYMENT_REJECTED', 'teams', $teamId, null, $reason);

        echo json_encode([
            'success' => true,
            'message' => 'Pago rechazado',
            'folio' => $team['folio']
        ]);
    }

    // ===== ACCIÓN: OBTENER LISTA DE PENDIENTES =====
    elseif ($action === 'list_pending') {
        $stmt = $pdo->prepare("
            SELECT 
                t.id, t.folio, t.captain_name, t.captain_email,
                t.school_name, t.registration_stage, t.registration_price,
                COUNT(r.id) as robot_count,
                SUM(r.robot_price) as total_cost,
                pr.receipt_filename, pr.upload_date,
                DATEDIFF(NOW(), t.created_at) as days_since_registration
            FROM teams t
            LEFT JOIN robots r ON r.team_id = t.id
            LEFT JOIN payment_receipts pr ON pr.team_id = t.id
            WHERE t.payment_status = 'pending'
            GROUP BY t.id
            ORDER BY t.created_at DESC
        ");
        $stmt->execute();
        $pending = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'data' => $pending,
            'count' => count($pending)
        ]);
    }

    else {
        throw new Exception('Acción no reconocida');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Registra acciones en el audit log
 */
function logAudit($pdo, $action, $table, $recordId, $userId = null, $details = '') {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO audit_log (action, table_name, record_id, user_id, ip_address, changes)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $ip = getRealUserIp();
        $stmt->execute([$action, $table, $recordId, $userId, $ip, json_encode(['notes' => $details])]);
    } catch (Throwable $ignored) {
        // No bloquear la verificación de pago por un fallo en auditoría.
    }
}

function ensureApprovedRobotsColumn($pdo)
{
    $stmt = $pdo->query("SHOW COLUMNS FROM payment_receipts LIKE 'approved_robots_count'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE payment_receipts ADD COLUMN approved_robots_count INT NULL AFTER number_of_robots");
    }
}
