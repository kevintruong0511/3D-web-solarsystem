// Atmosphere Fragment Shader — Fresnel glow effect
// Color is passed via uniform so it can be reused for different planets

uniform vec3 uAtmosphereColor;
uniform float uAtmosphereIntensity;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // View direction
  vec3 viewDir = normalize(-vPosition);
  
  // Fresnel effect — brighter at edges, transparent at center
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
  
  // Intensity falloff
  float alpha = fresnel * uAtmosphereIntensity;
  
  // Slight inner glow
  float innerGlow = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 1.5) * 0.15;
  
  vec3 color = uAtmosphereColor * (fresnel + innerGlow);
  
  gl_FragColor = vec4(color, alpha);
}
