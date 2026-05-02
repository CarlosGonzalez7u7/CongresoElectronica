<?php
/**
 * API: Escuelas sugeridas para registro
 * GET /api/auth-schools.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);

    $stmt = $pdo->query(
        "SELECT DISTINCT TRIM(school) AS school
         FROM platform_users
         WHERE school IS NOT NULL AND TRIM(school) <> ''
         ORDER BY school ASC
         LIMIT 200"
    );

    $schools = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (!empty($row['school'])) {
            $schools[] = $row['school'];
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'schools' => $schools,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudieron cargar las escuelas',
    ]);
}
