// Synthesised sounds for Stonehollow Clash.
// No audio files: every blip is a tiny oscillator envelope made with the
// Web Audio API, so the game loads nothing over the network.

let audioContext = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function blip(frequency, duration, type, volume, slideTo) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playDealSound() {
  blip(620, 0.09, 'triangle', 0.12, 880);
}

export function playCardSound() {
  blip(440, 0.12, 'square', 0.08, 660);
  setTimeout(() => blip(880, 0.1, 'triangle', 0.1), 60);
}

export function playClashSound() {
  blip(180, 0.16, 'sawtooth', 0.14, 90);
}

export function playHealSound() {
  blip(520, 0.2, 'sine', 0.1, 780);
}

export function playWinSound() {
  [523, 659, 784, 1047].forEach((note, i) => {
    setTimeout(() => blip(note, 0.22, 'triangle', 0.14), i * 120);
  });
}

export function playLossSound() {
  [392, 330, 262, 196].forEach((note, i) => {
    setTimeout(() => blip(note, 0.25, 'sine', 0.12), i * 140);
  });
}

export function playClickSound() {
  blip(700, 0.05, 'sine', 0.06);
}
