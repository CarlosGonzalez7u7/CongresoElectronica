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
                     evento_inicio, evento_fin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    evento_inicio = ?, evento_fin = ?
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
                INSERT INTO competition_categories (category_code, category_name, max_weight, description, competition_datetime, location)
                VALUES (?, ?, ?, ?, ?, ?)
            ")->execute([
                trim($input['category_code'] ?? ''),
                trim($input['category_name'] ?? ''),
                trim($input['max_weight']    ?? ''),
                trim($input['description']   ?? ''),
                $input['competition_datetime'] ?: null,
                trim($input['location'] ?? ''),
            ]);
            echo json_encode(['success' => true, 'message' => 'Categoría agregada']);
            exit;
        }

        // ─── update_category ─────────────────────────────────────
        if ($action === 'update_category') {
            $pdo->prepare("
                UPDATE competition_categories
                SET category_code = ?, category_name = ?, max_weight = ?, description = ?, competition_datetime = ?, location = ?
                WHERE id = ?
            ")->execute([
                trim($input['category_code'] ?? ''),
                trim($input['category_name'] ?? ''),
                trim($input['max_weight']    ?? ''),
                trim($input['description']   ?? ''),
                $input['competition_datetime'] ?: null,
                trim($input['location'] ?? ''),
                (int)($input['id'] ?? 0),
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
            elseif ($type === 'category')
                $pdo->prepare("UPDATE competition_categories SET documento_reglamento_url = ? WHERE id = ?")->execute([$url, (int)$refId]);
            elseif ($type === 'setting')
                $pdo->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?")->execute([$url, $refId]);

            echo json_encode(['success' => true, 'message' => 'Documento subido', 'url' => $url]);
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
                'landing_hero_title' => trim($input['landing_hero_title'] ?? ''),
                'landing_hero_lead'  => trim($input['landing_hero_lead'] ?? ''),
                'landing_hero_pills' => trim($input['landing_hero_pills'] ?? ''),
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
        'description'          => "TEXT NULL",
        'competition_datetime' => "DATETIME NULL",
        'location'             => "VARCHAR(255) NULL",
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