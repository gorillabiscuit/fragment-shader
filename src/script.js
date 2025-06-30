class WebGLBlobRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }
        
        this.setupCanvas();
        this.initShaders();
        this.setupGeometry();
        this.setupUniforms();
        this.setupBlobData();
        
        this.render();
    }
    
    setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        };
        
        window.addEventListener('resize', resize);
        resize();
    }
    
    initShaders() {
        const vertexShaderSource = document.getElementById('vertex-shader').textContent;
        const fragmentShaderSource = document.getElementById('fragment-shader').textContent;
        
        const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
        
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Shader program failed to link:', this.gl.getProgramInfoLog(this.program));
        }
        
        this.gl.useProgram(this.program);
    }
    
    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    setupGeometry() {
        // Full-screen quad
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1,
        ]);
        
        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }
    
    setupUniforms() {
        this.uniforms = {
            u_resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
            u_time: this.gl.getUniformLocation(this.program, 'u_time'),
            u_mouse: this.gl.getUniformLocation(this.program, 'u_mouse'),
            u_blob_positions: this.gl.getUniformLocation(this.program, 'u_blob_positions'),
            u_blob_radii: this.gl.getUniformLocation(this.program, 'u_blob_radii')
        };
        
        this.mousePos = [0.5, 0.5];
        this.canvas.addEventListener('mousemove', (e) => {
            this.mousePos[0] = e.clientX / this.canvas.width;
            this.mousePos[1] = 1.0 - (e.clientY / this.canvas.height);
        });
    }
    
    setupBlobData() {
        this.blobs = [
            { pos: [0.3, 0.5, 0.0], radius: 80, velocity: [0.02, 0.015] },
            { pos: [0.7, 0.5, 0.0], radius: 60, velocity: [-0.015, 0.025] },
            { pos: [0.5, 0.3, 0.0], radius: 70, velocity: [0.025, -0.02] }
        ];
        
        this.startTime = Date.now();
    }
    
    updateBlobs() {
        const time = (Date.now() - this.startTime) * 0.001;
        
        this.blobs.forEach((blob, i) => {
            // Simple bouncing animation
            blob.pos[0] += blob.velocity[0] * 0.016; // ~60fps
            blob.pos[1] += blob.velocity[1] * 0.016;
            
            // Bounce off edges
            if (blob.pos[0] < 0.1 || blob.pos[0] > 0.9) blob.velocity[0] *= -1;
            if (blob.pos[1] < 0.1 || blob.pos[1] > 0.9) blob.velocity[1] *= -1;
            
            // Keep in bounds
            blob.pos[0] = Math.max(0.1, Math.min(0.9, blob.pos[0]));
            blob.pos[1] = Math.max(0.1, Math.min(0.9, blob.pos[1]));
        });
    }
    
    render() {
        const time = (Date.now() - this.startTime) * 0.001;
        
        this.updateBlobs();
        
        // Clear
        this.gl.clearColor(0.424, 0.282, 0.286, 1.0); // #6C4849
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Enable blending for proper transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Set uniforms
        this.gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.uniforms.u_time, time);
        this.gl.uniform2fv(this.uniforms.u_mouse, this.mousePos);
        
        // Blob positions (convert to pixel coordinates)
        const positions = this.blobs.flatMap(blob => [
            blob.pos[0] * this.canvas.width,
            blob.pos[1] * this.canvas.height,
            0.0
        ]);
        const radii = this.blobs.map(blob => blob.radius);
        
        this.gl.uniform3fv(this.uniforms.u_blob_positions, positions);
        this.gl.uniform1fv(this.uniforms.u_blob_radii, radii);
        
        // Draw
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(() => this.render());
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    new WebGLBlobRenderer('canvas');
}); 