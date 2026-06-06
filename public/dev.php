<?php
// c:\dev\congreso\public\dev.php
session_start();

// Cargar la conexión PDO a la base de datos
require_once __DIR__ . '/../app/config/database.php';

// ========================================================
// 1. CONTRASEÑA DE ACCESO EXCLUSIVA PARA EL DESARROLLADOR
// ========================================================
$DEV_PASSWORD = "Coppel2003$"; 

// Procesar Login
if (isset($_POST['login'])) {
    if ($_POST['password'] === $DEV_PASSWORD) {
        $_SESSION['dev_auth'] = true;
    } else {
        $error = "Contraseña incorrecta";
    }
}

// Cerrar Sesión
if (isset($_GET['logout'])) {
    unset($_SESSION['dev_auth']);
    header("Location: dev.php");
    exit;
}

// 2. Procesar Token de Bypass (La llave mágica para saltar el mantenimiento)
if (isset($_GET['bypass'])) {
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'maintenance_token'");
    $stmt->execute();
    $token = $stmt->fetchColumn();
    
    if ($_GET['bypass'] === $token && !empty($token)) {
        setcookie('dev_bypass', $token, time() + (86400 * 7), '/');
        echo "<div style='font-family:sans-serif; text-align:center; margin-top:0; background:#0b1220; color:#fff; height:100vh; padding-top:100px; box-sizing:border-box;'>";
        echo "<h1 style='color:#10b981;'><i class='fas fa-check-circle'></i> Pase VIP de Desarrollador ACTIVADO</h1>";
        echo "<p style='color:#94a3b8; font-size:1.1rem;'>Tu navegador ha guardado la cookie secreta. Ahora puedes navegar por todo el sitio probando tus cambios mientras los usuarios ven la pantalla de mantenimiento.</p>";
        echo "<br><a href='/' style='display:inline-block; padding:12px 24px; background:#3b82f6; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold; font-size:1.1rem;'>Ir a la Página Principal</a>";
        echo "</div>";
        exit;
    } else {
        echo "<h1 style='color:red; text-align:center; font-family:sans-serif; margin-top:50px;'>Token inválido</h1>";
        exit;
    }
}

// Revocar Token (Quitar modo desarrollador)
if (isset($_GET['revoke'])) {
    setcookie('dev_bypass', '', time() - 3600, '/');
    echo "<div style='font-family:sans-serif; text-align:center; margin-top:100px;'><h1>Pase VIP Revocado</h1><p>Ahora verás el sistema como un usuario normal.</p><a href='/'>Ir al Sistema</a></div>";
    exit;
}

// --- PROTECCIÓN DE LA INTERFAZ ---
if (!isset($_SESSION['dev_auth'])) {
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Dev Login - RENOVATEC</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'DM Sans', sans-serif; background: #0b1220; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin:0; }
        .box { background: #1e293b; padding: 40px; border-radius: 16px; text-align: center; width: 100%; max-width: 350px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155;}
        input { padding: 12px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #fff; margin-bottom: 20px; width: 100%; box-sizing: border-box; outline: none;}
        button { padding: 12px; width: 100%; background: #f2a900; border: none; color: #000; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem;}
        button:hover { background: #eab308; }
    </style>
</head>
<body>
    <form class="box" method="POST">
        <h2 style="margin-top:0;">Acceso DEV</h2>
        <?php if(isset($error)) echo "<p style='color:#ef4444; font-size:0.9rem;'>$error</p>"; ?>
        <input type="password" name="password" placeholder="Ingresa tu contraseña" required>
        <button type="submit" name="login">Entrar al Panel</button>
    </form>
</body>
</html>
<?php
    exit;
}

// Funciones Helper DB
function getSetting($key) {
    global $pdo;
    $s = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
    $s->execute([$key]);
    return $s->fetchColumn();
}

// 3. Guardar Configuración e Inyectar en .htaccess
if (isset($_POST['save_maintenance'])) {
    $active = isset($_POST['active']) ? '1' : '0';
    $start = $_POST['start_date'];
    $end = $_POST['end_date'];
    $msg = $_POST['message'];
    $token = $_POST['token'];

    if(empty($token)) $token = 'DEV_' . bin2hex(random_bytes(4));

    // A) Actualizar Base de Datos
    $settingsToUpdate = [
        'maintenance_active' => $active,
        'maintenance_start' => $start,
        'maintenance_end' => $end,
        'maintenance_message' => $msg,
        'maintenance_token' => $token
    ];
    foreach ($settingsToUpdate as $k => $v) {
        $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?")->execute([$k, $v, $v]);
    }

    // B) Inyectar/Retirar reglas en .htaccess
    $htaccessPath = __DIR__ . '/../.htaccess';
    if (file_exists($htaccessPath)) {
        $htContent = file_get_contents($htaccessPath);
        
        // 1. Limpiamos cualquier regla de mantenimiento anterior
        $htContent = preg_replace('/# BEGIN MAINTENANCE.*?# END MAINTENANCE\r?\n/s', '', $htContent);
        
        // 2. Si está activo, generamos las reglas usando TIME_YEAR de Apache
        if ($active === '1' && !empty($start) && !empty($end)) {
            $startFormatted = date('YmdHi', strtotime($start));
            $endFormatted = date('YmdHi', strtotime($end));
            
            $block = "# BEGIN MAINTENANCE\n";
            $block .= "RewriteCond %{TIME_YEAR}%{TIME_MON}%{TIME_DAY}%{TIME_HOUR}%{TIME_MIN} >=$startFormatted\n";
            $block .= "RewriteCond %{TIME_YEAR}%{TIME_MON}%{TIME_DAY}%{TIME_HOUR}%{TIME_MIN} <$endFormatted\n";
            $block .= "RewriteCond %{HTTP_COOKIE} !dev_bypass=$token\n";
            $block .= "RewriteCond %{REQUEST_URI} !^/mantenimiento\.php$\n";
            $block .= "RewriteCond %{REQUEST_URI} !^/dev\.php$\n";
            // Excluir assets (estilos, imagenes) para que la página de mantenimiento no se vea rota
            $block .= "RewriteCond %{REQUEST_URI} !\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$\n";
            $block .= "RewriteRule ^(.*)$ /mantenimiento.php [R=302,L]\n";
            $block .= "# END MAINTENANCE\n";
            
            // Inyectamos justo después de encender el RewriteEngine
            $htContent = preg_replace('/(RewriteEngine On\r?\n(?:\s*RewriteBase \/\r?\n)?)/', "$1" . $block, $htContent);
        }
        
        file_put_contents($htaccessPath, $htContent);
    }
    
    $successMsg = "Configuración guardada exitosamente y servidor actualizado.";
}

// Cargar Valores para el Formulario
$c_active = getSetting('maintenance_active') === '1';
$c_start = getSetting('maintenance_start');
$c_end = getSetting('maintenance_end');
$c_msg = getSetting('maintenance_message');
$c_token = getSetting('maintenance_token');

// Valores por defecto si apenas lo abres
if(empty($c_start)) $c_start = date('Y-m-d\TH:i');
if(empty($c_end)) $c_end = date('Y-m-d\TH:i', strtotime('+2 days'));
if(empty($c_msg)) $c_msg = "Estamos realizando una actualización en el sistema y solucionando detalles. Volveremos muy pronto.";
if(empty($c_token)) $c_token = 'DEV_' . strtoupper(bin2hex(random_bytes(4)));

$bypassUrl = "https://" . $_SERVER['HTTP_HOST'] . "/dev.php?bypass=" . $c_token;
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Panel del Desarrollador</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
        body { font-family: 'DM Sans', sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 1.8rem; color: #38bdf8; }
        .btn-logout { background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; }
        .btn-logout:hover { background: #ef4444; color: #fff; }
        
        .card { background: #1e293b; border-radius: 16px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid #334155; margin-bottom: 30px;}
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: 500; margin-bottom: 8px; color: #94a3b8; }
        input[type="text"], input[type="datetime-local"], textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #475569; background: #0b1220; color: #fff; box-sizing: border-box; outline: none; font-family: inherit;}
        textarea { resize: vertical; min-height: 80px; }
        
        .switch-wrap { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px dashed #475569;}
        .switch { position: relative; display: inline-block; width: 60px; height: 34px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #475569; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(26px); }
        .switch-label { font-size: 1.2rem; font-weight: bold; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .btn-save { background: #10b981; color: white; border: none; padding: 15px; border-radius: 8px; width: 100%; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;}
        .btn-save:hover { background: #059669; }
        
        .alert-success { background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; color: #10b981; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
        
        .bypass-box { background: rgba(56, 189, 248, 0.1); border: 1px solid #38bdf8; padding: 20px; border-radius: 8px; }
        .bypass-box h3 { margin-top: 0; color: #38bdf8; }
        .bypass-url { background: #0b1220; padding: 12px; border-radius: 6px; font-family: monospace; color: #e2e8f0; word-break: break-all; border: 1px solid #1e293b; user-select: all;}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-terminal"></i> Developer Control Panel</h1>
            <a href="?logout=1" class="btn-logout"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
        </div>

        <?php if(isset($successMsg)) echo "<div class='alert-success'><i class='fas fa-check-circle'></i> $successMsg</div>"; ?>

        <form class="card" method="POST">
            <div class="switch-wrap">
                <label class="switch">
                    <input type="checkbox" name="active" value="1" <?php if($c_active) echo "checked"; ?>>
                    <span class="slider"></span>
                </label>
                <div class="switch-label">
                    <?php echo $c_active ? "<span style='color:#10b981;'><i class='fas fa-tools'></i> Bloqueo de Mantenimiento ACTIVADO</span>" : "<span style='color:#94a3b8;'>Modo Mantenimiento APAGADO</span>"; ?>
                </div>
            </div>

            <div class="grid-2">
                <div class="form-group">
                    <label>Bloquear sitio automáticamente a partir del:</label>
                    <input type="datetime-local" name="start_date" value="<?php echo $c_start; ?>" required>
                </div>
                <div class="form-group">
                    <label>Fecha de Regreso (Levanta el bloqueo solo):</label>
                    <input type="datetime-local" name="end_date" value="<?php echo $c_end; ?>" required>
                </div>
            </div>

            <div class="form-group">
                <label>Mensaje personalizado en la pantalla para los usuarios:</label>
                <textarea name="message" required><?php echo htmlspecialchars($c_msg); ?></textarea>
            </div>

            <div class="form-group">
                <label>Tu Llave / Token secreto:</label>
                <input type="text" name="token" value="<?php echo htmlspecialchars($c_token); ?>" required>
            </div>

            <button type="submit" name="save_maintenance" class="btn-save">
                <i class="fas fa-save"></i> Guardar Configuraciones y Aplicar
            </button>
        </form>

        <div class="card bypass-box">
            <h3><i class="fas fa-key"></i> Enlace de Bypass VIP</h3>
            <p style="color:#94a3b8; font-size:0.95rem; margin-top:0;">Copia y pega esta URL en tu navegador de trabajo. Te otorgará una credencial silenciosa para evadir la pantalla de mantenimiento y probar tu sistema normalmente mientras sigues arreglando fallos.</p>
            <div class="bypass-url">
                <?php echo $bypassUrl; ?>
            </div>
            <div style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 10px;">
                <a href="<?php echo $bypassUrl; ?>" target="_blank" style="display:inline-block; padding:8px 15px; background:#38bdf8; color:#0f172a; text-decoration:none; border-radius:6px; font-weight:bold; font-size:0.9rem;">
                    <i class="fas fa-external-link-alt"></i> Probar Llave Ahora
                </a>
                <a href="?revoke=1" style="display:inline-block; padding:8px 15px; background:transparent; border:1px solid #ef4444; color:#ef4444; text-decoration:none; border-radius:6px; font-weight:bold; font-size:0.9rem;">
                    <i class="fas fa-trash"></i> Eliminar mi Llave Actual
                </a>
            </div>
        </div>
    </div>
</body>
</html>