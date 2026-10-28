/* ═══════════════════════════════════════════════════════════════════════════
   tour.js — the guided first visit.
   A new visitor has no idea what any of this is. So the first time they step
   onto the island, Claude walks them through it: move, portals, the map, the
   chapter list, and where to ask for help again. Five cards, a spotlight over
   whatever is being explained, and a skip button that is always one tap away.

   No storage: the tour plays once per visit to the island, when the visitor
   arrives from Chapter Zero, and is replayable any time from the HELP button.
   ═══════════════════════════════════════════════════════════════════════════ */

import { $, isTouch, reducedMotion } from './ui.js';

const STEPS = [
  {
    sel: null,
    title: 'WELCOME TO THE ISLAND',
    body: `This is Yash's portfolio as a place instead of a page. Five doors, one
           developer, and a lot of grass. I will show you around in five taps —
           or skip me and just wander.`,
    label: '1 / 5',
  },
  {
    sel: isTouch ? '#stick' : '#hint',
    title: isTouch ? 'MOVE WITH THE STICK' : 'WALK WITH W A S D',
    body: isTouch
      ? 'Left thumb walks, JUMP button hops. Drag anywhere on the view to look around.'
      : 'W A S D walks, SHIFT runs, SPACE jumps. Drag the view with the mouse to look around. The camera only swings on its own while you are still.',
    label: '2 / 5',
  },
  {
    sel: null,
    title: 'THE RED RINGS ARE DOORS',
    body: 'Every building has a portal ring. Walk into one and press E, or just click the ring — it opens that chapter in a new tab. There are five: projects, skills, about, work experience and contact.',
    label: '3 / 5',
  },
  {
    sel: '#mapBtn',
    title: 'TAP MAP ANY TIME',
    body: 'A map of the island: where you are, which way you are facing, and which doors you have already opened. Click a marker to jump straight to that chapter.',
    label: '4 / 5',
  },
  {
    sel: '#doorsBtn',
    title: 'NOT IN THE MOOD TO WALK?',
    body: 'DOORS lists all five chapters as plain links. Whichever way you leave, BACK TO WORLD brings you right back here — same spot, same doors open.',
    label: '5 / 5',
  },
];

export function createTour({ onStart = null, onDone = null } = {}){
  /* one overlay for the whole session; the callbacks can be swapped per run */
  const hooks = { onStart, onDone };

  const el = document.createElement('div');
  el.id = 'tour';
  el.className = 'tour hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Guided tour of the island');
  el.innerHTML = `
    <div class="tour-ring" aria-hidden="true"></div>
    <div class="tour-card">
      <div class="tour-face" aria-hidden="true">
        <svg viewBox="0 0 72 72" role="img" aria-label="Claude" xmlns="http://www.w3.org/2000/svg">
  <rect width="72" height="72" fill="#fffdf7"/>
  <g stroke="#121216" stroke-width="3">
    <rect x="13" y="26" width="46" height="30" fill="#ee8470"/>
    <rect x="11" y="16" width="50" height="10" fill="#2f6fe0"/>
    <rect x="31" y="10" width="24" height="7" fill="#2558b8"/>
    <rect x="21" y="35" width="8" height="9" fill="#121216" stroke="none"/>
    <rect x="43" y="35" width="8" height="9" fill="#121216" stroke="none"/>
    <rect x="8" y="33" width="6" height="13" fill="#c9624d"/>
    <rect x="58" y="33" width="6" height="13" fill="#c9624d"/>
    <rect x="21" y="56" width="8" height="10" fill="#c9624d"/>
    <rect x="43" y="56" width="8" height="10" fill="#c9624d"/>
  </g>
</svg>
      </div>
      <div class="tour-body">
        <div class="tour-step"><span class="tour-num"></span><b>CLAUDE · THE TOUR</b></div>
        <h3 class="tour-title"></h3>
        <p class="tour-text"></p>
        <div class="tour-row">
          <button class="btn btn--primary tour-next" type="button">NEXT ▸</button>
          <button class="btn tour-skip" type="button">SKIP</button>
          <span class="tour-dots" aria-hidden="true"></span>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);

  const ring = $('.tour-ring', el);
  const titleEl = $('.tour-title', el);
  const textEl = $('.tour-text', el);
  const numEl = $('.tour-num', el);
  const nextBtn = $('.tour-next', el);
  const skipBtn = $('.tour-skip', el);
  const dots = $('.tour-dots', el);

  let i = 0;
  let open = false;

  STEPS.forEach(() => dots.appendChild(document.createElement('i')));

  function place(){
    const step = STEPS[i];
    const target = step.sel ? document.querySelector(step.sel) : null;
    const box = el.querySelector('.tour-card');
    el.classList.toggle('has-target', !!target);

    if (target){
      const r = target.getBoundingClientRect();
      const m = 10;
      Object.assign(ring.style, {
        left: (r.left - m) + 'px',
        top: (r.top - m) + 'px',
        width: (r.width + m * 2) + 'px',
        height: (r.height + m * 2) + 'px',
      });
      /* put the card below the ring when there is room, above when there is not */
      const below = r.bottom + 220 < innerHeight;
      box.style.top = below ? Math.min(innerHeight - 240, r.bottom + 26) + 'px' : '';
      box.style.bottom = below ? '' : Math.min(innerHeight - 240, innerHeight - r.top + 26) + 'px';
      box.classList.toggle('below', below);
      /* keep it inside the viewport horizontally */
      const want = Math.max(16, Math.min(innerWidth - 436, r.left + r.width / 2 - 210));
      box.style.left = want + 'px';
      box.style.transform = 'none';
    } else {
      ring.style.width = '0px';
      ring.style.height = '0px';
      box.style.top = '';
      box.style.bottom = '';
      box.style.left = '';
      box.style.transform = '';
      box.classList.remove('below');
    }
  }

  function show(n){
    i = Math.max(0, Math.min(STEPS.length - 1, n));
    const step = STEPS[i];
    titleEl.textContent = step.title;
    textEl.textContent = step.body.replace(/\s+/g, ' ').trim();
    numEl.textContent = step.label;
    nextBtn.textContent = i === STEPS.length - 1 ? 'START EXPLORING ▸' : 'NEXT ▸';
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k <= i));
    place();
  }

  function start(){
    if (open) return;
    open = true;
    el.classList.remove('hidden');
    document.body.classList.add('tour-open');
    hooks.onStart?.();
    show(0);
    nextBtn.focus({ preventScroll: true });
  }

  function stop(){
    if (!open) return;
    open = false;
    el.classList.add('hidden');
    document.body.classList.remove('tour-open');
    hooks.onDone?.();
  }

  function next(){
    if (i >= STEPS.length - 1){ stop(); return; }
    show(i + 1);
    /* a small nudge so the motion is not a jump-cut */
    if (!reducedMotion) el.classList.remove('bump'), void el.offsetWidth, el.classList.add('bump');
  }

  nextBtn.addEventListener('click', next);
  skipBtn.addEventListener('click', stop);
  el.addEventListener('pointerdown', (e) => { if (e.target === el) stop(); });
  addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape'){ e.preventDefault(); stop(); }
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight'){ e.preventDefault(); next(); }
  });
  addEventListener('resize', () => { if (open) place(); });

  return {
    start,
    stop,
    next,
    isOpen: () => open,
    set onStart(fn){ hooks.onStart = fn; },
    set onDone(fn){ hooks.onDone = fn; },
  };
}
