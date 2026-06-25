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
        case 'thump': // Add thump sound
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(frequency, now);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
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
let formationXOffset = 0; // New: Offset for the entire alien formation X position
let formationYOffset = 0; // New: Offset for the entire alien formation Y position
let shakeTime = 0;
let nextThumpTime = 0; // Initialize nextThumpTime

let ufo = { // Define ufo object
    x: -100, // Off-screen initially
    y: 50,
    width: 60,
    height: 30,
    speed: 2,
    active: false,
    direction: 1 // 1 for right, -1 for left
};

let player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: canvas.height - 50,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: 0.8, // Acceleration
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
    formationXOffset = 0; // Reset formation offset
    formationYOffset = 0; // Reset formation offset
    shakeTime = 0;
    nextThumpTime = 0;
    
    // Reset UFO state
    ufo.active = false;
    ufo.x = -ufo.width; // Start off-screen left
    ufo.direction = 1; // Default direction
    
    scoreElement.innerText = `Score: ${score}`;
    livesElement.innerText = `Lives: ${lives}`;
    gameOverScreen.classList.add('hidden');
    
    for (let row = 0; row < ALIEN_ROWS; row++) {
        for (let col = 0; col < ALIEN_COLS; col++) {
            enemies.push({
                initialX: col * (ALIEN_WIDTH + ALIEN_PADDING) + ALIEN_OFFSET_LEFT, // Store initial relative X
                initialY: row * (ALIEN_HEIGHT + ALIEN_PADDING) + ALIEN_OFFSET_TOP, // Store initial relative Y
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
    let currentSpeed = 0.8 + (1 - (enemies.length / (ALIEN_ROWS * ALIEN_COLS))) * 1.5;

    // Calculate current bounds of the alien formation using offsets
    let minInitialX = Infinity;
    let maxInitialX = -Infinity;
    let lowestEnemyActualY = -Infinity; // To check game over

    enemies.forEach(enemy => {
        minInitialX = Math.min(minInitialX, enemy.initialX);
        maxInitialX = Math.max(maxInitialX, enemy.initialX + enemy.width);
        lowestEnemyActualY = Math.max(lowestEnemyActualY, enemy.initialY + formationYOffset + enemy.height);
    });

    let formationActualMinX = minInitialX + formationXOffset;
    let formationActualMaxX = maxInitialX + formationXOffset;

    let moveDownThisFrame = false;

    // Check if the formation is about to hit an edge
    if (enemyDirection === 1 && (formationActualMaxX + (currentSpeed)) >= canvas.width - 20) {
        moveDownThisFrame = true;
        // Adjust formationXOffset to precisely touch the edge, then reverse
        formationXOffset = (canvas.width - 20) - maxInitialX;
    } else if (enemyDirection === -1 && (formationActualMinX - (currentSpeed)) <= 20) {
        moveDownThisFrame = true;
        // Adjust formationXOffset to precisely touch the edge, then reverse
        formationXOffset = 20 - minInitialX;
    }

    if (moveDownThisFrame) {
        enemyDirection *= -1; // Reverse direction
        formationYOffset += ALIEN_HEIGHT / 2; // Move down
        
        // Check if aliens reached player line (using the lowest actual Y)
        let newLowestEnemyActualY = -Infinity;
        enemies.forEach(enemy => {
            newLowestEnemyActualY = Math.max(newLowestEnemyActualY, enemy.initialY + formationYOffset + enemy.height);
        });
        if (newLowestEnemyActualY >= player.y) {
            gameOver();
        }
    } else {
        // Move enemies horizontally (by updating the formation offset)
        formationXOffset += currentSpeed * enemyDirection;
    }

    // Collision detection
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            // Calculate enemy's current actual position for collision
            const enemyActualX = enemy.initialX + formationXOffset;
            const enemyActualY = enemy.initialY + formationYOffset;

            if (
                bullet.x < enemyActualX + enemy.width &&
                bullet.x + bullet.width > enemyActualX &&
                bullet.y < enemyActualY + enemy.height &&
                bullet.y + bullet.height > enemyActualY
            ) {
                score += enemy.points;
                playSound('hit');
                shakeTime = 8;
                // Spawn particles
                for (let k = 0; k < 10; k++) {
                    particles.push({
                        x: enemyActualX + enemy.width / 2, // Particles at enemy's actual center
                        y: enemyActualY + enemy.height / 2,
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
        // UFO logic
        if (!ufo.active) {
            if (Math.random() < 0.0005) { // Small chance for UFO to appear
                ufo.active = true;
                ufo.direction = Math.random() < 0.5 ? 1 : -1; // Random direction
                ufo.x = ufo.direction === 1 ? -ufo.width : canvas.width; // Start off-screen
                ufo.y = 50; // Keep y fixed
                playSound('ufo');
            }
        } else {
            ufo.x += ufo.speed * ufo.direction;
            if ((ufo.direction === 1 && ufo.x > canvas.width) || (ufo.direction === -1 && ufo.x < -ufo.width)) {
                ufo.active = false; // UFO off-screen
            }

            // UFO-bullet collision
            bullets.forEach((bullet, bIndex) => {
                if (
                    ufo.active &&
                    bullet.x < ufo.x + ufo.width &&
                    bullet.x + bullet.width > ufo.x &&
                    bullet.y < ufo.y + ufo.height &&
                    bullet.y + bullet.height > ufo.y
                ) {
                    score += 500; // UFO gives lots of points
                    playSound('hit');
                    shakeTime = 8;
                    // Spawn particles
                    for (let k = 0; k < 15; k++) {
                        particles.push({
                            x: ufo.x + ufo.width / 2,
                            y: ufo.y + ufo.height / 2,
                            vx: (Math.random() - 0.5) * 12,
                            vy: (Math.random() - 0.5) * 12,
                            life: 1,
                        });
                    }
                    bullets.splice(bIndex, 1);
                    ufo.active = false;
                    scoreElement.innerText = `Score: ${score}`;
                }
            });
        }
        
        if (currentTime >= nextThumpTime) {
            let minY = Infinity;
            enemies.forEach(e => {
                if (e.y < minY) minY = e.y;
            });
            
            if (enemies.length > 0) {
                // Adjust frequency based on how close aliens are to player
                let progress = (minY - ALIEN_OFFSET_TOP) / (player.y - ALIEN_OFFSET_TOP - ALIEN_HEIGHT);
                progress = Math.max(0, Math.min(1, progress)); // Clamp between 0 and 1
                let frequency = 60 + progress * 240; // Frequency increases as aliens get closer
                
                playSound('thump', frequency);
            }
            // Make thump interval decrease as enemies get closer
            let thumpInterval = 0.5 - (1 - (enemies.length / (ALIEN_ROWS * ALIEN_COLS))) * 0.4;
            nextThumpTime = currentTime + Math.max(0.1, thumpInterval);
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
        
        // Calculate actual drawing position using formation offsets
        const actualX = enemy.initialX + formationXOffset;
        const actualY = enemy.initialY + formationYOffset;
        
        for (let row = 0; row < alienShape.length; row++) {
            for (let col = 0; col < alienShape[row].length; col++) {
                if (alienShape[row][col] === 1) {
                    ctx.fillRect(
                        actualX + col * pixelSize,
                        actualY + row * pixelSize,
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

    // Main game loop
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

restartBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    init();
    gameLoop(); // Start the game loop again after restart
});

init();
gameLoop(); // Initial call to start the game loop

