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
const invGrid = document.getElementById('inventory-grid');
const fpsDisplay = document.getElementById('fps-counter');

// Game State
const input = new InputHandler();
const world = new World(2000, 2000);
const player = new Player(1000, 1000); // Start in middle
const uiManager = new UIManager(player);

let camera = { x: 0, y: 0 };

// Controls
window.addEventListener('keydown', e => {
    if (e.code === 'Tab') {
        e.preventDefault();
        uiManager.toggleInventory();
    }
});

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Init
world.init();

// Asset generation (Simple procedural Render Helpers)
function drawTree(ctx, x, y, size) {
    ctx.fillStyle = '#1e1a16'; // Trunk
    ctx.fillRect(x + size / 2 - 5, y + size / 2, 10, size / 2);

    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2 - 10, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#2d5a27'; // Dark Green Leaves
    ctx.fill();
    ctx.strokeStyle = '#1a3316';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.arc(x + size / 2 - 10, y + size / 2 - 20, size / 5, 0, Math.PI * 2);
    ctx.fillStyle = '#3e7a36';
    ctx.fill();
}

function drawRock(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#7a7a7a';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Detail
    ctx.beginPath();
    ctx.arc(x + size / 2 - 10, y + size / 2 - 10, size / 6, 0, Math.PI * 2);
    ctx.fillStyle = '#999';
    ctx.fill();
}

function drawPlayer(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.facingAngle);

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e0ac69'; // Skin tone
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hands
    ctx.beginPath();
    ctx.arc(15, 15, 8, 0, Math.PI * 2); // Right hand
    ctx.arc(15, -15, 8, 0, Math.PI * 2); // Left hand
    ctx.fillStyle = '#e0ac69';
    ctx.fill();
    ctx.stroke();

    // Item in hand (if attacking show animation)
    if (player.isAttacking) {
        ctx.save();
        ctx.translate(20, 10);
        ctx.rotate(0.5); // Swing
        ctx.fillStyle = '#555'; // Rock/Tool color
        ctx.fillRect(0, -5, 30, 10);
        ctx.restore();
    }

    ctx.restore();
}

let lastTime = 0;
function loop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (isNaN(dt)) dt = 0;
    lastTime = timestamp;

    if (dt > 0.1) dt = 0.1; // Cap dt for lag

    // Logic
    // Screen Mouse -> World Mouse
    let mouseWorldX = input.mouse.x + camera.x;
    let mouseWorldY = input.mouse.y + camera.y;

    player.update(dt, input, world, mouseWorldX, mouseWorldY);
    world.update(dt);

    // Camera follow player
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // Clamp Camera
    camera.x = Math.max(0, Math.min(camera.x, world.width - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, world.height - canvas.height));
    if (world.width < canvas.width) camera.x = -(canvas.width - world.width) / 2; // Center if small world
    if (world.height < canvas.height) camera.y = -(canvas.height - world.height) / 2;

    // Render
    ctx.fillStyle = '#3b4e2a'; // Grass Ground
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Clear screen

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw World Boundary
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, world.width, world.height);

    // Grid (optional styling)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    for (let i = 0; i < world.width; i += 100) { ctx.moveTo(i, 0); ctx.lineTo(i, world.height); }
    for (let i = 0; i < world.height; i += 100) { ctx.moveTo(0, i); ctx.lineTo(world.width, i); }
    ctx.stroke();

    // Draw Entities
    for (let e of world.entities) {
        if (e.type === 'tree') drawTree(ctx, e.x, e.y, e.w);
        if (e.type === 'rock') drawRock(ctx, e.x, e.y, e.w);
    }

    // Draw Structures
    for (let s of world.structures) {
        if (s.type.includes('wood')) ctx.fillStyle = '#855e42';
        else if (s.type.includes('stone')) ctx.fillStyle = '#7a7a7a';
        else ctx.fillStyle = '#555';

        ctx.fillRect(s.x, s.y, s.w, s.h);

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x, s.y, s.w, s.h);

        // Detail X
        ctx.beginPath();
        ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.w, s.y + s.h);
        ctx.moveTo(s.x + s.w, s.y); ctx.lineTo(s.x, s.y + s.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.stroke();
    }

    // Draw Player
    drawPlayer(ctx, player);

    ctx.restore();

    // UI Updates
    uiHealth.style.width = player.health + '%';
    uiHunger.style.width = player.hunger + '%';
    uiThirst.style.width = player.thirst + '%';
    fpsDisplay.innerText = `FPS: ${Math.round(1 / dt)}`;

    if (uiManager.isOpen) uiManager.updateInventory();

    // Update Inventory UI sometimes (simple version: regenerate every few frames if changed, or just update on event. simplified for now)
    // For this demo, just console log it or update text
    // We will do a full update logic later for efficiency

    requestAnimationFrame(loop);
}

// Start
requestAnimationFrame(loop);

// Debug
window.player = player;
window.world = world;
