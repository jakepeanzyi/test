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
});

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

function drawTree(ctx, x, y, size) {
    // Tree Top-Down
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x + 5, y + 5, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Trunk (visible? mostly covered)
    // Leaves (Multiple layers)
    const colors = ['#1e4012', '#2d5a27', '#3e7a36'];
    const reduction = [0, 5, 10];

    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        // Irregular shape could be better, but circles are fast
        ctx.arc(x, y, size / 2 - reduction[i], 0, Math.PI * 2);
        ctx.fill();
    }

    // Outline selection?
    // ctx.strokeStyle = '#111';
    // ctx.lineWidth = 1;
    // ctx.stroke();
}

function drawRock(ctx, x, y, size) {
    // Rock
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#666';
    ctx.beginPath();
    // Octagon-ish
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Detail
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x - size / 6, y - size / 6, size / 4, 0, Math.PI * 2);
    ctx.fill();
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

function drawWolf(ctx, enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    // Basic direction awareness?
    // If we had velocity, we could rotate.
    // enemy.vx, enemy.vy
    let angle = Math.atan2(enemy.vy || 0, enemy.vx || 0);
    ctx.rotate(angle);

    // Body
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(15, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#cf3434';
    ctx.beginPath();
    ctx.arc(18, -3, 2, 0, Math.PI * 2);
    ctx.arc(18, 3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPlayer(ctx, player) {
    if (player.isDead) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.facingAngle);

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e0ac69'; // Skin
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Clothes (Vest)
    ctx.fillStyle = '#556b2f'; // Olive drab
    ctx.beginPath();
    ctx.arc(0, 0, player.radius - 2, 0, Math.PI * 2);
    ctx.fill();

    // Hands
    ctx.beginPath();
    ctx.arc(15, 15, 8, 0, Math.PI * 2); // Right
    ctx.arc(15, -15, 8, 0, Math.PI * 2); // Left
    ctx.fillStyle = '#e0ac69';
    ctx.fill();
    ctx.stroke();

    // Item in hand
    let item = player.hotbar[player.activeSlot];
    if (item) {
        ctx.save();
        ctx.translate(20, 12);
        if (player.isAttacking) {
            ctx.rotate(0.6); // Swing
            ctx.translate(5, 0);
        }

        ctx.fillStyle = '#555';
        if (item.id.includes('wood')) ctx.fillStyle = '#855e42';

        // Tool shape
        ctx.fillRect(-5, -5, 25, 10);
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
    if (!player.isDead) {
        // Screen -> World Mouse
        let mouseWorldX = input.mouse.x + camera.x;
        let mouseWorldY = input.mouse.y + camera.y;

        player.update(dt, input, world, mouseWorldX, mouseWorldY);
        world.update(dt, player);

        // Death Check
        if (player.health <= 0 && !player.isDead) {
            // Already handled in player.die() but ensure UI is shown
            deathScreen.classList.remove('hidden');
        }
        if (player.isDead && deathScreen.classList.contains('hidden')) {
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
    ctx.fillStyle = '#304a25'; // Darker grass
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Grid details (Dirt patches)
    // Procedural noise for ground? Too slow for JS loop per pixel.
    // Just draw some random patches based on coordinates (deterministic)

    // World Boundary
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 20;
    ctx.strokeRect(0, 0, world.width, world.height);

    // Draw Structures (Bottom layer)
    for (let s of world.structures) {
        drawStructure(ctx, s);
    }

    // Draw Entities
    for (let e of world.entities) {
        if (e.type === 'tree') drawTree(ctx, e.x, e.y, e.w);
        else if (e.type === 'rock') drawRock(ctx, e.x, e.y, e.w);
    }

    // Draw Enemies
    for (let e of world.enemies) {
        drawWolf(ctx, e);
    }

    // Draw Player
    drawPlayer(ctx, player);

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

requestAnimationFrame(loop);
