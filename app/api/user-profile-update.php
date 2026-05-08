<?php
/**
 * API: Actualizar perfil base del usuario desde wizard
 * POST /api/user-profile-update.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);

    $input = jsonInputOrFail();

    $userId = requireLoggedInUser();
    $fullName = sanitizeText($input['full_name'] ?? '');
    $school = sanitizeText($input['school'] ?? '');
    $controlNumber = sanitizeText($input['control_number'] ?? '');
    $career = sanitizeText($input['career'] ?? '');
    $semester = sanitizeText($input['semester'] ?? '');
    $country = sanitizeText($input['country'] ?? '');
    $city = sanitizeText($input['city'] ?? '');
    $phone = sanitizeText($input['phone'] ?? '');
    $email = strtolower(trim((string) ($input['email'] ?? '')));

    if (
        $fullName === '' ||
        $school === '' ||
        $controlNumber === '' ||
        $career === '' ||
        $semester === '' ||
        $country === '' ||
        $city === '' ||
        $phone === '' ||
        $email === ''
    ) {
        throw new Exception('Completa todos los campos del paso de datos personales');
    }

    $stmt = $pdo->prepare('SELECT id, email FROM platform_users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) {
        throw new Exception('Usuario no encontrado');
    }

    $sql = '
        UPDATE platform_users
        SET full_name = ?, school = ?, control_number = ?, career = ?, semester = ?,
            career_semester = ?, country = ?, city = ?, phone = ?, updated_at = NOW()
        WHERE id = ?
    ';

    $pdo->prepare($sql)->execute([
        $fullName,
        $school,
        $controlNumber,
        $career,
        $semester,
        $career . ' - ' . $semester,
        $country,
        $city,
        $phone,
        $userId,
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Datos actualizados',
        'data' => [
            'id' => $userId,
            'email' => $user['email'],
            'full_name' => $fullName,
            'school' => $school,
            'control_number' => $controlNumber,
            'career' => $career,
            'semester' => $semester,
            'country' => $country,
            'city' => $city,
            'phone' => $phone,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo actualizar el perfil',
    ]);
}
