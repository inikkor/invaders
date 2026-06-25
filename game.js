const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
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

const ALIEN_SHAPES = [
    [ // Squid (Top row)
        [
            [0,0,0,1,1,0,0,0],
            [0,0,1,1,1,1,0,0],
            [0,1,1,1,1,1,1,0],
            [1,1,0,1,1,0,1,1],
            [1,1,1,1,1,1,1,1],
            [0,0,1,0,0,1,0,0],
            [0,1,0,1,1,0,1,0],
            [1,0,1,0,0,1,0,1]
        ],
        [
            [0,0,0,1,1,0,0,0],
            [0,0,1,1,1,1,0,0],
            [0,1,1,1,1,1,1,0],
            [1,1,0,1,1,0,1,1],
            [1,1,1,1,1,1,1,1],
            [0,1,0,1,1,0,1,0],
            [1,0,0,0,0,0,0,1],
            [0,1,0,0,0,0,1,0]
        ]
    ],
    [ // Crab (Middle rows)
        [
            [0,0,1,0,0,0,1,0,0],
            [0,0,0,1,0,1,0,0,0],
            [0,0,1,1,1,1,1,0,0],
            [0,1,1,0,1,0,1,1,0],
            [1,1,1,1,1,1,1,1,1],
            [1,0,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,1],
            [0,0,0,1,1,1,0,0,0]
        ],
        [
            [0,0,1,0,0,0,1,0,0],
            [1,0,0,1,0,1,0,0,1],
            [1,0,1,1,1,1,1,0,1],
            [1,1,1,0,1,0,1,1,1],
            [0,1,1,1,1,1,1,1,0],
            [0,0,1,1,1,1,1,0,0],
            [0,1,0,0,0,0,0,1,0],
            [1,0,0,0,0,0,0,0,1]
        ]
    ],
    [ // Octopus (Bottom rows)
        [
            [0,0,0,1,1,1,1,0,0,0],
            [0,1,1,1,1,1,1,1,1,0],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,0,0,0,0,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [0,0,1,1,0,0,1,1,0,0],
            [0,1,1,0,1,1,0,1,1,0],
            [1,1,0,0,0,0,0,0,1,1]
        ],
        [
            [0,0,0,1,1,1,1,0,0,0],
            [0,1,1,1,1,1,1,1,1,0],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,0,0,0,0,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [0,0,0,1,1,1,1,0,0,0],
            [0,0,1,1,0,0,1,1,0,0],
            [1,1,0,0,0,0,0,0,1,1]
        ]
    ]
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
let gameStarted = false;
let score = 0;
let lives = 3;
let level = 1;
let gameRunning = true;
let enemies = [];
let bullets = [];
let particles = [];
let enemyDirection = 1;
let formationXOffset = 0;
let formationYOffset = 0;
let enemyMoveTimer = 0;
let alienFrame = 0;
let thumpCount = 0;
let shakeTime = 0;
let nextThumpTime = 0;

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
    speed: 1.5,
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
    formationXOffset = (canvas.width - (ALIEN_COLS * (ALIEN_WIDTH + ALIEN_PADDING) - ALIEN_PADDING)) / 2 - ALIEN_OFFSET_LEFT; 
    formationYOffset = 0;
    enemyMoveTimer = 0;
    alienFrame = 0;
    thumpCount = 0;
    shakeTime = 0;
    nextThumpTime = 0;
    
    // Reset UFO state
    ufo.active = false;
    ufo.x = -ufo.width;
    ufo.direction = 1;
    
    scoreElement.innerText = `Score: ${score}`;
    livesElement.innerText = `Lives: ${lives}`;
    gameOverScreen.classList.add('hidden');
    
    for (let row = 0; row < ALIEN_ROWS; row++) {
        let shapeIndex = 2; // Octopus for bottom rows
        if (row === 0) shapeIndex = 0; // Squid for top row
        else if (row === 1 || row === 2) shapeIndex = 1; // Crab for middle rows

        for (let col = 0; col < ALIEN_COLS; col++) {
            enemies.push({
                initialX: col * (ALIEN_WIDTH + ALIEN_PADDING) + ALIEN_OFFSET_LEFT,
                initialY: row * (ALIEN_HEIGHT + ALIEN_PADDING) + ALIEN_OFFSET_TOP,
                width: ALIEN_WIDTH,
                height: ALIEN_HEIGHT,
                points: (ALIEN_ROWS - row) * 10,
                color: row === 0 ? '#FF00FF' : (row < 3 ? '#00FFFF' : '#FFFF00'),
                shape: ALIEN_SHAPES[shapeIndex]
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
    if (!gameStarted || !gameRunning) return;

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
        player.vx -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.vx += player.speed;
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
    enemyMoveTimer++;
    // Interval decreases as enemies are destroyed. 
    // Classic feel: move once every (enemy count) frames, capped between 2 and 60.
    const moveInterval = Math.max(2, Math.floor(enemies.length * 1.8));

    if (enemyMoveTimer >= moveInterval) {
        enemyMoveTimer = 0;

        // Calculate current bounds of the alien formation
        let minInitialX = Infinity;
        let maxInitialX = -Infinity;

        enemies.forEach(enemy => {
            minInitialX = Math.min(minInitialX, enemy.initialX);
            maxInitialX = Math.max(maxInitialX, enemy.initialX + enemy.width);
        });

        const formationActualMinX = minInitialX + formationXOffset;
        const formationActualMaxX = maxInitialX + formationXOffset;
        const MOVE_STEP = 12;

        let moveDownThisFrame = false;

        // Check if the formation is about to hit an edge
        if (enemyDirection === 1 && (formationActualMaxX + MOVE_STEP) >= canvas.width - 10) {
            moveDownThisFrame = true;
        } else if (enemyDirection === -1 && (formationActualMinX - MOVE_STEP) <= 10) {
            moveDownThisFrame = true;
        }

        if (moveDownThisFrame) {
            formationYOffset += ALIEN_HEIGHT * 0.75; // Move down
            enemyDirection *= -1; // Reverse direction
            
            // Re-calculate bounds to check for game over immediately
            let lowestEnemyActualY = -Infinity;
            enemies.forEach(enemy => {
                lowestEnemyActualY = Math.max(lowestEnemyActualY, enemy.initialY + formationYOffset + enemy.height);
            });
            if (lowestEnemyActualY >= player.y) {
                gameOver();
            }
        } else {
            // Move enemies horizontally
            formationXOffset += MOVE_STEP * enemyDirection;
        }

        // Animation and sound
        alienFrame = (alienFrame + 1) % 2;
        
        const frequencies = [100, 90, 80, 70]; // Thump-thump-thump-thump
        playSound('thump', frequencies[thumpCount % 4]);
        thumpCount++;
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
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
        ctx.fillStyle = '#00FF00';
        ctx.font = '30px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE INVADERS', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '20px Courier New';
        ctx.fillText('PRESS SPACE OR CLICK TO START', canvas.width / 2, canvas.height / 2 + 20);
        
        // Draw some decorative aliens
        const demoShapes = ALIEN_SHAPES[1][0];
        const pixelSize = 4;
        const startX = canvas.width / 2 - (demoShapes[0].length * pixelSize) / 2;
        const startY = canvas.height / 2 - 150;
        for (let r = 0; r < demoShapes.length; r++) {
            for (let c = 0; c < demoShapes[r].length; c++) {
                if (demoShapes[r][c] === 1) {
                    ctx.fillRect(startX + c * pixelSize, startY + r * pixelSize, pixelSize, pixelSize);
                }
            }
        }
        return;
    }

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
        const currentShape = enemy.shape[alienFrame];
        const pixelSize = enemy.width / currentShape[0].length;
        
        // Calculate actual drawing position using formation offsets
        const actualX = enemy.initialX + formationXOffset;
        const actualY = enemy.initialY + formationYOffset;
        
        for (let row = 0; row < currentShape.length; row++) {
            for (let col = 0; col < currentShape[row].length; col++) {
                if (currentShape[row][col] === 1) {
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
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    if (!gameStarted) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        gameStarted = true;
        init();
    }
}

window.addEventListener('mousedown', startGame);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        startGame();
    }
});

restartBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    gameStarted = true;
    init();
});

init();
gameLoop(); 

