/**
 * main.js — v3: Text Morphing + Performance
 */

import { scene, camera, renderer } from './scene.js';
import { createGalaxy, updateGalaxy, setGalaxyTheme } from './galaxy.js';
import { initInteractions, updateInteractions } from './interactions.js';
import { initPostProcessing, renderPostProcessing } from './postprocessing.js';
import { toggleAudio } from './audio.js';
import { initScroll, updateScrollCamera } from './scroll.js';
import { initTrail, updateTrail } from './trail.js';

import { Clock } from 'three';
const clock = new Clock();

// DOM
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const soundToggle = document.getElementById('sound-toggle');
const themeToggle = document.getElementById('theme-toggle');

// Theme
const THEMES = ['nebula', 'aurora', 'supernova'];
let currentThemeIndex = 0;

// ==========================================
// LOADING
// ==========================================

function simulateLoading() {
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 18 + 6;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        setTimeout(() => {
          loadingScreen.classList.add('loaded');
          resolve();
        }, 400);
      } else {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.floor(progress)}%`;
      }
    }, 100);
  });
}

// ==========================================
// SETUP
// ==========================================

function setupUI() {
  if (soundToggle) {
    soundToggle.addEventListener('click', () => toggleAudio());
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
      setGalaxyTheme(THEMES[currentThemeIndex]);
    });
  }
}

// ==========================================
// ANIMATION LOOP — Optimized
// ==========================================

function animate() {
  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  updateGalaxy(elapsedTime);
  updateInteractions();
  updateScrollCamera();
  updateTrail();
  renderPostProcessing();
}

// ==========================================
// INIT
// ==========================================

async function init() {
  const loadingDone = simulateLoading();

  createGalaxy();
  initPostProcessing();
  initInteractions();
  initScroll();
  initTrail();
  setupUI();

  await loadingDone;
  animate();

  console.log('🌌 KHANG — 3D Creative Space v3');
}

init();
