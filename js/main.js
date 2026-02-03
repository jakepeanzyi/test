import { InputHandler } from './input.js';
import { World } from './world.js';
import { Player } from './player.js';
import { UIManager } from './ui.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const uiHealth = document.getElementById('health-bar');
const uiHunger = document.getElementById('hunger-bar');
const uiThirst = document.getElementById('thirst-bar');
const fpsDisplay = document.getElementById('fps-counter');
const deathScreen = document.getElementById('death-screen');
const respawnBtn = document.getElementById('respawn-btn');
const settingsMenu = document.getElementById('settings-menu');
// const closeSettingsBtn = document.getElementById('close-settings-btn'); // removed

// Settings Elements
const volumeSlider = document.getElementById('volume-range');
const lowPerfToggle = document.getElementById('low-perf-toggle');
const renderDistSlider = document.getElementById('render-dist-range');
const sensSlider = document.getElementById('sens-range');

// Game Settings State
const settings = {
    volume: 50,
    lowPerformance: false,
    renderDistance: 1500,
    sensitivity: 50
};

// Sync settings UI
volumeSlider.addEventListener('input', (e) => settings.volume = parseInt(e.target.value));
lowPerfToggle.addEventListener('change', (e) => settings.lowPerformance = e.target.checked);
renderDistSlider.addEventListener('input', (e) => settings.renderDistance = parseInt(e.target.value));
sensSlider.addEventListener('input', (e) => settings.sensitivity = parseInt(e.target.value));

// Game State
const input = new InputHandler();
const world = new World(3000, 3000); // Larger world
world.init();

const player = new Player(1500, 1500);
const uiManager = new UIManager(player);

let camera = { x: 0, y: 0 };
let lastTime = 0;

// Inputs
window.addEventListener('keydown', e => {
    if (player.isDead) return;
    if (e.code === 'Tab') {
        e.preventDefault();
        uiManager.toggleInventory();
    }
    if (e.code === 'KeyX') {
        settingsMenu.classList.toggle('hidden');
    }
});

// closeSettingsBtn.addEventListener('click', () => {
//     settingsMenu.classList.add('hidden');
// });

respawnBtn.addEventListener('click', () => {
    player.respawn();
    deathScreen.classList.add('hidden');
    // Respawn safe location?
    player.x = world.width / 2;
    player.y = world.height / 2;
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Rendering Helpers ---

function drawHPBar(ctx, x, y, width, health, maxHealth) {
    if (health >= maxHealth) return; // Hide if full

    const hWidth = 40;
    const hHeight = 6;
    const px = x - hWidth / 2;
    const py = y - width / 1.5 - 10;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px, py, hWidth, hHeight);

    // Fill
    const fillWidth = (health / maxHealth) * hWidth;
    ctx.fillStyle = health < 30 ? '#ff5252' : '#66bb6a';
    ctx.fillRect(px, py, fillWidth, hHeight);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, hWidth, hHeight);
}

function drawTree(ctx, x, y, size) {
    // Tree Top-Down
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, size / 2 + 5, 0, Math.PI * 2);
    ctx.fill();

    // Trunk (visible? mostly covered, but maybe a bit at the base)
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(x, y, size / 6, 0, Math.PI * 2);
    ctx.fill();

    // Leaves (Multiple layers for depth)
    const colors = settings.lowPerformance ? ['#1b330c', '#416924'] : ['#1b330c', '#2e4e1b', '#416924', '#588c32'];
    const count = colors.length;

    for (let i = 0; i < count; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        let r = (size / 2) * (1 - i * (0.5 / count));
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawRock(ctx, x, y, size) {
    // Rock
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Base
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.ellipse(x, y, size / 2, size / 2.2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Highlights (Top-Left)
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath();
    ctx.ellipse(x - size / 6, y - size / 6, size / 3, size / 4, Math.PI / 3, 0, Math.PI * 2);
    ctx.fill();

    // Cracks/Details
    ctx.strokeStyle = '#505050';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + size / 6, y + size / 6);
    ctx.lineTo(x + size / 3, y + size / 3);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - size / 4, y + size / 10);
    ctx.lineTo(x - size / 10, y + size / 3);
    ctx.stroke();
}

function drawStructure(ctx, s) {
    if (s.type.includes('wood')) ctx.fillStyle = '#855e42'; // Wood
    else if (s.type.includes('stone')) ctx.fillStyle = '#555'; // Stone
    else ctx.fillStyle = '#654321';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(s.x + 5, s.y + 5, s.w, s.h);

    if (s.type.includes('wood')) ctx.fillStyle = '#855e42';
    else ctx.fillStyle = '#7a7a7a';

    ctx.fillRect(s.x, s.y, s.w, s.h);

    // Planks pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y, s.w, s.h);

    if (s.type.includes('wood')) {
        ctx.beginPath();
        ctx.moveTo(s.x + s.w / 2, s.y); ctx.lineTo(s.x + s.w / 2, s.y + s.h);
        ctx.stroke();
    }
}

function drawOre(ctx, x, y, size, color) {
    // Ore
    if (!settings.lowPerformance) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(x + 4, y + 4, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x, y - size / 2);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x, y + size / 2);
    ctx.closePath();
    ctx.fill();

    // Glitter/Crystal spots
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + (i - 1) * size / 4, y + (i % 2 == 0 ? -size / 5 : size / 5), 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawWolf(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    let angle = Math.atan2(enemy.vy || 0, enemy.vx || 0);
    ctx.rotate(angle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 2, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fur/Tuft on back
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(-5, -8, 5, 0, Math.PI);
    ctx.fill();

    // Head
    ctx.fillStyle = '#5c5c5c';
    ctx.beginPath();
    ctx.arc(15, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#5c5c5c';
    ctx.beginPath();
    ctx.moveTo(12, -8); ctx.lineTo(18, -14); ctx.lineTo(20, -6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 8); ctx.lineTo(18, 14); ctx.lineTo(20, 6);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(22, 0, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(18, -3, 2, 0, Math.PI * 2);
    ctx.arc(18, 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-28, 0);
    ctx.stroke();

    ctx.restore();
}

function drawPlayer(ctx, player) {
    if (player.isDead) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.facingAngle);

    // Shadow
    if (!settings.lowPerformance) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(3, 3, player.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Backpack
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.roundRect(-25, -12, 10, 24, 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e0ac69';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Clothes
    ctx.fillStyle = '#556b2f';
    ctx.beginPath();
    ctx.arc(0, 0, player.radius - 2, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#3d4d23';
    ctx.beginPath();
    ctx.arc(0, 0, player.radius - 6, 0, Math.PI * 2);
    ctx.fill();

    // Hands
    ctx.beginPath();
    ctx.arc(15, 15, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#e0ac69';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(15, -15, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#e0ac69';
    ctx.fill();
    ctx.stroke();

    // Item
    let item = player.hotbar[player.activeSlot];
    if (item) {
        ctx.save();
        ctx.translate(20, 15);
        if (player.isAttacking) ctx.rotate(1.0);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(0, -2, 20, 4);
        ctx.restore();
    }

    ctx.restore();
}

// Loop
function loop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (isNaN(dt)) dt = 0;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1;

    // Logic
    input.update(); // Reset justClicked

    if (!player.isDead) {
        // Screen -> World Mouse
        let mouseWorldX = input.mouse.x + camera.x;
        let mouseWorldY = input.mouse.y + camera.y;

        player.update(dt, input, world, mouseWorldX, mouseWorldY);
        world.update(dt, player);

        // Death Check
        if (player.health <= 0 && !player.isDead) {
            deathScreen.classList.remove('hidden');
        }
    }

    // Camera
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // Clamp
    camera.x = Math.max(0, Math.min(camera.x, world.width - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - canvas.height));

    // Render
    ctx.fillStyle = '#304a25';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // World Boundary
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 20;
    ctx.strokeRect(0, 0, world.width, world.height);

    const renderDistSq = settings.renderDistance * settings.renderDistance;

    // Draw Structures
    for (let s of world.structures) {
        const dSq = distSq(player.x, player.y, s.x + s.w / 2, s.y + s.h / 2);
        if (dSq > renderDistSq) continue;
        drawStructure(ctx, s);
        drawHPBar(ctx, s.x + s.w / 2, s.y + s.h / 2, s.w, s.health, 200);
    }

    // Draw Entities
    for (let e of world.entities) {
        const dSq = distSq(player.x, player.y, e.x, e.y);
        if (dSq > renderDistSq) continue;

        if (e.type === 'tree') drawTree(ctx, e.x, e.y, e.w);
        else if (e.type === 'rock') drawRock(ctx, e.x, e.y, e.w);
        else if (e.type.includes('ore')) drawOre(ctx, e.x, e.y, e.w, e.color);

        drawHPBar(ctx, e.x, e.y, e.w, e.health, e.maxHealth);
    }

    // Draw Enemies
    for (let e of world.enemies) {
        const dSq = distSq(player.x, player.y, e.x, e.y);
        if (dSq > renderDistSq) continue;
        drawWolf(ctx, e);
        drawHPBar(ctx, e.x, e.y, e.radius * 2, e.health, 80);
    }

    // Draw Player
    drawPlayer(ctx, player);
    drawHPBar(ctx, player.x, player.y, player.radius * 2, player.health, 100);

    ctx.restore();

    // UI Updates
    if (!player.isDead) {
        uiHealth.style.width = player.health + '%';
        uiHunger.style.width = player.hunger + '%';
        uiThirst.style.width = player.thirst + '%';
        if (uiManager.isOpen) uiManager.updateInventory();
    }

    fpsDisplay.innerText = `FPS: ${Math.round(1 / dt)}`;
    requestAnimationFrame(loop);
}

function distSq(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

requestAnimationFrame(loop);
