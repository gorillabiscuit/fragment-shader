export default `
precision highp float;
uniform float canvasWidth;
uniform float canvasHeight;
uniform float time;
uniform vec2 metaballPositions[3];
uniform vec2 metaballVelocities[3];
uniform vec2 mousePos;
uniform float mouseForceEnabled;
uniform float mouseForceStrength;
uniform float mouseForceRadius;
uniform float mouseForceType;
uniform vec3 baseColor;
uniform vec3 secondaryColor;
uniform vec3 backgroundColor;
uniform float velocityColorEnabled;
uniform float velocityColorIntensity;
uniform float distanceColorEnabled;
uniform float distanceColorIntensity;

float metaball(vec2 point, vec2 center, float radius) {
    vec2 aspectRatio = vec2(canvasWidth / canvasHeight, 1.0);
    point.x *= aspectRatio.x;
    center.x *= aspectRatio.x;
    float dx = point.x - center.x;
    float dy = point.y - center.y;
    return radius / (dx * dx + dy * dy);
}

void main() {
    vec2 point = gl_FragCoord.xy / vec2(canvasWidth, canvasHeight);
    float sum = 0.0;
    vec3 finalColor = vec3(1.0);
    float maxSpeed = 0.03; // Tune as needed for effect

    for (int i = 0; i < 3; i++) {
        float fieldStrength = metaball(point, metaballPositions[i], 0.003125);
        sum += fieldStrength;

        // Calculate velocity-based color
        float speed = length(metaballVelocities[i]);
        float velocityBlend = clamp(speed / maxSpeed, 0.0, 1.0) * velocityColorIntensity;
        vec3 velocityBasedColor = mix(baseColor, secondaryColor, velocityBlend);
        if (velocityColorEnabled < 0.5) velocityBasedColor = baseColor;

        // Calculate distance-based color
        vec3 distanceBasedColor = distanceColorEnabled > 0.0 ? 
            mix(baseColor, secondaryColor, smoothstep(0.0, distanceColorIntensity, fieldStrength)) : 
            baseColor;
        
        float blendFactor = fieldStrength / (sum + 0.001);
        finalColor = mix(finalColor, mix(velocityBasedColor, distanceBasedColor, 0.5), blendFactor);
    }

    float edge0 = 0.25;
    float edge1 = 0.27;
    float alpha = smoothstep(edge0, edge1, sum);
    gl_FragColor = vec4(finalColor, alpha);
}
`;
