/* ═══════════════════════════════════════════════════════════════════════════
   ui.js — DOM layer shared by all pages: panels, toasts, achievements,
   dialogue typing, sound controls, loading bar, focus handling, button SFX.
   It knows nothing about three.js.
   ═══════════════════════════════════════════════════════════════════════════ */

import { Audio, withMute } from './audio.js';
import { GUIDE_NAME } from './content.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const isTouch = () => matchMedia('(pointer: coarse)').matches;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const params = () => new URLSearchParams(location.search);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── toast ───────────────────────────────────────────────────────────────── */
let toastTimer = null;
export function toast(message, ms = 2400){
  let el = $('#toast');
  if (!el){
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

/* ── achievement popup ───────────────────────────────────────────────────── */
export function showAchievement({ tag = 'ACHIEVEMENT UNLOCKED', title, text = '', cta = null } = {}){
  const old = $('#achievement');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'achievement';
  el.setAttribute('role', 'alertdialog');
  el.innerHTML = `
    <span class="tag">${esc(tag)}</span>
    <h3>${esc(title)}</h3>
    ${text ? `<p>${esc(text)}</p>` : ''}
    <div class="btns">
      ${cta ? `<a class="btn btn--sm btn--primary" href="${cta.href}" ${cta.external ? 'target="_blank" rel="noopener"' : ''}>${esc(cta.label)}</a>` : ''}
      <button class="btn btn--sm" data-close>NICE</button>
    </div>`;
  document.body.appendChild(el);
  Audio.sfx('achievement');
  const close = () => el.remove();
  el.querySelector('[data-close]').addEventListener('click', () => { Audio.sfx('click'); close(); });
  setTimeout(close, 7000);
  return el;
}

/* ── panels (used by every page for detail views) ────────────────────────── */
let panelEl = null;
let lastFocus = null;

function ensurePanel(){
  if (panelEl) return panelEl;
  const backdrop = document.createElement('div');
  backdrop.className = 'panel-backdrop hidden';
  backdrop.id = 'panelBackdrop';
  backdrop.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-labelledby="panelTitle">
      <header>
        <h2 id="panelTitle">PANEL</h2>
        <button class="x" data-panel-close aria-label="Close panel">ESC ✕</button>
      </header>
      <div class="scroll" id="panelBody"></div>
      <footer><span id="panelFoot">YASH.DEV</span><span>ESC TO CLOSE</span></footer>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-panel-close]')) closePanel();
  });
  panelEl = backdrop;
  return backdrop;
}

export function openPanel({ title = 'INFO', body = '', footer = 'YASH.DEV', onMount = null } = {}){
  const backdrop = ensurePanel();
  lastFocus = document.activeElement;
  $('#panelTitle', backdrop).textContent = title;
  $('#panelBody', backdrop).innerHTML = body;
  $('#panelFoot', backdrop).textContent = footer;
  backdrop.classList.remove('hidden');
  Audio.sfx('open');
  const scroll = $('#panelBody', backdrop);
  scroll.scrollTop = 0;
  /* animate any skill bars that were just injected */
  requestAnimationFrame(() => {
    $$('.bar .t i', scroll).forEach((bar) => {
      const w = bar.dataset.w || '100%';
      bar.style.width = w;
    });
  });
  const closeBtn = backdrop.querySelector('[data-panel-close]');
  closeBtn.focus({ preventScroll: true });
  if (onMount) onMount(scroll, backdrop);
  return backdrop;
}

export function closePanel(){
  if (!panelEl || panelEl.classList.contains('hidden')) return;
  panelEl.classList.add('hidden');
  Audio.sfx('close');
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

export function panelIsOpen(){
  return !!panelEl && !panelEl.classList.contains('hidden');
}

/* esc closes whatever is open */
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && panelIsOpen()) closePanel();
});

/* ── dialogue typing ─────────────────────────────────────────────────────── */
export function createDialogue(root){
  const el = root;
  const txt = $('.txt', el);
  const who = $('.who', el);
  let timer = null;
  return {
    show(name, text, { cps = 42, onDone = null, speak: shouldSpeak = true } = {}){
      who.textContent = name;
      /* the portrait shows the guide; other speakers keep the badge */
      const face = $('.face', el);
      if (face) face.dataset.speaker = name === GUIDE_NAME ? 'guide' : 'other';
      if (shouldSpeak) speak(text);
      el.classList.remove('hidden');
      clearInterval(timer);
      let i = 0;
      txt.textContent = '';
      timer = setInterval(() => {
        i++;
        txt.textContent = text.slice(0, i);
        if (i % 3 === 0) Audio.sfx('type');
        if (i >= text.length){ clearInterval(timer); timer = null; onDone && onDone(); }
      }, 1000 / cps);
    },
    /** Small branching choice. The story stays linear; this only picks the order. */
    choose(name, text, options, onPick){
      who.textContent = name;
      const face = $('.face', el);
      if (face) face.dataset.speaker = name === GUIDE_NAME ? 'guide' : 'other';
      speak(text);
      el.classList.remove('hidden');
      txt.textContent = text;
      const row = $('.choices', el);
      if (row){
        row.innerHTML = '';
        row.classList.remove('hidden');
        options.forEach((opt) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn btn--sm';
          b.textContent = opt;
          b.addEventListener('click', () => {
            row.classList.add('hidden');
            Audio.sfx('click');
            onPick(opt);
          });
          row.appendChild(b);
        });
      }
    },
    finish(){
      if (timer){ clearInterval(timer); timer = null; return true; }
      return false;
    },
    hide(){ clearInterval(timer); timer = null; el.classList.add('hidden'); },
    get isTyping(){ return !!timer; },
    get text(){ return txt.textContent; },
  };
}

/* ── read aloud (Web Speech API) — OFF by default ────────────────────────── */
const speech = { on: false, voice: null, supported: 'speechSynthesis' in window };
if (speech.supported){
  const pick = () => {
    const vs = window.speechSynthesis.getVoices();
    speech.voice = vs.find((v) => /en-GB|en-US|en-IN/.test(v.lang)) || vs[0] || null;
  };
  pick();
  window.speechSynthesis.onvoiceschanged = pick;
}
export function isReadAloud(){ return speech.on; }
export function setReadAloud(on){
  speech.on = !!on && speech.supported;
  if (!speech.on && speech.supported) window.speechSynthesis.cancel();
  document.body.classList.toggle('read-aloud', speech.on);
  return speech.on;
}
export function speak(text, { rate = 1, pitch = 1.08 } = {}){
  if (!speech.on || !speech.supported || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (speech.voice) u.voice = speech.voice;
    u.rate = rate; u.pitch = pitch; u.volume = 0.95;
    window.speechSynthesis.speak(u);
  } catch (e){ /* never let audio break the scene */ }
}

/* ── sound controls (mute + volume), injected into any .sound-box ────────── */
export function bindSoundControls(){
  const boxes = $$('.sound-box');
  if (!boxes.length) return;
  boxes.forEach((box) => {
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    box.innerHTML = `
      <button type="button" data-mute aria-pressed="false" title="Mute sound">SOUND ON</button>
      <input type="range" min="0" max="100" value="${Math.round(Audio.volume * 100)}" aria-label="Volume" />
      <button type="button" data-read aria-pressed="false" title="Read dialogue aloud">READ: OFF</button>
    `;
    const btn = $('[data-mute]', box);
    const range = $('input[type=range]', box);
    const readBtn = $('[data-read]', box);
    const paint = () => {
      btn.textContent = Audio.muted ? 'SOUND OFF' : 'SOUND ON';
      btn.setAttribute('aria-pressed', String(Audio.muted));
    };
    paint();
    if (!speech.supported && readBtn){ readBtn.disabled = true; readBtn.textContent = 'READ: N/A'; }
    readBtn?.addEventListener('click', () => {
      const on = setReadAloud(!isReadAloud());
      readBtn.textContent = on ? 'READ: ON' : 'READ: OFF';
      readBtn.setAttribute('aria-pressed', String(on));
      if (on) speak('Read aloud is on.');
    });
    btn.addEventListener('click', () => {
      Audio.unlock();
      Audio.setMuted(!Audio.muted);
      paint();
      Audio.sfx('click');
    });
    range.addEventListener('input', () => {
      Audio.unlock();
      Audio.setVolume(Number(range.value) / 100);
      if (Audio.muted){ Audio.setMuted(false); paint(); }
    });
  });
}

/* ── loading bar ─────────────────────────────────────────────────────────── */
export function loadingBar(){
  const bar = $('#loadFill');
  const pct = $('#loadPct');
  const file = $('#loadFile');
  return {
    set(percent, name){
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
      if (pct) pct.textContent = `${Math.round(percent)}%`;
      if (file && name) file.textContent = name;
    },
  };
}

/* ── click / key SFX for every button on the page ────────────────────────── */
export function armButtons(){
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn, button');
    if (b && !b.dataset.noSfx){ Audio.unlock(); Audio.sfx('click'); }
  }, true);
}

/* ── keyboard shortcuts ──────────────────────────────────────────────────── */
export function onKeys(map){
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (map[k]) { e.preventDefault(); map[k](e); }
  });
}

/* ── tiny FPS meter for the corner (debug only) ──────────────────────────── */
export function fpsMeter(target){
  if (!target) return () => {};
  let frames = 0, last = performance.now();
  return () => {
    frames++;
    const now = performance.now();
    if (now - last > 500){
      target.textContent = `${Math.round((frames * 1000) / (now - last))} FPS`;
      frames = 0; last = now;
    }
  };
}

/* ── simple 2D fallback toggle (any page) ────────────────────────────────── */
export function mountSimpleToggle({ title = 'Simple version' } = {}){
  const btn = $('#simpleBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    Audio.sfx('click');
    document.dispatchEvent(new CustomEvent('ydev:simple', { detail: { title } }));
  });
}

/**
 * Sound off should stay off through every door.
 * Any real <a> that points at another page of this site gets the mute flag on
 * click, which is the last moment before the browser leaves the page.
 */
export function carryMute(){
  if (document.documentElement.dataset.muteCarry) return;
  document.documentElement.dataset.muteCarry = '1';
  document.addEventListener('click', (e) => {
    if (!Audio.muted) return;
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href) || /^https?:/i.test(href)) return;
    a.setAttribute('href', withMute(href));
  }, true);
  /* keyboard activation (Enter on a focused link) is a click too, so the
     capture listener above already covers it in every browser that matters */
}

/* ── page chrome: back link + sound ──────────────────────────────────────── */
export function mountPageChrome({ back = 'index.html' } = {}){
  bindSoundControls();
  armButtons();
  carryMute();
  const backBtn = $('#backBtn');
  if (backBtn){
    backBtn.setAttribute('href', back);
    backBtn.addEventListener('click', () => { Audio.sfx('portal'); });
  }
}

/* ── formatting helpers used by the content panels ───────────────────────── */
const TIER_LABEL = { core: 'Core', work: 'Working', basic: 'Foundations' };

/**
 * Skill rows: name · coloured bar · the number it represents.
 * `width` may arrive as "92%" or 92 — it is normalised here, once.
 */
export function skillBars(list){
  return `<div class="bars">${list.map(([name, tier, width]) => {
    const pct = Math.max(0, Math.min(100, Math.round(parseFloat(String(width)) || 0)));
    return `
    <div class="bar" data-tier="${tier}">
      <span class="n">${esc(name)}</span>
      <span class="t"><i data-w="${pct}%"></i></span>
      <span class="pct">${pct}<small>%</small></span>
    </div>`;
  }).join('')}
  <div class="bar-key">
    <span><i data-tier="core"></i>CORE</span>
    <span><i data-tier="work"></i>WORKING</span>
    <span><i data-tier="basic"></i>FOUNDATIONS</span>
  </div></div>`;
}

export function tagList(tags){
  return `<div class="tagset">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>`;
}

export function timeline(items){
  return `<div class="timeline">${items.map((it) => `
    <div class="tl-item ${it.done ? 'done' : ''}">
      <span class="tl-dot"></span>
      <div>
        <h4>${esc(it.title)}</h4>
        <div class="meta">${esc(it.meta || '')}</div>
        ${it.body ? `<p>${it.body}</p>` : ''}
      </div>
    </div>`).join('')}</div>`;
}
