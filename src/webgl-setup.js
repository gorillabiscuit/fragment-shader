import vertexShaderSource from './shaders/vertex.glsl.js';
import fragmentShaderSource from './shaders/fragment.glsl.js';

let fieldStrength = 0.0027;
export function setFieldStrength(v) { fieldStrength = v; }
export function getFieldStrength() { return fieldStrength; }

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function initWebGL(canvas) {
    const gl = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: false,
    });
    if (!gl) {
        console.error('Unable to initialize WebGL.');
        return {};
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader link error: ' + gl.getProgramInfoLog(shaderProgram));
        return {};
    }
    gl.useProgram(shaderProgram);

    return { gl, shaderProgram };
}

export function setupBuffers(gl, shaderProgram) {
    const vertices = new Float32Array([
        -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
    ]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(shaderProgram, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Static uniforms
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'canvasWidth'), gl.canvas.width);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'canvasHeight'), gl.canvas.height);
}

/** Update viewport and canvas-size uniforms after a resize */
export function resizeGL(gl, shaderProgram, canvas) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'canvasWidth'), canvas.width);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'canvasHeight'), canvas.height);
}

export function drawMetaballs(gl, shaderProgram, positions) {
    const fs = fieldStrength;
    const radiiLoc = gl.getUniformLocation(shaderProgram, 'metaballRadii');
    if (radiiLoc) {
        gl.uniform1fv(radiiLoc, [fs, fs, fs]);
    }

    for (let i = 0; i < 3; i++) {
        const posLoc = gl.getUniformLocation(shaderProgram, `metaballPositions[${i}]`);
        gl.uniform2f(posLoc, positions[i * 2], positions[i * 2 + 1]);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
