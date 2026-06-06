<?php
/**
 * API: Gestión de carreras
 * GET  /app/api/auth-careers.php           -> devuelve nombres de carreras para registro
 * POST /app/api/auth-careers.php           -> crear/actualizar carrera (o proponer desde usuario)
 */

require_once __DIR__ . '/_auth_common.php';

try {
    ensureCareerCatalogTable($pdo);
    seedInitialCareers($pdo);

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT name FROM career_catalog");
        $careers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => [
                'careers' => $careers,
            ],
        ]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = $_POST;
        
        $name = sanitizeText($input['name'] ?? '');
        $is_verified = isset($input['is_verified']) ? (int)filter_var($input['is_verified'], FILTER_VALIDATE_BOOLEAN) : 0;
        
        $proposedBy = null;
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (empty($_SESSION['admin_id'])) {
            $is_verified = 0;
            $proposedBy = $_SESSION['user_id'] ?? null;
        }

        if (empty($name)) {
            throw new Exception('El nombre es requerido');
        }

        $stmt = $pdo->prepare("INSERT IGNORE INTO career_catalog (name, is_verified, proposed_by) VALUES (?, ?, ?)");
        $stmt->execute([$name, $is_verified, $proposedBy]);
        
        echo json_encode(['success' => true, 'message' => 'Carrera registrada']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'Error en la operación',
    ]);
}

function ensureCareerCatalogTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS career_catalog (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(220) NOT NULL UNIQUE COMMENT 'Nombre oficial de la carrera',
            is_verified TINYINT(1) DEFAULT 0 COMMENT '1 = verificada por admin, 0 = propuesta',
            proposed_by INT NULL COMMENT 'user_id del alumno que la propuso',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function seedInitialCareers(PDO $pdo): void {
    $stmt = $pdo->query("SELECT COUNT(*) FROM career_catalog");
    if ((int)$stmt->fetchColumn() > 0) return;

    $careers = [
        ['Ingeniería Electrónica'], ['Ingeniería en Sistemas Computacionales'],
        ['Ingeniería Mecatrónica'], ['Ingeniería Eléctrica'], ['Ingeniería Industrial'],
        ['Ingeniería en Robótica'], ['Licenciatura en Informática'],
        ['Licenciatura en Administración de Empresas'], ['Técnico en Programación'],
        ['Técnico en Electrónica'], ['Técnico en Mecatrónica'],
        ['Bachillerato General'], ['Bachillerato Tecnológico']
    ];

    $stmtInsert = $pdo->prepare("INSERT IGNORE INTO career_catalog (name, is_verified) VALUES (?, 1)");
    foreach ($careers as $c) $stmtInsert->execute($c);
}