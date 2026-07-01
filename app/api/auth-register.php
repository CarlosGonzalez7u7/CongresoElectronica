<?php
/**
 * API: Registro de cuenta de usuario
 * POST /api/auth-register.php
 * RENOVATEC v20260423
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);
    cleanupExpiredUnverifiedUsers($pdo, 30);

    $input = jsonInputOrFail();
    $action = strtolower(sanitizeText($input['action'] ?? ''));

    if ($action === 'resend_verification') {
        handleResendVerification($pdo, $input);
        exit;
    }

    // Prevenir DDoS y spam de registros por IP
    checkIpRateLimit($pdo, $input, 15, 60); // 15 peticiones por hora máx
    incrementIpAttempts($pdo, 15, 60);

    $fullName         = sanitizeText($input['fullName']         ?? '');
    $originSchool     = sanitizeText($input['originSchool']     ?? '');
    $controlNumberRaw = sanitizeText($input['controlNumber']    ?? '');
    $career           = sanitizeText($input['career']           ?? '');
    $semester         = sanitizeText($input['semester']         ?? '');
    $email            = strtolower(sanitizeText($input['email'] ?? ''));
    $phone            = sanitizeText($input['phone']            ?? '');
    $phoneNormalized  = normalizeRegisterPhone($phone);
    $country          = sanitizeText($input['country']          ?? '');
    $city             = sanitizeText($input['city']             ?? '');
    $password         = (string)($input['password']             ?? '');
    $confirmPassword  = (string)($input['confirmPassword']      ?? '');
    $controlNumber    = strtolower($controlNumberRaw);
    $username         = $controlNumber;

    // --- Validaciones básicas ---
    if ($fullName === '' || $originSchool === '' || $controlNumberRaw === '' ||
        $career === '' || $semester === '' || $email === '' || $phone === '' ||
        $country === '' || $city === '' || $password === '' || $confirmPassword === '') {
        throw new Exception('Completa todos los campos obligatorios');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Correo electrónico inválido');
    }

    if (!preg_match('/^[a-z0-9_.\-]{4,60}$/', $controlNumber)) {
        throw new Exception('Número de control inválido (solo letras, números, puntos, guiones; 4-60 caracteres)');
    }

    if (strlen($fullName) < 5) {
        throw new Exception('Nombre completo muy corto');
    }

    if (!preg_match('/^[0-9+()\-\s]{7,20}$/', $phone)) {
        throw new Exception('Número de contacto inválido');
    }

    if ($password !== $confirmPassword) {
        throw new Exception('La contraseña y la confirmación no coinciden');
    }

    if (strlen($password) < 6) {
        throw new Exception('La contraseña debe tener al menos 6 caracteres');
    }

    // --- Verificar duplicados ---
    $stmtByUser = $pdo->prepare(
        'SELECT id, email, email_verified, email_verification_expires_at FROM platform_users WHERE LOWER(username) = ? LIMIT 1'
    );
    $stmtByUser->execute([$username]);
    $foundUser = $stmtByUser->fetch();

    if ($foundUser && (int)$foundUser['email_verified'] === 1) {
        throw new Exception('El usuario ya está registrado');
    }

    $stmtByEmail = $pdo->prepare(
        'SELECT id, email_verified, email_verification_expires_at FROM platform_users WHERE LOWER(email) = ? LIMIT 1'
    );
    $stmtByEmail->execute([$email]);
    $foundEmail = $stmtByEmail->fetch();

    if (
        $foundUser &&
        (!$foundEmail || (int)$foundUser['id'] !== (int)$foundEmail['id']) &&
        (int)($foundUser['email_verified'] ?? 1) === 0
    ) {
        throw new Exception(pendingVerificationMessage((string)($foundUser['email_verification_expires_at'] ?? '')));
    }

    if ($foundEmail && (int)$foundEmail['email_verified'] === 1) {
        throw new Exception('El correo ya está registrado y verificado');
    }

    if ($foundUser && (!$foundEmail || (int)$foundUser['id'] !== (int)$foundEmail['id'])) {
        throw new Exception('El nÃºmero de control ya estÃ¡ en uso o tiene una verificaciÃ³n pendiente');
    }

    $stmtByPhone = $pdo->prepare("
        SELECT id, email, email_verified, email_verification_expires_at
        FROM platform_users
        WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
        LIMIT 1
    ");
    $stmtByPhone->execute([ltrim($phoneNormalized, '+')]);
    $foundPhone = $stmtByPhone->fetch(PDO::FETCH_ASSOC);
    if (
        $foundPhone &&
        (int)($foundPhone['email_verified'] ?? 1) === 0 &&
        strtolower((string)$foundPhone['email']) !== $email
    ) {
        throw new Exception(pendingVerificationMessage((string)($foundPhone['email_verification_expires_at'] ?? '')));
    }
    if (
        $foundPhone &&
        (
            (int)$foundPhone['email_verified'] === 1 ||
            strtolower((string)$foundPhone['email']) !== $email
        )
    ) {
        throw new Exception('Este numero telefonico ya esta registrado.');
    }

    // --- NUEVO: Verificar colisiones en tablas administrativas ---
    $stmtAdminCheck = $pdo->prepare('SELECT id FROM admin_users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1');
    $stmtAdminCheck->execute([$email, $username]);
    if ($stmtAdminCheck->fetch()) {
        throw new Exception('El correo o usuario ya está en uso por una cuenta administrativa.');
    }

    $stmtInstCheck = $pdo->prepare('SELECT id FROM workshop_instructors WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1');
    $stmtInstCheck->execute([$email, $username]);
    if ($stmtInstCheck->fetch()) {
        throw new Exception('El correo o usuario ya pertenece a un profesor registrado.');
    }

    // --- Preparar datos ---
    $verificationCode = randomVerificationCode();
    $expiresAt        = (new DateTime('now'))->add(new DateInterval('PT20M'))->format('Y-m-d H:i:s');
    $passwordHash     = password_hash($password, PASSWORD_DEFAULT);
    $role             = 'alumno';

    $pdo->beginTransaction();

    if ($foundEmail) {
        // Re-registro: actualizar datos del usuario no verificado
        $stmtUpdate = $pdo->prepare(
            'UPDATE platform_users
             SET username = ?, full_name = ?, phone = ?, control_number = ?,
                 career = ?, semester = ?, career_semester = ?,
                 country = ?, city = ?, school = ?, matricula = ?,
                 role = ?, password_hash = ?,
                 email_verification_code = ?, email_verification_expires_at = ?,
                 is_active = 1, updated_at = NOW()
             WHERE id = ?'
        );
        $stmtUpdate->execute([
            $username, $fullName, $phone, $controlNumberRaw,
            $career, $semester, $career . ' - ' . $semester,
            $country, $city, $originSchool, $controlNumberRaw,
            $role, $passwordHash,
            $verificationCode, $expiresAt,
            (int)$foundEmail['id'],
        ]);
    } else {
        // Registro nuevo
        $stmtInsert = $pdo->prepare(
            'INSERT INTO platform_users
             (email, username, full_name, phone, control_number,
              career, semester, career_semester,
              country, city, school, matricula,
              role, password_hash,
              email_verified, email_verification_code, email_verification_expires_at, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)'
        );
        $stmtInsert->execute([
            $email, $username, $fullName, $phone, $controlNumberRaw,
            $career, $semester, $career . ' - ' . $semester,
            $country, $city, $originSchool, $controlNumberRaw,
            $role, $passwordHash,
            $verificationCode, $expiresAt,
        ]);
    }

    // --- Enviar correo ---
    $sent = sendVerificationEmail($email, $fullName, $verificationCode);

    // Si el envío falló y no estamos en modo debug, abortar
    if (!$sent['ok']) {
        $userError = $sent['user_error'] ?? 'No pudimos enviar el codigo de verificacion por correo. Espera unos minutos e intenta de nuevo o comunicate con el equipo organizador.';
        $detail = APP_DEBUG && !empty($sent['error']) ? ' Detalle: ' . $sent['error'] : '';
        throw new Exception($userError . $detail);
    }

    $pdo->commit();

    // --- Respuesta ---
    $responseData = [
        'email'    => $email,
        'username' => $username,
        'provider' => $sent['provider'] ?? 'mail',
        'pending_verification_reused' => (bool)$foundEmail,
        'resend_cooldown_seconds' => 60,
        'max_resend_attempts' => 3,
    ];

    // En modo debug con proveedor 'debug', incluir el código en la respuesta
    // para que el frontend pueda usarlo sin necesidad de correo.
    if (APP_DEBUG && ($sent['provider'] ?? '') === 'debug' && isset($sent['code'])) {
        $responseData['debug_code'] = $sent['code'];
        $responseData['_debug_note'] = $sent['_debug_note'] ?? 'Sin correo real. Código incluido para desarrollo.';
    }

    echo json_encode([
        'success' => true,
        'message' => $foundEmail
            ? 'Cuenta pendiente actualizada. Revisa tu correo o pide un reenvio cuando termine el contador.'
            : 'Cuenta creada. Revisa tu correo para verificarla.',
        'data'    => $responseData,
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(400);
    $publicError = $e->getMessage();
    $supportCode = null;
    if (str_contains($publicError, 'Detalle:')) {
        $supportCode = 'MAIL-' . date('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(3)));
        error_log('[RENOVATEC][MAIL][' . $supportCode . '] ' . $publicError);
        $publicError = trim(explode('Detalle:', $publicError, 2)[0]);
        $publicError .= ' Codigo de reporte: ' . $supportCode . '.';
    }
    $canShowPublicError =
        str_starts_with($publicError, 'No pudimos enviar') ||
        str_starts_with($publicError, 'No pudimos reenviar') ||
        str_contains($publicError, 'correo');
    $payload = [
        'success' => false,
        'error'   => (APP_DEBUG || $canShowPublicError) ? $publicError : 'No se pudo registrar la cuenta',
    ];
    if ($supportCode) {
        $payload['support_code'] = $supportCode;
    }
    echo json_encode($payload);
}

function handleResendVerification(PDO $pdo, array $input): void
{
    cleanupExpiredUnverifiedUsers($pdo, 30);
    checkIpRateLimit($pdo, $input, 10, 60);
    incrementIpAttempts($pdo, 10, 60);

    $email = strtolower(sanitizeText($input['email'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Correo electronico invalido');
    }

    $stmt = $pdo->prepare(
        'SELECT id, full_name, username, email_verified, is_active
         FROM platform_users
         WHERE LOWER(email) = ?
         LIMIT 1'
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('No encontramos una cuenta pendiente con ese correo');
    }

    if ((int)$user['email_verified'] === 1) {
        throw new Exception('Este correo ya esta verificado. Inicia sesion.');
    }

    if ((int)$user['is_active'] !== 1) {
        throw new Exception('La cuenta esta inactiva');
    }

    $resendKey = hash('sha256', $email);
    $now = time();
    if (!isset($_SESSION['verify_resend']) || !is_array($_SESSION['verify_resend'])) {
        $_SESSION['verify_resend'] = [];
    }

    $resendState = $_SESSION['verify_resend'][$resendKey] ?? [
        'window_start' => $now,
        'attempts' => 0,
        'last_sent' => 0,
    ];

    if (($now - (int)($resendState['window_start'] ?? $now)) >= 900) {
        $resendState = [
            'window_start' => $now,
            'attempts' => 0,
            'last_sent' => 0,
        ];
    }

    $secondsSinceLast = $now - (int)($resendState['last_sent'] ?? 0);
    if (!empty($resendState['last_sent']) && $secondsSinceLast < 60) {
        $remaining = 60 - $secondsSinceLast;
        throw new Exception('Espera ' . $remaining . ' segundos antes de pedir otro codigo por correo.');
    }

    if ((int)($resendState['attempts'] ?? 0) >= 3) {
        throw new Exception('El servidor de correos puede estar saturado. Espera 15 minutos e intenta de nuevo o comunicate con el equipo organizador.');
    }

    $code = randomVerificationCode();
    $expiresAt = (new DateTime('now'))->add(new DateInterval('PT20M'))->format('Y-m-d H:i:s');

    $stmtUpdate = $pdo->prepare(
        'UPDATE platform_users
         SET email_verification_code = ?, email_verification_expires_at = ?, updated_at = NOW()
         WHERE id = ?'
    );
    $stmtUpdate->execute([$code, $expiresAt, (int)$user['id']]);

    $name = (string)($user['full_name'] ?: $user['username'] ?: $email);
    $sent = sendVerificationEmail($email, $name, $code);
    if (!$sent['ok']) {
        $userError = $sent['user_error'] ?? 'No pudimos reenviar el codigo por correo. Espera unos minutos e intenta de nuevo o comunicate con el equipo organizador.';
        $detail = APP_DEBUG && !empty($sent['error']) ? ' Detalle: ' . $sent['error'] : '';
        throw new Exception($userError . $detail);
    }

    $resendState['attempts'] = (int)($resendState['attempts'] ?? 0) + 1;
    $resendState['last_sent'] = $now;
    $_SESSION['verify_resend'][$resendKey] = $resendState;

    $data = [
        'email' => $email,
        'provider' => $sent['provider'] ?? 'mail',
        'cooldown_seconds' => 60,
        'max_resend_attempts' => 3,
    ];

    if (APP_DEBUG && ($sent['provider'] ?? '') === 'debug' && isset($sent['code'])) {
        $data['debug_code'] = $sent['code'];
        $data['_debug_note'] = $sent['_debug_note'] ?? 'Sin correo real. Codigo incluido para desarrollo.';
    }

    echo json_encode([
        'success' => true,
        'message' => 'Codigo reenviado. Revisa tu correo.',
        'data' => $data,
    ]);
}

function normalizeRegisterPhone(string $phone): string
{
    $phone = trim($phone);
    $hasPlus = str_starts_with($phone, '+');
    $digits = preg_replace('/\D+/', '', $phone);
    if ($digits === '') {
        return '';
    }
    return $hasPlus ? '+' . $digits : $digits;
}
