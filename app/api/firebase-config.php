<?php
/**
 * API: Obtener configuración pública de Firebase desde .env
 * GET /api/firebase-config.php
 */
require_once __DIR__ . '/_auth_common.php';

header('Content-Type: application/json');

echo json_encode([
    'apiKey' => $_ENV['FIREBASE_API_KEY'] ?? '',
    'authDomain' => "renovatec-auth.firebaseapp.com",
    'projectId' => "renovatec-auth",
    'storageBucket' => "renovatec-auth.firebasestorage.app",
    'messagingSenderId' => "233886990895",
    'appId' => "1:233886990895:web:b73a2c289841c1e27afcda"
]);