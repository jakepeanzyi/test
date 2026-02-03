import { randomInt, rectIntersect, circleRectIntersect } from './utils.js';

export class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.entities = [];
        this.projectiles = [];
        this.structures = []; // Walls, foundations
    }

    addStructure(s) {
        this.structures.push(s);
    }

    init() {
        // Generate Trees
        for (let i = 0; i < 100; i++) {
            this.entities.push({
                id: i,
                type: 'tree',
                x: randomInt(0, this.width),
                y: randomInt(0, this.height),
                w: 60,
                h: 60,
                health: 100,
                maxHealth: 100,
                resourceType: 'wood',
                color: '#2d5a27'
            });
        }

        // Generate Rocks
        for (let i = 0; i < 50; i++) {
            this.entities.push({
                id: 1000 + i,
                type: 'rock',
                x: randomInt(0, this.width),
                y: randomInt(0, this.height),
                w: 50,
                h: 50,
                health: 150,
                maxHealth: 150,
                resourceType: 'stone',
                color: '#5a5a5a'
            });
        }
    }

    update(dt) {
        // Remove dead entities
        this.entities = this.entities.filter(e => e.health > 0);
    }

    // Check collision for player movement logic
    checkCollision(x, y, radius) {
        for (let e of this.entities) {
            if (circleRectIntersect(x, y, radius, e.x + 20, e.y + 20, e.w - 40, e.h - 40)) {
                return e;
            }
        }
        for (let s of this.structures) {
            if (circleRectIntersect(x, y, radius, s.x, s.y, s.w, s.h)) {
                return s;
            }
        }
        return null;
    }
}
