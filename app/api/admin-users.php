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

try {
    if ($method === 'GET') {
        $stmtP = $pdo->query("SELECT id, username, full_name, email, phone, school, country, city, career, semester, matricula, control_number, role, 'platform' as source FROM platform_users");
        $platformUsers = $stmtP->fetchAll();

        $stmtA = $pdo->query("SELECT id, username, full_name, email, '' as phone, '' as school, '' as country, '' as city, '' as career, '' as semester, '' as matricula, '' as control_number, role, 'admin' as source FROM admin_users");
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
                'role' => $u['role'] === 'alumno' ? 'estudiante' : $u['role']
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
                    'role' => $u['role']
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
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
