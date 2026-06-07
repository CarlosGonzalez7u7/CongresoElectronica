<?php
/**
 * API: Obtener configuración pública de Firebase desde .env
 * GET /api/firebase-config.php
 */
require_once __DIR__ . '/_auth_common.php';

header('Content-Type: application/json');

// Leer la clave buscando en el entorno y forzando la lectura del archivo .env.local (para Hostinguer)
$apiKey = $_ENV['FIREBASE_API_KEY'] ?? getenv('FIREBASE_API_KEY') ?? '';
if (empty($apiKey) && file_exists(__DIR__ . '/../config/.env.local')) {
    $envContent = file_get_contents(__DIR__ . '/../config/.env.local');
    if (preg_match('/FIREBASE_API_KEY\s*=\s*(.+)/', $envContent, $matches)) {
        $apiKey = trim($matches[1]);
    }
}

echo json_encode([
    'apiKey' => $apiKey,
    'authDomain' => "renovatec-auth.firebaseapp.com",
    'projectId' => "renovatec-auth",
    'storageBucket' => "renovatec-auth.firebasestorage.app",
    'messagingSenderId' => "233886990895",
    'appId' => "1:233886990895:web:b73a2c289841c1e27afcda"
]);