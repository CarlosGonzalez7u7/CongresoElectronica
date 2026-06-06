<?php
/**
 * API: GESTIÓN DE TALLERES Y CONFERENCIAS (ADMIN) — v2
 * GET    /api/admin-workshops-v2.php              → listar talleres / conferencias / talleristas
 * POST   /api/admin-workshops-v2.php              → crear / actualizar
 * DELETE /api/admin-workshops-v2.php?id=N         → eliminar
 */

require_once __DIR__ . '/../config/database.php';

ensureAllTables($pdo);

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'list';

        if ($action === 'list_conferences') {
            echo json_encode(['success' => true, 'data' => listConferences($pdo)]);
            exit;
        }
        if ($action === 'enrollments') {
            $wid = (int)($_GET['workshop_id'] ?? 0);
            if (!$wid) throw new Exception('workshop_id requerido');
            echo json_encode(['success' => true, 'data' => getWorkshopEnrollments($pdo, $wid)]);
            exit;
        }
        if ($action === 'instructors') {
            echo json_encode(['success' => true, 'data' => listInstructors($pdo)]);
            exit;
        }
        if ($action === 'workshop_images') {
            $wid = (int)($_GET['workshop_id'] ?? 0);
            if (!$wid) throw new Exception('workshop_id requerido');
            echo json_encode(['success' => true, 'data' => getWorkshopImages($pdo, $wid)]);
            exit;
        }
        if ($action === 'conference_images') {
            $cid = (int)($_GET['conference_id'] ?? 0);
            if (!$cid) throw new Exception('conference_id requerido');
            echo json_encode(['success' => true, 'data' => getConferenceImages($pdo, $cid)]);
            exit;
        }

        echo json_encode(['success' => true, 'data' => listWorkshops($pdo)]);
        exit;
    }

    if ($method === 'POST') {
        // Handle multipart (image upload) vs JSON
        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
        if (str_contains($contentType, 'multipart/form-data') || !empty($_POST['action'])) {
            $action = $_POST['action'] ?? '';
            $input = $_POST;
        } else {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) throw new Exception('Payload inválido');
            $action = $input['action'] ?? 'save_workshop';
        }

        // ── Instructor (ponente) ──────────────────────────
        if ($action === 'save_instructor') {
            echo json_encode(saveInstructor($pdo, $input));
            exit;
        }
        if ($action === 'delete_instructor') {
            $pdo->prepare("DELETE FROM workshop_instructors WHERE id = ?")->execute([(int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Tallerista eliminado']);
            exit;
        }

        // ── Taller ───────────────────────────────────────
        if ($action === 'save_workshop') {
            echo json_encode(saveWorkshop($pdo, $input));
            exit;
        }
        if ($action === 'delete_workshop') {
            $pdo->prepare("UPDATE workshops SET status = 'cancelled' WHERE id = ?")
                ->execute([(int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Taller cancelado']);
            exit;
        }
        if ($action === 'set_cover_image') {
            setCoverImage($pdo, (int)($input['workshop_id'] ?? 0), (int)($input['image_id'] ?? 0));
            echo json_encode(['success' => true, 'message' => 'Portada actualizada']);
            exit;
        }
        if ($action === 'delete_image') {
            deleteWorkshopImage($pdo, (int)($input['image_id'] ?? 0));
            echo json_encode(['success' => true, 'message' => 'Imagen eliminada']);
            exit;
        }
        if ($action === 'upload_image') {
            echo json_encode(uploadWorkshopImage($pdo, $_POST, $_FILES));
            exit;
        }
        if ($action === 'upload_conference_image') {
            echo json_encode(uploadConferenceImage($pdo, $_POST, $_FILES));
            exit;
        }
        if ($action === 'delete_conference_image') {
            deleteConferenceImage($pdo, (int)($input['image_id'] ?? 0));
            echo json_encode(['success' => true, 'message' => 'Imagen de conferencia eliminada']);
            exit;
        }
        if ($action === 'save_day') {
            echo json_encode(saveWorkshopDay($pdo, $input));
            exit;
        }
        if ($action === 'delete_day') {
            $pdo->prepare("DELETE FROM workshop_days WHERE id = ? ")->execute([(int)($input['day_id'] ?? 0)]);
            echo json_encode(['success' => true]);
            exit;
        }
        if ($action === 'delete_all_workshop_days') {
            $pdo->prepare("DELETE FROM workshop_days WHERE workshop_id = ?")->execute([(int)($input['workshop_id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Cronograma limpiado']);
            exit;
        }

        // ── Conferencia ───────────────────────────────────
        if ($action === 'save_conference') {
            echo json_encode(saveConference($pdo, $input));
            exit;
        }
        if ($action === 'delete_conference') {
            $pdo->prepare("DELETE FROM conferences WHERE id = ?")
                ->execute([(int)($input['id'] ?? 0)]);
            echo json_encode(['success' => true, 'message' => 'Conferencia eliminada']);
            exit;
        }

        throw new Exception('Acción no reconocida');
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// ═══════════════════════════════════════════════════════════
//  TALLERES
// ═══════════════════════════════════════════════════════════

function listWorkshops(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            w.*,
            wi.full_name  AS instructor_name,
            wi.email      AS instructor_email,
            wi.phone      AS instructor_phone,
            (SELECT COUNT(*) FROM workshop_enrollments we
             WHERE we.workshop_id = w.id AND we.status != 'cancelled') AS enrolled_count,
            (SELECT wi2.url FROM workshop_images wi2
             WHERE wi2.workshop_id = w.id AND wi2.is_cover = 1 LIMIT 1) AS cover_image_url,
            (SELECT COUNT(*) FROM workshop_images wi3
             WHERE wi3.workshop_id = w.id) AS image_count,
            (SELECT COUNT(*) FROM workshop_days wd
             WHERE wd.workshop_id = w.id) AS day_count
        FROM workshops w
        LEFT JOIN workshop_instructors wi ON wi.id = w.instructor_id
        ORDER BY w.schedule_date ASC, w.created_at DESC
    ");
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['topics']        = json_decode($r['topics'] ?? '[]', true) ?: [];
        $r['materials']     = json_decode($r['materials'] ?? '[]', true) ?: [];
        $r['enrolled_count']= (int)$r['enrolled_count'];
        $r['max_capacity']  = (int)$r['max_capacity'];
        $r['spots_left']    = max(0, $r['max_capacity'] - $r['enrolled_count']);
        $r['image_count']   = (int)$r['image_count'];
        $r['day_count']     = (int)$r['day_count'];

        // Load days
        $stmtD = $pdo->prepare("SELECT * FROM workshop_days WHERE workshop_id = ? ORDER BY day_number ASC");
        $stmtD->execute([$r['id']]);
        $r['days'] = $stmtD->fetchAll();
    }
    return $rows;
}

function saveWorkshop(PDO $pdo, array $input): array
{
    $id           = isset($input['id']) ? (int)$input['id'] : 0;
    $name         = sanitizeText($input['name'] ?? '');
    $description  = trim((string)($input['description'] ?? ''));
    $location     = sanitizeText($input['location'] ?? '');
    $building     = sanitizeText($input['building'] ?? '');
    $room         = sanitizeText($input['room'] ?? '');
    $locationType = in_array($input['location_type'] ?? '', ['internal', 'external']) ? $input['location_type'] : 'internal';
    $maxCapacity  = max(1, (int)($input['max_capacity'] ?? 30));
    $instructorId = !empty($input['instructor_id']) ? (int)$input['instructor_id'] : null;
    $schedDate    = !empty($input['schedule_date']) ? $input['schedule_date'] : null;
    $schedDateEnd = !empty($input['schedule_date_end']) ? $input['schedule_date_end'] : null;
    $schedStart   = !empty($input['schedule_start']) ? $input['schedule_start'] : null;
    $schedEnd     = !empty($input['schedule_end']) ? $input['schedule_end'] : null;
    $status       = in_array($input['status'] ?? '', ['draft','published','full','cancelled','completed']) ? $input['status'] : 'draft';
    $topics       = json_encode(array_values(array_filter((array)($input['topics'] ?? []))));
    $materials    = json_encode(array_values(array_filter((array)($input['materials'] ?? []))));
    $requirements = trim((string)($input['requirements'] ?? ''));
    $contactEmail = trim((string)($input['contact_email'] ?? ''));
    $contactPhone = trim((string)($input['contact_phone'] ?? ''));
    $requirementsDocs = isset($input['requirements_docs']) && is_array($input['requirements_docs']) ? json_encode($input['requirements_docs'], JSON_UNESCAPED_UNICODE) : null;
    $isMultiDay   = !empty($input['is_multi_day']) ? 1 : 0;

    if ($name === '') throw new Exception('El nombre del taller es requerido');
    if ($location === '' && $building === '') throw new Exception('La ubicación es requerida');
    if (!$instructorId) throw new Exception('Debe asignar un profesor al taller');

    $fullLocation = $location;
    if ($locationType === 'internal' && ($building || $room)) {
        $parts = array_filter([$building, $room]);
        $fullLocation = implode(', ', $parts);
    }

    if ($id > 0) {
        $stmt = $pdo->prepare("
            UPDATE workshops SET
                name=?, description=?, location=?, location_type=?,
                building=?, room=?,
                max_capacity=?, instructor_id=?,
                schedule_date=?, schedule_date_end=?,
                schedule_start=?, schedule_end=?,
                status=?, topics=?, materials=?, requirements=?,
                contact_email=?, contact_phone=?, requirements_docs=?,
                is_multi_day=?, updated_at=NOW()
            WHERE id=?
        ");
        $stmt->execute([
            $name, $description, $fullLocation, $locationType,
            $building, $room,
            $maxCapacity, $instructorId,
            $schedDate, $schedDateEnd,
            $schedStart, $schedEnd,
            $status, $topics, $materials, $requirements,
            $contactEmail, $contactPhone, $requirementsDocs,
            $isMultiDay, $id
        ]);
        return ['success' => true, 'message' => 'Taller actualizado', 'id' => $id];
    }

    $stmt = $pdo->prepare("
        INSERT INTO workshops (
            name, description, location, location_type, building, room,
            max_capacity, instructor_id,
            schedule_date, schedule_date_end, schedule_start, schedule_end,
            status, topics, materials, requirements, contact_email, contact_phone, requirements_docs, is_multi_day
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ");
    $stmt->execute([
        $name, $description, $fullLocation, $locationType, $building, $room,
        $maxCapacity, $instructorId,
        $schedDate, $schedDateEnd, $schedStart, $schedEnd,
        $status, $topics, $materials, $requirements, $contactEmail, $contactPhone, $requirementsDocs, $isMultiDay
    ]);
    return ['success' => true, 'message' => 'Taller creado', 'id' => (int)$pdo->lastInsertId()];
}

// ── Days ─────────────────────────────────────────────────────

function saveWorkshopDay(PDO $pdo, array $input): array
{
    $id         = isset($input['id']) ? (int)$input['id'] : 0;
    $workshopId = (int)($input['workshop_id'] ?? 0);
    $dayNumber  = (int)($input['day_number'] ?? 1);
    $date       = $input['date'] ?? null;
    $timeStart  = $input['time_start'] ?? null;
    $timeEnd    = $input['time_end'] ?? null;
    $title      = sanitizeText($input['title'] ?? '');
    $description= trim((string)($input['description'] ?? ''));

    if (!$workshopId) throw new Exception('workshop_id requerido');

    if ($id > 0) {
        $pdo->prepare("UPDATE workshop_days SET day_number=?, date=?, time_start=?, time_end=?, title=?, description=? WHERE id=?")
            ->execute([$dayNumber, $date, $timeStart, $timeEnd, $title, $description, $id]);
        return ['success' => true, 'message' => 'Día actualizado', 'id' => $id];
    }

    $pdo->prepare("INSERT INTO workshop_days (workshop_id, day_number, date, time_start, time_end, title, description) VALUES (?,?,?,?,?,?,?)")
        ->execute([$workshopId, $dayNumber, $date, $timeStart, $timeEnd, $title, $description]);
    return ['success' => true, 'message' => 'Día agregado', 'id' => (int)$pdo->lastInsertId()];
}

// ── Images ────────────────────────────────────────────────────

function getWorkshopImages(PDO $pdo, int $workshopId): array
{
    $stmt = $pdo->prepare("SELECT * FROM workshop_images WHERE workshop_id = ? ORDER BY is_cover DESC, uploaded_at ASC");
    $stmt->execute([$workshopId]);
    return $stmt->fetchAll();
}

function uploadWorkshopImage(PDO $pdo, array $post, array $files): array
{
    $workshopId  = (int)($post['workshop_id'] ?? 0);
    $imageType   = in_array($post['image_type'] ?? '', ['gallery', 'map']) ? $post['image_type'] : 'gallery';
    $isCover     = !empty($post['is_cover']) ? 1 : 0;
    $caption     = sanitizeText($post['caption'] ?? '');

    if (!$workshopId) throw new Exception('workshop_id requerido');
    if (empty($files['image']) || $files['image']['error'] !== UPLOAD_ERR_OK) {
        $errCode = $files['image']['error'] ?? 'desconocido';
        throw new Exception('No se recibió imagen válida. Código de error PHP: ' . $errCode);
    }

    $file     = $files['image'];
    $allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    $mime = '';
    if (function_exists('mime_content_type')) {
        $mime = @mime_content_type($file['tmp_name']);
    }
    if (empty($mime) || $mime === 'application/octet-stream') {
        $imgInfo = @getimagesize($file['tmp_name']);
        if ($imgInfo) {
            $mime = $imgInfo['mime'] ?? '';
        }
    }

    if (!in_array($mime, $allowed)) throw new Exception('Solo se permiten imágenes JPG, PNG, WEBP o GIF. Formato detectado: ' . ($mime ?: 'desconocido'));
    if ($file['size'] > 5 * 1024 * 1024) throw new Exception('La imagen no debe superar 5 MB');

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg';
    $filename = 'ws_' . $workshopId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $uploadDir= __DIR__ . '/../uploads/workshops/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    $dest = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new Exception('Error al guardar la imagen');
    }

    // If cover, unset previous cover
    if ($isCover) {
        $pdo->prepare("UPDATE workshop_images SET is_cover = 0 WHERE workshop_id = ?")
            ->execute([$workshopId]);
    }

    $url = '/app/uploads/workshops/' . $filename;
    $pdo->prepare("INSERT INTO workshop_images (workshop_id, filename, url, image_type, is_cover, caption) VALUES (?,?,?,?,?,?)")
        ->execute([$workshopId, $filename, $url, $imageType, $isCover, $caption]);

    return ['success' => true, 'message' => 'Imagen subida', 'url' => $url, 'id' => (int)$pdo->lastInsertId()];
}

function setCoverImage(PDO $pdo, int $workshopId, int $imageId): void
{
    $pdo->prepare("UPDATE workshop_images SET is_cover = 0 WHERE workshop_id = ?")
        ->execute([$workshopId]);
    $pdo->prepare("UPDATE workshop_images SET is_cover = 1 WHERE id = ? AND workshop_id = ?")
        ->execute([$imageId, $workshopId]);
}

function deleteWorkshopImage(PDO $pdo, int $imageId): void
{
    $stmt = $pdo->prepare("SELECT filename FROM workshop_images WHERE id = ?");
    $stmt->execute([$imageId]);
    $img = $stmt->fetch();
    if ($img) {
        $path = __DIR__ . '/../uploads/workshops/' . $img['filename'];
        if (file_exists($path)) @unlink($path);
        $pdo->prepare("DELETE FROM workshop_images WHERE id = ?")->execute([$imageId]);
    }
}

// ── Enrollments ───────────────────────────────────────────────

function getWorkshopEnrollments(PDO $pdo, int $workshopId): array
{
    $stmt = $pdo->prepare("
        SELECT we.id, we.user_id, we.enrolled_at, we.status, we.attendance_marked_at,
               pu.full_name, pu.email, pu.phone, pu.school, pu.career, pu.semester,
               pu.matricula, pu.control_number
        FROM workshop_enrollments we
        INNER JOIN platform_users pu ON pu.id = we.user_id
        WHERE we.workshop_id = ?
        ORDER BY we.enrolled_at ASC
    ");
    $stmt->execute([$workshopId]);
    return $stmt->fetchAll();
}

// ═══════════════════════════════════════════════════════════
//  TALLERISTAS / PONENTES
// ═══════════════════════════════════════════════════════════

function listInstructors(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT id, full_name, email, phone, specialty, bio, is_active, 
               role_type, username
        FROM workshop_instructors
        ORDER BY full_name ASC
    ");
    return $stmt->fetchAll();
}

function saveInstructor(PDO $pdo, array $input): array
{
    $id        = isset($input['id']) ? (int)$input['id'] : 0;
    $fullName  = sanitizeText($input['full_name'] ?? '');
    $email     = strtolower(trim((string)($input['email'] ?? '')));
    $phone     = sanitizeText($input['phone'] ?? '');
    $specialty = sanitizeText($input['specialty'] ?? '');
    $bio       = trim((string)($input['bio'] ?? ''));
    $roleType  = in_array($input['role_type'] ?? '', ['instructor', 'speaker']) ? $input['role_type'] : 'instructor';
    $username  = sanitizeText($input['username'] ?? '');
    $password  = (string)($input['password'] ?? '');

    if ($fullName === '') throw new Exception('Nombre requerido');
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception('Email inválido');

    if ($id > 0) {
        if ($username !== '') {
            $stmtCheck = $pdo->prepare("SELECT id FROM workshop_instructors WHERE username = ? AND id != ?");
            $stmtCheck->execute([$username, $id]);
            if ($stmtCheck->fetch()) throw new Exception('El nombre de usuario ya existe.');
        }

        $fields = "full_name=?, email=?, phone=?, specialty=?, bio=?, role_type=?, updated_at=NOW()";
        $params = [$fullName, $email, $phone, $specialty, $bio, $roleType];
        if ($username !== '') {
            $fields .= ", username=?";
            $params[] = $username;
        }
        if ($password !== '') {
            $fields .= ", password_hash=?";
            $params[] = password_hash($password, PASSWORD_DEFAULT);
        }
        $params[] = $id;
        $pdo->prepare("UPDATE workshop_instructors SET $fields WHERE id=?")->execute($params);
        return ['success' => true, 'message' => 'Perfil actualizado', 'id' => $id];
    }

    if ($username === '') {
        throw new Exception('Nombre de usuario requerido para nuevos perfiles');
    }
    if ($password === '') {
        throw new Exception('Contraseña requerida para nuevos perfiles');
    }

    $stmtCheck = $pdo->prepare("SELECT id FROM workshop_instructors WHERE username = ?");
    $stmtCheck->execute([$username]);
    if ($stmtCheck->fetch()) {
        throw new Exception('El nombre de usuario ya existe.');
    }

    $pdo->prepare("
        INSERT INTO workshop_instructors (full_name, email, phone, specialty, bio, role_type, username, password_hash)
        VALUES (?,?,?,?,?,?, ?, ?)
    ")->execute([
        $fullName, $email, $phone, $specialty, $bio, $roleType,
        $username,
        password_hash($password, PASSWORD_DEFAULT)
    ]);
    return ['success' => true, 'message' => 'Perfil creado', 'id' => (int)$pdo->lastInsertId()];
}

// ═══════════════════════════════════════════════════════════
//  CONFERENCIAS
// ═══════════════════════════════════════════════════════════

function listConferences(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT c.*,
            (SELECT ci.url FROM conference_images ci WHERE ci.conference_id = c.id AND ci.is_cover = 1 LIMIT 1) AS cover_image_url
        FROM conferences c
        ORDER BY c.conference_date ASC, c.time_start ASC
    ");
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['tags'] = json_decode($r['tags'] ?? '[]', true) ?: [];
    }
    return $rows;
}

function saveConference(PDO $pdo, array $input): array
{
    $id            = isset($input['id']) ? (int)$input['id'] : 0;
    $name          = sanitizeText($input['name'] ?? '');
    $description   = trim((string)($input['description'] ?? ''));
    $speakerName   = sanitizeText($input['speaker_name'] ?? '');
    $speakerTitle  = sanitizeText($input['speaker_title'] ?? '');
    $speakerOrg    = sanitizeText($input['speaker_org'] ?? '');
    $location      = sanitizeText($input['location'] ?? '');
    $building      = sanitizeText($input['building'] ?? '');
    $room          = sanitizeText($input['room'] ?? '');
    $locationType  = in_array($input['location_type'] ?? '', ['internal', 'external']) ? $input['location_type'] : 'internal';
    $confDate      = !empty($input['conference_date']) ? $input['conference_date'] : null;
    $timeStart     = !empty($input['time_start']) ? $input['time_start'] : null;
    $timeEnd       = !empty($input['time_end']) ? $input['time_end'] : null;
    $capacity      = !empty($input['capacity']) ? (int)$input['capacity'] : null;
    $isPublic      = !empty($input['is_public']) ? 1 : 1; // default public
    $tags          = json_encode(array_values(array_filter((array)($input['tags'] ?? []))));
    $status        = in_array($input['status'] ?? '', ['draft','published','cancelled','completed']) ? $input['status'] : 'draft';
    $language      = sanitizeText($input['language'] ?? 'Español');
    $liveStreamUrl = trim((string)($input['live_stream_url'] ?? ''));
    $contactEmail  = trim((string)($input['contact_email'] ?? ''));
    $contactPhone  = trim((string)($input['contact_phone'] ?? ''));
    $requirementsDocs = isset($input['requirements_docs']) && is_array($input['requirements_docs']) ? json_encode($input['requirements_docs'], JSON_UNESCAPED_UNICODE) : null;

    if ($name === '') throw new Exception('El nombre de la conferencia es requerido');

    $fullLocation = $location;
    if ($locationType === 'internal' && ($building || $room)) {
        $parts = array_filter([$building, $room]);
        $fullLocation = implode(', ', $parts);
    }

    if ($id > 0) {
        $pdo->prepare("
            UPDATE conferences SET
                name=?, description=?, speaker_name=?, speaker_title=?, speaker_org=?,
                location=?, building=?, room=?, location_type=?,
                conference_date=?, time_start=?, time_end=?,
                capacity=?, is_public=?, tags=?, status=?,
                language=?, live_stream_url=?, contact_email=?, contact_phone=?, requirements_docs=?, updated_at=NOW()
            WHERE id=?
        ")->execute([
            $name, $description, $speakerName, $speakerTitle, $speakerOrg,
            $fullLocation, $building, $room, $locationType,
            $confDate, $timeStart, $timeEnd,
            $capacity, $isPublic, $tags, $status,
            $language, $liveStreamUrl, $contactEmail, $contactPhone, $requirementsDocs, $id
        ]);
        return ['success' => true, 'message' => 'Conferencia actualizada', 'id' => $id];
    }

    $pdo->prepare("
        INSERT INTO conferences (
            name, description, speaker_name, speaker_title, speaker_org,
            location, building, room, location_type,
            conference_date, time_start, time_end,
            capacity, is_public, tags, status, language, live_stream_url, contact_email, contact_phone, requirements_docs
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ")->execute([
        $name, $description, $speakerName, $speakerTitle, $speakerOrg,
        $fullLocation, $building, $room, $locationType,
        $confDate, $timeStart, $timeEnd,
        $capacity, $isPublic, $tags, $status, $language, $liveStreamUrl, $contactEmail, $contactPhone, $requirementsDocs
    ]);
    return ['success' => true, 'message' => 'Conferencia creada', 'id' => (int)$pdo->lastInsertId()];
}

function getConferenceImages(PDO $pdo, int $conferenceId): array
{
    $stmt = $pdo->prepare("SELECT * FROM conference_images WHERE conference_id = ? ORDER BY is_cover DESC, uploaded_at ASC");
    $stmt->execute([$conferenceId]);
    return $stmt->fetchAll();
}

function uploadConferenceImage(PDO $pdo, array $post, array $files): array
{
    $conferenceId = (int)($post['conference_id'] ?? 0);
    if (!$conferenceId) throw new Exception('conference_id requerido');

    if (empty($files['image']) || $files['image']['error'] !== UPLOAD_ERR_OK) {
        $errCode = $files['image']['error'] ?? 'desconocido';
        throw new Exception('No se recibió imagen válida. Código de error PHP: ' . $errCode);
    }

    $file = $files['image'];
    $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    $mime = '';
    if (function_exists('mime_content_type')) {
        $mime = @mime_content_type($file['tmp_name']);
    }
    if (empty($mime) || $mime === 'application/octet-stream') {
        $imgInfo = @getimagesize($file['tmp_name']);
        if ($imgInfo) {
            $mime = $imgInfo['mime'] ?? '';
        }
    }

    if (!in_array($mime, $allowed, true)) {
        throw new Exception('Solo se permiten imágenes JPG, PNG, WEBP o GIF. Formato detectado: ' . ($mime ?: 'desconocido'));
    }
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception('La imagen no debe superar 5 MB');
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg';
    $filename = 'conf_' . $conferenceId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $uploadDir = __DIR__ . '/../uploads/conferences/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    $dest = $uploadDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new Exception('Error al guardar la imagen de portada');
    }

    // Siempre dejamos solo una portada activa por conferencia.
    $pdo->prepare("UPDATE conference_images SET is_cover = 0 WHERE conference_id = ?")
        ->execute([$conferenceId]);

    $url = '/app/uploads/conferences/' . $filename;
    $pdo->prepare("INSERT INTO conference_images (conference_id, filename, url, image_type, is_cover, caption) VALUES (?,?,?,?,?,?)")
        ->execute([$conferenceId, $filename, $url, 'gallery', 1, 'Portada']);

    return ['success' => true, 'message' => 'Portada de conferencia subida', 'url' => $url, 'id' => (int)$pdo->lastInsertId()];
}

function deleteConferenceImage(PDO $pdo, int $imageId): void
{
    if ($imageId <= 0) return;

    $stmt = $pdo->prepare("SELECT filename FROM conference_images WHERE id = ?");
    $stmt->execute([$imageId]);
    $img = $stmt->fetch();
    if (!$img) return;

    $path = __DIR__ . '/../uploads/conferences/' . $img['filename'];
    if (file_exists($path)) @unlink($path);

    $pdo->prepare("DELETE FROM conference_images WHERE id = ?")
        ->execute([$imageId]);
}

// ═══════════════════════════════════════════════════════════
//  TABLAS
// ═══════════════════════════════════════════════════════════

function ensureAllTables(PDO $pdo): void
{
    // Talleristas / Ponentes (role_type distingue instructor vs speaker)
    $pdo->exec("CREATE TABLE IF NOT EXISTS workshop_instructors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL DEFAULT '',
        phone VARCHAR(30) NULL,
        bio TEXT NULL,
        specialty VARCHAR(200) NULL,
        role_type ENUM('instructor','speaker') DEFAULT 'instructor',
        username VARCHAR(60) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP NULL,
        INDEX idx_instructor_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Agregar columna role_type si no existe (migración)
    try {
        $pdo->exec("ALTER TABLE workshop_instructors ADD COLUMN role_type ENUM('instructor','speaker') DEFAULT 'instructor' AFTER specialty");
    } catch (Throwable $ignored) {}

    // Talleres
    $pdo->exec("CREATE TABLE IF NOT EXISTS workshops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT NULL,
        location VARCHAR(300) NOT NULL DEFAULT '',
        building VARCHAR(100) NULL,
        room VARCHAR(100) NULL,
        location_type ENUM('internal','external') DEFAULT 'internal',
        max_capacity INT NOT NULL DEFAULT 30,
        instructor_id INT NULL,
        schedule_date DATE NULL,
        schedule_date_end DATE NULL,
        schedule_start TIME NULL,
        schedule_end TIME NULL,
        is_multi_day TINYINT(1) DEFAULT 0,
        status ENUM('draft','published','full','cancelled','completed') DEFAULT 'draft',
        topics TEXT NULL,
        materials TEXT NULL,
        requirements TEXT NULL,
        cover_image_url VARCHAR(500) NULL,
        created_by_admin_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_workshop_status (status),
        INDEX idx_workshop_date (schedule_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Agregar columnas nuevas si no existen
    foreach (['building VARCHAR(100) NULL', 'room VARCHAR(100) NULL', 'schedule_date_end DATE NULL', 'is_multi_day TINYINT(1) DEFAULT 0', 'contact_email VARCHAR(150) NULL', 'contact_phone VARCHAR(30) NULL', 'requirements_docs JSON NULL'] as $col) {
        try { $pdo->exec("ALTER TABLE workshops ADD COLUMN $col"); } catch (Throwable $e) {}
    }

    // Días del taller (para talleres multi-día)
    $pdo->exec("CREATE TABLE IF NOT EXISTS workshop_days (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workshop_id INT NOT NULL,
        day_number INT NOT NULL DEFAULT 1,
        date DATE NULL,
        time_start TIME NULL,
        time_end TIME NULL,
        title VARCHAR(200) NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_wd_workshop (workshop_id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Imágenes de talleres
    $pdo->exec("CREATE TABLE IF NOT EXISTS workshop_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workshop_id INT NOT NULL,
        filename VARCHAR(300) NOT NULL,
        url VARCHAR(500) NOT NULL,
        image_type ENUM('gallery','map') DEFAULT 'gallery',
        is_cover TINYINT(1) DEFAULT 0,
        caption VARCHAR(300) NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_wi_workshop (workshop_id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Inscripciones a talleres
    $pdo->exec("CREATE TABLE IF NOT EXISTS workshop_enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workshop_id INT NOT NULL,
        user_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('enrolled','cancelled','attended','no_show') DEFAULT 'enrolled',
        attendance_marked_at TIMESTAMP NULL,
        attendance_marked_by VARCHAR(150) NULL,
        notes TEXT NULL,
        UNIQUE KEY unique_workshop_user (workshop_id, user_id),
        INDEX idx_we_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Conferencias
    $pdo->exec("CREATE TABLE IF NOT EXISTS conferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(250) NOT NULL,
        description TEXT NULL,
        speaker_name VARCHAR(200) NULL,
        speaker_title VARCHAR(200) NULL,
        speaker_org VARCHAR(200) NULL,
        location VARCHAR(300) NULL,
        building VARCHAR(100) NULL,
        room VARCHAR(100) NULL,
        location_type ENUM('internal','external') DEFAULT 'internal',
        conference_date DATE NULL,
        time_start TIME NULL,
        time_end TIME NULL,
        capacity INT NULL,
        is_public TINYINT(1) DEFAULT 1,
        tags TEXT NULL,
        status ENUM('draft','published','cancelled','completed') DEFAULT 'draft',
        language VARCHAR(60) DEFAULT 'Español',
        live_stream_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_conf_date (conference_date),
        INDEX idx_conf_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    foreach (['contact_email VARCHAR(150) NULL', 'contact_phone VARCHAR(30) NULL', 'requirements_docs JSON NULL'] as $col) {
        try { $pdo->exec("ALTER TABLE conferences ADD COLUMN $col"); } catch (Throwable $e) {}
    }

    // Imágenes de conferencias
    $pdo->exec("CREATE TABLE IF NOT EXISTS conference_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conference_id INT NOT NULL,
        filename VARCHAR(300) NOT NULL,
        url VARCHAR(500) NOT NULL,
        image_type ENUM('speaker','map','gallery') DEFAULT 'gallery',
        is_cover TINYINT(1) DEFAULT 0,
        caption VARCHAR(300) NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_ci_conf (conference_id),
        FOREIGN KEY (conference_id) REFERENCES conferences(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function sanitizeText(string $v): string
{
    return trim(strip_tags($v));
}
