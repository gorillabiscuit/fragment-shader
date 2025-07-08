import { initWebGL, setupBuffersAndDraw } from './webgl-setup.js';

window.onload = () => {
    const canvas = document.getElementById('glcanvas');
    const { gl, shaderProgram } = initWebGL(canvas);
    if (gl) {
        setupBuffersAndDraw(gl, shaderProgram);
    }
};
