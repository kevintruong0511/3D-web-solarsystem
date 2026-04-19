/**
 * interactions.js — v4: Scroll-Driven Morph + Mouse Reactivity
 */

import { galaxyUniforms } from './galaxy.js';
import { isMobile } from './scene.js';

const state = {
  mouse: { x: 0, y: 0 },
  targetMouse: { x: 0, y: 0 },
  mouseVelocity: 0,
  lastMousePos: { x: 0, y: 0 },
  mouseInfluence: 0,
  targetMouseInfluence: 0,
};

const LERP_SPEED = 0.08;         // Tăng tốc lerp cho responsive hơn
const VELOCITY_DECAY = 0.92;
const MAX_INFLUENCE = 1.2;

function initInteractions() {
  // === MOUSE MOVE ===
  window.addEventListener('mousemove', (e) => {
    state.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    state.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const dx = e.clientX - state.lastMousePos.x;
    const dy = e.clientY - state.lastMousePos.y;
    state.mouseVelocity = Math.sqrt(dx * dx + dy * dy);
    state.lastMousePos.x = e.clientX;
    state.lastMousePos.y = e.clientY;

    // Tăng influence mạnh hơn khi chuột di chuyển
    state.targetMouseInfluence = Math.min(state.mouseVelocity * 0.03, MAX_INFLUENCE);
  });

  // === TOUCH SUPPORT ===
  if (isMobile()) {
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        state.targetMouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        state.targetMouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        const dx = touch.clientX - state.lastMousePos.x;
        const dy = touch.clientY - state.lastMousePos.y;
        state.mouseVelocity = Math.sqrt(dx * dx + dy * dy);
        state.lastMousePos.x = touch.clientX;
        state.lastMousePos.y = touch.clientY;
        state.targetMouseInfluence = Math.min(state.mouseVelocity * 0.03, MAX_INFLUENCE);
      }
    }, { passive: true });

    initDeviceOrientation();
  }
}

function initDeviceOrientation() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    const req = () => {
      DeviceOrientationEvent.requestPermission()
        .then(r => { if (r === 'granted') addOrientationListener(); })
        .catch(() => {});
      window.removeEventListener('touchstart', req);
    };
    window.addEventListener('touchstart', req, { once: true });
  } else {
    addOrientationListener();
  }
}

function addOrientationListener() {
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma !== null && e.beta !== null) {
      state.targetMouse.x = e.gamma / 45;
      state.targetMouse.y = (e.beta - 45) / 45;
      state.targetMouseInfluence = 0.5;
    }
  });
}

function updateInteractions() {
  // Lerp mouse (faster = more responsive)
  state.mouse.x += (state.targetMouse.x - state.mouse.x) * LERP_SPEED;
  state.mouse.y += (state.targetMouse.y - state.mouse.y) * LERP_SPEED;

  // Velocity decay
  state.mouseVelocity *= VELOCITY_DECAY;
  state.mouseInfluence += (state.targetMouseInfluence - state.mouseInfluence) * 0.08;
  state.targetMouseInfluence *= 0.96;

  // Update uniforms
  galaxyUniforms.uMouse.value.set(state.mouse.x, state.mouse.y);
  galaxyUniforms.uMouseInfluence.value = state.mouseInfluence;
}

function getMouseVelocity() { return state.mouseVelocity; }

export { initInteractions, updateInteractions, getMouseVelocity };
