/* ═══════════════════════════════════════════════════════════════════════════
   about.js — the room.
   A small diorama: desk, CRT, drawing board, headphones, console, books,
   a window on Mumbai and Claude on the rug. Click a thing, get a story.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { toon, addOutline, PALETTE, rand } from './world.js';
import { bootPage, makeScreen, floatDust } from './page.js';
import { GUIDES } from './guide.js';
import { Mascot } from './claude.js';
import { PROFILE, EDUCATION, INTERESTS, SKILLS, QUESTS, CERTIFICATIONS } from './content.js';
import { $, openPanel, bindSoundControls, esc, skillBars, timeline, toast } from './ui.js';
import { Audio, armAudio } from './audio.js';

armAudio();
bindSoundControls();

const page = bootPage({
  canvas: $('#gl'),
  guide: GUIDES.about,
  background: 0xf7f4ec,
  fog: null,
  camera: { pos: [8.2, 5.6, 14.0], look: [-0.8, 2.5, -2.9], fov: 45 },
  bloom: 0.20,
  vignette: 0.40,
  autoRotate: 0.028,
  pitchLimit: [0.04, 0.72],
  distanceLimit: [11, 26],
  target: new THREE.Vector3(-0.8, 2.5, -2.9),
});
const { scene, camera } = page;

/* ── light: one warm room lamp, one clean window spill ───────────────────── */
scene.add(new THREE.HemisphereLight(0xffffff, 0xd2d8e4, 1.02));
const spill = new THREE.DirectionalLight(0xfffdf6, 0.72);
spill.position.set(-7, 9, 7);
spill.castShadow = true;
spill.shadow.mapSize.set(1024, 1024);
spill.shadow.camera.left = -12; spill.shadow.camera.right = 12;
spill.shadow.camera.top = 12; spill.shadow.camera.bottom = -12;
scene.add(spill);
const lampLight = new THREE.PointLight(0xffcf8a, 8, 12, 2);
lampLight.position.set(3.6, 4.2, -3.2);
scene.add(lampLight);
/* a camera-side fill so nothing reads as mud */
const fill = new THREE.DirectionalLight(0xf2f6ff, 0.40);
fill.position.set(9, 6, 11);
scene.add(fill);

/* ── shell ───────────────────────────────────────────────────────────────── */
const box = (w, h, d, color, outline = 0.012) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.castShadow = true;
  m.receiveShadow = true;
  if (outline) addOutline(m, outline);
  return m;
};

/* floor */
const floor = box(26, 0.5, 16, 0xf2eee3, 0);
floor.position.set(0, -0.25, -0.5);
floor.receiveShadow = true;
scene.add(floor);

/* two walls */
const backWall = box(26, 9, 0.4, 0xfaf7ef, 0);
backWall.position.set(0, 4, -6.6);
backWall.receiveShadow = true;
{
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#ffffff';
  cx.fillRect(0, 0, 64, 64);
  cx.fillStyle = 'rgba(18,18,22,0.10)';
  for (let j = 4; j < 64; j += 8) for (let i = 4; i < 64; i += 8){
    cx.beginPath(); cx.arc(i, j, 1.6, 0, 7); cx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 4);
  backWall.material = new THREE.MeshLambertMaterial({ color: 0xfaf7ef, map: tex });
}
scene.add(backWall);

/* skirting + a single ink rule where the walls meet */
const skirting = box(26, 0.16, 0.1, PALETTE.ink, 0);
skirting.position.set(0, 0.08, -6.36);
scene.add(skirting);

/* rug */
const rug = box(5.8, 0.08, 3.9, 0xf4ecdb, 0.02);
rug.position.set(-1.0, 0.05, 0.4);
scene.add(rug);
[[5.6, 0.14, 0, 1.85], [5.6, 0.14, 0, -1.45], [0.14, 3.5, -2.7, 0.4], [0.14, 3.5, 2.1, 0.4]].forEach(([w, d, x, z]) => {
  const edge = box(w, 0.07, d, PALETTE.red, 0);
  edge.position.set(x - 1.0, 0.07, z + 0.4);
  scene.add(edge);
});

/* ── window with a slice of Mumbai ───────────────────────────────────────── */
const win = new THREE.Group();
win.position.set(-4.1, 4.3, -6.36);
scene.add(win);

const skyPane = new THREE.Mesh(
  new THREE.PlaneGeometry(3.4, 2.6),
  new THREE.MeshBasicMaterial({ color: 0xbfe4ff, toneMapped: false }),
);
win.add(skyPane);
/* a few paper buildings in the window */
[0, 1, 2, 3].forEach((i) => {
  const b = new THREE.Mesh(
    new THREE.BoxGeometry(0.42 + (i % 2) * 0.16, 0.7 + i * 0.22, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x9fd0f5 }),
  );
  b.position.set(-1.3 + i * 0.75, -0.95 + (0.7 + i * 0.22) / 2, 0.02);
  win.add(b);
});
const sunDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.34, 24),
  new THREE.MeshBasicMaterial({ color: PALETTE.sun, toneMapped: false }),
);
sunDisc.position.set(1.05, 0.72, 0.03);
win.add(sunDisc);
/* frame */
const frameMat = toon(PALETTE.ink);
[[3.7, 0.14, 0, 1.36], [3.7, 0.14, 0, -1.36], [0.14, 2.86, -1.78, 0], [0.14, 2.86, 1.78, 0], [0.1, 2.7, 0, 0]].forEach(([w, h, x, y], i) => {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(i === 4 ? 0.1 : w, i === 4 ? 2.7 : h, 0.12), frameMat);
  bar.position.set(x, y, 0.07);
  win.add(bar);
});
page.pickable(win, { type: 'window' });

/* ── desk ────────────────────────────────────────────────────────────────── */
const desk = new THREE.Group();
desk.position.set(1.9, 0, -4.4);
scene.add(desk);

const deskTop = box(6.2, 0.24, 2.5, 0xf7f1e4);
deskTop.position.y = 1.5;
desk.add(deskTop);
[[-2.7, -0.9], [2.7, -0.9], [-2.7, 0.9], [2.7, 0.9]].forEach(([x, z]) => {
  const leg = box(0.22, 1.5, 0.22, 0xd8cbb2, 0);
  leg.position.set(x, 0.75, z);
  desk.add(leg);
});
/* a drawer block on the left */
const drawer = box(1.5, 0.9, 2.2, 0xf1ebdd, 0.014);
drawer.position.set(-2.1, 1.05, 0);
desk.add(drawer);
[-0.25, 0.25].forEach((dy) => {
  const handle = box(0.5, 0.07, 0.07, PALETTE.ink, 0);
  handle.position.set(-1.34, 1.05 + dy, 0.4);
  desk.add(handle);
});

/* CRT monitor */
const crt = new THREE.Group();
crt.position.set(0.5, 1.62, -0.45);
crt.rotation.y = -0.22;
desk.add(crt);
const crtBody = box(2.5, 1.95, 1.9, 0xe6ddc9, 0.014);
crtBody.position.y = 1.0;
crt.add(crtBody);
const crtFoot = box(1.2, 0.16, 1.1, 0xcfc3a9, 0);
crtFoot.position.y = 0.08;
crt.add(crtFoot);
const screen = makeScreen({
  w: 1.86, h: 1.4, title: 'YASH.OS', subtitle: 'FRONT-END · MUMBAI',
  accent: PALETTE.red, bg: 0x0b0b10,
});
screen.position.set(0, 1.06, 0.99);
crt.add(screen);
page.pickable(crt, { type: 'education' });

const crtLight = new THREE.PointLight(0xa9d4ff, 4, 6, 2);
crtLight.position.set(0.5, 2.5, -3.4);
scene.add(crtLight);

/* keyboard + mouse */
const kb = box(1.9, 0.1, 0.6, 0xece3cf, 0.008);
kb.position.set(0.9, 1.64, 0.55);
desk.add(kb);
for (let i = 0; i < 14; i++){
  const k = box(0.09, 0.04, 0.09, 0xcfc4ab, 0);
  k.position.set(0.05 + i * 0.12, 1.71, 0.55);
  desk.add(k);
}
const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.36, 14), toon(PALETTE.red));
mug.position.set(1.95, 1.8, 0.35);
addOutline(mug, 0.03);
desk.add(mug);

/* desk lamp */
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.1, 16), toon(PALETTE.ink));
lampBase.position.set(2.7, 1.68, -0.6);
desk.add(lampBase);
const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), toon(PALETTE.ink));
arm.position.set(2.7, 2.4, -0.6);
arm.rotation.z = 0.35;
desk.add(arm);
const shade = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.5, 14, 1, true), toon(PALETTE.sun));
shade.position.set(2.26, 3.0, -0.6);
shade.rotation.z = 0.5;
shade.material.side = THREE.DoubleSide;
addOutline(shade, 0.03);
desk.add(shade);

/* chair, turned half away */
const chair = new THREE.Group();
chair.position.set(5.9, 0, -2.0);
chair.scale.setScalar(0.74);
chair.rotation.y = -1.05;
scene.add(chair);
const seat = box(1.5, 0.2, 1.5, 0xf8f4ea, 0.012);
seat.position.y = 1.05;
chair.add(seat);
const back = box(1.5, 1.6, 0.2, 0xf8f4ea, 0.012);
back.position.set(0, 1.9, -0.66);
chair.add(back);
[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(([x, z]) => {
  const leg = box(0.14, 1.0, 0.14, 0xd6c9b0, 0);
  leg.position.set(x, 0.5, z);
  chair.add(leg);
});

/* ── drawing board ───────────────────────────────────────────────────────── */
const board = new THREE.Group();
board.position.set(-4.5, 0, -2.9);
board.rotation.y = 0.55;
scene.add(board);
[-0.9, 0.9].forEach((x) => {
  const leg = box(0.12, 4.0, 0.12, 0xd6c9b0, 0.01);
  leg.position.set(x, 2.0, 0);
  leg.rotation.z = x < 0 ? 0.06 : -0.06;
  board.add(leg);
});
const canvasBoard = box(3.0, 2.2, 0.14, 0xfffdf7, 0.02);
canvasBoard.position.set(0, 3.05, 0.08);
canvasBoard.rotation.x = -0.06;
board.add(canvasBoard);
/* sticky notes + a red sketch line */
[[-0.95, 0.4, PALETTE.sun], [0.15, 0.62, PALETTE.sky], [0.9, 0.15, PALETTE.red]].forEach(([x, y, c]) => {
  const note = box(0.62, 0.62, 0.04, c, 0);
  note.position.set(x, 3.05 + y - 0.4, 0.18);
  note.rotation.z = rand(-0.12, 0.12);
  board.add(note);
});
const sketch = box(2.1, 0.07, 0.03, PALETTE.ink, 0);
sketch.position.set(0, 2.55, 0.17);
board.add(sketch);
const sketch2 = box(1.3, 0.07, 0.03, PALETTE.ink, 0);
sketch2.position.set(-0.4, 2.35, 0.17);
board.add(sketch2);
page.pickable(board, { type: 'interests' });

/* ── headphones on the wall ──────────────────────────────────────────────── */
const phones = new THREE.Group();
phones.position.set(4.05, 1.7, -4.1);
phones.rotation.set(-Math.PI / 2, 0, 0.5);
phones.scale.setScalar(0.62);
scene.add(phones);
const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 20, Math.PI), toon(PALETTE.ink));
band.rotation.z = Math.PI;
addOutline(band, 0.03);
phones.add(band);
[-0.42, 0.42].forEach((x) => {
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16), toon(PALETTE.ink));
  cup.rotation.x = Math.PI / 2;
  cup.position.set(x, -0.02, 0);
  addOutline(cup, 0.04);
  phones.add(cup);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16), toon(PALETTE.red));
  pad.rotation.x = Math.PI / 2;
  pad.position.set(x, -0.02, 0.06);
  phones.add(pad);
});
/* the hook */
const hook = box(0.08, 0.3, 0.12, PALETTE.ink, 0);
hook.position.y = 0.5;
phones.add(hook);
page.pickable(phones, { type: 'music' });

/* ── bookshelf: an open frame, so the books actually show ────────────────── */
const shelf = new THREE.Group();
shelf.position.set(7.0, 0, -5.4);
scene.add(shelf);

const shelfSide = (x) => {
  const side = box(0.16, 3.7, 1.0, 0xf8f3e6, 0.012);
  side.position.set(x, 1.85, 0);
  shelf.add(side);
};
shelfSide(-1.24); shelfSide(1.24);
const shelfBack = box(2.5, 3.7, 0.12, 0xf0e9d9, 0);
shelfBack.position.set(0, 1.85, -0.5);
shelf.add(shelfBack);
const shelfTop = box(2.5, 0.14, 1.0, 0xf8f3e6, 0.012);
shelfTop.position.set(0, 3.66, 0);
shelf.add(shelfTop);
[0.06, 1.05, 2.04, 3.03].forEach((y) => {
  const plank = box(2.5, 0.12, 0.94, 0xe8e0cd, 0);
  plank.position.set(0, y, 0.02);
  shelf.add(plank);
});
for (let row = 0; row < 3; row++){
  let bx = -1.08;
  for (let i = 0; i < 5; i++){
    const h = 0.62 + ((i * 5 + row * 3) % 4) * 0.09;
    const c = [PALETTE.red, PALETTE.ink, PALETTE.sky, PALETTE.sun, 0xd8ccb2][(i + row) % 5];
    const book = box(0.19, h, 0.62, c, 0);
    book.position.set(bx, 0.14 + row * 0.99 + h / 2, 0.12);
    book.rotation.z = (i % 3 === 2) ? 0.06 : 0;
    shelf.add(book);
    bx += 0.4;
  }
}
page.pickable(shelf, { type: 'story' });

/* ── console + controller on a low cabinet ───────────────────────────────── */
const cabinet = box(2.2, 1.0, 1.3, 0xf6f0e2, 0.014);
cabinet.position.set(-2.2, 0.5, -5.5);
scene.add(cabinet);
const consoleBox = box(1.7, 0.4, 1.1, PALETTE.ink, 0.01);
consoleBox.position.set(-2.2, 1.2, -5.5);
scene.add(consoleBox);
const consoleStripe = box(1.73, 0.09, 1.13, PALETTE.red, 0);
consoleStripe.position.set(-2.2, 1.3, -5.5);
scene.add(consoleStripe);
const consoleVent = box(0.5, 0.06, 0.02, 0xf7f2e7, 0);
consoleVent.position.set(-2.55, 1.13, -4.94);
scene.add(consoleVent);
const pad = box(0.8, 0.16, 0.52, PALETTE.ink, 0.01);
pad.position.set(-1.05, 1.08, -5.0);
pad.rotation.y = -0.3;
scene.add(pad);
[[-0.22, PALETTE.red], [0.0, PALETTE.sun], [0.22, PALETTE.sky]].forEach(([x, c]) => {
  const dot = box(0.11, 0.05, 0.11, c, 0);
  dot.position.set(x - 1.05, 1.17, -5.02);
  scene.add(dot);
});
page.pickable(consoleBox, { type: 'howwework' });
page.pickable(cabinet, { type: 'howwework' });

/* ── plant ───────────────────────────────────────────────────────────────── */
const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.9, 12), toon(0xe4d8c0));
pot.position.set(-7.0, 0.45, -1.7);
addOutline(pot, 0.025);
pot.castShadow = true;
scene.add(pot);
for (let i = 0; i < 7; i++){
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1 + (i % 3) * 0.3, 5), toon(0xdfe6d4));
  leaf.position.set(-7.0 + Math.cos(i * 2.1) * 0.35, 1.2 + (i % 3) * 0.18, -1.7 + Math.sin(i * 2.1) * 0.35);
  leaf.rotation.z = Math.cos(i * 2.1) * 0.5;
  leaf.rotation.x = Math.sin(i * 2.1) * 0.5;
  addOutline(leaf, 0.03);
  scene.add(leaf);
}

/* ── the framed logo ─────────────────────────────────────────────────────── */
const logoFrame = box(2.1, 2.1, 0.12, PALETTE.ink, 0);
logoFrame.position.set(-1.35, 5.05, -6.36);
scene.add(logoFrame);
new THREE.TextureLoader().load('assets/logo.png', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.76, 1.76),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }),
  );
  face.position.set(-1.35, 5.05, -6.28);
  scene.add(face);
});

/* ── Claude on the rug ───────────────────────────────────────────────────── */
const blocky = new Mascot(scene, { mode: 'stage', scale: 0.95, glow: true, label: 'CLAUDE' });
blocky.root.position.set(-2.4, 0.02, 0.9);
blocky.target.copy(blocky.root.position);
blocky.faceVisitor(page.camera);   // square on to the visitor, planted
page.pickable(blocky.root, { type: 'blocky' });

/* Claude gets his own little lamp so the coral stays coral */
const blockyLamp = new THREE.PointLight(0xffe7dc, 9, 7, 2);
blockyLamp.position.set(-2.2, 3.0, 3.2);
scene.add(blockyLamp);

/* dust in the window light */
const dust = floatDust(120, 13, 0xffd9a0);
dust.points.position.set(-2, 2.6, -2);
scene.add(dust.points);

/* ── animation ───────────────────────────────────────────────────────────── */
let hopT = 0;
page.onUpdate((dt, t) => {
  blocky.update(dt, t, {});
  dust.update(t);
  hopT += dt;
  if (hopT > 3.4){ hopT = 0; blocky.hop(); if (Math.random() < 0.35) blocky.tipCap(); }

  /* the lamp breathes, the chair sways a hair */
  lampLight.intensity = 7 + Math.sin(t * 1.8) * 1.2;
  chair.rotation.y = 0.5 + Math.sin(t * 0.4) * 0.04;
  phones.rotation.z = Math.sin(t * 0.9) * 0.03;
  sunDisc.position.y = 0.72 + Math.sin(t * 0.3) * 0.03;
});

/* ── interactions ────────────────────────────────────────────────────────── */
const show = (title, footer, html) => {
  Audio.sfx('open');
  openPanel({ title, footer, body: html });
};

page.onClick((data) => {
  switch (data.type){
    case 'education':
      show('THE DESK', 'EDUCATION · MUMBAI', `
        <div class="doc">
          <h3>Education</h3>
          ${timeline(EDUCATION.map((e) => ({ title: e.title, meta: e.meta, body: e.body })))}
          <h3>Certification</h3>
          ${timeline(CERTIFICATIONS.map((c) => ({ title: c.title, meta: c.meta, body: c.body })))}
          <h3>What I studied</h3>
          ${skillBars(SKILLS.filter((s) => s.tier === 'core').map((s) => [s.name, s.tier, s.width]))}
        </div>
        <div class="play-row">
          <a class="btn btn--primary" href="quests.html">See the timeline</a>
          <a class="btn" href="index.html">Back to the island</a>
        </div>`);
      break;

    case 'interests':
      show('THE DRAWING BOARD', 'OFF THE CLOCK', `
        <div class="doc">
          <h3>Outside the editor</h3>
          <ul>${INTERESTS.map((i) => `<li><b>${esc(i.title)}</b> — ${esc(i.body)}</li>`).join('')}</ul>
          <h3>Why it matters</h3>
          <p>Video editing taught me pacing and rhythm; sketching taught me hierarchy and spacing. Both show up in the interfaces I build.</p>
        </div>
        <div class="play-row"><a class="btn btn--primary" href="skills.html">See the skill matrix</a></div>`);
      break;

    case 'music':
      show('THE HEADPHONES', 'WORKING SOUNDTRACK', `
        <div class="doc">
          <h3>Loop of choice</h3>
          <p>Chiptune and lo-fi instrumentals while I write code — nothing with lyrics when the problem is hard.</p>
          <h3>On this site</h3>
          <p>The music you are hearing was generated in the browser with the Web Audio API: a 64-step loop in A minor, built from a triangle bass, a square arpeggio and noise hats. No samples, no downloads.</p>
        </div>
        <div class="play-row"><a class="btn btn--primary" href="projects.html">See the projects</a></div>`);
      break;

    case 'howwework':
      show('THE CONSOLE', 'HOW I WORK', `
        <div class="doc">
          <h3>Method</h3>
          <ul>
            <li>Break the page into blocks before writing markup.</li>
            <li>Mobile-first CSS, then widen the layout with Grid and Flexbox.</li>
            <li>Name things properly; leave comments for the next reader.</li>
            <li>Test at 320, 768 and 1440 px before calling it done.</li>
          </ul>
          <h3>In progress</h3>
          <p>${esc(CERTIFICATIONS[0].title)} — ${esc(CERTIFICATIONS[0].meta)}</p>
        </div>
        <div class="play-row"><a class="btn btn--primary" href="quests.html">Open the quest log</a></div>`);
      break;

    case 'story':
      show('THE BOOKSHELF', 'THE STORY SO FAR', `
        <div class="doc">
          <h3>Who I am</h3>
          <p>${esc(PROFILE.story)}</p>
          <h3>Right now</h3>
          <p>${esc(PROFILE.objective)}</p>
        </div>
        <div class="play-row">
          <a class="btn btn--primary" href="contact.html">Get in touch</a>
          <a class="btn" href="assets/resumes/Yash_Dhiver_FullStack_Developer_Resume.pdf" download>Download résumé</a>
        </div>`);
      break;

    case 'window':
      show('THE WINDOW', 'MUMBAI · 19.07° N 72.87° E', `
        <div class="doc">
          <h3>Home</h3>
          <p>${esc(PROFILE.location)}. I study here, build here and take the local train with everyone else.</p>
          <h3>Availability</h3>
          <p>${esc(PROFILE.availability)}.</p>
        </div>
        <div class="play-row"><a class="btn btn--primary" href="contact.html">Say hello</a></div>`);
      break;

    case 'blocky':
      Audio.sfx('click');
      blocky.hop();
      toast('CLAUDE LIVES HERE. HE PAYS RENT IN COINS.');
      break;
  }
});
