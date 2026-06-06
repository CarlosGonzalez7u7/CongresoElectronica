<?php
/**
 * API: Endpoint público para alimentar la Landing Page dinámicamente
 */
require_once __DIR__ . '/../config/database.php';

try {
    $data = [];
    $convRows = $pdo->query("SELECT * FROM convocatorias WHERE is_active = 1 ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($convRows as &$conv) {
        $conv['price_stages'] = jsonDecodeField($conv['price_stages'] ?? null);
        $conv['categories_json'] = jsonDecodeField($conv['categories_json'] ?? null);
        $conv['included_modules'] = jsonDecodeField($conv['included_modules'] ?? null);
        $conv['precio_base'] = (float)($conv['precio_base'] ?? 0);
        $conv['is_active'] = (bool)($conv['is_active'] ?? 0);
    }
    unset($conv);

    $workshops = [];
    try {
        $wsRows = $pdo->query("
            SELECT w.id, w.name, w.description, w.location, w.max_capacity,
                   w.schedule_date, w.schedule_start, w.schedule_end,
                   w.cover_image_url, w.status, w.contact_email, w.contact_phone, w.requirements_docs,
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
            $ws['max_capacity'] = (int)$ws['max_capacity'];
            $ws['enrolled_count'] = (int)$ws['enrolled_count'];
            $ws['convocatoria_id'] = (int)$ws['convocatoria_id'];
            $workshops[] = $ws;
        }
        unset($ws);
    } catch (Throwable $ignored) {}

    $conferences = [];
    try {
        $cfRows = $pdo->query("
            SELECT c.id, c.name, c.description, c.speaker_name,
                   c.conference_date, c.time_start, c.time_end,
                   c.location, c.cover_image_url, c.status, c.contact_email, c.contact_phone, c.requirements_docs,
                   COALESCE(c.convocatoria_id, 0) AS convocatoria_id
            FROM conferences c
            WHERE c.status IN ('published', 'full')
            ORDER BY c.conference_date ASC, c.time_start ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        foreach ($cfRows as &$cf) {
            $cf['convocatoria_id'] = (int)$cf['convocatoria_id'];
            $conferences[] = $cf;
        }
        unset($cf);
    } catch (Throwable $ignored) {}

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

        $allModIds2 = array_column($modRows, 'id');
        $modImagesByModId2 = [];
        if (!empty($allModIds2)) {
            try {
                $ph3 = implode(',', array_fill(0, count($allModIds2), '?'));
                $stmtMI2 = $pdo->prepare("SELECT module_id, image_url FROM convocatoria_module_images WHERE module_id IN ($ph3) ORDER BY id ASC");
                $stmtMI2->execute($allModIds2);
                foreach ($stmtMI2->fetchAll(PDO::FETCH_ASSOC) as $mi2) {
                    $modImagesByModId2[(int)$mi2['module_id']][] = $mi2['image_url'];
                }
            } catch (Throwable $ignored) {}
        }
        foreach ($modRows as &$mod) {
            $mod['convocatoria_id'] = (int)$mod['convocatoria_id'];
            $mod['sort_order'] = (int)$mod['sort_order'];
            $mod['price'] = (float)$mod['price'];
            $mod['max_capacity'] = (int)$mod['max_capacity'];
            $cfg2 = jsonDecodeField($mod['config_json'] ?? null);
            $mod['config_json'] = $cfg2;
            if (empty($mod['cover_image_url']) && is_array($cfg2)) {
                $mod['cover_image_url'] = $cfg2['cover_image_url'] ?? $cfg2['responsible_photo_url'] ?? null;
            }
            $mod['images'] = $modImagesByModId2[(int)$mod['id']] ?? [];
            $modules[] = $mod;
        }
        unset($mod);
    } catch (Throwable $ignored) {}

    $congresoId = 0;
    foreach ($convRows as $conv) {
        if (strtolower((string)($conv['codigo'] ?? '')) === 'congreso') {
            $congresoId = (int)$conv['id'];
            break;
        }
    }
    if (!$congresoId && !empty($convRows)) {
        $congresoId = (int)$convRows[0]['id'];
    }

    $workshopsByConv = [];
    $conferencesByConv = [];
    $modulesByConv = [];

    foreach ($workshops as $ws) {
        $cid = (int)($ws['convocatoria_id'] ?? 0) ?: $congresoId;
        $workshopsByConv[$cid][] = $ws;
    }
    foreach ($conferences as $cf) {
        $cid = (int)($cf['convocatoria_id'] ?? 0) ?: $congresoId;
        $conferencesByConv[$cid][] = $cf;
    }
    foreach ($modules as $mod) {
        $cid = (int)($mod['convocatoria_id'] ?? 0) ?: $congresoId;
        $modulesByConv[$cid][] = $mod;
    }

    foreach ($convRows as &$conv) {
        $cid = (int)$conv['id'];
        $conv['workshops'] = $workshopsByConv[$cid] ?? [];
        $conv['conferences'] = $conferencesByConv[$cid] ?? [];
        $conv['modules'] = $modulesByConv[$cid] ?? [];
    }
    unset($conv);

    $data['convocatorias'] = $convRows;

    $stmtSet = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
    $settings = [];
    foreach ($stmtSet->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    $data['settings'] = $settings;

    try {
        $catRows = [];
        foreach ($convRows as $conv) {
            if (!empty($conv['categories_json']) && is_array($conv['categories_json'])) {
                foreach ($conv['categories_json'] as $cat) {
                    $catName = $cat['name'] ?? $cat['category_name'] ?? 'Categoría';
                    $cat['category_name'] = $catName;
                    $cat['name'] = $catName;
                    $cat['icon_type'] = $cat['icon'] ?? 'fas fa-tag';
                    $cat['documento_reglamento_url'] = $cat['pdf_url'] ?? '';
                    $catRows[] = $cat;
                }
            }
        }
        $data['categories'] = $catRows;
    } catch (Throwable $ignored) {
        $data['categories'] = [];
    }

    echo json_encode(['success' => true, 'data' => $data]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function jsonDecodeField(?string $val): mixed
{
    if (!$val || trim($val) === '') return null;
    $decoded = json_decode($val, true);
    return (json_last_error() === JSON_ERROR_NONE) ? $decoded : null;
}