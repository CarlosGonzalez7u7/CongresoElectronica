<?php
/**
 * API: Validar disponibilidad de correo, telefono y numero de control en registro.
 * GET /app/api/auth-check-availability.php?email=x&controlNumber=y&phone=z
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);
    cleanupExpiredUnverifiedUsers($pdo, 30);

    $email = strtolower(sanitizeText($_GET['email'] ?? ''));
    $controlNumber = strtolower(sanitizeText($_GET['controlNumber'] ?? ''));
    $phone = normalizePhoneForAvailability(sanitizeText($_GET['phone'] ?? ''));

    $data = [
        'email' => [
            'checked' => false,
            'available' => true,
            'message' => '',
        ],
        'controlNumber' => [
            'checked' => false,
            'available' => true,
            'message' => '',
        ],
        'phone' => [
            'checked' => false,
            'available' => true,
            'message' => '',
        ],
    ];

    if ($email !== '') {
        $data['email']['checked'] = true;
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $data['email']['available'] = false;
            $data['email']['message'] = 'Correo invalido.';
        } else {
            $stmt = $pdo->prepare("
                SELECT 'platform' AS source, email_verified, email_verification_expires_at FROM platform_users WHERE LOWER(email) = ?
                UNION ALL
                SELECT 'admin' AS source, 1 AS email_verified, NULL AS email_verification_expires_at FROM admin_users WHERE LOWER(email) = ?
                UNION ALL
                SELECT 'instructor' AS source, 1 AS email_verified, NULL AS email_verification_expires_at FROM workshop_instructors WHERE LOWER(email) = ?
                LIMIT 1
            ");
            $stmt->execute([$email, $email, $email]);
            $found = $stmt->fetch();
            if ($found) {
                if ($found['source'] === 'platform' && (int)($found['email_verified'] ?? 1) === 0) {
                    $data['email']['available'] = true;
                    $data['email']['pending_verification'] = true;
                    $data['email']['message'] = pendingVerificationMessage((string)($found['email_verification_expires_at'] ?? ''));
                } else {
                    $data['email']['available'] = false;
                    $data['email']['message'] = 'Este correo ya esta registrado.';
                }
            } else {
                $data['email']['message'] = 'Correo disponible.';
            }
        }
    }

    if ($controlNumber !== '') {
        $data['controlNumber']['checked'] = true;
        if (!preg_match('/^[a-z0-9_.\-]{4,60}$/', $controlNumber)) {
            $data['controlNumber']['available'] = false;
            $data['controlNumber']['message'] = 'Usa 4 a 60 caracteres: letras, numeros, punto, guion o guion bajo.';
        } else {
            $stmt = $pdo->prepare("
                SELECT 'platform' AS source, email, email_verified, email_verification_expires_at FROM platform_users WHERE LOWER(username) = ? OR LOWER(control_number) = ? LIMIT 1
            ");
            $stmt->execute([$controlNumber, $controlNumber]);
            $foundPlatform = $stmt->fetch();

            $stmtAdmin = $pdo->prepare("
                SELECT 'admin' AS source FROM admin_users WHERE LOWER(username) = ? LIMIT 1
            ");
            $stmtAdmin->execute([$controlNumber]);
            $foundAdmin = $stmtAdmin->fetch();

            $stmtInstructor = $pdo->prepare("
                SELECT 'instructor' AS source FROM workshop_instructors WHERE LOWER(username) = ? LIMIT 1
            ");
            $stmtInstructor->execute([$controlNumber]);
            $foundInstructor = $stmtInstructor->fetch();

            if (
                $foundPlatform &&
                (int)($foundPlatform['email_verified'] ?? 1) === 0
            ) {
                $samePendingEmail = $email !== '' && strtolower((string)$foundPlatform['email']) === $email;
                $data['controlNumber']['available'] = $samePendingEmail;
                $data['controlNumber']['pending_verification'] = true;
                $data['controlNumber']['message'] = $samePendingEmail
                    ? pendingVerificationMessage((string)($foundPlatform['email_verification_expires_at'] ?? ''))
                    : 'Este numero de control pertenece a una cuenta que aun no verifica su correo. Pide un codigo nuevo con el correo original, espera hasta 30 minutos para volver a registrarte o comunicate con el equipo organizador.';
            } elseif ($foundPlatform || $foundAdmin || $foundInstructor) {
                $data['controlNumber']['available'] = false;
                $data['controlNumber']['message'] = 'Este numero de control ya esta en uso.';
            } else {
                $data['controlNumber']['message'] = 'Numero de control disponible.';
            }
        }
    }

    if ($phone !== '') {
        $data['phone']['checked'] = true;
        if (!preg_match('/^\+?[0-9]{7,20}$/', $phone)) {
            $data['phone']['available'] = false;
            $data['phone']['message'] = 'Telefono invalido.';
        } else {
            $stmt = $pdo->prepare("
                SELECT 'platform' AS source, email, email_verified, email_verification_expires_at
                FROM platform_users
                WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
                LIMIT 1
            ");
            $phoneDigits = ltrim($phone, '+');
            $stmt->execute([$phoneDigits]);
            $foundPlatform = $stmt->fetch();

            $stmtInstructor = $pdo->prepare("
                SELECT 'instructor' AS source
                FROM workshop_instructors
                WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = ?
                LIMIT 1
            ");
            $stmtInstructor->execute([$phoneDigits]);
            $foundInstructor = $stmtInstructor->fetch();

            if (
                $foundPlatform &&
                (int)($foundPlatform['email_verified'] ?? 1) === 0
            ) {
                $samePendingEmail = $email !== '' && strtolower((string)$foundPlatform['email']) === $email;
                $data['phone']['available'] = $samePendingEmail;
                $data['phone']['pending_verification'] = true;
                $data['phone']['message'] = $samePendingEmail
                    ? pendingVerificationMessage((string)($foundPlatform['email_verification_expires_at'] ?? ''))
                    : 'Este telefono pertenece a una cuenta que aun no verifica su correo. Pide un codigo nuevo con el correo original, espera hasta 30 minutos para volver a registrarte o comunicate con el equipo organizador.';
            } elseif ($foundPlatform || $foundInstructor) {
                $data['phone']['available'] = false;
                $data['phone']['message'] = 'Este telefono ya esta registrado.';
            } else {
                $data['phone']['message'] = 'Telefono disponible.';
            }
        }
    }

    echo json_encode(['success' => true, 'data' => $data]);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo validar disponibilidad',
    ]);
}

function normalizePhoneForAvailability(string $phone): string
{
    $phone = trim($phone);
    if ($phone === '') {
        return '';
    }
    $hasPlus = str_starts_with($phone, '+');
    $digits = preg_replace('/\D+/', '', $phone);
    if ($digits === '') {
        return '';
    }
    return $hasPlus ? '+' . $digits : $digits;
}
