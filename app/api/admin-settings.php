<?php
/**
 * API: Configuración Dinámica del Sistema (Admin)
 */
require_once __DIR__ . '/_auth_common.php';

if (session_status() === PHP_SESSION_NONE) session_start();

$adminId = (int)($_SESSION['admin_id'] ?? 0);

if ($adminId <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'get_all';
        if ($action === 'get_all') {
            $data = [];
            
            // Convocatorias
            $stmtConv = $pdo->query("SELECT * FROM convocatorias ORDER BY id ASC");
            $data['convocatorias'] = $stmtConv->fetchAll(PDO::FETCH_ASSOC);
            
            // Configuraciones Generales
            $stmtSet = $pdo->query("SELECT * FROM system_settings");
            $data['settings'] = [];
            foreach ($stmtSet->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $data['settings'][$row['setting_key']] = $row;
            }
            
            // Categorías de Robots
            $stmtCat = $pdo->query("SELECT * FROM competition_categories ORDER BY id ASC");
            $data['categories'] = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

            // Etapas de Registro
            $stmtStages = $pdo->query("SELECT * FROM registration_stages ORDER BY start_date ASC");
            $data['stages'] = $stmtStages->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $data]);
            exit;
        }
    }

    if ($method === 'POST') {
        $input = $_POST;
        if (empty($input)) {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
        }
        $action = $input['action'] ?? '';

        // Actualizar Precios Base
        if ($action === 'update_convocatoria') {
            $pdo->prepare("UPDATE convocatorias SET titulo = ?, descripcion = ?, precio_base = ?, is_active = ? WHERE id = ?")
                ->execute([trim($input['titulo'] ?? ''), trim($input['descripcion'] ?? ''), (float)($input['precio_base'] ?? 0), (int)($input['is_active'] ?? 1), (int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Convocatoria actualizada']);
            exit;
        }
        
        // Actualizar Etapas
        if ($action === 'update_stage') {
            $pdo->prepare("UPDATE registration_stages SET stage_name = ?, start_date = ?, end_date = ?, price_per_robot = ?, is_active = ? WHERE id = ?")
                ->execute([trim($input['stage_name'] ?? ''), trim($input['start_date'] ?? ''), trim($input['end_date'] ?? ''), (float)($input['price_per_robot'] ?? 0), (int)($input['is_active'] ?? 1), (int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Etapa de registro actualizada']);
            exit;
        }
        
        // Agregar/Eliminar Categorias
        if ($action === 'add_category') {
            $pdo->prepare("INSERT INTO competition_categories (category_code, category_name, max_weight) VALUES (?, ?, ?)")
                ->execute([trim($input['category_code'] ?? ''), trim($input['category_name'] ?? ''), trim($input['max_weight'] ?? '')]);
            echo json_encode(['success' => true, 'message' => 'Categoría agregada']);
            exit;
        }
        if ($action === 'delete_category') {
            $pdo->prepare("DELETE FROM competition_categories WHERE id = ?")->execute([(int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Categoría eliminada']);
            exit;
        }
        
        // Agregar/Eliminar Etapas
        if ($action === 'add_stage') {
            $pdo->prepare("INSERT INTO registration_stages (stage_name, start_date, end_date, price_per_robot, color_code) VALUES (?, ?, ?, ?, ?)")
                ->execute([trim($input['stage_name'] ?? ''), trim($input['start_date'] ?? ''), trim($input['end_date'] ?? ''), (float)($input['price_per_robot'] ?? 0), trim($input['color_code'] ?? '#3b82f6')]);
            echo json_encode(['success' => true, 'message' => 'Etapa agregada']);
            exit;
        }
        if ($action === 'delete_stage') {
            $pdo->prepare("DELETE FROM registration_stages WHERE id = ?")->execute([(int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Etapa eliminada']);
            exit;
        }

        // Subida dinámica de PDFs
        if ($action === 'upload_document') {
            $type = $input['doc_type'] ?? ''; 
            $idOrKey = $input['ref_id'] ?? '';
            
            if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('No se recibió el archivo o superó el tamaño permitido.');
            }
            
            $fileExt = strtolower(pathinfo($_FILES['document']['name'], PATHINFO_EXTENSION));
            if (!in_array($fileExt, ['pdf', 'doc', 'docx'])) throw new Exception('Solo se permiten archivos PDF o DOCX.');
            
            $uploadDir = __DIR__ . '/../uploads/docs/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
            
            $newFileName = $type . '_' . preg_replace('/[^a-zA-Z0-9]/', '', $idOrKey) . '_' . time() . '.' . $fileExt;
            if (!move_uploaded_file($_FILES['document']['tmp_name'], $uploadDir . $newFileName)) throw new Exception('Error al guardar el archivo.');
            
            $url = '/app/uploads/docs/' . $newFileName;
            
            if ($type === 'convocatoria') $pdo->prepare("UPDATE convocatorias SET documento_url = ? WHERE id = ?")->execute([$url, (int)$idOrKey]);
            elseif ($type === 'setting') $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?")->execute([$url, $idOrKey]);
            elseif ($type === 'category') $pdo->prepare("UPDATE competition_categories SET documento_reglamento_url = ? WHERE id = ?")->execute([$url, (int)$idOrKey]);
            
            echo json_encode(['success' => true, 'message' => 'Documento subido correctamente', 'url' => $url]);
            exit;
        }
        throw new Exception('Acción no reconocida');
    }
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}