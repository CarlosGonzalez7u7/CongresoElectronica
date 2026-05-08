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
    $username = strtolower(sanitizeText($input['username'] ?? ''));
    $password = (string) ($input['password'] ?? '');

    if ($username === '' || $password === '') {
        throw new Exception('Usuario y contraseña requeridos');
    }

    $stmtUser = $pdo->prepare(
        'SELECT id, username, email, full_name, phone, control_number, career, semester, career_semester, role, password_hash, is_active, email_verified, country, city, school, matricula
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

        if (!password_verify($password, $user['password_hash'])) {
            throw new Exception('Credenciales invalidas');
        }

        $year = getCurrentCongressYear();
        $stmtEnroll = $pdo->prepare('SELECT id, registration_fee, payment_status, registered_at FROM congress_registrations WHERE user_id = ? AND congress_year = ? LIMIT 1');
        $stmtEnroll->execute([(int) $user['id'], $year]);
        $enrollment = $stmtEnroll->fetch();

        $pdo->prepare('UPDATE platform_users SET last_login_at = NOW() WHERE id = ?')->execute([(int) $user['id']]);

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
        'SELECT id, username, full_name, email, password_hash, role, is_active
         FROM admin_users
         WHERE LOWER(username) = ?
         LIMIT 1'
    );
    $stmtAdmin->execute([$username]);
    $admin = $stmtAdmin->fetch();

    if (!$admin || !(int) $admin['is_active'] || !password_verify($password, $admin['password_hash'])) {
        throw new Exception('Credenciales invalidas');
    }

    $pdo->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?')->execute([(int) $admin['id']]);

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
} catch (Throwable $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo iniciar sesion',
    ]);
}
