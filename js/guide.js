/* ─────────────────────────────────────────────────────────────────────────
   guide.js — the little "what am I looking at?" dock.

   Every chapter page carries a compact legend in the bottom-right corner:
   what the room is, what each object does and what you are meant to click.
   It opens by default, folds to a single "?" button, and comes back with
   the button, the G key or a click on the tab.

   The point is that nobody has to guess: a visitor who has never seen the
   site should be able to read one card and know where everything is.
   ───────────────────────────────────────────────────────────────────────── */

const DOTS = ['#ff2a00', '#1f7fd6', '#ffc93c', '#ee8470', '#121216', '#7ab37a'];

let mounted = null;

/**
 * @param {object} opts
 * @param {string} opts.tag    e.g. '03 · ABOUT'
 * @param {string} opts.blurb  one sentence: what this room is
 * @param {Array<{name:string, what:string}>} opts.items  what is here + what it does
 * @param {boolean} [opts.compact]  start folded (for pages with a lot of HUD)
 */
export function mountGuide({ tag = 'GUIDE', blurb = '', items = [], compact = false, placement = 'br' } = {}){
  if (mounted) mounted.destroy();
  if (!items.length && !blurb) return null;

  /* a phone screen is too small to spare a card on first load: start folded */
  const narrow = window.innerWidth <= 820;
  const startFolded = compact || narrow;

  const wrap = document.createElement('aside');
  wrap.id = 'guide';
  wrap.className = 'pguide at-' + placement + (startFolded ? ' is-folded' : '');
  wrap.setAttribute('aria-label', 'Page guide');

  wrap.innerHTML = `
    <button class="pguide-tab" id="guideTab" aria-expanded="${!startFolded}" aria-controls="guideCard">
      <span class="q">?</span><span class="lbl">GUIDE</span>
    </button>
    <div class="pguide-card" id="guideCard" role="region">
      <header>
        <b>WHAT IS HERE</b>
        <span>${tag}</span>
        <button class="x" id="guideClose" aria-label="Close the guide">×</button>
      </header>
      ${blurb ? `<p class="g-blurb">${blurb}</p>` : ''}
      <ul class="g-list">
        ${items.map((it, i) => `
          <li>
            <i style="--c:${DOTS[i % DOTS.length]}"></i>
            <div><b>${it.name}</b><span>${it.what}</span></div>
          </li>`).join('')}
      </ul>
      <div class="g-foot">G · TOGGLE &nbsp;·&nbsp; ESC · CLOSE</div>
    </div>`;

  document.body.appendChild(wrap);

  const tab = wrap.querySelector('#guideTab');
  const close = wrap.querySelector('#guideClose');

  const set = (folded) => {
    wrap.classList.toggle('is-folded', folded);
    tab.setAttribute('aria-expanded', String(!folded));
  };
  const toggle = () => set(!wrap.classList.contains('is-folded'));

  tab.addEventListener('click', () => { toggle(); click(); });
  close.addEventListener('click', () => set(true));

  function click(){
    try { import('./audio.js').then((m) => m.Audio?.sfx?.('click')); } catch (e){ /* silent */ }
  }

  const onKey = (e) => {
    const t = e.target;
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === 'g' || e.key === 'G' || (e.key === '?')){ e.preventDefault(); toggle(); }
    if (e.key === 'Escape') set(true);
  };
  document.addEventListener('keydown', onKey);

  mounted = {
    destroy(){
      document.removeEventListener('keydown', onKey);
      wrap.remove();
      mounted = null;
    },
    fold: () => set(true),
    open: () => set(false),
  };
  return mounted;
}

/* the guide text for each room, kept next to the mount so the pages stay short */
export const GUIDES = {
  island: {
    tag: 'THE ISLAND',
    blurb: 'This is the 3D home — five zones on one island. Walk up to a door and click it.',
    items: [
      { name: 'You', what: 'WASD / arrows to walk · drag to look · shift to run' },
      { name: 'Project Gallery', what: 'signposted kiosk — opens the 13 builds' },
      { name: 'Skills / Arcade', what: 'the machine plays Coin Rush; the signs open Skills' },
      { name: 'About · Experience · Contact', what: 'the other three buildings' },
      { name: 'MAP', what: 'bottom-right button — jump straight to any zone' },
      { name: 'Claude', what: 'the coral cube follows you and explains things' },
    ],
  },
  story: {
    tag: 'CHAPTER ZERO',
    blurb: 'The gates are the front door. Nothing here is a trick — three ways in.',
    items: [
      { name: 'Step inside', what: 'ENTER or the yellow button — the doors open and you walk through' },
      { name: 'Skip to the island', what: 'jumps the gates if you just want the 3D world' },
      { name: 'Plain page', what: 'the flat version, no 3D at all' },
    ],
  },
  projects: {
    tag: '01 · PROJECTS',
    blurb: 'Thirteen builds. The three best sit on the podiums; the other ten hang on the wall.',
    items: [
      { name: 'Podium screens', what: 'top three — click for the full write-up' },
      { name: 'Wall screens', what: 'the other ten — all clickable' },
      { name: 'Drag / scroll', what: 'orbit and zoom the room' },
      { name: 'Back to world', what: 'bottom-left — returns to the island' },
    ],
  },
  skills: {
    tag: '02 · SKILLS',
    blurb: 'Twenty skills plus an open door. The colour is the honest level, and the number is the same thing in percent.',
    items: [
      { name: 'Red = core', what: 'used every week, confident' },
      { name: 'Blue = working', what: 'shipped something real with it' },
      { name: 'Yellow = foundations', what: 'coursework and practice, still learning' },
      { name: 'React · REST APIs', what: 'blue — used at Insight Fusion Analytics' },
      { name: 'Click a plaque', what: 'opens the percentage bar and what I built with it' },
    ],
  },
  about: {
    tag: '03 · ABOUT',
    blurb: 'One small room. Everything in it opens something — click the objects.',
    items: [
      { name: 'Monitor', what: 'who I am, in a paragraph' },
      { name: 'Bookshelf', what: 'what I am reading and learning' },
      { name: 'Whiteboard', what: 'how I work, step by step' },
      { name: 'Window', what: 'where I am — Mumbai' },
      { name: 'Painting + lamp', what: 'the small stuff: music, off-screen life' },
      { name: 'Claude', what: 'click him — he talks' },
    ],
  },
  quests: {
    tag: '04 · EXPERIENCE',
    blurb: 'The road so far, newest first. Click a sign to read it.',
    items: [
      { name: 'Insight Fusion Analytics', what: 'Full Stack Developer Intern · Nov 2025 – Apr 2026' },
      { name: 'Hudl', what: 'Sports Analyst · Jun – Sep 2026' },
      { name: 'IT support', what: 'volunteer — people, machines, fixing things' },
      { name: 'Video editing · AI tools · CCNA', what: 'self-directed, ongoing' },
    ],
  },
  contact: {
    tag: '05 · CONTACT',
    blurb: 'Mission control. The rocket is the form; the rest are direct lines.',
    items: [
      { name: 'LAUNCH', what: 'send a message from the pad' },
      { name: 'RÉSUMÉ', what: 'download the PDF' },
      { name: 'Direct lines', what: 'email, phone, LinkedIn, GitHub — all clickable' },
    ],
  },
};
