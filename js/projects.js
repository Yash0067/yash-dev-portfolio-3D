/* ═══════════════════════════════════════════════════════════════════════════
   projects.js — the podium room.
   Dark stage, glossy reflective floor, three stone podiums (the tallest in the
   middle), the top three projects as floating screens, the other two on a low
   shelf, and Claude celebrating on podium 1.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { toon, addOutline, PALETTE } from './world.js';
import { bootPage, makeScreen, makePodium, floatDust } from './page.js';
import { GUIDES } from './guide.js';
import { Mascot, confettiBurst } from './claude.js';
import { PROJECTS } from './content.js';
import { $, openPanel, bindSoundControls, toast, tagList, esc } from './ui.js';
import { Audio, armAudio } from './audio.js';

armAudio();
bindSoundControls();

/* ── scene ───────────────────────────────────────────────────────────────── */
const page = bootPage({
  canvas: $('#gl'),
  guide: GUIDES.projects,
  background: 0x0b0b10,
  fog: { color: 0x0b0b10, near: 26, far: 78 },
  camera: { pos: [0, 9.4, 20], look: [0, 6.2, -4], fov: 48 },
  bloom: 0.55,
  vignette: 0.65,
  autoRotate: 0.055,
  pitchLimit: [0.02, 0.62],
  distanceLimit: [12, 34],
  target: new THREE.Vector3(0, 5.6, -3),
});
const { scene, camera } = page;

/* lights: one warm spotlight on the podium, two cold rims, almost no ambient */
scene.add(new THREE.HemisphereLight(0x8899ff, 0x0a0a10, 0.22));

const spot = new THREE.SpotLight(0xfff4e6, 210, 46, 0.72, 0.9, 1.55);
spot.position.set(0, 15, 7);
spot.target.position.set(0, 2, 0);
spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024);
spot.shadow.bias = -0.0008;
scene.add(spot, spot.target);

const rimA = new THREE.PointLight(0xff2a00, 30, 26, 2);
rimA.position.set(-7, 4.5, -3);
const rimB = new THREE.PointLight(0x2f9bff, 34, 26, 2);
rimB.position.set(7.5, 3.4, -2);
scene.add(rimA, rimB);

/* a cool front fill so the stone reads as stone, not mud */
const fill = new THREE.PointLight(0xbfd4ff, 80, 30, 1.7);
fill.position.set(0, 6.5, 11);
scene.add(fill);

/* floor: a dark reflective plane + a soft gloss sheet above it */
const reflector = new Reflector(new THREE.PlaneGeometry(46, 46), {
  clipBias: 0.003,
  textureWidth: 512,
  textureHeight: 512,
  color: 0x2a2a35,
});
reflector.rotation.x = -Math.PI / 2;
reflector.position.y = 0.01;
scene.add(reflector);

const gloss = new THREE.Mesh(
  new THREE.PlaneGeometry(46, 46),
  new THREE.MeshBasicMaterial({ color: 0x0b0b10, transparent: true, opacity: 0.52 }),
);
gloss.rotation.x = -Math.PI / 2;
gloss.position.y = 0.02;
scene.add(gloss);

/* stage disc */
const stage = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.4, 0.24, 64), toon(0x17171f));
stage.position.y = -0.08;
stage.receiveShadow = true;
scene.add(stage);
const stageRing = new THREE.Mesh(
  new THREE.RingGeometry(8.9, 9.15, 64),
  new THREE.MeshBasicMaterial({ color: PALETTE.red, transparent: true, opacity: 0.3, toneMapped: false }),
);
stageRing.rotation.x = -Math.PI / 2;
stageRing.position.y = 0.05;
scene.add(stageRing);

/* backdrop: a wall of dark panels so reflections have something to catch */
const backdrop = new THREE.Mesh(new THREE.BoxGeometry(46, 20, 0.6), toon(0x101017));
backdrop.position.set(0, 9, -13);
backdrop.receiveShadow = true;
scene.add(backdrop);
for (let i = 0; i < 7; i++){
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 12, 0.2),
    new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? PALETTE.red : 0x2a2a38, toneMapped: false }),
  );
  strip.position.set(-15 + i * 5, 6.5, -12.6);
  scene.add(strip);
}

/* dust */
const dust = floatDust(150, 26, 0xffd9c0);
scene.add(dust.points);

/* ── the podium arrangement ──────────────────────────────────────────────── */
const top3 = PROJECTS.slice(0, 3);
const rest = PROJECTS.slice(3);

const podiumSpecs = [
  { x: 0, h: 2.9, number: '1', project: top3[0] },
  { x: -4.4, h: 2.1, number: '2', project: top3[1] },
  { x: 4.4, h: 1.6, number: '3', project: top3[2] },
];

const pageScreens = [];

podiumSpecs.forEach((spec, i) => {
  const p = makePodium({ width: 2.3, height: spec.h, depth: 2.3 });
  p.group.position.set(spec.x, 0, 0);
  scene.add(p.group);

  /* number plate facing the camera */
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 1.05),
    new THREE.MeshBasicMaterial({ map: p.plateTexture, transparent: true, toneMapped: false }),
  );
  p.group.add(plate);
  /* redraw the plate with the right digit */
  const cv = p.plateTexture.image;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#e8e2d4'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#121216'; ctx.lineWidth = 10; ctx.strokeRect(14, 14, 228, 228);
  ctx.fillStyle = '#121216';
  ctx.font = 'bold 150px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(spec.number, 128, 138);
  p.plateTexture.needsUpdate = true;
  plate.position.set(0, spec.h * 0.55, 1.17);

  /* floating screen above the podium */
  const screen = makeScreen({
    w: 3.4, h: 2.1,
    title: spec.project.title,
    subtitle: `${spec.project.kind} · ${spec.project.year}`,
    accent: [PALETTE.red, PALETTE.sky, PALETTE.sun][i],
  });
  screen.position.set(spec.x, spec.h + 2.5, 0);
  screen.userData.baseY = screen.position.y;
  screen.userData.phase = i * 1.7;
  scene.add(screen);
  pageScreens.push(screen);
  page.pickable(screen, { type: 'project', project: spec.project });

  /* a light beam from the screen down to the podium top */
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.5, spec.h + 1.5, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: [PALETTE.red, PALETTE.sky, PALETTE.sun][i], transparent: true, opacity: 0.13,
      side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
    }),
  );
  beam.position.set(spec.x, (spec.h + 1.5) / 2, 0);
  scene.add(beam);
});

/* ── the two remaining projects on a low shelf ───────────────────────────── */
const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.9, 1.4), toon(0x1b1b24));
shelf.position.set(-7.4, 0.45, 3.4);
shelf.rotation.y = 0.5;
shelf.castShadow = true; shelf.receiveShadow = true;
addOutline(shelf, 0.01);
scene.add(shelf);

/* shelf legs */
[-1.8, 1.8].forEach((x) => {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.9, 1.1), toon(0x12121a));
  leg.position.set(x, 0.45, 0);
  shelf.add(leg);
});
/* a lamp on the bench so the corner is not dead */
const benchLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.4, 8), toon(0x2a2a33));
benchLamp.position.set(1.4, 1.6, 0);
shelf.add(benchLamp);
const benchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: PALETTE.red, toneMapped: false }));
benchBulb.position.set(1.4, 2.34, 0);
shelf.add(benchBulb);

/* ── the wall of ten: every build in the world, not just in a list ─────────
   Three are on the podium; the other ten hang on a lit wall behind them,
   five to a row, each one clickable.                                       */
const wall = new THREE.Mesh(new THREE.BoxGeometry(23, 7.4, 0.6), toon(0x171720));
wall.position.set(0, 8.2, -13);
wall.receiveShadow = true;
scene.add(wall);
const wallBand = new THREE.Mesh(new THREE.BoxGeometry(23.4, 0.3, 0.7), toon(PALETTE.red));
wallBand.position.set(0, 11.6, -12.95);
scene.add(wallBand);
const wallBand2 = new THREE.Mesh(new THREE.BoxGeometry(23.4, 0.16, 0.7), toon(0x2a2a33));
wallBand2.position.set(0, 4.75, -12.95);
scene.add(wallBand2);

const COLS = 5;
rest.forEach((project, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const screen = makeScreen({
    w: 3.5, h: 2.15,
    title: project.title,
    subtitle: `${project.kind} · ${project.year}`,
    accent: [PALETTE.sky, PALETTE.sun, PALETTE.red][i % 3],
    theme: 'light',
  });
  screen.position.set((col - (COLS - 1) / 2) * 4.5, 7.6 + (1 - row) * 2.7, -12.05);
  screen.userData.baseY = screen.position.y;
  screen.userData.phase = 2 + i * 0.7;
  scene.add(screen);
  pageScreens.push(screen);
  page.pickable(screen, { type: 'project', project });

  /* a small lamp bar under each row so the wall reads as lit */
});

/* ── Claude takes the podium ─────────────────────────────────────────────── */
const blocky = new Mascot(scene, { mode: 'stage', scale: 1.04, glow: true, label: 'CLAUDE' });
blocky.root.position.set(0, podiumSpecs[0].h + 0.14, 0.78);
blocky.target.copy(blocky.root.position);   // stay on the podium, do not spring away
blocky.faceVisitor(page.camera);   // square on to the visitor, planted
blocky.root.userData.rig.shadow.visible = false;

/* confetti + hop loop on arrival */
/* chapter moment: he cheers the top three, then sits down on podium 1 */
setTimeout(() => {
  Audio.sfx('achievement');
  blocky.spin();
  blocky.hop();
  blocky.tilt();
  const burst = confettiBurst(scene, new THREE.Vector3(0, podiumSpecs[0].h + 1.4, 0), { count: 90, spread: 2.6 });
  page.onUpdate((dt) => { burst.update(dt); });
  toast('CLAUDE IS VERY EXCITED ABOUT THESE PROJECTS');
}, 700);
setTimeout(() => { blocky.sit(); blocky.wave(); }, 3800);
/* he stands square on to the room unless he is spinning */
let hopTimer = 0;
page.onUpdate((dt, t) => {
  blocky.update(dt, t, {});
  hopTimer += dt;
  if (hopTimer > 1.9){ hopTimer = 0; blocky.hop(); }
  dust.update(t);

  /* screens bob and turn towards the camera */
  pageScreens.forEach((o) => {
    o.position.y = o.userData.baseY + Math.sin(t * 0.9 + o.userData.phase) * 0.12;
    const world = new THREE.Vector3();
    o.getWorldPosition(world);
    const targetYaw = Math.atan2(camera.position.x - world.x, camera.position.z - world.z);
    let diff = ((targetYaw - o.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    o.rotation.y += diff * Math.min(1, dt * (o.userData.local ? 1.4 : 2.2));
  });

  /* red rim light breathes */
  rimA.intensity = 26 + Math.sin(t * 1.4) * 10;
});

/* ── clicking a screen opens its case file ───────────────────────────────── */
page.onClick((data) => {
  if (data.type === 'archive'){
    Audio.sfx('open');
    openPanel({
      title: `THE ARCHIVE · ${PROJECTS.length} BUILDS`,
      footer: 'TOP THREE ARE ON THE PODIUM · EVERYTHING ELSE IS HERE',
      body: `
        <div class="doc">
          <h3>Every project, newest first</h3>
          <div class="arch-list">
            ${PROJECTS.map((pr, i) => `
              <button class="arch-item" type="button" data-arch="${i}">
                <span class="arch-num">${String(i + 1).padStart(2, '0')}</span>
                <span class="arch-name">${esc(pr.title)}</span>
                <span class="arch-meta">${esc(pr.kind)} · ${esc(pr.year)}</span>
              </button>`).join('')}
          </div>
        </div>
        <div class="play-row">
          <a class="btn btn--primary" href="https://github.com/Yash0067" target="_blank" rel="noopener">GitHub ↗</a>
          <a class="btn" href="index.html?resume=1">Back to the island</a>
        </div>`,
    });
    /* every row opens that project's own panel */
    document.querySelectorAll('[data-arch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pr = PROJECTS[Number(btn.dataset.arch)];
        if (pr) showProject(pr);
      });
    });
    return;
  }
  if (data.type !== 'project') return;
  showProject(data.project);
});

function showProject(p){
  Audio.sfx('open');
  openPanel({
    title: p.title.toUpperCase(),
    footer: `${p.kind} · ${p.year}`,
    body: `
      <div class="doc">
        <h3>What it is</h3>
        <p>${esc(p.detail)}</p>
        <h3>Tech</h3>
        ${tagList(p.tech)}
        <h3>What I focused on</h3>
        <ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      </div>
      <div class="play-row">
        <a class="btn btn--primary" href="${'https://github.com/Yash0067'}" target="_blank" rel="noopener">View on GitHub ↗</a>
        <a class="btn" href="index.html?resume=1">Back to the island</a>
      </div>`,
  });
}

/* keyboard: escape closes, enter opens the focused screen */
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return;      // handled by ui.js
  if (e.key.toLowerCase() === 'r'){ page.orbit.yaw = 0; page.orbit.pitch = 0.34; }
});
