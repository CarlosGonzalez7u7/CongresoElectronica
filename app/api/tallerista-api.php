<?php
/**
 * API: Panel de Talleristas
 * GET /api/tallerista-api.php?action=list_workshops
 * POST /api/tallerista-api.php {"action":"mark_attendance", "workshop_id":1, "folio":"..."}
 */
require_once __DIR__ . '/_auth_common.php';

if (session_status() === PHP_SESSION_NONE) session_start();
$instructorId = (int)($_SESSION['instructor_id'] ?? 0);

if ($instructorId <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Listar los talleres asignados a este maestro
        $stmt = $pdo->prepare("
            SELECT id, name
            FROM workshops
            WHERE instructor_id = ? AND status IN ('published', 'full')
            ORDER BY schedule_date ASC, schedule_start ASC
        ");
        $stmt->execute([$instructorId]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (($input['action'] ?? '') === 'mark_attendance') {
            $workshopId = (int)($input['workshop_id'] ?? 0);
            $folio = strtoupper(trim($input['folio'] ?? ''));
            
            // 1. Validar que el folio es de alguien que sí pagó el congreso
            $stmtReq = $pdo->prepare("SELECT user_id FROM congress_enrollment_requests WHERE request_folio = ? AND status IN ('approved', 'paid') LIMIT 1");
            $stmtReq->execute([$folio]);
            $req = $stmtReq->fetch();
            if (!$req) throw new Exception('Folio inválido, rechazado o falta de pago en Tesorería.');
            
            // 2. Verificar que el alumno de ese folio sí se haya inscrito A ESTE taller
            $stmtEnr = $pdo->prepare("SELECT id, status, attendance_marked_at FROM workshop_enrollments WHERE workshop_id = ? AND user_id = ? AND status != 'cancelled' LIMIT 1");
            $stmtEnr->execute([$workshopId, (int)$req['user_id']]);
            $enr = $stmtEnr->fetch();
            
            if (!$enr) throw new Exception('El alumno pertenece al congreso, pero NO se registró para tu taller.');
            if ($enr['status'] === 'attended' || $enr['attendance_marked_at'] !== null) {
                echo json_encode(['success' => true, 'message' => 'Este alumno ya había pasado lista previamente.', 'already_marked' => true]);
                exit;
            }
            
            // 3. Marcar Asistencia
            $pdo->prepare("UPDATE workshop_enrollments SET status = 'attended', attendance_marked_at = NOW(), attendance_marked_by = 'Instructor' WHERE id = ?")->execute([$enr['id']]);
            
            $name = $pdo->prepare("SELECT full_name FROM platform_users WHERE id = ?"); $name->execute([$req['user_id']]);
            echo json_encode(['success' => true, 'message' => "Asistencia confirmada para: <strong>" . $name->fetchColumn() . "</strong>", 'already_marked' => false]);
        }
    }
} catch (Throwable $e) {
    http_response_code(400); echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}