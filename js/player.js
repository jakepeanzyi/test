import { circleRectIntersect, dist, clamp } from './utils.js';

export class Player {
    constructor(x, y) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 220; // slightly faster

        // Stats
        this.health = 100;
        this.hunger = 100;
        this.thirst = 100;
        this.isDead = false;

        // Inventory
        this.inventory = {
            'wood': 0,
            'stone': 0
        };
        this.hotbar = [null, null, null, null, null, null];
        this.activeSlot = 0;

        // State
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.facingAngle = 0;

        // Give starting tools
        this.hotbar[0] = { name: 'Rock', id: 'rock_tool' };
    }

    respawn() {
        this.x = this.startX;
        this.y = this.startY;
        this.health = 100;
        this.hunger = 100;
        this.thirst = 100;
        this.isDead = false;
        this.inventory = { 'wood': 0, 'stone': 0 }; // Lose items
        // Keep hotbar? Rust you lose everything. Let's start with empty/rock.
        this.hotbar = [null, null, null, null, null, null];
        this.hotbar[0] = { name: 'Rock', id: 'rock_tool' };
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        this.isDead = true;
        console.log("Player died");
        // Main loop will handle UI
    }

    update(dt, input, world, mouseWorldX, mouseWorldY) {
        if (this.isDead) return;

        // Movement
        // Facing - Calculate this first for movement
        this.facingAngle = Math.atan2(mouseWorldY - this.y, mouseWorldX - this.x);

        // Movement
        let fwd = 0;
        let strafe = 0;

        if (input.isDown('KeyW')) fwd += 1;
        if (input.isDown('KeyS')) fwd -= 1;
        if (input.isDown('KeyA')) strafe -= 1;
        if (input.isDown('KeyD')) strafe += 1;

        let dx = 0;
        let dy = 0;

        if (fwd !== 0 || strafe !== 0) {
            // Rotate input vector by facingAngle
            // Fwd is along facingAngle, Strafe is perpendicular (right) based on how we want D to behave
            // Let's map: 
            // Forward (W) -> 0 deg relative to facing
            // Right (D) -> +90 deg relative to facing

            // Direction relative to facing
            // We can just sum the vectors

            let cos = Math.cos(this.facingAngle);
            let sin = Math.sin(this.facingAngle);

            // Forward vector: (cos, sin)
            // Right vector: (-sin, cos)  <-- Rotated 90 deg clockwise (assuming y down)?
            // Wait, coordinate system: Y is down in Canvas.
            // 0 is Right (East). 90 (PI/2) is Down (South).
            // Rotation +90 is Clockwise. Correct.

            let vx = fwd * cos - strafe * sin;
            let vy = fwd * sin + strafe * cos;

            // Normalize
            let len = Math.hypot(vx, vy);
            dx = vx / len;
            dy = vy / len;
        }

        let nextX = this.x + dx * this.speed * dt;
        let nextY = this.y + dy * this.speed * dt;

        // Check bounds
        nextX = clamp(nextX, 0, world.width);
        nextY = clamp(nextY, 0, world.height);

        // Simple collision
        // Try move X
        let colX = world.checkCollision(nextX, this.y, this.radius);
        if (!colX) this.x = nextX;

        // Try move Y
        let colY = world.checkCollision(this.x, nextY, this.radius);
        if (!colY) this.y = nextY;



        // Action: Gathering/Attacking
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        if (input.mouse.leftDown && this.attackCooldown <= 0) {
            let item = this.hotbar[this.activeSlot];

            // Check if building
            if (item && item.type === 'structure') {
                this.placeStructure(world, mouseWorldX, mouseWorldY, item);
                this.attackCooldown = 0.2;
            }
            else if (item && (item.id.includes('wall') || item.id.includes('door'))) {
                // If legacy items without type
                this.placeStructure(world, mouseWorldX, mouseWorldY, item);
                this.attackCooldown = 0.2;
            } else {
                this.attack(world, mouseWorldX, mouseWorldY);
                this.attackCooldown = 0.5;
                this.isAttacking = true;
                setTimeout(() => this.isAttacking = false, 200);
            }
        }

        // Tick stats
        this.hunger -= 0.5 * dt;
        this.thirst -= 0.7 * dt;

        if (this.hunger <= 0 || this.thirst <= 0) {
            this.takeDamage(1 * dt); // Starvation damage
        }
    }

    placeStructure(world, mx, my, item) {
        // Snap to grid
        const SNAP = 50;
        let gx = Math.floor(mx / SNAP) * SNAP;
        let gy = Math.floor(my / SNAP) * SNAP;

        // Range check
        if (dist(this.x, this.y, gx + SNAP / 2, gy + SNAP / 2) > 200) return;

        // Check collision with player
        if (circleRectIntersect(this.x, this.y, this.radius, gx, gy, SNAP, SNAP)) {
            return; // Can't build on self
        }

        // Check availability (no other structure)
        for (let s of world.structures) {
            if (s.x === gx && s.y === gy) return;
        }

        // Add to world
        world.addStructure({
            x: gx,
            y: gy,
            w: SNAP,
            h: SNAP,
            type: item.id || item.itemId,
            health: 200
        });

        // Consume item
        this.hotbar[this.activeSlot] = null;
    }

    attack(world, mx, my) {
        // Check objects within range
        const REACH = 120;
        if (dist(this.x, this.y, mx, my) > REACH) return;

        // Entities
        for (let e of world.entities) {
            if (circleRectIntersect(mx, my, 10, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
                e.health -= 25;

                // Add resource
                if (!this.inventory[e.resourceType]) this.inventory[e.resourceType] = 0;

                // Bonus for tools?
                let bonus = 1;
                let item = this.hotbar[this.activeSlot];
                // if (item && item.id === 'axe' && e.resourceType === 'wood') bonus = 2;

                this.inventory[e.resourceType] += 10 * bonus;
                return; // hit one
            }
        }

        // Enemies
        for (let e of world.enemies) {
            if (dist(mx, my, e.x, e.y) < e.radius + 10) {
                e.health -= 35;
                // Pushback
                let dx = e.x - this.x;
                let dy = e.y - this.y;
                let len = Math.hypot(dx, dy);
                if (len > 0) {
                    e.x += (dx / len) * 30;
                    e.y += (dy / len) * 30;
                }
                return;
            }
        }
    }
}
