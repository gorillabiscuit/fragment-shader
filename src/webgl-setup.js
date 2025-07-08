import vertexShaderSource from './shaders/vertex.glsl.js';
import fragmentShaderSource from './shaders/fragment.glsl.js';

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

export function setupBuffersAndDraw(gl, shaderProgram) {
    // Vertex buffer setup
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

    // Set up uniforms for a static metaball arrangement
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'canvasWidth'), gl.canvas.width);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'canvasHeight'), gl.canvas.height);
    // Place 3 metaballs in a triangle
    const positions = [
        [0.5, 0.8],
        [0.2, 0.2],
        [0.8, 0.2],
    ];
    for (let i = 0; i < 3; i++) {
        const posLocation = gl.getUniformLocation(shaderProgram, `metaballPositions[${i}]`);
        gl.uniform2f(posLocation, positions[i][0], positions[i][1]);
    }
    // Set default colors
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'baseColor'), [1, 1, 1]);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'secondaryColor'), [0.53, 0.8, 1]);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'backgroundColor'), [0.125, 0.49, 0.792]);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'velocityColorEnabled'), 0.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'velocityColorIntensity'), 1.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'distanceColorEnabled'), 0.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'distanceColorIntensity'), 1.0);
    // Draw
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
