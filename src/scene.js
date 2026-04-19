/**
 * scene.js — v3: Performance Optimized
 */

import * as THREE from 'three';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 2, 35);
camera.lookAt(0, 0, 0);

const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: false,        // TẤT antialias → tăng FPS đáng kể
  powerPreference: 'high-performance'
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap 1.5 thay vì 2
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.setClearColor(0x000000, 1);

const resizeCallbacks = [];

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  resizeCallbacks.forEach(cb => cb(width, height));
}

window.addEventListener('resize', onResize);

function addResizeCallback(callback) {
  resizeCallbacks.push(callback);
}

function isMobile() {
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export { scene, camera, renderer, canvas, addResizeCallback, isMobile };
