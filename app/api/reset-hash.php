<?php
require_once __DIR__ . '/_auth_common.php';
$nuevaPassword = '123456';
$hash = password_hash($nuevaPassword, PASSWORD_BCRYPT);
$pdo->prepare("UPDATE workshop_instructors SET password_hash = ? WHERE id = 1")->execute([$hash]);
echo json_encode(['ok' => true, 'hash' => $hash]);