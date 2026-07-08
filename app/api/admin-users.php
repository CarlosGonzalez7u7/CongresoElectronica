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
        'ban_expires_at' => "ALTER TABLE platform_users ADD COLUMN ban_expires_at DATETIME NULL AFTER admin_status_reason",
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

function adminUsersTableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $stmt->execute([$table]);
    return (int)$stmt->fetchColumn() > 0;
}

function adminUsersColumnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    return (int)$stmt->fetchColumn() > 0;
}

function syncUserAcademicReferences(PDO $pdo, int $userId, ?string $oldEmail, array $profile): void
{
    if ($userId <= 0) return;

    if (adminUsersTableExists($pdo, 'congress_registrations')) {
        $sets = [];
        $params = [];
        if (adminUsersColumnExists($pdo, 'congress_registrations', 'school_snapshot')) {
            $sets[] = 'school_snapshot = ?';
            $params[] = $profile['school'];
        }
        if (adminUsersColumnExists($pdo, 'congress_registrations', 'matricula_snapshot')) {
            $sets[] = 'matricula_snapshot = ?';
            $params[] = $profile['control_number'] ?: $profile['matricula'];
        }
        if ($sets) {
            $params[] = $userId;
            $pdo->prepare('UPDATE congress_registrations SET ' . implode(', ', $sets) . ' WHERE user_id = ?')->execute($params);
        }
    }

    if (adminUsersTableExists($pdo, 'congress_enrollment_requests') && adminUsersColumnExists($pdo, 'congress_enrollment_requests', 'profile_snapshot_json')) {
        $stmt = $pdo->prepare('SELECT id, profile_snapshot_json FROM congress_enrollment_requests WHERE user_id = ?');
        $stmt->execute([$userId]);
        $upd = $pdo->prepare('UPDATE congress_enrollment_requests SET profile_snapshot_json = ? WHERE id = ?');
        while ($row = $stmt->fetch()) {
            $snapshot = json_decode($row['profile_snapshot_json'] ?: '{}', true);
            if (!is_array($snapshot)) $snapshot = [];
            foreach (['full_name', 'email', 'phone', 'school', 'control_number', 'career', 'semester', 'country', 'city'] as $key) {
                $snapshot[$key] = $profile[$key] ?? '';
            }
            $upd->execute([json_encode($snapshot, JSON_UNESCAPED_UNICODE), (int)$row['id']]);
        }
    }

    if (adminUsersTableExists($pdo, 'teams')) {
        $sets = [];
        $params = [];
        foreach ([
            'school_name' => 'school',
            'captain_name' => 'full_name',
            'captain_email' => 'email',
            'captain_phone' => 'phone',
        ] as $column => $profileKey) {
            if (adminUsersColumnExists($pdo, 'teams', $column)) {
                $sets[] = $column . ' = ?';
                $params[] = $profile[$profileKey] ?? '';
            }
        }
        if ($sets && adminUsersColumnExists($pdo, 'teams', 'captain_email')) {
            $emails = array_values(array_unique(array_filter([
                strtolower(trim((string)$oldEmail)),
                strtolower(trim((string)($profile['email'] ?? ''))),
            ])));
            if ($emails) {
                $placeholders = implode(',', array_fill(0, count($emails), '?'));
                $pdo->prepare('UPDATE teams SET ' . implode(', ', $sets) . " WHERE LOWER(captain_email) IN ($placeholders)")
                    ->execute(array_merge($params, $emails));
            }
        }
    }
}

try {
    ensurePlatformAccountStatusColumns($pdo);

    if ($method === 'GET') {
        $pdo->exec("UPDATE admin_users a JOIN platform_users p ON LOWER(a.username) = LOWER(p.username) SET a.is_active = 1 WHERE p.account_status = 'banned' AND p.ban_expires_at IS NOT NULL AND p.ban_expires_at <= NOW()");
        $pdo->exec("UPDATE platform_users SET is_active = 1, account_status = 'active', admin_status_reason = NULL, ban_expires_at = NULL, status_updated_by = 'system', status_updated_at = NOW() WHERE account_status = 'banned' AND ban_expires_at IS NOT NULL AND ban_expires_at <= NOW()");
        $stmtP = $pdo->query("SELECT id, username, full_name, email, phone, school, country, city, career, semester, matricula, control_number, role, is_active, account_status, admin_status_reason, ban_expires_at, status_updated_by, status_updated_at, created_at, 'platform' as source FROM platform_users");
        $platformUsers = $stmtP->fetchAll();

        $stmtA = $pdo->query("SELECT id, username, full_name, email, '' as phone, '' as school, '' as country, '' as city, '' as career, '' as semester, '' as matricula, '' as control_number, role, is_active, created_at, 'admin' as source FROM admin_users");
        $adminUsers = $stmtA->fetchAll();

        $instructorUsers = [];
        try {
            $stmtI = $pdo->query("SELECT id, username, full_name, email, phone, specialty, role_type, is_active, created_at, 'instructor' as source FROM workshop_instructors");
            $instructorUsers = $stmtI->fetchAll();
        } catch (Throwable $ignored) {
            $instructorUsers = [];
        }

        $map = [];

        foreach ($platformUsers as $u) {
            $key = strtolower($u['username']);
            $map[$key] = [
                'platform_id' => $u['id'],
                'admin_id' => null,
                'instructor_id' => null,
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
                'ban_expires_at' => $u['ban_expires_at'] ?? '',
                'status_updated_by' => $u['status_updated_by'] ?? '',
                'status_updated_at' => $u['status_updated_at'] ?? '',
                'created_at' => $u['created_at'] ?? ''
            ];
        }

        foreach ($instructorUsers as $u) {
            $key = strtolower($u['username']);
            $status = (int)$u['is_active'] ? 'active' : 'deactivated';
            $specialty = $u['specialty'] ?: (($u['role_type'] ?? '') === 'speaker' ? 'Ponente' : 'Profesor / Tallerista');

            if (isset($map[$key])) {
                $map[$key]['instructor_id'] = $u['id'];
                if (!in_array($map[$key]['role'], ['staff', 'superadmin'], true)) {
                    $map[$key]['role'] = 'tallerista';
                }
                $map[$key]['full_name'] = $map[$key]['full_name'] ?: $u['full_name'];
                $map[$key]['email'] = $map[$key]['email'] ?: $u['email'];
                $map[$key]['phone'] = $map[$key]['phone'] ?: $u['phone'];
                $map[$key]['school'] = $map[$key]['school'] ?: $specialty;
                $map[$key]['created_at'] = $map[$key]['created_at'] ?: ($u['created_at'] ?? '');
                if (($map[$key]['account_status'] ?? 'active') === 'active' && $status !== 'active') {
                    $map[$key]['account_status'] = $status;
                }
            } else {
                $map[$key] = [
                    'platform_id' => null,
                    'admin_id' => null,
                    'instructor_id' => $u['id'],
                    'username' => $u['username'],
                    'full_name' => $u['full_name'],
                    'email' => $u['email'],
                    'phone' => $u['phone'] ?: '',
                    'school' => $specialty,
                    'country' => '',
                    'city' => '',
                    'career' => '',
                    'semester' => '',
                    'matricula' => '',
                    'control_number' => '',
                    'role' => 'tallerista',
                    'account_status' => $status,
                    'admin_status_reason' => '',
                    'ban_expires_at' => '',
                    'status_updated_by' => '',
                    'status_updated_at' => '',
                    'created_at' => $u['created_at'] ?? ''
                ];
            }
        }

        foreach ($adminUsers as $u) {
            $key = strtolower($u['username']);
            if (isset($map[$key])) {
                $map[$key]['admin_id'] = $u['id'];
                $map[$key]['role'] = $u['role'];
                $map[$key]['created_at'] = $map[$key]['created_at'] ?: ($u['created_at'] ?? '');
            } else {
                $map[$key] = [
                    'platform_id' => null,
                    'admin_id' => $u['id'],
                    'instructor_id' => null,
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
                    'ban_expires_at' => '',
                    'status_updated_by' => '',
                    'status_updated_at' => '',
                    'created_at' => $u['created_at'] ?? ''
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
            $phone = trim((string)($input['phone'] ?? ''));
            $school = trim((string)($input['school'] ?? ''));
            $career = trim((string)($input['career'] ?? ''));
            $semester = trim((string)($input['semester'] ?? ''));
            $controlNumber = trim((string)($input['control_number'] ?? ''));
            $matricula = trim((string)($input['matricula'] ?? ''));
            $country = trim((string)($input['country'] ?? ''));
            $city = trim((string)($input['city'] ?? ''));
            $careerSemester = trim($career . ($career && $semester ? ' - ' : '') . $semester);
            
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
                $stmtCheckI = $pdo->prepare("SELECT id FROM workshop_instructors WHERE username = ?");
                $stmtCheckI->execute([$username]);
                if ($stmtCheckI->fetch()) throw new Exception('El nuevo nombre de usuario ya esta en uso por un profesor/tallerista.');
                if ($stmtCheckA->fetch()) throw new Exception('El nuevo nombre de usuario ya está en uso por un administrador.');
            }

            $passSqlA = "";
            $passSqlP = "";
            $passSqlI = "";
            $passParams = [];
            if ($newPassword) {
                $passHash = password_hash($newPassword, PASSWORD_DEFAULT);
                $passSqlA = ", password_hash = ?";
                $passSqlP = ", password_hash = ?";
                $passSqlI = ", password_hash = ?";
                $passParams[] = $passHash;
            }

            $stmtA = $pdo->prepare("SELECT id FROM admin_users WHERE username = ? LIMIT 1");
            $stmtA->execute([$originalUsername]);
            $aUser = $stmtA->fetch();

            $stmtP = $pdo->prepare("SELECT id, email FROM platform_users WHERE username = ? LIMIT 1");
            $stmtP->execute([$originalUsername]);
            $pUser = $stmtP->fetch();

            $stmtI = $pdo->prepare("SELECT id FROM workshop_instructors WHERE username = ? LIMIT 1");
            $stmtI->execute([$originalUsername]);
            $iUser = $stmtI->fetch();

            $emailToUpdateP = $email ?: ($pUser ? $pdo->query("SELECT email FROM platform_users WHERE id = {$pUser['id']}")->fetchColumn() : '');
            $fullNameToUpdateP = $fullName ?: ($pUser ? $pdo->query("SELECT full_name FROM platform_users WHERE id = {$pUser['id']}")->fetchColumn() : '');
            
            if ($pUser) {
                $paramsP = array_merge([
                    $username,
                    $emailToUpdateP,
                    $fullNameToUpdateP,
                    $phone,
                    $school,
                    $country,
                    $city,
                    $career,
                    $semester,
                    $careerSemester,
                    $controlNumber,
                    $matricula ?: $controlNumber,
                ], $passParams, [$originalUsername]);
                $pdo->prepare("
                    UPDATE platform_users
                    SET username = ?, email = ?, full_name = ?, phone = ?,
                        school = ?, country = ?, city = ?, career = ?, semester = ?,
                        career_semester = ?, control_number = ?, matricula = ?,
                        updated_at = NOW()
                        {$passSqlP}
                    WHERE username = ?
                ")->execute($paramsP);

                syncUserAcademicReferences($pdo, (int)$pUser['id'], $pUser['email'] ?? $emailToUpdateP, [
                    'username' => $username,
                    'email' => $emailToUpdateP,
                    'full_name' => $fullNameToUpdateP,
                    'phone' => $phone,
                    'school' => $school,
                    'country' => $country,
                    'city' => $city,
                    'career' => $career,
                    'semester' => $semester,
                    'control_number' => $controlNumber,
                    'matricula' => $matricula ?: $controlNumber,
                ]);
            }

            $emailToUpdateA = $email ?: ($aUser ? $pdo->query("SELECT email FROM admin_users WHERE id = {$aUser['id']}")->fetchColumn() : '');
            $fullNameToUpdateA = $fullName ?: ($aUser ? $pdo->query("SELECT full_name FROM admin_users WHERE id = {$aUser['id']}")->fetchColumn() : '');

            if ($aUser) {
                $paramsA = array_merge([$username, $emailToUpdateA, $fullNameToUpdateA], $passParams, [$originalUsername]);
                $pdo->prepare("UPDATE admin_users SET username = ?, email = ?, full_name = ? {$passSqlA} WHERE username = ?")->execute($paramsA);
            }

            if ($iUser) {
                $emailToUpdateI = $email ?: $pdo->query("SELECT email FROM workshop_instructors WHERE id = {$iUser['id']}")->fetchColumn();
                $fullNameToUpdateI = $fullName ?: $pdo->query("SELECT full_name FROM workshop_instructors WHERE id = {$iUser['id']}")->fetchColumn();
                $paramsI = array_merge([$username, $emailToUpdateI, $fullNameToUpdateI, $phone], $passParams, [$originalUsername]);
                $pdo->prepare("UPDATE workshop_instructors SET username = ?, email = ?, full_name = ?, phone = ? {$passSqlI}, updated_at = NOW() WHERE username = ?")->execute($paramsI);
            }

            if ($newRole) {
                if ($newRole === 'estudiante') {
                    $pdo->prepare("DELETE FROM admin_users WHERE username = ?")->execute([$username]);
                    $pdo->prepare("UPDATE platform_users SET role = 'alumno' WHERE username = ?")->execute([$username]);
                } else if ($newRole === 'tallerista') {
                    $pdo->prepare("DELETE FROM admin_users WHERE username = ?")->execute([$username]);
                    $pdo->prepare("UPDATE platform_users SET role = 'tallerista' WHERE username = ?")->execute([$username]);

                    $stmtCheckI2 = $pdo->prepare("SELECT id FROM workshop_instructors WHERE username = ? LIMIT 1");
                    $stmtCheckI2->execute([$username]);
                    if (!$stmtCheckI2->fetch()) {
                        $stmtCheckP2 = $pdo->prepare("SELECT * FROM platform_users WHERE username = ? LIMIT 1");
                        $stmtCheckP2->execute([$username]);
                        $pUser2 = $stmtCheckP2->fetch();
                        if (!$pUser2) throw new Exception('Para crear acceso de profesor/tallerista se necesita una cuenta de plataforma existente.');

                        $pdo->prepare("
                            INSERT INTO workshop_instructors (username, full_name, email, phone, specialty, bio, role_type, password_hash, is_active)
                            VALUES (?, ?, ?, ?, ?, '', 'instructor', ?, 1)
                        ")->execute([
                            $pUser2['username'],
                            $pUser2['full_name'] ?: $fullNameToUpdateP,
                            $pUser2['email'] ?: $emailToUpdateP,
                            $pUser2['phone'] ?? '',
                            'Profesor / Tallerista',
                            $pUser2['password_hash']
                        ]);
                    }
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

            $stmtTargetI = $pdo->prepare("SELECT id, username, email FROM workshop_instructors WHERE username = ? LIMIT 1");
            $stmtTargetI->execute([$username]);
            $targetInstructor = $stmtTargetI->fetch();

            if (!$targetAdmin && !$targetPlatform && !$targetInstructor) {
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
            if ($targetInstructor) {
                $pdo->prepare("UPDATE workshops SET instructor_id = NULL WHERE instructor_id = ?")->execute([(int)$targetInstructor['id']]);
                $pdo->prepare("DELETE FROM workshop_instructors WHERE username = ?")->execute([$username]);
            }

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Usuario eliminado correctamente.']);
            exit;
        }

        if ($action === 'update_account_status') {
            $username = trim((string)($input['username'] ?? ''));
            $newStatus = trim((string)($input['account_status'] ?? ''));
            $reason = trim((string)($input['reason'] ?? ''));
            $banExpiresAtRaw = trim((string)($input['ban_expires_at'] ?? ''));

            if ($username === '' || !in_array($newStatus, ['active', 'banned', 'deactivated'], true)) {
                throw new Exception('Usuario y estado valido requeridos.');
            }

            if ($newStatus !== 'active' && $reason === '') {
                throw new Exception('Indica el motivo que vera el usuario al iniciar sesion.');
            }

            $banExpiresAt = null;
            if ($newStatus === 'banned' && $banExpiresAtRaw !== '') {
                try {
                    $banDate = new DateTime($banExpiresAtRaw);
                } catch (Throwable $e) {
                    throw new Exception('La fecha de desbaneo no es valida.');
                }
                if ($banDate <= new DateTime()) {
                    throw new Exception('La fecha de desbaneo debe ser futura.');
                }
                $banExpiresAt = $banDate->format('Y-m-d H:i:s');
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

            $stmtTargetI = $pdo->prepare("SELECT id, username FROM workshop_instructors WHERE username = ? LIMIT 1");
            $stmtTargetI->execute([$username]);
            $targetInstructor = $stmtTargetI->fetch();

            if (!$targetPlatform && !$targetAdmin && !$targetInstructor) {
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
            $storedBanExpiresAt = $newStatus === 'banned' ? $banExpiresAt : null;

            if ($targetPlatform) {
                $pdo->prepare("
                    UPDATE platform_users
                    SET is_active = ?, account_status = ?, admin_status_reason = ?, ban_expires_at = ?,
                        status_updated_by = ?, status_updated_at = NOW()
                    WHERE username = ?
                ")->execute([$isActive, $newStatus, $storedReason, $storedBanExpiresAt, $admin['username'], $username]);
            }

            if ($targetAdmin) {
                $pdo->prepare("UPDATE admin_users SET is_active = ? WHERE username = ?")
                    ->execute([$isActive, $username]);
            }

            if ($targetInstructor) {
                $pdo->prepare("UPDATE workshop_instructors SET is_active = ?, updated_at = NOW() WHERE username = ?")
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
