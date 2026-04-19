/**
 * solar-main.js — Entry point for Solar System page (v2: Texture-Based Realistic)
 * 
 * Standalone page with:
 * - Realistic planets using NASA/Solar System Scope textures
 * - Earth with 4 layers: surface, normal, specular, clouds
 * - OrbitControls for interactive exploration
 * - Fresnel atmosphere shaders + Sun lava shader
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import sunVertexShader from './shaders/sunVertex.glsl';
import sunFragmentShader from './shaders/sunFragment.glsl';
import atmosphereVertexShader from './shaders/atmosphereVertex.glsl';
import atmosphereFragmentShader from './shaders/atmosphereFragment.glsl';

// ==========================================
// SCENE SETUP
// ==========================================

const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 25, 55);

const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x010104, 1);

// ==========================================
// ORBIT CONTROLS
// ==========================================

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI * 0.85;
controls.target.set(0, 0, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;

// ==========================================
// POST-PROCESSING
// ==========================================

const scale = isMobile ? 0.5 : 0.75;
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth * scale, window.innerHeight * scale);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth * scale, window.innerHeight * scale),
  isMobile ? 0.3 : 0.5,
  0.3,
  0.8
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ==========================================
// TEXTURE LOADER
// ==========================================

const textureLoader = new THREE.TextureLoader();
const TEX = (name) => {
  const texture = textureLoader.load(
    `/textures/${name}`,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      console.log(`✅ Texture loaded: ${name}`);
    },
    undefined,
    (err) => {
      console.error(`❌ Texture FAILED: ${name}`, err);
    }
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// ==========================================
// CONFIGURATION — Texture-Based
// ==========================================

const segs = isMobile ? 32 : 64; // Higher segments for texture quality

const PLANET_CONFIG = [
  {
    name: 'Mercury', radius: 0.25, distance: 6, speed: 1.6,
    rotationSpeed: 0.003, tilt: 0.03, segments: segs,
    texture: '2k_mercury.jpg',
    bumpMap: '2k_mercury.jpg', bumpScale: 0.02,
  },
  {
    name: 'Venus', radius: 0.55, distance: 9, speed: 1.15,
    rotationSpeed: -0.002, tilt: 0.05, segments: segs,
    texture: '2k_venus_atmosphere.jpg',
    atmosphere: { color: [1.0, 0.85, 0.4], intensity: 1.2, scale: 1.12 },
  },
  {
    name: 'Earth', radius: 0.6, distance: 13, speed: 0.8,
    rotationSpeed: 0.008, tilt: 0.41, segments: segs,
    texture: '2k_earth_daymap.jpg',
    normalMap: '2k_earth_normal_map.jpg',
    specularMap: '2k_earth_specular_map.jpg',
    cloudMap: '2k_earth_clouds.jpg',
    atmosphere: { color: [0.3, 0.6, 1.0], intensity: 1.5, scale: 1.18 },
    moon: { radius: 0.15, distance: 1.5, speed: 2.5, texture: '2k_moon.jpg' },
  },
  {
    name: 'Mars', radius: 0.4, distance: 17, speed: 0.55,
    rotationSpeed: 0.007, tilt: 0.44, segments: segs,
    texture: '2k_mars.jpg',
    bumpMap: '2k_mars.jpg', bumpScale: 0.03,
    atmosphere: { color: [1.0, 0.4, 0.2], intensity: 0.6, scale: 1.08 },
  },
  {
    name: 'Jupiter', radius: 1.6, distance: 24, speed: 0.3,
    rotationSpeed: 0.012, tilt: 0.05, segments: segs,
    texture: '2k_jupiter.jpg',
  },
  {
    name: 'Saturn', radius: 1.3, distance: 32, speed: 0.2,
    rotationSpeed: 0.01, tilt: 0.47, segments: segs,
    texture: '2k_saturn.jpg',
    atmosphere: { color: [0.9, 0.8, 0.5], intensity: 0.5, scale: 1.1 },
    ring: { inner: 1.7, outer: 2.8, texture: '2k_saturn_ring_alpha.png' },
  },
  {
    name: 'Uranus', radius: 0.85, distance: 40, speed: 0.12,
    rotationSpeed: -0.006, tilt: 1.71, segments: segs,
    texture: '2k_uranus.jpg',
    atmosphere: { color: [0.4, 0.8, 0.9], intensity: 0.8, scale: 1.1 },
  },
];

// ==========================================
// STATE
// ==========================================

const planetData = [];
let sunMesh = null;
let sunUniforms = null;
let asteroidBelt = null;
let starfield = null;
const cloudMeshes = []; // Track cloud layers for animation
const planetLabels = []; // Track label sprites for animation
const clock = new THREE.Clock();

// ==========================================
// SUN
// ==========================================

function createSun() {
  const group = new THREE.Group();

  sunUniforms = { uTime: { value: 0 } };

  const sunGeo = new THREE.SphereGeometry(3, isMobile ? 32 : 48, isMobile ? 32 : 48);
  const sunMat = new THREE.ShaderMaterial({
    vertexShader: sunVertexShader,
    fragmentShader: sunFragmentShader,
    uniforms: sunUniforms,
  });

  sunMesh = new THREE.Mesh(sunGeo, sunMat);
  group.add(sunMesh);

  // Inner corona
  const glowTex = createGlowTexture(256, [
    { stop: 0, color: 'rgba(255, 220, 100, 1)' },
    { stop: 0.15, color: 'rgba(255, 160, 30, 0.7)' },
    { stop: 0.4, color: 'rgba(255, 80, 0, 0.3)' },
    { stop: 1, color: 'rgba(255, 50, 0, 0)' },
  ]);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  corona.scale.set(14, 14, 1);
  group.add(corona);

  // Outer corona
  const outerTex = createGlowTexture(256, [
    { stop: 0, color: 'rgba(255, 180, 50, 0.4)' },
    { stop: 0.3, color: 'rgba(255, 100, 0, 0.15)' },
    { stop: 1, color: 'rgba(255, 50, 0, 0)' },
  ]);
  const outerCorona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: outerTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  outerCorona.scale.set(22, 22, 1);
  group.add(outerCorona);

  // Sun light — strong with linear decay so far planets get light too
  const sunLight = new THREE.PointLight(0xffeedd, 3.0, 200);
  sunLight.decay = 1; // Linear falloff instead of inverse-square
  group.add(sunLight);

  return group;
}

// ==========================================
// PLANETS — Texture-Based
// ==========================================

function createPlanet(config) {
  const data = { config, mesh: null, moonPivot: null };

  const geo = new THREE.SphereGeometry(config.radius, config.segments, config.segments);

  // ---- BUILD MATERIAL based on planet type ----
  let mat;

  if (config.name === 'Earth') {
    // Earth gets special treatment: Phong + normal + specular for ocean shine
    mat = new THREE.MeshPhongMaterial({
      map: TEX(config.texture),
      normalMap: TEX(config.normalMap),
      normalScale: new THREE.Vector2(3, 3),
      specularMap: TEX(config.specularMap),
      specular: new THREE.Color(0x444444),
      shininess: 25,
    });
  } else if (config.bumpMap) {
    // Planets with bump maps (Mercury, Mars)
    mat = new THREE.MeshPhongMaterial({
      map: TEX(config.texture),
      bumpMap: TEX(config.bumpMap),
      bumpScale: config.bumpScale || 0.02,
      shininess: 5,
    });
  } else {
    // Simple textured planets (Venus, Jupiter, Saturn, Uranus)
    mat = new THREE.MeshPhongMaterial({
      map: TEX(config.texture),
      shininess: 8,
    });
  }

  data.mesh = new THREE.Mesh(geo, mat);
  data.mesh.rotation.z = config.tilt || 0;
  data.mesh.position.x = config.distance;

  // ---- CLOUD LAYER (Earth only) ----
  if (config.cloudMap) {
    const cloudGeo = new THREE.SphereGeometry(
      config.radius * 1.015, // Slightly larger than planet
      config.segments,
      config.segments
    );
    const cloudMat = new THREE.MeshPhongMaterial({
      map: TEX(config.cloudMap),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    data.mesh.add(clouds);
    cloudMeshes.push(clouds);
  }

  // ---- ATMOSPHERE (Fresnel shader) ----
  if (config.atmosphere) {
    const atmoGeo = new THREE.SphereGeometry(
      config.radius * config.atmosphere.scale,
      config.segments,
      config.segments
    );
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uAtmosphereColor: { value: new THREE.Vector3(...config.atmosphere.color) },
        uAtmosphereIntensity: { value: config.atmosphere.intensity },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    data.mesh.add(new THREE.Mesh(atmoGeo, atmoMat));
  }

  // ---- SATURN RING (texture-based) ----
  if (config.ring) {
    const ringGeo = new THREE.RingGeometry(config.ring.inner, config.ring.outer, 128, 3);

    // Fix UV mapping for ring so texture maps radially
    const uvs = ringGeo.attributes.uv;
    const positions = ringGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const t = (dist - config.ring.inner) / (config.ring.outer - config.ring.inner);
      uvs.setXY(i, t, 0.5);
    }

    let ringMat;
    if (config.ring.texture) {
      const ringTex = TEX(config.ring.texture);
      ringMat = new THREE.MeshBasicMaterial({
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
    } else {
      // Fallback: vertex colors
      const colors = [];
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i);
        const dist = Math.sqrt(x * x + y * y);
        const t = (dist - config.ring.inner) / (config.ring.outer - config.ring.inner);
        colors.push(0.85 - t * 0.25, 0.72 - t * 0.2, 0.55 - t * 0.25);
      }
      ringGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      ringMat = new THREE.MeshBasicMaterial({
        vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.65,
      });
    }

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2.2;
    data.mesh.add(ring);
  }

  // ---- MOON (texture-based) ----
  if (config.moon) {
    data.moonPivot = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(config.moon.radius, 32, 32);
    const moonMat = config.moon.texture
      ? new THREE.MeshPhongMaterial({
          map: TEX(config.moon.texture),
          bumpMap: TEX(config.moon.texture),
          bumpScale: 0.01,
          shininess: 3,
        })
      : new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });

    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.x = config.moon.distance;
    data.moonPivot.add(moon);
    data.mesh.add(data.moonPivot);
  }

  // ---- PLANET LABEL ----
  const label = createTextSprite(config.name);
  label.position.y = -(config.radius + 0.4); // Below the planet
  data.mesh.add(label);

  // ---- ORBIT LINE ----
  const orbitPoints = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    orbitPoints.push(new THREE.Vector3(
      Math.cos(a) * config.distance, 0, Math.sin(a) * config.distance
    ));
  }
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(orbitPoints),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 })
  ));

  scene.add(data.mesh);
  return data;
}

// ==========================================
// ASTEROID BELT — Subtle particles instead of black chunks
// ==========================================

function createAsteroidBelt() {
  const count = isMobile ? 200 : 500;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 19.5 + Math.random() * 3;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    sizes[i] = 0.03 + Math.random() * 0.08;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  asteroidBelt = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x998877,
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  }));
  scene.add(asteroidBelt);
}

// ==========================================
// STARFIELD
// ==========================================

function createStarfield() {
  const count = isMobile ? 500 : 1500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 80 + Math.random() * 80;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starfield = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.15, sizeAttenuation: true,
    transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(starfield);
}

// ==========================================
// HELPERS
// ==========================================

function createGlowTexture(size, stops) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  stops.forEach(s => gradient.addColorStop(s.stop, s.color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// ==========================================
// TEXT LABEL SPRITES — High-res English labels
// ==========================================

function createTextSprite(name) {
  const scale = 2; // Retina-quality multiplier
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = 72 * scale;
  canvas.width = 1024 * scale;
  canvas.height = 192 * scale;

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Text style — crisp, bold
  ctx.font = `700 ${fontSize}px "Inter", "SF Pro Display", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12 * scale;
  ctx.shadowOffsetY = 3 * scale;

  // Draw text — bright white
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    sizeAttenuation: true,
  }));

  // Scale sprite proportionally
  const aspect = canvas.width / canvas.height;
  const spriteScale = 0.8;
  sprite.scale.set(spriteScale * aspect, spriteScale, 1);

  return sprite;
}

// ==========================================
// LOADING
// ==========================================

const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

function simulateLoading() {
  return new Promise(resolve => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        setTimeout(() => { loadingScreen.classList.add('loaded'); resolve(); }, 400);
      } else {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.floor(progress)}%`;
      }
    }, 120);
  });
}

// ==========================================
// RESIZE
// ==========================================

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w * scale, h * scale);
});

// ==========================================
// ANIMATION LOOP
// ==========================================

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // Sun
  if (sunUniforms) sunUniforms.uTime.value = elapsed;
  if (sunMesh) sunMesh.rotation.y = elapsed * 0.05;

  // Planets
  planetData.forEach(({ mesh, config, moonPivot }) => {
    const angle = elapsed * config.speed * 0.3;
    mesh.position.x = Math.cos(angle) * config.distance;
    mesh.position.z = Math.sin(angle) * config.distance;
    mesh.rotation.y += config.rotationSpeed;
    if (moonPivot) moonPivot.rotation.y = elapsed * config.moon.speed;
  });

  // Cloud layers rotate independently (slightly faster than Earth)
  cloudMeshes.forEach(cloud => {
    cloud.rotation.y += 0.0012;
  });

  // Asteroid belt
  if (asteroidBelt) asteroidBelt.rotation.y = elapsed * 0.02;

  // Starfield
  if (starfield) {
    starfield.rotation.y = elapsed * 0.003;
    starfield.rotation.x = Math.sin(elapsed * 0.002) * 0.01;
  }

  controls.update();
  composer.render();
}

// ==========================================
// INIT
// ==========================================

async function init() {
  const loadingDone = simulateLoading();

  // Ambient light — bright enough to show texture detail on dark sides
  scene.add(new THREE.AmbientLight(0x555566, 0.8));

  // Create everything
  const sun = createSun();
  scene.add(sun);

  PLANET_CONFIG.forEach(config => {
    planetData.push(createPlanet(config));
  });

  createAsteroidBelt();
  createStarfield();

  await loadingDone;

  // ---- PLANET PANEL (slide-in overlay) ----
  const panel = document.getElementById('planet-panel');
  const backdrop = document.getElementById('planet-panel-backdrop');
  const exploreBtn = document.getElementById('explore-btn');
  const closeBtn = document.getElementById('panel-close');
  const panelScroll = panel ? panel.querySelector('.panel-scroll') : null;

  function openPanel() {
    if (!panel || !backdrop) return;
    panel.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    // Reset scroll to top
    if (panelScroll) panelScroll.scrollTop = 0;
    // Trigger section reveal animations
    setTimeout(() => {
      panel.querySelectorAll('.planet-section').forEach((s, i) => {
        setTimeout(() => s.classList.add('visible'), i * 100);
      });
    }, 300);
  }

  function closePanel() {
    if (!panel || !backdrop) return;
    panel.classList.add('hidden');
    backdrop.classList.add('hidden');
    // Reset visible state
    panel.querySelectorAll('.planet-section').forEach(s => {
      s.classList.remove('visible');
    });
  }

  if (exploreBtn) exploreBtn.addEventListener('click', openPanel);
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  if (backdrop) backdrop.addEventListener('click', closePanel);

  // Close panel with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  animate();

  console.log('☀️ Solar System v2 — Texture-Based Realistic');
}

init();
