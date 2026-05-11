<?php
require_once __DIR__ . '/_auth_common.php';
$input = ['username' => 'Osvaldo', 'password' => 'TU_CONTRASEÑA'];
$stmt = $pdo->prepare('SELECT id, username, full_name, email, password_hash, is_active FROM workshop_instructors WHERE LOWER(username) = ? LIMIT 1');
$stmt->execute([strtolower($input['username'])]);
$instructor = $stmt->fetch();
echo json_encode([
    'instructor_found' => (bool)$instructor,
    'password_ok' => $instructor ? password_verify($input['password'], $instructor['password_hash']) : false,
    'data' => $instructor ?: null
]);