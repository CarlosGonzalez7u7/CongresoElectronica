<?php
/**
 * API: Recuperacion de cuenta de usuario
 * POST /api/auth-recover-account.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);

    $input = jsonInputOrFail();
    $action = strtolower(sanitizeText($input['action'] ?? ''));

    if ($action === 'request_code') {
        handleRecoverRequest($pdo, $input);
    } elseif ($action === 'reset_password') {
        handleRecoverReset($pdo, $input);
    } else {
        throw new Exception('Accion no valida');
    }
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo completar la recuperacion',
    ]);
}

function handleRecoverRequest(PDO $pdo, array $input): void
{
    $identifier = strtolower(sanitizeText($input['identifier'] ?? ''));

    if ($identifier === '') {
        throw new Exception('Ingresa tu usuario o correo');
    }

    $stmt = $pdo->prepare(
        'SELECT id, email, username, email_verified, is_active FROM platform_users
         WHERE LOWER(email) = ? OR LOWER(username) = ?
         LIMIT 1'
    );
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('No existe una cuenta con esos datos');
    }

    if ((int) $user['is_active'] !== 1) {
        throw new Exception('La cuenta se encuentra inactiva');
    }

    if ((int) $user['email_verified'] !== 1) {
        throw new Exception('Primero verifica tu correo antes de recuperar la cuenta');
    }

    $code = randomVerificationCode();
    $expiresAt = (new DateTime('now'))->add(new DateInterval('PT20M'))->format('Y-m-d H:i:s');

    $stmtUpdate = $pdo->prepare(
        'UPDATE platform_users
         SET email_verification_code = ?, email_verification_expires_at = ?, updated_at = NOW()
         WHERE id = ?'
    );
    $stmtUpdate->execute([$code, $expiresAt, (int) $user['id']]);

    $sent = sendRecoveryEmail((string) $user['email'], (string) $user['username'], $code);
    if (empty($sent['ok'])) {
        throw new Exception($sent['error'] ?? 'No se pudo enviar el codigo de recuperacion');
    }

    $_SESSION['platform_recovery_pending_id'] = (int) $user['id'];
    $_SESSION['platform_recovery_identifier'] = $identifier;

    echo json_encode([
        'success' => true,
        'message' => 'Codigo enviado',
    ]);
}

function handleRecoverReset(PDO $pdo, array $input): void
{
    $identifier = strtolower(sanitizeText($input['identifier'] ?? ''));
    $code = sanitizeText($input['code'] ?? '');
    $password = (string) ($input['password'] ?? '');
    $confirmPassword = (string) ($input['confirmPassword'] ?? '');

    if ($identifier === '' || $code === '' || $password === '' || $confirmPassword === '') {
        throw new Exception('Completa todos los campos');
    }

    if ($password !== $confirmPassword) {
        throw new Exception('La contraseña y su confirmacion no coinciden');
    }

    $pendingId = (int) ($_SESSION['platform_recovery_pending_id'] ?? 0);
    $pendingIdentifier = strtolower((string) ($_SESSION['platform_recovery_identifier'] ?? ''));

    if ($pendingId <= 0 || $pendingIdentifier === '' || $pendingIdentifier !== $identifier) {
        throw new Exception('Primero solicita el codigo de recuperacion');
    }

    $stmt = $pdo->prepare(
        'SELECT id, email_verification_code, email_verification_expires_at, email_verified, is_active
         FROM platform_users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$pendingId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('No se encontro la cuenta');
    }

    if ((int) $user['is_active'] !== 1 || (int) $user['email_verified'] !== 1) {
        throw new Exception('La cuenta no esta lista para recuperacion');
    }

    if ((string) $user['email_verification_code'] !== $code) {
        throw new Exception('Codigo incorrecto');
    }

    $expiresAt = !empty($user['email_verification_expires_at'])
        ? strtotime((string) $user['email_verification_expires_at'])
        : false;

    if ($expiresAt !== false && $expiresAt < time()) {
        throw new Exception('El codigo expiro');
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmtUpdate = $pdo->prepare(
        'UPDATE platform_users
         SET password_hash = ?, email_verification_code = NULL, email_verification_expires_at = NULL, updated_at = NOW()
         WHERE id = ?'
    );
    $stmtUpdate->execute([$passwordHash, (int) $user['id']]);

    unset($_SESSION['platform_recovery_pending_id']);
    unset($_SESSION['platform_recovery_identifier']);

    echo json_encode([
        'success' => true,
        'message' => 'Contraseña actualizada',
    ]);
}