/* ═══════════════════════════════════════════════════════════════════════════
   map.js — the island map.

   A live 2D canvas of the island in the corner of the screen:
     · the five portals, filled in once visited
     · the player as an arrow pointing where the camera looks
     · the plaza, the shoreline and north
     · click / tap a portal on the map to open that chapter

   It is drawn by hand on a 2D canvas — no extra library, no textures, no
   network — and it costs one clearRect + a dozen shapes per frame.
   ═══════════════════════════════════════════════════════════════════════════ */

const SIZE = 208;          /* panel size in CSS pixels */
const PAD = 14;
const R = (SIZE - PAD * 2) / 2;
const ISLAND_R = 30;       /* matches PLAY_RADIUS / island radius in world.js */

export function createMap({ getPlayer, getPortals, getVisited, getYaw, onPick } = {}){
  const el = document.createElement('div');
  el.className = 'map-panel';
  el.innerHTML = `
    <div class="map-head">
      <b>MAP</b>
      <span class="map-hint">M</span>
      <button type="button" class="map-close" aria-label="Close map">×</button>
    </div>
    <canvas class="map-canvas" width="${SIZE * 2}" height="${SIZE * 2}"></canvas>
    <div class="map-legend"><span class="dot done"></span>visited <span class="dot"></span>unvisited</div>
  `;
  document.body.appendChild(el);

  const canvas = el.querySelector('.map-canvas');
  const ctx = canvas.getContext('2d');
  const c = SIZE / 2;                  // centre, in the 2×-scaled drawing space
  const scale = (R - 6) / ISLAND_R;    // world units → map px

  let open = false;
  const toMap = (x, z) => [c + x * scale, c + z * scale];
  const fromMap = (px, py) => [(px - c) / scale, (py - c) / scale];

  function draw(){
    ctx.setTransform(2, 0, 0, 2, 0, 0);      // canvas is 2× for retina
    ctx.clearRect(0, 0, SIZE, SIZE);

    /* paper background */
    ctx.fillStyle = '#f7f4ec';
    ctx.fillRect(0, 0, SIZE, SIZE);

    /* shoreline */
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.fillStyle = '#e6edd8';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#121216';
    ctx.stroke();

    /* plaza */
    ctx.beginPath();
    ctx.arc(c, c, R * (7.2 / ISLAND_R), 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf7';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* the ring path */
    ctx.beginPath();
    ctx.arc(c, c, R * (19 / ISLAND_R), 0, Math.PI * 2);
    ctx.strokeStyle = '#ff2a00';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    /* portals */
    const portals = getPortals ? getPortals() : [];
    const visited = getVisited ? getVisited() : new Set();
    portals.forEach((p) => {
      const [px, py] = toMap(p.x, p.z);
      const done = visited.has(p.id);

      ctx.beginPath();
      ctx.arc(px, py, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = done ? '#ff2a00' : '#fffdf7';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#121216';
      ctx.stroke();

      if (!done){
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#2f6fe0';
        ctx.fill();
      }

      /* label, kept tiny and outside the marker */
      const SHORT = { projects: 'PROJECTS', skills: 'SKILLS', about: 'ABOUT', quests: 'WORK', contact: 'CONTACT' };
      const label = SHORT[p.id] || p.name.toUpperCase();
      ctx.font = '700 7px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#121216';
      const ly = py + (p.z < 0 ? -13 : 17);
      ctx.fillText(label, px, ly);
    });

    /* player arrow, pointing where the camera looks */
    const player = getPlayer ? getPlayer() : { x: 0, z: 0 };
    const yaw = getYaw ? getYaw() : 0;
    const [pX, pY] = toMap(player.x, player.z);

    ctx.save();
    ctx.translate(pX, pY);
    /* screen +Z is down; the camera looks along -Z at yaw 0, so the arrow
       points up when yaw = 0 */
    ctx.rotate(-yaw);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.4, 6);
    ctx.lineTo(0, 3.2);
    ctx.lineTo(-5.4, 6);
    ctx.closePath();
    ctx.fillStyle = '#121216';
    ctx.fill();
    ctx.strokeStyle = '#fffdf7';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    /* north */
    ctx.font = '700 8px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6d6d74';
    ctx.fillText('N', c, 11);
  }

  /* ── interaction: click a marker to open that chapter ─────────────────── */
  function pick(ev){
    const r = canvas.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (SIZE / r.width);
    const py = (ev.clientY - r.top) * (SIZE / r.height);
    const portals = getPortals ? getPortals() : [];
    let best = null, bestD = 16;
    portals.forEach((p) => {
      const [mx, my] = toMap(p.x, p.z);
      const d = Math.hypot(mx - px, my - py);
      if (d < bestD){ bestD = d; best = p; }
    });
    if (best && onPick) onPick(best);
  }
  canvas.addEventListener('click', pick);

  const close = () => setOpen(false);
  el.querySelector('.map-close').addEventListener('click', close);

  function setOpen(v){
    open = !!v;
    el.classList.toggle('open', open);
    document.documentElement.classList.toggle('map-open', open);
    if (open) draw();
  }

  return {
    el,
    open(){ return open; },
    toggle(){ setOpen(!open); },
    close,
    update(dt){
      /* redraw only while visible; 12 fps is plenty for a map */
      this._acc = (this._acc || 0) + dt;
      if (!open || this._acc < 1 / 12) return;
      this._acc = 0;
      draw();
    },
    draw,
    dispose(){
      el.remove();
      canvas.removeEventListener('click', pick);
    },
  };
}
