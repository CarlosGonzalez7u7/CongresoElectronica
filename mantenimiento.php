<?php
// c:\dev\congreso\mantenimiento.php
require_once __DIR__ . '/app/config/database.php';

// 1. Sobrescribir el header JSON de database.php para que el navegador renderice HTML
header('Content-Type: text/html; charset=utf-8');

// 2. Detectar si la petición es AJAX/Fetch invisible (API). Si es así, devolvemos JSON y error 503
$isAjax = (!empty($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) 
       || (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
       || (!empty($_SERVER['HTTP_SEC_FETCH_DEST']) && $_SERVER['HTTP_SEC_FETCH_DEST'] === 'empty');

if ($isAjax) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'maintenance_active', 'message' => 'Sistema en mantenimiento']);
    exit;
}

// Obtenemos el mensaje dinámico configurado por el desarrollador
$stmt = $pdo->prepare("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('maintenance_message', 'maintenance_end')");
$stmt->execute();
$settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$msg = $settings['maintenance_message'] ?? '';
$endDateStr = $settings['maintenance_end'] ?? date('Y-m-d\TH:i:s', strtotime('+1 day'));

if (empty($msg)) {
    $msg = "Estamos realizando una actualización en el sistema y solucionando detalles. Volveremos muy pronto.";
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mantenimiento - RENOVATEC 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="icon" type="image/x-icon" href="assets/images/logo.ico" />
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #0b1220;
            color: #f8fafc;
            font-family: 'DM Sans', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            overflow: hidden;
        }
        .container {
            max-width: 800px;
            padding: 40px 20px;
            z-index: 2;
        }
        h1 {
            font-family: 'Syne', sans-serif;
            color: #38bdf8;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        p.message {
            font-size: 1.1rem;
            color: #94a3b8;
            margin-bottom: 40px;
            line-height: 1.6;
        }
        .timer-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
            margin-bottom: 30px;
        }
        .time-box { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px 20px; min-width: 70px; }
        .time-val { display: block; font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 800; color: #38bdf8; line-height: 1; }
        .time-label { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
        .game-container {
            position: relative;
            width: 100%;
            max-width: 600px;
            height: 200px;
            margin: 0 auto;
            border-bottom: 3px solid #334155;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 12px 12px 0 0;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.2);
            cursor: pointer;
        }
        .start-msg {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: bold;
            color: #38bdf8;
            font-size: 1.2rem;
            pointer-events: none;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            animation: blink 1.5s infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
        .score {
            position: absolute;
            top: 15px;
            right: 20px;
            font-family: monospace;
            font-size: 1.2rem;
            font-weight: bold;
            color: #94a3b8;
        }
        .logos {
            margin-top: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            opacity: 0.5;
        }
        .logos img {
            height: 35px;
        }
        .bg-glow {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 60%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="bg-glow"></div>
    <div class="container">
        <h1><i class="fas fa-tools"></i> En Mantenimiento</h1>
        
        <!-- Renderizado de HTML Directo de Quill -->
        <div class="message"><?php echo $msg; ?></div>

        <div class="timer-grid" id="countdown">
            <!-- JS fills this -->
        </div>

        <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 10px;">Presiona ESPACIO o TOCA el recuadro para jugar mientras esperas</p>
        
        <div class="game-container" id="gameContainer">
            <div class="start-msg" id="startMsg">Toca para empezar</div>
            <div class="score" id="score">00000</div>
            <canvas id="gameCanvas" width="600" height="200"></canvas>
        </div>

        <div class="logos">
            <img src="/public/assets/images/tec.png" alt="ITSU">
            <img src="/public/assets/images/electro.png" alt="Electrónica">
        </div>
    </div>

    <script>
        // --- Lógica del temporizador ---
        const endDate = new Date("<?php echo $endDateStr; ?>");
        function updateTimer() {
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
        setInterval(updateTimer, 1000);
        updateTimer();

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('score');
        const startMsg = document.getElementById('startMsg');
        const gameContainer = document.getElementById('gameContainer');

        // ================= MOTOR DE SONIDO (WEB AUDIO API) =================
        let audioCtx;
        function initAudio() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        }
        function playTone(freq, type, duration, vol=0.1) {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            if(type === 'square' || type === 'sawtooth') osc.frequency.exponentialRampToValueAtTime(freq/2, audioCtx.currentTime + duration);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + duration);
        }
        function playJump() { playTone(300, 'sine', 0.2, 0.1); setTimeout(()=>playTone(600, 'sine', 0.2, 0.1), 50); }
        function playHit() { playTone(150, 'sawtooth', 0.4, 0.2); }
        function playScoreSound() { playTone(800, 'square', 0.1, 0.05); setTimeout(()=>playTone(1200, 'square', 0.2, 0.05), 100); }

        // Assets del juego
        const mascotImg = new Image();
        mascotImg.src = '/public/assets/images/robot-clean-v2.png';

        let gameLoop;
        let isPlaying = false;
        let score = 0;
        let highScore = localStorage.getItem('renovatec_maint_hi') || 0;
        let frames = 0;
        let speed = 5;

        function updateScoreDisplay() {
            const currStr = Math.floor(score / 10).toString().padStart(5, '0');
            const hiStr = Math.floor(highScore / 10).toString().padStart(5, '0');
            scoreEl.innerText = `HI ${hiStr}   ${currStr}`;
        }
        updateScoreDisplay();

        const robot = {
            x: 50,
            y: 150,
            w: 45,
            h: 45,
            dy: 0,
            jumpForce: 11,
            originalY: 150,
            grounded: false,
            draw() {
                if (mascotImg.complete) {
                    ctx.drawImage(mascotImg, this.x, this.y, this.w, this.h);
                } else {
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(this.x, this.y, this.w, this.h);
                }
            },
            jump() {
                if (this.grounded) {
                    this.dy = -this.jumpForce;
                    this.grounded = false;
                }
            }
        };

        const obstacles = [];
        const gravity = 0.6;

        function drawObstacles() {
            for (let i = 0; i < obstacles.length; i++) {
                let obs = obstacles[i];
                obs.x -= speed;
                
                ctx.save();
                ctx.translate(obs.x + obs.w/2, obs.y + obs.h/2);
                
                // Dibujo Vectorial Tecnológico
                if (obs.type === 'chip') {
                    ctx.fillStyle = '#334155'; ctx.fillRect(-12, -12, 24, 24);
                    ctx.fillStyle = '#94a3b8';
                    for(let p=-8; p<=8; p+=4) {
                        ctx.fillRect(p-1, -15, 2, 4); ctx.fillRect(p-1, 11, 2, 4);
                        ctx.fillRect(-15, p-1, 4, 2); ctx.fillRect(11, p-1, 4, 2);
                    }
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath(); ctx.arc(-5, -5, 2.5, 0, Math.PI*2); ctx.fill();
                } else if (obs.type === 'lightning') {
                    ctx.fillStyle = '#eab308';
                    ctx.shadowColor = '#eab308'; ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.moveTo(-4, -14); ctx.lineTo(8, -14); ctx.lineTo(2, -2);
                    ctx.lineTo(10, -2); ctx.lineTo(-6, 16); ctx.lineTo(-2, 4);
                    ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
                } else {
                    ctx.fillStyle = '#64748b';
                    ctx.rotate(frames * 0.05);
                    ctx.beginPath();
                    for(let g=0; g<8; g++) { ctx.lineTo(14, -4); ctx.lineTo(14, 4); ctx.rotate(Math.PI/4); }
                    ctx.fill();
                    ctx.fillStyle = '#1e293b';
                    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
                }
                ctx.restore();

                if (
                    robot.x + 5 < obs.x + obs.w &&
                    robot.x + robot.w - 5 > obs.x &&
                    robot.y + 5 < obs.y + obs.h &&
                    robot.y + robot.h - 5 > obs.y
                ) {
                    gameOver();
                }
            }
            
            // Remover obstáculos que salieron de pantalla
            if (obstacles.length > 0 && obstacles[0].x < -50) {
                obstacles.shift();
            }
        }

        function spawnObstacle() {
            let r = Math.random();
            if (r < 0.33) {
                obstacles.push({ x: canvas.width, y: 190 - 28, w: 28, h: 28, type: 'gear' }); // Engrane en suelo
            } else if (r < 0.66) {
                obstacles.push({ x: canvas.width, y: 110 - Math.random()*30, w: 24, h: 24, type: 'chip' }); // Microchip Volador
            } else {
                obstacles.push({ x: canvas.width, y: 100 - Math.random()*40, w: 20, h: 30, type: 'lightning' }); // Rayo Aéreo
            }
        }

        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Gravedad
            robot.y += robot.dy;
            if (robot.y + robot.h < 190) {
                robot.dy += gravity;
                robot.grounded = false;
            } else {
                robot.dy = 0;
                robot.grounded = true;
                robot.y = 190 - robot.h;
            }

            robot.draw();
            drawObstacles();

            // Dibujar suelo oscuro
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 190, canvas.width, 10);

            // Aumentar dificultad
            frames++;
            if (frames % Math.max(50, 120 - Math.floor(score / 10)) === 0) {
                spawnObstacle();
            }

            score++;
            if (score > highScore) { highScore = score; localStorage.setItem('renovatec_maint_hi', highScore); }
            if (score > 0 && score % 1000 === 0) playScoreSound(); // Hito cada 100 puntos visuales
            
            updateScoreDisplay();

            speed = 5 + Math.floor(score / 1000); // Aceleración paulatina

            if (isPlaying) {
                gameLoop = requestAnimationFrame(update);
            }
        }

        function startGame() {
            if (isPlaying) return;
            initAudio();
            isPlaying = true;
            score = 0;
            frames = 0;
            speed = 5;
            obstacles.length = 0;
            robot.y = robot.originalY;
            robot.dy = 0;
            startMsg.style.display = 'none';
            update();
        }

        function gameOver() {
            isPlaying = false;
            playHit();
            startMsg.innerText = "¡Ouch! Toca para reiniciar";
            startMsg.style.display = 'block';
            startMsg.style.color = '#ef4444';
        }

        // Controles de escritorio (Barra Espaciadora)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!isPlaying) startGame();
                else { robot.jump(); playJump(); }
            }
        });

        // Controles para pantallas táctiles y ratón
        gameContainer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (!isPlaying) startGame();
            else { robot.jump(); playJump(); }
        });

        gameContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!isPlaying) startGame();
            else { robot.jump(); playJump(); }
        });

        // Renderizado del estado inicial
        mascotImg.onload = () => {
            if (!isPlaying) {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, 190, canvas.width, 10);
                robot.draw();
            }
        };
    </script>
</body>
</html>