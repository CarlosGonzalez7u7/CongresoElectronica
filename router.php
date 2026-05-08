<?php
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = __DIR__ . $uri;

// Serve existing files directly (assets, css, js, images, etc.).
if ($uri !== '/' && is_file($path)) {
    return false;
}

$routes = [
    '/' => '/index.html',
    '/acceso' => '/public/acceso.html',
    '/confirmacion' => '/public/confirmacion.html',
    '/admin' => '/public/admin.html',
    '/validador' => '/public/validador.html',
];

if (isset($routes[$uri])) {
    $target = __DIR__ . $routes[$uri];
    if (is_file($target)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($target);
        return true;
    }
}

// Allow direct access to app/api scripts and other PHP files.
if (str_starts_with($uri, '/app/')) {
    if (is_file($path)) {
        require $path;
        return true;
    }
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo "404 Not Found";
