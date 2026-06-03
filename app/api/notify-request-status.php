<?php
/**
 * API: Notificar por correo el cambio de estado de una solicitud
 * POST /api/notify-request-status.php
 */
require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    // Asegurarse de que el usuario es administrador
    $adminId = requireLoggedInUser();

    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $requestId = (int)($input['request_id'] ?? 0);
    
    if ($requestId <= 0) throw new Exception('ID de solicitud requerido');

    // Extraer la información completa de la solicitud
    $stmt = $pdo->prepare("
        SELECT r.*, u.email, u.full_name 
        FROM congress_enrollment_requests r
        JOIN platform_users u ON r.user_id = u.id
        WHERE r.id = ?
    ");
    $stmt->execute([$requestId]);
    $request = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$request) throw new Exception('Solicitud no encontrada');

    $status = $request['status'];
    $emailTo = $request['email'];
    $userName = $request['full_name'] ?: 'Participante';
    $folio = $request['request_folio'];

    // Decodificar JSONs para armar el desglose
    $convocatorias = json_decode($request['selected_convocatorias_json'] ?? '[]', true) ?: [];
    $robots = json_decode($request['robots_snapshot_json'] ?? '[]', true) ?: [];
    
    // Obtener nombres de las convocatorias
    $convNombres = [];
    if (!empty($convocatorias)) {
        $ph = implode(',', array_fill(0, count($convocatorias), '?'));
        $stmtC = $pdo->prepare("SELECT titulo FROM convocatorias WHERE id IN ($ph)");
        $stmtC->execute($convocatorias);
        $convNombres = $stmtC->fetchAll(PDO::FETCH_COLUMN);
    }

    $subject = "";
    $htmlContent = "";
    $attachments = [];

    if ($status === 'approved' || $status === 'paid') {
        $subject = "¡Felicidades! Tu solicitud a RENOVATEC ha sido aprobada 🎉";
        
        $desgloseConvocatorias = empty($convNombres) ? "" : "<li>" . implode("</li><li>", $convNombres) . "</li>";
        
        $desgloseRobots = "";
        if (!empty($robots)) {
            $desgloseRobots = "<h3>Torneo de Robótica - Desglose:</h3><ul>";
            foreach ($robots as $r) {
                $nombreR = htmlspecialchars($r['name'] ?? $r['robot_name'] ?? 'Robot');
                $catR = htmlspecialchars($r['category'] ?? 'Sin categoría');
                $desgloseRobots .= "<li><strong>$nombreR</strong> - $catR</li>";
            }
            $desgloseRobots .= "</ul>";
            $desgloseRobots .= "<p><em>Recuerda presentarte en la mesa de registro para el pesaje y homologación 30 minutos antes del inicio de los combates de tu categoría.</em></p>";
        }

        // Obtener el código QR en base64 para adjuntarlo (Usa tu propia API si lo deseas)
        $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" . urlencode("RENOVATEC|FOLIO:{$folio}");
        $qrData = @file_get_contents($qrUrl);
        if ($qrData) {
            $attachments[] = [
                'name' => "QR_{$folio}.png",
                'content' => base64_encode($qrData)
            ];
        }

        $htmlContent = "
            <div style='font-family: Arial, sans-serif; color: #333;'>
                <h2 style='color: #00d4ff;'>¡Hola $userName!</h2>
                <p>Nos emociona informarte que tu inscripción a <strong>RENOVATEC 2026</strong> ha sido <strong>aprobada y verificada</strong>.</p>
                <p>Tu número de folio oficial es: <strong>$folio</strong></p>
                
                <h3>Tu Paquete Incluye:</h3>
                <ul>$desgloseConvocatorias</ul>
                $desgloseRobots
                
                <h3>¿Qué sigue?</h3>
                <p>Si tu paquete incluye el Congreso, ya puedes ingresar a tu <a href='https://renovatec.mx/usuario'>Panel de Usuario</a> para <strong>inscribirte a los Talleres y Conferencias</strong> de tu elección antes de que se llenen los cupos.</p>
                <p>Adjunto a este correo encontrarás tu <strong>Código QR de Acceso</strong>. Por favor guárdalo, te será solicitado en las puertas el día del evento.</p>
                <p>Para descargar tu <strong>Pase Oficial completo en PDF</strong>, ingresa a la sección <em>Mis Inscripciones</em> en tu perfil de alumno.</p>
                <br>
                <p>¡Nos vemos pronto!</p>
                <p><em>El equipo de RENOVATEC</em></p>
            </div>
        ";
    } elseif ($status === 'rejected') {
        $subject = "Aviso sobre tu solicitud de inscripción - RENOVATEC";
        $motivo = htmlspecialchars($request['rejection_reason'] ?: $request['admin_notes'] ?: 'No cumple con los requisitos.');
        
        $htmlContent = "
            <div style='font-family: Arial, sans-serif; color: #333;'>
                <h2 style='color: #ef4444;'>Hola $userName,</h2>
                <p>Te informamos que tu solicitud de inscripción con folio <strong>$folio</strong> ha sido <strong>rechazada</strong> por el administrador. Motivo:</p>
                <blockquote style='border-left: 4px solid #ef4444; padding-left: 10px; color: #555;'>$motivo</blockquote>
                <p><strong>¿Qué debes hacer?</strong></p>
                <p>Si consideras que esto es un error o necesitas realizar una nueva solicitud para corregir los datos, por favor ingresa a tu <a href='https://renovatec.mx/usuario'>Panel de Usuario</a> o contáctanos a soporte@renovatec.mx.</p>
                <br>
                <p><em>El equipo de RENOVATEC</em></p>
            </div>
        ";
    } elseif ($status === 'resubmit_requested') {
        $subject = "Acción Requerida: Tu comprobante necesita corrección - RENOVATEC";
        $motivo = htmlspecialchars($request['rejection_reason'] ?: $request['admin_notes'] ?: 'Comprobante ilegible o incorrecto.');
        
        $htmlContent = "
            <div style='font-family: Arial, sans-serif; color: #333;'>
                <h2 style='color: #f59e0b;'>Hola $userName,</h2>
                <p>Hemos revisado tu solicitud con folio <strong>$folio</strong> y necesitamos que <strong>vuelvas a enviar tu comprobante de pago</strong>.</p>
                <p>Mensaje del administrador:</p>
                <blockquote style='border-left: 4px solid #f59e0b; padding-left: 10px; color: #555;'>$motivo</blockquote>
                <h3>Pasos para solucionarlo:</h3>
                <ol>
                    <li>Ingresa a tu <a href='https://renovatec.mx/usuario'>Panel de Usuario</a>.</li>
                    <li>Deslízate a la sección <strong>Mis Inscripciones</strong>.</li>
                    <li>Haz clic en subir comprobante y anexa nuevamente tu archivo (JPG, PNG o PDF).</li>
                </ol>
                <p>Una vez que lo envíes, volverá a la cola de revisión a la brevedad para confirmar tu lugar.</p>
                <br>
                <p><em>El equipo de RENOVATEC</em></p>
            </div>
        ";
    } else {
        echo json_encode(['success' => true, 'message' => 'No se requiere correo para este estado']);
        exit;
    }

    // Si existe la función sendEmail() en _auth_common, la usa (con Brevo / mail).
    if (function_exists('sendEmail')) {
        sendEmail($emailTo, $subject, $htmlContent, $attachments);
    } else {
        $apiKey = getenv('BREVO_API_KEY') ?: $_ENV['BREVO_API_KEY'] ?? '';
        if ($apiKey) {
            $data = [
                'sender' => ['name' => 'RENOVATEC', 'email' => 'no-reply@renovatec.mx'],
                'to' => [['email' => $emailTo, 'name' => $userName]],
                'subject' => $subject,
                'htmlContent' => $htmlContent
            ];
            if (!empty($attachments)) $data['attachment'] = $attachments;

            $ch = curl_init('https://api.brevo.com/v3/smtp/email');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                'Content-Type: application/json',
                'api-key: ' . $apiKey
            ]);
            curl_exec($ch);
            curl_close($ch);
        } else {
            $headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: RENOVATEC <no-reply@renovatec.mx>\r\n";
            mail($emailTo, $subject, $htmlContent, $headers);
        }
    }

    echo json_encode(['success' => true, 'message' => 'Notificación enviada con éxito']);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}