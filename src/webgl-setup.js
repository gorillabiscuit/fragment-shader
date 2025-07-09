import vertexShaderSource from './shaders/vertex.glsl.js';
import fragmentShaderSource from './shaders/fragment.glsl.js';
import { METABALL_RADIUS } from './physics.js';
import { getControlValues } from './ui-controls.js';

export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function initWebGL(canvas) {
    const gl = canvas.getContext('webgl', { alpha: true });
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        return null;
    }
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    gl.useProgram(shaderProgram);
    return { gl, shaderProgram };
}

export function setupBuffers(gl, shaderProgram) {
    const vertices = new Float32Array([
        -1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
        -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
    ]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(shaderProgram, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    // Set up static uniforms
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'canvasWidth'), gl.canvas.width);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'canvasHeight'), gl.canvas.height);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'baseColor'), [1, 1, 1]);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'secondaryColor'), [0.53, 0.8, 1]);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'backgroundColor'), [0.125, 0.49, 0.792]);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'velocityColorEnabled'), 0.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'velocityColorIntensity'), 1.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'distanceColorEnabled'), 0.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'distanceColorIntensity'), 1.0);
}

export function drawMetaballs(gl, shaderProgram, positions) {
    const controls = getControlValues();
    const fieldStrength = parseFloat(controls['metaball-visual-size-slider'] || 0.003125);
    const radiiLoc = gl.getUniformLocation(shaderProgram, 'metaballRadii');
    if (radiiLoc) gl.uniform1fv(radiiLoc, [fieldStrength, fieldStrength, fieldStrength]);
    for (let i = 0; i < 3; i++) {
        const posLocation = gl.getUniformLocation(shaderProgram, `metaballPositions[${i}]`);
        gl.uniform2f(posLocation, positions[i*2], positions[i*2+1]);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Minimal vertex and fragment shaders for red line overlay
const circleVertexShaderSource = `
attribute vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}`;
const circleFragmentShaderSource = `
precision mediump float;
void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red
}`;

function createCircleProgram(gl) {
    const vShader = createShader(gl, gl.VERTEX_SHADER, circleVertexShaderSource);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, circleFragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    return program;
}

export function drawCircularBoundary(gl, center, radius) {
    const numSegments = 128;
    const verts = [];
    // Convert [0,1] center/radius to NDC, preserving aspect ratio
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    const aspect = w / h;
    const cx = (center[0] * 2 - 1) * (aspect >= 1 ? 1 / aspect : 1);
    const cy = (center[1] * 2 - 1) * (aspect <= 1 ? aspect : 1);
    const rx = radius * 2 * (aspect >= 1 ? 1 / aspect : 1);
    const ry = radius * 2 * (aspect <= 1 ? aspect : 1);
    for (let i = 0; i <= numSegments; i++) {
        const theta = (i / numSegments) * 2 * Math.PI;
        verts.push(cx + Math.cos(theta) * rx, cy + Math.sin(theta) * ry);
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STREAM_DRAW);
    // Save current program and attrib
    const prevProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const circleProgram = createCircleProgram(gl);
    gl.useProgram(circleProgram);
    const posLoc = gl.getAttribLocation(circleProgram, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.lineWidth(2);
    gl.drawArrays(gl.LINE_STRIP, 0, numSegments + 1);
    // Restore previous program
    gl.useProgram(prevProgram);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(circleProgram);
}
