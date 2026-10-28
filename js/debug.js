/* ═══════════════════════════════════════════════════════════════════════════
   debug.js — the developer panel, mounted only with ?debug=1.

   Shows: frame rate and frame time, triangle and draw-call counts, the state of
   every model slot (real GLB or procedural fallback), the current quality
   level with manual overrides, and a one-click jump to every chapter.

   It is deliberately dependency-light: if a hook is missing, the row is just
   omitted. The panel can never break the page.
   ═══════════════════════════════════════════════════════════════════════════ */

export function initDebugPanel({ renderer = null, models = null, quality = null, camera = null, scene = null } = {}){
  if (!new URLSearchParams(location.search).has('debug')) return null;

  const el = document.createElement('div');
  el.className = 'debug-panel';
  el.innerHTML = `
    <div class="dbg-head">
      <b>DEBUG</b>
      <span id="dbgFps">--</span>
      <button type="button" id="dbgHide" aria-label="Hide debug panel">×</button>
    </div>
    <div class="dbg-grid">
      <span>frame</span><b id="dbgMs">--</b>
      <span>quality</span><b id="dbgQ">--</b>
      <span>tris</span><b id="dbgTris">--</b>
      <span>calls</span><b id="dbgCalls">--</b>
      <span>camera</span><b id="dbgCam">--</b>
    </div>
    <div class="dbg-sec">
      <b>QUALITY</b>
      <div class="dbg-row">
        <button type="button" data-q="auto">auto</button>
        <button type="button" data-q="high">high</button>
        <button type="button" data-q="medium">medium</button>
        <button type="button" data-q="low">low</button>
      </div>
    </div>
    <div class="dbg-sec">
      <b>CHAPTERS</b>
      <div class="dbg-row dbg-links">
        <a href="story.html">00 gates</a>
        <a href="projects.html">01 projects</a>
        <a href="skills.html">02 skills</a>
        <a href="about.html">03 about</a>
        <a href="quests.html">04 quests</a>
        <a href="contact.html">05 contact</a>
        <a href="index-2d.html">plain</a>
      </div>
    </div>
    <div class="dbg-sec">
      <b>MODELS</b>
      <div id="dbgModels" class="dbg-models">—</div>
    </div>
    <label class="dbg-toggle"><input type="checkbox" id="dbgSlow"> slow-motion (0.25×)</label>
  `;
  document.body.appendChild(el);

  el.querySelector('#dbgHide').addEventListener('click', () => { el.style.display = 'none'; });

  el.querySelectorAll('[data-q]').forEach((b) => {
    b.addEventListener('click', () => {
      const q = b.dataset.q;
      if (!quality) return;
      if (q === 'auto'){ quality.locked = false; quality.apply(quality.level); }
      else quality.pin(q);
      el.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
    });
  });

  const fpsEl = el.querySelector('#dbgFps');
  const msEl = el.querySelector('#dbgMs');
  const qEl = el.querySelector('#dbgQ');
  const trisEl = el.querySelector('#dbgTris');
  const callsEl = el.querySelector('#dbgCalls');
  const camEl = el.querySelector('#dbgCam');
  const modelsEl = el.querySelector('#dbgModels');

  const now = () => performance.now();
  let frames = 0, last = now(), worst = 0;
  const slowBox = el.querySelector('#dbgSlow');

  return {
    /** true when the panel asks for slow motion, so the loop can scale dt */
    get slowmo(){ return slowBox.checked; },

    tick(){
      frames++;
      const t = now();
      const span = t - last;
      if (span >= 500){
        const fps = (frames * 1000) / span;
        fpsEl.textContent = `${fps.toFixed(0)} fps`;
        msEl.textContent = `${(span / frames).toFixed(1)} ms (worst ${worst.toFixed(1)})`;
        if (quality) qEl.textContent = ['low', 'medium', 'high'][quality.level] + (quality.locked ? ' (pinned)' : '');
        if (renderer){
          trisEl.textContent = renderer.info.render.triangles.toLocaleString();
          callsEl.textContent = renderer.info.render.calls;
        }
        if (camera) camEl.textContent = `${camera.position.x.toFixed(0)},${camera.position.y.toFixed(0)},${camera.position.z.toFixed(0)}`;
        if (models){
          const list = models.list || [];
          modelsEl.innerHTML = list.length
            ? list.map((m) => `<span class="${m.fallback ? 'fb' : 'glb'}">${m.fallback ? '○' : '●'} ${m.id}</span>`).join('')
            : 'no models';
        }
        frames = 0; last = t; worst = 0;
      }
    },
  };
}
