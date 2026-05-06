<?php
/**
 * API: OBTENER COMPROBANTE DE PAGO
 * GET /api/get-receipt.php?team_id=1
 * GET /api/get-receipt.php?folio=RENOV-...
 */

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    $teamId = isset($_GET['team_id']) ? (int) $_GET['team_id'] : 0;
    $folio = sanitizeInput($_GET['folio'] ?? '');
    $filename = sanitizeInput($_GET['filename'] ?? '');

    if ($teamId <= 0 && $folio === '' && $filename === '') {
        throw new Exception('Se requiere team_id, folio o filename');
    }

    if ($teamId > 0) {
        $stmt = $pdo->prepare("\n            SELECT t.id, t.folio, pr.receipt_filename, pr.receipt_path\n            FROM teams t\n            INNER JOIN payment_receipts pr ON pr.team_id = t.id\n            WHERE t.id = ?\n        ");
        $stmt->execute([$teamId]);
    } elseif ($filename !== '') {
        $safeFilename = basename($filename);

        $candidatePaths = [];

        // 1) Preferir rutas guardadas en BD para soportar migraciones o cambios de carpeta.
        $stmtByFilename = $pdo->prepare("\n            SELECT receipt_path\n            FROM payment_receipts\n            WHERE receipt_filename = ?\n            UNION\n            SELECT receipt_path\n            FROM congress_enrollment_requests\n            WHERE receipt_filename = ?\n            LIMIT 10\n        ");
        $stmtByFilename->execute([$safeFilename, $safeFilename]);
        $rowsByFilename = $stmtByFilename->fetchAll();

        foreach ($rowsByFilename as $row) {
            $dbPath = (string) ($row['receipt_path'] ?? '');
            if ($dbPath !== '') {
                $candidatePaths[] = $dbPath;
            }
        }

        // 2) Fallbacks locales actuales y rutas legacy.
        $projectRoot = dirname(__DIR__, 2);
        $candidatePaths[] = rtrim(UPLOAD_DIR, '/\\') . DIRECTORY_SEPARATOR . $safeFilename;
        $candidatePaths[] = $projectRoot . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'receipts' . DIRECTORY_SEPARATOR . $safeFilename;
        $candidatePaths[] = $projectRoot . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'receipts' . DIRECTORY_SEPARATOR . $safeFilename;
        $candidatePaths[] = $projectRoot . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $safeFilename;

        $foundPath = null;
        foreach ($candidatePaths as $path) {
            if (is_string($path) && $path !== '' && is_file($path)) {
                $foundPath = $path;
                break;
            }
        }

        if ($foundPath === null) {
            throw new Exception('Comprobante no encontrado');
        }

        $receipt = [
            'receipt_filename' => $safeFilename,
            'receipt_path' => $foundPath,
        ];
    } else {
        $stmt = $pdo->prepare("\n            SELECT t.id, t.folio, pr.receipt_filename, pr.receipt_path\n            FROM teams t\n            INNER JOIN payment_receipts pr ON pr.team_id = t.id\n            WHERE t.folio = ?\n        ");
        $stmt->execute([$folio]);
    }

    if (!isset($foundPath)) {
        $receipt = $stmt->fetch();
        if (!$receipt) {
            throw new Exception('Comprobante no encontrado');
        }

        $candidatePaths = [];
        if (!empty($receipt['receipt_path'])) {
            $candidatePaths[] = $receipt['receipt_path'];
        }

        if (!empty($receipt['receipt_filename'])) {
            $candidatePaths[] = UPLOAD_DIR . '/' . basename($receipt['receipt_filename']);
        }

        $foundPath = null;
        foreach ($candidatePaths as $path) {
            if (is_file($path)) {
                $foundPath = $path;
                break;
            }
        }
    }

    if ($foundPath === null) {
        throw new Exception('El archivo del comprobante no existe en el servidor');
    }

    $ext = strtolower(pathinfo($foundPath, PATHINFO_EXTENSION));
    $mime = 'application/octet-stream';
    if ($ext === 'pdf') {
        $mime = 'application/pdf';
    } elseif ($ext === 'jpg' || $ext === 'jpeg') {
        $mime = 'image/jpeg';
    } elseif ($ext === 'png') {
        $mime = 'image/png';
    }

    if (function_exists('header_remove')) {
        header_remove('Content-Type');
    }
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($foundPath));
    header('Content-Disposition: inline; filename="' . basename($foundPath) . '"');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');

    readfile($foundPath);
    exit;
} catch (Throwable $e) {
    if (function_exists('header_remove')) {
        header_remove('Content-Type');
    }
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
