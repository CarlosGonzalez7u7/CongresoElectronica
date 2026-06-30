<?php
/**
 * API: Validar disponibilidad de correo y numero de control en registro.
 * GET /app/api/auth-check-availability.php?email=x&controlNumber=y
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metodo no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);

    $email = strtolower(sanitizeText($_GET['email'] ?? ''));
    $controlNumber = strtolower(sanitizeText($_GET['controlNumber'] ?? ''));

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
    ];

    if ($email !== '') {
        $data['email']['checked'] = true;
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $data['email']['available'] = false;
            $data['email']['message'] = 'Correo invalido.';
        } else {
            $stmt = $pdo->prepare("
                SELECT 'platform' AS source, email_verified FROM platform_users WHERE LOWER(email) = ?
                UNION ALL
                SELECT 'admin' AS source, 1 AS email_verified FROM admin_users WHERE LOWER(email) = ?
                UNION ALL
                SELECT 'instructor' AS source, 1 AS email_verified FROM workshop_instructors WHERE LOWER(email) = ?
                LIMIT 1
            ");
            $stmt->execute([$email, $email, $email]);
            $found = $stmt->fetch();
            if ($found) {
                if ($found['source'] === 'platform' && (int)($found['email_verified'] ?? 1) === 0) {
                    $data['email']['available'] = true;
                    $data['email']['message'] = 'Este correo tiene verificacion pendiente; puedes continuar para reenviar el codigo.';
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
                SELECT 'platform' AS source, email, email_verified FROM platform_users WHERE LOWER(username) = ? OR LOWER(control_number) = ? LIMIT 1
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
                (int)($foundPlatform['email_verified'] ?? 1) === 0 &&
                $email !== '' &&
                strtolower((string)$foundPlatform['email']) === $email
            ) {
                $data['controlNumber']['available'] = true;
                $data['controlNumber']['message'] = 'Numero asociado a una verificacion pendiente; puedes continuar.';
            } elseif ($foundPlatform || $foundAdmin || $foundInstructor) {
                $data['controlNumber']['available'] = false;
                $data['controlNumber']['message'] = 'Este numero de control ya esta en uso.';
            } else {
                $data['controlNumber']['message'] = 'Numero de control disponible.';
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
