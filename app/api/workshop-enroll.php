<?php
/**
 * API: Inscripción / Baja de talleres (Panel de Usuario)
 * GET    /api/workshop-enroll.php?userId=N          → estado de inscripción
 * POST   /api/workshop-enroll.php  {action:"enroll"}   → inscribir
 * DELETE /api/workshop-enroll.php  {action:"unenroll"}  → darse de baja (máx 2 veces)
 */

require_once __DIR__ . '/_auth_common.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    ensureWorkshopCancellationColumn($pdo);

    // ── GET: estado actual ───────────────────────────────────────
    if ($method === 'GET') {
        $userId = (int)($_SESSION['user_id'] ?? 0);
        if ($userId <= 0) {
            echo json_encode(['success' => true, 'can_enroll' => false, 'enrolled_workshop_id' => null, 'cancellations_used' => 0]);
            exit;
        }

        $stmtReqs = $pdo->prepare("
            SELECT id, includes_congress, selected_convocatorias_json FROM congress_enrollment_requests
            WHERE user_id = ? AND status IN ('approved', 'paid')
        ");
        $stmtReqs->execute([$userId]);
        $paidConvs = [];
        $hasCongress = false;
        foreach ($stmtReqs->fetchAll() as $r) {
            if ($r['includes_congress']) $hasCongress = true;
            if (!empty($r['selected_convocatorias_json'])) {
                $arr = json_decode($r['selected_convocatorias_json'], true);
                if (is_array($arr)) $paidConvs = array_merge($paidConvs, $arr);
            }
        }

        $stmtEnrolled = $pdo->prepare("
            SELECT workshop_id
            FROM workshop_enrollments
            WHERE user_id = ? AND status != 'cancelled'
            LIMIT 1
        ");
        $stmtEnrolled->execute([$userId]);
        $enrolledWorkshopId = $stmtEnrolled->fetchColumn();

        // Contar bajas anteriores del usuario
        $stmtCancels = $pdo->prepare("
            SELECT COUNT(*) FROM workshop_enrollments
            WHERE user_id = ? AND status = 'cancelled'
        ");
        $stmtCancels->execute([$userId]);
        $cancellationsUsed = (int)$stmtCancels->fetchColumn();

        echo json_encode([
            'success'              => true,
            'can_enroll'           => $hasCongress,
            'paid_convocatorias'   => array_values(array_unique($paidConvs)),
            'enrolled_workshop_id' => $enrolledWorkshopId ? (int)$enrolledWorkshopId : null,
            'cancellations_used'   => $cancellationsUsed,
            'can_unenroll'         => $cancellationsUsed < 2,
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
            $stmtFind = $pdo->prepare("
                SELECT id, workshop_id FROM workshop_enrollments
                WHERE user_id = ? AND status != 'cancelled'
                LIMIT 1
            ");
            $stmtFind->execute([$userId]);
            $enrollment = $stmtFind->fetch();

            if (!$enrollment) throw new Exception('No estás inscrito en ningún taller actualmente.');

            // Contar bajas ya usadas
            $stmtCancels = $pdo->prepare("
                SELECT COUNT(*) FROM workshop_enrollments
                WHERE user_id = ? AND status = 'cancelled'
            ");
            $stmtCancels->execute([$userId]);
            $used = (int)$stmtCancels->fetchColumn();

            if ($used >= 2) {
                throw new Exception('Alcanzaste el límite de 2 cambios de taller. Ya no puedes darte de baja.');
            }

            $pdo->prepare("
                UPDATE workshop_enrollments
                SET status = 'cancelled', notes = CONCAT(COALESCE(notes,''), ' | Baja solicitada por usuario ', NOW())
                WHERE id = ?
            ")->execute([(int)$enrollment['id']]);

            $remaining = 1 - $used; // después de esta baja quedan (2 - $used - 1) = 1 - $used
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
        $stmtReqs = $pdo->prepare("
            SELECT id, includes_congress, selected_convocatorias_json FROM congress_enrollment_requests
            WHERE user_id = ? AND status IN ('approved', 'paid')
        ");
        $stmtReqs->execute([$userId]);
        $hasPaid = false;
        foreach ($stmtReqs->fetchAll() as $r) {
            $arr = json_decode($r['selected_convocatorias_json'] ?? '[]', true) ?: [];
            if (in_array($wsConvId, $arr)) { $hasPaid = true; break; }
            if ($r['includes_congress'] && $wsConvId == 0) { $hasPaid = true; break; }
            if ($r['includes_congress']) {
                $stmtC = $pdo->prepare("SELECT conv_tipo FROM convocatorias WHERE id = ?");
                $stmtC->execute([$wsConvId]);
                $tipo = strtolower($stmtC->fetchColumn() ?? '');
                if (str_contains($tipo, 'congreso')) { $hasPaid = true; break; }
            }
        }
        if (!$hasPaid) {
            throw new Exception('Necesitas tener tu inscripción a esta convocatoria aprobada y pagada para registrarte en sus talleres.');
        }

        // Verificar que no esté ya inscrito
        $stmtEnrolled = $pdo->prepare("
            SELECT workshop_id FROM workshop_enrollments WHERE user_id = ? AND status != 'cancelled' LIMIT 1
        ");
        $stmtEnrolled->execute([$userId]);
        if ($stmtEnrolled->fetch()) {
            throw new Exception('Ya estás inscrito en un taller. Primero date de baja para elegir otro.');
        }

        // Iniciar transacción de base de datos con bloqueo preventivo
        $pdo->beginTransaction();

        // Verificar cupo del taller
        $stmtWs = $pdo->prepare("
            SELECT max_capacity,
                   (SELECT COUNT(*) FROM workshop_enrollments we WHERE we.workshop_id = workshops.id AND we.status != 'cancelled') as enrolled_count
            FROM workshops WHERE id = ? AND status IN ('published', 'full')
            FOR UPDATE
        ");
        $stmtWs->execute([$workshopId]);
        $ws = $stmtWs->fetch();

        if (!$ws) throw new Exception('El taller no existe o no está disponible.');
        if ($ws['enrolled_count'] >= $ws['max_capacity']) throw new Exception('El taller ya no tiene cupo disponible.');

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