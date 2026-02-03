import { randomInt, rectIntersect, circleRectIntersect, dist } from './utils.js';

export class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.entities = [];
        this.enemies = []; // AI entities
        this.structures = []; // Walls, foundations
    }

    addStructure(s) {
        this.structures.push(s);
    }

    init() {
        // Generate Forests (Clusters of trees)
        for (let i = 0; i < 15; i++) {
            let cx = randomInt(100, this.width - 100);
            let cy = randomInt(100, this.height - 100);
            for (let j = 0; j < 10; j++) {
                this.entities.push({
                    id: `tree_${i}_${j}`,
                    type: 'tree',
                    x: cx + randomInt(-100, 100),
                    y: cy + randomInt(-100, 100),
                    w: randomInt(50, 80),
                    h: randomInt(50, 80), // used as size
                    health: 100,
                    maxHealth: 100,
                    resourceType: 'wood',
                    color: '#2d5a27'
                });
            }
        }

        // Generate Rock Fields
        for (let i = 0; i < 8; i++) {
            let cx = randomInt(100, this.width - 100);
            let cy = randomInt(100, this.height - 100);
            for (let j = 0; j < 5; j++) {
                this.entities.push({
                    id: `rock_${i}_${j}`,
                    type: 'rock',
                    x: cx + randomInt(-60, 60),
                    y: cy + randomInt(-60, 60),
                    w: randomInt(40, 60), // size
                    h: randomInt(40, 60),
                    health: 150,
                    maxHealth: 150,
                    resourceType: 'stone',
                    color: '#5a5a5a'
                });
            }
        }

        // Generate Wolves
        for (let i = 0; i < 5; i++) {
            this.enemies.push({
                id: `wolf_${i}`,
                type: 'wolf',
                x: randomInt(0, this.width),
                y: randomInt(0, this.height),
                radius: 15,
                speed: 130,
                health: 80,
                damage: 10,
                state: 'idle', // idle, chase, attack
                stateTimer: 0,
                target: null
            });
        }
    }

    update(dt, player) {
        // Remove dead entities
        this.entities = this.entities.filter(e => e.health > 0);
        this.structures = this.structures.filter(s => s.health > 0);
        this.enemies = this.enemies.filter(e => e.health > 0);

        // Update Enemies
        for (let enemy of this.enemies) {
            this.updateEnemy(dt, enemy, player);
        }
    }

    updateEnemy(dt, enemy, player) {
        // Simple AI
        let d = dist(enemy.x, enemy.y, player.x, player.y);

        // State transition
        if (enemy.state === 'idle') {
            enemy.stateTimer -= dt;
            if (d < 300) {
                enemy.state = 'chase';
            }
            if (enemy.stateTimer <= 0) {
                // Wander
                enemy.vx = (Math.random() - 0.5) * 50;
                enemy.vy = (Math.random() - 0.5) * 50;
                enemy.stateTimer = randomInt(1, 3);
            }
            enemy.x += (enemy.vx || 0) * dt;
            enemy.y += (enemy.vy || 0) * dt;
        } else if (enemy.state === 'chase') {
            if (d > 500) {
                enemy.state = 'idle';
            } else if (d < 30) {
                enemy.state = 'attack';
                enemy.stateTimer = 0.5; // Attack cooldown
            } else {
                // Move towards player
                let dx = player.x - enemy.x;
                let dy = player.y - enemy.y;
                let len = Math.hypot(dx, dy);
                enemy.x += (dx / len) * enemy.speed * dt;
                enemy.y += (dy / len) * enemy.speed * dt;
            }
        } else if (enemy.state === 'attack') {
            enemy.stateTimer -= dt;
            // Do damage if close
            if (d < 35 && enemy.stateTimer <= 0) {
                player.takeDamage(enemy.damage);
                enemy.stateTimer = 1.0; // cooldown
            }
            if (d > 35) enemy.state = 'chase';
        }

        // Clamp bounds
        enemy.x = Math.max(0, Math.min(enemy.x, this.width));
        enemy.y = Math.max(0, Math.min(enemy.y, this.height));
    }

    // Check collision for player movement logic
    checkCollision(x, y, radius) {
        for (let e of this.entities) {
            // Entities are centered
            if (circleRectIntersect(x, y, radius, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
                return e;
            }
        }
        for (let s of this.structures) {
            // Structures are top-left based (building system)
            if (circleRectIntersect(x, y, radius, s.x, s.y, s.w, s.h)) {
                return s;
            }
        }
        return null;
    }
}
