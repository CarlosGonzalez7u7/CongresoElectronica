<?php
// c:\dev\congreso\mantenimiento.php
require_once __DIR__ . '/app/config/database.php';

// Obtenemos el mensaje dinámico configurado por el desarrollador
$stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'maintenance_message'");
$stmt->execute();
$msg = $stmt->fetchColumn();

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
        <p class="message"><?php echo nl2br(htmlspecialchars($msg)); ?></p>

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
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('score');
        const startMsg = document.getElementById('startMsg');
        const gameContainer = document.getElementById('gameContainer');

        // Assets del juego
        const mascotImg = new Image();
        mascotImg.src = '/public/assets/images/robot-clean-v2.png';

        let gameLoop;
        let isPlaying = false;
        let score = 0;
        let frames = 0;
        let speed = 5;

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
                
                // Dibujar obstáculo (color advertencia simulando bloques rojos)
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 4);
                ctx.fill();

                // Detección de colisión simple con márgenes para evitar golpes injustos
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
            let size = Math.random() * 20 + 20; // Tamaño dinámico
            obstacles.push({
                x: canvas.width,
                y: 190 - size,
                w: 20,
                h: size
            });
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
            scoreEl.innerText = Math.floor(score / 10).toString().padStart(5, '0');
            speed = 5 + Math.floor(score / 1000); // Aceleración paulatina

            if (isPlaying) {
                gameLoop = requestAnimationFrame(update);
            }
        }

        function startGame() {
            if (isPlaying) return;
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
            startMsg.innerText = "¡Ouch! Toca para reiniciar";
            startMsg.style.display = 'block';
            startMsg.style.color = '#ef4444';
        }

        // Controles de escritorio (Barra Espaciadora)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!isPlaying) startGame();
                else robot.jump();
            }
        });

        // Controles para pantallas táctiles y ratón
        gameContainer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (!isPlaying) startGame();
            else robot.jump();
        });

        gameContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!isPlaying) startGame();
            else robot.jump();
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