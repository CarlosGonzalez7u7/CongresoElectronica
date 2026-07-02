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
    cleanupExpiredUnverifiedUsers($pdo, 30);
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

    $stmtAdmin = $pdo->prepare('SELECT id, username, full_name, email, password_hash, role, is_active, failed_login_attempts, last_failed_login_at FROM admin_users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1');
    $stmtAdmin->execute([$username, $username]);
    $admin = $stmtAdmin->fetch();

    $stmtInst = $pdo->prepare('SELECT id, username, full_name, email, phone, password_hash, is_active, role_type FROM workshop_instructors WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1');
    $stmtInst->execute([$username, $username]);
    $instructor = $stmtInst->fetch();

    $stmtUser = $pdo->prepare('SELECT id, username, email, full_name, phone, control_number, career, semester, career_semester, role, password_hash, is_active, account_status, admin_status_reason, email_verified, country, city, school, matricula, failed_login_attempts, last_failed_login_at FROM platform_users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1');
    $stmtUser->execute([$username, $username]);
    $user = $stmtUser->fetch();

    $authSuccess = false;
    $authType = null;
    $authData = null;

    if ($admin && password_verify($password, $admin['password_hash'])) {
        $authSuccess = true;
        $authType = 'admin';
        $authData = $admin;
    } elseif ($instructor && password_verify($password, $instructor['password_hash'])) {
        $authSuccess = true;
        $authType = 'instructor';
        $authData = $instructor;
    } elseif ($user && password_verify($password, $user['password_hash'])) {
        $authSuccess = true;
        $authType = 'user';
        $authData = $user;
    }

    if ($authSuccess) {
        if ($authType === 'admin') {
            if (!(int) $authData['is_active']) throw new Exception('Cuenta de administrador inactiva.');
            
            $attempts = (int) ($authData['failed_login_attempts'] ?? 0);
            $lastAttempt = isset($authData['last_failed_login_at']) ? new DateTime($authData['last_failed_login_at']) : null;
            if ($attempts >= 3 && $lastAttempt && (new DateTime())->getTimestamp() - $lastAttempt->getTimestamp() < 300) {
                http_response_code(429);
                incrementIpAttempts($pdo, 6, 15);
                echo json_encode(['success' => false, 'error' => "Demasiados intentos fallidos. Intenta de nuevo en 5 minutos."]);
                exit;
            }

            $pdo->prepare("UPDATE admin_users SET failed_login_attempts = 0, last_failed_login_at = NULL, last_login_at = NOW() WHERE id = ?")->execute([(int) $authData['id']]);
            clearIpRateLimit($pdo);

            $_SESSION['admin_id'] = (int) $authData['id'];
            $_SESSION['role'] = 'admin';
            $_SESSION['auth_provider'] = 'local';
            $_SESSION['admin_auth_provider'] = 'local';

            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => (int) $authData['id'],
                    'username' => $authData['username'],
                    'full_name' => $authData['full_name'],
                    'email' => $authData['email'],
                    'role' => 'admin',
                    'admin_role' => $authData['role'],
                    'scope' => 'admin',
                    'auth_provider' => 'local',
                    'requires_congress_enrollment' => false,
                    'enrollment' => null,
                ],
            ]);
            exit;
        } elseif ($authType === 'instructor') {
            if (!(int) $authData['is_active']) throw new Exception('Cuenta de tallerista inactiva.');

            // SOLUCIÓN A COLISIÓN DE IDs: Sincronizar con platform_users
            if (!empty($authData['email'])) {
                $stmtSync = $pdo->prepare('SELECT id, role FROM platform_users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1');
                $stmtSync->execute([strtolower($authData['email']), strtolower($authData['username'])]);
            } else {
                $stmtSync = $pdo->prepare('SELECT id, role FROM platform_users WHERE LOWER(username) = ? LIMIT 1');
                $stmtSync->execute([strtolower($authData['username'])]);
            }
            $pUser = $stmtSync->fetch();
            
            $platformUserId = 0;
            if ($pUser) {
                $platformUserId = (int)$pUser['id'];
                if ($pUser['role'] !== 'tallerista') {
                    $pdo->prepare("UPDATE platform_users SET role = 'tallerista' WHERE id = ?")->execute([$platformUserId]);
                }
            } else {
                $stmtInsert = $pdo->prepare("INSERT INTO platform_users (email, username, full_name, phone, control_number, role, password_hash, email_verified, is_active, country, city, school, matricula) VALUES (?, ?, ?, ?, ?, 'tallerista', ?, 1, 1, 'México', 'Uruapan', 'Instructor', ?)");
                $stmtInsert->execute([
                    $authData['email'],
                    $authData['username'],
                    $authData['full_name'],
                    $authData['phone'] ?? '',
                    $authData['username'], 
                    $authData['password_hash'],
                    $authData['username']
                ]);
                $platformUserId = (int)$pdo->lastInsertId();
            }

            $pdo->prepare("UPDATE workshop_instructors SET last_login_at = NOW() WHERE id = ?")->execute([(int) $authData['id']]);
            clearIpRateLimit($pdo);
            
            $_SESSION['instructor_id'] = (int) $authData['id'];
            $_SESSION['user_id'] = $platformUserId;
            $_SESSION['role'] = 'tallerista';
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => $platformUserId,
                    'instructor_id' => (int) $authData['id'],
                    'username' => $authData['username'],
                    'email' => $authData['email'],
                    'full_name' => $authData['full_name'],
                    'phone' => $authData['phone'] ?? '',
                    'control_number' => $authData['username'],
                    'career' => 'Profesor',
                    'semester' => '',
                    'career_semester' => '',
                    'role' => 'tallerista',
                    'scope' => 'tallerista',
                    'profile' => [
                        'country' => 'México',
                        'city' => '',
                        'school' => 'Instructor',
                        'matricula' => $authData['username'],
                        'full_name' => $authData['full_name'],
                        'phone' => $authData['phone'] ?? '',
                        'control_number' => $authData['username'],
                        'career' => 'Profesor',
                        'semester' => '',
                        'career_semester' => '',
                    ],
                    'requires_congress_enrollment' => false,
                    'enrollment' => null,
                ],
            ]);
            exit;
        } elseif ($authType === 'user') {
            $accountStatus = $authData['account_status'] ?? ((int)$authData['is_active'] ? 'active' : 'deactivated');
            if ($accountStatus !== 'active' || !(int) $authData['is_active']) {
                $reason = trim((string)($authData['admin_status_reason'] ?? ''));
                $statusLabel = $accountStatus === 'banned' ? 'baneada' : 'dada de baja';
                $message = 'Tu cuenta fue ' . $statusLabel . ' por un administrador.';
                if ($reason !== '') {
                    $message .= ' Motivo: ' . $reason;
                }
                throw new Exception($message);
            }
            if (!(int) $authData['email_verified']) throw new Exception('Debes verificar tu correo antes de iniciar sesion');

            $attempts = (int) ($authData['failed_login_attempts'] ?? 0);
            $lastAttempt = isset($authData['last_failed_login_at']) ? new DateTime($authData['last_failed_login_at']) : null;
            if ($attempts >= 3 && $lastAttempt && (new DateTime())->getTimestamp() - $lastAttempt->getTimestamp() < 300) {
                http_response_code(429);
                incrementIpAttempts($pdo, 6, 15);
                echo json_encode(['success' => false, 'error' => "Demasiados intentos fallidos. Intenta de nuevo en 5 minutos."]);
                exit;
            }

            $pdo->prepare("UPDATE platform_users SET failed_login_attempts = 0, last_failed_login_at = NULL, last_login_at = NOW() WHERE id = ?")->execute([(int) $authData['id']]);
            clearIpRateLimit($pdo);

            $year = getCurrentCongressYear();
            $stmtEnroll = $pdo->prepare('SELECT id, registration_fee, payment_status, registered_at FROM congress_registrations WHERE user_id = ? AND congress_year = ? LIMIT 1');
            $stmtEnroll->execute([(int) $authData['id'], $year]);
            $enrollment = $stmtEnroll->fetch();

            $_SESSION['user_id'] = (int) $authData['id'];
            $_SESSION['role'] = $authData['role'];
            
            // Definir dinámicamente el scope en base al rol que tiene en platform_users
            $scope = 'platform';
            if (in_array($authData['role'], ['admin', 'superadmin', 'staff'])) {
                $scope = 'admin';
            } elseif (in_array($authData['role'], ['tallerista', 'profesor', 'instructor'])) {
                $scope = 'tallerista';
            }

            // Sincronización agresiva: si el usuario también es instructor, elevar privilegios
            $stmtInstSync = $pdo->prepare('SELECT id FROM workshop_instructors WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1');
            $stmtInstSync->execute([strtolower($authData['username']), strtolower($authData['email'])]);
            $instSync = $stmtInstSync->fetch();
            if ($instSync) {
                $scope = 'tallerista';
                $authData['role'] = 'tallerista';
                $_SESSION['role'] = 'tallerista';
                $_SESSION['instructor_id'] = (int) $instSync['id'];
            }

            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => (int) $authData['id'],
                    'instructor_id' => isset($instSync['id']) ? (int) $instSync['id'] : null,
                    'username' => $authData['username'],
                    'email' => $authData['email'],
                    'full_name' => $authData['full_name'] ?? null,
                    'phone' => $authData['phone'] ?? null,
                    'control_number' => $authData['control_number'] ?? $authData['username'],
                    'career' => $authData['career'] ?? null,
                    'semester' => $authData['semester'] ?? null,
                    'career_semester' => $authData['career_semester'] ?? null,
                    'role' => $authData['role'],
                    'scope' => $scope,
                    'profile' => [
                        'country' => $authData['country'],
                        'city' => $authData['city'],
                        'school' => $authData['school'],
                        'matricula' => $authData['matricula'],
                        'full_name' => $authData['full_name'] ?? null,
                        'phone' => $authData['phone'] ?? null,
                        'control_number' => $authData['control_number'] ?? $authData['username'],
                        'career' => $authData['career'] ?? null,
                        'semester' => $authData['semester'] ?? null,
                        'career_semester' => $authData['career_semester'] ?? null,
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
    }

    // Si llegamos aqui, las credenciales son incorrectas
    $new_ip_attempts = incrementIpAttempts($pdo, 6, 15);
    
    // Increment specific user failed attempts if found
    if ($admin) {
        $pdo->prepare("UPDATE admin_users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login_at = NOW() WHERE id = ?")->execute([(int) $admin['id']]);
    }
    if ($user) {
        $pdo->prepare("UPDATE platform_users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login_at = NOW() WHERE id = ?")->execute([(int) $user['id']]);
    }

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
        'error' => 'Usuario o contraseña incorrectos.',
        'failed_attempts' => $new_ip_attempts,
        'max_attempts' => 6
    ]);
    exit;
} catch (Throwable $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo iniciar sesion',
    ]);
}
