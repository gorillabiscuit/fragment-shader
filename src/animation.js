import { initializeMetaballs, updatePhysics, getMetaballPositions, getMetaballVelocities, setTurbulence, setViscousDamping, setVorticity, setSurfaceTension, setGravity, setRepulsions, boundaryCenter, getBoundaryRadius, triggerReturnToStart, setReturnSpringConstant, setReturnDamping, setReturnThreshold, setMaxSpeed, setSoftCapEnabled } from './physics.js';
import { drawMetaballs, drawCircularBoundary, setupBuffers } from './webgl-setup.js';
import { getControlValues } from './ui-controls.js';

export function startAnimation(gl, shaderProgram) {
    initializeMetaballs();
    function animate() {
        const controls = getControlValues();
        // Set color uniforms
        function hexToRGB(hex) {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return [r, g, b];
        }
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'baseColor'), hexToRGB(controls['base-color']));
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'secondaryColor'), hexToRGB(controls['secondary-color']));
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'backgroundColor'), hexToRGB(controls['background-color']));
        // Velocity/distance color
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'velocityColorEnabled'), controls['velocity-color-toggle'] ? 1.0 : 0.0);
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'velocityColorIntensity'), parseFloat(controls['velocity-color-slider']));
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'distanceColorEnabled'), controls['distance-color-toggle'] ? 1.0 : 0.0);
        gl.uniform1f(gl.getUniformLocation(shaderProgram, 'distanceColorIntensity'), parseFloat(controls['distance-color-slider']));
        // Pass metaball velocities
        const velocities = getMetaballVelocities();
        for (let i = 0; i < 3; i++) {
            const velLoc = gl.getUniformLocation(shaderProgram, `metaballVelocities[${i}]`);
            gl.uniform2f(velLoc, velocities[i*2], velocities[i*2+1]);
        }
        // Turbulence
        if (controls['turbulence-toggle']) {
            setTurbulence(parseFloat(controls['turbulence-slider']));
        } else {
            setTurbulence(0);
        }
        // Viscous Damping
        setViscousDamping(
            controls['viscous-damping-toggle'],
            parseFloat(controls['viscous-damping-slider'])
        );
        // Vorticity
        setVorticity(
            controls['vorticity-toggle'],
            parseFloat(controls['vorticity-slider'])
        );
        // Surface Tension
        setSurfaceTension(
            controls['surface-tension-toggle'],
            parseFloat(controls['surface-tension-slider'])
        );
        // Gravity
        setGravity(
            controls['gravity-toggle'],
            parseFloat(controls['gravity-slider'])
        );
        // Repulsion (per-ball)
        setRepulsions(
            [
                controls['repulsion1-toggle'],
                controls['repulsion2-toggle'],
                controls['repulsion3-toggle']
            ],
            [
                parseFloat(controls['repulsion1-slider']),
                parseFloat(controls['repulsion2-slider']),
                parseFloat(controls['repulsion3-slider'])
            ]
        );
        updatePhysics();
        const positions = getMetaballPositions();
        drawMetaballs(gl, shaderProgram, positions);
        if (controls['circular-boundary-toggle']) {
            drawCircularBoundary(gl, boundaryCenter, getBoundaryRadius());
            setupBuffers(gl, shaderProgram); // Restore metaball state
        }
        requestAnimationFrame(animate);
    }
    animate();
}

window.addEventListener('DOMContentLoaded', () => {
    const returnBtn = document.getElementById('return-to-start-button');
    if (returnBtn) {
        returnBtn.addEventListener('click', () => {
            triggerReturnToStart();
        });
    }
    const springSlider = document.getElementById('return-spring-slider');
    if (springSlider) {
        setReturnSpringConstant(parseFloat(springSlider.value));
        springSlider.addEventListener('input', e => {
            setReturnSpringConstant(parseFloat(e.target.value));
        });
    }
    const dampingSlider = document.getElementById('return-damping-slider');
    if (dampingSlider) {
        setReturnDamping(parseFloat(dampingSlider.value));
        dampingSlider.addEventListener('input', e => {
            setReturnDamping(parseFloat(e.target.value));
        });
    }
    const thresholdSlider = document.getElementById('return-threshold-slider');
    if (thresholdSlider) {
        setReturnThreshold(parseFloat(thresholdSlider.value));
        thresholdSlider.addEventListener('input', e => {
            setReturnThreshold(parseFloat(e.target.value));
        });
    }
    const maxSpeedSlider = document.getElementById('max-speed-slider');
    if (maxSpeedSlider) {
        setMaxSpeed(parseFloat(maxSpeedSlider.value));
        maxSpeedSlider.addEventListener('input', e => {
            setMaxSpeed(parseFloat(e.target.value));
        });
    }
    const softCapToggle = document.getElementById('soft-cap-toggle');
    if (softCapToggle) {
        setSoftCapEnabled(softCapToggle.checked);
        softCapToggle.addEventListener('change', e => {
            setSoftCapEnabled(e.target.checked);
        });
    }
});
