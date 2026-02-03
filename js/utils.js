export function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || 
             r2.x + r2.w < r1.x || 
             r2.y > r1.y + r1.h || 
             r2.y + r2.h < r1.y);
}

export function circleRectIntersect(cx, cy, radius, rx, ry, rw, rh) {
    let testX = cx;
    let testY = cy;

    if (cx < rx) testX = rx;      // test left edge
    else if (cx > rx + rw) testX = rx + rw;   // right edge
    if (cy < ry) testY = ry;      // top edge
    else if (cy > ry + rh) testY = ry + rh;   // bottom edge

    let distX = cx - testX;
    let distY = cy - testY;
    let distance = Math.sqrt((distX * distX) + (distY * distY));

    return distance <= radius;
}

export function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}
