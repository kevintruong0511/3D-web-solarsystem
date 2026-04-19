// Vertex Shader v5 — Scroll-driven morph, brighter text visibility

uniform float uTime;
uniform float uSize;
uniform float uMorphProgress;
uniform vec2 uMouse;
uniform float uMouseInfluence;

attribute vec3 aTextPosition;
attribute float aSize;
attribute float aRandomness;
attribute vec3 aColor;

varying vec3 vColor;
varying float vAlpha;
varying float vMorph;

void main() {
    vColor = aColor;
    vMorph = uMorphProgress;

    // === MORPH ===
    vec3 pos = mix(position, aTextPosition, uMorphProgress);

    // === ROTATION — DỪNG hoàn toàn khi morph ===
    float rotStrength = 1.0 - uMorphProgress;
    float angle = uTime * 0.08 * rotStrength;
    if (rotStrength > 0.01) {
        float c = cos(angle);
        float s = sin(angle);
        pos.xz = mat2(c, -s, s, c) * pos.xz;
    }

    // === FACE TOWARD MOUSE khi morphed (3D parallax tilt) ===
    float faceStrength = uMorphProgress;
    if (faceStrength > 0.01) {
        // Xoay quanh trục Y — chuột sang phải = mặt text hướng phải
        float faceRotY = uMouse.x * 0.35 * faceStrength;
        float cy = cos(faceRotY);
        float sy = sin(faceRotY);
        pos.xz = mat2(cy, -sy, sy, cy) * pos.xz;

        // Xoay quanh trục X — chuột lên trên = mặt text hướng lên
        float faceRotX = uMouse.y * 0.25 * faceStrength;
        float cx = cos(faceRotX);
        float sx = sin(faceRotX);
        pos.yz = mat2(cx, -sx, sx, cx) * pos.yz;
    }

    // === MOUSE OFFSET khi random (không morphed) ===
    float mouseShift = uMouseInfluence * (1.0 - uMorphProgress);
    pos.x += uMouse.x * mouseShift * 2.5;
    pos.y += uMouse.y * mouseShift * 1.5;

    // === BREATHING khi morphed ===
    float breathe = sin(uTime * 1.2 + aRandomness * 4.0) * 0.08 * uMorphProgress;
    pos.y += breathe;

    // === FLOAT khi random ===
    float floatAmt = (1.0 - uMorphProgress) * 0.4;
    pos.y += sin(uTime * 0.4 + aRandomness * 6.28) * floatAmt;

    // === TRANSFORM ===
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // === SIZE ===
    // Nhỏ hơn khi morphed để text rõ, nhưng không quá nhỏ
    float morphSizeScale = mix(1.0, 0.45, uMorphProgress);
    gl_PointSize = uSize * aSize * morphSizeScale * (100.0 / -mvPos.z);
    gl_PointSize = max(gl_PointSize, 0.5);

    // === ALPHA ===
    float dist = length(pos);
    vAlpha = smoothstep(80.0, 5.0, dist) * 0.7 + 0.3;
    // Khi morphed: TĂNG alpha để chữ sáng rõ (thay vì giảm)
    vAlpha *= mix(1.0, 1.5, uMorphProgress);
    vAlpha = min(vAlpha, 1.0);
}
