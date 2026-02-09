import { initializeMetaballs, updatePhysics, getMetaballPositions, setAspectRatio, getInnerRadius, getOuterRadius } from './physics.js';
import { drawMetaballs } from './webgl-setup.js';

/**
 * Starts the animation loop.
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} shaderProgram
 * @param {Object} config
 * @param {number[]} [config.ballColor=[1,1,1]] - RGB 0-1
 * @param {boolean} [config.showBoundary=false]
 * @returns {{ stop: () => void }}
 */
export function startAnimation(gl, shaderProgram, config = {}) {
    const {
        ballColor = [1.0, 1.0, 1.0],
        showBoundary = false,
    } = config;

    // Set aspect ratio before initializing ball positions
    const ar = gl.canvas.width / gl.canvas.height;
    setAspectRatio(ar);
    initializeMetaballs();

    // One-time uniforms
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'baseColor'), ballColor);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'showBoundary'), showBoundary ? 1.0 : 0.0);

    // Transparent clear
    gl.clearColor(0, 0, 0, 0);

    let rafId;

    function animate() {
        // Boundary radii may change via slider — update every frame
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'innerRadius'), getInnerRadius());
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'outerRadius'), getOuterRadius());

        updatePhysics();
        drawMetaballs(gl, shaderProgram, getMetaballPositions());
        rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);

    return {
        stop() {
            cancelAnimationFrame(rafId);
        },
    };
}
