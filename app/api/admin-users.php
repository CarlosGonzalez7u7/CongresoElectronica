<?php
/**
 * API: GESTIÓN DE USUARIOS (ADMIN)
 * GET /api/admin-users.php -> Lista todos los usuarios
 * POST /api/admin-users.php -> Cambia rol (requiere contraseña superadmin)
 */
require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$method = $_SERVER['REQUEST_METHOD'];

function ensurePlatformAccountStatusColumns(PDO $pdo): void
{
    $columns = [
        'account_status' => "ALTER TABLE platform_users ADD COLUMN account_status ENUM('active','banned','deactivated') NOT NULL DEFAULT 'active' AFTER is_active",
        'admin_status_reason' => "ALTER TABLE platform_users ADD COLUMN admin_status_reason TEXT NULL AFTER account_status",
        'status_updated_by' => "ALTER TABLE platform_users ADD COLUMN status_updated_by VARCHAR(60) NULL AFTER admin_status_reason",
        'status_updated_at' => "ALTER TABLE platform_users ADD COLUMN status_updated_at DATETIME NULL AFTER status_updated_by",
    ];

    foreach ($columns as $name => $sql) {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute(['platform_users', $name]);
        if ((int)$stmt->fetchColumn() === 0) {
            $pdo->exec($sql);
        }
    }
}

function requireSuperadminForUserAction(PDO $pdo, array $input, string $permissionLabel): array
{
    $adminPassword = (string)($input['admin_password'] ?? '');
    $currentAdminUsername = trim((string)($input['current_admin'] ?? ''));

    if ($currentAdminUsername === '') {
        throw new Exception('Administrador actual requerido.');
    }

    $sessionAdminId = (int)($_SESSION['admin_id'] ?? 0);
    $stmtAuth = $pdo->prepare("SELECT id, username, password_hash, role FROM admin_users WHERE is_active = 1 AND (id = ? OR username = ?) LIMIT 1");
    $stmtAuth->execute([$sessionAdminId, $currentAdminUsername]);
    $admin = $stmtAuth->fetch();

    if (!$admin) {
        throw new Exception('Administrador no encontrado o inactivo.');
    }

    $isGoogleAdminSession =
        ($_SESSION['admin_auth_provider'] ?? $_SESSION['auth_provider'] ?? '') === 'google'
        && (int)($_SESSION['admin_id'] ?? 0) === (int)$admin['id'];

    if (!$isGoogleAdminSession && !password_verify($adminPassword, $admin['password_hash'])) {
        throw new Exception('Contraseña de administrador incorrecta. Autorización denegada.');
    }

    if ($admin['role'] !== 'superadmin') {
        throw new Exception('Solo un superadmin puede ' . $permissionLabel . '.');
    }

    return $admin;
}

try {
    ensurePlatformAccountStatusColumns($pdo);

    if ($method === 'GET') {
        $stmtP = $pdo->query("SELECT id, username, full_name, email, phone, school, country, city, career, semester, matricula, control_number, role, is_active, account_status, admin_status_reason, status_updated_by, status_updated_at, 'platform' as source FROM platform_users");
        $platformUsers = $stmtP->fetchAll();

        $stmtA = $pdo->query("SELECT id, username, full_name, email, '' as phone, '' as school, '' as country, '' as city, '' as career, '' as semester, '' as matricula, '' as control_number, role, is_active, 'admin' as source FROM admin_users");
        $adminUsers = $stmtA->fetchAll();

        $map = [];

        foreach ($platformUsers as $u) {
            $key = strtolower($u['username']);
            $map[$key] = [
                'platform_id' => $u['id'],
                'admin_id' => null,
                'username' => $u['username'],
                'full_name' => $u['full_name'],
                'email' => $u['email'],
                'phone' => $u['phone'],
                'school' => $u['school'],
                'country' => $u['country'],
                'city' => $u['city'],
                'career' => $u['career'],
                'semester' => $u['semester'],
                'matricula' => $u['matricula'],
                'control_number' => $u['control_number'],
                'role' => $u['role'] === 'alumno' ? 'estudiante' : $u['role'],
                'account_status' => $u['account_status'] ?: ((int)$u['is_active'] ? 'active' : 'deactivated'),
                'admin_status_reason' => $u['admin_status_reason'] ?? '',
                'status_updated_by' => $u['status_updated_by'] ?? '',
                'status_updated_at' => $u['status_updated_at'] ?? ''
            ];
        }

        foreach ($adminUsers as $u) {
            $key = strtolower($u['username']);
            if (isset($map[$key])) {
                $map[$key]['admin_id'] = $u['id'];
                $map[$key]['role'] = $u['role'];
            } else {
                $map[$key] = [
                    'platform_id' => null,
                    'admin_id' => $u['id'],
                    'username' => $u['username'],
                    'full_name' => $u['full_name'],
                    'email' => $u['email'],
                    'phone' => '',
                    'school' => '',
                    'country' => '',
                    'city' => '',
                    'career' => '',
                    'semester' => '',
                    'matricula' => '',
                    'control_number' => '',
                    'role' => $u['role'],
                    'account_status' => (int)$u['is_active'] ? 'active' : 'deactivated',
                    'admin_status_reason' => '',
                    'status_updated_by' => '',
                    'status_updated_at' => ''
                ];
            }
        }

        echo json_encode(['success' => true, 'data' => array_values($map)]);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) throw new Exception('Payload inválido');

        $action = $input['action'] ?? '';

        if ($action === 'update_user' || $action === 'change_role') {
            $originalUsername = $input['original_username'] ?? $input['username'] ?? '';
            $username = $input['username'] ?? '';
            $email = $input['email'] ?? '';
            $fullName = $input['full_name'] ?? '';
            $newRole = $input['new_role'] ?? $input['role'] ?? '';
            $newPassword = $input['new_password'] ?? '';
            
            $adminPassword = (string)($input['admin_password'] ?? '');
            $currentAdminUsername = $input['current_admin'] ?? '';

            if (!$originalUsername || !$username || !$newRole || !$currentAdminUsername) {
                throw new Exception('Faltan datos requeridos para la actualización.');
            }

            $sessionAdminId = (int)($_SESSION['admin_id'] ?? 0);
            $stmtAuth = $pdo->prepare("SELECT id, password_hash, role FROM admin_users WHERE is_active = 1 AND (id = ? OR username = ?) LIMIT 1");
            $stmtAuth->execute([$sessionAdminId, $currentAdminUsername]);
            $admin = $stmtAuth->fetch();

            if (!$admin) {
                throw new Exception('Administrador no encontrado o inactivo.');
            }

            $isGoogleAdminSession =
                ($_SESSION['admin_auth_provider'] ?? $_SESSION['auth_provider'] ?? '') === 'google'
                && (int)($_SESSION['admin_id'] ?? 0) === (int)$admin['id'];

            if (!$isGoogleAdminSession && !password_verify($adminPassword, $admin['password_hash'])) {
                throw new Exception('Contraseña de administrador incorrecta. Autorización denegada.');
            }

            if ($admin['role'] !== 'superadmin') {
                throw new Exception('Solo un superadmin puede editar usuarios.');
            }

            $pdo->beginTransaction();

            if ($originalUsername !== $username) {
                $stmtCheckP = $pdo->prepare("SELECT id FROM platform_users WHERE username = ?");
                $stmtCheckP->execute([$username]);
                if ($stmtCheckP->fetch()) throw new Exception('El nuevo nombre de usuario ya está en uso en la plataforma.');
                
                $stmtCheckA = $pdo->prepare("SELECT id FROM admin_users WHERE username = ?");
                $stmtCheckA->execute([$username]);
                if ($stmtCheckA->fetch()) throw new Exception('El nuevo nombre de usuario ya está en uso por un administrador.');
            }

            $passSqlA = "";
            $passSqlP = "";
            $passParams = [];
            if ($newPassword) {
                $passHash = password_hash($newPassword, PASSWORD_DEFAULT);
                $passSqlA = ", password_hash = ?";
                $passSqlP = ", password_hash = ?";
                $passParams[] = $passHash;
            }

            $stmtA = $pdo->prepare("SELECT id FROM admin_users WHERE username = ? LIMIT 1");
            $stmtA->execute([$originalUsername]);
            $aUser = $stmtA->fetch();

            $stmtP = $pdo->prepare("SELECT id FROM platform_users WHERE username = ? LIMIT 1");
            $stmtP->execute([$originalUsername]);
            $pUser = $stmtP->fetch();

            $emailToUpdateP = $email ?: ($pUser ? $pdo->query("SELECT email FROM platform_users WHERE id = {$pUser['id']}")->fetchColumn() : '');
            $fullNameToUpdateP = $fullName ?: ($pUser ? $pdo->query("SELECT full_name FROM platform_users WHERE id = {$pUser['id']}")->fetchColumn() : '');
            
            if ($pUser) {
                $paramsP = array_merge([$username, $emailToUpdateP, $fullNameToUpdateP], $passParams, [$originalUsername]);
                $pdo->prepare("UPDATE platform_users SET username = ?, email = ?, full_name = ? {$passSqlP} WHERE username = ?")->execute($paramsP);
            }

            $emailToUpdateA = $email ?: ($aUser ? $pdo->query("SELECT email FROM admin_users WHERE id = {$aUser['id']}")->fetchColumn() : '');
            $fullNameToUpdateA = $fullName ?: ($aUser ? $pdo->query("SELECT full_name FROM admin_users WHERE id = {$aUser['id']}")->fetchColumn() : '');

            if ($aUser) {
                $paramsA = array_merge([$username, $emailToUpdateA, $fullNameToUpdateA], $passParams, [$originalUsername]);
                $pdo->prepare("UPDATE admin_users SET username = ?, email = ?, full_name = ? {$passSqlA} WHERE username = ?")->execute($paramsA);
            }

            if ($newRole) {
                if ($newRole === 'estudiante') {
                    $pdo->prepare("DELETE FROM admin_users WHERE username = ?")->execute([$username]);
                    $pdo->prepare("UPDATE platform_users SET role = 'alumno' WHERE username = ?")->execute([$username]);
                } else if (in_array($newRole, ['staff', 'superadmin'])) {
                    $stmtCheckA2 = $pdo->prepare("SELECT id FROM admin_users WHERE username = ? LIMIT 1");
                    $stmtCheckA2->execute([$username]);
                    if ($stmtCheckA2->fetch()) {
                        $pdo->prepare("UPDATE admin_users SET role = ? WHERE username = ?")->execute([$newRole, $username]);
                    } else {
                        $stmtCheckP2 = $pdo->prepare("SELECT * FROM platform_users WHERE username = ? LIMIT 1");
                        $stmtCheckP2->execute([$username]);
                        $pUser2 = $stmtCheckP2->fetch();
                        if (!$pUser2) throw new Exception('El usuario no existe en la plataforma.');
                        
                        $pdo->prepare("INSERT INTO admin_users (username, full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)")
                            ->execute([$pUser2['username'], $pUser2['full_name'], $pUser2['email'], $pUser2['password_hash'], $newRole]);
                    }
                    $pdo->prepare("UPDATE platform_users SET role = 'admin' WHERE username = ?")->execute([$username]);
                } else {
                    throw new Exception('Rol no válido');
                }
            }

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Usuario actualizado correctamente.']);
            exit;
        }

        if ($action === 'delete_user') {
            $username = trim((string)($input['username'] ?? ''));
            $adminPassword = (string)($input['admin_password'] ?? '');
            $currentAdminUsername = trim((string)($input['current_admin'] ?? ''));

            if ($username === '' || $currentAdminUsername === '') {
                throw new Exception('Usuario y administrador actual requeridos.');
            }

            $sessionAdminId = (int)($_SESSION['admin_id'] ?? 0);
            $stmtAuth = $pdo->prepare("SELECT id, username, password_hash, role FROM admin_users WHERE is_active = 1 AND (id = ? OR username = ?) LIMIT 1");
            $stmtAuth->execute([$sessionAdminId, $currentAdminUsername]);
            $admin = $stmtAuth->fetch();

            if (!$admin) {
                throw new Exception('Administrador no encontrado o inactivo.');
            }

            $isGoogleAdminSession =
                ($_SESSION['admin_auth_provider'] ?? $_SESSION['auth_provider'] ?? '') === 'google'
                && (int)($_SESSION['admin_id'] ?? 0) === (int)$admin['id'];

            if (!$isGoogleAdminSession && !password_verify($adminPassword, $admin['password_hash'])) {
                throw new Exception('Contraseña de administrador incorrecta. Autorización denegada.');
            }

            if ($admin['role'] !== 'superadmin') {
                throw new Exception('Solo un superadmin puede eliminar usuarios.');
            }

            if (strtolower($username) === strtolower((string)$admin['username'])) {
                throw new Exception('No puedes eliminar tu propia cuenta desde esta vista.');
            }

            $stmtTargetA = $pdo->prepare("SELECT id, username, email, role FROM admin_users WHERE username = ? LIMIT 1");
            $stmtTargetA->execute([$username]);
            $targetAdmin = $stmtTargetA->fetch();

            $stmtTargetP = $pdo->prepare("SELECT id, username, email FROM platform_users WHERE username = ? LIMIT 1");
            $stmtTargetP->execute([$username]);
            $targetPlatform = $stmtTargetP->fetch();

            if (!$targetAdmin && !$targetPlatform) {
                throw new Exception('Usuario no encontrado.');
            }

            if ($targetAdmin && $targetAdmin['role'] === 'superadmin') {
                $remaining = (int)$pdo->query("SELECT COUNT(*) FROM admin_users WHERE role = 'superadmin' AND is_active = 1 AND username <> " . $pdo->quote($username))->fetchColumn();
                if ($remaining <= 0) {
                    throw new Exception('No puedes eliminar el último superadmin activo.');
                }
            }

            $targetEmail = strtolower((string)($targetPlatform['email'] ?? $targetAdmin['email'] ?? ''));
            $targetUserId = (int)($targetPlatform['id'] ?? 0);

            $requestFolios = [];
            if ($targetUserId > 0) {
                $stmtFolios = $pdo->prepare("SELECT request_folio FROM congress_enrollment_requests WHERE user_id = ? AND request_folio IS NOT NULL AND request_folio <> ''");
                $stmtFolios->execute([$targetUserId]);
                $requestFolios = array_values(array_filter($stmtFolios->fetchAll(PDO::FETCH_COLUMN)));
            }

            $pdo->beginTransaction();

            if ($targetUserId > 0) {
                $pdo->prepare("DELETE FROM workshop_enrollments WHERE user_id = ?")->execute([$targetUserId]);
                $pdo->prepare("DELETE FROM conference_enrollments WHERE user_id = ?")->execute([$targetUserId]);
                $pdo->prepare("DELETE FROM camp_registrations WHERE user_id = ?")->execute([$targetUserId]);
            }

            if ($targetEmail !== '') {
                $pdo->prepare("DELETE FROM teams WHERE LOWER(captain_email) = ?")->execute([$targetEmail]);
            }

            foreach ($requestFolios as $folio) {
                $pdo->prepare("DELETE FROM teams WHERE folio = ?")->execute([$folio]);
            }

            $pdo->prepare("DELETE FROM admin_users WHERE username = ?")->execute([$username]);
            $pdo->prepare("DELETE FROM platform_users WHERE username = ?")->execute([$username]);

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Usuario eliminado correctamente.']);
            exit;
        }

        if ($action === 'update_account_status') {
            $username = trim((string)($input['username'] ?? ''));
            $newStatus = trim((string)($input['account_status'] ?? ''));
            $reason = trim((string)($input['reason'] ?? ''));

            if ($username === '' || !in_array($newStatus, ['active', 'banned', 'deactivated'], true)) {
                throw new Exception('Usuario y estado valido requeridos.');
            }

            if ($newStatus !== 'active' && $reason === '') {
                throw new Exception('Indica el motivo que vera el usuario al iniciar sesion.');
            }

            $admin = requireSuperadminForUserAction($pdo, $input, 'gestionar el estado de cuentas');

            if ($newStatus !== 'active' && strtolower($username) === strtolower((string)$admin['username'])) {
                throw new Exception('No puedes banear o dar de baja tu propia cuenta desde esta vista.');
            }

            $stmtTargetP = $pdo->prepare("SELECT id, username, email FROM platform_users WHERE username = ? LIMIT 1");
            $stmtTargetP->execute([$username]);
            $targetPlatform = $stmtTargetP->fetch();

            $stmtTargetA = $pdo->prepare("SELECT id, username, role FROM admin_users WHERE username = ? LIMIT 1");
            $stmtTargetA->execute([$username]);
            $targetAdmin = $stmtTargetA->fetch();

            if (!$targetPlatform && !$targetAdmin) {
                throw new Exception('Usuario no encontrado.');
            }

            if ($newStatus !== 'active' && $targetAdmin && $targetAdmin['role'] === 'superadmin') {
                $remaining = (int)$pdo->query("SELECT COUNT(*) FROM admin_users WHERE role = 'superadmin' AND is_active = 1 AND username <> " . $pdo->quote($username))->fetchColumn();
                if ($remaining <= 0) {
                    throw new Exception('No puedes desactivar el ultimo superadmin activo.');
                }
            }

            $pdo->beginTransaction();

            $isActive = $newStatus === 'active' ? 1 : 0;
            $storedReason = $newStatus === 'active' ? null : $reason;

            if ($targetPlatform) {
                $pdo->prepare("
                    UPDATE platform_users
                    SET is_active = ?, account_status = ?, admin_status_reason = ?,
                        status_updated_by = ?, status_updated_at = NOW()
                    WHERE username = ?
                ")->execute([$isActive, $newStatus, $storedReason, $admin['username'], $username]);
            }

            if ($targetAdmin) {
                $pdo->prepare("UPDATE admin_users SET is_active = ? WHERE username = ?")
                    ->execute([$isActive, $username]);
            }

            $pdo->commit();

            $message = $newStatus === 'active'
                ? 'Usuario reactivado correctamente.'
                : ($newStatus === 'banned'
                    ? 'Usuario baneado correctamente.'
                    : 'Usuario dado de baja correctamente.');

            echo json_encode(['success' => true, 'message' => $message]);
            exit;
        }
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
