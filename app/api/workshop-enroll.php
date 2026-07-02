<?php
/**
 * API: Inscripción / Baja de talleres (Panel de Usuario)
 * GET    /api/workshop-enroll.php?userId=N          → estado de inscripción
 * POST   /api/workshop-enroll.php  {action:"enroll"}   → inscribir
 * DELETE /api/workshop-enroll.php  {action:"unenroll"}  → darse de baja (máx 3 veces)
 */

require_once __DIR__ . '/_auth_common.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    ensureWorkshopCancellationColumn($pdo);
    try {
        $pdo->exec("ALTER TABLE congress_enrollment_requests ADD COLUMN selected_convocatorias_json TEXT NULL AFTER members_snapshot_json");
    } catch (Throwable $ignored) {}

    // ── GET: estado actual ───────────────────────────────────────
    if ($method === 'GET') {
        $userId = (int)($_SESSION['user_id'] ?? $_GET['userId'] ?? 0);
        if ($userId <= 0) { try { $userId = requireLoggedInUser(); } catch(Throwable $e){} }
        if ($userId <= 0) {
            echo json_encode(['success' => true, 'can_enroll' => false, 'enrolled_workshop_id' => null, 'cancellations_used' => 0]);
            exit;
        }

        $paidConvs = [];
        $hasCongress = false;
        try {
            $stmtReqs = $pdo->prepare("
                SELECT id, includes_congress, selected_convocatorias_json FROM congress_enrollment_requests
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

        $enrolledWorkshopIds = [];
        try {
            $stmtEnrolled = $pdo->prepare("
                SELECT workshop_id
                FROM workshop_enrollments
                WHERE user_id = ? AND status != 'cancelled'
            ");
            $stmtEnrolled->execute([$userId]);
            $enrolledWorkshopIds = $stmtEnrolled->fetchAll(PDO::FETCH_COLUMN);
        } catch (Throwable $ignored) {}

        // Contar bajas anteriores del usuario
        $cancellationsUsed = 0;
        try {
            $stmtCancels = $pdo->prepare("
                SELECT COUNT(*) FROM workshop_enrollments
                WHERE user_id = ? AND status = 'cancelled'
            ");
            $stmtCancels->execute([$userId]);
            $cancellationsUsed = (int)$stmtCancels->fetchColumn();
        } catch (Throwable $ignored) {}

        echo json_encode([
            'success'              => true,
            'can_enroll'           => $hasCongress,
            'paid_convocatorias'   => array_values(array_unique($paidConvs)),
            'enrolled_workshop_ids'=> array_map('intval', $enrolledWorkshopIds),
            'cancellations_used'   => $cancellationsUsed,
            'can_unenroll'         => $cancellationsUsed < 3,
        ]);
        exit;
    }

    // ── POST: inscribir o dar de baja ────────────────────────────
    if ($method === 'POST' || $method === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $input = $_POST;
            // Fallback: Si envían un DELETE sin body o en x-www-form-urlencoded
            if (empty($input)) { parse_str(file_get_contents('php://input'), $input); }
            if (empty($input)) { $input = $_GET; }
        }
        
        if (empty($input)) throw new Exception('Payload o parámetros inválidos');

        $action = $input['action'] ?? 'enroll';
        $userId = requireLoggedInUser();

        // ── Dar de baja ──────────────────────────────────────────
        if ($action === 'unenroll') {
            // Buscar inscripción activa
            $workshopIdToCancel = (int)($input['workshopId'] ?? 0);
            $stmtFind = $pdo->prepare("
                SELECT id, workshop_id FROM workshop_enrollments
                WHERE user_id = ? AND workshop_id = ? AND status != 'cancelled'
                LIMIT 1
            ");
            $stmtFind->execute([$userId, $workshopIdToCancel]);
            $enrollment = $stmtFind->fetch();

            if (!$enrollment) throw new Exception('No estás inscrito en ningún taller actualmente.');

            // Contar bajas ya usadas
            $stmtCancels = $pdo->prepare("
                SELECT COUNT(*) FROM workshop_enrollments
                WHERE user_id = ? AND status = 'cancelled'
            ");
            $stmtCancels->execute([$userId]);
            $used = (int)$stmtCancels->fetchColumn();

            if ($used >= 3) {
                throw new Exception('Alcanzaste el límite de 3 cambios de taller. Ya no puedes darte de baja.');
            }

            $pdo->prepare("
                UPDATE workshop_enrollments
                SET status = 'cancelled', notes = CONCAT(COALESCE(notes,''), ' | Baja solicitada por usuario ', NOW())
                WHERE id = ?
            ")->execute([(int)$enrollment['id']]);

            $remaining = 2 - $used; // después de esta baja quedan (3 - $used - 1) = 2 - $used
            $remaining = max(0, $remaining);

            // Registrar baja en auditoría
            try {
                $ip = getRealUserIp();
                $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'workshop_enrollments', ?, ?, ?)")
                    ->execute(['USER_WORKSHOP_UNENROLL', $enrollment['id'], $ip, json_encode(['user_id' => $userId])]);
            } catch(Throwable $e) {}

            echo json_encode([
                'success'            => true,
                'message'            => '✅ Te has dado de baja del taller correctamente.',
                'cancellations_used' => $used + 1,
                'cancellations_remaining' => $remaining,
            ]);
            exit;
        }

        // ── Inscribir ────────────────────────────────────────────
        $workshopId = (int)($input['workshopId'] ?? 0);
        if ($workshopId <= 0) throw new Exception('workshopId requerido');

        $stmtWs = $pdo->prepare("SELECT convocatoria_id FROM workshops WHERE id = ?");
        $stmtWs->execute([$workshopId]);
        $wsConvId = (int) $stmtWs->fetchColumn();

        // Verificar inscripción al congreso aprobada
        $hasPaid = false;
        try {
            $stmtReqs = $pdo->prepare("
                SELECT id, includes_congress, selected_convocatorias_json FROM congress_enrollment_requests
                WHERE user_id = ? AND status IN ('approved', 'paid')
            ");
            $stmtReqs->execute([$userId]);
            foreach ($stmtReqs->fetchAll() as $r) {
                $arr = json_decode($r['selected_convocatorias_json'] ?? '[]', true) ?: [];
                if (in_array($wsConvId, $arr)) { $hasPaid = true; break; }
                if ($r['includes_congress'] && $wsConvId == 0) { $hasPaid = true; break; }
                if ($r['includes_congress']) {
                    $stmtC = $pdo->prepare("SELECT conv_tipo, titulo FROM convocatorias WHERE id = ?");
                    $stmtC->execute([$wsConvId]);
                    $cData = $stmtC->fetch(PDO::FETCH_ASSOC) ?: [];
                    $tipo = strtolower(($cData['conv_tipo'] ?? '') . ' ' . ($cData['titulo'] ?? ''));
                    if (str_contains($tipo, 'congreso')) { $hasPaid = true; break; }
                }
            }
        } catch (Throwable $ignored) {}
        if (!$hasPaid) {
            throw new Exception('Necesitas tener tu inscripción a esta convocatoria aprobada y pagada para registrarte en sus talleres.');
        }

        // Verificar que no esté ya inscrito
        $stmtEnrolled = $pdo->prepare("
            SELECT workshop_id FROM workshop_enrollments WHERE user_id = ? AND workshop_id = ? AND status != 'cancelled' LIMIT 1
        ");
        $stmtEnrolled->execute([$userId, $workshopId]);
        if ($stmtEnrolled->fetch()) {
            throw new Exception('Ya estás inscrito en este taller.');
        }

        // Iniciar transacción de base de datos con bloqueo preventivo
        $pdo->beginTransaction();

        // Verificar cupo e información del nuevo taller
        $stmtWs = $pdo->prepare("
            SELECT name, schedule_date, schedule_date_end, schedule_start, schedule_end, max_capacity,
                   (SELECT COUNT(*) FROM workshop_enrollments we WHERE we.workshop_id = workshops.id AND we.status != 'cancelled') as enrolled_count
            FROM workshops WHERE id = ? AND status IN ('published', 'full')
            FOR UPDATE
        ");
        $stmtWs->execute([$workshopId]);
        $ws = $stmtWs->fetch();

        if (!$ws) throw new Exception('El taller no existe o no está disponible.');
        if ($ws['enrolled_count'] >= $ws['max_capacity']) throw new Exception('El taller ya no tiene cupo disponible.');

        // Validación inteligente de choques de horario con otros talleres
        if (!empty($ws['schedule_date']) && !empty($ws['schedule_start']) && !empty($ws['schedule_end'])) {
            $stmtSchedule = $pdo->prepare("
                SELECT w.name, w.schedule_date, w.schedule_date_end, w.schedule_start, w.schedule_end 
                FROM workshop_enrollments we
                JOIN workshops w ON we.workshop_id = w.id
                WHERE we.user_id = ? AND we.status != 'cancelled'
            ");
            $stmtSchedule->execute([$userId]);
            $enrolledWorkshops = $stmtSchedule->fetchAll(PDO::FETCH_ASSOC);

            $newStart = strtotime($ws['schedule_date'] . ' ' . $ws['schedule_start']);
            $newEnd = strtotime(($ws['schedule_date_end'] ?: $ws['schedule_date']) . ' ' . $ws['schedule_end']);

            $enrolledActivities = [];

            // Talleres
            $stmtSchedule = $pdo->prepare("
                SELECT w.name, w.schedule_date as s_date, w.schedule_date_end as e_date, w.schedule_start as s_start, w.schedule_end as s_end, 'taller' as tipo
                FROM workshop_enrollments we
                JOIN workshops w ON we.workshop_id = w.id
                WHERE we.user_id = ? AND we.status != 'cancelled'
            ");
            $stmtSchedule->execute([$userId]);
            $enrolledActivities = array_merge($enrolledActivities, $stmtSchedule->fetchAll(PDO::FETCH_ASSOC));

            // Conferencias
            try {
                $stmtConf = $pdo->prepare("
                    SELECT c.name, c.conference_date as s_date, c.conference_date as e_date, c.time_start as s_start, c.time_end as s_end, 'conferencia' as tipo
                    FROM conference_enrollments ce
                    JOIN conferences c ON ce.conference_id = c.id
                    WHERE ce.user_id = ? AND ce.status != 'cancelled'
                ");
                $stmtConf->execute([$userId]);
                $enrolledActivities = array_merge($enrolledActivities, $stmtConf->fetchAll(PDO::FETCH_ASSOC));
            } catch (Throwable $ignored) {}

            // Torneo de robótica
            try {
                $stmtRob = $pdo->prepare("
                    SELECT cer.includes_robotics 
                    FROM congress_enrollment_requests cer 
                    WHERE cer.user_id = ? AND cer.status IN ('approved', 'paid') AND cer.includes_robotics = 1
                ");
                $stmtRob->execute([$userId]);
                if ($stmtRob->fetch()) {
                    $enrolledActivities[] = [
                        'name' => 'Torneo de Robótica',
                        's_date' => '2026-10-23',
                        'e_date' => '2026-10-23',
                        's_start' => '09:00:00',
                        's_end' => '17:00:00',
                        'tipo' => 'torneo'
                    ];
                }
            } catch (Throwable $ignored) {}

            foreach ($enrolledActivities as $ea) {
                if (empty($ea['s_date']) || empty($ea['s_start']) || empty($ea['s_end'])) continue;
                
                $eaStart = strtotime($ea['s_date'] . ' ' . $ea['s_start']);
                $eaEnd = strtotime(($ea['e_date'] ?: $ea['s_date']) . ' ' . $ea['s_end']);

                // Choque de horarios: (StartA < EndB) y (EndA > StartB)
                if ($newStart < $eaEnd && $newEnd > $eaStart) {
                    throw new Exception('⚠️ ¡Horario ocupado! No puedes inscribirte porque se empalma con otra actividad en tu agenda: <strong>' . $ea['name'] . ' (' . $ea['tipo'] . ')</strong>.');
                }
            }
        }

        $pdo->prepare("
            INSERT INTO workshop_enrollments (workshop_id, user_id, status) VALUES (?, ?, 'enrolled')
        ")->execute([$workshopId, $userId]);

        $pdo->commit();

        // Registrar alta en auditoría
        try {
            $ip = getRealUserIp();
            $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'workshop_enrollments', ?, ?, ?)")
                ->execute(['USER_WORKSHOP_ENROLL', $workshopId, $ip, json_encode(['user_id' => $userId])]);
        } catch(Throwable $e) {}

        echo json_encode(['success' => true, 'message' => '¡Inscrito correctamente al taller!']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

/**
 * Asegura que la columna notes exista (ya está en el schema original).
 * Se deja como hook por si en algún entorno no existe.
 */
function ensureWorkshopCancellationColumn(PDO $pdo): void
{
    // notes ya existe en el schema, no se requiere ALTER.
    // Si en el futuro se necesita un contador dedicado:
    // ALTER TABLE workshop_enrollments ADD COLUMN cancellation_number TINYINT DEFAULT 0;
}
