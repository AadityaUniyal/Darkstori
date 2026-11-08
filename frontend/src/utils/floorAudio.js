/**
 * Tactical Audio & Haptic Feedback Engine for Warehouse Handheld Terminals.
 * Supports 3 Audio Profiles:
 * 1. 'warehouse' (Loud high-frequency 880Hz chime + haptics for noisy cold store floors)
 * 2. 'office' (Warm 440Hz wooden click + soft haptics for desk/management control room)
 * 3. 'silent' (Zero audio, haptic vibration only)
 */

class FloorFeedbackEngine {
  constructor() {
    this.audioCtx = null;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('darkstori_audio_profile') : null;
    this.profile = saved || 'warehouse';
    this.listeners = new Set();
  }

  setProfile(newProfile) {
    if (['warehouse', 'office', 'silent'].includes(newProfile)) {
      this.profile = newProfile;
      try {
        localStorage.setItem('darkstori_audio_profile', newProfile);
      } catch {}
      this.listeners.forEach(cb => cb(this.profile));
    }
  }

  getProfile() {
    return this.profile;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _initAudio() {
    if (this.profile === 'silent') return;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Positive verification: Item barcode scanned and matched.
   */
  playSuccessPick() {
    try {
      if (this.profile === 'silent') {
        if ('vibrate' in navigator) navigator.vibrate(60);
        return;
      }

      this._initAudio();
      if (this.audioCtx) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const now = this.audioCtx.currentTime;

        if (this.profile === 'warehouse') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        } else {
          // Office: Soft wood-click sine
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440.0, now);
          osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.05);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        }

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      }

      if ('vibrate' in navigator) {
        navigator.vibrate(this.profile === 'warehouse' ? 60 : 30);
      }
    } catch {}
  }

  /**
   * Negative mismatch: Wrong SKU scanned or defect intercepted.
   */
  playErrorMismatch() {
    try {
      if (this.profile === 'silent') {
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        return;
      }

      this._initAudio();
      if (this.audioCtx) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const now = this.audioCtx.currentTime;

        osc.type = this.profile === 'warehouse' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(220.0, now);
        osc.frequency.setValueAtTime(180.0, now + 0.1);

        const vol = this.profile === 'warehouse' ? 0.15 : 0.08;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }

      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {}
  }

  /**
   * Bag sealed & dispatched to rider bay.
   */
  playDispatchSuccess() {
    try {
      if (this.profile === 'silent') {
        if ('vibrate' in navigator) navigator.vibrate([80, 40, 120]);
        return;
      }

      this._initAudio();
      if (this.audioCtx) {
        const notes = this.profile === 'warehouse' 
          ? [523.25, 659.25, 783.99] // C5, E5, G5
          : [440.0, 554.37, 659.25]; // A4, C#5, E5

        notes.forEach((freq, idx) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const now = this.audioCtx.currentTime + idx * 0.06;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          const vol = this.profile === 'warehouse' ? 0.11 : 0.05;
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.14);
        });
      }

      if ('vibrate' in navigator) {
        navigator.vibrate([80, 40, 120]);
      }
    } catch {}
  }

  click() {
    try {
      this.playSuccessPick();
    } catch {}
  }

  success() {
    try {
      this.playDispatchSuccess();
    } catch {}
  }

  alert() {
    try {
      this.playErrorMismatch();
    } catch {}
  }
}

export const floorAudio = new FloorFeedbackEngine();
