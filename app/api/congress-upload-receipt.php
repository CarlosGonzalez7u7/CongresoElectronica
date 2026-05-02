<?php
/**
 * API: Subir o reemplazar comprobante de solicitud del congreso
 * POST /api/congress-upload-receipt.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);
    ensureCongressRequestsTable($pdo);

    $userId = (int) ($_POST['userId'] ?? 0);
    $requestFolio = strtoupper(trim((string) ($_POST['request_folio'] ?? '')));

    if ($userId <= 0 || $requestFolio === '') {
        throw new Exception('userId y request_folio son obligatorios');
    }

    if (!isset($_FILES['receipt']) || (int) $_FILES['receipt']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Debes subir un comprobante válido');
    }

    $fileTmpPath = $_FILES['receipt']['tmp_name'];
    $fileName = $_FILES['receipt']['name'];
    $fileSize = $_FILES['receipt']['size'];
    $fileType = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    $allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    if (!in_array($fileType, $allowedExtensions, true)) {
        throw new Exception('Formato no permitido. Usa JPG, PNG o PDF');
    }

    if ($fileSize > MAX_UPLOAD_SIZE) {
        throw new Exception('El archivo es demasiado grande (máx. 20MB)');
    }

    $stmt = $pdo->prepare('SELECT id, receipt_path FROM congress_enrollment_requests WHERE user_id = ? AND request_folio = ? LIMIT 1');
    $stmt->execute([$userId, $requestFolio]);
    $request = $stmt->fetch();
    if (!$request) {
        throw new Exception('Solicitud no encontrada para este usuario');
    }

    $newFileName = 'congreso_' . $userId . '_' . time() . '.' . $fileType;
    $uploadDest = UPLOAD_DIR . $newFileName;

    if (!move_uploaded_file($fileTmpPath, $uploadDest)) {
        throw new Exception('No se pudo guardar el comprobante');
    }

    $pdo->prepare('UPDATE congress_enrollment_requests SET receipt_path = ?, receipt_filename = ?, receipt_uploaded_at = NOW(), status = \"pending\", admin_notes = NULL, rejection_reason = NULL, reviewed_at = NULL, reviewed_by_admin_id = NULL, updated_at = NOW() WHERE id = ?')
        ->execute([$uploadDest, $newFileName, (int) $request['id']]);

    if (!empty($request['receipt_path']) && file_exists($request['receipt_path'])) {
        @unlink($request['receipt_path']);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Comprobante actualizado y enviado para revisión',
        'data' => [
            'request_id' => (int) $request['id'],
            'request_folio' => $requestFolio,
            'receipt_filename' => $newFileName,
            'status' => 'pending',
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo subir el comprobante',
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

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute(['congress_enrollment_requests', 'request_folio']);
    $exists = (int) $stmt->fetchColumn() > 0;
    if (!$exists) {
        $pdo->exec("ALTER TABLE congress_enrollment_requests ADD COLUMN request_folio VARCHAR(50) NULL AFTER congress_year");
    }
}
