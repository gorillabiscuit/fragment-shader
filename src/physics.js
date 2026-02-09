// ─── Constants ───────────────────────────────────────────────────────────────
const NUM_BALLS = 3;
export const METABALL_RADIUS = 0.1;

// ─── Soft circular boundary (aspect-ratio-corrected space) ──────────────────
// Inner radius: where repulsion force begins (weakest)
// Outer radius: where repulsion is at maximum / hard clamp
// Gap between inner and outer is fixed at 0.08
const BOUNDARY_GAP = 0.08;
const DEFAULT_OUTER = 0.44;          // reference size all distances were tuned for
let outerRadius = DEFAULT_OUTER;
let innerRadius = outerRadius - BOUNDARY_GAP;
const MAX_BOUNDARY_FORCE = 0.006;

export function getInnerRadius() { return innerRadius; }
export function getOuterRadius() { return outerRadius; }
export function setBoundaryRadius(outer) {
    outerRadius = outer;
    innerRadius = outer - BOUNDARY_GAP;
}
/** Scale factor: all distance-dependent values multiply by this */
function boundaryScale() { return outerRadius / DEFAULT_OUTER; }

// ─── Aspect ratio (set from canvas) ─────────────────────────────────────────
let aspectRatio = 1;
export function setAspectRatio(ar) { aspectRatio = ar; }

// ─── State ───────────────────────────────────────────────────────────────────
let positions = [];   // flat [x0,y0, x1,y1, x2,y2]
let velocities = [];  // flat [vx0,vy0, ...]

// ─── Force strengths (current, interpolated) ────────────────────────────────
let forces = {
    gravity:        0.0003,
    vorticity:      0.0,
    turbulence:     0.0005,
    surfaceTension: 0.0,
    repulsionBall:  -1,
    repulsionStr:   0.0,
};

// Target values we lerp toward
let targets = { ...forces };

// ─── Speed governor ─────────────────────────────────────────────────────────
const BASE_MAX_SPEED = 0.012;        // scaled by boundary
const BASE_GLOBAL_DAMPING = 0.995;   // tightens with smaller boundary

// ─── Clump / spread detection ───────────────────────────────────────────────
let clumpTimer = 0;
let spreadTimer = 0;
const BASE_CLUMP_THRESHOLD = 0.12;   // scaled by boundary
const BASE_SPREAD_THRESHOLD = 0.45;  // scaled by boundary
const CLUMP_PATIENCE = 5.0;
const SPREAD_PATIENCE = 6.0;

// ─── Phase / mood system ────────────────────────────────────────────────────
const MOODS = [
    {
        name: 'gentleOrbit',
        gravity: 0.0003,
        vorticity: 0.00004,
        turbulence: 0.0003,
        surfaceTension: 0.0008,
        repulsion: false,
    },
    {
        name: 'softAttract',
        gravity: 0.0006,
        vorticity: 0.0,
        turbulence: 0.0002,
        surfaceTension: 0.001,
        repulsion: false,
    },
    {
        name: 'driftApart',
        gravity: 0.0001,
        vorticity: 0.00002,
        turbulence: 0.0006,
        surfaceTension: 0.0,
        repulsion: true,
        repulsionStr: 0.003,
    },
    {
        name: 'turbulentSwirl',
        gravity: 0.0002,
        vorticity: 0.00006,
        turbulence: 0.001,
        surfaceTension: 0.0005,
        repulsion: false,
    },
    {
        name: 'drainCircle',
        gravity: 0.00015,
        vorticity: 0.00008,
        turbulence: 0.0002,
        surfaceTension: 0.0006,
        repulsion: false,
    },
    {
        name: 'gentlePulse',
        gravity: 0.0005,
        vorticity: 0.00001,
        turbulence: 0.0004,
        surfaceTension: 0.0012,
        repulsion: false,
    },
];

let currentMoodIndex = 0;
let moodTimeRemaining = 0;
let lastFrameTime = 0;

// ─── Lerp rate ──────────────────────────────────────────────────────────────
const LERP_SPEED = 0.4;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function lerp(a, b, t) {
    return a + (b - a) * Math.min(t, 1.0);
}

function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

function correctedDistFromCenter(x, y) {
    const dx = (x - 0.5) * aspectRatio;
    const dy = y - 0.5;
    return Math.sqrt(dx * dx + dy * dy);
}

function avgInterBallDistance() {
    let total = 0;
    let count = 0;
    for (let i = 0; i < NUM_BALLS; i++) {
        for (let j = i + 1; j < NUM_BALLS; j++) {
            const dx = positions[i * 2] - positions[j * 2];
            const dy = positions[i * 2 + 1] - positions[j * 2 + 1];
            total += Math.sqrt(dx * dx + dy * dy);
            count++;
        }
    }
    return total / count;
}

// ─── Mood selection ─────────────────────────────────────────────────────────
function pickNextMood() {
    let next;
    do {
        next = Math.floor(Math.random() * MOODS.length);
    } while (next === currentMoodIndex && MOODS.length > 1);
    currentMoodIndex = next;
    moodTimeRemaining = randomRange(10, 22);
    applyMoodTargets(MOODS[currentMoodIndex]);
}

function applyMoodTargets(mood) {
    targets.gravity = mood.gravity;
    targets.vorticity = mood.vorticity;
    targets.turbulence = mood.turbulence;
    targets.surfaceTension = mood.surfaceTension;

    if (mood.repulsion) {
        targets.repulsionBall = Math.floor(Math.random() * NUM_BALLS);
        targets.repulsionStr = mood.repulsionStr || 0.003;
    } else {
        targets.repulsionBall = -1;
        targets.repulsionStr = 0.0;
    }
}

// ─── Initialization ─────────────────────────────────────────────────────────
export function initializeMetaballs() {
    positions = [];
    velocities = [];
    const safeRadius = (innerRadius * 0.65) / Math.max(aspectRatio, 1);
    const angleStep = (Math.PI * 2) / NUM_BALLS;
    for (let i = 0; i < NUM_BALLS; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        positions.push(
            Math.cos(angle) * safeRadius + 0.5,
            Math.sin(angle) * safeRadius + 0.5
        );
        velocities.push(
            Math.cos(angle + Math.PI / 2) * 0.003,
            Math.sin(angle + Math.PI / 2) * 0.003
        );
    }
    lastFrameTime = performance.now();
    pickNextMood();
}

// ─── Physics update (called every frame) ────────────────────────────────────
export function updatePhysics() {
    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;

    // ── Mood timer ──────────────────────────────────────────────────────────
    moodTimeRemaining -= dt;
    if (moodTimeRemaining <= 0) {
        pickNextMood();
    }

    // ── Lerp forces toward targets ──────────────────────────────────────────
    const lerpT = LERP_SPEED * dt;
    forces.gravity = lerp(forces.gravity, targets.gravity, lerpT);
    forces.vorticity = lerp(forces.vorticity, targets.vorticity, lerpT);
    forces.turbulence = lerp(forces.turbulence, targets.turbulence, lerpT);
    forces.surfaceTension = lerp(forces.surfaceTension, targets.surfaceTension, lerpT);
    forces.repulsionStr = lerp(forces.repulsionStr, targets.repulsionStr, lerpT);
    forces.repulsionBall = targets.repulsionBall;

    // ── Clump / spread detection (scaled to boundary) ─────────────────────
    const s = boundaryScale();
    const avgDist = avgInterBallDistance();
    const clumpThreshold = BASE_CLUMP_THRESHOLD * s;
    const spreadThreshold = BASE_SPREAD_THRESHOLD * s;

    if (avgDist < clumpThreshold) {
        clumpTimer += dt;
        spreadTimer = 0;
        if (clumpTimer > CLUMP_PATIENCE) {
            targets.repulsionBall = Math.floor(Math.random() * NUM_BALLS);
            targets.repulsionStr = 0.004 * s;
            targets.vorticity = 0.00006;
            targets.gravity = 0.0001;
            moodTimeRemaining = randomRange(8, 14);
            clumpTimer = 0;
        }
    } else if (avgDist > spreadThreshold) {
        spreadTimer += dt;
        clumpTimer = 0;
        if (spreadTimer > SPREAD_PATIENCE) {
            targets.gravity = 0.0007;
            targets.surfaceTension = 0.001;
            targets.repulsionBall = -1;
            targets.repulsionStr = 0.0;
            moodTimeRemaining = randomRange(8, 14);
            spreadTimer = 0;
        }
    } else {
        clumpTimer = Math.max(0, clumpTimer - dt * 0.5);
        spreadTimer = Math.max(0, spreadTimer - dt * 0.5);
    }

    // ── Apply forces to each ball ───────────────────────────────────────────
    for (let i = 0; i < NUM_BALLS; i++) {
        const idx = i * 2;
        let x = positions[idx];
        let y = positions[idx + 1];
        let vx = velocities[idx];
        let vy = velocities[idx + 1];

        // Turbulence
        vx += (Math.random() - 0.5) * forces.turbulence;
        vy += (Math.random() - 0.5) * forces.turbulence;

        // Gravity toward center
        if (forces.gravity > 0) {
            const toCx = 0.5 - x;
            const toCy = 0.5 - y;
            const distC = Math.sqrt(toCx * toCx + toCy * toCy);
            if (distC > 0.001) {
                vx += (toCx / distC) * forces.gravity;
                vy += (toCy / distC) * forces.gravity;
            }
        }

        // Vorticity
        if (forces.vorticity > 0) {
            const toCx = 0.5 - x;
            const toCy = 0.5 - y;
            const distC = Math.sqrt(toCx * toCx + toCy * toCy);
            if (distC > 0.001) {
                vx += (-toCy / distC) * forces.vorticity;
                vy += (toCx / distC) * forces.vorticity;
            }
        }

        // Surface tension (distances scaled to boundary)
        if (forces.surfaceTension > 0) {
            const optimalDist = 0.25 * s;
            for (let j = 0; j < NUM_BALLS; j++) {
                if (i === j) continue;
                const sdx = x - positions[j * 2];
                const sdy = y - positions[j * 2 + 1];
                const dist = Math.sqrt(sdx * sdx + sdy * sdy);
                if (dist > 0.001) {
                    const force = forces.surfaceTension * (dist - optimalDist);
                    vx -= (sdx / dist) * force;
                    vy -= (sdy / dist) * force;
                }
            }
        }

        // Repulsion (one ball pushes others — range scaled to boundary)
        const repulsionRange = 0.35 * s;
        if (forces.repulsionBall === i && forces.repulsionStr > 0) {
            for (let j = 0; j < NUM_BALLS; j++) {
                if (i === j) continue;
                const rdx = positions[j * 2] - x;
                const rdy = positions[j * 2 + 1] - y;
                const dist = Math.sqrt(rdx * rdx + rdy * rdy);
                if (dist > 0.001 && dist < repulsionRange) {
                    const pushFactor = forces.repulsionStr * s * (1.0 - dist / repulsionRange);
                    vx -= (rdx / dist) * pushFactor * 0.5;
                    vy -= (rdy / dist) * pushFactor * 0.5;
                }
            }
        }
        if (forces.repulsionBall >= 0 && forces.repulsionBall !== i && forces.repulsionStr > 0) {
            const ri = forces.repulsionBall;
            const rdx = x - positions[ri * 2];
            const rdy = y - positions[ri * 2 + 1];
            const dist = Math.sqrt(rdx * rdx + rdy * rdy);
            if (dist > 0.001 && dist < repulsionRange) {
                const pushFactor = forces.repulsionStr * s * (1.0 - dist / repulsionRange);
                vx += (rdx / dist) * pushFactor;
                vy += (rdy / dist) * pushFactor;
            }
        }

        // Global damping (tighter in smaller boundaries)
        const damping = 1.0 - (1.0 - BASE_GLOBAL_DAMPING) / s;
        vx *= damping;
        vy *= damping;

        // Integrate position
        x += vx;
        y += vy;

        // ── Soft circular boundary (aspect-ratio-corrected) ─────────────────
        const dx = x - 0.5;
        const dy = y - 0.5;
        const corrDist = correctedDistFromCenter(x, y);
        const rawDist = Math.sqrt(dx * dx + dy * dy);

        if (corrDist > innerRadius && rawDist > 0.001) {
            const t = Math.min((corrDist - innerRadius) / (outerRadius - innerRadius), 1.0);
            const force = t * t * MAX_BOUNDARY_FORCE;
            vx -= (dx / rawDist) * force;
            vy -= (dy / rawDist) * force;
        }

        if (corrDist > outerRadius && rawDist > 0.001) {
            const scale = outerRadius / corrDist;
            x = 0.5 + dx * scale;
            y = 0.5 + dy * scale;
            const nx = dx / rawDist;
            const ny = dy / rawDist;
            const dot = vx * nx + vy * ny;
            if (dot > 0) {
                vx -= dot * nx;
                vy -= dot * ny;
            }
            vx *= 0.8;
            vy *= 0.8;
        }

        // Store
        positions[idx] = x;
        positions[idx + 1] = y;
        velocities[idx] = vx;
        velocities[idx + 1] = vy;
    }

    // ── Speed governor (scaled to boundary) ────────────────────────────────
    const maxSpeed = BASE_MAX_SPEED * s;
    for (let i = 0; i < NUM_BALLS; i++) {
        const idx = i * 2;
        const vx = velocities[idx];
        const vy = velocities[idx + 1];
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > maxSpeed) {
            velocities[idx] *= 0.92;
            velocities[idx + 1] *= 0.92;
        }
    }
}

// ─── Public getters ─────────────────────────────────────────────────────────
export function getMetaballPositions() {
    return positions;
}

export function getMetaballVelocities() {
    return velocities;
}
