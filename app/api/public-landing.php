<?php
/**
 * API: Endpoint público para alimentar la Landing Page dinámicamente
 */
require_once __DIR__ . '/../config/database.php';

try {
    $data = [];
    $data['convocatorias'] = $pdo->query("SELECT * FROM convocatorias WHERE is_active = 1 ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    $stmtSet = $pdo->query("SELECT setting_key, setting_value FROM system_settings");
    $settings = [];
    foreach ($stmtSet->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    $data['settings'] = $settings;

    echo json_encode(['success' => true, 'data' => $data]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}