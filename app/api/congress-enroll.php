<?php
/**
 * API: Inscripción de usuario al congreso (Con Comprobante)
 * POST /api/congress-enroll.php
 */

require_once __DIR__ . '/_auth_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

try {
    ensurePlatformUsersTable($pdo);
    ensureCongressRegistrationsTable($pdo);
    ensureCongressRequestsTable($pdo);
    
    $selectedConvocatorias = json_decode((string) ($_POST['selected_convocatorias'] ?? '[]'), true);
    if (!is_array($selectedConvocatorias)) $selectedConvocatorias = [];

    $userId = requireLoggedInUser();
    // NOTA: Como ahora recibimos un archivo, no usamos JSON, usamos $_POST y $_FILES
    $country = sanitizeText($_POST['country'] ?? '');
    $city = sanitizeText($_POST['city'] ?? '');
    $school = sanitizeText($_POST['school'] ?? '');
    $matricula = sanitizeText($_POST['matricula'] ?? '');
    $includesCongress = filter_var($_POST['includes_congress'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $includesRobotics = filter_var($_POST['includes_robotics'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $includesCamp = filter_var($_POST['includes_camp'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $robotCount = max(0, (int) ($_POST['robot_count'] ?? 0));
    $skipReceipt = filter_var($_POST['skip_receipt'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $profileSnapshot = json_decode((string) ($_POST['profile'] ?? '{}'), true);
    if (!is_array($profileSnapshot)) {
        $profileSnapshot = [];
    }
    $robotsSnapshot = json_decode((string) ($_POST['robots'] ?? '[]'), true);
    if (!is_array($robotsSnapshot)) {
        $robotsSnapshot = [];
    }
    $membersSnapshot = json_decode((string) ($_POST['members'] ?? '[]'), true);
    if (!is_array($membersSnapshot)) {
        $membersSnapshot = [];
    }
    // Normalizar cada elemento: puede llegar como string simple o como objeto {name, member_name, ...}
    $membersSnapshot = array_values(array_filter(array_map(function ($m) {
        if (is_string($m)) {
            // array de strings simples: ["Juan", "Pedro"]
            $name = trim($m);
            return $name !== '' ? ['member_name' => $name, 'name' => $name, 'is_captain' => false] : null;
        }
        if (is_array($m)) {
            // Unificar campos de nombre al campo canónico member_name
            $name = trim((string)($m['member_name'] ?? $m['name'] ?? ''));
            if ($name === '') return null;
            return [
                'member_name' => $name,
                'name'        => $name,
                'is_captain'  => !empty($m['is_captain']) || !empty($m['isCaptain']),
            ];
        }
        return null;
    }, $membersSnapshot)));
    $year = getCurrentCongressYear();

    if ($userId <= 0) {
        throw new Exception('Sesión inválida. Inicia sesión de nuevo.');
    }

    $isResume = filter_var($_POST['is_resume'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $existingRequest = null;
    if ($isResume) {
        $stmtReq = $pdo->prepare("SELECT id, request_folio FROM congress_enrollment_requests WHERE user_id = ? AND congress_year = ? AND status NOT IN ('approved', 'paid') ORDER BY id DESC LIMIT 1");
        $stmtReq->execute([$userId, $year]);
        $existingRequest = $stmtReq->fetch();
    }

    // PREVENIR INSCRIPCIONES DUPLICADAS ACTIVAS (Excepto Robótica que es ilimitada)
    $stmtCheckDup = $pdo->prepare('
        SELECT id, includes_congress, includes_camp
        FROM congress_enrollment_requests 
        WHERE user_id = ? AND congress_year = ? 
        AND status IN ("approved", "paid", "pending", "awaiting_receipt", "resubmit_requested")
    ');
    $stmtCheckDup->execute([$userId, $year]);
    $existingReqs = $stmtCheckDup->fetchAll();
    
    $hasCongress = false;
    $hasCamp = false;
    foreach ($existingReqs as $r) {
        if ($existingRequest && $existingRequest['id'] == $r['id']) continue;
        if ($r['includes_congress']) $hasCongress = true;
        if ($r['includes_camp']) $hasCamp = true;
    }
    
    if ($includesCongress && $hasCongress) {
        throw new Exception('Ya existe una solicitud activa o aprobada para el Congreso. No puedes generar otra.');
    }
    if ($includesCamp && $hasCamp) {
        throw new Exception('Ya existe una solicitud activa o aprobada para el Campamento. No puedes generar otra.');
    }


    if ($country === '' || $city === '' || $school === '') {
        throw new Exception('Completa país, ciudad y escuela');
    }

    if (requiresMatriculaBySchool($school) && $matricula === '') {
        throw new Exception('La matrícula es obligatoria para el Instituto Tecnológico Superior de Uruapan');
    }

    $hasReceipt = isset($_FILES['receipt']) && (int) ($_FILES['receipt']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK;
    $uploadDest = null;
    $newFileName = null;

    if ($hasReceipt) {
        $fileTmpPath = $_FILES['receipt']['tmp_name'];
        $fileName = $_FILES['receipt']['name'];
        $fileSize = $_FILES['receipt']['size'];
        $fileType = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        $allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
        if (!in_array($fileType, $allowedExtensions, true)) {
            throw new Exception('Formato de archivo no permitido. Usa JPG, PNG o PDF.');
        }

        if ($fileSize > MAX_UPLOAD_SIZE) {
            throw new Exception('El archivo es demasiado grande (Máx. 20MB).');
        }

        $newFileName = 'congreso_' . $userId . '_' . time() . '.' . $fileType;
        $uploadDest = UPLOAD_DIR . $newFileName;

        if (!move_uploaded_file($fileTmpPath, $uploadDest)) {
            throw new Exception('Error al guardar el comprobante en el servidor.');
        }
    } elseif (!$skipReceipt) {
        throw new Exception('Debes subir un comprobante de pago válido o elegir la opción de pagar después.');
    }

    // Verificar usuario
    $stmtUser = $pdo->prepare('SELECT id, username, email_verified, is_active FROM platform_users WHERE id = ? LIMIT 1');
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch();

    if (!$user || !(int) $user['is_active']) {
        throw new Exception('Cuenta no encontrada o inactiva');
    }

    if ($includesRobotics && $robotCount <= 0) {
        throw new Exception('Si registras robótica, indica cuántos robots vas a inscribir');
    }

    if (!$includesCongress && !$includesRobotics && !$includesCamp) {
        throw new Exception('Selecciona al menos una convocatoria para continuar');
    }

    $pdo->beginTransaction();

    $stmtUpdate = $pdo->prepare('UPDATE platform_users SET country = ?, city = ?, school = ?, matricula = ?, updated_at = NOW() WHERE id = ?');
    $stmtUpdate->execute([
        $country,
        $city,
        $school,
        $matricula !== '' ? $matricula : null,
        $userId,
    ]);

    $totalFee = 0.0;
    $congressFee = 0.0;
    $roboticsFee = 0.0;
    $campFee = 0.0;

    if (!empty($selectedConvocatorias)) {
        $ph = implode(',', array_fill(0, count($selectedConvocatorias), '?'));
        $stmtC = $pdo->prepare("SELECT * FROM convocatorias WHERE id IN ($ph)");
        $stmtC->execute($selectedConvocatorias);
        $convs = $stmtC->fetchAll(PDO::FETCH_ASSOC);

        foreach ($convs as $c) {
            $tipo = strtolower(($c['conv_tipo'] ?? '') . ' ' . ($c['titulo'] ?? ''));
            if (str_contains($tipo, 'congreso')) $includesCongress = true;
            if (str_contains($tipo, 'rob') || str_contains($tipo, 'torneo')) $includesRobotics = true;
            if (str_contains($tipo, 'campamento')) $includesCamp = true;

            $price = 0.0;
            if ($c['pricing_mode'] === 'staged') {
                $stages = json_decode($c['price_stages'] ?? '[]', true) ?: [];
                $now = time();
                foreach ($stages as $s) {
                    $st = strtotime($s['start']);
                    $en = strtotime($s['end']);
                    if ($now >= $st && $now <= $en) {
                        $price = (float)($s['price'] ?? 0);
                        break;
                    }
                }
            } else {
                $price = (float)$c['precio_base'];
            }

            if ($includesRobotics && $robotCount > 0 && (str_contains($tipo, 'rob') || str_contains($tipo, 'torneo'))) {
                $sub = $price * $robotCount;
                $roboticsFee += $sub;
                $totalFee += $sub;
            } else {
                $totalFee += $price;
                if (str_contains($tipo, 'congreso')) $congressFee += $price;
                else if (str_contains($tipo, 'campamento')) $campFee += $price;
            }
        }
    } else {
        $congressFee = $includesCongress ? 400.00 : 0.00;
        $campFee = $includesCamp ? 200.00 : 0.00;
        $robotPrice = (float) (getCurrentStage()['price'] ?? 0);
        $roboticsFee = ($includesRobotics && $robotCount > 0) ? ($robotCount * $robotPrice) : 0.00;
        $totalFee = $congressFee + $roboticsFee + $campFee;
    }

    // Extraer nombre y número de control desde el snapshot ya disponible en memoria,
    // así el folio se genera correctamente aunque la BD aún no tenga full_name actualizado.
    $folioFullName   = trim((string) ($profileSnapshot['full_name'] ?? ''));
    $folioCtrlNumber = trim((string) ($profileSnapshot['control_number'] ?? $matricula));

    $success = false;
    $maxAttempts = 5;
    $attempt = 0;
    $requestId = 0;
    $requestFolio = '';

    while ($attempt < $maxAttempts && !$success) {
        $attempt++;
        try {
            if ($existingRequest) {
                $requestId = (int) $existingRequest['id'];
                $requestFolio = $existingRequest['request_folio'];
                if (empty($requestFolio)) {
                    $requestFolio = generateCongressRequestFolio($year, $userId, $pdo, $folioFullName, $folioCtrlNumber);
                }

                $updateSql = "
                    UPDATE congress_enrollment_requests SET
                        request_folio = ?,
                        profile_snapshot_json = ?,
                        robots_snapshot_json = ?,
                        members_snapshot_json = ?,
                        selected_convocatorias_json = ?,
                        includes_congress = ?,
                        includes_robotics = ?,
                        includes_camp = ?,
                        congress_fee = ?,
                        robotics_fee = ?,
                        camp_fee = ?,
                        total_fee = ?,
                        receipt_path = COALESCE(?, receipt_path),
                        receipt_filename = COALESCE(?, receipt_filename),
                        receipt_uploaded_at = COALESCE(?, receipt_uploaded_at),
                        status = 'pending',
                        admin_notes = NULL,
                        rejection_reason = NULL,
                        reviewed_at = NULL,
                        reviewed_by_admin_id = NULL,
                        ip_address = ?,
                        user_agent = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ";
                $pdo->prepare($updateSql)->execute([
                    $requestFolio,
                    json_encode($profileSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    json_encode($robotsSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    json_encode($membersSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    json_encode($selectedConvocatorias),
                    $includesCongress ? 1 : 0,
                    $includesRobotics ? 1 : 0,
                    $includesCamp ? 1 : 0,
                    $congressFee,
                    $roboticsFee,
                    $campFee,
                    $totalFee,
                    $uploadDest,
                    $newFileName,
                    $newFileName !== null ? date('Y-m-d H:i:s') : null,
                    getRealUserIp(),
                    substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
                    $requestId
                ]);
                $success = true;
            } else {
                $requestFolio = generateCongressRequestFolio($year, $userId, $pdo, $folioFullName, $folioCtrlNumber);
                $insertSql = "
                    INSERT INTO congress_enrollment_requests
                        (user_id, congress_year, request_folio, profile_snapshot_json, robots_snapshot_json, members_snapshot_json, selected_convocatorias_json, includes_congress, includes_robotics, includes_camp, congress_fee, robotics_fee, camp_fee, total_fee, receipt_path, receipt_filename, receipt_uploaded_at, status, admin_notes, rejection_reason, reviewed_at, reviewed_by_admin_id, ip_address, user_agent)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL, NULL, ?, ?)
                ";
                $pdo->prepare($insertSql)->execute([
                    $userId,
                    $year,
                    $requestFolio,
                    json_encode($profileSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    json_encode($robotsSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    json_encode($membersSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    json_encode($selectedConvocatorias),
                    $includesCongress ? 1 : 0,
                    $includesRobotics ? 1 : 0,
                    $includesCamp ? 1 : 0,
                    $congressFee,
                    $roboticsFee,
                    $campFee,
                    $totalFee,
                    $uploadDest,
                    $newFileName,
                    $newFileName !== null ? date('Y-m-d H:i:s') : null,
                    getRealUserIp(),
                    substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500)
                ]);
                $requestId = (int) $pdo->lastInsertId();
                $success = true;
            }
        } catch (PDOException $e) {
            // 23000 = Integrity constraint violation
            if ($e->getCode() == 23000) {
                if ($isResume) {
                    $stmtReq->execute([$userId, $year]);
                    $existingRequest = $stmtReq->fetch();
                }
                if ($attempt >= $maxAttempts) {
                    throw new Exception("Error de concurrencia al generar la solicitud. Por favor intenta de nuevo.");
                }
            } else {
                throw $e;
            }
        }
    }


    $registrationSql = "
        INSERT INTO congress_registrations
            (user_id, congress_year, registration_fee, payment_status, country_snapshot, city_snapshot, school_snapshot, matricula_snapshot)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            registration_fee = registration_fee + VALUES(registration_fee),
            payment_status = IF(payment_status IN ('paid', 'approved'), payment_status, VALUES(payment_status)),
            country_snapshot = VALUES(country_snapshot),
            city_snapshot = VALUES(city_snapshot),
            school_snapshot = VALUES(school_snapshot),
            matricula_snapshot = VALUES(matricula_snapshot),
            updated_at = NOW()
    ";
    $pdo->prepare($registrationSql)->execute([
        $userId,
        $year,
        $totalFee,
        $country,
        $city,
        $school,
        $matricula !== '' ? $matricula : null,
    ]);

    $pdo->commit();

    // Registrar en la auditoría la acción del usuario
    try {
        $ip = getRealUserIp();
        $pdo->prepare("INSERT INTO audit_log (action, table_name, record_id, ip_address, changes) VALUES (?, 'congress_enrollment_requests', ?, ?, ?)")
            ->execute(['USER_CONGRESS_ENROLL', $requestId, $ip, json_encode(['user_id' => $userId, 'total' => $totalFee])]);
    } catch(Throwable $e) {}

    echo json_encode([
        'success' => true,
        'message' => 'Inscripción al congreso registrada. En espera de validación.',
        'data' => [
            'request_id' => $requestId,
            'request_folio' => $requestFolio,
            'includes_congress' => $includesCongress,
            'includes_robotics' => $includesRobotics,
            'includes_camp' => $includesCamp,
            'congress_fee' => $congressFee,
            'robotics_fee' => $roboticsFee,
            'camp_fee' => $campFee,
            'total_fee' => $totalFee,
            'has_receipt' => $newFileName !== null,
            'payment_status' => 'pending'
        ],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Si el archivo se subió pero la BD falló, lo borramos
    if (isset($uploadDest) && file_exists($uploadDest)) {
        unlink($uploadDest);
    }

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => APP_DEBUG ? $e->getMessage() : 'No se pudo completar la inscripción'
    ]);
}

function ensureCongressRequestsTable(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS congress_enrollment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        congress_year YEAR NOT NULL DEFAULT 2026,
        request_folio VARCHAR(50) NULL,
        profile_snapshot_json LONGTEXT NULL,
        robots_snapshot_json LONGTEXT NULL,
        members_snapshot_json LONGTEXT NULL,
        includes_congress TINYINT(1) DEFAULT 1,
        includes_robotics TINYINT(1) DEFAULT 0,
        includes_camp TINYINT(1) DEFAULT 0,
        congress_fee DECIMAL(10,2) DEFAULT 400.00,
        robotics_fee DECIMAL(10,2) DEFAULT 0.00,
        camp_fee DECIMAL(10,2) DEFAULT 0.00,
        total_fee DECIMAL(10,2) DEFAULT 400.00,
        receipt_path VARCHAR(500) NULL,
        receipt_filename VARCHAR(300) NULL,
        receipt_uploaded_at TIMESTAMP NULL,
        status ENUM('pending','approved','rejected','resubmit_requested') DEFAULT 'pending',
        admin_notes TEXT NULL,
        rejection_reason TEXT NULL,
        reviewed_at TIMESTAMP NULL,
        reviewed_by_admin_id INT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_year (user_id, congress_year),
        UNIQUE KEY unique_request_folio (request_folio),
        INDEX idx_cer_user (user_id),
        INDEX idx_cer_status (status),
        INDEX idx_cer_year (congress_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    try {
        $pdo->exec("ALTER TABLE congress_enrollment_requests DROP INDEX unique_user_year");
    } catch (Throwable $e) {}

    ensureCongressRequestExtraColumns($pdo);
}

function ensureCongressRequestExtraColumns(PDO $pdo): void
{
    $checks = [
        'request_folio' => "ALTER TABLE congress_enrollment_requests ADD COLUMN request_folio VARCHAR(50) NULL AFTER congress_year",
        'profile_snapshot_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN profile_snapshot_json LONGTEXT NULL AFTER request_folio",
        'robots_snapshot_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN robots_snapshot_json LONGTEXT NULL AFTER profile_snapshot_json",
        'members_snapshot_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN members_snapshot_json LONGTEXT NULL AFTER robots_snapshot_json",
        'selected_convocatorias_json' => "ALTER TABLE congress_enrollment_requests ADD COLUMN selected_convocatorias_json TEXT NULL AFTER members_snapshot_json",
    ];

    foreach ($checks as $columnName => $alterSql) {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute(['congress_enrollment_requests', $columnName]);
        $exists = (int) $stmt->fetchColumn() > 0;
        if (!$exists) {
            $pdo->exec($alterSql);
        }
    }

    $idxStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'congress_enrollment_requests' AND INDEX_NAME = 'unique_request_folio'"
    );
    $idxStmt->execute();
    $hasIndex = (int) $idxStmt->fetchColumn() > 0;
    if (!$hasIndex) {
        $pdo->exec('ALTER TABLE congress_enrollment_requests ADD UNIQUE KEY unique_request_folio (request_folio)');
    }
}

function generateCongressRequestFolio(
    int $year,
    int $userId,
    PDO $pdo = null,
    string $fullName = '',
    string $ctrlNumber = ''
): string {
    // ── 1. Obtener nombre y número de control ─────────────────────────────────
    // Se usan los parámetros directos con prioridad; solo se consulta la BD
    // si alguno llegó vacío, para no depender del UPDATE previo a la función.
    if (($fullName === '' || $ctrlNumber === '') && $pdo !== null) {
        try {
            $stmt = $pdo->prepare(
                "SELECT COALESCE(full_name, username, '') AS full_name,
                        COALESCE(matricula, control_number, '') AS control_number
                 FROM platform_users WHERE id = ? LIMIT 1"
            );
            $stmt->execute([$userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                if ($fullName === '') {
                    $fullName = trim((string) ($row['full_name'] ?? ''));
                }
                if ($ctrlNumber === '') {
                    $ctrlNumber = trim((string) ($row['control_number'] ?? ''));
                }
            }
        } catch (Throwable $e) {
            // Continúa con lo que haya
        }
    }

    // ── 2. Generar iniciales ──────────────────────────────────────────────────
    // Ej: "Juan Carlos Gonzalez Orozco" → "JCGO"
    $initials = '';
    if ($fullName !== '') {
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $fullName);
        if ($normalized === false || $normalized === '') {
            $normalized = $fullName;
        }
        $words = preg_split('/\s+/', trim($normalized));
        foreach ($words as $word) {
            $word = preg_replace('/[^A-Za-z]/', '', $word);
            if ($word !== '') {
                $initials .= strtoupper($word[0]);
            }
        }
    }
    if ($initials === '') {
        $initials = 'RNV'; // fallback si no hay nombre
    }

    // ── 3. Número de control: solo dígitos ───────────────────────────────────
    $ctrl = preg_replace('/\D/', '', $ctrlNumber);
    if ($ctrl === '') {
        $ctrl = str_pad((string) $userId, 8, '0', STR_PAD_LEFT);
    }

    $baseKey = $initials . '-' . $ctrl;

    // ── 4. Detección de colisiones ────────────────────────────────────────────
    if ($pdo !== null) {
        try {
            $stmtUserReqs = $pdo->prepare("SELECT COUNT(*) FROM congress_enrollment_requests WHERE user_id = ? AND congress_year = ?");
            $stmtUserReqs->execute([$userId, $year]);
            $userReqCount = (int) $stmtUserReqs->fetchColumn();
            
            $folioCandidate = $baseKey;
            if ($userReqCount > 0) {
                $folioCandidate .= 'C' . ($userReqCount + 1);
            }

            $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM congress_enrollment_requests WHERE request_folio = ?");
            $stmtCheck->execute([$folioCandidate]);
            
            if ((int) $stmtCheck->fetchColumn() > 0) {
                for ($attempt = 1; $attempt <= 20; $attempt++) {
                    $testFolio = $folioCandidate . '-' . random_int(10, 99);
                    $stmtCheck->execute([$testFolio]);
                    if ((int) $stmtCheck->fetchColumn() === 0) {
                        return $testFolio;
                    }
                }
                return $folioCandidate . '-' . (time() % 10000);
            }
            return $folioCandidate;
        } catch (Throwable $e) {
            return $baseKey . '-' . random_int(10, 99);
        }
    }

    return $baseKey;
}

// ── Helpers locales seguros (sin extensión mbstring) ──────────────────────────
// Se definen con if(!function_exists) para no colisionar con _auth_common.php
// si ese archivo ya los define correctamente en tu servidor.

if (!function_exists('sanitizeText')) {
    function sanitizeText(string $value): string
    {
        $value = strip_tags(trim($value));
        $value = preg_replace('/\s+/', ' ', $value);
        return $value;
    }
}

if (!function_exists('requiresMatriculaBySchool')) {
    function requiresMatriculaBySchool(string $school): bool
    {
        $school = strtolower(trim($school));
        $keywords = [
            'tecnologico superior de uruapan',
            'tecnológico superior de uruapan',
            'itsu',
        ];
        foreach ($keywords as $kw) {
            if (str_contains($school, $kw)) return true;
        }
        return false;
    }
}

if (!function_exists('getCurrentCongressYear')) {
    function getCurrentCongressYear(): int
    {
        return (int) date('Y');
    }
}

if (!function_exists('getCurrentStage')) {
    function getCurrentStage(): array
    {
        // Devuelve Etapa 1 como fallback; si tu _auth_common.php ya la define
        // con lógica de BD, esa versión prevalecerá por el if(!function_exists).
        return ['name' => 'Etapa 1', 'price' => 130.00];
    }
}