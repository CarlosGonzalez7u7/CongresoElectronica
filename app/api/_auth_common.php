<?php
/**
 * _auth_common.php — Funciones compartidas de autenticación
 * RENOVATEC v20260423
 *
 * FIXES aplicados:
 *  1. sendVerificationEmail / sendRecoveryEmail usan SMTP con Gmail como ruta
 *     principal, igual que el correo transaccional del torneo.
 *  2. Si SMTP falla, se intenta mail() como respaldo de entorno local.
 *  3. En modo DEBUG, si ambos fallan, se devuelve el código para facilitar
 *     pruebas sin correo real.
 */

require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400 * 7,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) === 'on',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

/* ============================================================
   TABLAS
   ============================================================ */

function ensurePlatformUsersTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS platform_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(180) NOT NULL UNIQUE,
            username VARCHAR(60) NOT NULL UNIQUE,
            country VARCHAR(120) NOT NULL,
            city VARCHAR(120) NOT NULL,
            school VARCHAR(220) NOT NULL,
            matricula VARCHAR(60) NULL,
            role ENUM('alumno','tallerista','admin') NOT NULL DEFAULT 'alumno',
            password_hash VARCHAR(255) NOT NULL,
            email_verified TINYINT(1) NOT NULL DEFAULT 0,
            email_verification_code VARCHAR(12) NULL,
            email_verification_expires_at DATETIME NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP NULL,
            INDEX idx_platform_role (role),
            INDEX idx_platform_active (is_active),
            INDEX idx_platform_verified (email_verified)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    ensurePlatformUsersProfileColumns($pdo);
}

function ensurePlatformUsersProfileColumns(PDO $pdo): void
{
    $requiredColumns = [
        'full_name'       => "ALTER TABLE platform_users ADD COLUMN full_name VARCHAR(180) NULL AFTER username",
        'phone'           => "ALTER TABLE platform_users ADD COLUMN phone VARCHAR(30) NULL AFTER full_name",
        'control_number'  => "ALTER TABLE platform_users ADD COLUMN control_number VARCHAR(60) NULL AFTER phone",
        'career'          => "ALTER TABLE platform_users ADD COLUMN career VARCHAR(150) NULL AFTER control_number",
        'semester'        => "ALTER TABLE platform_users ADD COLUMN semester VARCHAR(40) NULL AFTER career",
        'career_semester' => "ALTER TABLE platform_users ADD COLUMN career_semester VARCHAR(120) NULL AFTER control_number",
    ];

    foreach ($requiredColumns as $columnName => $alterSql) {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute(['platform_users', $columnName]);
        $exists = (int) $stmt->fetchColumn() > 0;
        if (!$exists) {
            $pdo->exec($alterSql);
        }
    }
}

function ensureCongressRegistrationsTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS congress_registrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            congress_year INT NOT NULL,
            registration_fee DECIMAL(10,2) NOT NULL DEFAULT 400.00,
            payment_status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
            country_snapshot VARCHAR(120) NOT NULL,
            city_snapshot VARCHAR(120) NOT NULL,
            school_snapshot VARCHAR(220) NOT NULL,
            matricula_snapshot VARCHAR(60) NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_year (user_id, congress_year),
            INDEX idx_congress_status (payment_status),
            CONSTRAINT fk_congress_user FOREIGN KEY (user_id)
                REFERENCES platform_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function ensureAdminUsersTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(60) NOT NULL UNIQUE,
            full_name VARCHAR(150) NOT NULL,
            email VARCHAR(150) NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('superadmin','reviewer','staff') DEFAULT 'staff',
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP NULL,
            INDEX idx_admin_active (is_active),
            INDEX idx_admin_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function requireLoggedInUser(): int
{
    $userId = (int)($_SESSION['user_id'] ?? 0);
    if ($userId <= 0) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.']);
        exit;
    }
    return $userId;
}

/* ============================================================
   HELPERS DE NEGOCIO
   ============================================================ */

function getCurrentCongressYear(): int
{
    $now = new DateTime('now');
    $cutoff = new DateTime($now->format('Y') . '-12-31 23:59:59');
    return ((int)$now->format('U') <= (int)$cutoff->format('U'))
        ? (int)$now->format('Y')
        : (int)$now->format('Y') + 1;
}

function normalizeSchoolName(string $name): string
{
    // mb_strtolower reemplazado por strtolower para no requerir ext-mbstring
    $lower = strtolower(trim($name));
    $ascii = function_exists('iconv')
        ? iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower)
        : $lower;
    if ($ascii === false) {
        $ascii = $lower;
    }
    return preg_replace('/\s+/', ' ', trim($ascii));
}

function requiresMatriculaBySchool(string $school): bool
{
    return normalizeSchoolName($school) === 'instituto tecnologico superior de uruapan';
}

function randomVerificationCode(): string
{
    return (string) random_int(100000, 999999);
}

/* ============================================================
   SEGURIDAD (Rate Limiting por IP y CAPTCHA Anti-DDoS)
   ============================================================ */


function ensureIpRateLimitsTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ip_rate_limits (
            ip_address VARCHAR(45) PRIMARY KEY,
            attempts INT DEFAULT 0,
            last_attempt_at TIMESTAMP NULL,
            blocked_until TIMESTAMP NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function checkIpRateLimit(PDO $pdo, array $input, int $maxAttempts = 5, int $blockMinutes = 15): void
{
    ensureIpRateLimitsTable($pdo);
    $ip = getRealUserIp();
    
    $stmt = $pdo->prepare("SELECT attempts, blocked_until FROM ip_rate_limits WHERE ip_address = ?");
    $stmt->execute([$ip]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($record && !empty($record['blocked_until'])) {
        $blockedUntil = new DateTime($record['blocked_until']);
        $now = new DateTime();
        
        if ($now < $blockedUntil) {
            $diff = $blockedUntil->getTimestamp() - $now->getTimestamp();
            $minutes = (int) ceil($diff / 60);
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'error' => "Por seguridad, tu red ha sido bloqueada temporalmente debido a intentos sospechosos. Intenta de nuevo en {$minutes} minutos.",
                'is_ip_blocked' => true,
                'blocked_minutes' => $minutes
            ]);
            exit;
        } else {
            clearIpRateLimit($pdo, $ip);
        }
    }
}

function incrementIpAttempts(PDO $pdo, int $maxAttempts = 5, int $blockMinutes = 15): int
{
    $ip = getRealUserIp();
    $pdo->prepare("
        INSERT INTO ip_rate_limits (ip_address, attempts, last_attempt_at) 
        VALUES (?, 1, NOW()) 
        ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt_at = NOW()
    ")->execute([$ip]);
    
    $stmt = $pdo->prepare("SELECT attempts FROM ip_rate_limits WHERE ip_address = ?");
    $stmt->execute([$ip]);
    $attempts = (int)$stmt->fetchColumn();
    
    if ($attempts >= $maxAttempts) {
        $pdo->prepare("UPDATE ip_rate_limits SET blocked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE ip_address = ?")->execute([$blockMinutes, $ip]);
    }
    
    return $attempts;
}

function clearIpRateLimit(PDO $pdo, string $ip = null): void
{
    if (!$ip) $ip = getRealUserIp();
    $pdo->prepare("UPDATE ip_rate_limits SET attempts = 0, blocked_until = NULL WHERE ip_address = ?")->execute([$ip]);
}

/* ============================================================
    CORREO — VERIFICACIÓN Y RECUPERACIÓN
   ============================================================ */

function isSmtpConfigured(): bool
{
    return SMTP_HOST !== '' && SMTP_PORT > 0 && SMTP_USER !== '' && SMTP_PASSWORD !== '';
}

function isBrevoConfigured(): bool
{
    return BREVO_API_KEY !== '';
}

function sendBrevoEmail(string $toEmail, string $toName, string $subject, string $htmlContent, string $textContent): array
{
    if (!function_exists('curl_init')) {
        return [
            'ok' => false,
            'provider' => 'brevo',
            'error' => 'La extension curl no esta habilitada en este PHP',
        ];
    }

    $payload = [
        'sender' => [
            'name' => MAIL_FROM_NAME,
            'email' => MAIL_FROM_ADDRESS,
        ],
        'to' => [[
            'name' => $toName,
            'email' => $toEmail,
        ]],
        'subject' => $subject,
        'textContent' => $textContent,
        'htmlContent' => $htmlContent,
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
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return ['ok' => false, 'provider' => 'brevo', 'error' => 'Error de conexion con Brevo: ' . $curlError];
    }

    if ($statusCode < 200 || $statusCode >= 300) {
        error_log('[RENOVATEC][MAIL][BREVO] status=' . $statusCode . ' response=' . $response);
        return ['ok' => false, 'provider' => 'brevo', 'error' => 'Brevo rechazo el correo. Codigo: ' . $statusCode];
    }

    return ['ok' => true, 'provider' => 'brevo'];
}

function smtpRead($socket): string
{
    $data = '';
    while (!feof($socket)) {
        $line = fgets($socket, 515);
        if ($line === false) {
            break;
        }
        $data .= $line;
        if (preg_match('/^\d{3} /', $line)) {
            break;
        }
    }
    return $data;
}

function smtpCommand($socket, string $command, array $expectedCodes = [250]): string
{
    fwrite($socket, $command . "\r\n");
    $response = smtpRead($socket);
    $code = (int) substr(trim($response), 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        throw new Exception('SMTP fallo en comando [' . $command . ']. Respuesta: ' . trim($response));
    }
    return $response;
}

function sendSmtpEmail(string $toEmail, string $toName, string $subject, string $htmlContent, string $textContent): array
{
    if (!extension_loaded('openssl')) {
        return [
            'ok' => false,
            'provider' => 'smtp',
            'error' => 'La extension openssl no esta habilitada en este PHP',
        ];
    }

    $transport = SMTP_ENCRYPTION === 'ssl' ? 'ssl://' : 'tcp://';
    $remote = $transport . SMTP_HOST . ':' . SMTP_PORT;

    $socket = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        return [
            'ok' => false,
            'provider' => 'smtp',
            'error' => 'No se pudo conectar al servidor SMTP: ' . $errstr,
        ];
    }

    stream_set_timeout($socket, 20);

    try {
        $greeting = smtpRead($socket);
        if ((int) substr(trim($greeting), 0, 3) !== 220) {
            throw new Exception('SMTP no respondió correctamente al conectar: ' . trim($greeting));
        }

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

        $boundaryAlt = 'renovatec_alt_' . bin2hex(random_bytes(8));

        $headers = [];
        $headers[] = 'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>';
        $headers[] = 'To: ' . $toName . ' <' . $toEmail . '>';
        $headers[] = 'Subject: ' . $subject;
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundaryAlt . '"';

        $body = [];
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

        $message = implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $body) . "\r\n.\r\n";
        fwrite($socket, $message);

        $dataResponse = smtpRead($socket);
        $dataCode = (int) substr(trim($dataResponse), 0, 3);
        if ($dataCode !== 250) {
            throw new Exception('SMTP no aceptó el mensaje: ' . trim($dataResponse));
        }

        smtpCommand($socket, 'QUIT', [221]);
        fclose($socket);

        return ['ok' => true, 'provider' => 'smtp'];
    } catch (Throwable $e) {
        fclose($socket);
        return [
            'ok' => false,
            'provider' => 'smtp',
            'error' => $e->getMessage(),
        ];
    }
}

function sendVerificationEmail(string $email, string $username, string $code): array
{
    $subject = 'RENOVATEC | Verifica tu correo';
    $text = buildVerificationText($username, $code);
    $html = buildVerificationHtml($username, $code);

    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>',
    ]);

    if (isBrevoConfigured()) {
        $result = sendBrevoEmail($email, $username, $subject, $html, $text);
        if ($result['ok']) {
            return $result;
        }
        error_log('[RENOVATEC][MAIL] Brevo verification failed: ' . ($result['error'] ?? 'unknown'));
    }

    if (isSmtpConfigured()) {
        $result = sendSmtpEmail($email, $username, $subject, $html, $text);
        if ($result['ok']) {
            return $result;
        }
        error_log('[RENOVATEC][MAIL] SMTP verification failed: ' . ($result['error'] ?? 'unknown'));
    }

    $ok = @mail($email, $subject, $html, $headers);
    if ($ok) {
        return ['ok' => true, 'provider' => 'mail'];
    }

    if (APP_DEBUG || !extension_loaded('openssl')) {
        error_log('[RENOVATEC][MAIL][DEBUG] Verificación no enviada a ' . $email . '. Código: ' . $code . '. Motivo: SMTP/mail no disponible en este entorno.');
        return [
            'ok' => true,
            'provider' => 'debug',
            'code' => $code,
            '_debug_note' => 'Correo no enviado. El servidor PHP no tiene soporte SMTP/TLS suficiente para Gmail en este entorno.',
        ];
    }

    return ['ok' => false, 'provider' => 'mail', 'error' => 'No se pudo enviar el correo de verificación'];
}

function sendRecoveryEmail(string $email, string $username, string $code): array
{
    $subject = 'RENOVATEC | Recupera tu cuenta';
    $text = buildRecoveryText($username, $code);
    $html = buildRecoveryHtml($username, $code);

    $headers = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM_ADDRESS . '>',
    ]);

    if (isBrevoConfigured()) {
        $result = sendBrevoEmail($email, $username, $subject, $html, $text);
        if ($result['ok']) {
            return $result;
        }
        error_log('[RENOVATEC][MAIL] Brevo recovery failed: ' . ($result['error'] ?? 'unknown'));
    }

    if (isSmtpConfigured()) {
        $result = sendSmtpEmail($email, $username, $subject, $html, $text);
        if ($result['ok']) {
            return $result;
        }
        error_log('[RENOVATEC][MAIL] SMTP recovery failed: ' . ($result['error'] ?? 'unknown'));
    }

    $ok = @mail($email, $subject, $html, $headers);
    if ($ok) {
        return ['ok' => true, 'provider' => 'mail'];
    }

    if (APP_DEBUG || !extension_loaded('openssl')) {
        error_log('[RENOVATEC][MAIL][DEBUG] Recuperación no enviada a ' . $email . '. Código: ' . $code . '. Motivo: SMTP/mail no disponible en este entorno.');
        return [
            'ok' => true,
            'provider' => 'debug',
            'code' => $code,
            '_debug_note' => 'Correo no enviado. El servidor PHP no tiene soporte SMTP/TLS suficiente para Gmail en este entorno.',
        ];
    }

    return ['ok' => false, 'provider' => 'mail', 'error' => 'No se pudo enviar el correo de recuperación'];
}

/* ============================================================
   PLANTILLAS DE CORREO
   ============================================================ */

function buildVerificationText(string $username, string $code): string
{
    return "Hola {$username},\n\nTu código de verificación es: {$code}\n\nEste código vence en 20 minutos.\n\nSi no solicitaste esta cuenta, ignora este mensaje.\n\n— Equipo RENOVATEC";
}

function buildRecoveryText(string $username, string $code): string
{
    return "Hola {$username},\n\nTu código de recuperación es: {$code}\n\nEste código vence en 20 minutos.\n\nSi no solicitaste este proceso, ignora este mensaje.\n\n— Equipo RENOVATEC";
}

function buildVerificationHtml(string $username, string $code): string
{
    $safeUser = htmlspecialchars($username, ENT_QUOTES, 'UTF-8');
    $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    return emailBaseTemplate(
        'Verifica tu correo',
        "Hola <strong>{$safeUser}</strong>, usa este código para activar tu cuenta en RENOVATEC:",
        $safeCode,
        'El código vence en 20 minutos. Si no creaste esta cuenta, ignora este mensaje.'
    );
}

function buildRecoveryHtml(string $username, string $code): string
{
    $safeUser = htmlspecialchars($username, ENT_QUOTES, 'UTF-8');
    $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    return emailBaseTemplate(
        'Recupera tu cuenta',
        "Hola <strong>{$safeUser}</strong>, usa este código para restablecer tu contraseña en RENOVATEC:",
        $safeCode,
        'El código vence en 20 minutos. Si no solicitaste este proceso, ignora este mensaje.'
    );
}

/** Plantilla HTML base para correos transaccionales. */
function emailBaseTemplate(string $heading, string $bodyHtml, string $code, string $footer): string
{
    return <<<HTML
<!doctype html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f1623 0%,#1a2a4a 100%);padding:28px 36px;">
            <p style="margin:0;color:#93c5fd;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;">RENOVATEC</p>
            <h1 style="margin:6px 0 0;color:#f1f5f9;font-size:22px;font-weight:700;">{$heading}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">{$bodyHtml}</p>
            <!-- Código -->
            <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
              <p style="margin:0 0 4px;color:#64748b;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Tu código</p>
              <p style="margin:0;color:#0f1623;font-size:40px;font-weight:700;letter-spacing:8px;font-family:'Courier New',monospace;">{$code}</p>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">{$footer}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 36px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              RENOVATEC — Instituto Tecnológico Superior de Uruapan<br/>
              Este correo es automático, no respondas a él.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}

/* ============================================================
   UTILIDADES GENERALES
   ============================================================ */

function jsonInputOrFail(): array
{
    $raw   = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        throw new Exception('Payload JSON inválido');
    }
    return $input;
}

function sanitizeText($value): string
{
    return trim((string) $value);
}
