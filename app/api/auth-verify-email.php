<?php
/**
 * API: Verificar correo de cuenta
 * POST /api/auth-verify-email.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);
    cleanupExpiredUnverifiedUsers($pdo, 30);

    $input = jsonInputOrFail();
    $email = strtolower(sanitizeText($input['email'] ?? ''));
    $code = sanitizeText($input['code'] ?? '');

    if ($email === '' || $code === '') {
        throw new Exception('Correo y codigo requeridos');
    }

    $stmt = $pdo->prepare('SELECT id, email_verification_code, email_verification_expires_at, email_verified FROM platform_users WHERE LOWER(email) = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        throw new Exception('No existe una cuenta con ese correo');
    }

    if ((int) $user['email_verified'] === 1) {
        echo json_encode([
            'success' => true,
            'message' => 'El correo ya estaba verificado',
        ]);
        exit;
    }

    if ((string) $user['email_verification_code'] !== $code) {
        throw new Exception('Codigo de verificacion invalido');
    }

    $expiresAt = (string) ($user['email_verification_expires_at'] ?? '');
    if ($expiresAt === '' || strtotime($expiresAt) < time()) {
        throw new Exception('El codigo ya vencio. Solicita uno nuevo.');
    }

    $stmtUpdate = $pdo->prepare('UPDATE platform_users SET email_verified = 1, email_verification_code = NULL, email_verification_expires_at = NULL, updated_at = NOW() WHERE id = ?');
    $stmtUpdate->execute([(int) $user['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Correo verificado correctamente',
    ]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo verificar el correo',
    ]);
}
