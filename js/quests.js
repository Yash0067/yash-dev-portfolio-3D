/* ═══════════════════════════════════════════════════════════════════════════
   quests.js — the quest log.
   A road of stepping stones climbing through the paper hills, one checkpoint
   flag per chapter of experience. Click a flag to read the quest notes.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { toon, addOutline, PALETTE, rand, createTree } from './world.js';
import { bootPage, makeScreen, floatDust } from './page.js';
import { GUIDES } from './guide.js';
import { Mascot } from './claude.js';
import { QUESTS, EDUCATION } from './content.js';
import { $, openPanel, bindSoundControls, esc, toast, timeline } from './ui.js';
import { Audio, armAudio } from './audio.js';

armAudio();
bindSoundControls();

const page = bootPage({
  canvas: $('#gl'),
  guide: GUIDES.quests,
  background: 0xf7f4ec,
  fog: { color: 0xfbf8f1, near: 40, far: 95 },
  camera: { pos: [7.5, 6.2, 13.5], look: [-0.6, 2.4, -1.2], fov: 44 },
  bloom: 0.24,
  vignette: 0.34,
  autoRotate: 0.045,
  pitchLimit: [0.02, 0.7],
  distanceLimit: [11, 26],
  target: new THREE.Vector3(-0.6, 2.4, -1.2),
});
const { scene, camera } = page;

scene.add(new THREE.HemisphereLight(0xf6fbff, 0xeee9dc, 1.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.45);
sun.position.set(9, 14, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
scene.add(sun);

/* ── the hill the road climbs ────────────────────────────────────────────── */
const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 56), toon(0xfbf8f0));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* a couple of soft mounds so the horizon is not a flat line */
[[-11, -9, 4.2], [10, -11, 5.2], [-14, 4, 3.4], [13, 5, 3.0]].forEach(([x, z, r]) => {
  const mound = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), toon(0xf4f0e5));
  mound.position.set(x, -r * 0.62, z);
  mound.scale.y = 0.5;
  mound.receiveShadow = true;
  addOutline(mound, 0.012);
  scene.add(mound);
});

/* ── the road: a spline of paper stones ──────────────────────────────────── */
const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 8),
  new THREE.Vector3(-1.4, 0, 4),
  new THREE.Vector3(-3.2, 0.15, 0),
  new THREE.Vector3(-1.2, 0.35, -4.2),
  new THREE.Vector3(2.2, 0.6, -7.4),
  new THREE.Vector3(3.4, 0.9, -11.4),
]);

const STONES = 46;
const stoneGeo = new THREE.BoxGeometry(1.9, 0.22, 1.3);
const stoneMat = toon(0xfffdf7);
for (let i = 0; i < STONES; i++){
  const t = i / (STONES - 1);
  const p = curve.getPoint(t);
  const tan = curve.getTangent(t);
  const stone = new THREE.Mesh(stoneGeo, stoneMat);
  stone.position.copy(p);
  stone.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI / 2;
  stone.position.y = p.y + 0.1;
  stone.receiveShadow = true;
  stone.castShadow = true;
  if (i % 3 === 0) addOutline(stone, 0.03);
  scene.add(stone);
}

/* dashed centre line */
for (let i = 0; i < STONES; i += 2){
  const t = i / (STONES - 1);
  const p = curve.getPoint(t);
  const tan = curve.getTangent(t);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.5), toon(PALETTE.red));
  dash.position.copy(p).setY(p.y + 0.24);
  dash.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI / 2;
  scene.add(dash);
}

/* ── checkpoints ─────────────────────────────────────────────────────────── */
const CHECKPOINTS = [0.12, 0.38, 0.64, 0.9];
const flagColors = [PALETTE.red, PALETTE.ink, PALETTE.sky, PALETTE.sun];
const flags = [];

QUESTS.forEach((quest, i) => {
  const t = CHECKPOINTS[i];
  const p = curve.getPoint(t);
  const tan = curve.getTangent(t);

  const g = new THREE.Group();
  g.position.copy(p).add(new THREE.Vector3(1.6 + (i % 2) * 3.0, 0.2, 0));
  g.rotation.y = Math.atan2(tan.x, tan.z);
  scene.add(g);

  /* pole */
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5.6, 8), toon(PALETTE.ink));
  pole.position.y = 2.8;
  pole.castShadow = true;
  addOutline(pole, 0.04);
  g.add(pole);

  /* the flag: a simple pennant built from a triangle */
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(2.3, -0.62); shape.lineTo(0, -1.24); shape.lineTo(0, 0);
  const flagGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  const flag = new THREE.Mesh(flagGeo, toon(flagColors[i]));
  flag.position.set(0.06, 5.5, 0);
  flag.scale.setScalar(0.82);
  flag.castShadow = true;
  flag.material.side = THREE.DoubleSide;
  g.add(flag);
  flag.userData.rest = 0;


  /* the plaque with the quest name */
  const plaque = makeScreen({
    w: 3.6, h: 1.9,
    title: quest.title,
    subtitle: quest.meta,
    accent: flagColors[i],
    theme: 'light',
    progress: 1,
  });
  plaque.position.set(1.9, 3.05, 0);
  g.add(plaque);
  page.pickable(plaque, { type: 'quest', quest, index: i });
  page.pickable(flag, { type: 'quest', quest, index: i });
  page.pickable(pole, { type: 'quest', quest, index: i });

  flags.push({ flag, g, plaque, t, yaw: g.rotation.y });
});

/* a camp at the bottom of the road */
const campfire = new THREE.Group();
campfire.position.set(-6.6, 0, 6.4);
scene.add(campfire);
for (let i = 0; i < 5; i++){
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 6), toon(0xd9cbb0));
  log.rotation.z = Math.PI / 2;
  log.rotation.y = (i / 5) * Math.PI;
  log.position.y = 0.2;
  addOutline(log, 0.05);
  campfire.add(log);
}
const ember = new THREE.PointLight(0xff8a3c, 6, 6, 2);
ember.position.set(-6.6, 0.9, 6.4);
scene.add(ember);

/* trees + dust */
[[-7.5, -3], [7.5, -6], [-8.6, 5.5], [9.5, 2.5]].forEach(([x, z], i) => {
  const tree = createTree({ scale: 1.1 + (i % 2) * 0.3, kind: i % 2 ? 'pine' : 'round' });
  tree.position.set(x, 0, z);
  scene.add(tree);
});
const dust = floatDust(110, 22, 0xffd27f);
scene.add(dust.points);

/* ── Claude keeps watch at the head of the road ──────────────────────────── */
const blocky = new Mascot(scene, { mode: 'stage', scale: 0.75, label: 'CLAUDE' });
const start = curve.getPoint(0.04);
blocky.root.position.set(start.x - 2.2, 0.1, start.z - 0.5);
blocky.target.copy(blocky.root.position);
blocky.faceVisitor(page.camera);   // square on to the visitor, planted
page.pickable(blocky.root, { type: 'blocky' });

/* ── animation ───────────────────────────────────────────────────────────── */
let hopT = 0;
page.onUpdate((rawDt, t) => {
  const dt = Number.isFinite(rawDt) ? rawDt : 0.016;
  blocky.update(dt, t, {});
  dust.update(t);
  ember.intensity = 5 + Math.sin(t * 9) * 1.6 + Math.sin(t * 23) * 0.6;

  /* flags ripple, plates turn to face the camera */
  flags.forEach((f, i) => {
    f.flag.rotation.y = Math.sin(t * 2.4 + i) * 0.16;
    f.flag.rotation.z = Math.sin(t * 3.1 + i * 2) * 0.05;
    const world = new THREE.Vector3();
    f.plaque.getWorldPosition(world);
    const want = Math.atan2(camera.position.x - world.x, camera.position.z - world.z) - f.yaw;
    let d = ((want - f.plaque.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    f.plaque.rotation.y += d * Math.min(1, dt * 4);
  });

  hopT += dt;
  if (hopT > 3.0){ hopT = 0; blocky.hop(); }

  /* Claude keeps his post at the head of the road and watches the visitor */
  const rig = blocky.root.userData.rig;
  if (rig) rig.rig.position.y = Math.sin(t * 1.6) * 0.045;
});

/* ── click a flag ────────────────────────────────────────────────────────── */
page.onClick((data) => {
  if (data.type === 'blocky'){
    Audio.sfx('click');
    blocky.hop();
    toast('THIS ROAD IS SHORT. THE CV IS LONGER.');
    return;
  }
  if (data.type !== 'quest') return;
  const q = data.quest;
  Audio.sfx('open');
  openPanel({
    title: q.title.toUpperCase(),
    footer: q.meta,
    body: `
      <div class="doc">
        <h3>Role ${data.index + 1} of ${QUESTS.length}</h3>
        <ul>${q.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        <h3>Education</h3>
        ${timeline(EDUCATION.map((e) => ({ title: e.title, meta: e.meta, body: e.body })))}
      </div>
      <div class="play-row">
        <a class="btn btn--primary" href="contact.html">Get in touch</a>
        <a class="btn" href="index.html?resume=1">Back to the island</a>
      </div>`,
  });
});
