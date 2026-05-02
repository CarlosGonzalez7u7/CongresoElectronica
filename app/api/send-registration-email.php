<?php
/**
 * API: ENVIAR CORREO DE CONFIRMACION
 * POST /api/send-registration-email.php
 *
 * Envia al capitan del equipo:
 * - Pase PDF adjunto
 * - QR adjunto
 * - Folio e informacion del evento
 */

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
    exit;
}

if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || $_SERVER['HTTP_X_REQUESTED_WITH'] !== 'XMLHttpRequest') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Solicitud no autorizada']);
    exit;
}

function isBrevoConfigured() {
    return MAIL_PROVIDER === 'brevo' && BREVO_API_KEY !== '';
}

function isSmtpConfigured() {
    return SMTP_HOST !== '' && SMTP_PORT > 0 && SMTP_USER !== '' && SMTP_PASSWORD !== '';
}

function smtpRead($socket) {
    $data = '';
    while (!feof($socket)) {
        $line = fgets($socket, 515);
        if ($line === false) {
            break;
        }
        $data .= $line;
        // Las respuestas SMTP multilinea llevan guion tras el codigo: 250-...
        if (preg_match('/^\d{3} /', $line)) {
            break;
        }
    }
    return $data;
}

function smtpCommand($socket, $command, $expectedCodes = [250]) {
    fwrite($socket, $command . "\r\n");
    $response = smtpRead($socket);

    $code = (int) substr(trim($response), 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        throw new Exception('SMTP fallo en comando [' . $command . ']. Respuesta: ' . trim($response));
    }

    return $response;
}

function sendSmtpEmail($toEmail, $toName, $subject, $htmlContent, $textContent, $attachments) {
    $transport = SMTP_ENCRYPTION === 'ssl' ? 'ssl://' : 'tcp://';
    $remote = $transport . SMTP_HOST . ':' . SMTP_PORT;

    $socket = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new Exception('No se pudo conectar al servidor SMTP: ' . $errstr . ' (' . $errno . ')');
    }

    stream_set_timeout($socket, 20);

    $greeting = smtpRead($socket);
    if ((int) substr(trim($greeting), 0, 3) !== 220) {
        fclose($socket);
        throw new Exception('SMTP no respondió correctamente al conectar: ' . trim($greeting));
    }

    try {
        smtpCommand($socket, 'EHLO renovatec.local', [250]);

        if (SMTP_ENCRYPTION === 'tls') {
            smtpCommand($socket, 'STARTTLS', [220]);
            $cryptoEnabled = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if (!$cryptoEnabled) {
                throw new Exception('No se pudo establecer canal TLS con el servidor SMTP.');
            }
            smtpCommand($socket, 'EHLO renovatec.local', [250]);
        }

        smtpCommand($socket, 'AUTH LOGIN', [334]);
        smtpCommand($socket, base64_encode(SMTP_USER), [334]);
        smtpCommand($socket, base64_encode(SMTP_PASSWORD), [235]);

        smtpCommand($socket, 'MAIL FROM:<' . MAIL_FROM_ADDRESS . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $toEmail . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);

        $boundaryMixed = 'renovatec_mixed_' . bin2hex(random_bytes(8));
        $boundaryAlt = 'renovatec_alt_' . bin2hex(random_bytes(8));

        $headers = [];
        $headers[] = 'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>';
        $headers[] = 'To: ' . $toName . ' <' . $toEmail . '>';
        $headers[] = 'Subject: ' . $subject;
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundaryMixed . '"';

        $body = [];
        $body[] = '--' . $boundaryMixed;
        $body[] = 'Content-Type: multipart/alternative; boundary="' . $boundaryAlt . '"';
        $body[] = '';

        $body[] = '--' . $boundaryAlt;
        $body[] = 'Content-Type: text/plain; charset=UTF-8';
        $body[] = 'Content-Transfer-Encoding: 8bit';
        $body[] = '';
        $body[] = $textContent;
        $body[] = '';

        $body[] = '--' . $boundaryAlt;
        $body[] = 'Content-Type: text/html; charset=UTF-8';
        $body[] = 'Content-Transfer-Encoding: 8bit';
        $body[] = '';
        $body[] = $htmlContent;
        $body[] = '';

        $body[] = '--' . $boundaryAlt . '--';
        $body[] = '';

        foreach ($attachments as $attachment) {
            $body[] = '--' . $boundaryMixed;
            $body[] = 'Content-Type: ' . $attachment['mime'] . '; name="' . $attachment['name'] . '"';
            $body[] = 'Content-Transfer-Encoding: base64';
            $body[] = 'Content-Disposition: attachment; filename="' . $attachment['name'] . '"';
            $body[] = '';
            $body[] = chunk_split($attachment['content'], 76, "\r\n");
            $body[] = '';
        }

        $body[] = '--' . $boundaryMixed . '--';
        $body[] = '';

        $message = implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $body) . "\r\n.\r\n";
        fwrite($socket, $message);

        $dataResponse = smtpRead($socket);
        $dataCode = (int) substr(trim($dataResponse), 0, 3);
        if ($dataCode !== 250) {
            throw new Exception('SMTP no aceptó el mensaje: ' . trim($dataResponse));
        }

        smtpCommand($socket, 'QUIT', [221]);
        fclose($socket);
        return true;
    } catch (Exception $e) {
        fclose($socket);
        throw $e;
    }
}

function cleanBase64Payload($value) {
    $raw = trim((string) $value);
    if ($raw === '') {
        return '';
    }

    $commaPos = strpos($raw, ',');
    if ($commaPos !== false) {
        $raw = substr($raw, $commaPos + 1);
    }

    return preg_replace('/\s+/', '', $raw);
}

function buildEventDateLabel() {
    $timestamp = strtotime(EVENT_DATE);
    if (!$timestamp) {
        return EVENT_DATE;
    }

    $months = [
        1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril',
        5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto',
        9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre'
    ];

    $day = (int) date('d', $timestamp);
    $month = $months[(int) date('n', $timestamp)] ?? date('m', $timestamp);
    $year = date('Y', $timestamp);
    $time = date('g:i A', $timestamp);

    return $day . ' de ' . $month . ' de ' . $year . ' | ' . $time;
}

function buildPublicBaseUrl() {
    $configured = rtrim((string) SITE_URL, '/');

    $looksLocal = preg_match('/localhost|127\.0\.0\.1/i', $configured) === 1;
    if (!$looksLocal) {
        return $configured;
    }

    if (empty($_SERVER['HTTP_HOST'])) {
        return $configured;
    }

    $isHttps = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
    $scheme = $isHttps ? 'https' : 'http';
    $scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
    $basePath = preg_replace('#/app/api/[^/]+$#', '', $scriptName);
    $basePath = rtrim((string) $basePath, '/');

    return $scheme . '://' . $_SERVER['HTTP_HOST'] . $basePath;
}

try {
    if (!isBrevoConfigured() && !isSmtpConfigured()) {
        $payload = [
            'success' => false,
            'error' => 'Servicio de correo no configurado. Usa MAIL_PROVIDER=brevo (con BREVO_API_KEY) o configura SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD.'
        ];

        if (APP_DEBUG) {
            $payload['debug'] = [
                'env_source' => defined('ENV_SOURCE') ? ENV_SOURCE : 'unknown',
                'mail_provider' => MAIL_PROVIDER,
                'brevo_key_set' => BREVO_API_KEY !== '',
                'smtp_host_set' => SMTP_HOST !== '',
                'smtp_port' => SMTP_PORT,
                'smtp_user_set' => SMTP_USER !== '',
                'smtp_password_set' => SMTP_PASSWORD !== '',
            ];
        }

        http_response_code(503);
        echo json_encode($payload);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        throw new Exception('Payload invalido');
    }

    $folio = sanitizeInput($input['folio'] ?? '');
    if ($folio === '') {
        throw new Exception('Folio requerido');
    }

    $pdfBase64 = cleanBase64Payload($input['pdfBase64'] ?? '');
    $qrBase64 = cleanBase64Payload($input['qrBase64'] ?? '');

    if ($pdfBase64 === '' || $qrBase64 === '') {
        throw new Exception('Adjuntos requeridos: PDF y QR');
    }

    $stmtTeam = $pdo->prepare('SELECT id, folio, captain_name, captain_email, school_name, registration_stage, registration_price FROM teams WHERE folio = ? LIMIT 1');
    $stmtTeam->execute([$folio]);
    $team = $stmtTeam->fetch();

    if (!$team) {
        throw new Exception('No se encontro el registro para el folio enviado');
    }

    $stmtRobots = $pdo->prepare('SELECT robot_name, category FROM robots WHERE team_id = ? ORDER BY robot_number ASC');
    $stmtRobots->execute([$team['id']]);
    $robots = $stmtRobots->fetchAll();

    $stmtMembers = $pdo->prepare('SELECT member_name, is_captain FROM team_members WHERE team_id = ? ORDER BY member_number ASC');
    $stmtMembers->execute([$team['id']]);
    $members = $stmtMembers->fetchAll();

    $totalCost = count($robots) * (float) $team['registration_price'];
    $eventDateLabel = buildEventDateLabel();

    $robotsHtml = '<li>Sin robots registrados.</li>';
    if (!empty($robots)) {
        $items = [];
        foreach ($robots as $robot) {
            $items[] = '<li><strong>' . htmlspecialchars($robot['robot_name']) . '</strong> - ' . htmlspecialchars($robot['category']) . '</li>';
        }
        $robotsHtml = implode('', $items);
    }

    $membersHtml = '<li>Sin integrantes registrados.</li>';
    if (!empty($members)) {
        $items = [];
        foreach ($members as $member) {
            $role = ((int) $member['is_captain'] === 1) ? 'Capitan' : 'Integrante';
            $items[] = '<li>' . $role . ': ' . htmlspecialchars($member['member_name']) . '</li>';
        }
        $membersHtml = implode('', $items);
    }

        $robotsText = 'Sin robots registrados.';
        if (!empty($robots)) {
                $items = [];
                foreach ($robots as $robot) {
                        $items[] = '- ' . $robot['robot_name'] . ' (' . $robot['category'] . ')';
                }
                $robotsText = implode("\n", $items);
        }

        $membersText = 'Sin integrantes registrados.';
        if (!empty($members)) {
                $items = [];
                foreach ($members as $member) {
                        $role = ((int) $member['is_captain'] === 1) ? 'Capitan' : 'Integrante';
                        $items[] = '- ' . $role . ': ' . $member['member_name'];
                }
                $membersText = implode("\n", $items);
        }

        $subject = 'RENOVATEC 2026 - Registro exitoso (' . $team['folio'] . ')';

        $siteBase = buildPublicBaseUrl();
        $tecLogoUrl = $siteBase . '/public/assets/images/tec.png';
        $careerLogoUrl = $siteBase . '/public/assets/images/electro.png';
        $eventLogoUrl = $siteBase . '/public/assets/images/robot-clean-v2.png';
        $mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Instituto+Tecnologico+Superior+de+Uruapan';

        $htmlContent = '
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;padding:0;background-color:#eef3f9;">
                <tr>
                    <td align="center" style="padding:24px 12px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="width:640px;max-width:640px;background-color:#ffffff;border:1px solid #d7e1eb;">
                            <tr>
                                <td style="background-color:#0b2b52;padding:16px 18px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                        <tr>
                                            <td valign="middle" style="font-size:0;line-height:0;">
                                                <img src="' . htmlspecialchars($tecLogoUrl) . '" alt="TEC" width="92" style="display:inline-block;height:38px;width:92px;max-width:92px;border:0;background-color:#ffffff;padding:3px;" />
                                                <img src="' . htmlspecialchars($careerLogoUrl) . '" alt="Carrera" width="92" style="display:inline-block;height:38px;width:92px;max-width:92px;border:0;background-color:#ffffff;padding:3px;margin-left:8px;" />
                                                <img src="' . htmlspecialchars($eventLogoUrl) . '" alt="RENOVATEC" width="38" style="display:inline-block;height:38px;width:38px;max-width:38px;border:0;background-color:#ffffff;padding:3px;margin-left:8px;" />
                                            </td>
                                            <td align="right" valign="middle" style="color:#e8f0ff;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;">
                                                Comite Organizador<br/>RENOVATEC 2026
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding:24px 24px 18px 24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
                                    <h1 style="margin:0 0 10px 0;font-size:26px;line-height:30px;color:#0b2b52;">Bienvenido a RENOVATEC 2026</h1>
                                    <p style="margin:0 0 14px 0;font-size:15px;line-height:24px;">Hola <strong>' . htmlspecialchars($team['captain_name']) . '</strong>, tu registro fue exitoso y tu comprobante de pago ya fue recibido.</p>

                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#edf4ff;border:1px solid #c8d9f5;">
                                        <tr>
                                            <td style="padding:12px 14px;font-size:14px;line-height:22px;color:#143766;font-family:Arial,Helvetica,sans-serif;">
                                                <strong>Estatus actual:</strong> Tu equipo esta preinscrito y el pago se encuentra en proceso de validacion. Te confirmaremos por este medio cuando la inscripcion quede aprobada.
                                            </td>
                                        </tr>
                                    </table>

                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 14px 0;">
                                        <tr>
                                            <td width="34%" style="padding:10px;border:1px solid #e5e7eb;background-color:#f8fafc;font-size:14px;"><strong>Folio</strong></td>
                                            <td style="padding:10px;border:1px solid #e5e7eb;font-size:14px;">' . htmlspecialchars($team['folio']) . '</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:10px;border:1px solid #e5e7eb;background-color:#f8fafc;font-size:14px;"><strong>Escuela</strong></td>
                                            <td style="padding:10px;border:1px solid #e5e7eb;font-size:14px;">' . htmlspecialchars($team['school_name']) . '</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:10px;border:1px solid #e5e7eb;background-color:#f8fafc;font-size:14px;"><strong>Etapa</strong></td>
                                            <td style="padding:10px;border:1px solid #e5e7eb;font-size:14px;">' . htmlspecialchars($team['registration_stage']) . '</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:10px;border:1px solid #e5e7eb;background-color:#f8fafc;font-size:14px;"><strong>Total registrado</strong></td>
                                            <td style="padding:10px;border:1px solid #e5e7eb;font-size:14px;">$' . number_format($totalCost, 2) . ' MXN</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:10px;border:1px solid #e5e7eb;background-color:#f8fafc;font-size:14px;"><strong>Fecha y sede</strong></td>
                                            <td style="padding:10px;border:1px solid #e5e7eb;font-size:14px;">' . htmlspecialchars($eventDateLabel) . ' | Instituto Tecnologico Superior de Uruapan<br/><a href="' . htmlspecialchars($mapsUrl) . '" style="color:#0b57d0;text-decoration:underline;">Ver ubicacion en Google Maps</a></td>
                                        </tr>
                                    </table>

                                    <h2 style="margin:16px 0 8px 0;font-size:18px;line-height:22px;color:#0b2b52;">Robots registrados</h2>
                                    <ul style="margin:0 0 14px 18px;padding:0;font-size:14px;line-height:22px;">' . $robotsHtml . '</ul>

                                    <h2 style="margin:16px 0 8px 0;font-size:18px;line-height:22px;color:#0b2b52;">Integrantes del equipo</h2>
                                    <ul style="margin:0 0 14px 18px;padding:0;font-size:14px;line-height:22px;">' . $membersHtml . '</ul>

                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 14px 0;background-color:#fff8eb;border:1px solid #f4d39a;">
                                        <tr>
                                            <td style="padding:12px 14px;font-size:14px;line-height:22px;color:#7a4a00;">
                                                <strong>Siguiente paso:</strong> En cuanto concluyamos la revision, te enviaremos la confirmacion oficial de pago validado e inscripcion final.
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="margin:0 0 6px 0;font-size:14px;line-height:22px;"><strong>Adjuntos en este correo:</strong></p>
                                    <ul style="margin:0 0 0 18px;padding:0;font-size:14px;line-height:22px;">
                                        <li>Pase oficial del equipo en PDF</li>
                                        <li>Codigo QR del equipo en PNG</li>
                                    </ul>
                                </td>
                            </tr>

                            <tr>
                                <td style="background-color:#f8fafc;border-top:1px solid #e5e7eb;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;color:#667085;font-size:12px;line-height:18px;">
                                    Correo automatico de RENOVATEC 2026. Si necesitas apoyo, responde este mensaje para contactar al comite organizador.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>';

        $textContent =
                "RENOVATEC 2026 - REGISTRO EXITOSO\n" .
                "=================================\n\n" .
                "Hola " . $team['captain_name'] . ",\n" .
                "Tu registro fue exitoso y tu comprobante de pago fue recibido.\n" .
                "Tu equipo esta preinscrito y el pago esta en proceso de validacion.\n\n" .
                "Folio: " . $team['folio'] . "\n" .
                "Escuela: " . $team['school_name'] . "\n" .
                "Etapa: " . $team['registration_stage'] . "\n" .
                "Total registrado: $" . number_format($totalCost, 2) . " MXN\n" .
                "Fecha y sede: " . $eventDateLabel . " - Instituto Tecnologico Superior de Uruapan\n" .
                "Google Maps: " . $mapsUrl . "\n\n" .
                "Robots registrados:\n" . $robotsText . "\n\n" .
                "Integrantes del equipo:\n" . $membersText . "\n\n" .
                "Adjuntos: Pase oficial (PDF) y codigo QR (PNG).\n\n" .
                "Gracias por participar en RENOVATEC 2026.";

    $safeFolio = preg_replace('/[^A-Z0-9\-_.]/i', '_', $team['folio']);

    if (MAIL_PROVIDER === 'brevo' && isBrevoConfigured()) {
        $brevoPayload = [
            'sender' => [
                'name' => MAIL_FROM_NAME,
                'email' => MAIL_FROM_ADDRESS,
            ],
            'to' => [[
                'name' => $team['captain_name'],
                'email' => $team['captain_email'],
            ]],
            'subject' => $subject,
            'textContent' => $textContent,
            'htmlContent' => $htmlContent,
            'attachment' => [
                [
                    'name' => 'PASE_' . $safeFolio . '.pdf',
                    'content' => $pdfBase64,
                ],
                [
                    'name' => 'QR_' . $safeFolio . '.png',
                    'content' => $qrBase64,
                ],
            ],
        ];

        $ch = curl_init('https://api.brevo.com/v3/smtp/email');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'accept: application/json',
                'content-type: application/json',
                'api-key: ' . BREVO_API_KEY,
            ],
            CURLOPT_POSTFIELDS => json_encode($brevoPayload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 20,
        ]);

        $response = curl_exec($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new Exception('Error de conexion con Brevo: ' . $curlError);
        }

        if ($statusCode < 200 || $statusCode >= 300) {
            error_log('[RENOVATEC][MAIL] Brevo status=' . $statusCode . ' response=' . $response);
            throw new Exception('No se pudo enviar el correo. Codigo Brevo: ' . $statusCode);
        }
    } elseif (isSmtpConfigured()) {
        sendSmtpEmail(
            $team['captain_email'],
            $team['captain_name'],
            $subject,
            $htmlContent,
            $textContent,
            [
                [
                    'name' => 'PASE_' . $safeFolio . '.pdf',
                    'mime' => 'application/pdf',
                    'content' => $pdfBase64,
                ],
                [
                    'name' => 'QR_' . $safeFolio . '.png',
                    'mime' => 'image/png',
                    'content' => $qrBase64,
                ],
            ]
        );
    } else {
        throw new Exception('Proveedor de correo no soportado o no configurado correctamente.');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Correo enviado correctamente al capitan',
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
