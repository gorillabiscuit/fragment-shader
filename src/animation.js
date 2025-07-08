import { initializeMetaballs, updatePhysics, getMetaballPositions } from './physics.js';
import { drawMetaballs } from './webgl-setup.js';

export function startAnimation(gl, shaderProgram) {
    initializeMetaballs();
    function animate() {
        updatePhysics();
        const positions = getMetaballPositions();
        drawMetaballs(gl, shaderProgram, positions);
        console.log('Animating...'); // TEMP: verify animation loop
        requestAnimationFrame(animate);
    }
    animate();
}
