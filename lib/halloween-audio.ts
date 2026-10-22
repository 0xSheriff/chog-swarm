/**
 * HALLOWEEN WEB AUDIO SYNTHESIS ENGINE
 * 
 * 100% Procedural synthesis using standard Web Audio API nodes.
 * Zero external audio files or downloaded samples.
 * Key: D Harmonic Minor (D, E, F, G, A, Bb, C#) @ 92 BPM base.
 */

// ─── Scale Frequencies ────────────────────────────────────────────────────────
export const D_HARMONIC_MINOR: Record<string, number> = {
  D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, Cs3: 138.59,
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, Cs4: 277.18,
  D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16, Cs5: 554.37,
  D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, Bb5: 932.33, Cs6: 1108.73,
  D6: 1174.66,
};

export const G_HARMONIC_MINOR: Record<string, number> = {
  G2: 98.00, A2: 110.00, Bb2: 116.54, C3: 130.81, D3: 146.83, Eb3: 155.56, Fs3: 185.00,
  G3: 196.00, A3: 220.00, Bb3: 233.08, C4: 261.63, D4: 293.66, Eb4: 311.13, Fs4: 369.99,
  G4: 392.00, A4: 440.00, Bb4: 466.16, C5: 523.25, D5: 587.33, Eb5: 622.25, Fs5: 739.99,
  G5: 783.99,
};

// Polyphony limit
const MAX_VOICES = 24;

interface ActiveVoice {
  id: number;
  priority: number;
  startTime: number;
  stop: () => void;
}

class HalloweenAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Master Chain Nodes
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private dynamicFilter: BiquadFilterNode | null = null; // for drain sweep & game reactions
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: WaveShaperNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbWet: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Persistent Settings
  public isMuted = false;
  public masterVolume = 0.8;
  public musicVolume = 0.35;
  public sfxVolume = 0.6;

  // Polyphony Voice Registry
  private voiceCounter = 0;
  private activeVoices = new Map<number, ActiveVoice>();

  // Music Scheduler State
  private schedulerTimer: number | null = null;
  private bpm = 92;
  private currentStep = 0;
  private nextNoteTime = 0;
  private inMultiball = false;
  private comboLevel = 0;
  private comboResetTimer: NodeJS.Timeout | null = null;
  private celestaIndex = 0;

  // Drone Nodes
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private droneLfoGain: GainNode | null = null;
  private droneGain: GainNode | null = null;

  // Ambient graveyard noise & thunder
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private thunderInterval: number | null = null;
  private currentFilterFreq = 14000;
  private listenersAttached = false;

  constructor() {
    this.loadSettings();
    this.initListeners();
  }

  public initListeners() {
    if (this.listenersAttached || typeof window === 'undefined') return;
    this.listenersAttached = true;
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    window.addEventListener('chog:fx', ((e: CustomEvent) => this.handleChogFx(e)) as EventListener);
  }

  // ─── Settings Storage (Safe Try/Catch) ──────────────────────────────────────
  private loadSettings() {
    try {
      if (typeof window === 'undefined') return;
      const storedMute = localStorage.getItem('chog_audio_muted');
      if (storedMute !== null) this.isMuted = storedMute === 'true';

      const storedMaster = localStorage.getItem('chog_audio_master_vol');
      if (storedMaster !== null) this.masterVolume = Math.max(0, Math.min(1, parseFloat(storedMaster)));

      const storedMusic = localStorage.getItem('chog_audio_music_vol');
      if (storedMusic !== null) this.musicVolume = Math.max(0, Math.min(1, parseFloat(storedMusic)));

      const storedSfx = localStorage.getItem('chog_audio_sfx_vol');
      if (storedSfx !== null) this.sfxVolume = Math.max(0, Math.min(1, parseFloat(storedSfx)));
    } catch {
      // ignore
    }
  }

  private saveSettings() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem('chog_audio_muted', String(this.isMuted));
      localStorage.setItem('chog_audio_master_vol', this.masterVolume.toFixed(2));
      localStorage.setItem('chog_audio_music_vol', this.musicVolume.toFixed(2));
      localStorage.setItem('chog_audio_sfx_vol', this.sfxVolume.toFixed(2));
    } catch {
      // ignore
    }
  }

  // ─── Reverb Impulse Synthesis (1.8s exponential decay) ───────────────────────
  private createReverbImpulse(ctx: AudioContext, duration = 1.8, decay = 2.4): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Exponential decay envelope with slight stereophonic decorrelation
      const env = Math.exp(-n * decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  // ─── Soft Limiter Distortion Curve (Tanh capped < 0.95) ─────────────────────
  private createLimiterCurve(samples = 1024): Float32Array<ArrayBuffer> {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Tanh soft limiter: strictly clamps to [-0.92, 0.92]
      curve[i] = Math.tanh(x * 1.5) * 0.92;
    }
    return curve;
  }

  // ─── Lazy Singleton AudioContext Initialization ─────────────────────────────
  public init(): AudioContext {
    this.initListeners();
    if (this.ctx) return this.ctx;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    this.ctx = ctx;

    // 1. Analyser for Headroom & Metering
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    this.analyser = analyser;

    // 2. Soft Limiter (Tanh WaveShaper)
    const limiter = ctx.createWaveShaper();
    limiter.curve = this.createLimiterCurve();
    limiter.oversample = '2x';
    this.limiter = limiter;

    // 3. Dynamics Compressor (threshold -18dB, ratio 3:1)
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, ctx.currentTime);
    compressor.knee.setValueAtTime(8, ctx.currentTime);
    compressor.ratio.setValueAtTime(3, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);
    this.compressor = compressor;

    // 4. Convolver Reverb with Wet/Dry mix
    const convolver = ctx.createConvolver();
    convolver.buffer = this.createReverbImpulse(ctx, 1.8, 2.8);
    this.convolver = convolver;

    const reverbWet = ctx.createGain();
    reverbWet.gain.setValueAtTime(0.22, ctx.currentTime);
    this.reverbWet = reverbWet;

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.78, ctx.currentTime);
    this.dryGain = dryGain;

    // 5. Dynamic Music Reactive Lowpass Filter (e.g. for Drain sweep)
    const dynamicFilter = ctx.createBiquadFilter();
    dynamicFilter.type = 'lowpass';
    dynamicFilter.frequency.setValueAtTime(14000, ctx.currentTime);
    dynamicFilter.Q.setValueAtTime(1.0, ctx.currentTime);
    this.dynamicFilter = dynamicFilter;

    // 6. Master, Music, SFX Gains
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, ctx.currentTime);
    this.masterGain = masterGain;

    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(this.musicVolume, ctx.currentTime);
    this.musicGain = musicGain;

    const sfxGain = ctx.createGain();
    sfxGain.gain.setValueAtTime(this.sfxVolume, ctx.currentTime);
    this.sfxGain = sfxGain;

    // Routing Graph:
    // [Music/SFX] -> [dynamicFilter] -> [dryGain + (convolver -> reverbWet)] -> [compressor] -> [limiter] -> [masterGain] -> [analyser] -> [destination]
    musicGain.connect(dynamicFilter);
    sfxGain.connect(dynamicFilter);

    dynamicFilter.connect(dryGain);
    dynamicFilter.connect(convolver);
    convolver.connect(reverbWet);

    dryGain.connect(compressor);
    reverbWet.connect(compressor);

    compressor.connect(limiter);
    limiter.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    this.isInitialized = true;
    this.startAmbientBed();
    this.startGenerativeMusic();

    return ctx;
  }

  // ─── Polyphony Management (Max 24 Voices) ──────────────────────────────────
  private registerVoice(stopFn: () => void, priority = 1): number {
    const id = ++this.voiceCounter;
    if (this.activeVoices.size >= MAX_VOICES) {
      // Steal oldest voice or lowest priority
      let candidateId: number | null = null;
      let lowestPriority = 999;
      let oldestTime = Infinity;

      for (const [vId, voice] of this.activeVoices.entries()) {
        if (voice.priority < lowestPriority || (voice.priority === lowestPriority && voice.startTime < oldestTime)) {
          lowestPriority = voice.priority;
          oldestTime = voice.startTime;
          candidateId = vId;
        }
      }

      if (candidateId !== null) {
        const victim = this.activeVoices.get(candidateId);
        if (victim) {
          try {
            victim.stop();
          } catch {
            // ignore
          }
          this.activeVoices.delete(candidateId);
        }
      }
    }

    const voice: ActiveVoice = {
      id,
      priority,
      startTime: this.ctx ? this.ctx.currentTime : performance.now() / 1000,
      stop: () => {
        try {
          stopFn();
        } catch {
          // ignore
        }
        this.activeVoices.delete(id);
      },
    };
    this.activeVoices.set(id, voice);
    return id;
  }

  private releaseVoice(id: number) {
    this.activeVoices.delete(id);
  }

  // ─── Ambient Graveyard Bed (Wind & Periodic Thunder) ────────────────────────
  private startAmbientBed() {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;

    // Wind bed using looped filtered noise
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // pinkish noise
      lastOut = output[i];
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(550, ctx.currentTime);
    windFilter.Q.setValueAtTime(2.5, ctx.currentTime);

    // Modulate wind frequency slowly
    const windLfo = ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.08, ctx.currentTime);
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.setValueAtTime(220, ctx.currentTime);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.05, ctx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.sfxGain);

    windSource.start();
    windLfo.start();
    this.ambientNoiseSource = windSource;

    // Random thunder every 25 to 40 seconds
    const scheduleThunder = () => {
      const delay = 25000 + Math.random() * 15000;
      this.thunderInterval = window.setTimeout(() => {
        if (this.ctx && this.ctx.state === 'running') {
          this.playThunder();
        }
        scheduleThunder();
      }, delay);
    };
    scheduleThunder();
  }

  public playThunder() {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const duration = 3.5;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => source.stop(), 0.5);
    source.start();
    source.onended = () => {
      this.releaseVoice(voiceId);
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  // ─── Generative Background Music (D Harmonic Minor @ 92 BPM) ───────────────
  private startGenerativeMusic() {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    // 1. Organ Drone / Pad (D2 & A2 detuned, slow LFO sweeping lowpass)
    const droneOsc1 = ctx.createOscillator();
    droneOsc1.type = 'sawtooth';
    droneOsc1.frequency.setValueAtTime(D_HARMONIC_MINOR.D2, ctx.currentTime);
    droneOsc1.detune.setValueAtTime(-7, ctx.currentTime);

    const droneOsc2 = ctx.createOscillator();
    droneOsc2.type = 'sawtooth';
    droneOsc2.frequency.setValueAtTime(D_HARMONIC_MINOR.A2, ctx.currentTime);
    droneOsc2.detune.setValueAtTime(7, ctx.currentTime);

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(280, ctx.currentTime);
    droneFilter.Q.setValueAtTime(3.0, ctx.currentTime);

    const droneLfo = ctx.createOscillator();
    droneLfo.frequency.setValueAtTime(0.12, ctx.currentTime);

    const droneLfoGain = ctx.createGain();
    droneLfoGain.gain.setValueAtTime(120, ctx.currentTime); // modulates between 160Hz and 400Hz

    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(droneFilter.frequency);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.12, ctx.currentTime);

    droneOsc1.connect(droneFilter);
    droneOsc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.musicGain);

    droneOsc1.start();
    droneOsc2.start();
    droneLfo.start();

    this.droneOsc1 = droneOsc1;
    this.droneOsc2 = droneOsc2;
    this.droneFilter = droneFilter;
    this.droneLfo = droneLfo;
    this.droneLfoGain = droneLfoGain;
    this.droneGain = droneGain;

    // 2. Lookahead Scheduler for Melodic & Harmonic Layers
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.schedulerTimer = window.setInterval(() => {
      this.runScheduler();
    }, 25);
  }

  private runScheduler() {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;

    const lookahead = 0.14; // 140ms
    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = secondsPerBeat / 4; // 16th note steps

    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar pattern (16 steps per bar * 4)
    }
  }

  private scheduleStep(step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const scale = this.inMultiball ? G_HARMONIC_MINOR : D_HARMONIC_MINOR;

    // ─── A. Heartbeat Kick (every 4 bars on steps 0 & 3, or every beat in multiball)
    const isKickStep = this.inMultiball
      ? step % 4 === 0 // every quarter note in multiball
      : step === 0 || step === 3; // double-thump at bar start

    if (isKickStep) {
      this.playHeartbeatKick(time, step === 3 ? 0.08 : 0.16);
    }

    // ─── B. Celesta / Music Box Arpeggio
    // Normal: 8th notes (step % 2 === 0). When combo > 3: dense 16th notes
    const isCelestaStep = this.comboLevel > 3 ? true : step % 2 === 0;
    if (isCelestaStep) {
      const melodyWalk = [
        scale.D4, scale.F4, scale.A4, scale.Cs5, scale.D5, scale.A4, scale.F4, scale.E4,
        scale.D4, scale.G4, scale.Bb4, scale.D5, scale.Cs5, scale.Bb4, scale.A4, scale.F4,
        scale.D4, scale.F4, scale.A4, scale.D5, scale.E5, scale.F5, scale.Cs5, scale.A4,
        scale.Bb4, scale.A4, scale.G4, scale.F4, scale.E4, scale.F4, scale.Cs4, scale.D4
      ];
      const pitch = melodyWalk[this.celestaIndex % melodyWalk.length];
      this.celestaIndex++;
      this.playCelestaNote(pitch, time, 0.09);
    }

    // ─── C. Ghostly Theremin Lead (half & whole notes in high register)
    if (step % 16 === 0) {
      const thereminNotes = [scale.D5, scale.F5, scale.A5, scale.Bb5, scale.Cs6, scale.D6];
      const noteIndex = Math.floor(step / 16) % thereminNotes.length;
      this.playThereminTone(thereminNotes[noteIndex], time, 1.4);
    }

    // ─── D. Distant Choir (every 16 bars for 4 bars, i.e. step === 0 of cycle 4)
    if (step === 0 && Math.floor(this.currentStep / 64) % 4 === 3) {
      this.playChoirChord(time, 3.2);
    }

    // ─── E. Church Bell Toll (every 32 bars)
    if (step === 0 && Math.floor(this.currentStep / 64) % 8 === 0) {
      this.playCathedralBell(scale.D3, time);
    }
  }

  // ─── Synthesized Voice Helpers ──────────────────────────────────────────────

  private playHeartbeatKick(time: number, gainVal = 0.16) {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.06);

    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(gain);
    gain.connect(this.musicGain);

    const voiceId = this.registerVoice(() => osc.stop(time + 0.09), 1);
    osc.start(time);
    osc.stop(time + 0.09);
    osc.onended = () => {
      this.releaseVoice(voiceId);
      osc.disconnect();
      gain.disconnect();
    };
  }

  private playCelestaNote(freq: number, time: number, volume = 0.09) {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    // Fast attack (2ms), exponential decay (350ms)
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.musicGain);

    const voiceId = this.registerVoice(() => osc.stop(time + 0.36), 1);
    osc.start(time);
    osc.stop(time + 0.36);
    osc.onended = () => {
      this.releaseVoice(voiceId);
      osc.disconnect();
      gain.disconnect();
    };
  }

  private playThereminTone(freq: number, time: number, duration = 1.4) {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.95, time);
    // Portamento glide 120ms
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.12);

    // Slow vibrato (5.5 Hz, depth 18 cents)
    const vibrato = ctx.createOscillator();
    vibrato.frequency.setValueAtTime(5.5, time);
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(freq * 0.0104, time); // ~18 cents
    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.06, time + 0.18);
    gain.gain.setValueAtTime(0.06, time + duration - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    const voiceId = this.registerVoice(() => {
      osc.stop(time + duration);
      vibrato.stop(time + duration);
    }, 2);

    osc.start(time);
    vibrato.start(time);
    osc.stop(time + duration);
    vibrato.stop(time + duration);

    osc.onended = () => {
      this.releaseVoice(voiceId);
      osc.disconnect();
      vibrato.disconnect();
      vibGain.disconnect();
      gain.disconnect();
    };
  }

  private playChoirChord(time: number, duration = 2.4) {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    const formants = [800, 1200, 2400];
    const notes = [D_HARMONIC_MINOR.D4, D_HARMONIC_MINOR.F4, D_HARMONIC_MINOR.A4];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime((idx - 1) * 6, time);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(formants[idx % formants.length], time);
      filter.Q.setValueAtTime(3.5, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.04, time + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);

      const voiceId = this.registerVoice(() => osc.stop(time + duration), 2);
      osc.start(time);
      osc.stop(time + duration);
      osc.onended = () => {
        this.releaseVoice(voiceId);
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    });
  }

  private playCathedralBell(rootFreq: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    // Two sines with inharmonic ratio 1 : 2.76, slow decay 3.5s
    const partials = [
      { ratio: 1.0, gain: 0.12 },
      { ratio: 2.76, gain: 0.08 },
      { ratio: 5.4, gain: 0.03 },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(rootFreq * p.ratio, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(p.gain, time + 0.004); // subtle strike transient
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 3.5);

      osc.connect(gain);
      gain.connect(this.musicGain!);

      const voiceId = this.registerVoice(() => osc.stop(time + 3.5), 2);
      osc.start(time);
      osc.stop(time + 3.5);
      osc.onended = () => {
        this.releaseVoice(voiceId);
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  // ─── Synthesized SFX Palette ────────────────────────────────────────────────

  /** Mechanical Flipper Tap (thud at 90Hz + high creak) */
  public playFlipper() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Thud (90 Hz, 25ms)
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(90, now);
    thud.frequency.exponentialRampToValueAtTime(30, now + 0.025);
    thudGain.gain.setValueAtTime(0.35, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);

    // 2. High Creak (bandpass filtered noise, 12ms)
    const noiseLen = Math.floor(ctx.sampleRate * 0.015);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const creakFilter = ctx.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.frequency.setValueAtTime(3200, now);
    creakFilter.Q.setValueAtTime(4.0, now);

    const creakGain = ctx.createGain();
    creakGain.gain.setValueAtTime(0.12, now);
    creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    noiseSrc.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => {
      thud.stop(now + 0.03);
      noiseSrc.stop(now + 0.02);
    }, 1);

    thud.start(now);
    thud.stop(now + 0.03);
    noiseSrc.start(now);

    thud.onended = () => {
      this.releaseVoice(voiceId);
      thud.disconnect();
      thudGain.disconnect();
      noiseSrc.disconnect();
      creakFilter.disconnect();
      creakGain.disconnect();
    };
  }

  /** Plunger Charge: ascending pitch sweep (sine 110Hz -> 440Hz) with 20Hz AM */
  public playPlungerCharge(duration = 0.8) {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(110, now);
    carrier.frequency.exponentialRampToValueAtTime(440, now + duration);

    // 20Hz AM spring rattle
    const amOsc = ctx.createOscillator();
    amOsc.frequency.setValueAtTime(20, now);
    const amGain = ctx.createGain();
    amGain.gain.setValueAtTime(0.5, now);
    amOsc.connect(amGain);

    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    mainGain.gain.setValueAtTime(0.25, now + duration - 0.05);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    amGain.connect(mainGain.gain);
    carrier.connect(mainGain);
    mainGain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => {
      carrier.stop(now + duration);
      amOsc.stop(now + duration);
    }, 1);

    carrier.start(now);
    amOsc.start(now);
    carrier.stop(now + duration);
    amOsc.stop(now + duration);

    carrier.onended = () => {
      this.releaseVoice(voiceId);
      carrier.disconnect();
      amOsc.disconnect();
      amGain.disconnect();
      mainGain.disconnect();
    };
  }

  /** Plunger Release: sharp spring twang + resonant bone clack (FM synth) */
  public playPlungerRelease() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Carrier 220 Hz, Modulator 440 Hz with fast decaying mod index
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modIndex = ctx.createGain();

    carrier.frequency.setValueAtTime(220, now);
    carrier.frequency.exponentialRampToValueAtTime(130, now + 0.25);

    modulator.frequency.setValueAtTime(440, now);
    modIndex.gain.setValueAtTime(500, now);
    modIndex.gain.exponentialRampToValueAtTime(5, now + 0.15);

    modulator.connect(modIndex);
    modIndex.connect(carrier.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    carrier.connect(gain);
    gain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => {
      carrier.stop(now + 0.26);
      modulator.stop(now + 0.26);
    }, 2);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + 0.26);
    modulator.stop(now + 0.26);

    carrier.onended = () => {
      this.releaseVoice(voiceId);
      carrier.disconnect();
      modulator.disconnect();
      modIndex.disconnect();
      gain.disconnect();
    };
  }

  /** Pop Bumper Hit (pitchIndex: 0, 1, or 2 for three distinct bumpers) */
  public playPopBumper(pitchIndex = 0) {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const startPitches = [260, 310, 370];
    const endPitches = [90, 110, 130];
    const chimeFreqs = [D_HARMONIC_MINOR.A4, D_HARMONIC_MINOR.Cs5, D_HARMONIC_MINOR.D5];

    const startFreq = startPitches[pitchIndex % 3];
    const endFreq = endPitches[pitchIndex % 3];
    const chimeFreq = chimeFreqs[pitchIndex % 3];

    // 1. Hollow pumpkin thump (triangle 80ms)
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(startFreq, now);
    thump.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    thumpGain.gain.setValueAtTime(0.36, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    thump.connect(thumpGain);
    thumpGain.connect(this.sfxGain);

    // 2. High snap (4ms noise burst)
    const snapLen = Math.floor(ctx.sampleRate * 0.006);
    const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate);
    const sd = snapBuf.getChannelData(0);
    for (let i = 0; i < snapLen; i++) sd[i] = Math.random() * 2 - 1;
    const snapSrc = ctx.createBufferSource();
    snapSrc.buffer = snapBuf;
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.2, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
    snapSrc.connect(snapGain);
    snapGain.connect(this.sfxGain);

    // 3. Eerie chime (high sine decay 220ms)
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(chimeFreq, now);
    chimeGain.gain.setValueAtTime(0.12, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    chime.connect(chimeGain);
    chimeGain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => {
      thump.stop(now + 0.09);
      snapSrc.stop(now + 0.01);
      chime.stop(now + 0.23);
    }, 2);

    thump.start(now);
    snapSrc.start(now);
    chime.start(now);
    thump.stop(now + 0.09);
    chime.stop(now + 0.23);

    thump.onended = () => {
      this.releaseVoice(voiceId);
      thump.disconnect();
      thumpGain.disconnect();
      snapSrc.disconnect();
      snapGain.disconnect();
      chime.disconnect();
      chimeGain.disconnect();
    };
  }

  /** Slingshot Kick: bone rattle through 3 parallel bandpass filters (1.2k, 2.4k, 4.8k) */
  public playSlingshot() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const noiseLen = Math.floor(ctx.sampleRate * 0.07);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filters = [1200, 2400, 4800].map((f) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(f, now);
      bp.Q.setValueAtTime(5.0, now);
      return bp;
    });

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    filters.forEach((bp) => {
      noiseSrc.connect(bp);
      bp.connect(gain);
    });
    gain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => noiseSrc.stop(now + 0.07), 1);
    noiseSrc.start(now);
    noiseSrc.stop(now + 0.07);

    noiseSrc.onended = () => {
      this.releaseVoice(voiceId);
      noiseSrc.disconnect();
      filters.forEach((f) => f.disconnect());
      gain.disconnect();
    };
  }

  /** Rollover / Target Hit: ascending D harmonic minor notes for C-H-O-G (0 to 3) */
  public playRollover(letterIndex = 0) {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const notes = [D_HARMONIC_MINOR.D4, D_HARMONIC_MINOR.F4, D_HARMONIC_MINOR.A4, D_HARMONIC_MINOR.Cs5];
    const freq = notes[letterIndex % notes.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => osc.stop(now + 0.29), 2);
    osc.start(now);
    osc.stop(now + 0.29);
    osc.onended = () => {
      this.releaseVoice(voiceId);
      osc.disconnect();
      gain.disconnect();
    };
  }

  /** Sinister Ghost Laugh (FM pitch falling 600->200 Hz with 8Hz vibrato) */
  public playGhostLaugh() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = 1.1;

    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(600, now);
    carrier.frequency.exponentialRampToValueAtTime(200, now + duration);

    // 8Hz vibrato laugh cadence
    const vib = ctx.createOscillator();
    vib.frequency.setValueAtTime(8, now);
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(70, now);
    vib.connect(vibGain);
    vibGain.connect(carrier.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => {
      carrier.stop(now + duration);
      vib.stop(now + duration);
    }, 3);

    carrier.start(now);
    vib.start(now);
    carrier.stop(now + duration);
    vib.stop(now + duration);

    carrier.onended = () => {
      this.releaseVoice(voiceId);
      carrier.disconnect();
      vib.disconnect();
      vibGain.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  /** Drain / Ball Lost: deep descending hollow groan (180->45 Hz, 800ms) */
  public playDrain() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Trigger Dynamic Filter lowpass sweep on master music (drops to <= 400Hz, recovers over 700ms)
    this.currentFilterFreq = 350;
    setTimeout(() => {
      this.currentFilterFreq = 14000;
    }, 700);
    if (this.dynamicFilter) {
      this.dynamicFilter.frequency.cancelScheduledValues(now);
      this.dynamicFilter.frequency.setValueAtTime(350, now);
      this.dynamicFilter.frequency.exponentialRampToValueAtTime(14000, now + 0.7);
    }

    // Descending minor second glissando on celesta
    const celestaGlide = ctx.createOscillator();
    const celestaGain = ctx.createGain();
    celestaGlide.type = 'triangle';
    celestaGlide.frequency.setValueAtTime(D_HARMONIC_MINOR.Cs5, now);
    celestaGlide.frequency.exponentialRampToValueAtTime(D_HARMONIC_MINOR.D4, now + 0.6);
    celestaGain.gain.setValueAtTime(0.18, now);
    celestaGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    celestaGlide.connect(celestaGain);
    celestaGain.connect(this.sfxGain);

    // Deep hollow groan (saw 180 -> 45 Hz)
    const groan = ctx.createOscillator();
    const groanGain = ctx.createGain();
    groan.type = 'sawtooth';
    groan.frequency.setValueAtTime(180, now);
    groan.frequency.exponentialRampToValueAtTime(45, now + 0.8);

    const groanFilter = ctx.createBiquadFilter();
    groanFilter.type = 'lowpass';
    groanFilter.frequency.setValueAtTime(420, now);

    groanGain.gain.setValueAtTime(0.3, now);
    groanGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    groan.connect(groanFilter);
    groanFilter.connect(groanGain);
    groanGain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => {
      groan.stop(now + 0.81);
      celestaGlide.stop(now + 0.61);
    }, 3);

    groan.start(now);
    celestaGlide.start(now);
    groan.stop(now + 0.81);
    celestaGlide.stop(now + 0.61);

    groan.onended = () => {
      this.releaseVoice(voiceId);
      groan.disconnect();
      groanFilter.disconnect();
      groanGain.disconnect();
      celestaGlide.disconnect();
      celestaGain.disconnect();
    };
  }

  /** Ghost Banished: high ethereal choir burst (1.2s high chord) */
  public playGhostBanish() {
    this.ensureContext();
    if (!this.ctx) return;
    this.playChoirChord(this.ctx.currentTime, 1.2);
  }

  /** Jackpot: triumphant fanfare in D major (D-F#-A-D) */
  public playJackpot() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const fanfareNotes = [293.66, 369.99, 440.00, 587.33]; // D4, F#4, A4, D5 (Major)
    fanfareNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.24, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      const voiceId = this.registerVoice(() => osc.stop(startTime + 0.65), 3);
      osc.start(startTime);
      osc.stop(startTime + 0.65);
      osc.onended = () => {
        this.releaseVoice(voiceId);
        osc.disconnect();
        gain.disconnect();
      };
    });
  }

  /** UI click: subtle bone click (short bandpass impulse at 2.8 kHz, 8ms) */
  public playUiClick() {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    const voiceId = this.registerVoice(() => osc.stop(now + 0.01), 1);
    osc.start(now);
    osc.stop(now + 0.01);
    osc.onended = () => {
      this.releaseVoice(voiceId);
      osc.disconnect();
      gain.disconnect();
    };
  }

  // ─── Dynamic Reactive Controls ──────────────────────────────────────────────

  public setCombo(level: number) {
    this.comboLevel = Math.max(0, level);
    // Accelerate tempo by 4% per level up to +25% (max ~115 BPM from base 92)
    const factor = 1 + Math.min(0.25, Math.max(0, level - 3) * 0.04);
    this.bpm = 92 * factor;

    // Reset after 4 seconds of combo inactivity
    if (this.comboResetTimer) clearTimeout(this.comboResetTimer);
    this.comboResetTimer = setTimeout(() => {
      this.comboLevel = 0;
      this.bpm = 92;
    }, 4000);
  }

  public setMultiball(active: boolean) {
    this.inMultiball = active;
  }

  // ─── Event Listeners ────────────────────────────────────────────────────────

  private handleChogFx(e: CustomEvent) {
    const detail = e.detail || {};
    const type = detail.type;

    switch (type) {
      case 'flipper':
        this.playFlipper();
        break;
      case 'plungerCharge':
        this.playPlungerCharge(detail.duration || 0.8);
        break;
      case 'plungerRelease':
        this.playPlungerRelease();
        break;
      case 'bumper':
        this.playPopBumper(detail.index !== undefined ? detail.index : 0);
        break;
      case 'slingshot':
        this.playSlingshot();
        break;
      case 'rollover':
        this.playRollover(detail.index !== undefined ? detail.index : 0);
        break;
      case 'ghostLaugh':
      case 'allRolloversComplete':
        this.playGhostLaugh();
        break;
      case 'ghostBanish':
        this.playGhostBanish();
        break;
      case 'drain':
        this.playDrain();
        break;
      case 'jackpot':
        this.playJackpot();
        break;
      case 'combo':
        if (typeof detail.count === 'number') {
          this.setCombo(detail.count);
        }
        break;
      case 'multiballStart':
      case 'multiball':
        this.setMultiball(true);
        break;
      case 'multiballEnd':
        this.setMultiball(false);
        break;
      default:
        break;
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    // 'M' shortcut toggles mute anywhere, unless typing in an input
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (e.key === 'm' || e.key === 'M') {
      this.toggleMute();
    }
  }

  private handleVisibilityChange() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (document.hidden) {
      // Fade master to 0 over 200ms and suspend context
      if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.2);
      }
      setTimeout(() => {
        if (document.hidden && this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend();
        }
      }, 220);
    } else {
      // Resume and fade back up over 300ms
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (this.masterGain && this.ctx) {
            const resNow = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(resNow);
            this.masterGain.gain.setValueAtTime(0.0001, resNow);
            this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : this.masterVolume, resNow + 0.3);
          }
        });
      }
    }
  };

  // ─── Public Control API ─────────────────────────────────────────────────────

  public ensureContext(): AudioContext {
    return this.init();
  }

  public async start(): Promise<void> {
    const ctx = this.init();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.saveSettings();
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : this.masterVolume, now + 0.05);
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
    if (this.masterGain && this.ctx && !this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, now + 0.05);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, now + 0.05);
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
    if (this.sfxGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.linearRampToValueAtTime(this.sfxVolume, now + 0.05);
    }
  }

  // ─── Telemetry & Testing Stats ──────────────────────────────────────────────

  public getStats() {
    let rms = 0;
    let peak = 0;

    if (this.analyser) {
      const data = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        sumSquares += val * val;
        const absVal = Math.abs(val);
        if (absVal > peak) peak = absVal;
      }
      rms = Math.sqrt(sumSquares / data.length);
    }

    return {
      initialized: this.isInitialized,
      state: this.ctx ? this.ctx.state : 'uninitialized',
      activeVoices: this.activeVoices.size,
      bpm: this.bpm,
      comboLevel: this.comboLevel,
      inMultiball: this.inMultiball,
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      rms,
      peak,
      filterFrequency: this.dynamicFilter ? this.currentFilterFreq : 14000,
    };
  }
}

export const halloweenAudio = new HalloweenAudioEngine();

if (typeof window !== 'undefined') {
  (window as unknown as { __HALLOWEEN_AUDIO__: HalloweenAudioEngine }).__HALLOWEEN_AUDIO__ = halloweenAudio;
}
