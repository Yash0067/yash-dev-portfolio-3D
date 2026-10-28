/* ═══════════════════════════════════════════════════════════════════════════
   contact.js — mission control.
   A rocket on the pad, a gantry, smoke. Press LAUNCH and it actually goes.
   Every contact route is a real, keyboard-reachable link in the overlay.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { toon, addOutline, PALETTE, rand } from './world.js';
import { bootPage, floatDust } from './page.js';
import { GUIDES } from './guide.js';
import { Mascot, confettiBurst } from './claude.js';
import { PROFILE } from './content.js';
import { $, openPanel, bindSoundControls, toast, esc } from './ui.js';
import { Audio, armAudio } from './audio.js';

armAudio();
bindSoundControls();

const page = bootPage({
  canvas: $('#gl'),
  guide: GUIDES.contact,
  background: 0xf7f4ec,
  fog: { color: 0xf7f4ec, near: 34, far: 88 },
  camera: { pos: [9.5, 6.4, 15.5], look: [0.4, 4.2, 0], fov: 42 },
  bloom: 0.26,
  vignette: 0.36,
  autoRotate: 0.035,
  pitchLimit: [-0.05, 0.62],
  distanceLimit: [12, 30],
  target: new THREE.Vector3(0.4, 4.2, 0),
});
const { scene, camera } = page;

scene.add(new THREE.HemisphereLight(0xf6fbff, 0xeceae1, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.position.set(12, 18, 10);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -16; key.shadow.camera.right = 16;
key.shadow.camera.top = 22; key.shadow.camera.bottom = -6;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffd9c0, 0.5);
rim.position.set(-10, 8, -8);
scene.add(rim);

/* ── ground + pad ────────────────────────────────────────────────────────── */
const ground = new THREE.Mesh(new THREE.CircleGeometry(28, 56), toon(0xfbf8f0));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.0, 0.6, 32), toon(0xf1ece0));
pad.position.y = 0.3;
pad.receiveShadow = true;
pad.castShadow = true;
addOutline(pad, 0.02);
scene.add(pad);
const padRing = new THREE.Mesh(
  new THREE.RingGeometry(3.5, 3.9, 48),
  new THREE.MeshBasicMaterial({ color: PALETTE.red, toneMapped: false }),
);
padRing.rotation.x = -Math.PI / 2;
padRing.position.y = 0.62;
scene.add(padRing);

/* hazard stripes around the pad */
for (let i = 0; i < 16; i++){
  const a = (i / 16) * Math.PI * 2;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.9), new THREE.MeshBasicMaterial({
    color: i % 2 ? PALETTE.ink : PALETTE.sun, toneMapped: false,
  }));
  stripe.position.set(Math.cos(a) * 4.3, 0.61, Math.sin(a) * 4.3);
  stripe.rotation.y = -a;
  scene.add(stripe);
}

/* ── the rocket ──────────────────────────────────────────────────────────── */
const rocket = new THREE.Group();
rocket.position.set(0, 0.6, 0);
scene.add(rocket);

/* body */
const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 5.2, 24), toon(0xfffdf7));
body.position.y = 2.6;
body.castShadow = true;
body.receiveShadow = true;
addOutline(body, 0.012);
rocket.add(body);

/* nose cone */
const nose = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.3, 24), toon(PALETTE.red));
nose.position.y = 6.35;
nose.castShadow = true;
addOutline(nose, 0.014);
rocket.add(nose);

/* red band */
const band = new THREE.Mesh(new THREE.CylinderGeometry(1.09, 1.09, 0.42, 24), toon(PALETTE.red));
band.position.y = 3.5;
rocket.add(band);

/* porthole */
const portRim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.11, 10, 24), toon(PALETTE.ink));
portRim.position.set(0, 4.5, 1.06);
rocket.add(portRim);
const portGlass = new THREE.Mesh(
  new THREE.CircleGeometry(0.42, 20),
  new THREE.MeshBasicMaterial({ color: 0x9fd8ff, toneMapped: false }),
);
portGlass.position.set(0, 4.5, 1.08);
rocket.add(portGlass);

/* fins */
for (let i = 0; i < 3; i++){
  const a = (i / 3) * Math.PI * 2 + 0.5;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 1.3), toon(PALETTE.red));
  fin.position.set(Math.cos(a) * 1.15, 0.85, Math.sin(a) * 1.15);
  fin.rotation.y = -a;
  fin.rotation.z = Math.cos(a) * 0.25;
  fin.castShadow = true;
  addOutline(fin, 0.02);
  rocket.add(fin);
}

/* nozzle */
const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.95, 0.7, 16), toon(0x2a2a33));
nozzle.position.y = 0.0;
rocket.add(nozzle);

const flame = new THREE.Group();
flame.position.y = -0.4;
rocket.add(flame);
for (let i = 0; i < 3; i++){
  const f = new THREE.Mesh(
    new THREE.ConeGeometry(0.55 - i * 0.12, 1.6 + i * 0.5, 10),
    new THREE.MeshBasicMaterial({ color: [0xffd23c, 0xff8a1a, PALETTE.red][i], transparent: true, opacity: 0.9, toneMapped: false }),
  );
  f.position.y = -0.8 - i * 0.35;
  f.rotation.x = Math.PI;
  flame.add(f);
}
flame.visible = false;

/* ── gantry tower ────────────────────────────────────────────────────────── */
const gantry = new THREE.Group();
gantry.position.set(-2.9, 0.6, 0);
scene.add(gantry);
[[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([x, z]) => {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 7.4, 0.18), toon(0xd8d2c4));
  leg.position.set(x, 3.7, z);
  leg.castShadow = true;
  addOutline(leg, 0.03);
  gantry.add(leg);
});
for (let i = 1; i <= 4; i++){
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), toon(0xd8d2c4));
  brace.position.y = i * 1.6;
  gantry.add(brace);
}
const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.24), toon(PALETTE.ink));
arm.position.set(0.9, 5.4, 0);
gantry.add(arm);

/* ── launch button, floating in 3D ───────────────────────────────────────── */
const btnCanvas = document.createElement('canvas');
btnCanvas.width = 512; btnCanvas.height = 256;
const bx = btnCanvas.getContext('2d');
bx.fillStyle = '#ff2a00'; bx.fillRect(0, 0, 512, 256);
bx.strokeStyle = '#121216'; bx.lineWidth = 16; bx.strokeRect(8, 8, 496, 240);
bx.fillStyle = '#fffdf7';
bx.font = 'bold 64px "Press Start 2P", monospace';
bx.textAlign = 'center'; bx.textBaseline = 'middle';
bx.fillText('LAUNCH', 256, 128);
const btnTex = new THREE.CanvasTexture(btnCanvas);
btnTex.colorSpace = THREE.SRGBColorSpace;
const launchBtn = new THREE.Mesh(
  new THREE.PlaneGeometry(2.6, 1.3),
  new THREE.MeshBasicMaterial({ map: btnTex, toneMapped: false, side: THREE.DoubleSide }),
);
launchBtn.position.set(4.6, 3.2, 1.4);
launchBtn.rotation.y = -0.5;
scene.add(launchBtn);
addOutline(launchBtn, 1.04);
page.pickable(launchBtn, { type: 'launch' });

/* a stand under the button */
const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 3.2, 8), toon(PALETTE.ink));
stand.position.set(4.6, 1.6, 1.4);
scene.add(stand);

/* ── smoke + dust ────────────────────────────────────────────────────────── */
const smoke = [];
const smokeGeo = new THREE.IcosahedronGeometry(0.6, 0);
for (let i = 0; i < 26; i++){
  const puff = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
  }));
  puff.position.set(rand(-1, 1), 0.3, rand(-1, 1));
  puff.userData.life = 0;
  puff.userData.vel = new THREE.Vector3();
  scene.add(puff);
  smoke.push(puff);
}
const dust = floatDust(100, 24, 0xffd27f);
scene.add(dust.points);

/* ── the crew: Claude in a little helmet ─────────────────────────────────── */
const blocky = new Mascot(scene, { mode: 'stage', scale: 0.8, glow: true, label: 'CLAUDE' });
blocky.root.position.set(5.0, 0.02, 1.2);
blocky.target.copy(blocky.root.position);
blocky.faceVisitor(page.camera);   // square on to the visitor, planted
page.pickable(blocky.root, { type: 'blocky' });

/* ── launch state machine ────────────────────────────────────────────────── */
const launch = { t: -1, fired: false };
let hopT = 0, waveT = 0;

function fire(){
  if (launch.fired) return;
  launch.fired = true;
  launch.t = 0;
  flame.visible = true;
  Audio.sfx('power');
  Audio.sfx('portal');
  toast('T-MINUS… LIFT OFF. BLOCKY IS SCREAMING WITH JOY.');
  const burst = confettiBurst(scene, new THREE.Vector3(0, 7.5, 0), { count: 70, spread: 3 });
  page.onUpdate((dt) => burst.update(dt));
  setTimeout(() => Audio.sfx('achievement'), 900);
}

page.onUpdate((dt, t) => {
  blocky.update(dt, t, {});
  dust.update(t);

  hopT += dt;
  if (hopT > 2.4){ hopT = 0; blocky.hop(); }
  waveT += dt;
  if (waveT > 7){ waveT = 0; blocky.wave(); blocky.tipCap(); }   /* the epilogue goodbye */

  /* the button breathes */
  const s = 1 + Math.sin(t * 2.2) * 0.03;
  launchBtn.scale.set(s, s, 1);
  launchBtn.position.y = 3.2 + Math.sin(t * 1.6) * 0.08;

  if (launch.t >= 0){
    launch.t += dt;
    const k = launch.t;
    /* shake, climb, then reset after a while so the page stays usable */
    if (k < 0.8){
      rocket.position.x = Math.sin(k * 60) * 0.06;
      flame.scale.setScalar(0.6 + k);
    } else {
      rocket.position.y = 0.6 + (k - 0.8) * 7 * Math.min(1, (k - 0.8) * 2);
      camera.position.x += Math.sin(k * 30) * 0.02;
    }
    flame.scale.setScalar(Math.min(1.6, 0.6 + k));
    smoke.forEach((p, i) => {
      if (p.userData.life <= 0 && k > 0.8 && i % 2 === 0){
        p.userData.life = rand(0.8, 1.6);
        p.position.set(rand(-1.2, 1.2), 0.4, rand(-1.2, 1.2));
        p.userData.vel.set(rand(-1.6, 1.6), rand(-0.2, 0.6), rand(-1.6, 1.6));
      }
    });
    if (k > 6){
      launch.t = -1;
      launch.fired = false;
      rocket.position.set(0, 0.6, 0);
      flame.visible = false;
    }
  }

  smoke.forEach((p) => {
    if (p.userData.life > 0){
      p.userData.life -= dt;
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.vel.multiplyScalar(0.98);
      const l = Math.max(0, p.userData.life);
      p.material.opacity = Math.min(0.8, l * 0.55);
      p.scale.setScalar(1 + (1.6 - l) * 1.6);
      if (p.userData.life <= 0) p.material.opacity = 0;
    }
  });
});

/* ── clicks ──────────────────────────────────────────────────────────────── */
page.onClick((data) => {
  if (data.type === 'launch'){ fire(); return; }
  if (data.type === 'blocky'){
    Audio.sfx('click');
    blocky.hop();
    toast('BLOCKY IS IN CHARGE OF COUNTDOWN. HE COUNTS BACKWARDS FROM THREE.');
  }
});

/* the HTML launch button in the overlay does the same thing */
$('#launchTop')?.addEventListener('click', () => { Audio.unlock?.(); fire(); });

/* ── the contact details, in normal HTML for accessibility ───────────────── */
function contactMarkup(){
  return `
    <div class="doc">
      <h3>Direct</h3>
      <p><a href="mailto:${PROFILE.email}">${esc(PROFILE.email)}</a><br>
         <a href="${PROFILE.phoneHref}">${esc(PROFILE.phone)}</a></p>
      <h3>Elsewhere</h3>
      <p><a href="${PROFILE.linkedin}" target="_blank" rel="noopener">LinkedIn</a> ·
         <a href="${PROFILE.github}" target="_blank" rel="noopener">GitHub</a></p>
      <h3>Based in</h3>
      <p>${esc(PROFILE.location)} · ${esc(PROFILE.availability)}.</p>
    </div>`;
}

$('#contactCard')?.addEventListener('click', () => {
  Audio.sfx('open');
  openPanel({
    title: 'CONTACT',
    footer: 'MUMBAI · IST (UTC+5:30)',
    body: `${contactMarkup()}
      <div class="play-row">
        <a class="btn btn--primary" href="mailto:${PROFILE.email}?subject=Hello%20Yash">Email me</a>
        <a class="btn" href="${PROFILE.resume}" download>Download résumé</a>
      </div>`,
  });
});
