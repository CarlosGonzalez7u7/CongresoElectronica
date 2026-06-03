<?php
/**
 * API: Inscripción / Baja de conferencias (Panel de Usuario)
 */

require_once __DIR__ . '/_auth_common.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    ensureConferenceEnrollmentsTable($pdo);

    // ── GET: estado actual ───────────────────────────────────────
    if ($method === 'GET') {
        $userId = (int)($_SESSION['user_id'] ?? $_GET['userId'] ?? 0);
        if ($userId <= 0) { try { $userId = requireLoggedInUser(); } catch(Throwable $e){} }
        if ($userId <= 0) {
            echo json_encode(['success' => true, 'can_enroll' => false, 'enrolled_conference_ids' => []]);
            exit;
        }

        $hasCongress = false;
        try {
            $stmtReqs = $pdo->prepare("
                SELECT id, includes_congress, selected_convocatorias_json FROM congress_enrollment_requests
                WHERE user_id = ? AND status IN ('approved', 'paid')
            ");
            $stmtReqs->execute([$userId]);
            foreach ($stmtReqs->fetchAll() as $r) {
                if ($r['includes_congress']) $hasCongress = true;
                if (!$hasCongress && !empty($r['selected_convocatorias_json'])) {
                    $arr = json_decode($r['selected_convocatorias_json'], true);
                    if (is_array($arr) && !empty($arr)) {
                        $ph = implode(',', array_fill(0, count($arr), '?'));
                        $stmtC = $pdo->prepare("SELECT conv_tipo, titulo FROM convocatorias WHERE id IN ($ph)");
                        $stmtC->execute($arr);
                        foreach ($stmtC->fetchAll() as $cData) {
                            $tipo = strtolower(($cData['conv_tipo'] ?? '') . ' ' . ($cData['titulo'] ?? ''));
                            if (str_contains($tipo, 'congreso')) { $hasCongress = true; break; }
                        }
                    }
                }
            }
        } catch (Throwable $ignored) {}

        $enrolledConferenceIds = [];
        try {
            $stmtEnrolled = $pdo->prepare("
                SELECT conference_id
                FROM conference_enrollments
                WHERE user_id = ? AND status != 'cancelled'
            ");
            $stmtEnrolled->execute([$userId]);
            $enrolledConferenceIds = $stmtEnrolled->fetchAll(PDO::FETCH_COLUMN);
        } catch (Throwable $ignored) {}

        echo json_encode([
            'success'                 => true,
            'can_enroll'              => $hasCongress,
            'enrolled_conference_ids' => array_map('intval', $enrolledConferenceIds)
        ]);
        exit;
    }

    // ── POST: inscribir o dar de baja ────────────────────────────
    if ($method === 'POST' || $method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $input = $_POST;
            if (empty($input)) { parse_str(file_get_contents('php://input'), $input); }
            if (empty($input)) { $input = $_GET; }
        }
        
        if (empty($input)) throw new Exception('Payload o parámetros inválidos');

        $action = $input['action'] ?? 'enroll';
        $userId = requireLoggedInUser();

        // ── Dar de baja ──────────────────────────────────────────
        if ($action === 'unenroll') {
            $conferenceIdToCancel = (int)($input['conferenceId'] ?? 0);
            $stmtFind = $pdo->prepare("
                SELECT id FROM conference_enrollments
                WHERE user_id = ? AND conference_id = ? AND status != 'cancelled'
                LIMIT 1
            ");
            $stmtFind->execute([$userId, $conferenceIdToCancel]);
            $enrollment = $stmtFind->fetch();

            if (!$enrollment) throw new Exception('No estás inscrito en esta conferencia actualmente.');

            $pdo->prepare("
                UPDATE conference_enrollments
                SET status = 'cancelled', notes = CONCAT(COALESCE(notes,''), ' | Baja solicitada por usuario ', NOW())
                WHERE id = ?
            ")->execute([(int)$enrollment['id']]);

            echo json_encode([
                'success' => true,
                'message' => '✅ Te has dado de baja de la conferencia correctamente.'
            ]);
            exit;
        }

        // ── Inscribir ────────────────────────────────────────────
        $conferenceId = (int)($input['conferenceId'] ?? 0);
        if ($conferenceId <= 0) throw new Exception('conferenceId requerido');

        // Verificar que no esté ya inscrito
        $stmtEnrolled = $pdo->prepare("
            SELECT conference_id FROM conference_enrollments WHERE user_id = ? AND conference_id = ? AND status != 'cancelled' LIMIT 1
        ");
        $stmtEnrolled->execute([$userId, $conferenceId]);
        if ($stmtEnrolled->fetch()) throw new Exception('Ya estás inscrito en esta conferencia.');

        // Iniciar transacción de base de datos con bloqueo preventivo
        $pdo->beginTransaction();

        // Verificar cupo e información de la nueva conferencia
        $stmtConf = $pdo->prepare("
            SELECT name, conference_date, time_start, time_end, capacity,
                   (SELECT COUNT(*) FROM conference_enrollments ce WHERE ce.conference_id = conferences.id AND ce.status != 'cancelled') as enrolled_count
            FROM conferences WHERE id = ? AND status IN ('published', 'full')
            FOR UPDATE
        ");
        $stmtConf->execute([$conferenceId]);
        $conf = $stmtConf->fetch();

        if (!$conf) throw new Exception('La conferencia no existe o no está disponible.');
        if ($conf['capacity'] > 0 && $conf['enrolled_count'] >= $conf['capacity']) {
            throw new Exception('La conferencia ya no tiene cupo disponible.');
        }

        // Validación inteligente de choques de horario con otras actividades
        if (!empty($conf['conference_date']) && !empty($conf['time_start']) && !empty($conf['time_end'])) {
            $newStart = strtotime($conf['conference_date'] . ' ' . $conf['time_start']);
            $newEnd = strtotime($conf['conference_date'] . ' ' . $conf['time_end']);
            $enrolledActivities = [];

            $stmtSchedule = $pdo->prepare("SELECT c.name, c.conference_date as s_date, c.conference_date as e_date, c.time_start as s_start, c.time_end as s_end, 'conferencia' as tipo FROM conference_enrollments ce JOIN conferences c ON ce.conference_id = c.id WHERE ce.user_id = ? AND ce.status != 'cancelled'");
            $stmtSchedule->execute([$userId]);
            $enrolledActivities = array_merge($enrolledActivities, $stmtSchedule->fetchAll(PDO::FETCH_ASSOC));

            try {
                $stmtWs = $pdo->prepare("SELECT w.name, w.schedule_date as s_date, w.schedule_date_end as e_date, w.schedule_start as s_start, w.schedule_end as s_end, 'taller' as tipo FROM workshop_enrollments we JOIN workshops w ON we.workshop_id = w.id WHERE we.user_id = ? AND we.status != 'cancelled'");
                $stmtWs->execute([$userId]);
                $enrolledActivities = array_merge($enrolledActivities, $stmtWs->fetchAll(PDO::FETCH_ASSOC));
            } catch (Throwable $ignored) {}

            try {
                $stmtRob = $pdo->prepare("SELECT cer.includes_robotics FROM congress_enrollment_requests cer WHERE cer.user_id = ? AND cer.status IN ('approved', 'paid') AND cer.includes_robotics = 1");
                $stmtRob->execute([$userId]);
                if ($stmtRob->fetch()) $enrolledActivities[] = ['name' => 'Torneo de Robótica', 's_date' => '2026-10-23', 'e_date' => '2026-10-23', 's_start' => '09:00:00', 's_end' => '17:00:00', 'tipo' => 'torneo'];
            } catch (Throwable $ignored) {}

            foreach ($enrolledActivities as $ea) {
                if (empty($ea['s_date']) || empty($ea['s_start']) || empty($ea['s_end'])) continue;
                $eaStart = strtotime($ea['s_date'] . ' ' . $ea['s_start']);
                $eaEnd = strtotime(($ea['e_date'] ?: $ea['s_date']) . ' ' . $ea['s_end']);
                if ($newStart < $eaEnd && $newEnd > $eaStart) {
                    throw new Exception('Choque de horario detectado: La actividad "' . $ea['name'] . '" (' . $ea['tipo'] . ') en la que ya estás inscrito se empalma con esta conferencia.');
                }
            }
        }

        $pdo->prepare("INSERT INTO conference_enrollments (conference_id, user_id, status) VALUES (?, ?, 'enrolled')")->execute([$conferenceId, $userId]);
        $pdo->commit();

        echo json_encode(['success' => true, 'message' => '¡Inscrito correctamente a la conferencia!']);
        exit;
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function ensureConferenceEnrollmentsTable(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS conference_enrollments ( id INT AUTO_INCREMENT PRIMARY KEY, conference_id INT NOT NULL, user_id INT NOT NULL, status ENUM('enrolled', 'cancelled', 'attended') DEFAULT 'enrolled', enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, notes TEXT NULL, INDEX idx_conf_user (user_id), INDEX idx_conf_id (conference_id) ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}