import { initWebGL, setupBuffers } from './webgl-setup.js';
import { startAnimation } from './animation.js';

window.onload = () => {
    const canvas = document.getElementById('glcanvas');
    const { gl, shaderProgram } = initWebGL(canvas);
    if (gl) {
        setupBuffers(gl, shaderProgram);
        startAnimation(gl, shaderProgram);
    }
};
