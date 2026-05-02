<?php
/**
 * API: SEGURIDAD Y MONITOREO (ADMIN)
 * GET /api/admin-security-activity.php
 */

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensureAuditTable($pdo);
    ensureLegalAcceptanceTable($pdo);

    $adminEvents = fetchAdminAuditEvents($pdo, 250);
    $registrationEvents = fetchRegistrationAccessEvents($pdo, 250);

    $events = array_merge($adminEvents, $registrationEvents);
    usort($events, static function ($left, $right) {
        $leftTs = strtotime((string)($left['timestamp'] ?? '')) ?: 0;
        $rightTs = strtotime((string)($right['timestamp'] ?? '')) ?: 0;
        return $rightTs <=> $leftTs;
    });

    $events = array_slice($events, 0, 300);

    $summary = buildSummary($events);

    echo json_encode([
        'success' => true,
        'data' => [
            'events' => $events,
            'summary' => $summary,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}

function fetchAdminAuditEvents(PDO $pdo, int $limit = 200): array
{
    $stmt = $pdo->prepare("\n        SELECT
            a.id,
            a.action,
            a.table_name,
            a.record_id,
            a.ip_address,
            a.changes,
            a.created_at,
            t.folio,
            t.captain_name
        FROM audit_log a
        LEFT JOIN teams t ON t.id = a.record_id
        ORDER BY a.created_at DESC
        LIMIT :limit
    ");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();
    $events = [];

    foreach ($rows as $row) {
        $notes = extractAuditNotes($row['changes'] ?? null);
        $ua = '';
        $fingerprint = parseUserAgentFingerprint($ua);
        $action = formatAuditAction($row['action'] ?? 'ADMIN_ACTION');
        $detail = trim((string)($notes ?: 'Actividad administrativa registrada'));

        if (!empty($row['folio'])) {
            $detail .= ' · Folio ' . $row['folio'];
        }

        $events[] = [
            'source' => 'admin',
            'timestamp' => $row['created_at'] ?? null,
            'action' => $action,
            'ip' => $row['ip_address'] ?: '-',
            'browser' => $fingerprint['browser'],
            'device' => $fingerprint['device'],
            'detail' => $detail,
        ];
    }

    return $events;
}

function fetchRegistrationAccessEvents(PDO $pdo, int $limit = 200): array
{
    $stmt = $pdo->prepare("\n        SELECT
            la.id,
            la.ip_address,
            la.user_agent,
            la.accepted_at,
            la.accepted_liability,
            la.accepted_terms,
            t.folio,
            t.captain_name,
            t.school_name
        FROM legal_acceptance la
        INNER JOIN teams t ON t.id = la.team_id
        ORDER BY la.accepted_at DESC
        LIMIT :limit
    ");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();
    $events = [];

    foreach ($rows as $row) {
        $fingerprint = parseUserAgentFingerprint((string)($row['user_agent'] ?? ''));

        $events[] = [
            'source' => 'registration',
            'timestamp' => $row['accepted_at'] ?? null,
            'action' => 'Registro con aceptación legal',
            'ip' => $row['ip_address'] ?: '-',
            'browser' => $fingerprint['browser'],
            'device' => $fingerprint['device'],
            'detail' => trim(sprintf(
                'Folio %s · %s · %s',
                (string)($row['folio'] ?: '-'),
                (string)($row['captain_name'] ?: 'Sin capitán'),
                (string)($row['school_name'] ?: 'Sin escuela')
            )),
        ];
    }

    return $events;
}

function buildSummary(array $events): array
{
    $now = time();
    $cutoff24h = $now - 86400;

    $uniqueIps24h = [];
    $adminActions = 0;
    $registrationEvents = 0;

    foreach ($events as $event) {
        $timestamp = strtotime((string)($event['timestamp'] ?? '')) ?: 0;
        $ip = (string)($event['ip'] ?? '');

        if ($timestamp >= $cutoff24h && $ip !== '' && $ip !== '-') {
            $uniqueIps24h[$ip] = true;
        }

        if (($event['source'] ?? '') === 'admin') {
            $adminActions++;
        }
        if (($event['source'] ?? '') === 'registration') {
            $registrationEvents++;
        }
    }

    return [
        'total_events' => count($events),
        'unique_ips_24h' => count($uniqueIps24h),
        'admin_actions' => $adminActions,
        'registration_events' => $registrationEvents,
    ];
}

function extractAuditNotes($changes): string
{
    if (is_string($changes) && trim($changes) !== '') {
        $decoded = json_decode($changes, true);
        if (is_array($decoded) && isset($decoded['notes'])) {
            return (string)$decoded['notes'];
        }
        return $changes;
    }

    return '';
}

function formatAuditAction(string $action): string
{
    $map = [
        'PAYMENT_VERIFIED' => 'Pago verificado',
        'PAYMENT_REJECTED' => 'Pago rechazado',
    ];

    if (isset($map[$action])) {
        return $map[$action];
    }

    return ucwords(strtolower(str_replace('_', ' ', $action)));
}

function parseUserAgentFingerprint(string $ua): array
{
    $uaLower = strtolower($ua);

    $browser = 'No disponible';
    if ($ua === '') {
        $browser = 'No disponible';
    } elseif (strpos($uaLower, 'edg/') !== false) {
        $browser = 'Edge';
    } elseif (strpos($uaLower, 'opr/') !== false || strpos($uaLower, 'opera') !== false) {
        $browser = 'Opera';
    } elseif (strpos($uaLower, 'chrome/') !== false) {
        $browser = 'Chrome';
    } elseif (strpos($uaLower, 'firefox/') !== false) {
        $browser = 'Firefox';
    } elseif (strpos($uaLower, 'safari/') !== false) {
        $browser = 'Safari';
    }

    $brand = 'Desconocida';
    if (strpos($uaLower, 'iphone') !== false || strpos($uaLower, 'ipad') !== false || strpos($uaLower, 'macintosh') !== false) {
        $brand = 'Apple';
    } elseif (strpos($uaLower, 'samsung') !== false) {
        $brand = 'Samsung';
    } elseif (strpos($uaLower, 'xiaomi') !== false || strpos($uaLower, 'redmi') !== false || strpos($uaLower, 'mi ') !== false) {
        $brand = 'Xiaomi';
    } elseif (strpos($uaLower, 'huawei') !== false || strpos($uaLower, 'honor') !== false) {
        $brand = 'Huawei/Honor';
    } elseif (strpos($uaLower, 'motorola') !== false || strpos($uaLower, 'moto') !== false) {
        $brand = 'Motorola';
    } elseif (strpos($uaLower, 'windows') !== false) {
        $brand = 'PC Windows';
    } elseif (strpos($uaLower, 'linux') !== false) {
        $brand = 'Linux';
    }

    $deviceType = 'Equipo';
    if (strpos($uaLower, 'mobile') !== false) {
        $deviceType = 'Móvil';
    } elseif (strpos($uaLower, 'tablet') !== false || strpos($uaLower, 'ipad') !== false) {
        $deviceType = 'Tablet';
    }

    return [
        'browser' => $browser,
        'device' => $brand . ' · ' . $deviceType,
    ];
}

function ensureAuditTable(PDO $pdo): void
{
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            action VARCHAR(100) NOT NULL,
            table_name VARCHAR(100),
            record_id INT,
            user_id INT,
            ip_address VARCHAR(45),
            changes JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_action (action),
            INDEX idx_date (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function ensureLegalAcceptanceTable(PDO $pdo): void
{
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS legal_acceptance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            team_id INT NOT NULL,
            accepted_liability BOOLEAN DEFAULT FALSE,
            accepted_terms BOOLEAN DEFAULT FALSE,
            ip_address VARCHAR(45),
            user_agent VARCHAR(500),
            accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}
