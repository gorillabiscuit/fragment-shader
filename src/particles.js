import createREGL from 'regl';

const canvas = document.querySelector('canvas');
const regl = createREGL({
  canvas,
  extensions: ['OES_texture_float']
});

if (!regl.hasExtension('OES_texture_float')) {
  alert('OES_texture_float not supported!');
}

const NUM_PARTICLES = 1000;
const PARTICLE_SIZE = 3.0;
const GRAVITY_STRENGTH = 0.0005;

// Utility to create initial particle state
function createInitialParticles(num) {
  const data = new Float32Array(num * 4);
  for (let i = 0; i < num; ++i) {
    // Random position in [-1, 1]
    data[4 * i + 0] = (Math.random() * 2 - 1) * 0.8;
    data[4 * i + 1] = (Math.random() * 2 - 1) * 0.8;
    // Random velocity
    data[4 * i + 2] = (Math.random() * 2 - 1) * 0.01;
    data[4 * i + 3] = (Math.random() * 2 - 1) * 0.01;
  }
  return data;
}

// Ping-pong buffers for simulation
const particleState = [
  regl.framebuffer({
    color: regl.texture({
      width: NUM_PARTICLES,
      height: 1,
      data: createInitialParticles(NUM_PARTICLES),
      type: 'float',
      format: 'rgba',
      min: 'nearest',
      mag: 'nearest',
    }),
    depth: false,
    stencil: false,
  }),
  regl.framebuffer({
    color: regl.texture({
      width: NUM_PARTICLES,
      height: 1,
      type: 'float',
      format: 'rgba',
      min: 'nearest',
      mag: 'nearest',
    }),
    depth: false,
    stencil: false,
  })
];

// Simple gravity center (just one for now)
function getGravityCenter(t) {
  const radius = 0.3;
  const speed = 0.5;
  return [
    Math.cos(t * speed) * radius,
    Math.sin(t * speed) * radius
  ];
}

// Simulation step: update particle positions/velocities
const stepParticles = regl({
  frag: `
  precision highp float;
  uniform sampler2D state;
  uniform vec2 gravityCenter;
  uniform float gravityStrength;
  uniform float dt;
  varying vec2 uv;
  void main() {
    vec4 p = texture2D(state, uv);
    vec2 pos = p.xy;
    vec2 vel = p.zw;
    
    // Simple gravity towards center
    vec2 d = gravityCenter - pos;
    float dist2 = dot(d, d) + 0.01;
    vec2 acc = gravityStrength * d / (dist2 * sqrt(dist2));
    
    // Integrate
    vel += acc * dt;
    vel *= 0.995; // Damping
    pos += vel * dt;
    
    gl_FragColor = vec4(pos, vel);
  }
  `,
  vert: `
  precision highp float;
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0, 1);
  }
  `,
  attributes: {
    position: [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]
  },
  uniforms: {
    state: ({tick}) => particleState[tick % 2].color[0],
    gravityCenter: ({tick}) => getGravityCenter(0.016 * tick),
    gravityStrength: GRAVITY_STRENGTH,
    dt: 0.016
  },
  framebuffer: ({tick}) => particleState[(tick + 1) % 2],
  count: 4,
  depth: { enable: false },
});

// Draw particles
const drawParticles = regl({
  vert: `
  precision highp float;
  attribute float index;
  uniform sampler2D state;
  uniform float pointSize;
  uniform float numParticles;
  uniform vec2 gravityCenter;
  varying vec3 vColor;
  void main() {
    float u = (index + 0.5) / numParticles;
    vec4 p = texture2D(state, vec2(u, 0.5));
    gl_Position = vec4(p.xy, 0, 1);
    gl_PointSize = pointSize;
    
    // Simple color based on distance to gravity center
    float dist = distance(p.xy, gravityCenter);
    vColor = vec3(0.2 + 0.8 * (1.0 - dist), 0.5, 1.0);
  }
  `,
  frag: `
  precision highp float;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor, 0.8);
  }
  `,
  attributes: {
    index: Array.from({length: NUM_PARTICLES}, (_, i) => i)
  },
  uniforms: {
    state: ({tick}) => particleState[(tick + 1) % 2].color[0],
    pointSize: PARTICLE_SIZE,
    numParticles: NUM_PARTICLES,
    gravityCenter: ({tick}) => getGravityCenter(0.016 * tick),
  },
  count: NUM_PARTICLES,
  depth: { enable: false },
  blend: {
    enable: true,
    func: {
      src: 'src alpha',
      dst: 'one',
    },
    equation: 'add',
  },
});

// Animation loop
regl.frame(() => {
  stepParticles();
  regl.clear({ color: [0.05, 0.05, 0.1, 1] });
  drawParticles();
}); 