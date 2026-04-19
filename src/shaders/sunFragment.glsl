// Sun Fragment Shader — Animated lava surface with multi-layer color

uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  // Base color gradient from displacement
  // Core: bright white-yellow, Mid: orange, Edge: deep red
  float intensity = vDisplacement * 2.0 + 0.5;
  
  vec3 coreColor = vec3(1.0, 0.95, 0.7);      // White-yellow
  vec3 midColor = vec3(1.0, 0.55, 0.1);         // Bright orange
  vec3 edgeColor = vec3(0.85, 0.15, 0.02);      // Deep red
  vec3 darkColor = vec3(0.4, 0.05, 0.0);        // Dark hot spots

  // Mix colors based on displacement
  vec3 color;
  if (intensity > 0.7) {
    color = mix(midColor, coreColor, (intensity - 0.7) / 0.3);
  } else if (intensity > 0.4) {
    color = mix(edgeColor, midColor, (intensity - 0.4) / 0.3);
  } else {
    color = mix(darkColor, edgeColor, intensity / 0.4);
  }

  // Pulsating brightness
  float pulse = sin(uTime * 2.0) * 0.08 + 1.0;
  color *= pulse;

  // Fresnel rim glow — edges brighter
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
  color += vec3(1.0, 0.6, 0.1) * fresnel * 0.8;

  // Emissive intensity for bloom
  float emissive = 1.5 + fresnel * 0.5;
  color *= emissive;

  gl_FragColor = vec4(color, 1.0);
}
