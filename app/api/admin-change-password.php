<?php
/**
 * API: CAMBIAR CONTRASENA ADMIN
 * POST /api/admin-change-password.php
 */

require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensureAdminUsersTable($pdo);

    if (($_SESSION['admin_auth_provider'] ?? $_SESSION['auth_provider'] ?? '') === 'google') {
        throw new Exception('Tu sesion inicio con Google. La contrasena se cambia desde tu cuenta de Google.');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('Payload inválido');
    }

    $username = strtolower(trim((string)($input['username'] ?? '')));
    $newUsername = strtolower(trim((string)($input['new_username'] ?? '')));
    $currentPassword = (string)($input['current_password'] ?? '');
    $newPassword = (string)($input['new_password'] ?? '');

    if ($username === '' || $currentPassword === '' || $newPassword === '') {
        throw new Exception('Datos incompletos');
    }

    if (!isStrongPassword($newPassword)) {
        throw new Exception('La nueva contraseña debe tener al menos 10 caracteres, mayúscula, minúscula, número y símbolo');
    }

    $stmt = $pdo->prepare("\n        SELECT id, password_hash, is_active\n        FROM admin_users\n        WHERE LOWER(username) = ?\n        LIMIT 1\n    ");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !(int)$user['is_active']) {
        throw new Exception('Usuario no encontrado o inactivo');
    }

    if (!password_verify($currentPassword, $user['password_hash'])) {
        throw new Exception('La contraseña actual no coincide');
    }

    if ($newUsername !== '' && !preg_match('/^[a-z0-9_.-]{4,60}$/', $newUsername)) {
        throw new Exception('El nuevo usuario debe tener 4-60 caracteres (a-z, 0-9, punto, guion o guion bajo)');
    }

    if ($newUsername !== '' && $newUsername !== $username) {
        $stmtCheckUser = $pdo->prepare("SELECT id FROM admin_users WHERE LOWER(username) = ? LIMIT 1");
        $stmtCheckUser->execute([$newUsername]);
        if ($stmtCheckUser->fetch()) {
            throw new Exception('El nombre de usuario ya existe');
        }
    }

    $finalUsername = $newUsername !== '' ? $newUsername : $username;

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmtUpdate = $pdo->prepare("\n        UPDATE admin_users\n        SET password_hash = ?, username = ?, updated_at = NOW()\n        WHERE id = ?\n    ");
    $stmtUpdate->execute([$newHash, $finalUsername, (int)$user['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Credenciales actualizadas correctamente',
        'data' => [
            'username' => $finalUsername,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo cambiar la contraseña',
    ]);
}

function ensureAdminUsersTable($pdo)
{
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS admin_users (\n            id INT AUTO_INCREMENT PRIMARY KEY,\n            username VARCHAR(60) NOT NULL UNIQUE,\n            full_name VARCHAR(150) NOT NULL,\n            email VARCHAR(150) NULL,\n            password_hash VARCHAR(255) NOT NULL,\n            role ENUM('superadmin', 'reviewer', 'staff') DEFAULT 'staff',\n            is_active TINYINT(1) DEFAULT 1,\n            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n            last_login_at TIMESTAMP NULL,\n            INDEX idx_admin_active (is_active),\n            INDEX idx_admin_role (role)\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci\n    ");
}

function isStrongPassword($password)
{
    return strlen($password) >= 10
        && preg_match('/[A-Z]/', $password)
        && preg_match('/[a-z]/', $password)
        && preg_match('/\d/', $password)
        && preg_match('/[^A-Za-z0-9]/', $password);
}
