<?php
function loadEnvFile($filePath) {
    if (!is_file($filePath)) {
        return [];
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);

        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            $value = substr($value, 1, -1);
        }

        $env[$key] = $value;
    }

    return $env;
}

function envValue($key, $default = null) {
    $serverValue = getenv($key);
    if ($serverValue !== false && $serverValue !== '') {
        return $serverValue;
    }

    global $appEnv;
    return $appEnv[$key] ?? $default;
}

$runtimeHost = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? '');
$isLocalRuntime = (
    $runtimeHost === '' ||
    $runtimeHost === 'localhost' ||
    $runtimeHost === '127.0.0.1' ||
    str_ends_with($runtimeHost, '.local')
);

$envCandidates = $isLocalRuntime
    ? [
        __DIR__ . '/../.env.local',
        __DIR__ . '/../.env',
        __DIR__ . '/../.env.production',
        __DIR__ . '/../.env.example',
    ]
    : [
        __DIR__ . '/../.env',
        __DIR__ . '/../.env.production',
        __DIR__ . '/../.env.local',
    ];

$appEnv = [];
$loadedEnvSources = [];
foreach ($envCandidates as $candidate) {
    $loaded = loadEnvFile($candidate);
    if (!empty($loaded)) {
        // El primer archivo tiene prioridad; los siguientes solo rellenan faltantes.
        $appEnv = $appEnv + $loaded;
        $loadedEnvSources[] = basename($candidate);
    }
}

define('ENV_SOURCE', empty($loadedEnvSources) ? 'none' : implode(' -> ', $loadedEnvSources));

// ===== CONFIGURACIÓN DE BD =====
define('DB_HOST', envValue('DB_HOST', 'localhost'));
define('DB_PORT', envValue('DB_PORT', '3306'));
define('DB_USER', envValue('DB_USER', 'root'));
define('DB_PASSWORD', envValue('DB_PASSWORD', ''));
define('DB_NAME', envValue('DB_NAME', 'renovatec_db'));
define('DB_CHARSET', envValue('DB_CHARSET', 'utf8mb4'));
define('APP_DEBUG', filter_var(envValue('APP_DEBUG', 'false'), FILTER_VALIDATE_BOOLEAN));

// ===== PROTECCIÓN CLOUDFLARE (IP SPOOFING) =====
function isCloudflareIP($ip) {
    $cf_ipv4 = [
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
        '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
        '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
        '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22'
    ];
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $ip_long = ip2long($ip);
        foreach ($cf_ipv4 as $cidr) {
            list($subnet, $mask) = explode('/', $cidr);
            $mask_bin = -1 << (32 - $mask);
            if (($ip_long & $mask_bin) === (ip2long($subnet) & $mask_bin)) {
                return true;
            }
        }
    }

    $cf_ipv6 = [
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
        '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'
    ];
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
        $ip_bin = inet_pton($ip);
        foreach ($cf_ipv6 as $cidr) {
            list($subnet, $mask) = explode('/', $cidr);
            $bytes = (int)($mask / 8);
            $bits = $mask % 8;
            if (strncmp($ip_bin, inet_pton($subnet), $bytes) === 0) {
                if ($bits === 0) return true;
                $mask_byte = -1 << (8 - $bits);
                if ((ord($ip_bin[$bytes]) & $mask_byte) === (ord(inet_pton($subnet)[$bytes]) & $mask_byte)) return true;
            }
        }
    }
    return false;
}

$remoteIp = $_SERVER['REMOTE_ADDR'] ?? '';
$isLocalIp = in_array($remoteIp, ['127.0.0.1', '::1'], true) || str_starts_with($remoteIp, '192.168.') || str_starts_with($remoteIp, '10.');

if (!$isLocalIp && !APP_DEBUG && !empty($_SERVER['HTTP_HOST'])) {
    if (!isCloudflareIP($remoteIp)) {
        http_response_code(403);
        die(json_encode(['error' => 'Acceso denegado. Solicitud directa al servidor bloqueada. Usa el dominio oficial.']));
    }
}

function getRealUserIp() {
    global $remoteIp, $isLocalIp;
    // Solo confiamos en HTTP_CF_CONNECTING_IP si la petición pasó el filtro de ser realmente de Cloudflare
    if (isset($_SERVER['HTTP_CF_CONNECTING_IP']) && (isCloudflareIP($remoteIp) || $isLocalIp)) {
        return $_SERVER['HTTP_CF_CONNECTING_IP'];
    }
    return $remoteIp ?: '0.0.0.0';
}

// ===== CONFIGURACIÓN DEL SITIO =====
define('SITE_URL', envValue('APP_URL', 'http://localhost/congreso'));
define('UPLOAD_DIR', __DIR__ . '/../uploads/receipts/');
define('MAX_UPLOAD_SIZE', 20 * 1024 * 1024); // 20MB
define('TEST_MODE_ENABLE_ALL_STAGES', false);

// ===== CONFIGURACIÓN DE EMAIL TRANSACCIONAL =====
define('MAIL_PROVIDER', envValue('MAIL_PROVIDER', 'smtp'));
define('BREVO_API_KEY', envValue('BREVO_API_KEY', ''));
define('MAIL_FROM_ADDRESS', envValue('MAIL_FROM_ADDRESS', envValue('MAIL_FROM_EMAIL', envValue('SMTP_USER', 'no-reply@renovatec.mx'))));
define('MAIL_FROM_NAME', envValue('MAIL_FROM_NAME', 'RENOVATEC'));
define('SMTP_HOST', envValue('SMTP_HOST', envValue('MAIL_HOST', 'smtp.gmail.com')));
define('SMTP_PORT', (int) envValue('SMTP_PORT', envValue('MAIL_PORT', '587')));
define('SMTP_USER', envValue('SMTP_USER', envValue('MAIL_USERNAME', '')));
define('SMTP_PASSWORD', envValue('SMTP_PASSWORD', envValue('MAIL_PASSWORD', '')));
define('SMTP_ENCRYPTION', strtolower((string) envValue('SMTP_ENCRYPTION', 'tls')));

$now = new DateTime('now');
$eventCutoff = new DateTime($now->format('Y') . '-10-23 17:00:00');
$eventYear = ((int) $now->format('U') <= (int) $eventCutoff->format('U'))
    ? (int) $now->format('Y')
    : ((int) $now->format('Y') + 1);

// ===== ETAPAS DE REGISTRO =====
$stages_array = [
    1 => [
        'id' => 1,
        'name' => 'Etapa 1',
        'start' => sprintf('%d-04-01', $eventYear),
        'end' => sprintf('%d-06-30', $eventYear),
        'price' => 130,
        'color' => '#28a745'
    ],
    2 => [
        'id' => 2,
        'name' => 'Etapa 2',
        'start' => sprintf('%d-07-01', $eventYear),
        'end' => sprintf('%d-08-31', $eventYear),
        'price' => 200,
        'color' => '#007bff'
    ],
    3 => [
        'id' => 3,
        'name' => 'Etapa 3',
        'start' => sprintf('%d-09-01', $eventYear),
        'end' => sprintf('%d-10-23', $eventYear),
        'price' => 350,
        'color' => '#fd7e14'
    ]
];
define('REGISTRATION_STAGES_JSON', json_encode($stages_array));
define('REGISTRATION_STAGES', $stages_array);

// ===== EVENTO =====
define('EVENT_DATE', sprintf('%d-10-23 09:00:00', $eventYear));
define('EVENT_END_DATE', sprintf('%d-10-23 17:00:00', $eventYear));

// ===== CONECTAR A BD =====
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => FALSE,
        ]
    );
} catch (PDOException $e) {
    error_log('[RENOVATEC][DB] ' . $e->getMessage() . ' | host=' . DB_HOST . ' | db=' . DB_NAME . ' | user=' . DB_USER . ' | env=' . ENV_SOURCE);

    http_response_code(500);
    $errorPayload = ['error' => 'Error de conexión a la base de datos'];
    if (APP_DEBUG) {
        $errorPayload['details'] = $e->getMessage();
        $errorPayload['config'] = [
            'host' => DB_HOST,
            'port' => DB_PORT,
            'db' => DB_NAME,
            'user' => DB_USER,
            'env_source' => ENV_SOURCE,
        ];
    }
    die(json_encode($errorPayload));
}

// ===== HELPER: Obtener etapa actual =====
function getCurrentStage() {
    $stages = REGISTRATION_STAGES;
    $today = date('Y-m-d');
    
    foreach ($stages as $stage) {
        if ($today >= $stage['start'] && $today <= $stage['end']) {
            return $stage;
        }
    }

    if (TEST_MODE_ENABLE_ALL_STAGES) {
        return $stages[1];
    }
    
    return null;
}

// ===== HELPER: Generar FOLIO =====
function generateFolio() {
    return 'RENOV-' . date('YmdHis') . '-' . mt_rand(1000, 9999);
}

// ===== HELPER: Sanitizar datos =====
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

// ===== HEADERS CORS =====
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Admin-Token');
header('Content-Type: application/json; charset=utf-8');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ===== CREAR DIRECTORIO DE UPLOADS =====
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// ===== AUTO-REPARACIÓN DE MANTENIMIENTO (PROTECCIÓN CONTRA DESPLIEGUES) =====
if (!defined('MAINTENANCE_CHECKED')) {
    define('MAINTENANCE_CHECKED', true);
    try {
        $stmtM = $pdo->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('maintenance_active', 'maintenance_start', 'maintenance_end', 'maintenance_token')");
        $mS = $stmtM->fetchAll(PDO::FETCH_KEY_PAIR);
        if (($mS['maintenance_active'] ?? '0') === '1') {
            $ht = __DIR__ . '/../../.htaccess';
            if (file_exists($ht)) {
                $c = file_get_contents($ht);
                if (strpos($c, '# BEGIN MAINTENANCE') === false && !empty($mS['maintenance_start']) && !empty($mS['maintenance_end'])) {
                    $st = date('YmdHi', strtotime($mS['maintenance_start']) - 60);
                    $ed = date('YmdHi', strtotime($mS['maintenance_end']));
                    $tk = $mS['maintenance_token'];
                    $b = "\n# BEGIN MAINTENANCE\nRewriteCond %{TIME_YEAR}%{TIME_MON}%{TIME_DAY}%{TIME_HOUR}%{TIME_MIN} >$st\nRewriteCond %{TIME_YEAR}%{TIME_MON}%{TIME_DAY}%{TIME_HOUR}%{TIME_MIN} <$ed\nRewriteCond %{HTTP_COOKIE} !dev_bypass=$tk\nRewriteCond %{REQUEST_URI} !^/mantenimiento\.php$\nRewriteCond %{REQUEST_URI} !^/dev\.php$\nRewriteCond %{REQUEST_URI} !\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$\nRewriteRule ^(.*)$ /mantenimiento.php [R=302,L]\n# END MAINTENANCE\n";
                    file_put_contents($ht, preg_replace('/(RewriteEngine On\r?\n(?:\s*RewriteBase \/\r?\n)?)/', "$1" . $b, $c));
                }
            }
        }
    } catch (Throwable $e) {}
}
