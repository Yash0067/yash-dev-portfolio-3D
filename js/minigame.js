/* ═══════════════════════════════════════════════════════════════════════════
   minigame.js — COIN RUSH, the cabinet in the Skill Arcade.
   A twenty-second catch-the-coins game that runs on one 2D canvas: pointer,
   touch and arrow keys all move the basket, and it pauses itself when the tab
   goes away. No storage, no libraries, no assets — every pixel is drawn here.
   ═══════════════════════════════════════════════════════════════════════════ */

import { Audio } from './audio.js';

const W = 480;
const H = 360;
const ROUND = 20;               /* seconds */

let instance = null;

export function openArcade(){
  if (instance) return instance.focus();
  if (document.getElementById('arcade')) return;

  const el = document.createElement('div');
  el.id = 'arcade';
  el.className = 'arcade';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Coin Rush mini game');
  el.innerHTML = `
    <div class="arcade-cab">
      <div class="arcade-marquee">
        <span class="arcade-title">COIN RUSH</span>
        <span class="arcade-sub">CATCH THE COINS · 20 SECONDS</span>
      </div>
      <div class="arcade-screen">
        <canvas class="arcade-canvas" width="${W}" height="${H}" aria-label="Coin Rush play field"></canvas>
        <div class="arcade-overlay">
          <h3 class="arcade-h">READY?</h3>
          <p class="arcade-p">Move with the mouse, your finger or ← →. Coins are worth 1, the red gems 5, the bombs cost you 3.</p>
          <button class="btn btn--primary arcade-start" type="button">INSERT COIN ▸</button>
        </div>
      </div>
      <div class="arcade-hud">
        <span>SCORE <b class="arcade-score">0</b></span>
        <span>TIME <b class="arcade-time">${ROUND}</b></span>
        <span>BEST <b class="arcade-best">0</b></span>
        <button class="btn btn--sm arcade-close" type="button">✕ LEAVE</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const canvas = el.querySelector('.arcade-canvas');
  const ctx = canvas.getContext('2d');
  const overlay = el.querySelector('.arcade-overlay');
  const hEl = el.querySelector('.arcade-h');
  const pEl = el.querySelector('.arcade-p');
  const startBtn = el.querySelector('.arcade-start');
  const scoreEl = el.querySelector('.arcade-score');
  const timeEl = el.querySelector('.arcade-time');
  const bestEl = el.querySelector('.arcade-best');

  let best = 0;
  let score = 0;
  let timeLeft = ROUND;
  let running = false;
  let raf = 0;
  let last = 0;
  let basketX = W / 2;
  let targetX = W / 2;
  let spawnT = 0;
  const drops = [];
  const keys = { left: false, right: false };

  const rand = (a, b) => a + Math.random() * (b - a);

  function spawn(){
    const r = Math.random();
    const kind = r < 0.16 ? 'gem' : r < 0.30 ? 'bomb' : 'coin';
    drops.push({
      x: rand(24, W - 24), y: -20,
      vy: rand(82, 150) + (ROUND - timeLeft) * 4.2,
      kind,
      spin: rand(0, Math.PI * 2),
    });
  }

  function reset(){
    score = 0; timeLeft = ROUND; drops.length = 0; spawnT = 0;
    basketX = targetX = W / 2;
    scoreEl.textContent = '0';
    timeEl.textContent = String(ROUND);
  }

  function begin(){
    reset();
    running = true;
    overlay.classList.add('hidden');
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function end(){
    running = false;
    cancelAnimationFrame(raf);
    if (score > best){ best = score; bestEl.textContent = String(best); }
    hEl.textContent = score >= 20 ? 'ARCADE LEGEND' : score >= 10 ? 'NICE RUN' : 'GOOD TRY';
    pEl.textContent = `You caught ${score} points. ${score >= best ? 'New personal best.' : 'The record is still ' + best + '.'}`;
    startBtn.textContent = 'PLAY AGAIN ▸';
    overlay.classList.remove('hidden');
    Audio.sfx(score >= 20 ? 'achievement' : 'click');
  }

  function frame(now){
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!running) return;

    timeLeft = Math.max(0, timeLeft - dt);
    timeEl.textContent = String(Math.ceil(timeLeft));

    /* basket: pointer wins, keys nudge */
    if (keys.left) targetX -= 380 * dt;
    if (keys.right) targetX += 380 * dt;
    targetX = Math.max(30, Math.min(W - 30, targetX));
    basketX += (targetX - basketX) * (1 - Math.exp(-14 * dt));

    spawnT -= dt;
    if (spawnT <= 0){ spawn(); spawnT = Math.max(0.16, 0.42 - (ROUND - timeLeft) * 0.011); }

    for (let i = drops.length - 1; i >= 0; i--){
      const d = drops[i];
      d.y += d.vy * dt;
      d.spin += dt * 5;
      const caught = d.y > H - 58 && d.y < H - 26 && Math.abs(d.x - basketX) < 30;
      if (caught){
        drops.splice(i, 1);
        if (d.kind === 'bomb'){ score = Math.max(0, score - 3); Audio.sfx('click'); }
        else { score += d.kind === 'gem' ? 5 : 1; Audio.sfx('coin'); }
        scoreEl.textContent = String(score);
      } else if (d.y > H + 30){
        drops.splice(i, 1);
      }
    }

    draw();
    if (timeLeft <= 0){ end(); return; }
    raf = requestAnimationFrame(frame);
  }

  function draw(){
    /* sky + floor, in the same paper-and-ink palette as the island */
    ctx.fillStyle = '#fbf8f1';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(18,18,22,.06)';
    ctx.lineWidth = 2;
    for (let y = 0; y < H; y += 24){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    /* basket */
    ctx.fillStyle = '#121216';
    ctx.fillRect(basketX - 32, H - 30, 64, 8);
    ctx.fillStyle = '#ff2a00';
    ctx.fillRect(basketX - 28, H - 44, 56, 16);
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(basketX - 20, H - 40, 40, 8);

    drops.forEach((d) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      if (d.kind === 'coin'){
        ctx.rotate(Math.sin(d.spin) * 0.35);
        ctx.fillStyle = '#ffc93c';
        ctx.fillRect(-11, -11, 22, 22);
        ctx.strokeStyle = '#121216'; ctx.lineWidth = 3;
        ctx.strokeRect(-11, -11, 22, 22);
        ctx.fillStyle = '#121216';
        ctx.fillRect(-3, -6, 6, 12);
      } else if (d.kind === 'gem'){
        ctx.rotate(d.spin * 0.6);
        ctx.fillStyle = '#2f9bff';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.strokeStyle = '#121216'; ctx.lineWidth = 3;
        ctx.strokeRect(-10, -10, 20, 20);
      } else {
        ctx.fillStyle = '#121216';
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff2a00';
        ctx.fillRect(-2, -12, 4, 8);
      }
      ctx.restore();
    });

    /* legend strip, so falling coins never sit on top of the key */
    ctx.fillStyle = 'rgba(251,248,241,.92)';
    ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = 'rgba(18,18,22,.10)';
    ctx.fillRect(0, 31, W, 1);
    ctx.fillStyle = 'rgba(18,18,22,.55)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('COIN +1', 14, 22);
    ctx.fillStyle = '#2f9bff';
    ctx.fillText('GEM +5', 110, 22);
    ctx.fillStyle = '#ff2a00';
    ctx.fillText('BOMB −3', 200, 22);
  }

  /* ── input ─────────────────────────────────────────────────────────────── */
  const pointerMove = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    targetX = Math.max(30, Math.min(W - 30, (x / r.width) * W));
  };
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('touchmove', (e) => { pointerMove(e); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchstart', (e) => { pointerMove(e); e.preventDefault(); }, { passive: false });

  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a'){ keys.left = true; e.preventDefault(); }
    if (k === 'arrowright' || k === 'd'){ keys.right = true; e.preventDefault(); }
    if (k === 'escape'){ close(); }
    if (k === 'enter' && !running){ e.preventDefault(); begin(); }
  };
  const onKeyUp = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.left = false;
    if (k === 'arrowright' || k === 'd') keys.right = false;
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKeyUp);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running){
      running = false;
      cancelAnimationFrame(raf);
      hEl.textContent = 'PAUSED';
      pEl.textContent = 'The cabinet paused itself. Press play to keep going.';
      startBtn.textContent = 'RESUME ▸';
      overlay.classList.remove('hidden');
      startBtn._resume = true;
    }
  });

  function close(){
    running = false;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    removeEventListener('keyup', onKeyUp);
    el.remove();
    instance = null;
  }

  startBtn.addEventListener('click', () => {
    Audio.unlock();
    Audio.sfx('power');
    if (startBtn._resume){ startBtn._resume = false; overlay.classList.add('hidden'); running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else begin();
  });
  el.querySelector('.arcade-close').addEventListener('click', close);
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });

  instance = { focus: () => {}, close };
  draw();
  return instance;
}

export function arcadeOpen(){ return !!document.getElementById('arcade'); }
