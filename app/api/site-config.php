<?php
/**
 * API: CONFIGURACIÓN DEL SITIO (landing dinámica)
 * Archivo: /app/api/site-config.php
 *
 * Acciones (GET):
 *   ?action=get_landing   → Todo lo necesario para renderizar la landing pública
 *   ?action=get_admin      → Config completa para el panel admin
 *
 * Acciones (POST):
 *   action=save_config     → Guarda una o varias claves de site_config
 *   action=save_hero_image → Sube imagen del hero/mascota
 *   action=save_conv_image → Sube imagen de portada de convocatoria
 */

require_once __DIR__ . '/../config/database.php';

// Sesión y autenticación para escritura
if (session_status() === PHP_SESSION_NONE) session_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? ($_POST['action'] ?? '');

try {
    ensureSiteConfigTable($pdo);

    // ── Lecturas públicas (GET) ──────────────────────────────────
    if ($method === 'GET') {
        if ($action === 'get_landing') {
            echo json_encode(['success' => true, 'data' => getLandingData($pdo)]);
        } elseif ($action === 'get_admin') {
            requireAdmin();
            echo json_encode(['success' => true, 'data' => getAdminConfigData($pdo)]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Acción no reconocida']);
        }
        exit;
    }

    // ── Escrituras (POST) — solo admin ────────────────────────────
    requireAdmin();

    $input = [];
    $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart') !== false;

    if (!$isMultipart) {
        $raw   = file_get_contents('php://input');
        $input = json_decode($raw, true) ?? [];
        if (!is_array($input)) throw new Exception('Payload JSON inválido');
    }

    if ($action === 'save_config') {
        // $input['configs'] = [['key'=>'...','value'=>'...','type'=>'...'], ...]
        $configs = $input['configs'] ?? [];
        if (empty($configs)) throw new Exception('Sin configuraciones para guardar');

        $stmt = $pdo->prepare(
            "INSERT INTO site_config (config_key, config_value, config_type, label, section)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE config_value = VALUES(config_value),
                                     config_type  = VALUES(config_type),
                                     label        = COALESCE(VALUES(label), label),
                                     section      = COALESCE(VALUES(section), section)"
        );
        foreach ($configs as $cfg) {
            $stmt->execute([
                $cfg['key'],
                $cfg['value'],
                $cfg['type'] ?? 'text',
                $cfg['label'] ?? null,
                $cfg['section'] ?? 'general',
            ]);
        }
        echo json_encode(['success' => true, 'message' => 'Configuración guardada']);

    } elseif ($action === 'save_hero_image') {
        $url = handleImageUpload('hero_image', 'hero');
        saveConfigKey($pdo, 'hero_image_url', $url, 'image_url');
        echo json_encode(['success' => true, 'url' => $url]);

    } elseif ($action === 'save_conv_image') {
        $convId = (int)($_POST['conv_id'] ?? 0);
        if (!$convId) throw new Exception('conv_id requerido');
        $url = handleImageUpload('cover_image', 'conv_covers');
        $pdo->prepare("UPDATE convocatorias SET cover_image_url = ? WHERE id = ?")->execute([$url, $convId]);
        echo json_encode(['success' => true, 'url' => $url]);

    } elseif ($action === 'save_convocatoria_extended') {
        // Guardar campos extendidos de convocatoria (icon, color, rich_content, show_on_landing, landing_order)
        $id = (int)($input['id'] ?? 0);
        if (!$id) throw new Exception('id requerido');

        $fields = [];
        $params = [];
        $allowed = ['rich_content', 'icon', 'color', 'show_on_landing', 'landing_order'];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $input)) {
                $fields[] = "`$f` = ?";
                $params[] = $input[$f];
            }
        }
        if (empty($fields)) throw new Exception('Sin campos para actualizar');
        $params[] = $id;
        $pdo->prepare("UPDATE convocatorias SET " . implode(', ', $fields) . " WHERE id = ?")->execute($params);
        echo json_encode(['success' => true]);

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Acción no reconocida']);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'Error del servidor',
    ]);
}

/* ══════════════════════════════════════════════════════════
   FUNCIONES
══════════════════════════════════════════════════════════ */

function getLandingData(PDO $pdo): array
{
    // Site config
    $cfg = [];
    foreach ($pdo->query("SELECT config_key, config_value, config_type FROM site_config") as $row) {
        $val = $row['config_value'];
        if ($row['config_type'] === 'json' && $val) {
            try { $val = json_decode($val, true); } catch (\Throwable $e) {}
        }
        $cfg[$row['config_key']] = $val;
    }

    // Convocatorias activas para landing, ordenadas
    $stmt = $pdo->query(
        "SELECT id, codigo, titulo, descripcion, rich_content, conv_tipo,
                precio_base, pricing_mode, price_stages,
                inscripcion_inicio, inscripcion_fin, evento_inicio, evento_fin,
                icon, color, cover_image_url, landing_order
         FROM convocatorias
         WHERE is_active = 1 AND (show_on_landing IS NULL OR show_on_landing = 1)
         ORDER BY COALESCE(landing_order, 99), id"
    );
    $convocatorias = [];
    foreach ($stmt->fetchAll() as $r) {
        if ($r['price_stages']) {
            try { $r['price_stages'] = json_decode($r['price_stages'], true); } catch (\Throwable $e) {}
        }
        $convocatorias[] = $r;
    }

    return ['config' => $cfg, 'convocatorias' => $convocatorias];
}

function getAdminConfigData(PDO $pdo): array
{
    $rows = $pdo->query("SELECT * FROM site_config ORDER BY section, config_key")->fetchAll();
    return ['site_config' => $rows];
}

function saveConfigKey(PDO $pdo, string $key, string $value, string $type = 'text'): void
{
    $pdo->prepare(
        "INSERT INTO site_config (config_key, config_value, config_type)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)"
    )->execute([$key, $value, $type]);
}

function handleImageUpload(string $field, string $folder): string
{
    if (empty($_FILES[$field]['tmp_name'])) throw new Exception('No se recibió imagen');
    $file     = $_FILES[$field];
    $allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $mimeType = mime_content_type($file['tmp_name']);
    if (!in_array($mimeType, $allowed)) throw new Exception('Tipo de imagen no permitido');
    if ($file['size'] > 5 * 1024 * 1024) throw new Exception('Imagen demasiado grande (máx 5 MB)');

    $ext     = pathinfo($file['name'], PATHINFO_EXTENSION);
    $newName = uniqid('img_', true) . '.' . strtolower($ext);
    $dir     = __DIR__ . "/../../public/assets/uploads/$folder/";
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    if (!move_uploaded_file($file['tmp_name'], $dir . $newName)) throw new Exception('Error al mover archivo');

    return "assets/uploads/$folder/$newName";
}

function requireAdmin(): void
{
    if (empty($_SESSION['admin_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'No autorizado']);
        exit;
    }
}

function ensureSiteConfigTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `site_config` (
            `config_key`   VARCHAR(120) NOT NULL,
            `config_value` LONGTEXT DEFAULT NULL,
            `config_type`  ENUM('text','html','json','image_url') NOT NULL DEFAULT 'text',
            `label`        VARCHAR(200) DEFAULT NULL,
            `section`      VARCHAR(80) DEFAULT 'general',
            `updated_at`   TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`config_key`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}
