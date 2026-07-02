<?php
/**
 * API: Inscripción / Baja de conferencias (Panel de Usuario)
 * GET    /api/conference-enroll.php?userId=N          → estado de inscripción
 * POST   /api/conference-enroll.php  {action:"enroll"}   → inscribir
 * DELETE /api/conference-enroll.php  {action:"unenroll"}  → darse de baja
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
            echo json_encode(['success' => true, 'can_enroll' => false, 'enrolled_conference_ids' => [], 'paid_convocatorias' => []]);
            exit;
        }

        // Recopilar convocatorias pagadas/aprobadas del usuario
        $paidConvs   = [];
        $hasCongress = false;
        try {
            $stmtReqs = $pdo->prepare("
                SELECT id, includes_congress, selected_convocatorias_json
                FROM congress_enrollment_requests
                WHERE user_id = ? AND status IN ('approved', 'paid')
            ");
            $stmtReqs->execute([$userId]);
            foreach ($stmtReqs->fetchAll() as $r) {
                if ($r['includes_congress']) $hasCongress = true;
                if (!empty($r['selected_convocatorias_json'])) {
                    $arr = json_decode($r['selected_convocatorias_json'], true);
                    if (is_array($arr)) $paidConvs = array_merge($paidConvs, $arr);
                }
            }
        } catch (Throwable $ignored) {}

        $enrolledConferenceIds = [];
        $cancellationsUsed     = 0;
        try {
            $stmtEnrolled = $pdo->prepare("
                SELECT conference_id
                FROM conference_enrollments
                WHERE user_id = ? AND status != 'cancelled'
            ");
            $stmtEnrolled->execute([$userId]);
            $enrolledConferenceIds = $stmtEnrolled->fetchAll(PDO::FETCH_COLUMN);
        } catch (Throwable $ignored) {}

        try {
            $stmtCancels = $pdo->prepare("
                SELECT COUNT(*) FROM conference_enrollments
                WHERE user_id = ? AND status = 'cancelled'
            ");
            $stmtCancels->execute([$userId]);
            $cancellationsUsed = (int)$stmtCancels->fetchColumn();
        } catch (Throwable $ignored) {}

        echo json_encode([
            'success'                 => true,
            'can_enroll'              => $hasCongress || !empty($paidConvs),
            'paid_convocatorias'      => array_values(array_unique(array_map('intval', $paidConvs))),
            'enrolled_conference_ids' => array_map('intval', $enrolledConferenceIds),
            'cancellations_used'      => $cancellationsUsed,
            'can_unenroll'            => $cancellationsUsed < 3,
        ]);
        exit;
    }

    // ── POST / DELETE: inscribir o dar de baja ───────────────────
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

            // Límite de 3 bajas (igual que talleres, para mantener consistencia)
            $stmtCancels = $pdo->prepare("
                SELECT COUNT(*) FROM conference_enrollments WHERE user_id = ? AND status = 'cancelled'
            ");
            $stmtCancels->execute([$userId]);
            $used = (int)$stmtCancels->fetchColumn();

            if ($used >= 3) {
                throw new Exception('Alcanzaste el límite de 3 cambios de conferencia. Ya no puedes darte de baja.');
            }

            $pdo->prepare("
                UPDATE conference_enrollments
                SET status = 'cancelled',
                    notes = CONCAT(COALESCE(notes,''), ' | Baja solicitada por usuario ', NOW())
                WHERE id = ?
            ")->execute([(int)$enrollment['id']]);

            // Registrar en auditoría
            try {
                $ip = getRealUserIp();
                $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'conference_enrollments', ?, ?, ?)")
                    ->execute(['USER_CONFERENCE_UNENROLL', $enrollment['id'], $ip, json_encode(['user_id' => $userId])]);
            } catch (Throwable $e) {}

            echo json_encode([
                'success'                 => true,
                'message'                 => '✅ Te has dado de baja de la conferencia correctamente.',
                'cancellations_used'      => $used + 1,
                'cancellations_remaining' => max(0, 2 - $used),
            ]);
            exit;
        }

        // ── Inscribir ────────────────────────────────────────────
        $conferenceId = (int)($input['conferenceId'] ?? 0);
        if ($conferenceId <= 0) throw new Exception('conferenceId requerido');

        // Obtener convocatoria_id de la conferencia solicitada
        $stmtCf = $pdo->prepare("SELECT convocatoria_id FROM conferences WHERE id = ?");
        $stmtCf->execute([$conferenceId]);
        $cfConvId = (int)($stmtCf->fetchColumn() ?: 0);

        // ── Verificar que el usuario tenga inscripción pagada/aprobada
        //    para la convocatoria a la que pertenece esta conferencia ──
        $hasPaid = false;
        try {
            $stmtReqs = $pdo->prepare("
                SELECT id, includes_congress, selected_convocatorias_json
                FROM congress_enrollment_requests
                WHERE user_id = ? AND status IN ('approved', 'paid')
            ");
            $stmtReqs->execute([$userId]);
            foreach ($stmtReqs->fetchAll() as $r) {
                // Si la conferencia no tiene convocatoria asignada (congreso por defecto)
                // se acepta cualquier inscripción que incluya el congreso
                if ($cfConvId === 0 && $r['includes_congress']) {
                    $hasPaid = true;
                    break;
                }
                // Verificar en convocatorias seleccionadas
                $arr = json_decode($r['selected_convocatorias_json'] ?? '[]', true) ?: [];
                if (in_array($cfConvId, array_map('intval', $arr))) {
                    $hasPaid = true;
                    break;
                }
                // Si el registro incluye congreso, verificar si la convocatoria es de tipo congreso
                if ($r['includes_congress'] && $cfConvId > 0) {
                    $stmtC = $pdo->prepare("SELECT conv_tipo, titulo FROM convocatorias WHERE id = ?");
                    $stmtC->execute([$cfConvId]);
                    $cData = $stmtC->fetch(PDO::FETCH_ASSOC) ?: [];
                    $tipo  = strtolower(($cData['conv_tipo'] ?? '') . ' ' . ($cData['titulo'] ?? ''));
                    if (str_contains($tipo, 'congreso')) {
                        $hasPaid = true;
                        break;
                    }
                }
            }
        } catch (Throwable $ignored) {}

        if (!$hasPaid) {
            throw new Exception('Necesitas tener tu inscripción a esta convocatoria aprobada y pagada para registrarte en sus conferencias.');
        }

        // Verificar que no esté ya inscrito
        $stmtEnrolled = $pdo->prepare("
            SELECT conference_id FROM conference_enrollments
            WHERE user_id = ? AND conference_id = ? AND status != 'cancelled'
            LIMIT 1
        ");
        $stmtEnrolled->execute([$userId, $conferenceId]);
        if ($stmtEnrolled->fetch()) throw new Exception('¡Ya te encuentras inscrito en esta conferencia!');

        // ── Iniciar transacción con bloqueo preventivo ───────────
        $pdo->beginTransaction();

        $stmtConf = $pdo->prepare("
            SELECT name, conference_date, time_start, time_end, capacity,
                   (SELECT COUNT(*) FROM conference_enrollments ce
                    WHERE ce.conference_id = conferences.id AND ce.status != 'cancelled') AS enrolled_count
            FROM conferences
            WHERE id = ? AND status IN ('published', 'full')
            FOR UPDATE
        ");
        $stmtConf->execute([$conferenceId]);
        $conf = $stmtConf->fetch();

        if (!$conf) throw new Exception('La conferencia no existe o no está disponible.');
        if ($conf['capacity'] > 0 && $conf['enrolled_count'] >= $conf['capacity']) {
            throw new Exception('Lo sentimos, esta conferencia ya no tiene cupo disponible. ¡Se llenó!');
        }

        // ── Validación de choques de horario ─────────────────────
        if (!empty($conf['conference_date']) && !empty($conf['time_start']) && !empty($conf['time_end'])) {
            $newStart        = strtotime($conf['conference_date'] . ' ' . $conf['time_start']);
            $newEnd          = strtotime($conf['conference_date'] . ' ' . $conf['time_end']);
            $enrolledActivities = [];

            // Otras conferencias
            $stmtConfSchedule = $pdo->prepare("
                SELECT c.name,
                       c.conference_date AS s_date, c.conference_date AS e_date,
                       c.time_start AS s_start, c.time_end AS s_end,
                       'conferencia' AS tipo
                FROM conference_enrollments ce
                JOIN conferences c ON ce.conference_id = c.id
                WHERE ce.user_id = ? AND ce.status != 'cancelled'
            ");
            $stmtConfSchedule->execute([$userId]);
            $enrolledActivities = array_merge($enrolledActivities, $stmtConfSchedule->fetchAll(PDO::FETCH_ASSOC));

            // Talleres
            try {
                $stmtWs = $pdo->prepare("
                    SELECT w.name,
                           w.schedule_date AS s_date, w.schedule_date_end AS e_date,
                           w.schedule_start AS s_start, w.schedule_end AS s_end,
                           'taller' AS tipo
                    FROM workshop_enrollments we
                    JOIN workshops w ON we.workshop_id = w.id
                    WHERE we.user_id = ? AND we.status != 'cancelled'
                ");
                $stmtWs->execute([$userId]);
                $enrolledActivities = array_merge($enrolledActivities, $stmtWs->fetchAll(PDO::FETCH_ASSOC));
            } catch (Throwable $ignored) {}

            // Torneo de Robótica
            try {
                $stmtRob = $pdo->prepare("
                    SELECT cer.includes_robotics
                    FROM congress_enrollment_requests cer
                    WHERE cer.user_id = ? AND cer.status IN ('approved', 'paid') AND cer.includes_robotics = 1
                ");
                $stmtRob->execute([$userId]);
                if ($stmtRob->fetch()) {
                    $enrolledActivities[] = [
                        'name'    => 'Torneo de Robótica',
                        's_date'  => '2026-10-23',
                        'e_date'  => '2026-10-23',
                        's_start' => '09:00:00',
                        's_end'   => '17:00:00',
                        'tipo'    => 'torneo',
                    ];
                }
            } catch (Throwable $ignored) {}

            // Comparar contra cada actividad existente
            foreach ($enrolledActivities as $ea) {
                if (empty($ea['s_date']) || empty($ea['s_start']) || empty($ea['s_end'])) continue;
                $eaStart = strtotime($ea['s_date'] . ' ' . $ea['s_start']);
                $eaEnd   = strtotime(($ea['e_date'] ?: $ea['s_date']) . ' ' . $ea['s_end']);
                // Algoritmo de solapamiento: (StartA < EndB) && (EndA > StartB)
                if ($newStart < $eaEnd && $newEnd > $eaStart) {
                    $pdo->rollBack();
                    throw new Exception(
                        '⚠️ ¡Horario ocupado! No puedes inscribirte a esta conferencia porque se empalma con otra actividad en tu agenda: <strong>' .
                        $ea['name'] . ' (' . $ea['tipo'] . ')</strong>. Por favor, elige un horario diferente.'
                    );
                }
            }
        }

        $pdo->prepare("
            INSERT INTO conference_enrollments (conference_id, user_id, status) VALUES (?, ?, 'enrolled')
        ")->execute([$conferenceId, $userId]);

        $pdo->commit();

        // Registrar en auditoría
        try {
            $ip = getRealUserIp();
            $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'conference_enrollments', ?, ?, ?)")
                ->execute(['USER_CONFERENCE_ENROLL', $conferenceId, $ip, json_encode(['user_id' => $userId])]);
        } catch (Throwable $e) {}

        echo json_encode(['success' => true, 'message' => '¡Inscrito correctamente a la conferencia!']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function ensureConferenceEnrollmentsTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS conference_enrollments (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            conference_id   INT NOT NULL,
            user_id         INT NOT NULL,
            status          ENUM('enrolled','cancelled','attended') DEFAULT 'enrolled',
            enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes           TEXT NULL,
            INDEX idx_conf_user (user_id),
            INDEX idx_conf_id   (conference_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}
