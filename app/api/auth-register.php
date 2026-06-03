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

    $input = jsonInputOrFail();

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
        'SELECT id, email_verified FROM platform_users WHERE LOWER(username) = ? LIMIT 1'
    );
    $stmtByUser->execute([$username]);
    $foundUser = $stmtByUser->fetch();

    if ($foundUser && (int)$foundUser['email_verified'] === 1) {
        throw new Exception('El usuario ya está registrado');
    }

    $stmtByEmail = $pdo->prepare(
        'SELECT id, email_verified FROM platform_users WHERE LOWER(email) = ? LIMIT 1'
    );
    $stmtByEmail->execute([$email]);
    $foundEmail = $stmtByEmail->fetch();

    if ($foundEmail && (int)$foundEmail['email_verified'] === 1) {
        throw new Exception('El correo ya está registrado y verificado');
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
        throw new Exception('El servicio de correos ha alcanzado su límite de seguridad temporal. Por favor, intenta registrarte más tarde.');
    }

    $pdo->commit();

    // --- Respuesta ---
    $responseData = [
        'email'    => $email,
        'username' => $username,
        'provider' => $sent['provider'] ?? 'mail',
    ];

    // En modo debug con proveedor 'debug', incluir el código en la respuesta
    // para que el frontend pueda usarlo sin necesidad de correo.
    if (APP_DEBUG && ($sent['provider'] ?? '') === 'debug' && isset($sent['code'])) {
        $responseData['debug_code'] = $sent['code'];
        $responseData['_debug_note'] = $sent['_debug_note'] ?? 'Sin correo real. Código incluido para desarrollo.';
    }

    echo json_encode([
        'success' => true,
        'message' => 'Cuenta creada. Revisa tu correo para verificarla.',
        'data'    => $responseData,
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => APP_DEBUG ? $e->getMessage() : 'No se pudo registrar la cuenta',
    ]);
}