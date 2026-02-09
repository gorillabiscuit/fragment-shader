/**
 * Metaball Animation — self-contained public API.
 *
 * Usage:
 *   import { createMetaballAnimation } from './metaball-animation.js';
 *
 *   const anim = createMetaballAnimation(canvasElement, {
 *       ballSize: 0.003125,
 *       boundaryRadius: 0.44,
 *       ballColor: [1, 1, 1],
 *       showBoundary: false,
 *   });
 *
 *   // Live updates
 *   anim.setBallSize(0.005);
 *   anim.setBoundaryRadius(0.3);
 *
 *   // Cleanup (e.g. React unmount)
 *   anim.destroy();
 */

import { initWebGL, setupBuffers, resizeGL, setFieldStrength } from './webgl-setup.js';
import { startAnimation } from './animation.js';
import { setBoundaryRadius, setAspectRatio } from './physics.js';

/**
 * Creates a metaball animation on the given canvas.
 *
 * @param {HTMLCanvasElement} canvas — must have CSS layout dimensions (width/height via CSS or parent).
 * @param {Object}  [config]
 * @param {number}  [config.ballSize=0.003125]     — visual radius of each metaball
 * @param {number}  [config.boundaryRadius=0.44]   — outer boundary radius
 * @param {number[]} [config.ballColor=[1,1,1]]    — RGB 0–1
 * @param {boolean} [config.showBoundary=false]     — render boundary circles (dev aid)
 * @returns {{ destroy: Function, resize: Function, setBallSize: Function, setBoundaryRadius: Function } | null}
 */
export function createMetaballAnimation(canvas, config = {}) {
    const {
        ballSize = 0.003125,
        boundaryRadius = 0.44,
        ballColor = [1.0, 1.0, 1.0],
        showBoundary = false,
    } = config;

    // ── Apply initial config ──────────────────────────────────────────────────
    setFieldStrength(ballSize);
    setBoundaryRadius(boundaryRadius);

    // ── Size canvas to its CSS layout dimensions ──────────────────────────────
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;

    // ── Init WebGL ────────────────────────────────────────────────────────────
    const { gl, shaderProgram } = initWebGL(canvas);
    if (!gl) return null;

    setupBuffers(gl, shaderProgram);
    resizeGL(gl, shaderProgram, canvas);

    // ── Start animation ───────────────────────────────────────────────────────
    const anim = startAnimation(gl, shaderProgram, { ballColor, showBoundary });

    // ── Responsive resize via ResizeObserver ──────────────────────────────────
    const ro = new ResizeObserver(() => {
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        resizeGL(gl, shaderProgram, canvas);
        setAspectRatio(canvas.width / canvas.height);
    });
    ro.observe(canvas);

    // ── Public controller ─────────────────────────────────────────────────────
    return {
        /** Stop animation and release resources. */
        destroy() {
            anim.stop();
            ro.disconnect();
        },

        /** Manually resize (if not relying on ResizeObserver). */
        resize(width, height) {
            canvas.width = width;
            canvas.height = height;
            resizeGL(gl, shaderProgram, canvas);
            setAspectRatio(canvas.width / canvas.height);
        },

        /** Update metaball visual size (field strength). */
        setBallSize(v) {
            setFieldStrength(v);
        },

        /** Update outer boundary radius. */
        setBoundaryRadius(v) {
            setBoundaryRadius(v);
        },
    };
}
