import { initWebGL } from './webgl-setup.js';

window.onload = () => {
    const canvas = document.getElementById('glcanvas');
    const { gl, shaderProgram } = initWebGL(canvas);
    // For now, just clear the canvas to verify setup works
    if (gl) {
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
};
