import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const STEMS_DIR = path.join(process.cwd(), 'assets/audio-stems');
fs.mkdirSync(STEMS_DIR, { recursive: true });

async function main() {
  console.log('Rendering procedural audio stems with OfflineAudioContext in Chromium...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  const stems = await page.evaluate(`(async () => {
    function bufferToWav(buffer) {
      const numOfChan = buffer.numberOfChannels;
      const length = buffer.length * numOfChan * 2 + 44;
      const out = new Uint8Array(length);
      const view = new DataView(out.buffer);
      const channels = [];
      let sampleRate = buffer.sampleRate;
      let offset = 0;
      let pos = 0;

      function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
      }
      function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
      }

      setUint32(0x46464952); // "RIFF"
      setUint32(length - 8);
      setUint32(0x45564157); // "WAVE"

      setUint32(0x20746d66); // "fmt "
      setUint32(16);
      setUint16(1); // PCM
      setUint16(numOfChan);
      setUint32(sampleRate);
      setUint32(sampleRate * 2 * numOfChan);
      setUint16(numOfChan * 2);
      setUint16(16); // 16-bit

      setUint32(0x61746164); // "data"
      setUint32(length - pos - 4);

      for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
      }

      while (offset < buffer.length) {
        for (let i = 0; i < numOfChan; i++) {
          let sample = Math.max(-1, Math.min(1, channels[i][offset]));
          sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
          view.setInt16(pos, sample, true);
          pos += 2;
        }
        offset++;
      }

      return Array.from(out);
    }

    const D_HARM = {
      D2: 73.42, A2: 110.00, D3: 146.83, F3: 174.61, G3: 196.00, A3: 220.00,
      Bb3: 233.08, Cs4: 277.18, D4: 293.66, E4: 329.63, F4: 349.23, A4: 440.00,
      Bb4: 466.16, Cs5: 554.37, D5: 587.33,
    };

    const results = {};

    // 1. MUSIC BED (18 seconds loop @ 92 BPM)
    {
      const duration = 18.0;
      const ctx = new OfflineAudioContext(2, 44100 * duration, 44100);

      const droneOsc1 = ctx.createOscillator();
      droneOsc1.type = 'sawtooth';
      droneOsc1.frequency.setValueAtTime(D_HARM.D2, 0);
      droneOsc1.detune.setValueAtTime(-7, 0);

      const droneOsc2 = ctx.createOscillator();
      droneOsc2.type = 'sawtooth';
      droneOsc2.frequency.setValueAtTime(D_HARM.A2, 0);
      droneOsc2.detune.setValueAtTime(7, 0);

      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(320, 0);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.18, 0);

      droneOsc1.connect(droneFilter);
      droneOsc2.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(ctx.destination);

      droneOsc1.start(0);
      droneOsc2.start(0);
      droneOsc1.stop(duration);
      droneOsc2.stop(duration);

      const stepDuration = 60 / 92 / 2;
      const bassNotes = [D_HARM.D2, D_HARM.D2, D_HARM.F3, D_HARM.D2, D_HARM.G3, D_HARM.D2, D_HARM.A2, D_HARM.Bb3];
      for (let t = 0; t < duration; t += stepDuration) {
        const step = Math.floor(t / stepDuration) % bassNotes.length;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bassNotes[step], t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + stepDuration);
      }

      const chimeNotes = [D_HARM.D4, D_HARM.F4, D_HARM.A4, D_HARM.Cs5, D_HARM.D5, D_HARM.Bb4, D_HARM.A4, D_HARM.F4];
      for (let t = 0.5; t < duration; t += stepDuration * 2) {
        const noteIdx = Math.floor(t / (stepDuration * 2)) % chimeNotes.length;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(chimeNotes[noteIdx], t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.65);
      }

      const rendered = await ctx.startRendering();
      results['music-bed'] = bufferToWav(rendered);
    }

    // 2. BUMPER
    {
      const ctx = new OfflineAudioContext(2, 44100 * 0.4, 44100);
      const thump = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thump.type = 'triangle';
      thump.frequency.setValueAtTime(310, 0);
      thump.frequency.exponentialRampToValueAtTime(110, 0.08);
      thumpGain.gain.setValueAtTime(0.4, 0);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, 0.08);
      thump.connect(thumpGain);
      thumpGain.connect(ctx.destination);
      thump.start(0);
      thump.stop(0.1);

      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(554.37, 0);
      chimeGain.gain.setValueAtTime(0.2, 0);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, 0.35);
      chime.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chime.start(0);
      chime.stop(0.35);

      const rendered = await ctx.startRendering();
      results['bumper'] = bufferToWav(rendered);
    }

    // 3. ROLLOVER
    {
      const ctx = new OfflineAudioContext(2, 44100 * 0.5, 44100);
      const bell = ctx.createOscillator();
      const gain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(880, 0);
      gain.gain.setValueAtTime(0.25, 0);
      gain.gain.exponentialRampToValueAtTime(0.001, 0.45);
      bell.connect(gain);
      gain.connect(ctx.destination);
      bell.start(0);
      bell.stop(0.45);

      const rendered = await ctx.startRendering();
      results['rollover'] = bufferToWav(rendered);
    }

    // 4. DRAIN
    {
      const ctx = new OfflineAudioContext(2, 44100 * 1.0, 44100);
      const groan = ctx.createOscillator();
      const groanGain = ctx.createGain();
      groan.type = 'sawtooth';
      groan.frequency.setValueAtTime(180, 0);
      groan.frequency.exponentialRampToValueAtTime(45, 0.8);
      const groanFilter = ctx.createBiquadFilter();
      groanFilter.type = 'lowpass';
      groanFilter.frequency.setValueAtTime(420, 0);

      groanGain.gain.setValueAtTime(0.35, 0);
      groanGain.gain.exponentialRampToValueAtTime(0.001, 0.8);
      groan.connect(groanFilter);
      groanFilter.connect(groanGain);
      groanGain.connect(ctx.destination);
      groan.start(0);
      groan.stop(0.85);

      const rendered = await ctx.startRendering();
      results['drain'] = bufferToWav(rendered);
    }

    // 5. JACKPOT
    {
      const ctx = new OfflineAudioContext(2, 44100 * 1.2, 44100);
      const notes = [293.66, 369.99, 440.00, 587.33];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.65);
      });

      const rendered = await ctx.startRendering();
      results['jackpot'] = bufferToWav(rendered);
    }

    // 6. UI TICK
    {
      const ctx = new OfflineAudioContext(2, 44100 * 0.1, 44100);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2800, 0);
      gain.gain.setValueAtTime(0.2, 0);
      gain.gain.exponentialRampToValueAtTime(0.001, 0.012);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.02);

      const rendered = await ctx.startRendering();
      results['ui-tick'] = bufferToWav(rendered);
    }

    // 7. FLIPPER
    {
      const ctx = new OfflineAudioContext(2, 44100 * 0.2, 44100);
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(90, 0);
      thud.frequency.exponentialRampToValueAtTime(30, 0.03);
      thudGain.gain.setValueAtTime(0.4, 0);
      thudGain.gain.exponentialRampToValueAtTime(0.001, 0.03);
      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(0);
      thud.stop(0.04);

      const rendered = await ctx.startRendering();
      results['flipper'] = bufferToWav(rendered);
    }

    return results;
  })()`) as Record<string, number[]>;

  for (const [name, bytes] of Object.entries(stems)) {
    const filePath = path.join(STEMS_DIR, `${name}.wav`);
    fs.writeFileSync(filePath, Buffer.from(bytes));
    console.log(`✓ Rendered stem: ${filePath} (${bytes.length} bytes)`);
  }

  await browser.close();
  console.log('All 7 audio stems successfully rendered!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
