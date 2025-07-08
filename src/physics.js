const maxMetaballs = 3;

let metaballState = {
    positions: [],
    velocities: [],
};

export function initializeMetaballs() {
    metaballState.positions = [];
    metaballState.velocities = [];
    const radius = 0.4;
    const angleStep = (Math.PI * 2) / maxMetaballs;
    for (let i = 0; i < maxMetaballs; i++) {
        const angle = -Math.PI/2 + (i * angleStep);
        const x = Math.cos(angle) * radius + 0.5;
        const y = Math.sin(angle) * radius + 0.5;
        metaballState.positions.push(x, y);
        // Give each metaball a small initial velocity
        metaballState.velocities.push(Math.cos(angle + Math.PI/2) * 0.005, Math.sin(angle + Math.PI/2) * 0.005);
    }
}

export function updatePhysics() {
    for (let i = 0; i < maxMetaballs; i++) {
        const idx = i * 2;
        let x = metaballState.positions[idx];
        let y = metaballState.positions[idx + 1];
        let vx = metaballState.velocities[idx];
        let vy = metaballState.velocities[idx + 1];
        // Move
        x += vx;
        y += vy;
        // Bounce off walls
        if (x < 0) { x = 0; vx *= -1; }
        if (x > 1) { x = 1; vx *= -1; }
        if (y < 0) { y = 0; vy *= -1; }
        if (y > 1) { y = 1; vy *= -1; }
        metaballState.positions[idx] = x;
        metaballState.positions[idx + 1] = y;
        metaballState.velocities[idx] = vx;
        metaballState.velocities[idx + 1] = vy;
    }
}

export function getMetaballPositions() {
    return metaballState.positions;
}
