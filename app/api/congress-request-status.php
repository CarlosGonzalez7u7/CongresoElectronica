<?php
/**
 * API: Estado de solicitud de paquetes del congreso
 * GET /api/congress-request-status.php?userId=1
 */

require_once __DIR__ . '/_auth_common.php';

// Habilitar logging de errores para debugging en producción
error_log("[congress-request-status.php] REQUEST - METHOD: " . $_SERVER['REQUEST_METHOD'] . ", userId: " . ($_GET['userId'] ?? 'null') . ", folio: " . ($_GET['folio'] ?? 'null'));

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    $userId = (int) ($_GET['userId'] ?? 0);
    $requestFolio = strtoupper(trim((string) ($_GET['folio'] ?? '')));
    
    error_log("[congress-request-status.php] Parsed userId: " . $userId . ", folio: " . $requestFolio);
    
    if ($userId <= 0 && $requestFolio === '') {
        throw new Exception('userId o folio requerido');
    }

    $year = getCurrentCongressYear();
    error_log("[congress-request-status.php] getCurrentCongressYear: " . $year);

    ensureCongressRequestsTable($pdo);
    error_log("[congress-request-status.php] ensureCongressRequestsTable completed");

    $sql = "
        SELECT
            cer.id,
            cer.user_id,
            cer.congress_year,
            cer.request_folio,
            cer.profile_snapshot_json,
            cer.robots_snapshot_json,
            cer.members_snapshot_json,
            cer.includes_congress,
            cer.includes_robotics,
            cer.includes_camp,
            cer.congress_fee,
            cer.robotics_fee,
            cer.camp_fee,
            cer.total_fee,
            cer.status,
            cer.admin_notes,
            cer.rejection_reason,
            cer.receipt_filename,
            cer.created_at,
            cer.reviewed_at,
            pu.email,
            (SELECT t.folio FROM teams t WHERE t.captain_email = pu.email ORDER BY t.id DESC LIMIT 1) AS team_folio
        FROM congress_enrollment_requests cer
        INNER JOIN platform_users pu ON pu.id = cer.user_id
        WHERE %s
        ORDER BY cer.id DESC
        LIMIT 1
    ";

    if ($requestFolio !== '') {
        $where = 'cer.request_folio = ?';
        $params = [$requestFolio];
        error_log("[congress-request-status.php] Query by folio: " . $requestFolio);
    } else {
        $where = 'cer.user_id = ? AND cer.congress_year = ?';
        $params = [$userId, $year];
        error_log("[congress-request-status.php] Query by userId: " . $userId . ", year: " . $year);
    }

    $stmt = $pdo->prepare(sprintf($sql, $where));
    if (!$stmt) {
        throw new Exception('SQL Prepare failed: ' . print_r($pdo->errorInfo(), true));
    }
    
    $executeResult = $stmt->execute($params);
    error_log("[congress-request-status.php] Execute result: " . ($executeResult ? 'true' : 'false'));
    
    if (!$executeResult) {
        throw new Exception('SQL Execute failed: ' . print_r($stmt->errorInfo(), true));
    }
    
    $row = $stmt->fetch();
    error_log("[congress-request-status.php] Row found: " . ($row ? 'yes' : 'no'));

    if (!$row) {
        error_log("[congress-request-status.php] No record found, returning null data");
        echo json_encode([
            'success' => true,
            'data' => null,
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'request_id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'congress_year' => (int) $row['congress_year'],
            'request_folio' => $row['request_folio'] !== null ? (string) $row['request_folio'] : null,
            'profile_snapshot' => decodeRequestJsonColumn($row['profile_snapshot_json'] ?? null),
            'robots_snapshot' => decodeRequestJsonColumn($row['robots_snapshot_json'] ?? null),
            'members_snapshot' => decodeRequestJsonColumn($row['members_snapshot_json'] ?? null),
            'includes_congress' => (bool) $row['includes_congress'],
            'includes_robotics' => (bool) $row['includes_robotics'],
            'includes_camp' => (bool) $row['includes_camp'],
            'congress_fee' => (float) $row['congress_fee'],
            'robotics_fee' => (float) $row['robotics_fee'],
            'camp_fee' => (float) $row['camp_fee'],
            'total_fee' => (float) $row['total_fee'],
            'status' => (string) $row['status'],
            'admin_notes' => $row['admin_notes'] !== null ? (string) $row['admin_notes'] : null,
            'rejection_reason' => $row['rejection_reason'] !== null ? (string) $row['rejection_reason'] : null,
            'receipt_filename' => $row['receipt_filename'] !== null ? (string) $row['receipt_filename'] : null,
            'has_receipt' => $row['receipt_filename'] !== null && $row['receipt_filename'] !== '',
            'team_folio' => $row['team_folio'] !== null ? (string) $row['team_folio'] : null,
            'created_at' => (string) $row['created_at'],
            'reviewed_at' => $row['reviewed_at'] !== null ? (string) $row['reviewed_at'] : null,
        ],
    ]);
    error_log("[congress-request-status.php] Successfully returned enrollment data for userId: " . $userId);
} catch (Throwable $e) {
    error_log("[congress-request-status.php] ERROR: " . get_class($e) . " - " . $e->getMessage() . " - File: " . $e->getFile() . " Line: " . $e->getLine());
    error_log("[congress-request-status.php] Stack trace: " . $e->getTraceAsString());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}

function ensureCongressRequestsTable(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS congress_enrollment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        congress_year YEAR NOT NULL DEFAULT 2026,
        request_folio VARCHAR(50) NULL,
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
        UNIQUE KEY unique_request_folio (request_folio),
        INDEX idx_cer_user (user_id),
        INDEX idx_cer_status (status),
        INDEX idx_cer_year (congress_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    ensureCongressRequestExtraColumns($pdo);
}

function ensureCongressRequestExtraColumns(PDO $pdo): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $columns = [
        'request_folio' => "ALTER TABLE congress_enrollment_requests ADD COLUMN request_folio VARCHAR(50) NULL AFTER congress_year",
        'profile_snapshot_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN profile_snapshot_json LONGTEXT NULL AFTER request_folio",
        'robots_snapshot_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN robots_snapshot_json LONGTEXT NULL AFTER profile_snapshot_json",
        'members_snapshot_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN members_snapshot_json LONGTEXT NULL AFTER robots_snapshot_json",
    ];

    foreach ($columns as $columnName => $alterSql) {
        $stmt->execute(['congress_enrollment_requests', $columnName]);
        $exists = (int) $stmt->fetchColumn() > 0;
        if (!$exists) {
            $pdo->exec($alterSql);
        }
    }

    $idxStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'congress_enrollment_requests' AND INDEX_NAME = 'unique_request_folio'"
    );
    $idxStmt->execute();
    $hasIndex = (int) $idxStmt->fetchColumn() > 0;
    if (!$hasIndex) {
        $pdo->exec('ALTER TABLE congress_enrollment_requests ADD UNIQUE KEY unique_request_folio (request_folio)');
    }
}

function decodeRequestJsonColumn($value): array
{
    if (!is_string($value) || trim($value) === '') {
        return [];
    }

    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}
