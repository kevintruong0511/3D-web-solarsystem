// Fragment Shader v5 — Brighter morphed text + glow

varying vec3 vColor;
varying float vAlpha;
varying float vMorph;

void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    // Sharper dots when morphed (better text readability)
    float edgeSoftness = mix(0.5, 0.35, vMorph);
    float alpha = 1.0 - smoothstep(0.1, edgeSoftness, dist);

    // Brighter core glow when morphed for text visibility
    float glowStrength = mix(0.15, 0.4, vMorph);
    float glow = exp(-dist * 8.0) * glowStrength;
    vec3 finalColor = vColor * (0.85 + glow);

    // Boost brightness when morphed
    finalColor *= mix(1.0, 1.3, vMorph);

    gl_FragColor = vec4(finalColor, alpha * vAlpha);
}
