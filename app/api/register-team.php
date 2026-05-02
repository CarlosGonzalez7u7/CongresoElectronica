<?php
/**
 * API: REGISTRAR EQUIPO
 * POST /api/register-team.php
 * 
 * Recibe los datos del formulario y registra el equipo en la BD
 */

require_once __DIR__ . '/../config/database.php';

// Validar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Validar que sea AJAX
if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || $_SERVER['HTTP_X_REQUESTED_WITH'] !== 'XMLHttpRequest') {
    http_response_code(403);
    echo json_encode(['error' => 'Solicitud no autorizada']);
    exit;
}

try {
    // Obtener datos JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Datos inválidos');
    }

    // Validar etapa de registro
    $currentStage = getCurrentStage();

    if (!$currentStage) {
        throw new Exception('Registro cerrado temporalmente');
    }

    // Validar aceptación de términos
    if (empty($input['acceptance'])) {
        throw new Exception('Debe aceptar los términos de responsabilidad');
    }

    // Generar folio
    $folio = generateFolio();

    // Sanitizar datos
    $paisOrigen = sanitizeInput($input['paisOrigen'] ?? '');
    $estadoId = sanitizeInput($input['estadoId'] ?? '');
    $estadoNombre = sanitizeInput($input['estadoNombre'] ?? '');
    $paisNombre = sanitizeInput($input['paisNombre'] ?? '');
    $tipoInstitucion = sanitizeInput($input['tipoInstitucion'] ?? '');
    $escuela = sanitizeInput($input['escuela'] ?? '');
    
    $captainName = sanitizeInput($input['captainName'] ?? '');
    $captainEmail = sanitizeInput($input['captainEmail'] ?? '');
    $captainPhone = sanitizeInput($input['captainPhone'] ?? '');

    // Validaciones básicas
    if (empty($captainName) || empty($captainEmail) || empty($captainPhone) || empty($escuela)) {
        throw new Exception('Faltan datos requeridos del capitán');
    }

    if (!filter_var($captainEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Email inválido');
    }

    // Iniciar transacción
    $pdo->beginTransaction();

    // ===== INSERTAR EQUIPO =====
    $stmtTeam = $pdo->prepare("
        INSERT INTO teams (
            folio, country_origin, state_id, state_name, country_name,
            institution_type, school_name, captain_name, captain_email,
            captain_phone, registration_stage, registration_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmtTeam->execute([
        $folio,
        $paisOrigen,
        $estadoId,
        $estadoNombre,
        $paisNombre,
        $tipoInstitucion,
        $escuela,
        $captainName,
        $captainEmail,
        $captainPhone,
        $currentStage['id'],
        $currentStage['price']
    ]);

    $teamId = $pdo->lastInsertId();

    // ===== INSERTAR CAPITÁN COMO MIEMBRO =====
    $stmtCaptain = $pdo->prepare("
        INSERT INTO team_members (team_id, member_number, member_name, is_captain)
        VALUES (?, 1, ?, TRUE)
    ");
    $stmtCaptain->execute([$teamId, $captainName]);

    // ===== INSERTAR MIEMBROS ADICIONALES =====
    if (!empty($input['members'])) {
        $stmtMember = $pdo->prepare("
            INSERT INTO team_members (team_id, member_number, member_name, is_captain)
            VALUES (?, ?, ?, FALSE)
        ");

        $memberNumber = 2;
        foreach ($input['members'] as $member) {
            if (!empty($member)) {
                $stmtMember->execute([$teamId, $memberNumber, sanitizeInput($member)]);
                $memberNumber++;
            }
        }
    }

    // ===== INSERTAR ROBOTS =====
    if (!empty($input['robots'])) {
        $stmtRobot = $pdo->prepare("
            INSERT INTO robots (team_id, robot_number, robot_name, category, registration_stage, robot_price)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $robotNumber = 1;
        foreach ($input['robots'] as $robot) {
            if (!empty($robot['name']) && !empty($robot['category'])) {
                $stmtRobot->execute([
                    $teamId,
                    $robotNumber,
                    sanitizeInput($robot['name']),
                    sanitizeInput($robot['category']),
                    $currentStage['id'],
                    $currentStage['price']
                ]);
                $robotNumber++;
            }
        }
    }

    // ===== INSERTAR ACEPTACIÓN DE TÉRMINOS =====
    $stmtLiability = $pdo->prepare("
        INSERT INTO legal_acceptance (team_id, accepted_liability, accepted_terms, ip_address, user_agent)
        VALUES (?, TRUE, TRUE, ?, ?)
    ");

    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

    $stmtLiability->execute([$teamId, $ip, $userAgent]);

    // ===== GENERAR QR =====
    $qrData = json_encode([
        'folio' => $folio,
        'team_id' => $teamId,
        'captain' => $captainName,
        'email' => $captainEmail,
        'robots' => count($input['robots'] ?? []),
        'stage' => $currentStage['id'],
        'date' => date('Y-m-d H:i:s')
    ]);

    // Usar librería QRCode de Google (o generar con PHP)
    $qrHash = md5($qrData);

    // Actualizar QR en la BD
    $stmtQR = $pdo->prepare("UPDATE teams SET qr_code_hash = ? WHERE id = ?");
    $stmtQR->execute([$qrHash, $teamId]);

    // Confirmar transacción
    $pdo->commit();

    // ===== RESPUESTA ÉXITOSA =====
    echo json_encode([
        'success' => true,
        'message' => 'Registro completado exitosamente',
        'data' => [
            'folio' => $folio,
            'team_id' => $teamId,
            'qr_data' => $qrData,
            'qr_hash' => $qrHash,
            'stage' => $currentStage['name'],
            'total_cost' => count($input['robots'] ?? []) * $currentStage['price']
        ]
    ]);

} catch (Exception $e) {
    // Revertir transacción en caso de error
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
