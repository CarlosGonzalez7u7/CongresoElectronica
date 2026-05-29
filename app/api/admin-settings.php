<?php
/**
 * API: Configuración Dinámica del Sistema (Admin) v3.0
 * - conv_tipo: texto libre (sin opciones fijas)
 * - inscripcion_inicio, inscripcion_fin: fechas de apertura/cierre de inscripciones
 * - evento_inicio, evento_fin: fechas del evento real (con hora)
 * - Eliminado el campo "codigo" como obligatorio del formulario (se mantiene en BD por compatibilidad)
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
    // ══════════════════════════════════
    //  GET
    // ══════════════════════════════════
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'get_all';

        // ─── get_all ─────────────────────────────────────────────
        if ($action === 'get_all') {
            ensureColumns($pdo);
            $data = [];

            $data['convocatorias'] = $pdo->query("SELECT * FROM convocatorias ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

            // Cargar la galería de imágenes para cada convocatoria
            $convIds = array_column($data['convocatorias'], 'id');
            if (!empty($convIds)) {
                $placeholders = implode(',', array_fill(0, count($convIds), '?'));
                $stmtImgs = $pdo->prepare("SELECT * FROM convocatoria_images WHERE convocatoria_id IN ($placeholders)");
                $stmtImgs->execute($convIds);
                $images = $stmtImgs->fetchAll(PDO::FETCH_ASSOC);
                $imagesByConv = [];
                foreach ($images as $img) {
                    $imagesByConv[$img['convocatoria_id']][] = $img;
                }
                foreach ($data['convocatorias'] as &$conv) {
                    $conv['images'] = $imagesByConv[$conv['id']] ?? [];
                    $conv['modules'] = [];
                }
            }

            if (!empty($convIds)) {
                $placeholders = implode(',', array_fill(0, count($convIds), '?'));
                $stmtMods = $pdo->prepare("SELECT * FROM convocatoria_modules WHERE convocatoria_id IN ($placeholders) ORDER BY sort_order ASC, id ASC");
                $stmtMods->execute($convIds);
                $modulesByConv = [];
                $allModRows = $stmtMods->fetchAll(PDO::FETCH_ASSOC);
                // Load module images
                $allModIds = array_column($allModRows, 'id');
                $modImagesByModId = [];
                if (!empty($allModIds)) {
                    try {
                        $ph2 = implode(',', array_fill(0, count($allModIds), '?'));
                        $stmtModImgs = $pdo->prepare("SELECT * FROM convocatoria_module_images WHERE module_id IN ($ph2) ORDER BY id ASC");
                        $stmtModImgs->execute($allModIds);
                        foreach ($stmtModImgs->fetchAll(PDO::FETCH_ASSOC) as $mi) {
                            $modImagesByModId[(int)$mi['module_id']][] = $mi;
                        }
                    } catch (Throwable $ignored) {}
                }
                foreach ($allModRows as $moduleRow) {
                    $moduleRow['config_json'] = json_decode($moduleRow['config_json'] ?? 'null', true);
                    // Attach photo url from config_json to top-level key
                    $moduleRow['responsible_photo_url'] = $moduleRow['config_json']['responsible_photo_url'] ?? null;
                    $moduleRow['responsible_bio'] = $moduleRow['config_json']['bio'] ?? null;
                    $moduleRow['responsible_org'] = $moduleRow['config_json']['org'] ?? null;
                    $moduleRow['images'] = $modImagesByModId[(int)$moduleRow['id']] ?? [];
                    $modulesByConv[(int)$moduleRow['convocatoria_id']][] = $moduleRow;
                }
                foreach ($data['convocatorias'] as &$conv) {
                    $conv['modules'] = $modulesByConv[$conv['id']] ?? [];
                }
            }

            $stmtSet = $pdo->query("SELECT * FROM system_settings");
            $data['settings'] = [];
            foreach ($stmtSet->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $data['settings'][$row['setting_key']] = $row;
            }

            $data['categories'] = $pdo->query("SELECT * FROM competition_categories ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
            $data['stages']     = $pdo->query("SELECT * FROM registration_stages ORDER BY start_date ASC")->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            exit;
        }

        // ─── conv_records_count ──────────────────────────────────
        if ($action === 'conv_records_count') {
            $id    = (int)($_GET['id'] ?? 0);
            $count = 0;
            try {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM congress_enrollment_requests WHERE convocatoria_id = ?");
                $stmt->execute([$id]);
                $count += (int)$stmt->fetchColumn();
            } catch (Throwable $ignored) {}
            try {
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM teams WHERE convocatoria_id = ?");
                $stmt->execute([$id]);
                $count += (int)$stmt->fetchColumn();
            } catch (Throwable $ignored) {}
            echo json_encode(['success' => true, 'count' => $count]);
            exit;
        }

        // ─── backup_conv ─────────────────────────────────────────
        if ($action === 'backup_conv') {
            $id = (int)($_GET['id'] ?? 0);
            outputConvBackupCSV($pdo, $id);
            exit;
        }

        // ─── backup_full ─────────────────────────────────────────
        if ($action === 'backup_full') {
            outputFullBackupCSV($pdo);
            exit;
        }
    }

    // ══════════════════════════════════
    //  POST
    // ══════════════════════════════════
    if ($method === 'POST') {
        $input = $_POST;
        if (empty($input)) {
            $raw   = file_get_contents('php://input');
            $input = json_decode($raw, true) ?? [];
        }
        $action = $input['action'] ?? '';

        ensureColumns($pdo);

        // ─── add_convocatoria ────────────────────────────────────
        if ($action === 'add_convocatoria') {
            $pdo->prepare("
                INSERT INTO convocatorias
                    (titulo, descripcion, precio_base, is_active,
                     conv_tipo, pricing_mode, price_stages,
                     inscripcion_inicio, inscripcion_fin,
                     evento_inicio, evento_fin, categories_json, included_modules)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                trim($input['titulo']      ?? ''),
                trim($input['descripcion'] ?? ''),
                (float)($input['precio_base'] ?? 0),
                (int)($input['is_active']  ?? 1),
                trim($input['conv_tipo']   ?? ''),
                trim($input['pricing_mode'] ?? 'fixed'),
                $input['price_stages'] ?? null,
                normalizeDateTime($input['inscripcion_inicio'] ?? null),
                normalizeDateTime($input['inscripcion_fin']    ?? null),
                normalizeDateTime($input['evento_inicio']      ?? null),
                normalizeDateTime($input['evento_fin']         ?? null),
                $input['categories_json'] ?? null,
                $input['included_modules'] ?? null,
            ]);
            echo json_encode(['success' => true, 'message' => 'Convocatoria creada']);
            exit;
        }

        // ─── update_convocatoria ─────────────────────────────────
        if ($action === 'update_convocatoria') {
            $pdo->prepare("
                UPDATE convocatorias
                SET titulo = ?, descripcion = ?, precio_base = ?, is_active = ?,
                    conv_tipo = ?, pricing_mode = ?, price_stages = ?,
                    inscripcion_inicio = ?, inscripcion_fin = ?,
                    evento_inicio = ?, evento_fin = ?, categories_json = ?, included_modules = ?
                WHERE id = ?
            ")->execute([
                trim($input['titulo']      ?? ''),
                trim($input['descripcion'] ?? ''),
                (float)($input['precio_base'] ?? 0),
                (int)($input['is_active']  ?? 1),
                trim($input['conv_tipo']   ?? ''),
                trim($input['pricing_mode'] ?? 'fixed'),
                $input['price_stages'] ?? null,
                normalizeDateTime($input['inscripcion_inicio'] ?? null),
                normalizeDateTime($input['inscripcion_fin']    ?? null),
                normalizeDateTime($input['evento_inicio']      ?? null),
                normalizeDateTime($input['evento_fin']         ?? null),
                $input['categories_json'] ?? null,
                $input['included_modules'] ?? null,
                (int)($input['id'] ?? 0),
            ]);
            echo json_encode(['success' => true, 'message' => 'Convocatoria actualizada']);
            exit;
        }

        // ─── delete_convocatoria ─────────────────────────────────
        if ($action === 'delete_convocatoria') {
            $id  = (int)($input['id'] ?? 0);
            $pwd = $input['admin_password'] ?? '';

            $stmt = $pdo->prepare("SELECT password_hash FROM admin_users WHERE id = ?");
            $stmt->execute([$adminId]);
            $admin = $stmt->fetch();
            if (!$admin || !password_verify($pwd, $admin['password_hash'])) {
                throw new Exception('Contraseña incorrecta');
            }

            foreach (['congress_enrollment_requests', 'teams'] as $table) {
                try {
                    $pdo->prepare("DELETE FROM {$table} WHERE convocatoria_id = ?")->execute([$id]);
                } catch (Throwable $ignored) {}
            }

            $pdo->prepare("DELETE FROM convocatorias WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Convocatoria eliminada']);
            exit;
        }

        // ─── update_stage ────────────────────────────────────────
        if ($action === 'update_stage') {
            $pdo->prepare("
                UPDATE registration_stages
                SET stage_name = ?, start_date = ?, end_date = ?, price_per_robot = ?, is_active = ?, color_code = ?
                WHERE id = ?
            ")->execute([
                trim($input['stage_name'] ?? ''),
                trim($input['start_date'] ?? ''),
                trim($input['end_date']   ?? ''),
                (float)($input['price_per_robot'] ?? 0),
                (int)($input['is_active'] ?? 1),
                trim($input['color_code'] ?? '#10b981'),
                (int)($input['id'] ?? 0),
            ]);
            echo json_encode(['success' => true, 'message' => 'Etapa actualizada']);
            exit;
        }

        // ─── add_stage ───────────────────────────────────────────
        if ($action === 'add_stage') {
            $pdo->prepare("
                INSERT INTO registration_stages (stage_name, start_date, end_date, price_per_robot, color_code)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([
                trim($input['stage_name'] ?? ''),
                trim($input['start_date'] ?? ''),
                trim($input['end_date']   ?? ''),
                (float)($input['price_per_robot'] ?? 0),
                trim($input['color_code'] ?? '#3b82f6'),
            ]);
            echo json_encode(['success' => true, 'message' => 'Etapa agregada']);
            exit;
        }

        // ─── delete_stage ────────────────────────────────────────
        if ($action === 'delete_stage') {
            $pdo->prepare("DELETE FROM registration_stages WHERE id = ?")->execute([(int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Etapa eliminada']);
            exit;
        }

        // ─── add_category ────────────────────────────────────────
        if ($action === 'add_category') {
            $pdo->prepare("
                INSERT INTO competition_categories
                    (category_code, category_name, max_weight, description, competition_datetime, location,
                     weight_label, tag, icon_type, is_remote_controlled, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                trim($input['category_code'] ?? ''),
                trim($input['category_name'] ?? ''),
                trim($input['max_weight']    ?? ''),
                trim($input['description']   ?? ''),
                $input['competition_datetime'] ?: null,
                trim($input['location']      ?? ''),
                trim($input['weight_label']  ?? ''),
                trim($input['tag']           ?? ''),
                trim($input['icon_type']     ?? 'fas fa-flag'),
                (int)($input['is_remote_controlled'] ?? 0),
                (int)($input['sort_order']   ?? 0),
            ]);
            $newId = (int)$pdo->lastInsertId();
            echo json_encode(['success' => true, 'message' => 'Categoría agregada', 'id' => $newId]);
            exit;
        }

        // ─── update_category ─────────────────────────────────────
        if ($action === 'update_category') {
            $pdo->prepare("
                UPDATE competition_categories
                SET category_code = ?, category_name = ?, max_weight = ?, description = ?,
                    competition_datetime = ?, location = ?,
                    weight_label = ?, tag = ?, icon_type = ?, is_remote_controlled = ?, sort_order = ?
                WHERE id = ?
            ")->execute([
                trim($input['category_code'] ?? ''),
                trim($input['category_name'] ?? ''),
                trim($input['max_weight']    ?? ''),
                trim($input['description']   ?? ''),
                $input['competition_datetime'] ?: null,
                trim($input['location']      ?? ''),
                trim($input['weight_label']  ?? ''),
                trim($input['tag']           ?? ''),
                trim($input['icon_type']     ?? 'fas fa-flag'),
                (int)($input['is_remote_controlled'] ?? 0),
                (int)($input['sort_order']   ?? 0),
                (int)($input['id']           ?? 0),
            ]);
            echo json_encode(['success' => true, 'message' => 'Categoría actualizada']);
            exit;
        }

        // ─── delete_category ─────────────────────────────────────
        if ($action === 'delete_category') {
            $pdo->prepare("DELETE FROM competition_categories WHERE id = ?")->execute([(int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Categoría eliminada']);
            exit;
        }


        // ─── upload_reglamento_categoria ─────────────────────────
        if ($action === 'upload_reglamento_categoria') {
            $catId = (int)($input['category_id'] ?? 0);
            if ($catId <= 0) throw new Exception('category_id requerido.');

            if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('No se recibió el archivo o superó el tamaño permitido.');
            }
            $ext = strtolower(pathinfo($_FILES['document']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['pdf', 'doc', 'docx'])) throw new Exception('Solo PDF o DOCX.');

            $uploadDir = __DIR__ . '/../uploads/docs/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

            // Borrar reglamento anterior si existe
            $stmtOld = $pdo->prepare("SELECT documento_reglamento_url FROM competition_categories WHERE id = ?");
            $stmtOld->execute([$catId]);
            $oldUrl = $stmtOld->fetchColumn();
            if ($oldUrl) {
                $oldPath = __DIR__ . '/../' . ltrim($oldUrl, '/app/');
                if (file_exists($oldPath)) @unlink($oldPath);
            }

            $newFile = 'reglamento_cat' . $catId . '_' . time() . '.' . $ext;
            if (!move_uploaded_file($_FILES['document']['tmp_name'], $uploadDir . $newFile))
                throw new Exception('Error al guardar el reglamento.');

            $url = '/app/uploads/docs/' . $newFile;
            $pdo->prepare("UPDATE competition_categories SET documento_reglamento_url = ? WHERE id = ?")
                ->execute([$url, $catId]);

            echo json_encode(['success' => true, 'message' => 'Reglamento subido', 'url' => $url]);
            exit;
        }

        // ─── upload_document ─────────────────────────────────────
        if ($action === 'upload_document') {
            $type  = $input['doc_type'] ?? '';
            $refId = $input['ref_id']   ?? '';

            if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('No se recibió el archivo o superó el tamaño permitido.');
            }
            $ext = strtolower(pathinfo($_FILES['document']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['pdf', 'doc', 'docx'])) throw new Exception('Solo PDF o DOCX.');

            $uploadDir = __DIR__ . '/../uploads/docs/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

            $newFile = $type . '_' . preg_replace('/[^a-zA-Z0-9]/', '', $refId) . '_' . time() . '.' . $ext;
            if (!move_uploaded_file($_FILES['document']['tmp_name'], $uploadDir . $newFile))
                throw new Exception('Error al guardar el archivo.');

            $url = '/app/uploads/docs/' . $newFile;

            if ($type === 'convocatoria')
                $pdo->prepare("UPDATE convocatorias SET documento_url = ? WHERE id = ?")->execute([$url, (int)$refId]);
            elseif ($type === 'setting')
                $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?")->execute([$url, $refId]);
            elseif ($type === 'generic') {} // No hace insert en DB, solo devuelve la URL para ser usada en el JSON

            echo json_encode(['success' => true, 'message' => 'Documento subido', 'url' => $url]);
            exit;
        }

        // ─── save_convocatoria_module ────────────────────────────
        if ($action === 'save_convocatoria_module') {
            $convocatoriaId = (int)($input['convocatoria_id'] ?? 0);
            $moduleId = (int)($input['id'] ?? 0);
            $moduleKey = trim((string)($input['module_key'] ?? ''));
            $moduleType = trim((string)($input['module_type'] ?? 'custom'));
            $title = trim((string)($input['title'] ?? ''));
            $description = trim((string)($input['description'] ?? ''));
            $icon = trim((string)($input['icon'] ?? 'fas fa-star'));
            $status = trim((string)($input['status'] ?? 'draft'));
            $sortOrder = (int)($input['sort_order'] ?? 0);
            $responsibleName = trim((string)($input['responsible_name'] ?? ''));
            $responsibleEmail = trim((string)($input['responsible_email'] ?? ''));
            $responsiblePhone = trim((string)($input['responsible_phone'] ?? ''));
            $responsibleUsername = trim((string)($input['responsible_username'] ?? ''));
            $responsibleRole = trim((string)($input['responsible_role'] ?? ''));
            $configJson = $input['config_json'] ?? null;
            
            // Nuevos campos del módulo
            $price = (float)($input['price'] ?? 0);
            $location = trim((string)($input['location'] ?? ''));
            $scheduleDate = !empty($input['schedule_date']) ? $input['schedule_date'] : null;
            $timeStart = !empty($input['time_start']) ? $input['time_start'] : null;
            $timeEnd = !empty($input['time_end']) ? $input['time_end'] : null;
            $maxCapacity = (int)($input['max_capacity'] ?? 0);

            if ($convocatoriaId <= 0) throw new Exception('convocatoria_id requerido');
            if ($title === '') throw new Exception('El título del módulo es requerido');

            $allowedTypes = ['workshop', 'conference', 'custom'];
            if (!in_array($moduleType, $allowedTypes, true)) $moduleType = 'custom';

            $allowedStatus = ['draft', 'published', 'disabled'];
            if (!in_array($status, $allowedStatus, true)) $status = 'draft';

            if ($configJson !== null && !is_string($configJson)) {
                $configJson = json_encode($configJson, JSON_UNESCAPED_UNICODE);
            }

            if ($moduleId > 0) {
                $pdo->prepare("
                    UPDATE convocatoria_modules SET
                        module_key = ?, module_type = ?, title = ?, description = ?, icon = ?, status = ?, sort_order = ?,
                        responsible_name = ?, responsible_email = ?, responsible_phone = ?, responsible_username = ?, responsible_role = ?,
                        config_json = ?, price = ?, location = ?, schedule_date = ?, time_start = ?, time_end = ?, max_capacity = ?, updated_at = NOW()
                    WHERE id = ? AND convocatoria_id = ?
                ")->execute([
                    $moduleKey, $moduleType, $title, $description, $icon, $status, $sortOrder,
                    $responsibleName, $responsibleEmail, $responsiblePhone, $responsibleUsername, $responsibleRole,
                    $configJson, $price, $location, $scheduleDate, $timeStart, $timeEnd, $maxCapacity, $moduleId, $convocatoriaId,
                ]);
                echo json_encode(['success' => true, 'message' => 'Módulo actualizado', 'id' => $moduleId]);
                exit;
            }

            $pdo->prepare("
                INSERT INTO convocatoria_modules
                    (convocatoria_id, module_key, module_type, title, description, icon, status, sort_order,
                     responsible_name, responsible_email, responsible_phone, responsible_username, responsible_role, config_json,
                     price, location, schedule_date, time_start, time_end, max_capacity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                $convocatoriaId, $moduleKey, $moduleType, $title, $description, $icon, $status, $sortOrder,
                $responsibleName, $responsibleEmail, $responsiblePhone, $responsibleUsername, $responsibleRole, $configJson,
                $price, $location, $scheduleDate, $timeStart, $timeEnd, $maxCapacity
            ]);
            echo json_encode(['success' => true, 'message' => 'Módulo creado', 'id' => (int)$pdo->lastInsertId()]);
            exit;
        }

        // ─── delete_convocatoria_module ─────────────────────────
        if ($action === 'delete_convocatoria_module') {
            $moduleId = (int)($input['id'] ?? 0);
            if ($moduleId <= 0) throw new Exception('id requerido');
            $pdo->prepare("DELETE FROM convocatoria_modules WHERE id = ?")->execute([$moduleId]);
            echo json_encode(['success' => true, 'message' => 'Módulo eliminado']);
            exit;
        }

        // ─── upload_module_responsible_photo ─────────────────────
        if ($action === 'upload_module_responsible_photo') {
            $moduleId       = (int)($input['module_id'] ?? 0);
            $convocatoriaId = (int)($input['convocatoria_id'] ?? 0);

            if ($moduleId <= 0) throw new Exception('module_id requerido');
            if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK)
                throw new Exception('No se recibió la foto o superó el tamaño permitido.');

            $ext = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['png','jpg','jpeg','webp']))
                throw new Exception('Formato de imagen no válido (PNG, JPG, WEBP).');

            $uploadDir = __DIR__ . '/../uploads/modules/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

            $newFile = 'mod_resp_' . $moduleId . '_' . time() . '.' . $ext;
            if (!move_uploaded_file($_FILES['photo']['tmp_name'], $uploadDir . $newFile))
                throw new Exception('Error al guardar la imagen.');

            $url = '/app/uploads/modules/' . $newFile;

            // Guardar URL en config_json del módulo (campo extra)
            $stmt = $pdo->prepare("SELECT config_json FROM convocatoria_modules WHERE id = ?");
            $stmt->execute([$moduleId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $cfg = json_decode($row['config_json'] ?? '{}', true) ?? [];
            $cfg['responsible_photo_url'] = $url;
            $pdo->prepare("UPDATE convocatoria_modules SET config_json = ?, updated_at = NOW() WHERE id = ?")
                ->execute([json_encode($cfg, JSON_UNESCAPED_UNICODE), $moduleId]);

            echo json_encode(['success' => true, 'url' => $url, 'message' => 'Foto del responsable guardada.']);
            exit;
        }

        // ─── upload_module_image (galería) ───────────────────────
        if ($action === 'upload_module_image') {
            $moduleId       = (int)($input['module_id'] ?? 0);
            $convocatoriaId = (int)($input['convocatoria_id'] ?? 0);

            if ($moduleId <= 0) throw new Exception('module_id requerido');
            if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK)
                throw new Exception('No se recibió la imagen o superó el tamaño permitido.');

            // Verificar límite de 8 imágenes por módulo
            $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM convocatoria_module_images WHERE module_id = ?");
            $stmtCheck->execute([$moduleId]);
            if ((int)$stmtCheck->fetchColumn() >= 8)
                throw new Exception('Límite máximo de 8 imágenes por módulo alcanzado.');

            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['png','jpg','jpeg','webp']))
                throw new Exception('Formato de imagen no válido (PNG, JPG, WEBP).');

            $uploadDir = __DIR__ . '/../uploads/modules/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

            $newFile = 'mod_' . $moduleId . '_' . time() . '_' . rand(100,999) . '.' . $ext;
            if (!move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $newFile))
                throw new Exception('Error al guardar la imagen.');

            $url = '/app/uploads/modules/' . $newFile;

            // Crear tabla si no existe
            $pdo->exec("CREATE TABLE IF NOT EXISTS convocatoria_module_images (
                id INT AUTO_INCREMENT PRIMARY KEY,
                module_id INT NOT NULL,
                convocatoria_id INT NOT NULL DEFAULT 0,
                filename VARCHAR(255) NOT NULL,
                url VARCHAR(500) NOT NULL,
                caption VARCHAR(255) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_module (module_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $pdo->prepare("INSERT INTO convocatoria_module_images (module_id, convocatoria_id, filename, url) VALUES (?, ?, ?, ?)")
                ->execute([$moduleId, $convocatoriaId, $newFile, $url]);

            $newId = (int)$pdo->lastInsertId();
            echo json_encode(['success' => true, 'id' => $newId, 'url' => $url, 'message' => 'Imagen agregada.']);
            exit;
        }

        // ─── delete_module_image ─────────────────────────────────
        if ($action === 'delete_module_image') {
            $imgId = (int)($input['id'] ?? 0);
            if ($imgId <= 0) throw new Exception('id requerido');
            try {
                $stmt = $pdo->prepare("SELECT filename FROM convocatoria_module_images WHERE id = ?");
                $stmt->execute([$imgId]);
                $img = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($img) {
                    $filePath = __DIR__ . '/../uploads/modules/' . $img['filename'];
                    if (file_exists($filePath)) unlink($filePath);
                }
                $pdo->prepare("DELETE FROM convocatoria_module_images WHERE id = ?")
                    ->execute([$imgId]);
            } catch (Throwable $ignored) {}
            echo json_encode(['success' => true, 'message' => 'Imagen eliminada.']);
            exit;
        }


        // ─── upload_convocatoria_image ───────────────────────────
        if ($action === 'upload_convocatoria_image') {
            $convocatoriaId = (int)($input['convocatoria_id'] ?? 0);
            $caption = trim($input['caption'] ?? '');

            if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('No se recibió la imagen o superó el tamaño permitido.');
            }
            
            // Verificar la limitación máxima de 4 imágenes
            $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM convocatoria_images WHERE convocatoria_id = ?");
            $stmtCheck->execute([$convocatoriaId]);
            if ((int)$stmtCheck->fetchColumn() >= 4) {
                throw new Exception('Límite máximo de 4 imágenes alcanzado para esta convocatoria.');
            }

            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['png', 'jpg', 'jpeg', 'webp'])) throw new Exception('Solo formato de imagen válido (PNG, JPG, WEBP).');

            $uploadDir = __DIR__ . '/../uploads/convocatorias/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

            $newFile = 'conv_' . $convocatoriaId . '_' . time() . '_' . rand(100,999) . '.' . $ext;
            if (!move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $newFile))
                throw new Exception('Error al guardar la imagen en el servidor.');

            $url = '/app/uploads/convocatorias/' . $newFile;

            $pdo->prepare("INSERT INTO convocatoria_images (convocatoria_id, filename, url, caption) VALUES (?, ?, ?, ?)")
                ->execute([$convocatoriaId, $newFile, $url, $caption]);

            echo json_encode(['success' => true, 'message' => 'Imagen subida exitosamente.', 'url' => $url]);
            exit;
        }

        // ─── clean_database ──────────────────────────────────────
        if ($action === 'clean_database') {
            $pwd = $input['admin_password'] ?? '';
            $stmt = $pdo->prepare("SELECT password_hash FROM admin_users WHERE id = ?");
            $stmt->execute([$adminId]);
            $admin = $stmt->fetch();
            if (!$admin || !password_verify($pwd, $admin['password_hash'])) {
                throw new Exception('Contraseña incorrecta');
            }

            $tablesToClean = [
                'audit_log', 'legal_acceptance', 'payment_receipts',
                'robots', 'team_members', 'teams',
                'congress_enrollment_requests',
            ];
            foreach ($tablesToClean as $table) {
                try { $pdo->exec("DELETE FROM `{$table}`"); } catch (Throwable $ignored) {}
            }
            try {
                $pdo->prepare("DELETE FROM admin_users WHERE id != ?")->execute([$adminId]);
            } catch (Throwable $ignored) {}

            echo json_encode(['success' => true, 'message' => 'Base de datos limpiada correctamente. Solo tu cuenta admin fue conservada.']);
            exit;
        }

        // ─── update_landing_settings ─────────────────────────────
        if ($action === 'update_landing_settings') {
            $settings = [
                'event_name'         => trim($input['event_name'] ?? ''),
                'landing_hero_title' => trim($input['landing_hero_title'] ?? ''),
                'landing_hero_lead'  => trim($input['landing_hero_lead'] ?? ''),
                'landing_hero_pills' => trim($input['landing_hero_pills'] ?? ''),
                'landing_contact_email' => trim($input['landing_contact_email'] ?? ''),
                'landing_contact_phone' => trim($input['landing_contact_phone'] ?? ''),
                'landing_location' => trim($input['landing_location'] ?? ''),
                'landing_feature_band' => trim($input['landing_feature_band'] ?? ''),
                'landing_event_date' => normalizeDateTime($input['landing_event_date'] ?? null),
                'landing_event_end_date' => normalizeDateTime($input['landing_event_end_date'] ?? null),
            ];

            foreach ($settings as $key => $value) {
                $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                $stmt->execute([$key, $value, $value]);
            }
            echo json_encode(['success' => true, 'message' => 'Configuración de la Landing Page guardada exitosamente']);
            exit;
        }

        throw new Exception('Acción no reconocida: ' . htmlspecialchars($action));
    }

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Convierte 'YYYY-MM-DDTHH:MM' o 'YYYY-MM-DD HH:MM' a 'YYYY-MM-DD HH:MM:SS'
 * Devuelve NULL si el valor está vacío.
 */
function normalizeDateTime(?string $val): ?string
{
    if (!$val || trim($val) === '') return null;
    $val = str_replace('T', ' ', trim($val));
    // Agregar segundos si faltan
    if (strlen($val) === 16) $val .= ':00';
    return $val;
}

/**
 * Asegura que existen las columnas necesarias en la tabla convocatorias.
 * Se ejecuta en cada petición (bajo coste gracias a SHOW COLUMNS con caché de MySQL).
 */
function ensureColumns(PDO $pdo): void
{
    $convExtras = [
        // Columna                Definición SQL
        'conv_tipo'          => "VARCHAR(120) NOT NULL DEFAULT ''",
        'pricing_mode'       => "ENUM('fixed','staged') NOT NULL DEFAULT 'fixed'",
        'price_stages'       => "JSON NULL",
        'inscripcion_inicio' => "DATETIME NULL COMMENT 'Apertura de inscripciones'",
        'inscripcion_fin'    => "DATETIME NULL COMMENT 'Cierre de inscripciones'",
        'evento_inicio'      => "DATETIME NULL COMMENT 'Inicio del evento'",
        'evento_fin'         => "DATETIME NULL COMMENT 'Fin del evento'",
        'categories_json'    => "JSON NULL",
        'included_modules'   => "JSON NULL",
    ];

    foreach ($convExtras as $col => $def) {
        try {
            $check = $pdo->query("SHOW COLUMNS FROM `convocatorias` LIKE '{$col}'")->fetch();
            if (!$check) {
                $pdo->exec("ALTER TABLE `convocatorias` ADD COLUMN `{$col}` {$def}");
            }
        } catch (Throwable $ignored) {}
    }

    // Columnas extra para competition_categories
    $catExtras = [
        'description'              => "TEXT NULL",
        'competition_datetime'     => "DATETIME NULL",
        'location'                 => "VARCHAR(255) NULL",
        'weight_label'             => "VARCHAR(50) NULL",
        'tag'                      => "VARCHAR(30) NULL",
        'icon_type'                => "VARCHAR(80) NULL DEFAULT 'fas fa-flag'",
        'is_remote_controlled'     => "TINYINT(1) NOT NULL DEFAULT 0",
        'sort_order'               => "INT NOT NULL DEFAULT 0",
        'documento_reglamento_url' => "VARCHAR(500) NULL",
    ];
    foreach ($catExtras as $col => $def) {
        try {
            $check = $pdo->query("SHOW COLUMNS FROM `competition_categories` LIKE '{$col}'")->fetch();
            if (!$check) {
                $pdo->exec("ALTER TABLE `competition_categories` ADD COLUMN `{$col}` {$def}");
            }
        } catch (Throwable $ignored) {}
    }

    // Asegurar estructura de la tabla de imagenes
    $pdo->exec("CREATE TABLE IF NOT EXISTS `convocatoria_images` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `convocatoria_id` int(11) NOT NULL,
      `filename` varchar(300) NOT NULL,
      `url` varchar(500) NOT NULL,
      `caption` text DEFAULT NULL,
      `uploaded_at` timestamp NULL DEFAULT current_timestamp(),
      PRIMARY KEY (`id`),
      KEY `idx_conv_img` (`convocatoria_id`),
      CONSTRAINT `fk_conv_img_convocatoria` FOREIGN KEY (`convocatoria_id`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Auto-Crear Columnas extra para los módulos directamente desde PHP
    $modExtras = [
        'price'         => "DECIMAL(10,2) NOT NULL DEFAULT 0.00",
        'location'      => "VARCHAR(255) NULL",
        'schedule_date' => "DATE NULL",
        'time_start'    => "TIME NULL",
        'time_end'      => "TIME NULL",
        'max_capacity'  => "INT(11) NOT NULL DEFAULT 0",
    ];
    foreach ($modExtras as $col => $def) {
        try {
            $check = $pdo->query("SHOW COLUMNS FROM `convocatoria_modules` LIKE '{$col}'")->fetch();
            if (!$check) {
                $pdo->exec("ALTER TABLE `convocatoria_modules` ADD COLUMN `{$col}` {$def}");
            }
        } catch (Throwable $ignored) {}
    }

        $pdo->exec("CREATE TABLE IF NOT EXISTS `convocatoria_modules` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `convocatoria_id` int(11) NOT NULL,
            `module_key` varchar(80) DEFAULT NULL,
            `module_type` enum('workshop','conference','custom') NOT NULL DEFAULT 'custom',
            `title` varchar(180) NOT NULL,
            `description` text DEFAULT NULL,
            `icon` varchar(80) NOT NULL DEFAULT 'fas fa-star',
            `status` enum('draft','published','disabled') NOT NULL DEFAULT 'draft',
            `sort_order` int(11) NOT NULL DEFAULT 0,
            `responsible_name` varchar(180) DEFAULT NULL,
            `responsible_email` varchar(180) DEFAULT NULL,
            `responsible_phone` varchar(40) DEFAULT NULL,
            `responsible_username` varchar(60) DEFAULT NULL,
            `responsible_role` enum('instructor','speaker','manager') DEFAULT NULL,
            `config_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config_json`)),
            `created_at` timestamp NULL DEFAULT current_timestamp(),
            `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (`id`),
            KEY `idx_cm_conv` (`convocatoria_id`),
            KEY `idx_cm_type` (`module_type`),
            KEY `idx_cm_status` (`status`),
            CONSTRAINT `fk_cm_convocatoria` FOREIGN KEY (`convocatoria_id`) REFERENCES `convocatorias` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Asegurar estructura de la tabla system_settings
    $pdo->exec("CREATE TABLE IF NOT EXISTS `system_settings` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `setting_key` varchar(100) NOT NULL,
      `setting_value` text DEFAULT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `unique_setting_key` (`setting_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
}

function outputConvBackupCSV(PDO $pdo, int $id): void
{
    $rows = [];
    foreach (['congress_enrollment_requests', 'teams'] as $table) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM `{$table}` WHERE `convocatoria_id` = ?");
            $stmt->execute([$id]);
            $rows[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $ignored) {
            $rows[$table] = [];
        }
    }

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="backup_convocatoria_' . $id . '_' . date('Ymd_His') . '.csv"');
    $out = fopen('php://output', 'w');
    foreach ($rows as $table => $data) {
        if (!$data) continue;
        fputcsv($out, ['### TABLE: ' . $table . ' ###']);
        fputcsv($out, array_keys($data[0]));
        foreach ($data as $row) fputcsv($out, $row);
        fputcsv($out, []);
    }
    fclose($out);
}

function outputFullBackupCSV(PDO $pdo): void
{
    $tables = [
        'convocatorias','teams','team_members','robots','payment_receipts',
        'congress_enrollment_requests','competition_categories','registration_stages',
    ];
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="backup_completo_' . date('Ymd_His') . '.csv"');
    $out = fopen('php://output', 'w');
    foreach ($tables as $table) {
        try {
            $rows = $pdo->query("SELECT * FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC);
            if (!$rows) continue;
            fputcsv($out, ['### TABLE: ' . $table . ' ###']);
            fputcsv($out, array_keys($rows[0]));
            foreach ($rows as $row) fputcsv($out, $row);
            fputcsv($out, []);
        } catch (Throwable $ignored) {}
    }
    fclose($out);
}