const maxMetaballs = 3;

let metaballState = {
    positions: [],
    velocities: [],
};

let turbulence = 0.001; // Default, matches new slider
let viscousDampingEnabled = false;
let viscousDampingValue = 0.99;
let vorticityEnabled = false;
let vorticityValue = 0.0;

export function setTurbulence(value) {
    turbulence = value;
}

export function setViscousDamping(enabled, value) {
    viscousDampingEnabled = enabled;
    viscousDampingValue = value;
}

export function setVorticity(enabled, value) {
    vorticityEnabled = enabled;
    vorticityValue = value;
}

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
        // Add turbulence
        vx += (Math.random() - 0.5) * turbulence;
        vy += (Math.random() - 0.5) * turbulence;
        // Vorticity
        if (vorticityEnabled && vorticityValue > 0) {
            const toCenter = [0.5 - x, 0.5 - y];
            const dist = Math.sqrt(toCenter[0] * toCenter[0] + toCenter[1] * toCenter[1]);
            if (dist > 0.001) {
                // Perpendicular force for rotation
                const perpForce = [-toCenter[1], toCenter[0]];
                vx += (perpForce[0] / dist) * vorticityValue;
                vy += (perpForce[1] / dist) * vorticityValue;
            }
        }
        // Apply viscous damping
        const damping = viscousDampingEnabled ? viscousDampingValue : 1.0;
        vx *= damping;
        vy *= damping;
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

export function getMetaballVelocities() {
    return metaballState.velocities;
}
