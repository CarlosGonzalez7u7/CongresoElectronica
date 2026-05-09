<?php
/**
 * API: Login unificado (usuarios + admin)
 * POST /api/auth-login.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);
    ensureCongressRegistrationsTable($pdo);
    ensureAdminUsersTable($pdo);

    $input = jsonInputOrFail();
    checkIpRateLimit($pdo, $input, 6, 15); // Máx 6 intentos globales por IP

    $username = strtolower(sanitizeText($input['username'] ?? ''));
    $password = (string) ($input['password'] ?? '');

    if ($username === '' || $password === '') {
        // Contar como intento fallido contra la IP
        $new_ip_attempts = incrementIpAttempts($pdo, 6, 15);
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Usuario y contraseña requeridos.',
            'failed_attempts' => $new_ip_attempts,
            'max_attempts' => 6
        ]);
        exit;
    }

    $stmtUser = $pdo->prepare(
        'SELECT id, username, email, full_name, phone, control_number, career, semester, career_semester, role, password_hash, is_active, email_verified, country, city, school, matricula, failed_login_attempts, last_failed_login_at
         FROM platform_users
         WHERE LOWER(username) = ? OR LOWER(email) = ?
         LIMIT 1'
    );
    $stmtUser->execute([$username, $username]);
    $user = $stmtUser->fetch();

    if ($user) {
        if (!(int) $user['is_active']) {
            throw new Exception('Cuenta inactiva');
        }

        if (!(int) $user['email_verified']) {
            throw new Exception('Debes verificar tu correo antes de iniciar sesion');
        }

        $attempts = (int) ($user['failed_login_attempts'] ?? 0);
        $lastAttempt = isset($user['last_failed_login_at']) ? new DateTime($user['last_failed_login_at']) : null;
        $blockDuration = 5; // 5 minutos

        if ($attempts >= 3 && $lastAttempt && (new DateTime())->getTimestamp() - $lastAttempt->getTimestamp() < $blockDuration * 60) {
            http_response_code(429); // Too Many Requests
            incrementIpAttempts($pdo, 6, 15); // También afecta el bloqueo de la IP global
            echo json_encode(['success' => false, 'error' => "Demasiados intentos fallidos. Intenta de nuevo en {$blockDuration} minutos."]);
            exit;
        }

        if (password_verify($password, $user['password_hash'])) {
            // Éxito: Reinicia el contador
            $pdo->prepare("UPDATE platform_users SET failed_login_attempts = 0, last_failed_login_at = NULL, last_login_at = NOW() WHERE id = ?")
                ->execute([(int) $user['id']]);
            clearIpRateLimit($pdo);
        } else {
            // Fallo: Incrementa el contador
            $new_attempts = $attempts + 1;
            $pdo->prepare("UPDATE platform_users SET failed_login_attempts = ?, last_failed_login_at = NOW() WHERE id = ?")
                ->execute([$new_attempts, (int) $user['id']]);

            incrementIpAttempts($pdo, 6, 15);

            http_response_code(401); // Unauthorized
            echo json_encode([
                'success' => false,
                'error' => 'Usuario o contraseña incorrectos.',
                'failed_attempts' => $new_attempts,
                'max_attempts' => 3
            ]);
            exit;
        }

        $year = getCurrentCongressYear();
        $stmtEnroll = $pdo->prepare('SELECT id, registration_fee, payment_status, registered_at FROM congress_registrations WHERE user_id = ? AND congress_year = ? LIMIT 1');
        $stmtEnroll->execute([(int) $user['id'], $year]);
        $enrollment = $stmtEnroll->fetch();

        $_SESSION['user_id'] = (int) $user['id'];
        $_SESSION['role'] = $user['role'];

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name'] ?? null,
                'phone' => $user['phone'] ?? null,
                'control_number' => $user['control_number'] ?? $user['username'],
                'career' => $user['career'] ?? null,
                'semester' => $user['semester'] ?? null,
                'career_semester' => $user['career_semester'] ?? null,
                'role' => $user['role'],
                'scope' => 'platform',
                'profile' => [
                    'country' => $user['country'],
                    'city' => $user['city'],
                    'school' => $user['school'],
                    'matricula' => $user['matricula'],
                    'full_name' => $user['full_name'] ?? null,
                    'phone' => $user['phone'] ?? null,
                    'control_number' => $user['control_number'] ?? $user['username'],
                    'career' => $user['career'] ?? null,
                    'semester' => $user['semester'] ?? null,
                    'career_semester' => $user['career_semester'] ?? null,
                ],
                'requires_congress_enrollment' => !$enrollment,
                'enrollment' => $enrollment ? [
                    'id' => (int) $enrollment['id'],
                    'registration_fee' => (float) $enrollment['registration_fee'],
                    'payment_status' => $enrollment['payment_status'],
                    'registered_at' => $enrollment['registered_at'],
                    'congress_year' => $year,
                ] : null,
            ],
        ]);
        exit;
    }

    $stmtAdmin = $pdo->prepare(
        'SELECT id, username, full_name, email, password_hash, role, is_active, failed_login_attempts, last_failed_login_at
         FROM admin_users
         WHERE LOWER(username) = ?
         LIMIT 1'
    );
    $stmtAdmin->execute([$username]);
    $admin = $stmtAdmin->fetch();
    
    if ($admin) {
        if (!(int) $admin['is_active']) {
            throw new Exception('Cuenta de administrador inactiva.');
        }

        $attempts = (int) ($admin['failed_login_attempts'] ?? 0);
        $lastAttempt = isset($admin['last_failed_login_at']) ? new DateTime($admin['last_failed_login_at']) : null;
        $blockDuration = 5; // 5 minutos

        if ($attempts >= 3 && $lastAttempt && (new DateTime())->getTimestamp() - $lastAttempt->getTimestamp() < $blockDuration * 60) {
            http_response_code(429); // Too Many Requests
            incrementIpAttempts($pdo, 6, 15);
            echo json_encode(['success' => false, 'error' => "Demasiados intentos fallidos. Intenta de nuevo en {$blockDuration} minutos."]);
            exit;
        }

        if (password_verify($password, $admin['password_hash'])) {
            // Éxito: Reinicia el contador
            $pdo->prepare("UPDATE admin_users SET failed_login_attempts = 0, last_failed_login_at = NULL, last_login_at = NOW() WHERE id = ?")
                ->execute([(int) $admin['id']]);
            clearIpRateLimit($pdo);

            $_SESSION['admin_id'] = (int) $admin['id'];
            $_SESSION['role'] = 'admin';

            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => (int) $admin['id'],
                    'username' => $admin['username'],
                    'full_name' => $admin['full_name'],
                    'email' => $admin['email'],
                    'role' => 'admin',
                    'admin_role' => $admin['role'],
                    'scope' => 'admin',
                    'requires_congress_enrollment' => false,
                    'enrollment' => null,
                ],
            ]);
        } else {
            // Fallo: Incrementa el contador
            $new_attempts = $attempts + 1;
            $pdo->prepare("UPDATE admin_users SET failed_login_attempts = ?, last_failed_login_at = NOW() WHERE id = ?")
                ->execute([$new_attempts, (int) $admin['id']]);
            
            incrementIpAttempts($pdo, 6, 15);
            http_response_code(401); // Unauthorized
            echo json_encode(['success' => false, 'error' => 'Credenciales inválidas.', 'failed_attempts' => $new_attempts, 'max_attempts' => 3]);
            exit;
        }
    } else {
        // No se encontró ni usuario de plataforma ni administrador
        $new_ip_attempts = incrementIpAttempts($pdo, 6, 15);

        // Revisar si el nuevo intento bloquea la IP y requiere captcha
        $stmt = $pdo->prepare("SELECT blocked_until FROM ip_rate_limits WHERE ip_address = ?");
        $stmt->execute([getRealUserIp()]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($record && !empty($record['blocked_until']) && (new DateTime($record['blocked_until'])) > (new DateTime())) {
            $diff = (new DateTime($record['blocked_until']))->getTimestamp() - (new DateTime())->getTimestamp();
            $minutes = (int) ceil($diff / 60);
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'error' => "Por seguridad, tu red ha sido bloqueada temporalmente. Intenta de nuevo en {$minutes} minutos.",
                'is_ip_blocked' => true,
                'blocked_minutes' => $minutes
            ]);
            exit;
        }

        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Credenciales inválidas.',
            'failed_attempts' => $new_ip_attempts,
            'max_attempts' => 6
        ]);
        exit;
    }
} catch (Throwable $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo iniciar sesion',
    ]);
}
