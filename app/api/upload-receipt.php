<?php
/**
 * API: SUBIR RECIBO DE PAGO
 * POST /api/upload-receipt.php
 * 
 * Recibe el archivo del recibo y lo guarda
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Detecta el MIME real del archivo con fallbacks cuando fileinfo no está habilitado.
 */
function detectReceiptMimeType($tmpPath, $originalName = '') {
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $mime = finfo_file($finfo, $tmpPath);
            finfo_close($finfo);
            if (is_string($mime) && $mime !== '') {
                return $mime;
            }
        }
    }

    if (function_exists('mime_content_type')) {
        $mime = mime_content_type($tmpPath);
        if (is_string($mime) && $mime !== '') {
            return $mime;
        }
    }

    // Validación mínima por firma para PDF e imágenes.
    $handle = @fopen($tmpPath, 'rb');
    if ($handle !== false) {
        $signature = fread($handle, 8);
        fclose($handle);

        if ($signature !== false) {
            if (strncmp($signature, "%PDF", 4) === 0) {
                return 'application/pdf';
            }

            if (strncmp($signature, "\xFF\xD8\xFF", 3) === 0) {
                return 'image/jpeg';
            }

            if (strncmp($signature, "\x89PNG\r\n\x1A\n", 8) === 0) {
                return 'image/png';
            }
        }
    }

    // Último fallback por extensión.
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if ($ext === 'pdf') {
        return 'application/pdf';
    }
    if ($ext === 'jpg' || $ext === 'jpeg') {
        return 'image/jpeg';
    }
    if ($ext === 'png') {
        return 'image/png';
    }

    return '';
}

// Validar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Validar AJAX
if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || $_SERVER['HTTP_X_REQUESTED_WITH'] !== 'XMLHttpRequest') {
    http_response_code(403);
    echo json_encode(['error' => 'Solicitud no autorizada']);
    exit;
}

try {
    // Validar que el equipo existe
    $teamId = $_POST['team_id'] ?? null;
    if (!$teamId) {
        throw new Exception('ID de equipo requerido');
    }

    // Obtener datos del equipo para calcular totales de pago
    $stmtTeam = $pdo->prepare("SELECT id, registration_price FROM teams WHERE id = ?");
    $stmtTeam->execute([$teamId]);
    $team = $stmtTeam->fetch();

    if (!$team) {
        throw new Exception('Equipo no encontrado');
    }

    $stmtRobotCount = $pdo->prepare("SELECT COUNT(*) AS total FROM robots WHERE team_id = ?");
    $stmtRobotCount->execute([$teamId]);
    $robotCountData = $stmtRobotCount->fetch();

    $numberOfRobots = (int)($robotCountData['total'] ?? 0);
    $pricePerRobot = (int)($team['registration_price'] ?? 0);
    $totalAmount = $numberOfRobots * $pricePerRobot;

    // Validar que el archivo existe
    if (!isset($_FILES['receipt'])) {
        throw new Exception('Archivo no proporcionado');
    }

    $file = $_FILES['receipt'];

    // Validar errores del upload
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al subir el archivo');
    }

    // Validar tamaño (20MB)
    if ($file['size'] > MAX_UPLOAD_SIZE) {
        throw new Exception('Archivo demasiado grande (máximo 20MB)');
    }

    // Validar tipo MIME
    $allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    $mime = detectReceiptMimeType($file['tmp_name'], $file['name'] ?? '');

    if (!in_array($mime, $allowedMimes)) {
        throw new Exception('Tipo de archivo no permitido (PDF, JPG, PNG solamente)');
    }

    // Crear nombre seguro del archivo
    switch ($mime) {
        case 'application/pdf':
            $ext = 'pdf';
            break;
        case 'image/jpeg':
            $ext = 'jpg';
            break;
        case 'image/png':
            $ext = 'png';
            break;
        default:
            throw new Exception('No se pudo determinar la extensión del archivo');
    }

    $filename = 'receipt_' . $teamId . '_' . time() . '.' . $ext;
    $uploadPath = UPLOAD_DIR . '/' . $filename;

    // Mover archivo
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        throw new Exception('Error al guardar el archivo');
    }

    // Insertar en BD
    $stmt = $pdo->prepare("
        INSERT INTO payment_receipts (
            team_id, total_amount, number_of_robots, price_per_robot,
            receipt_filename, receipt_path, receipt_size, upload_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            total_amount = VALUES(total_amount),
            number_of_robots = VALUES(number_of_robots),
            price_per_robot = VALUES(price_per_robot),
            receipt_filename = VALUES(receipt_filename),
            receipt_path = VALUES(receipt_path),
            receipt_size = VALUES(receipt_size),
            upload_date = NOW()
    ");

    $stmt->execute([
        $teamId,
        $totalAmount,
        $numberOfRobots,
        $pricePerRobot,
        $filename,
        $uploadPath,
        $file['size']
    ]);

    // Actualizar estado del equipo a "pending_verification"
    $stmtStatus = $pdo->prepare("UPDATE teams SET payment_status = 'pending' WHERE id = ?");
    $stmtStatus->execute([$teamId]);

    // Respuesta éxitosa
    echo json_encode([
        'success' => true,
        'message' => 'Recibo subido exitosamente',
        'data' => [
            'filename' => $filename,
            'size' => $file['size'],
            'total_amount' => $totalAmount,
            'number_of_robots' => $numberOfRobots,
            'price_per_robot' => $pricePerRobot
        ]
    ]);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
