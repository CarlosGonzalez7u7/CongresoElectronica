<?php
/**
 * API: AUTENTICACION DE ADMIN
 * POST /api/admin-auth.php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensureAdminUsersTable($pdo);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('Payload inválido');
    }

    $username = strtolower(trim((string)($input['username'] ?? '')));
    $password = (string)($input['password'] ?? '');

    if ($username === '' || $password === '') {
        throw new Exception('Usuario y contraseña requeridos');
    }

    $stmt = $pdo->prepare("\n        SELECT id, username, full_name, email, password_hash, role, is_active\n        FROM admin_users\n        WHERE LOWER(username) = ?\n        LIMIT 1\n    ");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !(int)$user['is_active']) {
        throw new Exception('Credenciales inválidas');
    }

    if (!password_verify($password, $user['password_hash'])) {
        throw new Exception('Credenciales inválidas');
    }

    $stmtLogin = $pdo->prepare("UPDATE admin_users SET last_login_at = NOW() WHERE id = ?");
    $stmtLogin->execute([(int)$user['id']]);

    $_SESSION['admin_id'] = (int) $user['id'];
    $_SESSION['role'] = $user['role'];

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role'],
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo iniciar sesión',
    ]);
}

function ensureAdminUsersTable($pdo)
{
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS admin_users (\n            id INT AUTO_INCREMENT PRIMARY KEY,\n            username VARCHAR(60) NOT NULL UNIQUE,\n            full_name VARCHAR(150) NOT NULL,\n            email VARCHAR(150) NULL,\n            password_hash VARCHAR(255) NOT NULL,\n            role ENUM('superadmin', 'reviewer', 'staff') DEFAULT 'staff',\n            is_active TINYINT(1) DEFAULT 1,\n            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n            last_login_at TIMESTAMP NULL,\n            INDEX idx_admin_active (is_active),\n            INDEX idx_admin_role (role)\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci\n    ");
}
