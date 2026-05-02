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
            -- Robots del equipo (si existe)
            (SELECT COUNT(*) FROM robots r
             INNER JOIN teams t ON t.id = r.team_id
             WHERE t.captain_email = pu.email) AS robot_count,
            (SELECT t.folio FROM teams t WHERE t.captain_email = pu.email LIMIT 1) AS team_folio,
            (SELECT t.payment_status FROM teams t WHERE t.captain_email = pu.email LIMIT 1) AS team_payment_status,
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
        $r['robot_count']       = (int) ($r['robot_count'] ?? 0);
        $r['robots_total_cost'] = (float) ($r['robots_total_cost'] ?? 0);

        // Construir descripción legible del paquete
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

function approveRequest(PDO $pdo, array $request, array $input): void
{
    $notes = trim((string) ($input['admin_notes'] ?? 'Aprobado'));
    $stmt = $pdo->prepare("
        UPDATE congress_enrollment_requests
        SET status = 'approved', admin_notes = ?, reviewed_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$notes, $request['id']]);

    $stmtProfile = $pdo->prepare("SELECT country, city, school, matricula FROM platform_users WHERE id = ? LIMIT 1");
    $stmtProfile->execute([$request['user_id']]);
    $profile = $stmtProfile->fetch() ?: [
        'country' => '',
        'city' => '',
        'school' => '',
        'matricula' => null,
    ];

    // Activar/actualizar congress_registrations si existe
    $stmtCheck = $pdo->prepare("SELECT id FROM congress_registrations WHERE user_id = ? AND congress_year = ? LIMIT 1");
    $stmtCheck->execute([$request['user_id'], $request['congress_year']]);
    $existing = $stmtCheck->fetch();

    if ($existing) {
        $pdo->prepare("UPDATE congress_registrations SET registration_fee = ?, payment_status = 'paid', country_snapshot = ?, city_snapshot = ?, school_snapshot = ?, matricula_snapshot = ?, updated_at = NOW() WHERE id = ?")
            ->execute([
                (float) $request['total_fee'],
                (string) ($profile['country'] ?? ''),
                (string) ($profile['city'] ?? ''),
                (string) ($profile['school'] ?? ''),
                $profile['matricula'] !== '' ? $profile['matricula'] : null,
                $existing['id'],
            ]);
    } else {
        $pdo->prepare("
            INSERT INTO congress_registrations
                (user_id, congress_year, registration_fee, payment_status, country_snapshot, city_snapshot, school_snapshot, matricula_snapshot)
            VALUES (?, ?, ?, 'paid', ?, ?, ?, ?)
        ")->execute([
            $request['user_id'],
            $request['congress_year'],
            $request['total_fee'],
            (string) ($profile['country'] ?? ''),
            (string) ($profile['city'] ?? ''),
            (string) ($profile['school'] ?? ''),
            $profile['matricula'] !== '' ? $profile['matricula'] : null,
        ]);
    }
}

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

function logAuditCongress(PDO $pdo, string $action, int $requestId, string $detail): void
{
    try {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
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
}
