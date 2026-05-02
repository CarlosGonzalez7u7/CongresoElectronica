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
        $candidatePath = UPLOAD_DIR . '/' . basename($filename);
        if (!is_file($candidatePath)) {
            throw new Exception('Comprobante no encontrado');
        }

        $foundPath = $candidatePath;
        $receipt = [
            'receipt_filename' => basename($filename),
            'receipt_path' => $candidatePath,
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
