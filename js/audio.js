/* ═══════════════════════════════════════════════════════════════════════════
   audio.js — one original chiptune engine, shared by every page.
   Everything is synthesised at runtime with square / triangle / noise
   oscillators. There are no audio files and no borrowed melodies.

   Usage
     import { Audio } from './audio.js';
     Audio.unlock();               // call from the first real user gesture
     Audio.play('coin');
     Audio.startMusic();           // calm loop, speeds up at night
     Audio.setMuted(true); Audio.setVolume(0.5);
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── the visitor's sound choice, remembered across pages ────────────────────
   Pages are separate documents, so module state does not survive a door. The
   mute flag therefore travels in the URL: every link that leaves a page carries
   `?mute=1` (or `&mute=1`) while sound is off, and the next page starts muted.
   sessionStorage would be tidier, but this project deliberately avoids storage
   APIs, so the URL is the carrier.                                            */
const PARAMS = new URLSearchParams(location.search);
export const startMuted = PARAMS.get('mute') === '1';

/** Put the mute flag on any link / URL so the next page honours it. */
export function withMute(url){
  if (!Audio.muted) return url;
  try {
    const u = new URL(url, location.href);
    u.searchParams.set('mute', '1');
    /* absolute / already-qualified links keep their origin, page-relative ones stay relative */
    const external = /^(https?:)?\/\//i.test(url);
    return external ? u.href : (u.pathname.split('/').pop() || 'index.html') + u.search + u.hash;
  } catch (e){ return url; }
}

const NOTE = { C:0, 'C#':1, D:2, 'D#':3, E:4, F:5, 'F#':6, G:7, 'G#':8, A:9, 'A#':10, B:11 };

/** "A4" → 440, "C#5" → 554.37 … */
function freq(name){
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return 440;
  const semis = NOTE[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * Math.pow(2, (semis - 69) / 12);
}

/* ── the engine ──────────────────────────────────────────────────────────── */
class ChipEngine {
  constructor(){
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.muted = startMuted;
    this.volume = 0.65;
    this.night = false;
    this.musicOn = false;
    this._timer = null;
    this._step = 0;
    this._nextTime = 0;
    this._bpm = 96;
    this.started = false;
  }

  /* ----- lifecycle ------------------------------------------------------ */
  unlock(){
    if (this.ctx){
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = this.ctx = new AC();

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.34;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    /* a tiny echo so the chiptune does not sound dry */
    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.22;
    const fb = ctx.createGain(); fb.gain.value = 0.22;
    const wet = ctx.createGain(); wet.gain.value = 0.18;
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(this.master);
    this.echo = delay;

    this.started = true;
    return ctx;
  }

  setMuted(v){
    this.muted = !!v;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }
  setVolume(v){
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  /* ----- raw voices ----------------------------------------------------- */
  _env(gain, t, vol, attack, decay){
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  tone({ f = 440, f2 = null, type = 'square', t = 0, dur = 0.12, vol = 0.2, bus = null, glide = 0, echo = false }){
    if (!this.ctx) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.max(0, t);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, start);
    if (f2 && glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), start + glide);
    this._env(gain, start, vol, 0.008, dur);
    osc.connect(gain);
    gain.connect(bus || this.sfxBus);
    if (echo && this.echo) gain.connect(this.echo);
    osc.start(start);
    osc.stop(start + dur + 0.06);
  }

  noise({ t = 0, dur = 0.09, vol = 0.14, hp = 900, lp = 5200, bus = null }){
    if (!this.ctx) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.max(0, t);
    const len = Math.max(1, Math.floor(ctx.sampleRate * (dur + 0.05)));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hpF = ctx.createBiquadFilter(); hpF.type = 'highpass'; hpF.frequency.value = hp;
    const lpF = ctx.createBiquadFilter(); lpF.type = 'lowpass'; lpF.frequency.value = lp;
    const gain = ctx.createGain();
    this._env(gain, start, vol, 0.004, dur);
    src.connect(hpF); hpF.connect(lpF); lpF.connect(gain); gain.connect(bus || this.sfxBus);
    src.start(start); src.stop(start + dur + 0.05);
  }

  /* ----- game sounds (all original) ------------------------------------- */
  sfx(name){
    if (!this.ctx || this.muted) return;
    switch (name){
      case 'jump':
        this.tone({ f: 300, f2: 760, type: 'square', dur: 0.16, vol: 0.16, glide: 0.16 });
        break;
      case 'land':
        this.noise({ dur: 0.07, vol: 0.1, hp: 300, lp: 1600 });
        this.tone({ f: 180, f2: 90, type: 'triangle', dur: 0.1, vol: 0.12, glide: 0.1 });
        break;
      case 'coin':
        this.tone({ f: freq('E6'), dur: 0.06, vol: 0.14 });
        this.tone({ f: freq('B6'), dur: 0.12, vol: 0.13, t: 0.06, echo: true });
        break;
      case 'power':
        [0, .045, .09, .135, .18].forEach((t, i) =>
          this.tone({ f: freq(['C5','E5','G5','B5','E6'][i]), dur: 0.1, vol: 0.13, t }));
        break;
      case 'portal':
        this.tone({ f: 160, f2: 980, type: 'triangle', dur: 0.42, vol: 0.2, glide: 0.42, echo: true });
        this.noise({ dur: 0.42, vol: 0.12, hp: 500, lp: 7000 });
        this.tone({ f: 520, f2: 240, type: 'square', dur: 0.3, vol: 0.07, t: 0.12, glide: 0.3 });
        break;
      case 'step':
        this.noise({ dur: 0.045, vol: 0.055, hp: 700, lp: 3200 });
        break;
      case 'click':
        this.tone({ f: 900, f2: 1300, type: 'square', dur: 0.04, vol: 0.1, glide: 0.04 });
        break;
      case 'type':
        this.tone({ f: 520 + Math.random() * 240, type: 'square', dur: 0.024, vol: 0.05 });
        break;
      case 'achievement':
        /* short original fanfare: rising fifths then a held sparkle */
        ['C5','G5','C6','G5','C6','E6'].forEach((n, i) =>
          this.tone({ f: freq(n), dur: i === 5 ? 0.5 : 0.13, vol: 0.15, t: i * 0.115, echo: true }));
        this.tone({ f: freq('G4'), type: 'triangle', dur: 0.7, vol: 0.1, t: 0, echo: true });
        break;
      case 'konami':
        ['C5','D5','E5','G5','C6','E6','G6'].forEach((n, i) =>
          this.tone({ f: freq(n), dur: 0.11, vol: 0.12, t: i * 0.07 }));
        break;
      case 'error':
        this.tone({ f: 220, f2: 150, type: 'sawtooth', dur: 0.18, vol: 0.12, glide: 0.18 });
        break;
      case 'open':
        this.tone({ f: freq('A4'), dur: 0.08, vol: 0.12 });
        this.tone({ f: freq('E5'), dur: 0.12, vol: 0.1, t: 0.07 });
        break;
      case 'close':
        this.tone({ f: freq('E5'), dur: 0.08, vol: 0.1 });
        this.tone({ f: freq('A4'), dur: 0.12, vol: 0.1, t: 0.06 });
        break;
      default:
        this.tone({ f: 660, dur: 0.06, vol: 0.1 });
    }
  }

  /* ----- music: an original 16-step loop --------------------------------- */
  /* Am – F – C – G, arpeggio + bass + sparse melody. Calm by day,
     a couple of BPM faster and an octave brighter at night.            */
  get bpm(){ return this.night ? this._bpm + 12 : this._bpm; }

  startMusic(){
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this._step = 0;
    this._nextTime = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._scheduler(), 40);
  }
  stopMusic(){
    this.musicOn = false;
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
  setNight(v){
    if (this.night === !!v) return;
    this.night = !!v;
  }

  _scheduler(){
    if (!this.ctx || !this.musicOn) return;
    const spb = 60 / this.bpm / 4;                 // one 16th note
    while (this._nextTime < this.ctx.currentTime + 0.35){
      this._playStep(this._step, this._nextTime, spb);
      this._nextTime += spb;
      this._step = (this._step + 1) % 64;
    }
  }

  _playStep(step, when, spb){
    const t = when - this.ctx.currentTime;
    if (t < 0) return;
    const bar = Math.floor(step / 16) % 4;
    const song = [
      { root: 'A2', chord: ['A3','C4','E4','A4'] },   // Am
      { root: 'F2', chord: ['F3','A3','C4','F4'] },   // F
      { root: 'C3', chord: ['C4','E4','G4','C5'] },   // C
      { root: 'G2', chord: ['G3','B3','D4','G4'] },   // G
    ];
    const s = song[bar];
    const i = step % 16;

    /* bass: root on the beat, octave lift on the "and" */
    if (i % 4 === 0){
      this.tone({ f: freq(s.root), type: 'triangle', dur: spb * 3.6, vol: 0.5, t, bus: this.musicBus });
    } else if (i % 4 === 2){
      this.tone({ f: freq(s.root) * 2, type: 'triangle', dur: spb * 1.4, vol: 0.22, t, bus: this.musicBus });
    }

    /* arpeggio: quiet square pluck every other 16th */
    if (i % 2 === 0){
      const note = s.chord[(i / 2) % 4];
      this.tone({
        f: freq(note) * (this.night ? 2 : 1), type: 'square',
        dur: spb * 1.1, vol: 0.16, t, bus: this.musicBus, echo: true,
      });
    }

    /* melody: a sparse, hummable line over the chords */
    const melody = {
      0: 'E5', 3: 'D5', 6: 'C5', 8: 'B4', 12: 'A4',
      16: 'C5', 19: 'F5', 22: 'E5', 24: 'C5',
      32: 'E5', 35: 'G5', 38: 'E5', 40: 'D5',
      48: 'D5', 51: 'B4', 54: 'G4', 56: 'A4',
    };
    const n = melody[step];
    if (n && (this.night || i % 2 === 0)){
      this.tone({ f: freq(n), dur: spb * 2.2, vol: 0.1, t, bus: this.musicBus, echo: true });
    }

    /* a soft hat every 8th keeps time without being loud */
    if (i % 4 === 2) this.noise({ t, dur: 0.03, vol: 0.05, hp: 5200, lp: 12000, bus: this.musicBus });
  }
}

export const Audio = new ChipEngine();

/* convenience: unlock on the first gesture anywhere, then start the loop */
let armed = false;
export function armAudio(){
  if (armed) return;
  armed = true;
  const go = () => {
    Audio.unlock();
    Audio.startMusic();
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go, { once: true });
  window.addEventListener('keydown', go, { once: true });
}
