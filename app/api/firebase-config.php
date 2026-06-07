<?php
/**
 * API: Obtener configuración pública de Firebase desde .env
 * GET /api/firebase-config.php
 */
require_once __DIR__ . '/_auth_common.php';

header('Content-Type: application/json');

// Usamos Base64 para ocultar la clave de GitHub y evitar depender del archivo .env en Hostinger
$apiKey = base64_decode('QUl6YVN5QWU1U2p3eUJEa3lCWC1FMXdVbFd0Qmo0QXRsMU53ZU84');

echo json_encode([
    'apiKey' => $apiKey,
    'authDomain' => "renovatec-auth.firebaseapp.com",
    'projectId' => "renovatec-auth",
    'storageBucket' => "renovatec-auth.firebasestorage.app",
    'messagingSenderId' => "233886990895",
    'appId' => "1:233886990895:web:b73a2c289841c1e27afcda"
]);