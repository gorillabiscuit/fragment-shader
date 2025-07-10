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
let surfaceTensionEnabled = false;
let surfaceTensionValue = 0.0;
let gravityEnabled = false;
let gravityValue = 0.0;
let repulsionEnabled = true;
let repulsionToggles = [false, false, false];
let repulsionStrengths = [0.02, 0.02, 0.02];
const repulsionRadius = 0.2;

let initialPositions = [];
let returningToOrigin = false;
let returnSpringConstant = 0.5;
let returnDamping = 0.8; // Damping coefficient for smooth stop
export function setReturnDamping(d) { returnDamping = d; }

let returnThreshold = 0.06;
export function setReturnThreshold(t) { returnThreshold = t; }

let returnTimeout = null;

let initialVelocities = [];
let pendingVelocityKick = false;
let velocityKick = [];

let maxSpeed = 0.05;
let softCapEnabled = true;
export function setMaxSpeed(v) { maxSpeed = v; }
export function setSoftCapEnabled(enabled) { softCapEnabled = enabled; }

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

export function setSurfaceTension(enabled, value) {
    surfaceTensionEnabled = enabled;
    surfaceTensionValue = value;
}

export function setGravity(enabled, value) {
    gravityEnabled = enabled;
    gravityValue = value;
}

export function setRepulsions(toggles, strengths) {
    repulsionToggles = toggles;
    repulsionStrengths = strengths;
}

export function setReturnSpringConstant(k) { returnSpringConstant = k; }
export function triggerReturnToStart() {
    returningToOrigin = true;
}

export function initializeMetaballs() {
    metaballState.positions = [];
    metaballState.velocities = [];
    const radius = 0.4;
    const angleStep = (Math.PI * 2) / maxMetaballs;
    initialPositions = [];
    initialVelocities = [];
    for (let i = 0; i < maxMetaballs; i++) {
        const angle = -Math.PI/2 + (i * angleStep);
        const x = Math.cos(angle) * radius + 0.5;
        const y = Math.sin(angle) * radius + 0.5;
        metaballState.positions.push(x, y);
        initialPositions.push(x, y);
        // Give each metaball a small initial velocity
        const vx = Math.cos(angle + Math.PI/2) * 0.005;
        const vy = Math.sin(angle + Math.PI/2) * 0.005;
        metaballState.velocities.push(vx, vy);
        initialVelocities.push(vx, vy);
    }
}

export function updatePhysics() {
    let allClose = true;
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
                const perpForce = [-toCenter[1], toCenter[0]];
                vx += (perpForce[0] / dist) * vorticityValue;
                vy += (perpForce[1] / dist) * vorticityValue;
            }
        }
        // Surface tension
        if (surfaceTensionEnabled && surfaceTensionValue > 0) {
            for (let j = 0; j < maxMetaballs; j++) {
                if (i === j) continue;
                const dx = x - metaballState.positions[j * 2];
                const dy = y - metaballState.positions[j * 2 + 1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                const optimalDist = 0.3;
                if (dist > 0.001) {
                    // Attractive if too far, repulsive if too close
                    const force = surfaceTensionValue * (dist - optimalDist);
                    vx -= (dx / dist) * force;
                    vy -= (dy / dist) * force;
                }
            }
        }
        // Gravity
        if (gravityEnabled && gravityValue > 0) {
            const toCenter = [0.5 - x, 0.5 - y];
            const dist = Math.sqrt(toCenter[0] * toCenter[0] + toCenter[1] * toCenter[1]);
            if (dist > 0.001) {
                vx += (toCenter[0] / dist) * gravityValue;
                vy += (toCenter[1] / dist) * gravityValue;
            }
        }
        // Repulsion
        if (repulsionToggles[i]) {
            for (let j = 0; j < maxMetaballs; j++) {
                if (i === j) continue;
                const dx = x - metaballState.positions[j * 2];
                const dy = y - metaballState.positions[j * 2 + 1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < repulsionRadius && dist > 0.001) {
                    const force = repulsionStrengths[i] * (1.0 - dist / repulsionRadius);
                    vx += (dx / dist) * force;
                    vy += (dy / dist) * force;
                }
            }
        }
        // Return to start spring force
        if (returningToOrigin) {
            const x0 = initialPositions[idx];
            const y0 = initialPositions[idx + 1];
            const dx = x0 - x;
            const dy = y0 - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            vx += dx * returnSpringConstant;
            vy += dy * returnSpringConstant;
            // Damping
            vx *= returnDamping;
            vy *= returnDamping;
            // Check if close enough (threshold returnThreshold)
            if (dist > returnThreshold) allClose = false;
            else {
                // Snap to initial position
                x = x0;
                y = y0;
            }
        }
        // Apply viscous damping
        const damping = viscousDampingEnabled ? viscousDampingValue : 1.0;
        vx *= damping;
        vy *= damping;
        // Move
        x += vx;
        y += vy;
        // Circular boundary bounce
        const dx = x - boundaryCenter[0];
        const dy = y - boundaryCenter[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const effectiveBoundary = getBoundaryRadius() - METABALL_RADIUS;
        if (dist > effectiveBoundary) {
            // Clamp to circle
            const nx = dx / dist;
            const ny = dy / dist;
            x = boundaryCenter[0] + nx * effectiveBoundary;
            y = boundaryCenter[1] + ny * effectiveBoundary;
            // Reflect velocity
            const dot = vx * nx + vy * ny;
            vx = vx - 2 * dot * nx;
            vy = vy - 2 * dot * ny;
        }
        metaballState.positions[idx] = x;
        metaballState.positions[idx + 1] = y;
        metaballState.velocities[idx] = vx;
        metaballState.velocities[idx + 1] = vy;
    }
    if (returningToOrigin && allClose) {
        if (!returnTimeout) {
            returnTimeout = setTimeout(() => {
                velocityKick = initialVelocities.slice();
                pendingVelocityKick = true;
                returningToOrigin = false;
                returnTimeout = null;
            }, 200);
        }
    } else if (!allClose && returnTimeout) {
        clearTimeout(returnTimeout);
        returnTimeout = null;
    }
    // Apply velocity kick if pending
    if (pendingVelocityKick) {
        for (let i = 0; i < maxMetaballs; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const mag = 0.01;
            metaballState.velocities[i*2] = Math.cos(angle) * mag;
            metaballState.velocities[i*2+1] = Math.sin(angle) * mag;
        }
        pendingVelocityKick = false;
    }
    // Apply speed cap (hard or soft)
    for (let i = 0; i < maxMetaballs; i++) {
        const idx = i * 2;
        let vx = metaballState.velocities[idx];
        let vy = metaballState.velocities[idx + 1];
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > maxSpeed) {
            if (softCapEnabled) {
                // Soft cap: damp velocity
                vx *= 0.9;
                vy *= 0.9;
            } else {
                // Hard cap: clamp to maxSpeed
                const scale = maxSpeed / speed;
                vx *= scale;
                vy *= scale;
            }
            metaballState.velocities[idx] = vx;
            metaballState.velocities[idx + 1] = vy;
        }
    }
}

export function getMetaballPositions() {
    return metaballState.positions;
}

export function getMetaballVelocities() {
    return metaballState.velocities;
}

// Circular boundary parameters
export const boundaryCenter = [0.5, 0.5];
let boundaryRadius = 0.45;
export function getBoundaryRadius() { return boundaryRadius; }
export function setBoundaryRadius(r) { boundaryRadius = r; }

export const METABALL_RADIUS = 0.1;
