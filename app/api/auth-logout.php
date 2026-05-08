<?php
/**
 * API: Cerrar sesión de usuario (Logout)
 * POST /api/auth-logout.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

// Limpiar todas las variables de la sesión
$_SESSION = [];

// Destruir la cookie de sesión nativa en el navegador
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
}

// Destruir la sesión en el servidor
session_destroy();

echo json_encode(['success' => true, 'message' => 'Sesión cerrada exitosamente']);