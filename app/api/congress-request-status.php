<?php
/**
 * API: Obtener estado de inscripción (Historial Completo)
 * GET /api/congress-request-status.php
 */
require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    $userId = (int)($_GET['userId'] ?? 0);
    if ($userId <= 0) $userId = requireLoggedInUser();

    $year = getCurrentCongressYear();

    $stmt = $pdo->prepare("SELECT * FROM congress_enrollment_requests WHERE user_id = ? AND congress_year = ? ORDER BY id ASC");
    $stmt->execute([$userId, $year]);
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$requests) {
        echo json_encode(['success' => true, 'data' => null]);
        exit;
    }

    $all_requests = [];
    $merged = null;
    $hasApprovedCongress = false;

    foreach ($requests as $req) {
        $req['profile_snapshot'] = json_decode($req['profile_snapshot_json'] ?? '{}', true);
        $req['robots_snapshot'] = json_decode($req['robots_snapshot_json'] ?? '[]', true);
        $req['members_snapshot'] = json_decode($req['members_snapshot_json'] ?? '[]', true);
        $req['has_receipt'] = !empty($req['receipt_filename']);
        
        $req['includes_congress'] = (bool)$req['includes_congress'];
        $req['includes_robotics'] = (bool)$req['includes_robotics'];
        $req['includes_camp'] = (bool)$req['includes_camp'];
        $req['congress_fee'] = (float)$req['congress_fee'];
        $req['robotics_fee'] = (float)$req['robotics_fee'];
        $req['camp_fee'] = (float)$req['camp_fee'];
        $req['total_fee'] = (float)$req['total_fee'];
        
        unset($req['profile_snapshot_json'], $req['robots_snapshot_json'], $req['members_snapshot_json']);
        $all_requests[] = $req;
        
        $status = strtolower($req['status']);
        if ($req['includes_congress'] && ($status === 'approved' || $status === 'paid')) $hasApprovedCongress = true;
        if (!$merged) $merged = $req; // Tomar la base del congreso original
    }

    $merged['all_requests'] = $all_requests;
    if ($hasApprovedCongress) { $merged['status'] = 'approved'; $merged['includes_congress'] = true; }

    echo json_encode(['success' => true, 'data' => $merged]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}