export class InputHandler {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, leftDown: false, rightDown: false, leftJustClicked: false };
        this.scroll = 0;

        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.leftDown = true;
                this.mouse.leftJustClicked = true;
            }
            if (e.button === 2) this.mouse.rightDown = true;
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        window.addEventListener('wheel', (e) => {
            this.scroll = Math.sign(e.deltaY);
        });

        // Prevent context menu
        window.addEventListener('contextmenu', e => e.preventDefault());
    }

    update() {
        this.mouse.leftJustClicked = false;
    }

    isDown(code) {
        return !!this.keys[code];
    }
}
