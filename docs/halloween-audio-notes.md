# Halloween Synthesized Audio Engine Architecture & Sound Synthesis Notes

**Implementation:** [`lib/halloween-audio.ts`](file:///Users/mac/Chog-Swarm/lib/halloween-audio.ts)  
**Status:** Production-ready • 100% Procedural Web Audio API • 0 External Audio Files/Samples  
**Musical Key:** D Harmonic Minor ($D, E, F, G, A, B\flat, C\sharp$)  
**Base Tempo:** 92 BPM  

---

## 1. Core Web Audio Architecture & Master Chain

```
[Music Voices] ──> [Music Gain (0-1)] ──┐
                                        ├──> [Dynamic Low-pass Filter] ──┬──> [Dry Gain (0.78)] ─────────────┐
[SFX Voices]   ──> [SFX Gain (0-1)]   ──┘    (Drain sweep 350Hz-14kHz)   └──> [Convolver (Reverb)] ──> [Wet] ┼──> [Compressor] ──> [Soft Limiter] ──> [Master Gain] ──> [Destination]
```

1. **Lazy Singleton Initialization**:
   - `AudioContext` is never constructed or resumed during page load or script import.
   - Initialized upon first user gesture (`click`, `keydown`, or clicking the Navbar Audio toggle).
   - Zero browser autoplay warnings (`AudioContext was not allowed to start`).

2. **Reverb Convolver (1.8s Decay)**:
   - Synthesized stereo exponential noise impulse:
     $$h_L[i] = (2\cdot\text{rand}()-1) \cdot e^{-i \cdot 2.8 / N}$$
     $$h_R[i] = (2\cdot\text{rand}()-1) \cdot e^{-i \cdot 2.8 / N}$$
   - Wet gain: 0.22, Dry gain: 0.78.

3. **Dynamics Compressor & Soft Limiter**:
   - Compressor: threshold $-18\text{ dB}$, knee $8\text{ dB}$, ratio $3:1$, attack $3\text{ ms}$, release $250\text{ ms}$.
   - Limiter: `WaveShaperNode` with hyperbolic tangent transfer function:
     $$f(x) = \tanh(1.5x) \cdot 0.92$$
     Output peak is strictly bounded to $< 0.95$, preventing digital clipping and distortion.

4. **Polyphony Voice Stealing Manager (24 Voices)**:
   - Voice registry tracks active synthesis nodes.
   - When active voices reach 24, voice stealing terminates the oldest or lowest-priority voice using a 5ms anti-click exponential release.

5. **Tab Visibility Automation**:
   - `visibilitychange` listener fades master gain to 0 over 200ms and calls `ctx.suspend()`.
   - On tab return, calls `ctx.resume()` and fades volume back to user level over 300ms.

---

## 2. Generative Music Synthesis Formulas

The score operates via a lookahead timer loop running every 25ms, scheduling notes 140ms in advance onto 16th-note steps.

### Layer A: Crypt Organ Drone / Sub Pad
- **Frequencies**: $D_2 = 73.42\text{ Hz}$ and $A_2 = 110.00\text{ Hz}$, detuned by $\pm 7\text{ cents}$.
- **Waveform**: Sawtooth pair.
- **Filter**: 2nd-order Lowpass with cutoff $280\text{ Hz}$, $Q = 3.0$.
- **Cutoff Modulation**: Low Frequency Oscillator (LFO) at $0.12\text{ Hz}$, depth $120\text{ Hz}$:
  $$f_c(t) = 280 + 120 \sin(2\pi \cdot 0.12 \cdot t)\text{ Hz} \quad [160\text{ Hz} - 400\text{ Hz}]$$
- **Gain**: $0.12$ continuous.

### Layer B: Music Box / Celesta (Random Walk)
- **Scale Palette**: D Harmonic Minor ($D_4, E_4, F_4, G_4, A_4, B\flat_4, C\sharp_5, D_5, E_5, F_5, C\sharp_6$).
- **Waveform**: Triangle wave.
- **Envelope**:
  - Attack: Linear ramp from $0.0001$ to $0.09$ in $2\text{ ms}$.
  - Decay: Exponential decay to $0.0001$ over $350\text{ ms}$.
- **Pacing**: 8th notes by default; accelerates to 16th notes when Combo level $> 3$.

### Layer C: Heartbeat Kick
- **Timing**: Double thump at bar intervals (beat 1 and beat 1.5).
- **Pitch Sweep**: Exponential drop from $80\text{ Hz} \to 35\text{ Hz}$ over $60\text{ ms}$.
- **Envelope**:
  - Primary strike: Gain $0.16 \to 0.001$ over $80\text{ ms}$.
  - Secondary thump (220ms later): Gain $0.08 \to 0.001$ over $80\text{ ms}$.
- **Multiball Mode**: Transitions to driving four-on-the-floor continuous kick.

### Layer D: Ghostly Theremin Lead
- **Frequencies**: Slow sustained tones on $D_5, F_5, A_5, B\flat_5, C\sharp_6, D_6$.
- **Portamento Glide**: Exponential pitch ramp from $0.95 \cdot f_0 \to f_0$ over $120\text{ ms}$.
- **Vibrato LFO**: Sine wave at $5.5\text{ Hz}$, depth $18\text{ cents}$ ($f_0 \cdot 0.0104$).
- **Envelope**: $180\text{ ms}$ attack, $1.4\text{ s}$ sustain, $200\text{ ms}$ exponential release.

### Layer E: Distant Choir Pad
- **Enters**: Every 16 bars for a 4-bar passage.
- **Chord**: $D_4 (293.66\text{ Hz}), F_4 (349.23\text{ Hz}), A_4 (440.00\text{ Hz})$.
- **Vocal Formants**: Three parallel bandpass filters mimicking human vocal tracts at $800\text{ Hz}$ ('ah'), $1200\text{ Hz}$ ('oh'), and $2400\text{ Hz}$ ('ee') with $Q = 3.5$.

### Layer F: Cathedral Bell Toll
- **Timing**: Every 32 bars on the downbeat.
- **Partials (Inharmonic Ratios)**:
  - Fundamental: $1.00 \cdot f_0$ ($D_3 = 146.83\text{ Hz}$), Gain $0.12$.
  - Minor tierce: $2.76 \cdot f_0$ ($405.25\text{ Hz}$), Gain $0.08$.
  - Upper partial: $5.40 \cdot f_0$ ($792.88\text{ Hz}$), Gain $0.03$.
- **Decay**: $4\text{ ms}$ strike transient followed by $3.5\text{ s}$ exponential ring down.

---

## 3. Synthesized Sound Effects (SFX) Palette

| Effect | Synthesis Formula & Signal Chain | Trigger Event |
| :--- | :--- | :--- |
| **Flipper Tap** | Low impulse: Sine $90\text{ Hz} \to 30\text{ Hz}$ ($25\text{ ms}$) + High mechanical creak: bandpass filtered noise at $3.2\text{ kHz}$ ($Q=4.0, 12\text{ ms}$) | `flipper` |
| **Plunger Charge** | Ascending sine sweep ($110\text{ Hz} \to 440\text{ Hz}$ over $800\text{ ms}$) amplitude-modulated with a $20\text{ Hz}$ AM spring rattle | `plungerCharge` |
| **Plunger Release** | Frequency Modulation (FM): Carrier $220\text{ Hz} \to 130\text{ Hz}$, Modulator $440\text{ Hz}$, Mod Index $500 \to 5$ decaying over $250\text{ ms}$ (bone clack) | `plungerRelease` |
| **Pop Bumpers (3 pitches)** | Hollow pumpkin thump: Triangle $260/310/370\text{ Hz} \to 90/110/130\text{ Hz}$ ($80\text{ ms}$) + high snap ($4\text{ ms}$ noise burst) + eerie chime ($A_4, C\sharp_5, D_5$) | `bumper` (indices 0, 1, 2) |
| **Slingshot Kick** | Bone rattle: Filtered noise burst routed simultaneously through 3 parallel bandpass filters ($1.2\text{ kHz}, 2.4\text{ kHz}, 4.8\text{ kHz}$) with $Q=5.0$, decaying over $65\text{ ms}$ | `slingshot` |
| **Rollover Targets (C-H-O-G)** | Ascending D Harmonic Minor bells: $D_4 (293.66\text{ Hz}), F_4 (349.23\text{ Hz}), A_4 (440.00\text{ Hz}), C\sharp_5 (554.37\text{ Hz})$ ($280\text{ ms}$) | `rollover` |
| **Ghost Laugh** | FM cadence laugh: Sawtooth carrier falling $600\text{ Hz} \to 200\text{ Hz}$ over $1.1\text{ s}$, modulated by an $8\text{ Hz}$ vibrato (depth $70\text{ Hz}$) through a $1.1\text{ kHz}$ formant filter | `ghostLaugh` / `allRolloversComplete` |
| **Drain / Ball Lost** | Dynamic master low-pass filter plunges to $350\text{ Hz}$ (recovers over $700\text{ ms}$) + celesta descending glissando ($C\sharp_5 \to D_4$) + deep descending hollow saw ($180\text{ Hz} \to 45\text{ Hz}$) | `drain` |
| **Ghost Banish** | Ethereal high chord vocal choir burst ($1.2\text{ s}$) | `ghostBanish` |
| **Jackpot Fanfare** | Triumphant resolution in D Major: arpeggiated triangle fanfare ($D_4, F\sharp_4, A_4, D_5$) over $600\text{ ms}$ | `jackpot` |
| **UI Click / Hover** | Subtle bone click: Sine impulse at $2.8\text{ kHz}$, duration $8\text{ ms}$, gain $0.12$ | Menu clicks & toggles |
| **Graveyard Ambience** | Continuous wind bed: pink noise through bandpass filter ($550\text{ Hz}$) modulated by $0.08\text{ Hz}$ LFO + distant low thunder rumble ($80\text{ Hz} \to 35\text{ Hz}$ lowpass noise) every $25-40\text{ s}$ | Background atmospheric loop |

---

## 4. Game-Reactive Dynamic Music Logic

1. **Combo Acceleration**:
   - Base BPM: $92\text{ BPM}$.
   - When combo count $> 3$, tempo accelerates by $+4\%$ per hit up to a $+25\%$ ceiling ($115\text{ BPM}$).
   - Celesta arpeggio transitions from 8th-note to rapid 16th-note patterns.
   - Inactivity timer resets BPM smoothly back to $92\text{ BPM}$ after 4 seconds without combo hits.

2. **Multiball Modulation**:
   - Modulates key up a fourth from **D Harmonic Minor** to **G Harmonic Minor** ($G, A, B\flat, C, D, E\flat, F\sharp$).
   - Heartbeat kick switches from bar downbeats to continuous quarter-note drive.

3. **Drain Filter Envelope**:
   - Master music low-pass filter instantaneously drops to $350\text{ Hz}$, cutting high and mid frequencies to create a muffled underwater/tomb acoustics effect, then ramps back to $14\text{ kHz}$ over $700\text{ ms}$.
