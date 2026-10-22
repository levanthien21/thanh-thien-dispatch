// Web Audio API Ringtone & Tone Generator
// Generates realistic US/VN standard telecom ringtone and ringback tones

class RingtoneManager {
  private audioCtx: AudioContext | null = null;
  private ringOscillator1: OscillatorNode | null = null;
  private ringOscillator2: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringTimer: any = null;
  private isRinging = false;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play standard incoming telephone ring (440Hz + 480Hz modulated: 2s ON, 4s OFF)
  startIncomingRing(volume = 0.5) {
    if (this.isRinging) return;
    this.isRinging = true;

    try {
      const ctx = this.getContext();

      const playBurst = () => {
        if (!this.isRinging) return;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // 440Hz + 480Hz is standard North American/Vietnamese ringing tone
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        // Fade in/out burst for 1.8 seconds
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.1);
        gain.gain.setValueAtTime(volume * 0.4, now + 1.7);
        gain.gain.linearRampToValueAtTime(0, now + 1.8);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);

        // Schedule next burst after 3.5 seconds
        this.ringTimer = setTimeout(() => {
          if (this.isRinging) {
            playBurst();
          }
        }, 3500);
      };

      playBurst();
    } catch (e) {
      console.warn('AudioContext not allowed or initialized yet:', e);
    }
  }

  // Play outgoing ringback tone (low pitch beep: 440Hz + 480Hz for 1.5s, 3s pause)
  startOutgoingRingback(volume = 0.3) {
    if (this.isRinging) return;
    this.isRinging = true;

    try {
      const ctx = this.getContext();

      const playBurst = () => {
        if (!this.isRinging) return;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.05);
        gain.gain.setValueAtTime(volume * 0.25, now + 1.2);
        gain.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);

        this.ringTimer = setTimeout(() => {
          if (this.isRinging) {
            playBurst();
          }
        }, 3000);
      };

      playBurst();
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  }

  // Play single DTMF tone for keypad press (0-9, *, #)
  playDtmf(digit: string, volume = 0.2) {
    try {
      const ctx = this.getContext();
      const dtmfFrequencies: { [key: string]: [number, number] } = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
      };

      const freqs = dtmfFrequencies[digit];
      if (!freqs) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.15);
      osc2.stop(now + 0.15);
    } catch (e) {
      // ignore
    }
  }

  // Stop any active ringing or ringback
  stop() {
    this.isRinging = false;
    if (this.ringTimer) {
      clearTimeout(this.ringTimer);
      this.ringTimer = null;
    }
    if (this.ringOscillator1) {
      try { this.ringOscillator1.stop(); } catch (e) {}
      this.ringOscillator1 = null;
    }
    if (this.ringOscillator2) {
      try { this.ringOscillator2.stop(); } catch (e) {}
      this.ringOscillator2 = null;
    }
  }
}

export const ringtone = new RingtoneManager();
