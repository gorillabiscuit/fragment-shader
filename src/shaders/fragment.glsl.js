export default `
precision highp float;

uniform float canvasWidth;
uniform float canvasHeight;
uniform vec2 metaballPositions[3];
uniform float metaballRadii[3];
uniform vec3 baseColor;
uniform float innerRadius;
uniform float outerRadius;
uniform float showBoundary;

float metaball(vec2 point, vec2 center, float radius) {
    float aspect = canvasWidth / canvasHeight;
    vec2 p = point;
    vec2 c = center;
    p.x *= aspect;
    c.x *= aspect;
    float dx = p.x - c.x;
    float dy = p.y - c.y;
    return radius / (dx * dx + dy * dy);
}

void main() {
    vec2 point = gl_FragCoord.xy / vec2(canvasWidth, canvasHeight);
    float aspect = canvasWidth / canvasHeight;

    // Metaball field
    float sum = 0.0;
    for (int i = 0; i < 3; i++) {
        sum += metaball(point, metaballPositions[i], metaballRadii[i]);
    }

    float alpha = smoothstep(0.25, 0.27, sum);

    // Boundary circles (dev mode only)
    if (showBoundary > 0.5) {
        vec2 corrPoint = vec2(point.x * aspect, point.y);
        vec2 corrCenter = vec2(0.5 * aspect, 0.5);
        float distFromCenter = length(corrPoint - corrCenter);

        float innerRing = (1.0 - smoothstep(0.0, 0.003, abs(distFromCenter - innerRadius))) * 0.15;
        float outerRing = (1.0 - smoothstep(0.0, 0.003, abs(distFromCenter - outerRadius))) * 0.25;
        alpha = max(alpha, max(innerRing, outerRing));
    }

    gl_FragColor = vec4(baseColor, alpha);
}
`;
