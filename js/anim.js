/* ═══════════════════════════════════════════════════════════════════════════
   anim.js — the animation kit everything else uses.

   One rule: nothing in this project may snap. Every value that changes does so
   through a curve, a spring or a damped interpolation, and every one of those
   is driven by delta time so 60 Hz and 144 Hz look the same.

   Contents
     1 · math        clamp, lerp, damp, dampAngle, shortest angle
     2 · easing      linear, easeInOutCubic, easeOutBack, easeOutCubic, …
     3 · springs     critically damped spring (no overshoot, no jitter)
     4 · tweens      one manager, replace-by-key so two tweens never fight
     5 · states      weighted state blending with a 0.2 s cross-fade
     6 · transition  full-screen fade/wipe between chapters
   ═══════════════════════════════════════════════════════════════════════════ */

import { withMute } from './audio.js';

/* ── 1 · math ────────────────────────────────────────────────────────────── */
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing. k = "how fast", ~4 slow, ~14 snappy. */
export const damp = (value, target, k, dt) => target + (value - target) * Math.exp(-k * dt);

/** Wrap any angle into -PI…PI. */
export const wrapAngle = (a) => {
  let x = (a + Math.PI) % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x - Math.PI;
};

/** Damped rotation that always takes the short way round. */
export const dampAngle = (value, target, k, dt) => value + wrapAngle(target - value) * (1 - Math.exp(-k * dt));

/* ── 2 · easing ──────────────────────────────────────────────────────────── */
export const Ease = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t) => t * t * t,
  easeOutBack: (t) => {
    const c = 1.70158, c3 = c + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

/* ── 3 · springs ─────────────────────────────────────────────────────────── */
/**
 * Critically damped spring towards a moving target. This is what Claude's
 * follow uses: smooth trail, no oscillation, no clipping through the player.
 * Returns the new position and velocity via the object you pass in.
 */
export function springStep(state, target, { stiffness = 90, damping = 2 * Math.sqrt(90), dt = 0.016, maxSpeed = 30 } = {}) {
  const dx = target.x - state.x;
  const dz = target.z - state.z;
  /* spring force + damping, integrated semi-implicitly */
  let ax = stiffness * dx - damping * state.vx;
  let az = stiffness * dz - damping * state.vz;
  state.vx += ax * dt;
  state.vz += az * dt;
  const speed = Math.hypot(state.vx, state.vz);
  if (speed > maxSpeed){
    state.vx = (state.vx / speed) * maxSpeed;
    state.vz = (state.vz / speed) * maxSpeed;
  }
  state.x += state.vx * dt;
  state.z += state.vz * dt;
  return state;
}

/* ── 4 · tweens ──────────────────────────────────────────────────────────── */
/**
 * A single manager for every timed animation.
 * `add({ key })` replaces any live tween with the same key, so a second
 * animation can never fight the first one on the same property.
 */
class TweenManager {
  constructor(){
    this.list = [];
    this.time = 0;
  }

  /**
   * @param {object} o { key, from, to, dur, ease, onUpdate, onDone, delay }
   *   from/to may be numbers or plain {x,y,z} objects.
   */
  add(o){
    const tween = {
      key: o.key || null,
      from: o.from,
      to: o.to,
      dur: Math.max(0.0001, o.dur ?? 0.4),
      ease: o.ease || Ease.easeInOutCubic,
      onUpdate: o.onUpdate || null,
      onDone: o.onDone || null,
      delay: o.delay || 0,
      t: 0,
      live: true,
    };
    if (tween.key) this.cancel(tween.key);
    this.list.push(tween);
    return tween;
  }

  cancel(key){
    if (!key) return false;
    let hit = false;
    this.list.forEach((tw) => { if (tw.key === key){ tw.live = false; hit = true; } });
    this.list = this.list.filter((tw) => tw.live);
    return hit;
  }

  has(key){ return this.list.some((tw) => tw.key === key); }

  update(dt){
    this.time += dt;
    for (const tw of this.list){
      if (!tw.live) continue;
      if (tw.delay > 0){ tw.delay -= dt; continue; }
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = tw.ease(tw.t);
      if (tw.onUpdate) tw.onUpdate(mix(tw.from, tw.to, k), k, tw.t);
      if (tw.t >= 1){
        tw.live = false;
        if (tw.onDone) tw.onDone();
      }
    }
    this.list = this.list.filter((tw) => tw.live);
  }

  clear(){ this.list = []; }
}

function mix(a, b, k){
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
  if (a && b && typeof a === 'object'){
    const out = {};
    for (const key in b){
      out[key] = typeof b[key] === 'number' && typeof a[key] === 'number'
        ? a[key] + (b[key] - a[key]) * k
        : b[key];
    }
    return out;
  }
  return k < 1 ? a : b;
}

export const tweens = new TweenManager();

/* ── 5 · state blending ──────────────────────────────────────────────────── */
/**
 * A tiny stand-in for AnimationMixer's cross-fade: named states, weighted
 * blend, 0.2 s fade. Claude is procedural boxes, so instead of clips we blend
 * "poses"; the interface is the same shape as a mixer's.
 */
export class StateBlend {
  constructor(names = [], { fade = 0.2 } = {}){
    this.fade = fade;
    this.w = Object.fromEntries(names.map((n) => [n, 0]));
    this.current = names[0] || null;
    if (this.current) this.w[this.current] = 1;
  }

  play(name){
    if (!(name in this.w)) this.w[name] = 0;
    if (this.current === name) return;
    this.current = name;
  }

  /** @returns {object} weights that sum to 1 */
  update(dt){
    const active = this.current;
    let total = 0;
    for (const n in this.w){
      const target = n === active ? 1 : 0;
      this.w[n] += (target - this.w[n]) * (1 - Math.exp(-(1 / this.fade) * 3 * dt));
      if (this.w[n] < 0.001) this.w[n] = 0;
      total += this.w[n];
    }
    if (total > 0) for (const n in this.w) this.w[n] /= total;
    return this.w;
  }

  get(name){ return this.w[name] || 0; }
}

/* ── 6 · screen transition ───────────────────────────────────────────────── */
/**
 * Fade / wipe between chapters. Uses the #fade element when present, and
 * falls back to a hard timeout so navigation can never be blocked by a
 * missing element (a dead end is worse than a cut).
 */
export function transitionTo(url, { wipe = true, ms = 320 } = {}){
  /* sound is a per-page thing: carry the visitor's choice across the door */
  const href = withMute(url);
  const el = document.getElementById('fade');
  if (!el){ location.href = href; return; }
  el.classList.toggle('wipe', wipe);
  el.classList.add('on');
  setTimeout(() => { location.href = href; }, ms);
}

/** Fade the black cover away on page load. */
export function revealOnLoad(){
  const el = document.getElementById('fade');
  if (!el) return;
  el.classList.add('on');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.remove('on'));
  });
  /* belt and braces: never leave the cover up if rAF is throttled */
  setTimeout(() => el.classList.remove('on'), 1200);
}

/* ── idle tracking ───────────────────────────────────────────────────────────
   The slow showcase orbit (the title flyover, each chapter's auto-rotate) is a
   "nobody is touching this" behaviour. Any pointer, key, wheel or scroll marks
   the visitor as active: the orbit eases to a full stop while they are, and
   eases back in after a short quiet spell. One helper, used everywhere.     */
export function createIdle({ quiet = 2.4, ease = 2.2 } = {}){
  let last = performance.now();
  let k = 1;
  const bump = () => { last = performance.now(); };
  const events = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart', 'scroll'];
  const opts = { passive: true };
  events.forEach((e) => addEventListener(e, bump, opts));
  return {
    bump,
    /** 0 = busy, 1 = still for `quiet` seconds. Multiply the orbit speed by it. */
    tick(dt){
      const want = (performance.now() - last) / 1000 > quiet ? 1 : 0;
      k += (want - k) * (1 - Math.exp(-ease * dt));
      if (k < 0.002) k = 0;
      return k;
    },
    get value(){ return k; },
    dispose(){ events.forEach((e) => removeEventListener(e, bump, opts)); },
  };
}
