/**
 * scroll.js — Scroll Manager v2
 * 
 * Quản lý scroll-driven experience:
 * - Theo dõi scroll position → cập nhật camera
 * - Scroll-driven morph: particles → "KHANG" text ở hero section
 * - IntersectionObserver → text reveal animations
 * - Navigation dots sync
 * - Section-based triggers
 */

import { camera } from './scene.js';
import { galaxyUniforms, setMorphTarget } from './galaxy.js';

// === CẤU HÌNH CAMERA theo section ===
// Camera bắt đầu ở z=35 (scene.js), keyframes tạo parallax nhẹ
const CAMERA_KEYFRAMES = [
  { x: 0,  y: 2,  z: 35, rotX: 0, rotY: 0 },        // Section 0: Hero — front-on cho text
  { x: -5, y: 4,  z: 38, rotX: -0.03, rotY: 0.08 },  // Section 1: About — xoay trái nhẹ
  { x: 3,  y: 8,  z: 42, rotX: -0.08, rotY: -0.05 }, // Section 2: Tech — nhìn từ trên
  { x: 0,  y: 3,  z: 32, rotX: 0, rotY: 0 },          // Section 3: Features — zoom in nhẹ
  { x: 0,  y: 10, z: 50, rotX: -0.1, rotY: 0 },       // Section 4: Footer — zoom out
];

// === STATE ===
let scrollContainer = null;
let sections = [];
let navDots = [];
let currentSection = 0;
let scrollProgress = 0;
let targetCameraPos = { x: 0, y: 2, z: 35 };
let targetCameraRot = { x: 0, y: 0 };

/**
 * Khởi tạo Scroll Manager
 */
function initScroll() {
  scrollContainer = document.getElementById('scroll-container');
  sections = document.querySelectorAll('.scroll-section');
  navDots = document.querySelectorAll('.nav-dot');

  if (!scrollContainer) return;

  // === SCROLL EVENT ===
  scrollContainer.addEventListener('scroll', onScroll, { passive: true });

  // === INTERSECTION OBSERVER cho text reveal ===
  setupRevealObserver();

  // === NAV DOTS click ===
  navDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const targetIndex = parseInt(dot.dataset.target);
      scrollToSection(targetIndex);
    });
  });

  // Trigger initial reveal cho section đầu tiên
  // Morph ngay khi bắt đầu ở hero section
  setTimeout(() => {
    revealSection(0);
    setMorphTarget(1.0); // Bắt đầu ở hero → morph thành chữ KHANG
  }, 100);
}

/**
 * Xử lý scroll event
 */
function onScroll() {
  const scrollTop = scrollContainer.scrollTop;
  const containerHeight = scrollContainer.clientHeight;
  const totalScrollable = scrollContainer.scrollHeight - containerHeight;

  // Tổng progress (0 → 1)
  scrollProgress = totalScrollable > 0 ? scrollTop / totalScrollable : 0;

  // Tìm section hiện tại
  const sectionIndex = Math.round(scrollTop / containerHeight);
  const clampedIndex = Math.max(0, Math.min(sectionIndex, sections.length - 1));

  if (clampedIndex !== currentSection) {
    currentSection = clampedIndex;
    updateNavDots(currentSection);
  }

  // === SCROLL-DRIVEN MORPH ===
  // Tính morph progress dựa trên vị trí scroll trong hero section
  // Khi ở hero (scrollTop = 0): morph = 1.0 (chữ KHANG)
  // Khi cuộn qua hero: morph giảm dần về 0 (galaxy)
  const heroScrollRatio = scrollTop / containerHeight;
  
  if (heroScrollRatio <= 0.15) {
    // Đang ở hero section → morph thành chữ KHANG
    setMorphTarget(1.0);
  } else if (heroScrollRatio < 0.8) {
    // Đang chuyển tiếp → unmorph dần
    const fadeOut = 1.0 - ((heroScrollRatio - 0.15) / 0.65);
    setMorphTarget(Math.max(0, fadeOut));
  } else {
    // Đã rời hero → galaxy mode
    setMorphTarget(0.0);
  }

  // === CẬP NHẬT CAMERA POSITION theo scroll ===
  updateCameraFromScroll(scrollTop, containerHeight);
}

/**
 * Cập nhật camera position dựa trên scroll — interpolation giữa keyframes
 */
function updateCameraFromScroll(scrollTop, containerHeight) {
  // Tính fractional section position (ví dụ: 1.5 = giữa section 1 và 2)
  const fractional = scrollTop / containerHeight;
  const floorIndex = Math.floor(fractional);
  const fraction = fractional - floorIndex;

  // Clamp indexes
  const fromIndex = Math.max(0, Math.min(floorIndex, CAMERA_KEYFRAMES.length - 1));
  const toIndex = Math.max(0, Math.min(floorIndex + 1, CAMERA_KEYFRAMES.length - 1));

  const from = CAMERA_KEYFRAMES[fromIndex];
  const to = CAMERA_KEYFRAMES[toIndex];

  // Smooth easing
  const t = easeInOutCubic(fraction);

  // Interpolate
  targetCameraPos.x = from.x + (to.x - from.x) * t;
  targetCameraPos.y = from.y + (to.y - from.y) * t;
  targetCameraPos.z = from.z + (to.z - from.z) * t;
  targetCameraRot.x = from.rotX + (to.rotX - from.rotX) * t;
  targetCameraRot.y = from.rotY + (to.rotY - from.rotY) * t;
}

/**
 * Cập nhật camera mỗi frame (lerp mượt)
 */
function updateScrollCamera() {
  const lerp = 0.04;

  camera.position.x += (targetCameraPos.x - camera.position.x) * lerp;
  camera.position.y += (targetCameraPos.y - camera.position.y) * lerp;
  camera.position.z += (targetCameraPos.z - camera.position.z) * lerp;

  camera.rotation.x += (targetCameraRot.x - camera.rotation.x) * lerp;
  camera.rotation.y += (targetCameraRot.y - camera.rotation.y) * lerp;
}

/**
 * Scroll tới section cụ thể
 */
function scrollToSection(index) {
  if (!scrollContainer || !sections[index]) return;
  sections[index].scrollIntoView({ behavior: 'smooth' });
}

/**
 * Cập nhật active state cho nav dots
 */
function updateNavDots(activeIndex) {
  navDots.forEach((dot, i) => {
    dot.classList.toggle('active', i === activeIndex);
  });
}

/**
 * Setup IntersectionObserver cho text reveal animations
 */
function setupRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const section = entry.target;
        const index = parseInt(section.dataset.section);
        revealSection(index);
      }
    });
  }, {
    root: scrollContainer,
    threshold: 0.3
  });

  sections.forEach((section) => {
    observer.observe(section);
  });
}

/**
 * Hiện các reveal-item trong section
 */
function revealSection(sectionIndex) {
  const section = sections[sectionIndex];
  if (!section) return;

  const items = section.querySelectorAll('.reveal-item');
  items.forEach((item, i) => {
    setTimeout(() => {
      item.classList.add('visible');
    }, i * 100); // Stagger 100ms
  });
}

/**
 * Easing function
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Getter cho scroll progress
 */
function getScrollProgress() {
  return scrollProgress;
}

function getCurrentSection() {
  return currentSection;
}

export { initScroll, updateScrollCamera, getScrollProgress, getCurrentSection, scrollToSection };
