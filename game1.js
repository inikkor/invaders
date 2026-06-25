const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

canvas.width = 800;
canvas.height = 600;

// Game constants
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const ALIEN_ROWS = 5;
const ALIEN_COLS = 10;
const ALIEN_WIDTH = 35;
const ALIEN_HEIGHT = 35;
const ALIEN_PADDING = 15;
const ALIEN_OFFSET_TOP = 60;
const ALIEN_OFFSET_LEFT = 60;

const alienShape = [
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 1, 1, 1, 0, 0, 0],
];

// Sound Manager using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type, frequency = null) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch (type) {
        case 'shoot':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(440, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
        case 'hit':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, now);
            oscillator.frequency.linearRampToValueAtTime(50, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
        case 'gameover':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.5);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
            break;
        case 'ufo':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(220, now);
            oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.2);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;
    }
}

// Game state
let score = 0;
let lives = 3;
let gameRunning = true;
let enemies = [];
let bullets = [];
let particles = [];
let enemyDirection = 1;
let shakeTime = 0;

let player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: canvas.height - 50,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    accel: 0.8,
    friction: 0.9,
    vx: 0,
    color: '#00FF00'
};

let keys = {};
let stars = [];

// Initialize stars
function initStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

// Initialize game
function init() {
    score = 0;
    lives = 3;
    gameRunning = true;
    enemies = [];
    bullets = [];
    particles = [];
    enemyDirection = 1;
    shakeTime = 0;

    player.x = canvas.width / 2 - PLAYER_WIDTH / 2;

    scoreElement.innerText = `Score: ${score}`;
    livesElement.innerText = `Lives: ${lives}`;
    gameOverScreen.classList.add('hidden');

    for (let row = 0; row < ALIEN_ROWS; row++) {
        for (let col = 0; col < ALIEN_COLS; col++) {
            enemies.push({
                x: col * (ALIEN_WIDTH + ALIEN_PADDING) + ALIEN_OFFSET_LEFT,
                y: row * (ALIEN_HEIGHT + ALIEN_PADDING) + ALIEN_OFFSET_TOP,
                width: ALIEN_WIDTH,
                height: ALIEN_HEIGHT,
                points: (ALIEN_ROWS - row) * 10,
                color: row % 2 === 0 ? '#FF0000' : '#FFFF00',
                shape: alienShape
            });
        }
    }
    initStars();
}

// Input handling
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && gameRunning) {
        shoot();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function shoot() {
    if (bullets.length < 3) {
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 10,
            speed: 7,
            color: '#FFF'
        });
        playSound('shoot');
    }
}

function gameOver() {
    gameRunning = false;
    playSound('gameover');
    gameOverScreen.classList.remove('hidden');
    finalScoreElement.innerText = `Final Score: ${score}`;
}

function update() {
    if (!gameRunning) return;

    // Update stars
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
    });

    // Update particles
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    });

    if (shakeTime > 0) {
        shakeTime--;
    }

    // Player movement
    if (keys['ArrowLeft'] && player.x > 0) {
        player.vx -= player.accel;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.vx += player.accel;
    }
    player.vx *= player.friction;
    player.x += player.vx;

    // Update bullets
    bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });

    // Update enemies
    let edgeReached = false;
    let currentSpeed = 0.8 + (1 - (enemies.length / (ALIEN_ROWS * ALIEN_COLS))) * 1.5;

    enemies.forEach(enemy => {
        if (enemyDirection === 1 && enemy.x + enemy.width + currentSpeed >= canvas.width - 20) {
            edgeReached = true;
        } else if (enemyDirection === -1 && enemy.x - currentSpeed <= 20) {
            edgeReached = true;
        }
    });

    if (edgeReached) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
            enemy.y += 15;
            if (enemy.y + enemy.height >= player.y) {
                gameOver();
            }
        });
    } else {
        enemies.forEach(enemy => {
            enemy.x += currentSpeed * enemyDirection;
        });
    }

    // Collision detection
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                score += enemy.points;
                playSound('hit');
                shakeTime = 8;
                // Spawn particles
                for (let k = 0; k < 10; k++) {
                    particles.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height / 2,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        life: 1,
                    });
                }
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);
                scoreElement.innerText = `Score: ${score}`;
            }
        });
    });

    if (enemies.length === 0) {
        init();
    }

    // Thump sound logic
    if (gameRunning && audioCtx.state === 'running') {
        const currentTime = audioCtx.currentTime;
        if (currentTime >= nextThumpTime) {
            let minY = Infinity;
            enemies.forEach(e => {
                if (e.y < minY) minY = e.y;
            });

            if (enemies.length > 0) {
                let progress = (minY - ALIEN_OFFSET_TOP) / (player.y - ALIEN_OFFSET_TOP);
                let frequency = 60 + Math.max(0, Math.min(1, progress)) * 240;
                playSound('thump', frequency);
            }
            nextThumpTime = currentTime + 0.5;
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = '#FFF';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Draw particles
    particles.forEach(p => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
        ctx.fillRect(p.x, p.y, 2, 2);
    });

    ctx.save();
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * 10;
        const dy = (Math.random() - 0.5) * 10;
        ctx.translate(dx, dy);
    }

    // Draw player
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    // Draw player "cannon"
    ctx.fillStyle = '#FFF';
    ctx.fillRect(player.x + player.width / 2 - 2, player.y - 5, 4, 5);

    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        const pixelSize = enemy.width / alienShape[0].length;

        for (let row = 0; row < alienShape.length; row++) {
            for (let col = 0; col < alienShape[row].length; col++) {
                if (alienShape[row][col] === 1) {
                    ctx.fillRect(
                        enemy.x + col * pixelSize,
                        enemy.y + row * pixelSize,
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
    });

    // Draw UFO
    if (ufo.active) {
        ctx.fillStyle = '#00FFFF';
        // UFO body
        ctx.beginPath();
        ctx.ellipse(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, ufo.width / 2, ufo.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // UFO cockpit
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2 - 2, ufo.width / 4, ufo.height / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // UFO lights/fins
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(ufo.x, ufo.y + ufo.height / 2, ufo.width, 4);
    }

    ctx.restore();

restartBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    init();
});

init();
draw();
