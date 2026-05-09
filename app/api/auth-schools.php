<?php
/**
 * API: Gestión de instituciones / escuelas
 * GET  /app/api/auth-schools.php           -> devuelve nombres de escuelas para registro
 * GET  /app/api/auth-schools.php?admin=1   -> devuelve lista completa para panel admin
 * POST /app/api/auth-schools.php           -> crear/actualizar escuela (o proponer desde usuario)
 */

require_once __DIR__ . '/_auth_common.php';

try {
    ensureInstitutionsTable($pdo);
    ensurePlatformUsersTable($pdo);
    seedInitialSchools($pdo);

    $method = $_SERVER['REQUEST_METHOD'];
    $isAdmin = isset($_GET['admin']) && $_GET['admin'] == '1';

    if ($method === 'GET') {
        if ($isAdmin) {
            // Verificar si es admin
            if (session_status() === PHP_SESSION_NONE) session_start();
            if (empty($_SESSION['admin_id'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'No autorizado']);
                exit;
            }

            $stmt = $pdo->query("SELECT * FROM institution_catalog ORDER BY name ASC");
            $institutions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Contar el uso de cada escuela desde platform_users
            $stmtCounts = $pdo->query("SELECT school, COUNT(*) as count FROM platform_users WHERE school IS NOT NULL AND school != '' GROUP BY school");
            $counts = [];
            while ($row = $stmtCounts->fetch(PDO::FETCH_ASSOC)) {
                $counts[strtolower(trim($row['school']))] = (int)$row['count'];
            }

            foreach ($institutions as &$inst) {
                $inst['is_verified'] = (bool)$inst['is_verified'];
                $inst['times_used'] = $counts[strtolower(trim($inst['name']))] ?? 0;
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'institutions' => $institutions
                ]
            ]);
            exit;
        } else {
            // Frontend: devolver mezcla de schools en platform_users + verified institutions
            $stmt = $pdo->query("
                SELECT name, type, country, state FROM institution_catalog WHERE is_verified = 1
                UNION
                SELECT TRIM(school) AS name, 'universidad' AS type, 'México' AS country, '' AS state FROM platform_users 
                WHERE school IS NOT NULL AND TRIM(school) <> '' AND school NOT IN (SELECT name FROM institution_catalog WHERE is_verified = 1)
            ");
            
            $schools = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => [
                    'schools' => $schools,
                ],
            ]);
            exit;
        }
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) $input = $_POST;
        
        $action = $_GET['action'] ?? $input['action'] ?? '';
        $id = $input['id'] ?? $_GET['id'] ?? null;

        if ($action === 'verify' && $id) {
            if (session_status() === PHP_SESSION_NONE) session_start();
            if (empty($_SESSION['admin_id'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'No autorizado']);
                exit;
            }
            $pdo->prepare("UPDATE institution_catalog SET is_verified = 1 WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Institución verificada']);
            exit;
        }

        if ($action === 'delete' && $id) {
            if (session_status() === PHP_SESSION_NONE) session_start();
            if (empty($_SESSION['admin_id'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'No autorizado']);
                exit;
            }
            $pdo->prepare("DELETE FROM institution_catalog WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Institución eliminada']);
            exit;
        }

        // Crear o actualizar
        $name = sanitizeText($input['name'] ?? '');
        $country = sanitizeText($input['country'] ?? 'México');
        $state = sanitizeText($input['state'] ?? '');
        $type = sanitizeText($input['type'] ?? 'universidad');
        $is_verified = isset($input['is_verified']) ? (int)filter_var($input['is_verified'], FILTER_VALIDATE_BOOLEAN) : 0;
        
        $proposedBy = null;
        // Si el request no es de un admin, forzamos is_verified = 0 (propuesta)
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (empty($_SESSION['admin_id'])) {
            $is_verified = 0;
            $proposedBy = $_SESSION['user_id'] ?? null;
        }

        if (empty($name)) {
            throw new Exception('El nombre es requerido');
        }

        if ($id) {
            // Actualizar
            $stmt = $pdo->prepare("UPDATE institution_catalog SET name = ?, country = ?, state = ?, type = ?, is_verified = ? WHERE id = ?");
            $stmt->execute([$name, $country, $state, $type, $is_verified, $id]);
            echo json_encode(['success' => true, 'message' => 'Institución actualizada']);
        } else {
            // Insertar
            $stmt = $pdo->prepare("INSERT IGNORE INTO institution_catalog (name, country, state, type, is_verified, proposed_by) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $country, $state, $type, $is_verified, $proposedBy]);
            $newId = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'message' => 'Institución creada', 'id' => $newId]);
        }
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

function ensureInstitutionsTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS institution_catalog (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(220) NOT NULL UNIQUE COMMENT 'Nombre oficial de la institución',
            type VARCHAR(50) DEFAULT 'universidad',
            state VARCHAR(120) NULL COMMENT 'Estado de la República o país',
            country VARCHAR(120) DEFAULT 'México' COMMENT 'País de la institución',
            is_verified TINYINT(1) DEFAULT 0 COMMENT '1 = verificada por admin, 0 = propuesta por alumno',
            times_used INT DEFAULT 0 COMMENT 'Veces que alumnos han seleccionado esta escuela',
            proposed_by INT NULL COMMENT 'user_id del alumno que la propuso (NULL si es base)',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function seedInitialSchools(PDO $pdo): void {
    $stmt = $pdo->query("SELECT COUNT(*) FROM institution_catalog");
    if ((int)$stmt->fetchColumn() > 0) return;

    $schools = [
        ['Instituto Tecnológico Superior de Uruapan', 'universidad', 'Michoacán', 'México'],
        ['Instituto Tecnológico de Morelia', 'universidad', 'Michoacán', 'México'],
        ['Instituto Tecnológico Superior de Pátzcuaro', 'universidad', 'Michoacán', 'México'],
        ['Instituto Tecnológico Superior de Zamora', 'universidad', 'Michoacán', 'México'],
        ['Instituto Tecnológico Superior de Apatzingán', 'universidad', 'Michoacán', 'México'],
        ['Universidad Michoacana de San Nicolás de Hidalgo (UMSNH)', 'universidad', 'Michoacán', 'México'],
        ['Preparatoria Federal Lázaro Cárdenas (Uruapan)', 'preparatoria', 'Michoacán', 'México'],
        ['CBTIS 82 Uruapan', 'preparatoria', 'Michoacán', 'México'],
        ['CONALEP Uruapan', 'preparatoria', 'Michoacán', 'México'],
        ['Instituto Politécnico Nacional (IPN)', 'universidad', 'Ciudad de México', 'México'],
        ['Universidad Nacional Autónoma de México (UNAM)', 'universidad', 'Ciudad de México', 'México'],
        ['Instituto Tecnológico de Monterrey (ITESM)', 'universidad', 'Nuevo León', 'México'],
    ];

    $stmtInsert = $pdo->prepare("INSERT IGNORE INTO institution_catalog (name, type, state, country, is_verified) VALUES (?, ?, ?, ?, 1)");
    foreach ($schools as $s) $stmtInsert->execute($s);
}
