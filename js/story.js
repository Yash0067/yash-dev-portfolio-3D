/* ═══════════════════════════════════════════════════════════════════════════
   story.js — CHAPTER ZERO · "THE GATES"
   A night-time castle courtyard: stone arch, torchlight, floating candles,
   stars, and Claude waiting at the steps with the story of the portfolio.

   Everything is built from primitives — no models, no textures, no network.
   Original art direction (stone + candlelight + ink outlines), inspired by the
   wizarding-castle mood, using none of anyone else's assets or names.

   Sections: 1 scene · 2 castle · 3 props · 4 Claude · 5 narration · 6 loop
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GUIDES } from './guide.js';
import { bootPage, floatDust } from './page.js';
import { toon, addOutline, rand, PALETTE, damp } from './world.js';
import { Mascot as Guide, CLAUDE_PORTRAIT } from './claude.js';
import { Audio, armAudio, withMute } from './audio.js';
import { toast, armButtons } from './ui.js';
import { GUIDE_NAME } from './content.js';
import { Ease } from './anim.js';

window.__STORY_BOOTED = true;

const STONE      = 0x6b7390;   // castle masonry
const STONE_LIGHT= 0x818aa8;
const STONE_DARK = 0x4e5570;
const MOSS       = 0x3d4a3a;
const WAX        = 0xf3ead2;
const FLAME      = 0xffc45e;
const TORCH      = 0xff9b4a;
const NIGHT      = 0x090d18;

/* ── 1 · scene ───────────────────────────────────────────────────────────── */
/* if the browser cannot start WebGL we still keep the narration readable */
let page = { onUpdate(){}, onClick(){}, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera() };
try {
page = bootPage({
  canvas: document.getElementById('gl'),
  guide: { ...GUIDES.story, placement: 'tr' },
  background: NIGHT,
  fog: { color: NIGHT, near: 26, far: 95 },
  camera: { pos: [0, 6.6, 21], look: [0, 5.4, -7], fov: 46 },
  bloom: 0.55,
  vignette: 0.62,
  autoRotate: 0.012,
  pitchLimit: [0.02, 0.72],
  distanceLimit: [12, 40],
  target: new THREE.Vector3(0, 5.4, -6),
});
} catch (err){
  document.body.classList.add('no-gl');
  const note = document.createElement('div');
  note.className = 'gl-note';
  note.innerHTML = '<b>NO WEBGL</b> The courtyard needs WebGL. The story below still works, and the plain page has everything.';
  document.body.appendChild(note);
  console.warn('[story] WebGL unavailable:', err);
}
const { scene, camera } = page;

/* ── 2 · the castle ──────────────────────────────────────────────────────── */

/** A box of stone with an ink outline. */
function stone(w, h, d, { x = 0, y = 0, z = 0, color = STONE, outline = 0.05 } = {}){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  addOutline(m, outline);
  return m;
}

const castle = new THREE.Group();
scene.add(castle);

/* curtain wall: a wide slab with a gap where the gate goes */
castle.add(stone(26, 13, 2.2, { y: 6.5, z: -12, color: STONE }));
castle.add(stone(26, 1.1, 2.8, { y: 13.2, z: -12, color: STONE_DARK }));   // crenellation band

/* two towers that frame the gate */
[-7.2, 7.2].forEach((x, i) => {
  const tower = stone(5.4, 17, 5.4, { x, y: 8.5, z: -11.4, color: STONE_LIGHT });
  castle.add(tower);
  /* roof: a cone, the only non-box silhouette in the build */
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 4.6, 4), toon(0x2c3550));
  roof.position.set(x, 19.2, -11.4);
  roof.rotation.y = Math.PI / 4;
  addOutline(roof, 0.05);
  castle.add(roof);
  /* slit windows, lit from inside */
  for (let k = 0; k < 3; k++){
    const slit = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.5, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xffcf8a }),
    );
    slit.position.set(x, 9 + k * 3, -8.62);
    castle.add(slit);
  }
});

/* the arch over the gate, built from a half torus */
const arch = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.55, 8, 22, Math.PI), toon(STONE_LIGHT));
arch.position.set(0, 8.2, -10.85);
addOutline(arch, 0.05);
castle.add(arch);

/* gate posts and the two doors, ajar so you can see warm light inside */
[-3.5, 3.5].forEach((x) => castle.add(stone(1.5, 8.4, 1.6, { x, y: 4.2, z: -10.9, color: STONE_LIGHT })));
/* the doors hang on hinges at the gate posts, so they can actually swing */
const doorHinges = [];
[-1, 1].forEach((s) => {
  const hinge = new THREE.Group();
  hinge.position.set(s * 3.45, 0, -10.7);
  hinge.rotation.y = s * 0.32;            // ajar, so warm light leaks out
  castle.add(hinge);
  doorHinges.push({ hinge, side: s });

  const door = new THREE.Mesh(new THREE.BoxGeometry(3.1, 7.4, 0.35), toon(0x4a3226));
  door.position.set(-s * 1.55, 3.7, 0);
  door.castShadow = true;
  addOutline(door, 0.05);
  hinge.add(door);

  /* iron bands */
  [1.6, 4.4, 6.6].forEach((y) => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, 0.42), toon(0x24252b));
    band.position.set(-s * 1.55, y, 0.06);
    hinge.add(band);
  });
});
let doorOpen = 0;                          // 0 shut · 1 wide open

/* the light that leaks out of the doorway */
/* the room behind the doors: a big warm plane, so an ajar door reads as
   "someone lit a fire in there" instead of a black slot */
const hallGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(6.2, 9),
  new THREE.MeshBasicMaterial({ color: 0xffb066, transparent: true, opacity: 0.85, toneMapped: false }),
);
hallGlow.position.set(0, 4.2, -11.6);
castle.add(hallGlow);
const hallLight = new THREE.PointLight(0xffa758, 26, 26, 2);
hallLight.position.set(0, 4, -11.2);
castle.add(hallLight);

const gateLight = new THREE.PointLight(0xffb066, 14, 22, 2);
gateLight.position.set(0, 3.4, -8.6);
castle.add(gateLight);
const gateGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(5.6, 7.2),
  new THREE.MeshBasicMaterial({ color: 0xffc07a, transparent: true, opacity: 0.3, depthWrite: false }),
);
gateGlow.position.set(0, 3.7, -9.9);
castle.add(gateGlow);

/* steps up to the doors */
for (let i = 0; i < 4; i++){
  castle.add(stone(9 - i * 0.9, 0.42, 1.5 - i * 0.18, {
    y: 0.21 + i * 0.42, z: -8.6 + i * 1.15, color: i % 2 ? STONE : STONE_LIGHT, outline: 0.03,
  }));
}

/* courtyard floor: dark flagstones, slightly glossy so the candles reflect */
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(24, 48),
  new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.42, metalness: 0.12 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

/* flagstone seams */
for (let i = 0; i < 9; i++){
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 20), new THREE.MeshBasicMaterial({ color: 0x171921 }));
  seam.position.set(-9 + i * 2.25, 0.011, -1);
  scene.add(seam);
}

/* side walls that funnel the eye toward the gate */
[-1, 1].forEach((s) => {
  const wall = stone(1.6, 7, 20, { x: s * 12.4, y: 3.5, z: -1, color: STONE_DARK });
  castle.add(wall);
  for (let i = 0; i < 5; i++){
    castle.add(stone(1.9, 1.1, 1.4, { x: s * 12.4, y: 7.5, z: -9 + i * 4, color: STONE }));
  }
});

/* ── 3 · props: torches, candles, stars ─────────────────────────────────── */

/* wall torches: a bracket, a flame, and one warm light shared per side */
const torchFlames = [];
[-1, 1].forEach((s, si) => {
  for (let i = 0; i < 3; i++){
    const z = -7 + i * 5.2;
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), toon(0x2c2b31));
    bracket.position.set(s * 11.5, 3.6, z);
    castle.add(bracket);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 0.72, 5),
      new THREE.MeshBasicMaterial({ color: TORCH, transparent: true, opacity: 0.94 }),
    );
    flame.position.set(s * 11.5, 4.25, z);
    castle.add(flame);
    flame.userData.phase = rand(0, 6.28);
    torchFlames.push(flame);

    if (i === 1){
      const light = new THREE.PointLight(0xff8a3c, 9, 14, 2);
      light.position.set(s * 11.1, 4.4, z);
      castle.add(light);
    }
  }
});

/* floating candles: the signature of the room — a cloud of small wax sticks
   drifting above the courtyard, each with a little flame */
const candleGroup = new THREE.Group();
scene.add(candleGroup);
const candles = [];
const CANDLE_COUNT = 34;
for (let i = 0; i < CANDLE_COUNT; i++){
  const holder = new THREE.Group();
  const h = rand(0.5, 1.15);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, h, 5), toon(WAX));
  wax.position.y = h / 2;
  addOutline(wax, 0.012);
  holder.add(wax);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.22, 4),
    new THREE.MeshBasicMaterial({ color: FLAME }),
  );
  flame.position.y = h + 0.12;
  holder.add(flame);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffcf8a, transparent: true, opacity: 0.1, depthWrite: false }),
  );
  halo.position.y = h + 0.12;
  holder.add(halo);

  holder.position.set(rand(-9, 9), rand(6.4, 12.4), rand(-11, 1));
  holder.userData = {
    phase: rand(0, 6.28), spin: rand(-0.12, 0.12),
    baseX: holder.position.x, baseY: holder.position.y, baseZ: holder.position.z,
    swayA: rand(0.18, 0.42), swayB: rand(0.16, 0.34),
  };
  candleGroup.add(holder);
  candles.push(holder);
}
/* one warm light in the middle of the candle cloud, not 26 */
const candleLight = new THREE.PointLight(0xffcb8a, 16, 26, 2);
candleLight.position.set(0, 9.5, -4);
scene.add(candleLight);

/* stars: a cheap dome of points, brighter near the top */
const starGeo = new THREE.BufferGeometry();
const starCount = 900;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++){
  const a = rand(0, Math.PI * 2);
  const r = rand(48, 90);
  const y = rand(8, 70);
  starPos[i * 3] = Math.cos(a) * r;
  starPos[i * 3 + 1] = y;
  starPos[i * 3 + 2] = Math.sin(a) * r - 20;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.45, sizeAttenuation: true, transparent: true, opacity: 0.9 })));

/* moon: a pale disc with a soft halo, the key light of the scene */
const moon = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), new THREE.MeshBasicMaterial({ color: 0xf2f4ff }));
moon.position.set(-16, 24, -46);
scene.add(moon);
const moonHalo = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshBasicMaterial({ color: 0xb9c8ff, transparent: true, opacity: 0.14, depthWrite: false }));
moonHalo.position.set(-16, 24, -46.1);
scene.add(moonHalo);

/* lights: moonlight from the back-left, a cool fill, no harsh shadows */
scene.add(new THREE.HemisphereLight(0xa8bce8, 0x2a2f3d, 1.5));
scene.add(new THREE.AmbientLight(0x5a6a96, 0.55));
const key = new THREE.DirectionalLight(0xc8d8ff, 1.7);
key.position.set(-14, 22, 8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -18; key.shadow.camera.right = 18;
key.shadow.camera.top = 20; key.shadow.camera.bottom = -6;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffa860, 0.5);
rim.position.set(6, 6, -14);
scene.add(rim);

/* dust in the air, recycled from the page kit */
const dust = floatDust(140, 18, 0xffd9a8);
scene.add(dust.points);

/* ── 4 · the gatekeeper ────────────────────────────────────────────────────
   He stands in front of the doors and stays put: no wandering, no fidgeting.
   He only reacts when the visitor actually moves the story forward.        */
const claude = new Guide(scene, {
  position: new THREE.Vector3(3.6, 1.68, -5.4),
  scale: 1.55,
  label: 'CLAUDE',
  mode: 'stage',
  glow: true,
});
claude.faceVisitor(page.camera);   // square on to the visitor, planted
claude.frozen = true;                      // planted — he is on duty

/* a soft warm light so he is not a silhouette on the flagstones */
const claudeLight = new THREE.PointLight(0xffc79a, 2.4, 8, 2);
claudeLight.position.set(3.4, 4.2, -2.6);
scene.add(claudeLight);

/* one greeting when the doors are first on screen, then nothing */
setTimeout(() => { claude.wave(); }, 1400);

/* ── 5 · narration ──────────────────────────────────────────────────────── */
const BEATS = [
  {
    text: 'The gates are open. Yash built this place out of boxes, one page at a time — I am ' + GUIDE_NAME + ', I walk people through it.',
    cue: 'Arrival',
  },
  {
    text: 'Five doors, five chapters: the Hall of Creations for his projects, the Trials for his skills, the Room for the story, the Work Experience road for what he has actually done, and the Epilogue for how to reach him.',
    cue: 'The five chapters',
  },
  {
    text: 'Nothing is exaggerated in here. If something is basic, it says basic. He would rather you trust the list than be impressed by it.',
    cue: 'The honest rule',
  },
  {
    text: 'That is the whole tour. Step inside when you are ready — or take the plain page if you would rather just read.',
    cue: 'Your move',
  },
];

const overlay = document.getElementById('story');
const cueEl = document.getElementById('storyCue');
const txtEl = document.getElementById('storyText');
const nextBtn = document.getElementById('storyNext');
const faceEl = document.getElementById('storyFace');
if (faceEl && !faceEl.firstElementChild) faceEl.innerHTML = CLAUDE_PORTRAIT;

let beat = 0;
let typing = null;

function type(text, done){
  clearInterval(typing);
  txtEl.textContent = '';
  let i = 0;
  typing = setInterval(() => {
    i++;
    txtEl.textContent = text.slice(0, i);
    if (i % 4 === 0) Audio.sfx('type');
    if (i >= text.length){ clearInterval(typing); typing = null; done && done(); }
  }, 1000 / 38);
}

function showBeat(n){
  const b = BEATS[n];
  if (!b) return;
  cueEl.textContent = String(n + 1).padStart(2, '0') + ' · ' + b.cue.toUpperCase();
  nextBtn.textContent = n === BEATS.length - 1 ? 'STEP INSIDE →' : 'CONTINUE ▸';
  nextBtn.classList.toggle('is-final', n === BEATS.length - 1);
  type(b.text, () => {
    if (n === BEATS.length - 1) nextBtn.classList.add('is-final');
  });
  /* he reacts to each beat */
  if (n === 1) claude.tilt();
  if (n === 2) claude.shake();
  if (n === 3){ claude.hop(); claude.flashCap(); }
}

const walkFrom = new THREE.Vector3(0, 6.6, 21);
const walkTo = new THREE.Vector3(0, 2.9, -9.6);
const lookFrom = new THREE.Vector3(0, 5.4, -7);
const lookTo = new THREE.Vector3(0, 3.4, -12);
const lookAt = lookFrom.clone();

/* the handover to the island: a warm flash instead of a hard cut */
function flashOut(done){
  let el = document.getElementById('gateFlash');
  if (!el){
    el = document.createElement('div');
    el.id = 'gateFlash';
    document.body.appendChild(el);
  }
  el.classList.add('on');
  setTimeout(done, 260);
}

let opening = false;
let leaving = false;
let camWalk = 0;

function advance(){
  Audio.unlock();
  Audio.sfx('click');
  if (typing){                        // finish the line first
    clearInterval(typing);
    typing = null;
    txtEl.textContent = BEATS[beat].text;
    return;
  }
  if (beat >= BEATS.length - 1){
    /* the gates open, the light spills out, and the page hands over to the
       island — one cinematic instead of a hard cut */
    if (opening) return;
    opening = true;
    nextBtn.textContent = 'ENTERING…';
    nextBtn.style.pointerEvents = 'none';
    Audio.sfx('portal');
    claude.hop();
    claude.wave();
    /* the page's own clock drives this — no tween manager on this route */
    return;
  }
  beat++;
  showBeat(beat);
}

nextBtn.addEventListener('click', (e) => { e.preventDefault(); advance(); });
document.getElementById('storySkip').addEventListener('click', () => { Audio.sfx('click'); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); advance(); }
  if (e.key === 'Escape') location.href = withMute('index.html?story=1');
});

armAudio();
armButtons();
showBeat(0);

/* a tiny handle for QA: watch the gate sequence without a debugger */
window.__STORY = {
  get beat(){ return beat; },
  get opening(){ return opening; },
  get doorOpen(){ return doorOpen; },
  get camWalk(){ return camWalk; },
};

/* clicking the gate itself also advances the story */
page.onClick(() => advance());

/* ── 6 · loop ───────────────────────────────────────────────────────────── */
page.onUpdate((dt, t) => {
  /* ── candles: a slow orbit-and-bob, no accumulating drift ───────────────
     Each one is placed from its own base point every frame, so the motion
     is a closed loop and identical at 30, 60 or 144 fps.                  */
  candles.forEach((c) => {
    const u = c.userData;
    c.position.x = u.baseX + Math.sin(t * 0.24 + u.phase) * u.swayA;
    c.position.z = u.baseZ + Math.cos(t * 0.19 + u.phase * 1.7) * u.swayB;
    c.position.y = u.baseY + Math.sin(t * 0.55 + u.phase) * 0.2;
    c.rotation.y = u.spin * t * 4;
    c.rotation.z = Math.sin(t * 0.5 + u.phase) * 0.05;
  });

  /* ── torches: a gentle, damped flicker (fast jitter reads as stutter) ─── */
  torchFlames.forEach((f) => {
    const phase = f.userData.phase;
    const target = 0.94 + Math.sin(t * 3.1 + phase) * 0.045 + Math.sin(t * 7.4 + phase * 2) * 0.02;
    f.userData.k = damp(f.userData.k ?? 1, target, 9, dt);
    f.scale.set(1, f.userData.k, 1);
    f.material.opacity = 0.72 + f.userData.k * 0.2;
  });

  /* ── the gate sequence: doors ease open, then the camera walks through ── */
  if (opening){
    doorOpen = Math.min(1, doorOpen + dt / 1.6);
    if (doorOpen > 0.55) camWalk = Math.min(1, camWalk + dt / 0.75);
    if (camWalk >= 1 && !leaving){
      leaving = true;
      flashOut(() => { location.href = withMute('index.html?story=1'); });
    }
  }

  /* hinges: eased, with a touch of settle, each leaf a hair behind the other */
  const openEase = Ease.easeInOutCubic(doorOpen);
  doorHinges.forEach(({ hinge, side }, i) => {
    const k = Ease.easeInOutCubic(Math.min(1, Math.max(0, doorOpen * 1.06 - i * 0.06)));
    hinge.rotation.y = side * (0.32 + k * 1.18);
  });

  /* lights are damped toward their targets: no stepping when the frame rate
     wobbles, which is what made the glow pulse look jumpy                   */
  hallLight.intensity = damp(hallLight.intensity, 24 + openEase * 46 + Math.sin(t * 0.9) * 2.2, 4, dt);
  gateLight.intensity = damp(gateLight.intensity, 13 + openEase * 30 + Math.sin(t * 1.1) * 1.6, 4, dt);
  gateGlow.material.opacity = damp(gateGlow.material.opacity, 0.5 + openEase * 0.45, 4, dt);

  /* the camera glides to the doorway along an eased curve */
  if (camWalk > 0){
    const e = Ease.easeInOutCubic(camWalk);
    camera.position.lerpVectors(walkFrom, walkTo, e);
    lookAt.lerpVectors(lookFrom, lookTo, e);
    camera.lookAt(lookAt);
  }

  candleLight.intensity = damp(candleLight.intensity, 15 + Math.sin(t * 0.8) * 1.8, 3, dt);

  /* Claude: idle animation — update() keeps him turned to the visitor */
  claude.update(dt, t, { grounded: true });

  /* dust drifts */
  dust.update(t);
});

/* unlock audio on the first real gesture, like every other page */
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => armAudio(), { once: true }));
