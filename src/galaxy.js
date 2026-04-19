/**
 * galaxy.js — v4: Fixed Text Morphing
 * 
 * Fixes:
 * - document.fonts.ready trước khi sample text
 * - Jitter text positions để không overlap trắng
 * - Alpha giảm khi morph (additive blending)
 */

import * as THREE from 'three';
import { scene, isMobile } from './scene.js';
import galaxyVertexShader from './shaders/galaxyVertex.glsl';
import galaxyFragmentShader from './shaders/galaxyFragment.glsl';

const CONFIG = {
  particleCount: isMobile() ? 1200 : 2500,
  spreadRadius: 55,
  size: isMobile() ? 3.0 : 4.0,
  textScale: isMobile() ? 0.05 : 0.065,
  textJitter: 0.4,  // Less jitter = clearer letter shapes
};

const THEMES = {
  nebula: {
    inside: new THREE.Color('#ff6b9d'),
    outside: new THREE.Color('#6366f1'),
  },
  aurora: {
    inside: new THREE.Color('#34d399'),
    outside: new THREE.Color('#06b6d4'),
  },
  supernova: {
    inside: new THREE.Color('#fbbf24'),
    outside: new THREE.Color('#ef4444'),
  }
};

let currentTheme = 'nebula';

const galaxyUniforms = {
  uTime: { value: 0 },
  uSize: { value: CONFIG.size },
  uMorphProgress: { value: 0 },
  uMouse: { value: new THREE.Vector2(0, 0) },
  uMouseInfluence: { value: 0 },
};

let galaxyPoints = null;
let colorsAttribute = null;
let morphTarget = 0;
let morphCurrent = 0;

/**
 * Sample text positions — dùng system font để đảm bảo luôn hoạt động
 */
function sampleTextPositions(text, count) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const W = 1024;
  const H = 256;
  canvas.width = W;
  canvas.height = H;

  // Dùng system font bold — luôn available, fallback an toàn
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 160px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2);

  const imageData = ctx.getImageData(0, 0, W, H);
  const pixels = [];

  // Step 3 cho density vừa phải
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const alpha = imageData.data[(y * W + x) * 4 + 3];
      if (alpha > 100) {
        pixels.push({
          x: (x - W / 2) * CONFIG.textScale,
          y: (H / 2 - y) * CONFIG.textScale,
        });
      }
    }
  }

  console.log(`Text sampling: found ${pixels.length} valid pixels for "${text}"`);

  if (pixels.length === 0) {
    // Fallback: tạo grid đơn giản nếu text sample thất bại
    console.warn('Text sampling failed, using fallback grid');
    for (let i = 0; i < count; i++) {
      pixels.push({ x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 8 });
    }
  }

  const positions = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pixels.length);
    const p = pixels[idx];
    positions.push({
      x: p.x + (Math.random() - 0.5) * CONFIG.textJitter,
      y: p.y + (Math.random() - 0.5) * CONFIG.textJitter,
      z: (Math.random() - 0.5) * 1.5,
    });
  }

  return positions;
}

function createGalaxy() {
  if (galaxyPoints) {
    galaxyPoints.geometry.dispose();
    galaxyPoints.material.dispose();
    scene.remove(galaxyPoints);
  }

  const count = CONFIG.particleCount;
  const theme = THEMES[currentTheme];
  const textPositions = sampleTextPositions('KHANG', count);

  const positions = new Float32Array(count * 3);
  const textPosAttr = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const randomness = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // Random start positions (spherical distribution)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.6) * CONFIG.spreadRadius;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.35;
    positions[i3 + 2] = r * Math.cos(phi);

    // Text target positions
    textPosAttr[i3] = textPositions[i].x;
    textPosAttr[i3 + 1] = textPositions[i].y;
    textPosAttr[i3 + 2] = textPositions[i].z;

    // Colors
    const distFromCenter = Math.sqrt(positions[i3] ** 2 + positions[i3 + 2] ** 2);
    const colorMix = Math.min(distFromCenter / CONFIG.spreadRadius, 1.0);
    const mixedColor = theme.inside.clone().lerp(theme.outside, colorMix);
    colors[i3] = mixedColor.r + (Math.random() - 0.5) * 0.08;
    colors[i3 + 1] = mixedColor.g + (Math.random() - 0.5) * 0.08;
    colors[i3 + 2] = mixedColor.b + (Math.random() - 0.5) * 0.08;

    sizes[i] = Math.random() * 0.5 + 0.5;
    randomness[i] = Math.random() * 2.0 - 1.0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aTextPosition', new THREE.BufferAttribute(textPosAttr, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 1));

  colorsAttribute = geometry.getAttribute('aColor');

  const material = new THREE.ShaderMaterial({
    vertexShader: galaxyVertexShader,
    fragmentShader: galaxyFragmentShader,
    uniforms: galaxyUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  galaxyPoints = new THREE.Points(geometry, material);
  scene.add(galaxyPoints);
  return galaxyPoints;
}

/**
 * Set morph target externally (scroll-driven)
 * @param {number} value - 0.0 (galaxy) to 1.0 (text)
 */
function setMorphTarget(value) {
  morphTarget = Math.max(0, Math.min(1, value));
}

function getMorphProgress() {
  return morphCurrent;
}

function setGalaxyTheme(themeName) {
  if (!THEMES[themeName] || !colorsAttribute || !galaxyPoints) return;
  currentTheme = themeName;
  const theme = THEMES[themeName];
  const count = CONFIG.particleCount;
  const colors = colorsAttribute.array;
  const posArray = galaxyPoints.geometry.getAttribute('position').array;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = posArray[i3], z = posArray[i3 + 2];
    const dist = Math.sqrt(x * x + z * z);
    const mix = Math.min(dist / CONFIG.spreadRadius, 1.0);
    const c = theme.inside.clone().lerp(theme.outside, mix);
    colors[i3] = c.r + (Math.random() - 0.5) * 0.06;
    colors[i3 + 1] = c.g + (Math.random() - 0.5) * 0.06;
    colors[i3 + 2] = c.b + (Math.random() - 0.5) * 0.06;
  }
  colorsAttribute.needsUpdate = true;
}

function updateGalaxy(elapsedTime) {
  galaxyUniforms.uTime.value = elapsedTime;

  // Morph lerp — tốc độ nhanh hơn
  morphCurrent += (morphTarget - morphCurrent) * 0.08;
  galaxyUniforms.uMorphProgress.value = morphCurrent;
}

function getIsMorphed() { return morphCurrent > 0.5; }

function disposeGalaxy() {
  if (galaxyPoints) {
    galaxyPoints.geometry.dispose();
    galaxyPoints.material.dispose();
    scene.remove(galaxyPoints);
    galaxyPoints = null;
  }
}

export { createGalaxy, updateGalaxy, disposeGalaxy, galaxyUniforms,
         setGalaxyTheme, setMorphTarget, getMorphProgress, getIsMorphed, CONFIG };
