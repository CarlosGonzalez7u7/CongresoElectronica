<?php
// c:\dev\congreso\app\api\mantenimiento.php
require_once __DIR__ . '/../config/database.php';

// Sobrescribir el header JSON de database.php para que el navegador renderice HTML
header('Content-Type: text/html; charset=utf-8');

$stmt = $pdo->query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('maintenance_end', 'maintenance_message')");
$settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$endDateStr = $settings['maintenance_end'] ?? date('Y-m-d\TH:i:s', strtotime('+1 day'));
$message = $settings['maintenance_message'] ?? "Estamos realizando una actualización en el sistema y solucionando detalles. Volveremos a estar en línea muy pronto.";
?>
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mantenimiento - RENOVATEC 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
      body { margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; background: #0b1220; color: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
      .container { max-width: 600px; padding: 40px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(242,169,0,0.2); border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
      .icon-wrap { font-size: 4rem; color: #f2a900; margin-bottom: 20px; animation: pulse 2s infinite; }
      @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
      h1 { font-family: 'Syne', sans-serif; font-size: 2.2rem; color: #f8fbff; margin: 0 0 15px 0; }
      p { font-size: 1.1rem; color: #94a3b8; line-height: 1.6; margin: 0 0 30px 0; }
      .timer-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-bottom: 20px; }
      .time-box { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px 20px; min-width: 70px; }
      .time-val { display: block; font-family: 'Syne', sans-serif; font-size: 2.5rem; font-weight: 800; color: #38bdf8; line-height: 1; }
      .time-label { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
      .date-target { font-size: 0.95rem; color: #f2a900; font-weight: bold; margin-top: 10px; }
      .logos { margin-top: 50px; display: flex; gap: 20px; opacity: 0.5; align-items: center; justify-content: center;}
      .logos img { height: 40px; object-fit: contain; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon-wrap"><i class="fas fa-tools"></i></div>
      <h1>Sitio en Mantenimiento</h1>
      <p><?php echo htmlspecialchars($message); ?></p>
      
      <div class="timer-grid" id="countdown">
        <!-- JS fills this -->
      </div>
      <div class="date-target" id="targetText"></div>
    </div>

    <div class="logos">
      <img src="assets/images/electro.png" alt="Electrónica">
      <img src="assets/images/tec.png" alt="ITSU">
    </div>
    
    <script>
      const endDate = new Date("<?php echo $endDateStr; ?>");

      const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
      document.getElementById('targetText').textContent = "Regresamos el " + endDate.toLocaleDateString('es-MX', options);

      function update() {
        const diff = endDate - new Date();
        if (diff <= 0) {
          document.getElementById('countdown').innerHTML = "<div style='color:#34d399; font-size:1.2rem; font-weight:bold; padding: 20px;'>¡El mantenimiento ha terminado! Refresca la página.</div>";
          return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);

        document.getElementById('countdown').innerHTML = `
          <div class="time-box"><span class="time-val">${d}</span><span class="time-label">Días</span></div>
          <div class="time-box"><span class="time-val">${h.toString().padStart(2,'0')}</span><span class="time-label">Horas</span></div>
          <div class="time-box"><span class="time-val">${m.toString().padStart(2,'0')}</span><span class="time-label">Min</span></div>
          <div class="time-box"><span class="time-val">${s.toString().padStart(2,'0')}</span><span class="time-label">Seg</span></div>
        `;
      }
      
      setInterval(update, 1000);
      update();
    </script>
  </body>
</html>