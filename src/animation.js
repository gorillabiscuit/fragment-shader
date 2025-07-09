import { initializeMetaballs, updatePhysics, getMetaballPositions, getMetaballVelocities, setTurbulence, setViscousDamping, setVorticity } from './physics.js';
import { drawMetaballs } from './webgl-setup.js';
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
        // TODO: Wire up other physics toggles and sliders
        updatePhysics();
        const positions = getMetaballPositions();
        drawMetaballs(gl, shaderProgram, positions);
        requestAnimationFrame(animate);
    }
    animate();
}
