/**
 * solarSystem.js — Premium 3D Solar System
 * 
 * Features:
 * - Sun with animated lava shader + corona glow
 * - 8 planets with real 2K texture maps
 * - Atmosphere glow (Fresnel) for Earth, Venus, Mars
 * - Saturn rings with texture
 * - Moon orbiting Earth with texture
 * - Earth cloud layer
 * - Asteroid belt (InstancedMesh)
 * - Starfield background
 * - Orbit lines
 */

import * as THREE from 'three';
import { scene, isMobile } from './scene.js';
import sunVertexShader from './shaders/sunVertex.glsl';
import sunFragmentShader from './shaders/sunFragment.glsl';
import atmosphereVertexShader from './shaders/atmosphereVertex.glsl';
import atmosphereFragmentShader from './shaders/atmosphereFragment.glsl';

// ==========================================
// TEXTURE LOADER
// ==========================================

const textureLoader = new THREE.TextureLoader();

function loadTexture(path) {
  const tex = textureLoader.load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ==========================================
// CONFIGURATION
// ==========================================

const SOLAR_POSITION = new THREE.Vector3(0, 0, -80); // Behind galaxy

const PLANET_CONFIG = [
  {
    name: 'Mercury',
    radius: 0.25,
    distance: 6,
    speed: 1.6,
    rotationSpeed: 0.003,
    color: 0x8c7e6d,
    texture: '/textures/2k_mercury.jpg',
    tilt: 0.03,
    segments: isMobile() ? 24 : 32,
  },
  {
    name: 'Venus',
    radius: 0.55,
    distance: 9,
    speed: 1.15,
    rotationSpeed: -0.002, // Retrograde
    color: 0xe8c275,
    texture: '/textures/2k_venus_atmosphere.jpg',
    tilt: 0.05,
    segments: isMobile() ? 24 : 32,
    atmosphere: { color: [1.0, 0.85, 0.4], intensity: 1.2, scale: 1.12 },
  },
  {
    name: 'Earth',
    radius: 0.6,
    distance: 13,
    speed: 0.8,
    rotationSpeed: 0.008,
    color: 0x2b6cb0,
    texture: '/textures/2k_earth_daymap.jpg',
    normalMap: '/textures/2k_earth_normal_map.jpg',
    specularMap: '/textures/2k_earth_specular_map.jpg',
    cloudsTexture: '/textures/2k_earth_clouds.jpg',
    tilt: 0.41,
    segments: isMobile() ? 24 : 48,
    atmosphere: { color: [0.3, 0.6, 1.0], intensity: 1.5, scale: 1.15 },
    moon: {
      radius: 0.15,
      distance: 1.3,
      speed: 2.5,
      color: 0xaaaaaa,
      texture: '/textures/2k_moon.jpg',
    },
  },
  {
    name: 'Mars',
    radius: 0.4,
    distance: 17,
    speed: 0.55,
    rotationSpeed: 0.007,
    color: 0xc1440e,
    texture: '/textures/2k_mars.jpg',
    tilt: 0.44,
    segments: isMobile() ? 24 : 32,
    atmosphere: { color: [1.0, 0.4, 0.2], intensity: 0.6, scale: 1.08 },
  },
  {
    name: 'Jupiter',
    radius: 1.6,
    distance: 24,
    speed: 0.3,
    rotationSpeed: 0.012,
    color: 0xd4a574,
    texture: '/textures/2k_jupiter.jpg',
    tilt: 0.05,
    segments: isMobile() ? 24 : 48,
  },
  {
    name: 'Saturn',
    radius: 1.3,
    distance: 32,
    speed: 0.2,
    rotationSpeed: 0.01,
    color: 0xead6b8,
    texture: '/textures/2k_saturn.jpg',
    tilt: 0.47,
    segments: isMobile() ? 24 : 48,
    atmosphere: { color: [0.9, 0.8, 0.5], intensity: 0.5, scale: 1.1 },
    ring: { inner: 1.7, outer: 2.8, texture: '/textures/2k_saturn_ring_alpha.png' },
  },
  {
    name: 'Uranus',
    radius: 0.85,
    distance: 40,
    speed: 0.12,
    rotationSpeed: -0.006,
    color: 0x7ec8e3,
    texture: '/textures/2k_uranus.jpg',
    tilt: 1.71, // Almost sideways!
    segments: isMobile() ? 24 : 32,
    atmosphere: { color: [0.4, 0.8, 0.9], intensity: 0.8, scale: 1.1 },
  },
];

// ==========================================
// STATE
// ==========================================

let solarGroup = null;
const planetData = [];
let sunMesh = null;
let sunUniforms = null;
let asteroidBelt = null;
let starfield = null;

// ==========================================
// SUN — Custom Shader
// ==========================================

function createSun() {
  const group = new THREE.Group();

  // Main sun sphere with lava shader
  sunUniforms = {
    uTime: { value: 0 },
  };

  const sunGeo = new THREE.SphereGeometry(3, isMobile() ? 32 : 48, isMobile() ? 32 : 48);
  const sunMat = new THREE.ShaderMaterial({
    vertexShader: sunVertexShader,
    fragmentShader: sunFragmentShader,
    uniforms: sunUniforms,
  });

  sunMesh = new THREE.Mesh(sunGeo, sunMat);
  group.add(sunMesh);

  // Corona glow sprite
  const glowTexture = createGlowTexture(256, [
    { stop: 0, color: 'rgba(255, 220, 100, 1)' },
    { stop: 0.15, color: 'rgba(255, 160, 30, 0.7)' },
    { stop: 0.4, color: 'rgba(255, 80, 0, 0.3)' },
    { stop: 1, color: 'rgba(255, 50, 0, 0)' },
  ]);

  const coronaMat = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const corona = new THREE.Sprite(coronaMat);
  corona.scale.set(14, 14, 1);
  group.add(corona);

  // Second larger, softer corona
  const outerGlowTexture = createGlowTexture(256, [
    { stop: 0, color: 'rgba(255, 180, 50, 0.4)' },
    { stop: 0.3, color: 'rgba(255, 100, 0, 0.15)' },
    { stop: 1, color: 'rgba(255, 50, 0, 0)' },
  ]);

  const outerCorona = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: outerGlowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  outerCorona.scale.set(22, 22, 1);
  group.add(outerCorona);

  // Point light from sun
  const sunLight = new THREE.PointLight(0xffeedd, 2.5, 120);
  sunLight.position.set(0, 0, 0);
  group.add(sunLight);

  return group;
}

// ==========================================
// PLANETS — Now with real textures
// ==========================================

function createPlanet(config) {
  const data = {
    config,
    orbitGroup: new THREE.Group(), // Pivot for orbit
    mesh: null,
    atmosphere: null,
    moon: null,
    moonPivot: null,
    ring: null,
    clouds: null,
  };

  // Planet sphere
  const geo = new THREE.SphereGeometry(config.radius, config.segments, config.segments);
  let mat;

  if (config.texture) {
    // Use real texture map
    const texture = loadTexture(config.texture);

    const matOptions = {
      map: texture,
      metalness: 0.05,
      roughness: 0.8,
    };

    // Earth: normal map for terrain relief
    if (config.normalMap) {
      const normalTex = textureLoader.load(config.normalMap);
      matOptions.normalMap = normalTex;
      matOptions.normalScale = new THREE.Vector2(0.8, 0.8);
    }

    // Earth: specular map for ocean reflections
    if (config.specularMap) {
      const specTex = textureLoader.load(config.specularMap);
      matOptions.metalnessMap = specTex;
      matOptions.metalness = 0.15;
      matOptions.roughness = 0.65;
    }

    mat = new THREE.MeshStandardMaterial(matOptions);
  } else {
    // Fallback to solid color
    mat = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.08,
      roughness: 0.8,
    });
  }

  data.mesh = new THREE.Mesh(geo, mat);
  data.mesh.rotation.z = config.tilt || 0;
  data.orbitGroup.add(data.mesh);

  // Earth cloud layer
  if (config.cloudsTexture) {
    const cloudsTex = loadTexture(config.cloudsTexture);
    const cloudsGeo = new THREE.SphereGeometry(
      config.radius * 1.015,
      config.segments,
      config.segments
    );
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    data.clouds = new THREE.Mesh(cloudsGeo, cloudsMat);
    data.mesh.add(data.clouds);
  }

  // Atmosphere
  if (config.atmosphere) {
    data.atmosphere = createAtmosphere(config);
    data.mesh.add(data.atmosphere);
  }

  // Ring (Saturn)
  if (config.ring) {
    data.ring = createRing(config);
    data.mesh.add(data.ring);
  }

  // Moon
  if (config.moon) {
    data.moonPivot = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(config.moon.radius, 16, 16);
    let moonMat;

    if (config.moon.texture) {
      const moonTex = loadTexture(config.moon.texture);
      moonMat = new THREE.MeshStandardMaterial({
        map: moonTex,
        metalness: 0.0,
        roughness: 0.9,
      });
    } else {
      moonMat = new THREE.MeshStandardMaterial({
        color: config.moon.color,
        metalness: 0.0,
        roughness: 0.9,
      });
    }

    data.moon = new THREE.Mesh(moonGeo, moonMat);
    data.moon.position.x = config.moon.distance;
    data.moonPivot.add(data.moon);
    data.mesh.add(data.moonPivot);
  }

  // Set initial position on orbit
  data.mesh.position.x = config.distance;

  // Orbit line
  const orbitLine = createOrbitLine(config.distance);
  solarGroup.add(orbitLine);

  solarGroup.add(data.orbitGroup);
  return data;
}

// ==========================================
// ATMOSPHERE — Fresnel Shader
// ==========================================

function createAtmosphere(config) {
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

  return new THREE.Mesh(atmoGeo, atmoMat);
}

// ==========================================
// SATURN RING — With texture
// ==========================================

function createRing(config) {
  const ringGeo = new THREE.RingGeometry(config.ring.inner, config.ring.outer, 96, 3);

  // Fix UVs for RingGeometry so texture maps correctly (radial)
  const pos = ringGeo.attributes.position;
  const uv = ringGeo.attributes.uv;
  const innerR = config.ring.inner;
  const outerR = config.ring.outer;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    // Map UV.x from inner to outer radius (0→1)
    const t = (dist - innerR) / (outerR - innerR);
    uv.setXY(i, t, uv.getY(i));
  }

  let ringMat;

  if (config.ring.texture) {
    const ringTex = textureLoader.load(config.ring.texture);
    ringTex.colorSpace = THREE.SRGBColorSpace;

    ringMat = new THREE.MeshBasicMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
  } else {
    // Fallback: procedural gradient ring
    const colors = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const t = (dist - innerR) / (outerR - innerR);
      const r = 0.85 - t * 0.25;
      const g = 0.72 - t * 0.2;
      const b = 0.55 - t * 0.25;
      colors.push(r, g, b);
    }
    ringGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    ringMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
  }

  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2.2;
  return ring;
}

// ==========================================
// ORBIT LINES
// ==========================================

function createOrbitLine(distance) {
  const points = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    ));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.06,
  });

  return new THREE.Line(geo, mat);
}

// ==========================================
// ASTEROID BELT
// ==========================================

function createAsteroidBelt() {
  const count = isMobile() ? 100 : 250;
  const geo = new THREE.IcosahedronGeometry(0.08, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.3,
    roughness: 0.9,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();

  const beltInner = 19.5; // Between Mars (17) and Jupiter (24)
  const beltOuter = 22.5;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = beltInner + Math.random() * (beltOuter - beltInner);
    const y = (Math.random() - 0.5) * 1.0;

    dummy.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );

    // Random rotation
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Random scale
    const scale = 0.5 + Math.random() * 1.5;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  asteroidBelt = { mesh, count, beltInner, beltOuter };
  return mesh;
}

// ==========================================
// STARFIELD
// ==========================================

function createStarfield() {
  const count = isMobile() ? 500 : 1200;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // Distribute stars in a large sphere around solar system
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 60 + Math.random() * 60;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    sizes[i] = Math.random() * 2.0 + 0.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  starfield = new THREE.Points(geo, mat);
  return starfield;
}

// ==========================================
// CANVAS GLOW TEXTURE
// ==========================================

function createGlowTexture(size, stops) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);

  stops.forEach(s => gradient.addColorStop(s.stop, s.color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// ==========================================
// CREATE SOLAR SYSTEM
// ==========================================

function createSolarSystem() {
  solarGroup = new THREE.Group();
  solarGroup.position.copy(SOLAR_POSITION);

  // Ambient light for planets
  const ambientLight = new THREE.AmbientLight(0x404040, 0.25);
  solarGroup.add(ambientLight);

  // Sun
  const sun = createSun();
  solarGroup.add(sun);

  // Planets
  PLANET_CONFIG.forEach(config => {
    const data = createPlanet(config);
    planetData.push(data);
  });

  // Asteroid belt
  const belt = createAsteroidBelt();
  solarGroup.add(belt);

  // Starfield
  const stars = createStarfield();
  solarGroup.add(stars);

  scene.add(solarGroup);
  console.log('☀️ Solar System created — Premium Mode with 2K Textures');
}

// ==========================================
// UPDATE — Animation Loop
// ==========================================

function updateSolarSystem(elapsedTime) {
  if (!solarGroup) return;

  // Sun shader animation
  if (sunUniforms) {
    sunUniforms.uTime.value = elapsedTime;
  }

  // Sun slow rotation
  if (sunMesh) {
    sunMesh.rotation.y = elapsedTime * 0.05;
  }

  // Planets
  planetData.forEach(({ mesh, config, moonPivot, clouds }) => {
    // Orbital motion
    const angle = elapsedTime * config.speed * 0.3; // Scale down for smoother orbits
    mesh.position.x = Math.cos(angle) * config.distance;
    mesh.position.z = Math.sin(angle) * config.distance;

    // Self rotation
    mesh.rotation.y += config.rotationSpeed;

    // Cloud layer rotation (slightly faster than planet for visual effect)
    if (clouds) {
      clouds.rotation.y += config.rotationSpeed * 1.3;
    }

    // Moon orbit
    if (moonPivot) {
      moonPivot.rotation.y = elapsedTime * config.moon.speed;
    }
  });

  // Asteroid belt slow rotation
  if (asteroidBelt) {
    asteroidBelt.mesh.rotation.y = elapsedTime * 0.02;
  }

  // Starfield very slow rotation for parallax feel
  if (starfield) {
    starfield.rotation.y = elapsedTime * 0.005;
    starfield.rotation.x = Math.sin(elapsedTime * 0.003) * 0.02;
  }
}

// ==========================================
// VISIBILITY CONTROL (for scroll)
// ==========================================

function setSolarSystemVisible(visible) {
  if (solarGroup) {
    solarGroup.visible = visible;
  }
}

// ==========================================
// DISPOSE
// ==========================================

function disposeSolarSystem() {
  if (solarGroup) {
    solarGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        if (child.material.normalMap) child.material.normalMap.dispose();
        if (child.material.metalnessMap) child.material.metalnessMap.dispose();
        child.material.dispose();
      }
    });
    scene.remove(solarGroup);
    solarGroup = null;
    planetData.length = 0;
    sunMesh = null;
    sunUniforms = null;
    asteroidBelt = null;
    starfield = null;
  }
}

export {
  createSolarSystem,
  updateSolarSystem,
  disposeSolarSystem,
  setSolarSystemVisible,
};
