<?php
/**
 * API Pública: Convocatorias activas + configuración de landing
 * GET /app/api/public-convocatorias.php
 *
 * No requiere sesión. Devuelve convocatorias activas con talleres/conferencias
 * vinculados, más los settings generales del sistema.
 *
 * Respuesta:
 *  {
 *    success: true,
 *    data: {
 *      convocatorias: [...],   // todas con is_active=1, ordenadas por landing_order
 *      settings: { ... },      // system_settings como objeto clave→valor
 *      stages: [...],          // etapas de robótica activas
 *    }
 *  }
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

// Permitir CORS de mismo origen (opcional, para futuros subdominios)
// header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    // ── 1. Convocatorias activas ──────────────────────────────────────────────
    ensureConvocatoriasColumns($pdo);

    $convRows = $pdo->query("
        SELECT id, codigo, titulo, descripcion, conv_tipo, precio_base,
               is_active, documento_url,
               pricing_mode, price_stages,
               inscripcion_inicio, inscripcion_fin,
               evento_inicio, evento_fin,
               rich_content, cover_image_url, icon, color,
               show_on_landing, landing_order,
               categories_json, included_modules
        FROM convocatorias
        WHERE is_active = 1
        ORDER BY landing_order ASC, id ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Decodificar JSON embebido en cada convocatoria
    foreach ($convRows as &$conv) {
        $conv['price_stages']     = jsonDecodeField($conv['price_stages']);
        $conv['categories_json']  = jsonDecodeField($conv['categories_json']);
        $conv['included_modules'] = jsonDecodeField($conv['included_modules']);
        $conv['precio_base']      = (float) $conv['precio_base'];
        $conv['is_active']        = (bool)  $conv['is_active'];
        $conv['show_on_landing']  = (bool)  $conv['show_on_landing'];
        $conv['landing_order']    = (int)   $conv['landing_order'];
    }
    unset($conv);

    // ── 2. Talleres publicados (para vincular a convocatoria) ─────────────────
    // Los talleres se vinculan por convocatoria_id si existe la columna,
    // o por defecto se asocian al congreso (codigo = 'congreso').
    $workshops = [];
    try {
        $wsRows = $pdo->query("
            SELECT w.id, w.name, w.description, w.location, w.max_capacity,
                   w.schedule_date, w.schedule_start, w.schedule_end,
                   w.cover_image_url, w.status,
                   wi.full_name AS instructor_name,
                   (SELECT COUNT(*) FROM workshop_enrollments we
                    WHERE we.workshop_id = w.id AND we.status != 'cancelled') AS enrolled_count,
                   COALESCE(w.convocatoria_id, 0) AS convocatoria_id
            FROM workshops w
            LEFT JOIN workshop_instructors wi ON wi.id = w.instructor_id
            WHERE w.status IN ('published', 'full')
            ORDER BY w.schedule_date ASC, w.schedule_start ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        foreach ($wsRows as &$ws) {
            $ws['max_capacity']    = (int)   $ws['max_capacity'];
            $ws['enrolled_count']  = (int)   $ws['enrolled_count'];
            $ws['convocatoria_id'] = (int)   $ws['convocatoria_id'];
            $workshops[] = $ws;
        }
        unset($ws);
    } catch (Throwable $e) {
        // La columna convocatoria_id podría no existir aún; se añade a continuación
        try {
            $pdo->exec("ALTER TABLE workshops ADD COLUMN convocatoria_id INT NULL DEFAULT NULL AFTER instructor_id");
        } catch (Throwable $ignored) {}

        // Reintentar sin convocatoria_id
        $wsRows = $pdo->query("
            SELECT w.id, w.name, w.description, w.location, w.max_capacity,
                   w.schedule_date, w.schedule_start, w.schedule_end,
                   w.cover_image_url, w.status,
                   wi.full_name AS instructor_name,
                   (SELECT COUNT(*) FROM workshop_enrollments we
                    WHERE we.workshop_id = w.id AND we.status != 'cancelled') AS enrolled_count,
                   NULL AS convocatoria_id
            FROM workshops w
            LEFT JOIN workshop_instructors wi ON wi.id = w.instructor_id
            WHERE w.status IN ('published', 'full')
            ORDER BY w.schedule_date ASC, w.schedule_start ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        foreach ($wsRows as &$ws) {
            $ws['max_capacity']    = (int) $ws['max_capacity'];
            $ws['enrolled_count']  = (int) $ws['enrolled_count'];
            $ws['convocatoria_id'] = 0;
            $workshops[] = $ws;
        }
        unset($ws);
    }

    // ── 3. Conferencias publicadas ────────────────────────────────────────────
    $conferences = [];
    try {
        $cfRows = $pdo->query("
            SELECT c.id, c.name, c.description, c.speaker_name,
                   c.conference_date, c.time_start, c.time_end,
                   c.location, c.cover_image_url, c.status,
                   COALESCE(c.convocatoria_id, 0) AS convocatoria_id
            FROM conferences c
            WHERE c.status IN ('published', 'full')
            ORDER BY c.conference_date ASC, c.time_start ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        foreach ($cfRows as &$cf) {
            $cf['convocatoria_id'] = (int) $cf['convocatoria_id'];
            $conferences[] = $cf;
        }
        unset($cf);
    } catch (Throwable $ignored) {
        // La tabla conferences podría no existir en esta versión; ignorar
    }

    // ── 4. Módulos configurados desde el editor ───────────────────────────────
    $modules = [];
    try {
        $modRows = $pdo->query("
            SELECT id, convocatoria_id, module_key, module_type, title, description,
                   icon, status, sort_order,
                   responsible_name, responsible_email, responsible_phone,
                   responsible_username, responsible_role,
                   config_json, price, location, schedule_date, time_start,
                   time_end, max_capacity
            FROM convocatoria_modules
            WHERE status <> 'disabled'
            ORDER BY sort_order ASC, id ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        foreach ($modRows as &$mod) {
            $mod['convocatoria_id'] = (int) $mod['convocatoria_id'];
            $mod['sort_order']      = (int) $mod['sort_order'];
            $mod['price']           = (float) $mod['price'];
            $mod['max_capacity']    = (int) $mod['max_capacity'];
            $mod['config_json']     = jsonDecodeField($mod['config_json']);
            $modules[] = $mod;
        }
        unset($mod);
    } catch (Throwable $ignored) {}

    // Adjuntar talleres y conferencias a cada convocatoria
    // Lógica: si convocatoria_id == 0 (no asignado), se asigna al primer congreso
    $congresoId = 0;
    foreach ($convRows as $c) {
        if ($c['codigo'] === 'congreso') { $congresoId = (int)$c['id']; break; }
    }
    if (!$congresoId && !empty($convRows)) {
        $congresoId = (int)$convRows[0]['id'];
    }

    $workshopsByConv   = [];
    $conferencesByConv = [];
    $modulesByConv     = [];

    foreach ($workshops as $ws) {
        $cid = $ws['convocatoria_id'] ?: $congresoId;
        $workshopsByConv[$cid][] = $ws;
    }
    foreach ($conferences as $cf) {
        $cid = $cf['convocatoria_id'] ?: $congresoId;
        $conferencesByConv[$cid][] = $cf;
    }
    foreach ($modules as $mod) {
        $cid = $mod['convocatoria_id'] ?: $congresoId;
        $modulesByConv[$cid][] = $mod;
    }

    foreach ($convRows as &$conv) {
        $conv['workshops']   = $workshopsByConv[$conv['id']]   ?? [];
        $conv['conferences'] = $conferencesByConv[$conv['id']] ?? [];
        $conv['modules']     = $modulesByConv[$conv['id']]     ?? [];
    }
    unset($conv);

    // ── 4. Settings ───────────────────────────────────────────────────────────
    $settings = [];
    try {
        $stmtSet = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
        foreach ($stmtSet->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
    } catch (Throwable $ignored) {}

    // ── 5. Etapas de robótica ─────────────────────────────────────────────────
    $stages = [];
    try {
        $stages = $pdo->query("
            SELECT id, name, start_date, end_date, price_per_robot, color, is_active
            FROM registration_stages
            WHERE is_active = 1
            ORDER BY start_date ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $ignored) {}

    echo json_encode([
        'success' => true,
        'data' => [
            'convocatorias' => $convRows,
            'settings'      => $settings,
            'stages'        => $stages,
        ],
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => defined('APP_DEBUG') && APP_DEBUG ? $e->getMessage() : 'Error al cargar datos públicos',
    ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonDecodeField(?string $val): mixed
{
    if (!$val || trim($val) === '') return null;
    $decoded = json_decode($val, true);
    return (json_last_error() === JSON_ERROR_NONE) ? $decoded : null;
}

/**
 * Asegura que existan columnas opcionales en la tabla convocatorias.
 * Las que ya existen se ignoran silenciosamente.
 */
function ensureConvocatoriasColumns(PDO $pdo): void
{
    $extras = [
        'rich_content'     => "LONGTEXT NULL",
        'cover_image_url'  => "VARCHAR(500) NULL",
        'icon'             => "VARCHAR(80) NOT NULL DEFAULT 'fas fa-bullhorn'",
        'color'            => "VARCHAR(30) NOT NULL DEFAULT '#f2a900'",
        'show_on_landing'  => "TINYINT(1) NOT NULL DEFAULT 1",
        'landing_order'    => "INT NOT NULL DEFAULT 99",
        'categories_json'  => "JSON NULL",
        'included_modules' => "JSON NULL",
    ];

    foreach ($extras as $col => $def) {
        try {
            $exists = $pdo->query("SHOW COLUMNS FROM `convocatorias` LIKE '{$col}'")->fetch();
            if (!$exists) {
                $pdo->exec("ALTER TABLE `convocatorias` ADD COLUMN `{$col}` {$def}");
            }
        } catch (Throwable $ignored) {}
    }
}
