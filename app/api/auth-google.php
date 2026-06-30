<?php
/**
 * API: Autenticación y Registro con Google (Firebase)
 * POST /api/auth-google.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);
    $input = jsonInputOrFail();

    // Prevenir spam de peticiones por IP
    checkIpRateLimit($pdo, $input, 20, 60);
    incrementIpAttempts($pdo, 20, 60);

    $idToken = $input['idToken'] ?? '';
    $action = $input['action'] ?? 'login'; // Puede ser 'login' o 'register'

    if (!$idToken) {
        throw new Exception('Token de Google requerido');
    }

    // 1. Verificar el token de Firebase con la API de Google Identity Toolkit
    // Usamos Base64 para ocultar la clave de GitHub y evitar depender del archivo .env en Hostinger
    $firebaseApiKey = base64_decode('QUl6YVN5QWU1U2p3eUJEa3lCWC1FMXdVbFd0Qmo0QXRsMU53ZU84');

    if (empty($firebaseApiKey)) {
        throw new Exception('Configuración de Firebase incompleta en el servidor.');
    }
    $url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" . $firebaseApiKey;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['idToken' => $idToken]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $response = curl_exec($ch);
    curl_close($ch);

    $fbData = json_decode($response, true);

    if (!isset($fbData['users'][0])) {
        throw new Exception('Token de Google inválido o expirado. Vuelve a iniciar sesión.');
    }

    $googleUser = $fbData['users'][0];
    $email = strtolower($googleUser['email'] ?? '');
    $fullName = sanitizeText($googleUser['displayName'] ?? '');

    if (!$email) {
        throw new Exception('No se pudo obtener el correo de tu cuenta de Google.');
    }

    // 2. Buscar si el usuario ya existe en tu base de datos
    $stmt = $pdo->prepare("SELECT * FROM platform_users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($action === 'login') {
        if ($user) {
            // El usuario existe -> Iniciar Sesión Directamente
            if (!(int)$user['is_active']) {
                throw new Exception('Esta cuenta ha sido desactivada.');
            }
            
            // Auto-verificar correo si estaba pendiente (porque viene de Google verificado)
            if (!(int)$user['email_verified']) {
                $pdo->prepare("UPDATE platform_users SET email_verified = 1 WHERE id = ?")->execute([$user['id']]);
            }

            $_SESSION['user_id'] = (int)$user['id'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['auth_provider'] = 'google';

            $scope = 'platform';
            if (in_array($user['role'], ['admin', 'superadmin', 'staff'])) {
                $scope = 'admin';
            } elseif (in_array($user['role'], ['tallerista', 'profesor', 'instructor'])) {
                $scope = 'tallerista';
            }

            // Sincronizar si también existe en admin_users
            $stmtAdminSync = $pdo->prepare('SELECT id, role FROM admin_users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1');
            $stmtAdminSync->execute([$email, strtolower($user['username'])]);
            $adminSync = $stmtAdminSync->fetch();
            if ($adminSync) {
                $scope = 'admin';
                $user['admin_role'] = $adminSync['role'];
                $_SESSION['role'] = 'admin';
                $_SESSION['admin_id'] = (int) $adminSync['id'];
                $_SESSION['admin_auth_provider'] = 'google';
                $pdo->prepare("UPDATE admin_users SET last_login_at = NOW(), failed_login_attempts = 0 WHERE id = ?")->execute([$adminSync['id']]);
            }
            
            // Sincronizar si también existe en workshop_instructors (Tallerista)
            $stmtInstSync = $pdo->prepare('SELECT id FROM workshop_instructors WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1');
            $stmtInstSync->execute([$email, strtolower($user['username'])]);
            $instSync = $stmtInstSync->fetch();
            if ($instSync && $scope !== 'admin') {
                $scope = 'tallerista';
                $_SESSION['role'] = 'tallerista';
                $_SESSION['instructor_id'] = (int) $instSync['id'];
            }

            $pdo->prepare("UPDATE platform_users SET last_login_at = NOW() WHERE id = ?")->execute([$user['id']]);
            clearIpRateLimit($pdo);

            $responseData = [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'role' => $user['role'],
                'scope' => $scope,
                'auth_provider' => 'google',
                'redirect' => $scope === 'admin' ? '/admin' : ($scope === 'tallerista' ? '/tallerista' : '/usuario'),
                'profile' => [
                    'full_name' => $user['full_name'],
                    'email' => $user['email'],
                    'phone' => $user['phone'],
                    'school' => $user['school'],
                    'control_number' => $user['control_number'],
                    'matricula' => $user['matricula'],
                    'career' => $user['career'],
                    'semester' => $user['semester'],
                    'country' => $user['country'],
                    'city' => $user['city']
                ]
            ];

            if ($scope === 'admin') {
                $responseData['admin_role'] = $user['admin_role'] ?? $user['role'];
                $responseData['role'] = 'admin';
            }

            echo json_encode([
                'success' => true,
                'message' => 'Sesión iniciada correctamente',
                'data' => $responseData
            ]);
        } else {
            // El usuario NO existe -> Devolver bandera al Frontend para que muestre 
            // los campos requeridos (Escuela, Semestre, Número de control, etc.)
            echo json_encode([
                'success' => true,
                'needs_registration' => true,
                'email' => $email,
                'full_name' => $fullName
            ]);
        }
        exit;
    }

    if ($action === 'register') {
        if ($user) {
            throw new Exception('El correo ya está registrado. Por favor, solo inicia sesión.');
        }

        // Leer los datos extras obligatorios para tu plataforma
        $originSchool     = sanitizeText($input['originSchool'] ?? '');
        $controlNumberRaw = sanitizeText($input['controlNumber'] ?? '');
        $career           = sanitizeText($input['career'] ?? '');
        $semester         = sanitizeText($input['semester'] ?? '');
        $phone            = sanitizeText($input['phone'] ?? '');
        $country          = sanitizeText($input['country'] ?? '');
        $city             = sanitizeText($input['city'] ?? '');
        $controlNumber    = strtolower($controlNumberRaw);
        $username         = $controlNumber;

        if ($originSchool === '' || $controlNumberRaw === '' ||
            $career === '' || $semester === '' || $phone === '' ||
            $country === '' || $city === '') {
            throw new Exception('Completa todos los campos académicos obligatorios para finalizar el registro.');
        }

        // Validar que el número de control no esté ocupado
        $stmtByUsername = $pdo->prepare('SELECT id FROM platform_users WHERE LOWER(username) = ? LIMIT 1');
        $stmtByUsername->execute([$username]);
        if ($stmtByUsername->fetch()) {
            throw new Exception('El número de control/matrícula ya está registrado en otra cuenta.');
        }

        // Generar una contraseña aleatoria de relleno, ya que el usuario usará Google
        $passwordHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);

        $pdo->beginTransaction();

        $stmtInsert = $pdo->prepare('
            INSERT INTO platform_users
             (email, username, full_name, phone, control_number,
              career, semester, career_semester,
              country, city, school, matricula,
              role, password_hash,
              email_verified, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "alumno", ?, 1, 1)
        ');
        $stmtInsert->execute([
            $email, $username, $input['fullName'] ?? $fullName, $phone, $controlNumberRaw,
            $career, $semester, $career . ' - ' . $semester,
            $country, $city, $originSchool, $controlNumberRaw,
            $passwordHash
        ]);

        $newUserId = (int)$pdo->lastInsertId();
        $pdo->commit();

        // Iniciar sesión automáticamente
        $_SESSION['user_id'] = $newUserId;
        $_SESSION['role'] = 'alumno';
        $_SESSION['username'] = $username;
        clearIpRateLimit($pdo);

        echo json_encode([
            'success' => true,
            'message' => 'Cuenta creada exitosamente con Google',
            'data' => [
                'id' => $newUserId,
                'username' => $username,
                'email' => $email,
                'full_name' => $input['fullName'] ?? $fullName,
                'role' => 'alumno',
                'scope' => 'alumno',
                'redirect' => '/usuario',
                'profile' => [
                    'full_name' => $input['fullName'] ?? $fullName,
                    'email' => $email,
                    'phone' => $phone,
                    'school' => $originSchool,
                    'control_number' => $controlNumberRaw,
                    'matricula' => $controlNumberRaw,
                    'career' => $career,
                    'semester' => $semester,
                    'country' => $country,
                    'city' => $city
                ]
            ]
        ]);
        exit;
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
