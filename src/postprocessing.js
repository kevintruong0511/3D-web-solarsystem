/**
 * postprocessing.js — v3: Lighter bloom for performance
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { scene, camera, renderer, addResizeCallback, isMobile } from './scene.js';

let composer = null;

const BLOOM_CONFIG = {
  strength: isMobile() ? 0.15 : 0.3,
  radius: 0.2,
  threshold: 0.85
};

function initPostProcessing() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Render ở resolution thấp hơn cho bloom → tăng FPS
  const scale = isMobile() ? 0.5 : 0.75;

  composer = new EffectComposer(renderer);
  composer.setSize(width * scale, height * scale);

  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width * scale, height * scale),
    BLOOM_CONFIG.strength,
    BLOOM_CONFIG.radius,
    BLOOM_CONFIG.threshold
  );
  composer.addPass(bloomPass);

  composer.addPass(new OutputPass());

  addResizeCallback((w, h) => {
    composer.setSize(w * scale, h * scale);
  });

  return composer;
}

function renderPostProcessing() {
  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function disposePostProcessing() {
  if (composer) { composer.dispose(); composer = null; }
}

export { initPostProcessing, renderPostProcessing, disposePostProcessing };
