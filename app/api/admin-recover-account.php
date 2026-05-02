<?php
require_once __DIR__ . '/../config/database.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!headers_sent()) {
    header_remove('Content-Type');
    header('Content-Type: text/html; charset=utf-8');
}

ensureAdminUsersTable($pdo);

$flashType = '';
$flashMessage = '';
$step = 'identify';
$adminData = null;

if (isset($_GET['cancel']) && $_GET['cancel'] === '1') {
    clearRecoverySession();
    header('Location: admin-recover-account.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string)($_POST['action'] ?? '');

    try {
        if ($action === 'identify') {
            handleIdentifyStep($pdo);
            $flashType = 'success';
            $flashMessage = 'Cuenta localizada. Ahora valida la clave de recuperación.';
        } elseif ($action === 'verify_key') {
            handleVerifyKeyStep();
            $flashType = 'success';
            $flashMessage = 'Clave validada. Ya puedes actualizar las credenciales.';
        } elseif ($action === 'update_credentials') {
            $adminData = getSessionAdminData($pdo);
            if (!$adminData) {
                throw new Exception('La sesión de recuperación expiró. Regresa al inicio.');
            }

            $adminData = handleUpdateCredentialsStep($pdo, $adminData);
            $flashType = 'success';
            $flashMessage = 'Credenciales actualizadas correctamente.';
        } else {
            throw new Exception('Acción no válida.');
        }
    } catch (Throwable $e) {
        $flashType = 'error';
        $flashMessage = APP_DEBUG ? $e->getMessage() : 'No se pudo completar la operación.';
    }
}

$pendingAdminId = (int)($_SESSION['admin_recovery_pending_id'] ?? 0);
$isKeyVerified = !empty($_SESSION['admin_recovery_key_verified']);

if ($pendingAdminId > 0 && !$isKeyVerified) {
    $step = 'key';
} elseif ($pendingAdminId > 0 && $isKeyVerified) {
    $step = 'update';
    $adminData = getSessionAdminData($pdo);
    if (!$adminData) {
        clearRecoverySession();
        $step = 'identify';
        $flashType = 'error';
        $flashMessage = 'No se encontró la cuenta de la sesión. Vuelve a iniciar el proceso.';
    }
}

function handleIdentifyStep(PDO $pdo): void
{
    $identifier = strtolower(trim((string)($_POST['identifier'] ?? '')));
    if ($identifier === '') {
        throw new Exception('Ingresa un nombre de usuario o correo.');
    }

    $stmt = $pdo->prepare(
        'SELECT id, username, email FROM admin_users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1'
    );
    $stmt->execute([$identifier, $identifier]);
    $admin = $stmt->fetch();

    if (!$admin) {
        throw new Exception('No existe una cuenta admin con ese usuario o correo.');
    }

    $_SESSION['admin_recovery_pending_id'] = (int)$admin['id'];
    $_SESSION['admin_recovery_key_verified'] = false;
}

function handleVerifyKeyStep(): void
{
    $expectedKey = trim((string)envValue('ADMIN_RECOVERY_KEY', ''));
    if ($expectedKey === '') {
        throw new Exception('Falta configurar ADMIN_RECOVERY_KEY en app/.env.local');
    }

    if (empty($_SESSION['admin_recovery_pending_id'])) {
        throw new Exception('Primero identifica una cuenta válida.');
    }

    $inputKey = trim((string)($_POST['recovery_key'] ?? ''));
    if ($inputKey === '') {
        throw new Exception('Ingresa la clave de recuperación.');
    }

    if (!hash_equals($expectedKey, $inputKey)) {
        throw new Exception('Clave incorrecta. Acceso denegado.');
    }

    $_SESSION['admin_recovery_key_verified'] = true;
}

function handleUpdateCredentialsStep(PDO $pdo, array $adminData): array
{
    if (empty($_SESSION['admin_recovery_key_verified'])) {
        throw new Exception('Debes validar la clave antes de actualizar.');
    }

    $currentUsername = (string)$adminData['username'];
    $currentEmail = (string)$adminData['email'];

    $newUsername = strtolower(trim((string)($_POST['new_username'] ?? '')));
    $newEmail = strtolower(trim((string)($_POST['new_email'] ?? '')));
    $newPassword = (string)($_POST['new_password'] ?? '');
    $confirmPassword = (string)($_POST['confirm_password'] ?? '');

    $targetUsername = $newUsername !== '' ? $newUsername : $currentUsername;
    $targetEmail = $newEmail !== '' ? $newEmail : $currentEmail;

    if ($targetUsername === '' || $targetEmail === '') {
        throw new Exception('Usuario y correo no pueden quedar vacíos.');
    }

    if (!preg_match('/^[a-z0-9_.-]{4,60}$/', $targetUsername)) {
        throw new Exception('Usuario inválido: usa 4-60 caracteres (a-z, 0-9, punto, guion o guion bajo).');
    }

    if (!filter_var($targetEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Correo electrónico inválido.');
    }

    if ($newPassword !== $confirmPassword) {
      throw new Exception('La contraseña y su confirmación no coinciden.');
    }

    $stmtUser = $pdo->prepare('SELECT id FROM admin_users WHERE LOWER(username) = ? AND id <> ? LIMIT 1');
    $stmtUser->execute([$targetUsername, (int)$adminData['id']]);
    if ($stmtUser->fetch()) {
        throw new Exception('El nombre de usuario ya está en uso por otra cuenta.');
    }

    $stmtEmail = $pdo->prepare('SELECT id FROM admin_users WHERE LOWER(email) = ? AND id <> ? LIMIT 1');
    $stmtEmail->execute([$targetEmail, (int)$adminData['id']]);
    if ($stmtEmail->fetch()) {
        throw new Exception('El correo electrónico ya está en uso por otra cuenta.');
    }

    $updateFields = ['username = ?', 'email = ?', 'updated_at = NOW()'];
    $params = [$targetUsername, $targetEmail];

    if ($newPassword !== '') {
        $updateFields[] = 'password_hash = ?';
        $params[] = password_hash($newPassword, PASSWORD_DEFAULT);
    }

    $params[] = (int)$adminData['id'];

    $sql = 'UPDATE admin_users SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $stmtReload = $pdo->prepare('SELECT id, username, email FROM admin_users WHERE id = ? LIMIT 1');
    $stmtReload->execute([(int)$adminData['id']]);
    $updated = $stmtReload->fetch();

    if (!$updated) {
        throw new Exception('No se pudo recargar la cuenta actualizada.');
    }

    return $updated;
}

function getSessionAdminData(PDO $pdo): ?array
{
    $adminId = (int)($_SESSION['admin_recovery_pending_id'] ?? 0);
    if ($adminId <= 0) {
        return null;
    }

    $stmt = $pdo->prepare('SELECT id, username, email FROM admin_users WHERE id = ? LIMIT 1');
    $stmt->execute([$adminId]);
    $admin = $stmt->fetch();

    return $admin ?: null;
}

function clearRecoverySession(): void
{
    unset($_SESSION['admin_recovery_pending_id']);
    unset($_SESSION['admin_recovery_key_verified']);
}

function ensureAdminUsersTable($pdo): void
{
    $pdo->exec("\n        CREATE TABLE IF NOT EXISTS admin_users (\n            id INT AUTO_INCREMENT PRIMARY KEY,\n            username VARCHAR(60) NOT NULL UNIQUE,\n            full_name VARCHAR(150) NOT NULL,\n            email VARCHAR(150) NULL,\n            password_hash VARCHAR(255) NOT NULL,\n            role ENUM('superadmin', 'reviewer', 'staff') DEFAULT 'staff',\n            is_active TINYINT(1) DEFAULT 1,\n            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n            last_login_at TIMESTAMP NULL,\n            INDEX idx_admin_active (is_active),\n            INDEX idx_admin_role (role)\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci\n    ");
}

function isStrongPassword($password): bool
{
    return strlen($password) >= 10
        && preg_match('/[A-Z]/', $password)
        && preg_match('/[a-z]/', $password)
        && preg_match('/\d/', $password)
        && preg_match('/[^A-Za-z0-9]/', $password);
}

function esc($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}
?>
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portal de Recuperación Admin</title>
    <link rel="icon" type="image/x-icon" href="../../public/assets/images/logo.ico" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css';"
    />
    <style>
      :root {
        color-scheme: dark;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #1c3556 0%, #081121 64%);
        color: #e2e8f0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      }

      .page-shell {
        width: min(100%, 760px);
        position: relative;
      }

      .panel {
        width: 100%;
        background: linear-gradient(155deg, #10192b, #0b1424);
        border: 1px solid rgba(148, 163, 184, 0.26);
        border-radius: 18px;
        box-shadow: 0 26px 56px rgba(0, 0, 0, 0.44);
        overflow: hidden;
      }

      .head {
        padding: 20px 24px 14px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        background: linear-gradient(120deg, rgba(59, 130, 246, 0.16), rgba(6, 182, 212, 0.08));
      }

      .logos {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .logos span {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }

      .logos .ieee { background: #ffffff; }

      .logos img {
        width: 44px;
        height: 44px;
        object-fit: contain;
      }

      h1 {
        margin: 0;
        font-size: 1.45rem;
      }

      .subtitle {
        margin: 6px 0 0;
        color: #bfdbfe;
        font-size: 0.92rem;
      }

      .body { padding: 18px 24px 24px; }

      .stepper {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }

      .step {
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        padding: 8px 10px;
        font-size: 0.8rem;
        text-align: center;
        color: #94a3b8;
      }

      .step.active {
        border-color: rgba(59, 130, 246, 0.8);
        color: #dbeafe;
        background: rgba(59, 130, 246, 0.18);
      }

      .status {
        margin-bottom: 12px;
        border-radius: 10px;
        padding: 10px 12px;
        font-weight: 700;
        font-size: 0.9rem;
      }

      .status.success {
        color: #6ee7b7;
        border: 1px solid rgba(16, 185, 129, 0.5);
        background: rgba(16, 185, 129, 0.16);
      }

      .status.error {
        color: #fca5a5;
        border: 1px solid rgba(248, 113, 113, 0.5);
        background: rgba(248, 113, 113, 0.14);
      }

      .group { display: grid; gap: 12px; }

      .field { display: grid; gap: 6px; }

      .field label {
        font-size: 0.9rem;
        color: #cbd5e1;
      }

      input {
        width: 100%;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        background: #081223;
        color: #f8fafc;
        padding: 11px 12px;
      }

      .help {
        margin: 0;
        color: #93c5fd;
        font-size: 0.82rem;
      }

      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
      }

      .btn {
        border: none;
        border-radius: 10px;
        padding: 11px 12px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        text-align: center;
      }

      .btn-primary {
        color: #fff;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
      }

      .btn-secondary {
        color: #dbeafe;
        background: rgba(148, 163, 184, 0.16);
        border: 1px solid rgba(148, 163, 184, 0.3);
      }

      .legal-warning {
        margin-top: 16px;
        border-radius: 12px;
        border: 1px solid rgba(239, 68, 68, 0.48);
        background: rgba(127, 29, 29, 0.23);
        padding: 12px;
      }

      .legal-warning strong { color: #fecaca; }

      .legal-warning p {
        margin: 8px 0 0;
        color: #fca5a5;
        font-size: 0.84rem;
        line-height: 1.45;
      }

      .snapshot {
        margin-top: 12px;
        border: 1px solid rgba(148, 163, 184, 0.26);
        border-radius: 10px;
        padding: 10px 12px;
        background: #0b1628;
        font-size: 0.9rem;
      }

      .snapshot-row {
        margin: 6px 0;
        color: #e2e8f0;
      }

      .footer-note {
        margin-top: 14px;
        color: #93a4bd;
        font-size: 0.8rem;
      }

      .modal {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(2, 6, 23, 0.82);
        backdrop-filter: blur(10px);
        z-index: 9999;
      }

      .modal.is-hidden {
        display: none;
      }

      .modal.is-hidden { display: none; }

      .modal-card {
        width: min(100%, 760px);
        max-height: min(88vh, 840px);
        overflow: auto;
        border-radius: 18px;
        border: 1px solid rgba(248, 113, 113, 0.5);
        background: linear-gradient(160deg, #111827, #0b1120);
        box-shadow: 0 28px 72px rgba(0, 0, 0, 0.5);
        padding: 22px;
      }

      .modal-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid rgba(248, 113, 113, 0.45);
        background: rgba(127, 29, 29, 0.24);
        color: #fecaca;
        font-size: 0.8rem;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .modal-card h2 {
        margin: 0 0 10px;
        font-size: 1.45rem;
      }

      .modal-card p,
      .modal-card li {
        color: #cbd5e1;
        line-height: 1.55;
      }

      .modal-grid {
        display: grid;
        gap: 14px;
        margin-top: 16px;
      }

      .modal-box {
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(15, 23, 42, 0.88);
        padding: 14px 16px;
      }

      .modal-box strong { color: #fca5a5; }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 18px;
      }

      .modal-close-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 12px;
        color: #93c5fd;
        font-size: 0.85rem;
        text-decoration: none;
      }

      .password-field-wrap {
        position: relative;
      }

      .password-field-wrap .toggle-eye {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        border: none;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        width: 30px;
        height: 30px;
        border-radius: 8px;
      }

      .password-field-wrap .toggle-eye:hover {
        color: #e2e8f0;
        background: rgba(148, 163, 184, 0.12);
      }

      .password-field-wrap input {
        padding-right: 44px;
      }

      .password-meter {
        margin-top: 8px;
        display: grid;
        gap: 6px;
      }

      .password-meter-bar {
        width: 100%;
        height: 9px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.18);
        overflow: hidden;
      }

      .password-meter-fill {
        width: 0;
        height: 100%;
        border-radius: inherit;
        transition: width 0.2s ease, background-color 0.2s ease;
        background: linear-gradient(90deg, #ef4444, #f59e0b);
      }

      .password-meter-text {
        font-size: 0.8rem;
        color: #94a3b8;
      }

      .modal-ok {
        min-width: 140px;
        border: none;
        border-radius: 10px;
        padding: 11px 14px;
        font-weight: 800;
        cursor: pointer;
        color: #ffffff;
        background: linear-gradient(135deg, #ef4444, #b91c1c);
      }

      @media (max-width: 620px) {
        .actions { grid-template-columns: 1fr; }
        .stepper { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div id="legalModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="legalTitle">
      <section class="modal-card">
        <div class="modal-badge"><i class="fas fa-triangle-exclamation"></i> Aviso legal y de uso restringido</div>
        <h2 id="legalTitle">Acceso exclusivo para personal autorizado</h2>
        <p>
          Este portal permite recuperar o actualizar credenciales administrativas únicamente a usuarios autorizados.
          Cualquier intento de acceso, modificación, suplantación o manipulación sin permiso puede ser investigado,
          bloqueado y documentado por el sistema.
        </p>

        <div class="modal-grid">
          <div class="modal-box">
            <strong>Marco legal en México</strong>
            <p>
              La manipulación no autorizada de sistemas, cuentas o datos puede generar responsabilidades conforme al
              Código Penal Federal, en especial los supuestos de acceso ilícito a sistemas y equipos de informática
              (artículos 211 Bis 1 al 211 Bis 7), además de la legislación aplicable en materia de protección de datos personales.
            </p>
          </div>
          <div class="modal-box">
            <strong>Consecuencia de uso indebido</strong>
            <p>
              Un intento no autorizado puede quedar registrado, bloquear la sesión y ser puesto a disposición de la autoridad competente.
              El uso indebido de credenciales o datos de terceros puede derivar en sanciones administrativas, civiles o penales, según corresponda.
            </p>
          </div>
          <div class="modal-box">
            <strong>Confirmación de responsabilidad</strong>
            <p>
              Al continuar, declaras bajo tu responsabilidad que cuentas con autorización para modificar estas credenciales y que la información capturada es verídica.
            </p>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="modal-ok" id="legalOkBtn">OK</button>
        </div>
      </section>
    </div>

    <section class="page-shell">
      <section class="panel">
        <header class="head">
          <div class="logos" aria-label="Instituciones">
            <span><img src="../../public/assets/images/tec.png" alt="Logo Tec" /></span>
            <span><img src="../../public/assets/images/electro.png" alt="Logo Electronica" /></span>
            <span class="ieee"><img src="../../public/assets/images/IEEE.png" alt="Logo IEEE" onerror="this.onerror=null;this.src='../../public/assets/images/IEEE.jpeg';" /></span>
          </div>
          <h1>Portal de Recuperación Administrativa</h1>
          <p class="subtitle">Acceso controlado para actualización de credenciales del panel administrativo.</p>
        </header>

        <div class="body">
          <div class="stepper">
            <div class="step <?= $step === 'identify' ? 'active' : '' ?>">1. Identificar cuenta</div>
            <div class="step <?= $step === 'key' ? 'active' : '' ?>">2. Validar clave</div>
            <div class="step <?= $step === 'update' ? 'active' : '' ?>">3. Actualizar credenciales</div>
          </div>

          <?php if ($flashMessage !== ''): ?>
            <div class="status <?= esc($flashType) ?>"><?= esc($flashMessage) ?></div>
          <?php endif; ?>

          <?php if ($step === 'identify'): ?>
            <form method="post" autocomplete="off" novalidate>
              <input type="hidden" name="action" value="identify" />
              <div class="group">
                <div class="field">
                  <label for="identifier">Nombre de usuario o correo</label>
                  <input id="identifier" name="identifier" type="text" placeholder="Ejemplo: admin o admin@dominio.com" required />
                  <p class="help">Se localizará la cuenta antes de solicitar la clave ADMIN_RECOVERY_KEY.</p>
                </div>
              </div>
              <div class="actions">
                <button type="submit" class="btn btn-primary">Continuar</button>
                <a href="../../public/admin.html" class="btn btn-secondary">Cancelar</a>
              </div>
            </form>
          <?php elseif ($step === 'key'): ?>
            <?php $pending = getSessionAdminData($pdo); ?>
            <div class="snapshot">
              <div class="snapshot-row"><strong>Cuenta identificada:</strong> <?= esc($pending['username'] ?? '-') ?></div>
              <div class="snapshot-row"><strong>Correo actual:</strong> <?= esc($pending['email'] ?? '-') ?></div>
            </div>

            <form method="post" autocomplete="off" novalidate>
              <input type="hidden" name="action" value="verify_key" />
              <div class="group">
                <div class="field">
                  <label for="recovery_key">Clave de recuperación (ADMIN_RECOVERY_KEY)</label>
                  <input id="recovery_key" name="recovery_key" type="password" required />
                  <p class="help">Solo personal autorizado debe conocer esta clave.</p>
                </div>
              </div>
              <div class="actions">
                <button type="submit" class="btn btn-primary">Validar clave</button>
                <a href="admin-recover-account.php?cancel=1" class="btn btn-secondary">Cancelar proceso</a>
              </div>
            </form>
          <?php else: ?>
            <div class="snapshot">
              <div class="snapshot-row"><strong>Editando cuenta:</strong> <?= esc($adminData['username'] ?? '-') ?></div>
              <div class="snapshot-row"><strong>Correo actual:</strong> <?= esc($adminData['email'] ?? '-') ?></div>
            </div>

            <form method="post" autocomplete="off" novalidate>
              <input type="hidden" name="action" value="update_credentials" />
              <div class="group">
                <div class="field">
                  <label for="new_username">Nuevo nombre de usuario</label>
                  <input id="new_username" name="new_username" type="text" placeholder="Déjalo vacío para conservar el actual" />
                </div>

                <div class="field">
                  <label for="new_email">Nuevo correo</label>
                  <input id="new_email" name="new_email" type="email" placeholder="Déjalo vacío para conservar el actual" />
                </div>

                <div class="field">
                  <label for="new_password">Nueva contraseña</label>
                  <div class="password-field-wrap">
                    <input id="new_password" name="new_password" type="password" placeholder="Déjala vacía para conservar la actual" />
                    <button type="button" class="toggle-eye" data-toggle-password="new_password" aria-label="Mostrar u ocultar contraseña">
                      <i class="fas fa-eye"></i>
                    </button>
                  </div>
                  <div class="password-meter" aria-live="polite">
                    <div class="password-meter-bar"><div id="passwordMeterFill" class="password-meter-fill"></div></div>
                    <div id="passwordMeterText" class="password-meter-text">Seguridad: sin evaluar</div>
                  </div>
                </div>

                <div class="field">
                  <label for="confirm_password">Confirmar contraseña</label>
                  <div class="password-field-wrap">
                    <input id="confirm_password" name="confirm_password" type="password" placeholder="Repite la contraseña" />
                    <button type="button" class="toggle-eye" data-toggle-password="confirm_password" aria-label="Mostrar u ocultar contraseña">
                      <i class="fas fa-eye"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="actions">
                <button type="submit" class="btn btn-primary">Guardar cambios</button>
                <button type="submit" class="btn btn-secondary" name="end_session" value="1">Guardar y finalizar</button>
              </div>

              <div class="actions" style="margin-top:8px;">
                <a href="admin-recover-account.php?cancel=1" class="btn btn-secondary">Cancelar</a>
                <a href="../../public/admin.html" class="btn btn-secondary">Volver al login</a>
              </div>
            </form>
          <?php endif; ?>

          <aside class="legal-warning" aria-live="polite">
            <strong>Advertencia legal y de seguridad</strong>
            <p>
              Este portal es de uso exclusivo para personal autorizado. Todo acceso, validación y cambio de credenciales puede ser auditado.
              Cualquier intento de manipulación no autorizada, suplantación de identidad o uso indebido de datos puede constituir una
              infracción administrativa y/o delito conforme a la normativa aplicable.
            </p>
          </aside>

          <p class="footer-note">Portal de uso permanente para personal autorizado. Mantén actualizada la clave de recuperación y protege el acceso al servidor.</p>
        </div>
      </section>
    </section>

    <script>
      (function () {
        const modal = document.getElementById('legalModal');
        const okBtn = document.getElementById('legalOkBtn');
        const modalSeenKey = 'adminRecoveryLegalSeen';
        const passwordInput = document.getElementById('new_password');
        const meterFill = document.getElementById('passwordMeterFill');
        const meterText = document.getElementById('passwordMeterText');

        function setModalVisibility() {
          if (!modal) {
            return;
          }
          if (window.sessionStorage.getItem(modalSeenKey) === '1') {
            modal.classList.add('is-hidden');
          } else {
            modal.classList.remove('is-hidden');
          }
        }

        if (!modal || !okBtn) {
          return;
        }

        function dismissModal() {
          window.sessionStorage.setItem(modalSeenKey, '1');
          modal.classList.add('is-hidden');
        }

        function evaluatePassword(value) {
          const lengthScore = Math.min(40, value.length * 4);
          const varietyScore =
            (/[a-z]/.test(value) ? 15 : 0) +
            (/[A-Z]/.test(value) ? 15 : 0) +
            (/\d/.test(value) ? 15 : 0) +
            (/[^A-Za-z0-9]/.test(value) ? 15 : 0);
          const score = Math.min(100, lengthScore + varietyScore);

          if (!meterFill || !meterText) {
            return;
          }

          meterFill.style.width = `${score}%`;
          if (score < 25) {
            meterFill.style.background = 'linear-gradient(90deg, #ef4444, #f97316)';
            meterText.textContent = 'Seguridad: baja';
          } else if (score < 55) {
            meterFill.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
            meterText.textContent = 'Seguridad: media';
          } else if (score < 80) {
            meterFill.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
            meterText.textContent = 'Seguridad: buena';
          } else {
            meterFill.style.background = 'linear-gradient(90deg, #14b8a6, #3b82f6)';
            meterText.textContent = 'Seguridad: alta';
          }
        }

        setModalVisibility();
        okBtn.addEventListener('click', dismissModal);

        document.querySelectorAll('[data-toggle-password]').forEach((button) => {
          button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-toggle-password');
            const input = document.getElementById(targetId);
            const icon = button.querySelector('i');
            if (!input || !icon) {
              return;
            }
            const shouldShow = input.type === 'password';
            input.type = shouldShow ? 'text' : 'password';
            icon.className = shouldShow ? 'fas fa-eye-slash' : 'fas fa-eye';
          });
        });

        if (passwordInput) {
          evaluatePassword(passwordInput.value || '');
          passwordInput.addEventListener('input', () => evaluatePassword(passwordInput.value || ''));
        }

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            dismissModal();
          }
        });
      })();
    </script>
  </body>
</html>
