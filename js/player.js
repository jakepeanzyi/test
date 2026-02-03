import { circleRectIntersect, dist, clamp } from './utils.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 200; // pixels per second

        // Stats
        this.health = 100;
        this.hunger = 100;
        this.thirst = 100;

        // Inventory
        this.inventory = {
            'wood': 0,
            'stone': 0
        };
        this.hotbar = [null, null, null, null, null, null]; // Items in hotbar
        this.activeSlot = 0;

        // State
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.facingAngle = 0;
    }

    update(dt, input, world, mouseWorldX, mouseWorldY) {
        // Movement
        let dx = 0;
        let dy = 0;

        if (input.isDown('KeyW')) dy -= 1;
        if (input.isDown('KeyS')) dy += 1;
        if (input.isDown('KeyA')) dx -= 1;
        if (input.isDown('KeyD')) dx += 1;

        // Normalize
        if (dx !== 0 || dy !== 0) {
            let len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;
        }

        let nextX = this.x + dx * this.speed * dt;
        let nextY = this.y + dy * this.speed * dt;

        // Check bounds
        nextX = clamp(nextX, 0, world.width);
        nextY = clamp(nextY, 0, world.height);

        // Simple collision with objects (treat them as solid for center of player)
        // Ideally we slide against them, but for now we stop.
        let collider = world.checkCollision(nextX, nextY, this.radius);
        if (!collider) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Try only X
            let colX = world.checkCollision(nextX, this.y, this.radius);
            if (!colX) this.x = nextX;

            // Try only Y
            let colY = world.checkCollision(this.x, nextY, this.radius);
            if (!colY) this.y = nextY;
        }

        // Facing
        this.facingAngle = Math.atan2(mouseWorldY - this.y, mouseWorldX - this.x);

        // Action: Gathering/Attacking
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        if (input.mouse.leftDown && this.attackCooldown <= 0) {
            let item = this.hotbar[this.activeSlot];
            if (item && (item.id.includes('wall') || item.id.includes('door'))) {
                this.placeStructure(world, mouseWorldX, mouseWorldY, item);
            } else {
                this.attack(world, mouseWorldX, mouseWorldY);
            }
            this.attackCooldown = 0.5;
            this.isAttacking = true;
            setTimeout(() => this.isAttacking = false, 200);
        }

        // Tick stats
        this.hunger -= 0.5 * dt;
        this.thirst -= 0.7 * dt;

        this.hunger = Math.max(0, this.hunger);
        this.thirst = Math.max(0, this.thirst);
    }

    placeStructure(world, mx, my, item) {
        // Snap to grid
        const SNAP = 50;
        let gx = Math.floor(mx / SNAP) * SNAP;
        let gy = Math.floor(my / SNAP) * SNAP;

        // Check collision with player
        if (circleRectIntersect(this.x, this.y, this.radius, gx, gy, SNAP, SNAP)) {
            return; // Can't build on self
        }

        // Add to world
        world.addStructure({
            x: gx,
            y: gy,
            w: SNAP,
            h: SNAP,
            type: item.id,
            health: 200
        });

        // Consume item
        this.hotbar[this.activeSlot] = null;
    }

    attack(world, mx, my) {
        // Simple hitscan or melee range check
        // Check objects within range of player and close to mouse cursor
        // Max reach 100px
        if (dist(this.x, this.y, mx, my) > 100) return;

        for (let e of world.entities) {
            if (circleRectIntersect(mx, my, 5, e.x, e.y, e.w, e.h)) {
                // Hit!
                e.health -= 25;
                // Add resource
                if (!this.inventory[e.resourceType]) this.inventory[e.resourceType] = 0;
                this.inventory[e.resourceType] += 10;
                // Visual feedback could be added here (particles)
                console.log(`Hit ${e.type}! HP: ${e.health}. Inv: ${JSON.stringify(this.inventory)}`);
                break; // Only hit one
            }
        }
    }
}
