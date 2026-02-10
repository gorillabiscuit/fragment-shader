// ─── Constants ───────────────────────────────────────────────────────────────
const NUM_BALLS = 3;
export const METABALL_RADIUS = 0.1;

// ─── Soft circular boundary (aspect-ratio-corrected space) ──────────────────
const BOUNDARY_GAP = 0.08;
const DEFAULT_OUTER = 0.44;          // reference size all distances were tuned for
let outerRadius = DEFAULT_OUTER;
let innerRadius = outerRadius - BOUNDARY_GAP;
const MAX_BOUNDARY_FORCE = 0.006;    // boundary force — NOT speed-scaled

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

// ─── Wandering attractor — Lissajous with irrational frequencies ────────────
// The gravity/vorticity center drifts in a small never-repeating path.
// Boundary checks still use the true center (0.5, 0.5).
const WANDER_RADIUS = 0.04;
function wanderingCenter(tSec) {
    return {
        x: 0.5 + Math.sin(tSec * 0.13) * WANDER_RADIUS
                + Math.sin(tSec * 0.07) * WANDER_RADIUS * 0.5,
        y: 0.5 + Math.sin(tSec * 0.09) * WANDER_RADIUS
                + Math.cos(tSec * 0.11) * WANDER_RADIUS * 0.4,
    };
}

// ─── Per-ball force sensitivity ─────────────────────────────────────────────
// Each ball responds to forces at a slightly different rate.
const BALL_SENSITIVITY = [1.0, 0.85, 1.15];

// ─── State ───────────────────────────────────────────────────────────────────
let positions = [];   // flat [x0,y0, x1,y1, x2,y2]
let velocities = [];  // flat [vx0,vy0, ...]

// ─── Force strengths (current, interpolated) ────────────────────────────────
// All values are pre-baked at the designed speed (formerly ×0.40 multiplier).
// speedMultiplier = 1.0 gives this exact motion. Slider adjusts relative to it.
let forces = {
    gravity:            0.00012,
    vorticity:          0.0,
    turbulence:         0.00004,
    surfaceTension:     0.0,
    radialOscillation:  0.0,
    repulsionBall:      -1,
    repulsionStr:       0.0,
};

// Target values we lerp toward
let targets = { ...forces };

// ─── Speed governor ─────────────────────────────────────────────────────────
// BASE_MAX_SPEED is pre-baked at designed speed.
// speedMultiplier = 1.0 is the designed soothing pace. 2.0 = double, 0.5 = half.
const BASE_MAX_SPEED = 0.00384;
const BASE_GLOBAL_DAMPING = 0.995;
let speedMultiplier = 1.0;
export function setSpeedMultiplier(v) { speedMultiplier = v; }

// ─── Clump / spread detection ───────────────────────────────────────────────
let clumpTimer = 0;
let spreadTimer = 0;
const BASE_CLUMP_THRESHOLD = 0.12;
const BASE_SPREAD_THRESHOLD = 0.45;
const CLUMP_PATIENCE = 5.0;
const SPREAD_PATIENCE = 6.0;

// ─── Phase / mood system ────────────────────────────────────────────────────
// All force values are pre-baked (formerly ×0.40). speedMultiplier = 1.0 = designed.
const MOODS = [
    {
        name: 'gentleOrbit',
        gravity: 0.00012,
        vorticity: 0.00014,
        turbulence: 0.000032,
        surfaceTension: 0.00024,
        radialOscillation: 0.00008,
        repulsion: false,
    },
    {
        name: 'tightSwirl',
        gravity: 0.0002,
        vorticity: 0.00016,
        turbulence: 0.00002,
        surfaceTension: 0.00032,
        radialOscillation: 0.00006,
        repulsion: false,
    },
    {
        name: 'driftApart',
        gravity: 0.00006,
        vorticity: -0.00010,           // counter-rotate while separating
        turbulence: 0.00004,
        surfaceTension: 0.0,
        radialOscillation: 0.00004,
        repulsion: true,
        repulsionStr: 0.0012,
    },
    {
        name: 'wideSwirl',
        gravity: 0.00008,
        vorticity: -0.00016,           // wide counter-clockwise orbit
        turbulence: 0.000032,
        surfaceTension: 0.00016,
        radialOscillation: 0.0001,
        repulsion: false,
    },
    {
        name: 'drainCircle',
        gravity: 0.00016,
        vorticity: 0.00024,
        turbulence: 0.000016,
        surfaceTension: 0.0002,
        radialOscillation: 0.00008,
        repulsion: false,
    },
    {
        name: 'breathe',
        gravity: 0.00012,
        vorticity: 0.0,                // no rotation — pure radial breathing
        turbulence: 0.00002,
        surfaceTension: 0.0004,
        radialOscillation: 0.00024,    // boosted for more visible breathing
        repulsion: false,
    },
    // ── New moods for variety ────────────────────────────────────────────────
    {
        name: 'gravityDrift',           // no rotation, balls drift inward under gravity
        gravity: 0.00020,              // then bounce off each other via surface tension
        vorticity: 0.0,
        turbulence: 0.000028,
        surfaceTension: 0.00032,
        radialOscillation: 0.00006,
        repulsion: false,
    },
    {
        name: 'reverseOrbit',           // gentle counter-clockwise
        gravity: 0.00012,
        vorticity: -0.00014,
        turbulence: 0.000024,
        surfaceTension: 0.00020,
        radialOscillation: 0.00008,
        repulsion: false,
    },
    {
        name: 'pulseRepulse',           // balls push out then get pulled back
        gravity: 0.00006,              // weak gravity so they drift out
        vorticity: 0.0,                // no rotation during the pulse
        turbulence: 0.000020,
        surfaceTension: 0.0,
        radialOscillation: 0.00028,    // strong breathing drives in/out pulse
        repulsion: true,
        repulsionStr: 0.0008,          // light repulsion between balls
    },
];

let currentMoodIndex = 0;
let moodTimeRemaining = 0;
let lastFrameTime = 0;

// ─── Lerp rate ──────────────────────────────────────────────────────────────
const LERP_SPEED = 0.35;

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

/**
 * Smooth time-based noise — returns a value in roughly [-1, 1].
 */
function smoothNoise(t, seed) {
    return Math.sin(t * 0.7 + seed) * 0.5
         + Math.sin(t * 1.3 + seed * 2.1) * 0.3
         + Math.sin(t * 2.1 + seed * 0.7) * 0.2;
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
    targets.radialOscillation = mood.radialOscillation || 0;

    if (mood.repulsion) {
        targets.repulsionBall = Math.floor(Math.random() * NUM_BALLS);
        targets.repulsionStr = mood.repulsionStr || 0.0012;
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
        // Initial velocity: tangential (pre-baked at designed speed)
        velocities.push(
            Math.cos(angle + Math.PI / 2) * 0.0012,
            Math.sin(angle + Math.PI / 2) * 0.0012
        );
    }
    lastFrameTime = performance.now();
    pickNextMood();
}

// ─── Physics update (called every frame) ────────────────────────────────────
// All forces are normalized to 60fps via `f` (frame multiplier).
// speedMultiplier = 1.0 gives the designed soothing pace.
export function updatePhysics() {
    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;

    // Frame multiplier: 1.0 at 60fps, 0.5 at 120fps, 2.0 at 30fps
    const f = dt * 60;

    // Time in seconds for smooth noise
    const tSec = now * 0.001;

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
    forces.radialOscillation = lerp(forces.radialOscillation, targets.radialOscillation, lerpT);
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
            targets.repulsionStr = 0.0016 * s;
            targets.vorticity = 0.00012;
            targets.gravity = 0.00004;
            moodTimeRemaining = randomRange(8, 14);
            clumpTimer = 0;
        }
    } else if (avgDist > spreadThreshold) {
        spreadTimer += dt;
        clumpTimer = 0;
        if (spreadTimer > SPREAD_PATIENCE) {
            targets.gravity = 0.00028;
            targets.surfaceTension = 0.0004;
            targets.repulsionBall = -1;
            targets.repulsionStr = 0.0;
            moodTimeRemaining = randomRange(8, 14);
            spreadTimer = 0;
        }
    } else {
        clumpTimer = Math.max(0, clumpTimer - dt * 0.5);
        spreadTimer = Math.max(0, spreadTimer - dt * 0.5);
    }

    // ── Wandering gravity center for this frame ────────────────────────────
    const center = wanderingCenter(tSec);

    // ── Apply forces to each ball ───────────────────────────────────────────
    const sm = speedMultiplier;

    for (let i = 0; i < NUM_BALLS; i++) {
        const idx = i * 2;
        let x = positions[idx];
        let y = positions[idx + 1];
        let vx = velocities[idx];
        let vy = velocities[idx + 1];

        // Per-ball phase offset (~120° apart) and sensitivity
        const seed = i * 2.094;
        const sens = BALL_SENSITIVITY[i];

        // Smooth perturbation
        vx += smoothNoise(tSec * 0.8, seed) * forces.turbulence * sm * sens * f;
        vy += smoothNoise(tSec * 0.8, seed + 50.0) * forces.turbulence * sm * sens * f;

        // Direction to wandering center (not the fixed 0.5, 0.5)
        const toCx = center.x - x;
        const toCy = center.y - y;
        const distC = Math.sqrt(toCx * toCx + toCy * toCy);

        if (distC > 0.001) {
            const nx = toCx / distC;
            const ny = toCy / distC;
            const tx = -ny;
            const ty = nx;

            // Gravity toward wandering center
            if (forces.gravity > 0) {
                vx += nx * forces.gravity * sm * sens * f;
                vy += ny * forces.gravity * sm * sens * f;
            }

            // Vorticity — tangential force (signed: positive = CW, negative = CCW)
            if (forces.vorticity !== 0) {
                vx += tx * forces.vorticity * sm * sens * f;
                vy += ty * forces.vorticity * sm * sens * f;
            }

            // Radial oscillation — sinusoidal in-and-out breathing
            if (forces.radialOscillation > 0) {
                const radialPhase = tSec * 0.4 + seed;
                const radialPush = Math.sin(radialPhase) * forces.radialOscillation * sm * sens * f;
                vx += nx * radialPush;
                vy += ny * radialPush;
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
                    const force = forces.surfaceTension * (dist - optimalDist) * sm * f;
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
                    const pushFactor = forces.repulsionStr * s * (1.0 - dist / repulsionRange) * sm * f;
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
                const pushFactor = forces.repulsionStr * s * (1.0 - dist / repulsionRange) * sm * f;
                vx += (rdx / dist) * pushFactor;
                vy += (rdy / dist) * pushFactor;
            }
        }

        // Global damping (frame-rate independent via pow)
        const baseDamping = 1.0 - (1.0 - BASE_GLOBAL_DAMPING) / s;
        vx *= Math.pow(baseDamping, f);
        vy *= Math.pow(baseDamping, f);

        // Integrate position (scaled by frame multiplier)
        x += vx * f;
        y += vy * f;

        // ── Soft circular boundary (aspect-ratio-corrected) ─────────────────
        const dx = x - 0.5;
        const dy = y - 0.5;
        const corrDist = correctedDistFromCenter(x, y);
        const rawDist = Math.sqrt(dx * dx + dy * dy);

        if (corrDist > innerRadius && rawDist > 0.001) {
            const t = Math.min((corrDist - innerRadius) / (outerRadius - innerRadius), 1.0);
            const force = t * t * MAX_BOUNDARY_FORCE * f;
            vx -= (dx / rawDist) * force;
            vy -= (dy / rawDist) * force;
        }

        if (corrDist > outerRadius && rawDist > 0.001) {
            const scale = outerRadius / corrDist;
            x = 0.5 + dx * scale;
            y = 0.5 + dy * scale;
            const bnx = dx / rawDist;
            const bny = dy / rawDist;
            const dot = vx * bnx + vy * bny;
            if (dot > 0) {
                vx -= dot * bnx;
                vy -= dot * bny;
            }
            vx *= Math.pow(0.8, f);
            vy *= Math.pow(0.8, f);
        }

        // Store
        positions[idx] = x;
        positions[idx + 1] = y;
        velocities[idx] = vx;
        velocities[idx + 1] = vy;
    }

    // ── Speed governor (scaled to boundary) ────────────────────────────────
    const maxSpeed = BASE_MAX_SPEED * s * speedMultiplier;
    for (let i = 0; i < NUM_BALLS; i++) {
        const idx = i * 2;
        const vx = velocities[idx];
        const vy = velocities[idx + 1];
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > maxSpeed) {
            const brake = Math.pow(0.92, f);
            velocities[idx] *= brake;
            velocities[idx + 1] *= brake;
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
