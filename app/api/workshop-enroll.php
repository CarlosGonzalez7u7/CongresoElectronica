<?php
/**
 * API: Inscripción a talleres (Panel de Usuario)
 * GET /api/workshop-enroll.php?userId=N
 * POST /api/workshop-enroll.php
 */

require_once __DIR__ . '/_auth_common.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $userId = (int)($_GET['userId'] ?? 0);
        if ($userId <= 0) {
            echo json_encode(['success' => true, 'can_enroll' => false, 'enrolled_workshop_id' => null]);
            exit;
        }

        // Verifica si el usuario tiene su inscripción al congreso aprobada
        $stmtCheck = $pdo->prepare("
            SELECT id 
            FROM congress_enrollment_requests 
            WHERE user_id = ? AND status IN ('approved', 'paid') AND includes_congress = 1
            LIMIT 1
        ");
        $stmtCheck->execute([$userId]);
        $hasCongress = (bool)$stmtCheck->fetch();

        // Obtiene en qué taller está inscrito actualmente
        $stmtEnrolled = $pdo->prepare("
            SELECT workshop_id 
            FROM workshop_enrollments 
            WHERE user_id = ? AND status != 'cancelled'
            LIMIT 1
        ");
        $stmtEnrolled->execute([$userId]);
        $enrolledWorkshopId = $stmtEnrolled->fetchColumn();

        echo json_encode([
            'success' => true, 
            'can_enroll' => $hasCongress,
            'enrolled_workshop_id' => $enrolledWorkshopId ? (int)$enrolledWorkshopId : null
        ]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = (int)($input['userId'] ?? 0);
        $workshopId = (int)($input['workshopId'] ?? 0);

        if ($userId <= 0 || $workshopId <= 0) throw new Exception('Datos inválidos');

        $stmtCheck = $pdo->prepare("
            SELECT id FROM congress_enrollment_requests 
            WHERE user_id = ? AND status IN ('approved', 'paid') AND includes_congress = 1 LIMIT 1
        ");
        $stmtCheck->execute([$userId]);
        if (!$stmtCheck->fetch()) throw new Exception('Debes tener tu inscripción al congreso aprobada y validada para registrarte en un taller.');

        $stmtEnrolled = $pdo->prepare("SELECT workshop_id FROM workshop_enrollments WHERE user_id = ? AND status != 'cancelled' LIMIT 1");
        $stmtEnrolled->execute([$userId]);
        if ($stmtEnrolled->fetch()) throw new Exception('Ya estás inscrito en un taller. Solo puedes tomar uno.');

        $stmtWs = $pdo->prepare("SELECT max_capacity, (SELECT COUNT(*) FROM workshop_enrollments we WHERE we.workshop_id = workshops.id AND we.status != 'cancelled') as enrolled_count FROM workshops WHERE id = ? AND status IN ('published', 'full')");
        $stmtWs->execute([$workshopId]);
        $ws = $stmtWs->fetch();

        if (!$ws) throw new Exception('El taller no existe o no está disponible.');
        if ($ws['enrolled_count'] >= $ws['max_capacity']) throw new Exception('El taller ya no tiene cupo disponible.');

        $pdo->prepare("INSERT INTO workshop_enrollments (workshop_id, user_id, status) VALUES (?, ?, 'enrolled')")->execute([$workshopId, $userId]);
        echo json_encode(['success' => true, 'message' => '¡Inscrito correctamente al taller!']);
        exit;
    }
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}