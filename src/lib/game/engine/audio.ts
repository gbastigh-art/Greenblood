// Procedural audio engine using Web Audio API.
// Generates all sounds in-code — no asset files needed.
// Subscribes to the game store's audioCue events.

export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  enabled = false;
  // Ambient layers
  windGain: GainNode | null = null;
  windSource: AudioBufferSourceNode | null = null;
  rainGain: GainNode | null = null;
  rainSource: AudioBufferSourceNode | null = null;
  fireGain: GainNode | null = null;
  fireSource: AudioBufferSourceNode | null = null;
  // Subscription
  unsub: (() => void) | null = null;
  // Last cue time to dedupe
  lastCueT = 0;
  lastFootstep = 0;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.enabled = true;
      this.startAmbient();
      // Subscribe to audio cues
      const store = (window as any).__GAME_STORE__;
      // We'll subscribe via the module-level import below
    } catch (e) {
      console.warn("AudioEngine init failed", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  // ============ Ambient layers ============
  private startAmbient() {
    if (!this.ctx || !this.master) return;
    // Wind — brown noise filtered
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.08;
    this.windGain.connect(this.master);
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.makeNoiseBuffer(2, "brown");
    this.windSource.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 400;
    this.windSource.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windSource.start();

    // Rain (silent until triggered)
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.connect(this.master);
    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = this.makeNoiseBuffer(2, "white");
    this.rainSource.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "highpass";
    rainFilter.frequency.value = 800;
    this.rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainSource.start();

    // Fire (silent until triggered)
    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.value = 0;
    this.fireGain.connect(this.master);
    this.fireSource = this.ctx.createBufferSource();
    this.fireSource.buffer = this.makeNoiseBuffer(2, "pink");
    this.fireSource.loop = true;
    const fireFilter = this.ctx.createBiquadFilter();
    fireFilter.type = "bandpass";
    fireFilter.frequency.value = 600;
    fireFilter.Q.value = 0.7;
    this.fireSource.connect(fireFilter);
    fireFilter.connect(this.fireGain);
    this.fireSource.start();
  }

  private makeNoiseBuffer(seconds: number, kind: "white" | "pink" | "brown"): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    if (kind === "white") {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } else if (kind === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buf;
  }

  // Update ambient layer volumes based on weather + proximity
  setAmbient(weather: string, nearFire: boolean) {
    if (!this.ctx || !this.windGain || !this.rainGain || !this.fireGain) return;
    const t = this.ctx.currentTime;
    const windTarget = weather === "blizzard" ? 0.35 : weather === "foggy" ? 0.18 : weather === "rainy" ? 0.15 : weather === "cloudy" ? 0.1 : 0.05;
    const rainTarget = weather === "rainy" ? 0.25 : weather === "blizzard" ? 0.05 : 0;
    const fireTarget = nearFire ? 0.15 : 0;
    this.windGain.gain.setTargetAtTime(windTarget, t, 0.5);
    this.rainGain.gain.setTargetAtTime(rainTarget, t, 0.5);
    this.fireGain.gain.setTargetAtTime(fireTarget, t, 0.3);
  }

  // ============ One-shot SFX ============
  private blip(opts: { freq: number; freqEnd?: number; dur: number; type?: OscillatorType; vol?: number; attack?: number; decay?: number }) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.freq, now);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), now + opts.dur);
    }
    const g = this.ctx.createGain();
    const vol = opts.vol ?? 0.3;
    const attack = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + opts.dur + 0.05);
  }

  private noiseBurst(opts: { dur: number; vol?: number; type?: "white" | "pink" | "brown"; filter?: "lowpass" | "highpass" | "bandpass"; filterFreq?: number; attack?: number }) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(opts.dur + 0.1, opts.type ?? "white");
    const g = this.ctx.createGain();
    const vol = opts.vol ?? 0.3;
    const attack = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
    if (opts.filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.value = opts.filterFreq ?? 1000;
      src.connect(f);
      f.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(this.master);
    src.start(now);
    src.stop(now + opts.dur + 0.05);
  }

  // ---- Specific cues ----
  chop() {
    this.noiseBurst({ dur: 0.18, vol: 0.4, type: "brown", filter: "lowpass", filterFreq: 600, attack: 0.002 });
    setTimeout(() => this.blip({ freq: 180, freqEnd: 80, dur: 0.12, type: "triangle", vol: 0.2 }), 30);
  }
  mine() {
    this.noiseBurst({ dur: 0.12, vol: 0.35, type: "white", filter: "bandpass", filterFreq: 2000, attack: 0.001 });
    this.blip({ freq: 900, freqEnd: 400, dur: 0.08, type: "square", vol: 0.15 });
  }
  swing() {
    this.noiseBurst({ dur: 0.18, vol: 0.15, type: "white", filter: "highpass", filterFreq: 1500, attack: 0.005 });
  }
  hit() {
    this.noiseBurst({ dur: 0.1, vol: 0.3, type: "brown", filter: "lowpass", filterFreq: 400, attack: 0.001 });
  }
  gunshot() {
    this.noiseBurst({ dur: 0.18, vol: 0.6, type: "white", filter: "lowpass", filterFreq: 1500, attack: 0.001 });
    this.blip({ freq: 200, freqEnd: 50, dur: 0.15, type: "sawtooth", vol: 0.3 });
  }
  pickup() {
    this.blip({ freq: 600, freqEnd: 900, dur: 0.1, type: "sine", vol: 0.2 });
    setTimeout(() => this.blip({ freq: 900, freqEnd: 1200, dur: 0.08, type: "sine", vol: 0.15 }), 60);
  }
  craft() {
    this.blip({ freq: 400, dur: 0.06, type: "square", vol: 0.15 });
    setTimeout(() => this.blip({ freq: 600, dur: 0.06, type: "square", vol: 0.15 }), 60);
    setTimeout(() => this.blip({ freq: 800, dur: 0.1, type: "square", vol: 0.15 }), 120);
  }
  place() {
    this.blip({ freq: 300, freqEnd: 200, dur: 0.08, type: "triangle", vol: 0.2 });
    this.noiseBurst({ dur: 0.08, vol: 0.15, type: "brown", filter: "lowpass", filterFreq: 300 });
  }
  footstep() {
    this.noiseBurst({ dur: 0.06, vol: 0.08, type: "brown", filter: "lowpass", filterFreq: 500, attack: 0.001 });
  }
  hurt() {
    this.blip({ freq: 220, freqEnd: 110, dur: 0.2, type: "sawtooth", vol: 0.25 });
  }
  death() {
    this.blip({ freq: 200, freqEnd: 50, dur: 1.2, type: "sawtooth", vol: 0.4 });
    setTimeout(() => this.blip({ freq: 150, freqEnd: 30, dur: 1.5, type: "triangle", vol: 0.3 }), 200);
  }
  eat() {
    this.blip({ freq: 300, dur: 0.05, type: "sine", vol: 0.15 });
    setTimeout(() => this.blip({ freq: 350, dur: 0.05, type: "sine", vol: 0.12 }), 60);
  }
  drink() {
    this.blip({ freq: 250, freqEnd: 350, dur: 0.2, type: "sine", vol: 0.15 });
  }
  uiClick() {
    this.blip({ freq: 800, dur: 0.03, type: "square", vol: 0.1 });
  }
  alert() {
    this.blip({ freq: 440, dur: 0.15, type: "square", vol: 0.2 });
    setTimeout(() => this.blip({ freq: 440, dur: 0.15, type: "square", vol: 0.2 }), 200);
  }
  wolfHowl() {
    this.blip({ freq: 300, freqEnd: 400, dur: 0.5, type: "sine", vol: 0.2 });
    setTimeout(() => this.blip({ freq: 400, freqEnd: 250, dur: 0.8, type: "sine", vol: 0.2 }), 400);
  }
  levelUp() {
    // Triumphant ascending arpeggio
    this.blip({ freq: 523, dur: 0.1, type: "sine", vol: 0.2 }); // C5
    setTimeout(() => this.blip({ freq: 659, dur: 0.1, type: "sine", vol: 0.2 }), 80); // E5
    setTimeout(() => this.blip({ freq: 784, dur: 0.1, type: "sine", vol: 0.2 }), 160); // G5
    setTimeout(() => this.blip({ freq: 1047, dur: 0.2, type: "sine", vol: 0.25 }), 240); // C6
    setTimeout(() => this.blip({ freq: 1319, dur: 0.3, type: "sine", vol: 0.2 }), 340); // E6
  }
  xpGain() {
    this.blip({ freq: 880, freqEnd: 1100, dur: 0.08, type: "sine", vol: 0.1 });
  }
  // Phase 11: Heartbeat — two-thump "lub-dub" using low-frequency sine oscillators
  heartbeat() {
    if (!this.ctx || !this.enabled) return;
    // First thump — louder, slightly longer
    this.blip({ freq: 60, freqEnd: 50, dur: 0.16, type: "sine", vol: 0.32, attack: 0.005 });
    // Second thump — softer, follows 140ms after
    setTimeout(() => {
      if (!this.ctx) return;
      this.blip({ freq: 55, freqEnd: 45, dur: 0.13, type: "sine", vol: 0.22, attack: 0.004 });
    }, 145);
  }

  // ---- Cue dispatcher ----
  handleCue(event: string) {
    switch (event) {
      case "chop": this.chop(); break;
      case "mine": this.mine(); break;
      case "swing": this.swing(); break;
      case "hit": this.hit(); break;
      case "gunshot": this.gunshot(); break;
      case "pickup": this.pickup(); break;
      case "craft": this.craft(); break;
      case "place": this.place(); break;
      case "footstep": this.footstep(); break;
      case "hurt": this.hurt(); break;
      case "death": this.death(); break;
      case "eat": this.eat(); break;
      case "drink": this.drink(); break;
      case "alert": this.alert(); break;
      case "wolfHowl": this.wolfHowl(); break;
      case "levelUp": this.levelUp(); break;
      case "xpGain": this.xpGain(); break;
      case "heartbeat": this.heartbeat(); break;
    }
  }

  dispose() {
    if (this.unsub) this.unsub();
    if (this.windSource) this.windSource.stop();
    if (this.rainSource) this.rainSource.stop();
    if (this.fireSource) this.fireSource.stop();
    if (this.ctx) this.ctx.close();
    this.ctx = null;
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
