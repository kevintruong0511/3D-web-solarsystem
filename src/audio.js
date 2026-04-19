/**
 * audio.js — Ambient Sound System
 * 
 * Web Audio API synthesized ambient sound:
 * - Drone pad (multiple oscillators)
 * - Reactive: pitch/filter thay đổi theo mouse velocity
 * - Toggle on/off với smooth fade
 */

// === STATE ===
let audioContext = null;
let masterGain = null;
let oscillators = [];
let filterNode = null;
let noiseGain = null;
let noiseSource = null;
let isPlaying = false;
let isInitialized = false;

// === CẤU HÌNH ÂM THANH ===
const AUDIO_CONFIG = {
  masterVolume: 0.15,         // Âm lượng tổng (nhẹ nhàng)
  fadeTime: 1.0,              // Thời gian fade in/out (giây)
  baseFrequency: 55,          // Tần số cơ bản (A1 — rất trầm)
  harmonics: [1, 1.5, 2, 3],  // Các bậc harmonic
  harmonicVolumes: [0.4, 0.15, 0.1, 0.05], // Volume cho mỗi harmonic
  filterFreq: 800,            // Tần số filter ban đầu
  filterQ: 1.5,               // Q factor
};

/**
 * Khởi tạo audio system (gọi sau user interaction đầu tiên)
 */
function initAudio() {
  if (isInitialized) return;

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // === MASTER GAIN (volume tổng) ===
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0; // Bắt đầu từ 0, fade in sau
    masterGain.connect(audioContext.destination);

    // === FILTER (low-pass cho ambient texture) ===
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = AUDIO_CONFIG.filterFreq;
    filterNode.Q.value = AUDIO_CONFIG.filterQ;
    filterNode.connect(masterGain);

    // === OSCILLATORS (drone pad) ===
    AUDIO_CONFIG.harmonics.forEach((harmonic, i) => {
      const osc = audioContext.createOscillator();
      const oscGain = audioContext.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = AUDIO_CONFIG.baseFrequency * harmonic;
      oscGain.gain.value = AUDIO_CONFIG.harmonicVolumes[i];

      // Thêm gentle detune cho warmth
      osc.detune.value = (Math.random() - 0.5) * 10;

      osc.connect(oscGain);
      oscGain.connect(filterNode);
      osc.start();

      oscillators.push({ osc, gain: oscGain });
    });

    // === NOISE GENERATOR (filtered noise cho "wind" texture) ===
    createFilteredNoise();

    isInitialized = true;
  } catch (err) {
    console.warn('Web Audio API không khả dụng:', err);
  }
}

/**
 * Tạo filtered noise cho ambient texture
 */
function createFilteredNoise() {
  // Tạo noise buffer
  const bufferSize = audioContext.sampleRate * 2;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Noise filter (rất low-pass, chỉ giữ "rumble")
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 200;
  noiseFilter.Q.value = 0.5;

  noiseGain = audioContext.createGain();
  noiseGain.gain.value = 0.06;

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start();
}

/**
 * Bật/tắt âm thanh
 */
function toggleAudio() {
  if (!isInitialized) {
    initAudio();
  }

  // Resume AudioContext nếu bị suspended (browser policy)
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }

  if (isPlaying) {
    // Fade out
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + AUDIO_CONFIG.fadeTime);
    isPlaying = false;
  } else {
    // Fade in
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
    masterGain.gain.linearRampToValueAtTime(
      AUDIO_CONFIG.masterVolume,
      audioContext.currentTime + AUDIO_CONFIG.fadeTime
    );
    isPlaying = true;
  }

  updateSoundIcons();
  return isPlaying;
}

/**
 * Cập nhật audio theo mouse velocity
 * @param {number} velocity - tốc độ di chuyển chuột (0 → ∞)
 */
function updateAudioReactivity(velocity) {
  if (!isInitialized || !isPlaying || !audioContext) return;

  // Filter frequency tăng khi mouse di chuyển nhanh
  const targetFreq = AUDIO_CONFIG.filterFreq + velocity * 5;
  const clampedFreq = Math.min(targetFreq, 3000);
  filterNode.frequency.setTargetAtTime(clampedFreq, audioContext.currentTime, 0.1);

  // Pitch shift nhẹ oscillator đầu tiên
  if (oscillators[0]) {
    const pitchShift = AUDIO_CONFIG.baseFrequency + velocity * 0.3;
    oscillators[0].osc.frequency.setTargetAtTime(
      Math.min(pitchShift, AUDIO_CONFIG.baseFrequency * 1.5),
      audioContext.currentTime,
      0.2
    );
  }
}

/**
 * Cập nhật icons sound on/off
 */
function updateSoundIcons() {
  const onIcon = document.getElementById('sound-on-icon');
  const offIcon = document.getElementById('sound-off-icon');
  if (onIcon && offIcon) {
    onIcon.style.display = isPlaying ? 'block' : 'none';
    offIcon.style.display = isPlaying ? 'none' : 'block';
  }
}

/**
 * Cleanup
 */
function disposeAudio() {
  if (audioContext) {
    oscillators.forEach(({ osc }) => {
      try { osc.stop(); } catch (e) { /* ignore */ }
    });
    if (noiseSource) {
      try { noiseSource.stop(); } catch (e) { /* ignore */ }
    }
    audioContext.close();
    audioContext = null;
    oscillators = [];
    isInitialized = false;
    isPlaying = false;
  }
}

export { initAudio, toggleAudio, updateAudioReactivity, disposeAudio };
