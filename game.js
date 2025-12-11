// =================
// CONST & ELEMENTS
// =================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const FIELD_W = 1200, FIELD_H = 700;

const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const teamSelectDiv = document.getElementById('teamSelect');
const teamButtonsDiv = document.getElementById('teamButtons');
const difficultySelect = document.getElementById('difficultySelect');
const gameWrap = document.getElementById('gameWrap');
const upgradeMenu = document.getElementById('upgradeMenu');

let difficulty = 'medium';
let playerXP = 0;

// =================
// TEAMS
// =================
const teams = [
    { name: "Barça", color: "blue" },
    { name: "Real Madrid", color: "white" },
    { name: "PSG", color: "navy" },
    { name: "Manchester United", color: "red" },
    { name: "Liverpool", color: "crimson" },
    { name: "Juventus", color: "black" },
    { name: "AC Milan", color: "red" },
    { name: "Bayern Munich", color: "red" },
    { name: "Chelsea", color: "blue" },
    { name: "Arsenal", color: "red" }
];

let playerTeam = null, enemyTeam = null;
const players = [];
let controlled = null;
let ball = null;
let keys = {};
let running = true;
let scoreA = 0, scoreB = 0;
let gameSeconds = 0;
let possessionA = 0.5, possessionB = 0.5;
let shotsA = 0, shotsB = 0;
let passesA = 0, passesB = 0;

// =================
// START SCREEN
// =================
startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    teamSelectDiv.style.display = 'block';
});

// =================
// TEAM SELECTION
// =================
teams.forEach((team, i) => {
    const btn = document.createElement('div');
    btn.textContent = team.name;
    btn.className = 'teamBtn';
    btn.style.backgroundColor = team.color;
    btn.addEventListener('click', () => selectTeam(i));
    teamButtonsDiv.appendChild(btn);
});

function selectTeam(idx) {
    playerTeam = teams[idx];
    // Enemy team différent du joueur
    enemyTeam = teams[(idx + 1) % teams.length];
    teamSelectDiv.style.display = 'none';
    difficultySelect.style.display = 'block';
}

// =================
// DIFFICULTY SELECTION
// =================
document.querySelectorAll('.diffBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        difficulty = btn.dataset.level;
        difficultySelect.style.display = 'none';
        gameWrap.style.display = 'block';
        initGame();
    });
});

// =================
// INPUT
// =================
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// =================
// CLASSES
// =================
class Ball {
    constructor(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.radius = 12; this.lastTouch = null; }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.95; this.vy *= 0.95;
        if (this.x < 20) { this.x = 20; this.vx *= -0.5; }
        if (this.x > FIELD_W - 20) { this.x = FIELD_W - 20; this.vx *= -0.5; }
        if (this.y < 20) { this.y = 20; this.vy *= -0.5; }
        if (this.y > FIELD_H - 20) { this.y = FIELD_H - 20; this.vy *= -0.5; }
    }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#888"; ctx.stroke(); }
}

class Player {
    constructor(x, y, color, isControlled = false, role = 'mid') {
        this.x = x; this.y = y; this.vx = 0; this.vy = 0;
        this.radius = 20; this.color = color; this.control = isControlled;
        this.role = role;
        this.speed = role === 'defender' ? 2.5 : role === 'mid' ? 3 : 3.2;
        this.passPrecision = 1; this.shootPower = 1; this.endurance = 1;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.8; this.vy *= 0.8;
        this.x = Math.max(20, Math.min(FIELD_W - 20, this.x));
        this.y = Math.max(20, Math.min(FIELD_H - 20, this.y));
    }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.stroke(); }
}

// =================
// GAME FUNCTIONS
// =================
function doPass() { ball.vx = 10 * controlled.passPrecision; ball.vy = 0; ball.lastTouch = controlled; gainXP(5); passesA++; }
function doDeepPass() { ball.vx = 15 * controlled.passPrecision; ball.vy = 0; ball.lastTouch = controlled; gainXP(8); passesA++; }
function doCross() { ball.vx = 8 * controlled.passPrecision; ball.vy = -5; ball.lastTouch = controlled; gainXP(7); passesA++; }
function doLob() { ball.vx = 12 * controlled.passPrecision; ball.vy = -12; ball.lastTouch = controlled; gainXP(10); passesA++; }

function gainXP(amount) {
    playerXP += amount;
    document.getElementById('playerXP').textContent = `XP: ${playerXP}`;
    if (playerXP >= 100) { playerXP -= 100; upgradeMenu.style.display = 'block'; saveProgress(); }
}

function upgrade(stat) {
    upgradeMenu.style.display = 'none';
    switch (stat) {
        case 'speed': controlled.speed += 0.5; break;
        case 'passPrecision': controlled.passPrecision += 0.1; break;
        case 'shootPower': controlled.shootPower += 0.1; break;
        case 'endurance': controlled.endurance += 0.1; break;
    }
    saveProgress();
}

// =================
// SAVE & LOAD
// =================
function saveProgress() {
    const saveData = {
        xp: playerXP,
        speed: controlled.speed,
        passPrecision: controlled.passPrecision,
        shootPower: controlled.shootPower,
        endurance: controlled.endurance,
        team: playerTeam.name
    };
    localStorage.setItem('goalRushSave', JSON.stringify(saveData));
}

function loadProgress() {
    const saveData = JSON.parse(localStorage.getItem('goalRushSave'));
    if (saveData) {
        playerXP = saveData.xp || 0;
        controlled = controlled || new Player(50, FIELD_H/2, 'blue', true);
        controlled.speed = saveData.speed || controlled.speed;
        controlled.passPrecision = saveData.passPrecision || controlled.passPrecision;
        controlled.shootPower = saveData.shootPower || controlled.shootPower;
        controlled.endurance = saveData.endurance || controlled.endurance;
        playerTeam = teams.find(t => t.name === saveData.team) || teams[0];
        enemyTeam = teams.find(t => t.name !== playerTeam.name);
    }
}

// =================
// COLLISIONS & GOALS
// =================
function handleCollisions() {
    for (let p of players) {
        const dx = ball.x - p.x; const dy = ball.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < ball.radius + p.radius) {
            ball.x = p.x + (dx / d) * (ball.radius + p.radius + 0.1);
            ball.y = p.y + (dy / d) * (ball.radius + p.radius + 0.1);
            ball.vx = p.vx * 1.2 + (dx / d) * 2;
            ball.vy = p.vy * 1.2 + (dy / d) * 2;
            ball.lastTouch = p;
        }
    }
}

function checkGoal() {
    const goalTop = FIELD_H / 2 - 100, goalBottom = FIELD_H / 2 + 100;
    if (ball.x < 20 && ball.y > goalTop && ball.y < goalBottom) { scoreB++; resetAfterGoal('B'); shotsA++; }
    if (ball.x > FIELD_W - 20 && ball.y > goalTop && ball.y < goalBottom) { scoreA++; resetAfterGoal('A'); shotsB++; }
}

function resetAfterGoal(team) { ball.x = FIELD_W / 2; ball.y = FIELD_H / 2; ball.vx = 0; ball.vy = 0; }

// =================
// MAIN LOOP
// =================
function update() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    // Player control
    controlled.vx = 0; controlled.vy = 0;
    if (keys['arrowup']) controlled.vy = -controlled.speed;
    if (keys['arrowdown']) controlled.vy = controlled.speed;
    if (keys['arrowleft']) controlled.vx = -controlled.speed;
    if (keys['arrowright']) controlled.vx = controlled.speed;

    // Special keys
    if (keys['a'] && keys['d']) doLob();
    else if (keys['a']) doPass();
    else if (keys['c']) doDeepPass();
    else if (keys['d']) doCross();

    // Update players
    for (let p of players) p.update();
    ball.update();
    handleCollisions();
    checkGoal();

    // Draw
    ball.draw(); for (let p of players) p.draw();

    // Stats
    if (ball.lastTouch) {
        if (ball.lastTouch.color === playerTeam.color) possessionA += 0.01;
        else possessionB += 0.01;
        const total = possessionA + possessionB; possessionA /= total; possessionB /= total;
    }

    document.getElementById('score').textContent = `${scoreA} - ${scoreB}`;
    document.getElementById('possession').textContent = `Possession: ${Math.round(possessionA*100)}% - ${Math.round(possessionB*100)}%`;
    document.getElementById('shots').textContent = `Tirs: ${shotsA} - ${shotsB}`;
    document.getElementById('passes').textContent = `Passes: ${passesA} - ${passesB}`;
    document.getElementById('playerXP').textContent = `XP: ${playerXP}`;

    gameSeconds += 1/60;
    document.getElementById('timer').textContent = formatTime(Math.floor(gameSeconds));

    requestAnimationFrame(update);
}

function formatTime(s){ const mm=String(Math.floor(s/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return `${mm}:${ss}`; }

// =================
// INIT GAME
// =================
function initGame() {
    loadProgress();
    players.length = 0;
    ball = new Ball(FIELD_W / 2, FIELD_H / 2);

    // Player team
    controlled = controlled || new Player(50, FIELD_H/2, playerTeam.color, true);
    players.push(controlled);
    for (let i = 0; i < 5; i++) players.push(new Player(200, 100 + i * 100, playerTeam.color));
    players.push(new Player(150, 50, playerTeam.color));
    players.push(new Player(150, FIELD_H - 50, playerTeam.color));

    // Enemy team
    for (let i = 0; i < 6; i++) players.push(new Player(FIELD_W - 200, 100 + i * 100, enemyTeam.color));
    players.push(new Player(FIELD_W - 50, FIELD_H / 2, enemyTeam.color));

    update();
  }
