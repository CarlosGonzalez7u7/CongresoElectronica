<?php
/**
 * API: Panel de Talleristas — v2
 *
 * GET  ?action=list_workshops          → talleres del instructor
 * GET  ?action=get_roster&workshop_id= → lista de inscritos con estado
 * GET  ?action=export_excel&workshop_id= → descarga .xlsx
 * POST {"action":"mark_attendance","workshop_id":N,"folio":"..."}   → marcar por QR / folio
 * POST {"action":"mark_manual","workshop_id":N,"user_id":N}         → marcar manualmente desde lista
 * POST {"action":"unmark_attendance","enrollment_id":N}             → desmarcar asistencia
 */

require_once __DIR__ . '/_auth_common.php';

if (session_status() === PHP_SESSION_NONE) session_start();

// ── Autenticación ──────────────────────────────────────────────────────────────
$instructorId = (int)($_SESSION['instructor_id'] ?? 0);
if ($instructorId <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autorizado. Sesión de tallerista requerida.']);
    exit;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifica que el taller pertenezca a este instructor.
 * Lanza Exception si no.
 */
function requireOwnWorkshop(PDO $pdo, int $workshopId, int $instructorId): array {
    $stmt = $pdo->prepare("SELECT id, name, status FROM workshops WHERE id = ? AND instructor_id = ? LIMIT 1");
    $stmt->execute([$workshopId, $instructorId]);
    $ws = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ws) throw new Exception('Taller no encontrado o no tienes permiso para acceder a él.');
    return $ws;
}

function requirePublishedWorkshop(array $workshop): void {
    if (!in_array($workshop['status'] ?? '', ['published', 'full'], true)) {
        throw new Exception('Este taller aun esta en borrador. Podras tomar asistencia cuando el administrador lo publique.');
    }
}

/**
 * Convierte un texto a formato seguro para nombre de archivo.
 */
function safeFilename(string $name): string {
    $name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) ?: $name);
    return substr(trim($name, '_'), 0, 60) ?: 'taller';
}

// ── Router ────────────────────────────────────────────────────────────────────
try {
    $method = $_SERVER['REQUEST_METHOD'];

    // ── GET ──────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $action = $_GET['action'] ?? '';

        // ── list_workshops ──────────────────────────────────────────────────
        if ($action === 'list_workshops') {
            $stmt = $pdo->prepare("
                SELECT id, name, status, schedule_date, schedule_start, schedule_end, location, max_capacity AS capacity,
                       (SELECT COUNT(*) FROM workshop_enrollments we
                        WHERE we.workshop_id = workshops.id AND we.status != 'cancelled') AS enrolled_count,
                       (SELECT COUNT(*) FROM workshop_enrollments we
                        WHERE we.workshop_id = workshops.id AND we.status = 'attended') AS attended_count
                FROM workshops
                WHERE instructor_id = ? AND status IN ('draft', 'published', 'full')
                ORDER BY schedule_date ASC, schedule_start ASC
            ");
            $stmt->execute([$instructorId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            exit;
        }

        // ── get_roster ──────────────────────────────────────────────────────
        if ($action === 'get_roster') {
            $workshopId = (int)($_GET['workshop_id'] ?? 0);
            requireOwnWorkshop($pdo, $workshopId, $instructorId);

            $stmt = $pdo->prepare("
                SELECT
                    we.id            AS enrollment_id,
                    pu.id            AS user_id,
                    pu.full_name,
                    pu.username      AS control_number,
                    pu.email,
                    pu.career,
                    pu.semester,
                    pu.school,
                    pu.city,
                    we.status,
                    we.attendance_marked_at,
                    cer.request_folio AS folio,
                    cer.status        AS payment_status
                FROM workshop_enrollments we
                INNER JOIN platform_users pu ON pu.id = we.user_id
                LEFT JOIN congress_enrollment_requests cer
                       ON cer.user_id = pu.id AND cer.status IN ('approved','paid')
                WHERE we.workshop_id = ? AND we.status != 'cancelled'
                ORDER BY pu.full_name ASC
            ");
            $stmt->execute([$workshopId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            exit;
        }

        // ── export_excel ────────────────────────────────────────────────────
        if ($action === 'export_excel') {
            $workshopId = (int)($_GET['workshop_id'] ?? 0);
            $ws = requireOwnWorkshop($pdo, $workshopId, $instructorId);
            requirePublishedWorkshop($ws);

            $stmt = $pdo->prepare("
                SELECT
                    pu.full_name,
                    pu.username      AS control_number,
                    pu.email,
                    pu.career,
                    pu.semester,
                    pu.school,
                    pu.city,
                    cer.request_folio AS folio,
                    CASE we.status
                        WHEN 'attended' THEN 'Asistió'
                        WHEN 'enrolled' THEN 'Inscrito'
                        ELSE we.status
                    END AS asistencia,
                    we.attendance_marked_at AS hora_marcado
                FROM workshop_enrollments we
                INNER JOIN platform_users pu ON pu.id = we.user_id
                LEFT JOIN congress_enrollment_requests cer
                       ON cer.user_id = pu.id AND cer.status IN ('approved','paid')
                WHERE we.workshop_id = ? AND we.status != 'cancelled'
                ORDER BY pu.full_name ASC
            ");
            $stmt->execute([$workshopId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $filename = safeFilename($ws['name']) . '_lista_' . date('Ymd') . '.csv';

            header('Content-Type: text/csv; charset=UTF-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Cache-Control: no-cache');

            // BOM para Excel en Windows
            echo "\xEF\xBB\xBF";

            $out = fopen('php://output', 'w');
            fputcsv($out, ['Nombre completo', 'No. Control', 'Email', 'Carrera', 'Semestre', 'Escuela', 'Ciudad', 'Folio congreso', 'Asistencia', 'Hora de marcado']);
            foreach ($rows as $r) {
                fputcsv($out, [
                    $r['full_name'],
                    $r['control_number'],
                    $r['email'],
                    $r['career'] ?? '',
                    $r['semester'] ?? '',
                    $r['school'] ?? '',
                    $r['city'] ?? '',
                    $r['folio'] ?? 'Sin folio',
                    $r['asistencia'],
                    $r['hora_marcado'] ?? '',
                ]);
            }
            fclose($out);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Acción GET no reconocida.']);
        exit;
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $input['action'] ?? '';

        // ── mark_attendance (QR / folio) ────────────────────────────────────
        if ($action === 'mark_attendance') {
            $workshopId = (int)($input['workshop_id'] ?? 0);
            $folio      = strtoupper(trim($input['folio'] ?? ''));

            $ws = requireOwnWorkshop($pdo, $workshopId, $instructorId);
            requirePublishedWorkshop($ws);

            if ($folio === '') throw new Exception('Folio vacío.');

            // 1. Verificar folio en congress_enrollment_requests
            $stmtReq = $pdo->prepare("
                SELECT user_id FROM congress_enrollment_requests
                WHERE request_folio = ? AND status IN ('approved','paid')
                LIMIT 1
            ");
            $stmtReq->execute([$folio]);
            $req = $stmtReq->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                // Intentar también en congress_registrations por si se usa otro campo de folio
                $stmtReq2 = $pdo->prepare("
                    SELECT user_id FROM congress_enrollment_requests
                    WHERE request_folio = ?
                    LIMIT 1
                ");
                $stmtReq2->execute([$folio]);
                $reqAny = $stmtReq2->fetch(PDO::FETCH_ASSOC);

                if ($reqAny) {
                    throw new Exception('⚠️ El folio existe pero el pago no ha sido aprobado por Tesorería. El alumno debe regularizar su situación antes de ingresar.');
                }
                throw new Exception('❌ Folio no reconocido. Verifica que el código QR sea del congreso RENOVATEC y esté vigente.');
            }

            $userId = (int)$req['user_id'];

            // 2. Obtener nombre del alumno para mensajes
            $stmtName = $pdo->prepare("SELECT full_name FROM platform_users WHERE id = ?");
            $stmtName->execute([$userId]);
            $studentName = $stmtName->fetchColumn() ?: 'Alumno';

            // 3. Verificar si el alumno tiene inscripción a ALGÚN taller de este congreso
            $stmtAnyTaller = $pdo->prepare("
                SELECT COUNT(*) FROM workshop_enrollments WHERE user_id = ? AND status != 'cancelled'
            ");
            $stmtAnyTaller->execute([$userId]);
            $hasTalleres = (int)$stmtAnyTaller->fetchColumn() > 0;

            if (!$hasTalleres) {
                throw new Exception("⚠️ <strong>{$studentName}</strong> está inscrito al congreso pero no tiene ningún taller registrado. Debe inscribirse a un taller para participar.");
            }

            // 4. Verificar inscripción específica a ESTE taller
            $stmtEnr = $pdo->prepare("
                SELECT id, status, attendance_marked_at
                FROM workshop_enrollments
                WHERE workshop_id = ? AND user_id = ? AND status != 'cancelled'
                LIMIT 1
            ");
            $stmtEnr->execute([$workshopId, $userId]);
            $enr = $stmtEnr->fetch(PDO::FETCH_ASSOC);

            if (!$enr) {
                // Ver en qué talleres sí está inscrito
                $stmtOther = $pdo->prepare("
                    SELECT w.name FROM workshop_enrollments we
                    INNER JOIN workshops w ON w.id = we.workshop_id
                    WHERE we.user_id = ? AND we.status != 'cancelled'
                    LIMIT 3
                ");
                $stmtOther->execute([$userId]);
                $otherTalleres = $stmtOther->fetchAll(PDO::FETCH_COLUMN);
                $otherList = implode(', ', $otherTalleres);
                throw new Exception("🚫 <strong>{$studentName}</strong> no está inscrito en <em>tu taller</em>. Sus talleres registrados son: {$otherList}.");
            }

            // 5. ¿Ya marcó asistencia?
            if ($enr['status'] === 'attended' || $enr['attendance_marked_at'] !== null) {
                echo json_encode([
                    'success'        => true,
                    'already_marked' => true,
                    'message'        => "ℹ️ <strong>{$studentName}</strong> ya había pasado lista previamente.",
                    'student_name'   => $studentName,
                ]);
                exit;
            }

            // 6. Marcar asistencia
            $pdo->prepare("
                UPDATE workshop_enrollments
                SET status = 'attended', attendance_marked_at = NOW(), attendance_marked_by = 'Instructor'
                WHERE id = ?
            ")->execute([$enr['id']]);

            echo json_encode([
                'success'        => true,
                'already_marked' => false,
                'message'        => "✅ Asistencia confirmada para <strong>{$studentName}</strong>.",
                'student_name'   => $studentName,
                'enrollment_id'  => $enr['id'],
            ]);
            exit;
        }

        // ── mark_manual (desde lista de alumnos) ───────────────────────────
        if ($action === 'mark_manual') {
            $workshopId = (int)($input['workshop_id'] ?? 0);
            $userId     = (int)($input['user_id']     ?? 0);

            $ws = requireOwnWorkshop($pdo, $workshopId, $instructorId);
            requirePublishedWorkshop($ws);

            $stmtEnr = $pdo->prepare("
                SELECT id, status, attendance_marked_at FROM workshop_enrollments
                WHERE workshop_id = ? AND user_id = ? AND status != 'cancelled'
                LIMIT 1
            ");
            $stmtEnr->execute([$workshopId, $userId]);
            $enr = $stmtEnr->fetch(PDO::FETCH_ASSOC);

            if (!$enr) throw new Exception('Inscripción no encontrada.');

            if ($enr['status'] === 'attended') {
                echo json_encode(['success' => true, 'already_marked' => true, 'message' => 'Ya tenía asistencia marcada.']);
                exit;
            }

            $pdo->prepare("
                UPDATE workshop_enrollments
                SET status = 'attended', attendance_marked_at = NOW(), attendance_marked_by = 'Instructor-Manual'
                WHERE id = ?
            ")->execute([$enr['id']]);

            echo json_encode(['success' => true, 'already_marked' => false, 'message' => 'Asistencia marcada manualmente.', 'enrollment_id' => $enr['id']]);
            exit;
        }

        // ── unmark_attendance ───────────────────────────────────────────────
        if ($action === 'unmark_attendance') {
            $enrollmentId = (int)($input['enrollment_id'] ?? 0);

            // Verificar que la inscripción sea de un taller de este instructor
            $stmtCheck = $pdo->prepare("
                SELECT we.id, w.status FROM workshop_enrollments we
                INNER JOIN workshops w ON w.id = we.workshop_id
                WHERE we.id = ? AND w.instructor_id = ?
                LIMIT 1
            ");
            $stmtCheck->execute([$enrollmentId, $instructorId]);
            if (!$stmtCheck->fetch()) throw new Exception('No tienes permiso para modificar esta inscripción.');

            $pdo->prepare("
                UPDATE workshop_enrollments
                SET status = 'enrolled', attendance_marked_at = NULL, attendance_marked_by = NULL
                WHERE id = ?
            ")->execute([$enrollmentId]);

            echo json_encode(['success' => true, 'message' => 'Asistencia desmarcada.']);
            exit;
        }

        // ── get_stats ───────────────────────────────────────────────────────
        if ($action === 'get_stats') {
            $workshopId = (int)($input['workshop_id'] ?? 0);
            requireOwnWorkshop($pdo, $workshopId, $instructorId);

            $stmt = $pdo->prepare("
                SELECT
                    COUNT(*) AS total,
                    SUM(status = 'attended') AS attended,
                    SUM(status = 'enrolled') AS pending
                FROM workshop_enrollments
                WHERE workshop_id = ? AND status != 'cancelled'
            ");
            $stmt->execute([$workshopId]);
            echo json_encode(['success' => true, 'data' => $stmt->fetch(PDO::FETCH_ASSOC)]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Acción POST no reconocida.']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido.']);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
