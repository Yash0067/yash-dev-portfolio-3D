/* ═══════════════════════════════════════════════════════════════════════════
   quality.js — adaptive quality + the FPS meter behind ?debug=1.

   Measures real frame time over a window and steps the scene down when the
   machine cannot hold the frame rate, back up when it can. Three levels:

     2 HIGH    shadows on, bloom 100%, DPR up to 2
     1 MEDIUM  shadows on (smaller), bloom 70%, DPR 1.5
     0 LOW     shadows off, bloom 45%, DPR 1

   Nothing here is allowed to throw: every hook is optional.
   ═══════════════════════════════════════════════════════════════════════════ */

export class Quality {
  /**
   * @param {object} o { renderer, bloom, sun, onLevel }
   */
  constructor({ renderer = null, bloom = null, sun = null, onLevel = null } = {}){
    this.renderer = renderer;
    this.bloom = bloom;
    this.sun = sun;
    this.onLevel = onLevel;

    this.level = 2;
    this.frames = 0;
    this.accum = 0;
    this.fps = 60;
    this.samples = [];
    this.sinceChange = 0;
    this.locked = false;        /* set by ?quality=high|low */
    this.baseline = { bloom: bloom?.strength ?? 0.3, dpr: Math.min(window.devicePixelRatio || 1, 2) };
    this.apply(this.level, true);
  }

  /** Call once per frame with the clamped dt. */
  tick(dt){
    this.frames++;
    this.accum += dt;
    this.sinceChange += dt;
    if (this.accum < 1){ return; }
    this.fps = this.frames / this.accum;
    this.frames = 0;
    this.accum = 0;
    this.samples.push(this.fps);
    if (this.samples.length > 6) this.samples.shift();

    if (this.locked) return;

    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    /* only act after two consistent windows, and never thrash */
    if (this.sinceChange > 2.5){
      if (avg < 42 && this.level > 0){ this.apply(this.level - 1); this.sinceChange = 0; }
      else if (avg > 57 && this.level < 2 && this.sinceChange > 6){ this.apply(this.level + 1); this.sinceChange = 0; }
    }
  }

  apply(level, silent = false){
    this.level = Math.max(0, Math.min(2, level));
    const L = this.level;

    /* pixel ratio — the single biggest lever on fill-rate */
    if (this.renderer){
      const dprCap = [1, 1.5, this.baseline.dpr][L];
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      this.renderer.shadowMap.enabled = L >= 1;
      /* force materials to recompile with/without shadows */
      this.renderer.shadowMap.needsUpdate = true;
    }

    /* bloom */
    if (this.bloom) this.bloom.strength = this.baseline.bloom * [0.45, 0.72, 1][L];

    /* sun shadow resolution */
    if (this.sun?.shadow){
      const size = [512, 1024, 2048][L];
      if (this.sun.shadow.mapSize.x !== size){
        this.sun.shadow.mapSize.set(size, size);
        if (this.sun.shadow.map){ this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
      }
      this.sun.castShadow = L >= 1;
    }

    document.documentElement.dataset.quality = ['low', 'medium', 'high'][L];
    if (!silent && this.onLevel) this.onLevel(this.level);
  }

  /** ?quality=high|medium|low pins a level for screenshots and tests. */
  pin(name){
    const map = { low: 0, medium: 1, high: 2 };
    if (!(name in map)) return;
    this.locked = true;
    this.apply(map[name]);
  }
}

/* ── tiny FPS meter, only mounted with ?debug=1 ──────────────────────────── */
export function createFpsMeter(){
  const el = document.createElement('div');
  el.className = 'fps-meter';
  el.textContent = '-- fps';
  document.body.appendChild(el);
  let frames = 0, acc = 0, worst = 0, best = 999;
  return {
    el,
    tick(dt){
      frames++; acc += dt;
      worst = Math.max(worst, dt);
      best = Math.min(best, dt);
      if (acc >= 0.5){
        const fps = frames / acc;
        el.textContent = `${fps.toFixed(0)} FPS · ${(1000 / fps).toFixed(1)} ms · low ${(1 / worst).toFixed(0)}`;
        el.dataset.fps = fps.toFixed(0);
        frames = 0; acc = 0; worst = 0; best = 999;
      }
    },
  };
}
