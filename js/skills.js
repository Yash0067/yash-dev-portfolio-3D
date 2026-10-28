/* ═══════════════════════════════════════════════════════════════════════════
   skills.js — the skill matrix.
   Fifteen plaques hang on a tilted grid, colour-coded by how confident I am.
   Click any plaque to open its notes. Claude keeps an eye on the bottom-left.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { toon, addOutline, PALETTE } from './world.js';
import { bootPage, makeScreen, floatDust } from './page.js';
import { GUIDES } from './guide.js';
import { Mascot } from './claude.js';
import { SKILLS } from './content.js';
import { $, openPanel, bindSoundControls, skillBars, esc, toast } from './ui.js';
import { Audio, armAudio, withMute } from './audio.js';

armAudio();
bindSoundControls();

/* the matrix is 4 wide; the board and the camera frame grow with the data */
const SK_ROWS = Math.ceil((SKILLS.length + 1) / 4);
const SK_CELL_Y = 2.16;
const SK_BOARD_H = SK_ROWS * SK_CELL_Y + 1.5;
const SK_MID = 0.7 + SK_BOARD_H / 2;          // keep the bottom edge off the floor

const page = bootPage({
  canvas: $('#gl'),
  guide: GUIDES.skills,
  background: 0xf7f4ec,
  fog: { color: 0xf7f4ec, near: 30, far: 80 },
  camera: { pos: [0.5, SK_MID + 1.4, SK_ROWS * 3.35], look: [0, SK_MID, 0], fov: 44 },
  bloom: 0.26,
  vignette: 0.3,
  autoRotate: 0.035,
  pitchLimit: [-0.02, 0.55],
  distanceLimit: [16, 42],
  target: new THREE.Vector3(0, SK_MID, 0),
});
const { scene, camera } = page;

scene.add(new THREE.HemisphereLight(0xe6f2ff, 0xefe9da, 1.55));
const key = new THREE.DirectionalLight(0xfff8ee, 1.5);
key.position.set(9, 16, 14);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -16; key.shadow.camera.right = 16;
key.shadow.camera.top = 18; key.shadow.camera.bottom = -8;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffb4a0, 0.5);
rim.position.set(-12, 5, -8);
scene.add(rim);
/* keeps Claude's face readable against the dark slab */
const mascotLamp = new THREE.PointLight(0xffffff, 26, 14, 2);
mascotLamp.position.set(-8.6, 4.0, 1.6);
scene.add(mascotLamp);

/* ── the board ───────────────────────────────────────────────────────────── */
const board = new THREE.Group();
board.position.set(0, SK_MID, -1.6);
board.rotation.x = -0.13;
scene.add(board);

/* how many rows will the matrix need? (cells = skills + one CTA card) */
const ROWS = SK_ROWS;
const BOARD_H = SK_BOARD_H;

/* backing slab */
const slab = new THREE.Mesh(new THREE.BoxGeometry(12.9, BOARD_H, 0.5), toon(0x121216));
slab.position.z = -0.42;
slab.receiveShadow = true;
addOutline(slab, 0.012);
board.add(slab);
/* red spine down the left */
const spine = new THREE.Mesh(new THREE.BoxGeometry(0.22, BOARD_H, 0.54), toon(PALETTE.red));
spine.position.set(-6.35, 0, -0.4);
board.add(spine);

/* floor + a shadow catcher so the board does not float */
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(34, 56),
  new THREE.MeshBasicMaterial({ color: 0xf7f4ec }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(44, 44, 0xd8d2c2, 0xe6e0d2);
grid.position.y = -0.01;
grid.material.transparent = true;
grid.material.opacity = 0.55;
scene.add(grid);

const dust = floatDust(120, 26, 0xffc93c);
scene.add(dust.points);

/* ── plaques ─────────────────────────────────────────────────────────────── */
const COLS = 4;
const CELL_X = 3.22;
const CELL_Y = 2.16;
const TIER_ACCENT = { core: PALETTE.red, work: PALETTE.sky, basic: PALETTE.sun };

const cells = SKILLS.map((skill, i) => ({ type: 'skill', skill }));
/* one extra cell to close the grid with a call to action */
cells.push({ type: 'cta' });

cells.forEach((cell, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = (col - (COLS - 1) / 2) * CELL_X;
  const y = (((ROWS - 1) / 2) - row) * CELL_Y;

  if (cell.type === 'cta'){
    const cta = makeScreen({
      w: 2.72, h: 1.76,
      title: 'Open to work',
      subtitle: 'Mumbai · remote friendly',
      accent: PALETTE.red,
      bg: 0xff2a00,
      theme: 'light',
      progress: 1,
      index: String(SKILLS.length + 1).padStart(2, '0'),
    });
    cta.position.set(x, y, 0.06);
    board.add(cta);
    cta.userData.tag = 'cta';
    page.pickable(cta, { type: 'cta' });
    return;
  }

  const skill = cell.skill;
  const accent = TIER_ACCENT[skill.tier];
  const plaque = makeScreen({
    w: 2.72, h: 1.76,
    title: skill.name,
    subtitle: { core: 'CORE', work: 'WORKING', basic: 'BASICS' }[skill.tier],
    accent,
    bg: 0x121216,
    theme: 'light',
    progress: parseFloat(skill.width) / 100,
    index: String(i + 1).padStart(2, '0'),
  });
  plaque.position.set(x, y, 0.06);
  plaque.userData.baseY = y;
  plaque.userData.phase = i * 0.6;
  board.add(plaque);
  page.pickable(plaque, { type: 'skill', skill });


});

/* ── Claude, guarding the bottom-left corner ─────────────────────────────── */
const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.0, 2.1), toon(0xefeade));
plinth.position.set(-8.6, 0.5, -0.6);
plinth.castShadow = true;
addOutline(plinth, 0.014);
scene.add(plinth);

const blocky = new Mascot(scene, { mode: 'stage', scale: 0.8, glow: true, label: 'CLAUDE' });
blocky.root.position.set(-8.6, 1.02, -0.6);
blocky.target.copy(blocky.root.position);
blocky.faceVisitor(page.camera);   // square on to the visitor, planted
blocky.root.userData.rig.shadow.visible = false;
page.pickable(blocky.root, { type: 'blocky' });

let hopT = 0;
page.onUpdate((dt, t) => {
  blocky.update(dt, t, {});
  dust.update(t);
  hopT += dt;
  if (hopT > 2.6){ hopT = 0; blocky.hop(); }

  board.children.forEach((o) => {
    if (o.userData.baseY !== undefined){
      o.position.y = o.userData.baseY + Math.sin(t * 0.7 + o.userData.phase) * 0.035;
    }
  });
  board.rotation.y = Math.sin(t * 0.12) * 0.035;
});

/* ── clicks ──────────────────────────────────────────────────────────────── */
page.onClick((data) => {
  if (data.type === 'cta'){
    Audio.sfx('open');
    location.href = withMute('contact.html');
    return;
  }
  if (data.type === 'blocky'){
    Audio.sfx('click');
    blocky.hop();
    toast('BLOCKY RATES ALL OF THIS 5 OUT OF 5');
    return;
  }
  if (data.type !== 'skill') return;
  const s = data.skill;
  const tierLabel = { core: 'Core', work: 'Working knowledge', basic: 'Foundations' }[s.tier];
  Audio.sfx('open');
  openPanel({
    title: s.name.toUpperCase(),
    footer: `${tierLabel.toUpperCase()} · ${s.group.toUpperCase()}`,
    body: `
      <div class="doc">
        <h3>In practice</h3>
        <p>${esc(s.note)}</p>
        <h3>Where it sits</h3>
        ${skillBars([[s.name, s.tier, s.width]])}
        <h3>The whole stack</h3>
        ${skillBars(SKILLS.map((k) => [k.name, k.tier, k.width]))}
      </div>
      <div class="play-row">
        <a class="btn btn--primary" href="index.html">Back to the island</a>
        <a class="btn" href="projects.html">See the projects</a>
      </div>`,
  });
});

addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r'){ page.orbit.yaw = 0; page.orbit.pitch = 0.22; }
});
