import { initWebGL, setupBuffers } from './webgl-setup.js';
import { startAnimation } from './animation.js';
import { setupControlListeners, onControlChange, getControlValues } from './ui-controls.js';

window.onload = () => {
    const canvas = document.getElementById('glcanvas');
    const { gl, shaderProgram } = initWebGL(canvas);
    if (gl) {
        setupBuffers(gl, shaderProgram);
        startAnimation(gl, shaderProgram);
    }
    setupControlListeners();
    onControlChange(values => {
        console.log('Control values changed:', values);
    });
};
