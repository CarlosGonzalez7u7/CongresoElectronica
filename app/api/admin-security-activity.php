<?php
/**
 * API: Registro de Actividad de Seguridad y Monitoreo (Admin)
 * GET /api/admin-security-activity.php
 */
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    // Extraer los últimos 500 registros de la base de datos
    $stmt = $pdo->query("
        SELECT 
            id,
            action,
            table_name as source,
            ip_address as ip,
            'Desconocido' as browser,
            'Desconocido' as device,
            changes as detail,
            created_at as timestamp
        FROM audit_log
        ORDER BY created_at DESC
        LIMIT 500
    ");
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Formatear los datos para el frontend
    $formattedEvents = array_map(function($event) {
        $detail = '';
        if (!empty($event['detail'])) {
            $decoded = json_decode($event['detail'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $detail = implode(', ', array_map(
                    function($k, $v) { return is_string($v) ? "$k: $v" : "$k: " . json_encode($v); },
                    array_keys($decoded),
                    $decoded
                ));
            } else {
                $detail = $event['detail'];
            }
        }
        
        // Determinar de dónde viene la acción
        $source = 'registration';
        if (str_contains(strtolower($event['action']), 'admin') || str_contains(strtolower($event['source']), 'admin') || str_contains(strtolower($event['action']), 'congress_') || str_contains(strtolower($event['action']), 'workshop_')) {
            $source = 'admin';
        }

        return [
            'id' => $event['id'],
            'action' => $event['action'],
            'source' => $source,
            'ip' => $event['ip'] ?: '127.0.0.1',
            'browser' => $event['browser'],
            'device' => $event['device'],
            'detail' => ltrim($detail, ', '),
            'timestamp' => $event['timestamp']
        ];
    }, $events);

    echo json_encode([
        'success' => true,
        'data' => [
            'events' => $formattedEvents,
            'summary' => [
                'total_events' => count($events),
                'unique_ips_24h' => count(array_unique(array_column($formattedEvents, 'ip'))),
                'admin_actions' => count(array_filter($formattedEvents, function($e) { return $e['source'] === 'admin'; })),
                'registration_events' => count(array_filter($formattedEvents, function($e) { return $e['source'] === 'registration'; }))
            ]
        ]
    ]);

} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}