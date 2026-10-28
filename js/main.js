/* ═══════════════════════════════════════════════════════════════════════════
   main.js — the island (index.html)
   Boot → load models → title flyover → play.
   Sections: 1 state · 2 scene · 3 world build · 4 player · 5 gameplay
             6 UI · 7 loop · 8 boot
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import {
  PALETTE, createRenderer, createSky, createWater, tickWater, createIsland, createFarIslands,
  createClouds, createBirds, createGrass, createParticles, createTree, createLamp,
  createBench, createCrate, createSignpost, toon, addOutline, makeGroundRing,
  CameraRig, DayNight, createComposer, tickWind, damp, clamp, rand, randi, billboardText,
} from './world.js';
import { MODELS, initModels } from './models.js';
import { initDebugPanel } from './debug.js';
import { createMap } from './map.js';
import { createTour } from './tour.js';
import { mountGuide, GUIDES } from './guide.js';
import { openArcade } from './minigame.js';
import { Quality } from './quality.js';
import { tweens, dampAngle, springStep, Ease, transitionTo, revealOnLoad, StateBlend, createIdle } from './anim.js';
import { Mascot as Guide, CLAUDE_PORTRAIT } from './claude.js';
import { Audio, armAudio, withMute } from './audio.js';
import {
  $, $$, toast, showAchievement, openPanel, closePanel, panelIsOpen, createDialogue,
  bindSoundControls, loadingBar, isTouch, reducedMotion, armButtons, onKeys, carryMute,
} from './ui.js';
import { ZONES, COINS, ROBOT_LINES, PROFILE, PROJECTS, SKILLS, QUESTS, EDUCATION, GUIDE_NAME } from './content.js';

/* ── 1 · state ───────────────────────────────────────────────────────────── */
const state = {
  mode: 'boot',                 // boot | title | play | panel | simple
  coins: new Set(),
  portals: new Set(),
  achievements: new Set(),
  speedUntil: 0,
  springCooldown: 0,
  nearPortal: null,
  nearNpc: false,
  nearBench: null,      // a bench within reach
  seated: null,         // the bench he is sitting on
  paused: false,
  t: 0,
  lastProgressAt: 0,     // last portal / coin, drives Claude's hint mode
  guideHint: false,
};

const reduced = reducedMotion();
const touch = isTouch();

/* ── 2 · scene ───────────────────────────────────────────────────────────── */
const canvas = $('#gl');
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.paper);
scene.fog = new THREE.Fog(PALETTE.paper, 62, 175);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 420);
camera.position.set(0, 22, 44);

const sky = createSky(scene);
const hemi = new THREE.HemisphereLight(0xe8f3ff, 0xe9e4d6, 1.25);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfffdf6, 2.1);
sun.position.set(22, 34, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
sun.shadow.camera.left = -42;
sun.shadow.camera.right = 42;
sun.shadow.camera.top = 42;
sun.shadow.camera.bottom = -42;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 110;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.04;
sun.shadow.radius = 3;
scene.add(sun, sun.target);

const water = createWater({ size: 430, y: -27 });
scene.add(water);

const island = createIsland({ radius: 30, depth: 26 });
scene.add(island);

const farIslands = createFarIslands(scene, 2);
const clouds = createClouds(scene, 11, 62);
const birds = createBirds(scene, 9);
const particles = createParticles(scene, reduced ? 60 : 220, 42);

const { composer, bloom, vignette } = createComposer(renderer, scene, camera, {
  bloom: 0.32, vignette: 0.5,
});

const dayNight = new DayNight({
  scene, sky, sun, hemi, fog: scene.fog, bloom, water,
  speed: reduced ? 1 / 900 : 1 / 260,
});
dayNight.onPhase = (night) => {
  Audio.setNight(night);
  document.body.dataset.phase = night ? 'night' : 'day';
};

/* lamps get warmer at night */
const lamps = [];

/* ── 3 · world build ─────────────────────────────────────────────────────── */
const colliders = [];        // meshes the camera must not pass through
let arcadeBuilding = null;   // the Skill Arcade cabinet — click it to play
const worldRoot = new THREE.Group();
scene.add(worldRoot);

const PLAY_RADIUS = 27;

/** a dashed path from the plaza out to a zone */
function addPath(from, to, color = PALETTE.red){
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const steps = Math.max(4, Math.floor(len / 2.1));
  const geo = new THREE.BoxGeometry(0.34, 0.05, 0.34);
  const mesh = new THREE.InstancedMesh(geo, toon(color), steps);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  dir.normalize();
  for (let i = 0; i < steps; i++){
    const p = new THREE.Vector3().copy(from).addScaledVector(dir, 6 + (i / steps) * (len - 8));
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dir.x, dir.z));
    m.compose(v.set(p.x, 0.04, p.z), q, s);
    mesh.setMatrixAt(i, m);
  }
  worldRoot.add(mesh);
  return mesh;
}

function addPropsAround(pos, modelIds){
  modelIds.forEach(({ id, offset, rot = 0, scale = 1 }) => {
    const m = models.cloneModel(id);
    m.position.set(pos[0] + offset[0], 0, pos[2] + offset[1]);
    m.rotation.y = rot;
    m.scale.multiplyScalar(scale);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    worldRoot.add(m);
    if (id === 'lamp'){
      lamps.push(m);
      const gl = new THREE.PointLight(PALETTE.sun, 0, 12, 2);
      gl.position.set(m.position.x, 3, m.position.z);
      worldRoot.add(gl);
      m.userData.light = gl;
    }
    if (['tree', 'pine', 'library', 'house', 'arcade', 'questboard', 'mailbox', 'bench', 'crate'].includes(id)){
      colliders.push(m);
    }
    if (id === 'bench'){
      m.userData.seat = true;
      benches.push(m);
    }
  });
}

let models = null;
let quality = null;
let player = null;
let npc = null;
let guide = null;
let portalGroup = [];
const benches = [];      // every bench you can sit on

/* the linear story the guide walks you through */
const CHAPTERS = ['projects', 'skills', 'about', 'quests', 'contact'];
let chapterOrder = CHAPTERS.slice();

function nextChapter(){
  for (const id of chapterOrder){
    if (!state.portals.has(id)){
      const found = portalGroup.find((p) => p.zone.id === id);
      if (found) return found;
    }
  }
  return null;
}

const GUIDE_LINES = [
  'Press E at a red ring. That is the whole game, honestly.',
  'Yash built me out of boxes. Zero curves, infinite confidence.',
  'Follow me. I will walk ahead and point at the doors, that is my job.',
  'Coin for rent. Twelve of them. It is a very cheap island.',
  'The yellow pod makes you fast. I make you look good. Teamwork.',
  'Lost? Follow the red dashes. I also follow the red dashes.',
  'Five portals. One has the résumé. Recruiters love portals.',
  'Yash says his Python is basic. I am not going to argue with him.',
  'I have read his code. It is tidy. He comments things. Rare.',
  'Ask me anything. I will answer in one or two sentences, because I am a cube.',
];

function buildWorld(){
  /* plaza */
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(7.2, 48), toon(PALETTE.paper2));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.015; plaza.receiveShadow = true;
  worldRoot.add(plaza);
  worldRoot.add(makeGroundRing(7.2, 0.22, PALETTE.ink));
  const plazaRing = makeGroundRing(6.6, 0.16, PALETTE.red);
  worldRoot.add(plazaRing);
  /* the spawn pad */
  const spawnPad = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.12, 24), toon(PALETTE.paper3));
  spawnPad.position.set(0, 0.06, 7.5); spawnPad.receiveShadow = true;
  worldRoot.add(spawnPad);
  const spawnRing = makeGroundRing(2.2, 0.1, PALETTE.ink);
  spawnRing.position.set(0, 0.14, 7.5);
  worldRoot.add(spawnRing);

  /* a bench on the plaza rim: the first place a visitor can sit down */
  const plazaBench = models.cloneModel('bench');
  plazaBench.position.set(4.6, 0, 8.6);
  plazaBench.rotation.y = Math.PI * 1.32;      // seat looks across the plaza
  plazaBench.traverse((o) => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  worldRoot.add(plazaBench);
  colliders.push(plazaBench);
  plazaBench.userData.seat = true;
  benches.push(plazaBench);

  /* zones: building + portal + props + label */
  ZONES.forEach((zone) => {
    const [x, , z] = zone.pos;

    /* the building itself comes from models.js (glb, or procedural fallback) */
    const building = models.cloneModel(zone.model);
    building.position.set(x, 0, z);
    building.rotation.y = MODELS[zone.model].rotation || 0;
    building.traverse((o) => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    worldRoot.add(building);
    colliders.push(building);
    if (zone.id === 'skills') arcadeBuilding = building;

    /* floating name plate */
    const plate = billboardText(zone.name, { size: 0.92 });
    plate.position.set(x, 6.5, z);
    worldRoot.add(plate);

    /* the portal: an original design — an ink ring, a spinning inner tube,
       three orbiting gate shards and a shimmer disc                        */
    const pg = new THREE.Group();
    pg.position.set(x, 0, z);
    const facing = Math.atan2(-x, -z);      // face the plaza
    pg.rotation.y = facing;

    /* move the portal to the plaza-facing side of the building */
    const offset = new THREE.Vector3(0, 0, 6.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), facing);
    pg.position.add(offset);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.2, 10, 40), toon(PALETTE.paper2));
    ring.position.y = 2.2;
    ring.castShadow = true;
    addOutline(ring, 0.028);
    pg.add(ring);

    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.085, 8, 36), new THREE.MeshBasicMaterial({ color: zone.color, toneMapped: false }));
    inner.position.y = 2.2;
    inner.name = 'innerRing';
    pg.add(inner);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.52, 32),
      new THREE.MeshBasicMaterial({ color: zone.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.position.y = 2.2;
    disc.name = 'disc';
    pg.add(disc);

    const shards = new THREE.Group();
    for (let i = 0; i < 3; i++){
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), toon(zone.color));
      s.position.set(Math.cos((i / 3) * Math.PI * 2) * 1.95, 2.2, Math.sin((i / 3) * Math.PI * 2) * 1.95);
      addOutline(s, 0.12);
      shards.add(s);
    }
    pg.add(shards);

    /* base + glow */
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.2, 0.26, 20), toon(PALETTE.paper2));
    base.position.y = 0.15; base.receiveShadow = true;
    pg.add(base);
    pg.add(makeGroundRing(2.05, 0.14, zone.color));
    const glowRing = makeGroundRing(1.85, 0.42, zone.color, 0.22);
    glowRing.position.y = 0.05;
    pg.add(glowRing);

    worldRoot.add(pg);
    portalGroup.push({ zone, group: pg, shards, inner, disc, glowRing, opened: false });

    /* props: a tree, a lamp, a bench or crate, a signpost — the arcade keeps its
       forecourt clear so the cabinet is reachable from every angle            */
    /* nothing tall goes behind a portal any more: the arch is the silhouette,
       so the ring keeps low props only and the trees live out on the rim      */
    addPropsAround(zone.pos, [
      { id: 'lamp', offset: [3.4, 4.2], rot: rand(0, 6.28) },
      { id: 'bench', offset: [-3.4, -3.6], rot: 0, scale: 1 },
      { id: 'crate', offset: [2.4, -4.4], rot: rand(0, 6.28), scale: 0.9 },
    ]);

    addPath(new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, 0, z));
  });

  /* filler scenery around the rim */
  const rng = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 16; i++){
    const a = (i / 16) * Math.PI * 2 + 0.2;
    const r = 24.5 + rng() * 3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const nearZone = ZONES.some((zn) => Math.hypot(zn.pos[0] - x, zn.pos[2] - z) < 11);
    if (nearZone) continue;
    const id = rng() < 0.55 ? 'tree' : 'pine';
    const m = models.cloneModel(id);
    m.position.set(x, 0, z);
    m.rotation.y = rng() * 6.28;
    m.scale.multiplyScalar(0.8 + rng() * 0.5);
    worldRoot.add(m);
    colliders.push(m);
  }

  /* grass: skip the plaza, the paths and the buildings */
  createGrass(scene, {
    count: touch ? 1200 : 2600,
    radius: 27,
    skip: (x, z) => {
      if (Math.hypot(x, z) < 8.4) return true;
      return ZONES.some((zn) => Math.hypot(zn.pos[0] - x, zn.pos[2] - z) < 7.2);
    },
  });

  /* NPC */
  npc = models.cloneModel('robot');
  npc.position.set(-3.4, 0.0, 5.2);
  npc.scale.setScalar(0.86);
  npc.rotation.y = -0.6;
  worldRoot.add(npc);
  npc.userData.baseY = 0;
  const npcGlow = new THREE.PointLight(PALETTE.red, 0.0, 6, 2);
  npcGlow.position.set(3.0, 1.6, 4.6);
  scene.add(npcGlow);
  npc.userData.glow = npcGlow;

  buildCollectibles();
  buildPowerups();
}

/* ── collectibles: 12 spinning coins in one InstancedMesh ────────────────── */
const coins = [];
let coinMesh = null;
const COIN_R = 0.42;

function buildCollectibles(){
  const geo = new THREE.CylinderGeometry(COIN_R, COIN_R, 0.12, 16);
  geo.rotateX(Math.PI / 2);
  const mat = toon(0xffd23c, { emissive: new THREE.Color(0x3a2a00), emissiveIntensity: 0.35 });
  coinMesh = new THREE.InstancedMesh(geo, mat, COINS.length);
  coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  coinMesh.castShadow = true;
  coinMesh.frustumCulled = false;
  scene.add(coinMesh);

  /* hand-placed spots: along the paths and between the zones */
  const spots = [
    [0, 0, 15], [7, 0, 10], [-8, 0, 9], [10, 0, 0], [-11, 0, -1],
    [0, 0, -13], [12, 0, -14], [-13, 0, 4], [-6, 0, 17], [6, 0, 18],
    [0, 0, -19], [19, 0, 2],
  ];
  COINS.forEach((c, i) => {
    const p = spots[i % spots.length];
    const coins3 = new THREE.Vector3(p[0], 1.15, p[2]);
    coins.push({ ...c, pos: coins3, got: false, phase: rand(0, 6.28), i });
  });
}

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

function updateCoins(t){
  if (!coinMesh) return;
  coins.forEach((c, i) => {
    if (c.got){
      _m4.makeScale(0, 0, 0);
    } else {
      c.pos.y = 1.15 + Math.sin(t * 2 + c.phase) * 0.16;
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 2.2 + c.phase);
      _m4.compose(_v.copy(c.pos), _q, _s.set(1, 1, 1));
      /* magnet-ish pickup check */
      if (state.mode === 'play'){
        const d = playerPos.distanceTo(c.pos);
        if (d < 1.5) collectCoin(c);
      }
    }
    coinMesh.setMatrixAt(i, _m4);
  });
  coinMesh.instanceMatrix.needsUpdate = true;
}

function collectCoin(c){
  c.got = true;
  guide?.spin();
  state.lastProgressAt = state.t;
  state.coins.add(c.label);
  Audio.sfx('coin');
  toast(`+1 COIN · ${c.label.toUpperCase()}`);
  updateHud();
  if (state.coins.size === 1) unlock('first-coin', { title: 'FIRST COIN!', text: 'The island noticed. Twelve more where that came from.' });
  if (state.coins.size >= 10) unlock('ten-coins', { title: 'COIN COLLECTOR', text: '10 coins. Somewhere, a robot is impressed.' });
  if (state.coins.size === COINS.length) unlock('all-coins', { title: 'COMPLETIONIST', text: 'Every coin on the island. Take the rest of the day off.' });
}

function unlock(id, payload){
  if (state.achievements.has(id)) return;
  state.achievements.add(id);
  showAchievement(payload);
}

/* ── power-ups: a speed pod and a spring pad (original designs) ──────────── */
let speedPod = null, springPad = null;

function buildPowerups(){
  /* SPEED POD — a fat teardrop pod with a leaf and a red band */
  speedPod = new THREE.Group();
  const podBody = new THREE.Mesh(new THREE.SphereGeometry(0.66, 14, 10), toon(PALETTE.sun));
  podBody.scale.set(1, 0.86, 1);
  podBody.position.y = 0.62;
  podBody.castShadow = true;
  addOutline(podBody, 0.05);
  speedPod.add(podBody);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 20), toon(PALETTE.red));
  band.rotation.x = Math.PI / 2; band.position.y = 0.62;
  speedPod.add(band);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 6), toon(PALETTE.ink));
  stem.position.y = 1.18; speedPod.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(0x7fbf6a));
  leaf.scale.set(1.4, 0.3, 0.8); leaf.position.set(0.18, 1.32, 0); leaf.rotation.z = -0.35;
  speedPod.add(leaf);
  speedPod.position.set(-4.2, 0, 11.5);
  speedPod.userData.home = speedPod.position.clone();
  scene.add(speedPod);

  /* SPRING PAD — a padded disc with red chevrons that kicks you skyward */
  springPad = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.34, 20), toon(PALETTE.sky));
  pad.position.y = 0.17; pad.receiveShadow = true; pad.castShadow = true;
  addOutline(pad, 0.03);
  springPad.add(pad);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.1, 20), toon(PALETTE.paper2));
  top.position.y = 0.36; springPad.add(top);
  for (let i = 0; i < 3; i++){
    const chev = new THREE.Mesh(new THREE.TorusGeometry(0.42 + i * 0.24, 0.055, 6, 14, Math.PI), toon(PALETTE.red));
    chev.rotation.x = -Math.PI / 2;
    chev.position.y = 0.43;
    springPad.add(chev);
  }
  springPad.position.set(4.6, 0, 11.2);
  scene.add(springPad);
  springPad.userData.home = springPad.position.clone();
  springPad.userData.ready = true;
}

function updatePowerups(dt, t){
  if (speedPod){
    speedPod.rotation.y += dt * 0.8;
    speedPod.position.y = Math.sin(t * 1.6) * 0.1;
    if (state.mode === 'play'){
      const d = playerPos.distanceTo(new THREE.Vector3(speedPod.position.x, 0.6, speedPod.position.z));
      if (d < 1.4 && state.speedUntil < state.t){
        state.speedUntil = state.t + 8;
        guide?.flashCap();
        guide?.hop();
        Audio.sfx('power');
        toast('SPEED POD · 8 SECONDS OF ZOOM');
        cameraRig.kick(0.2);
        speedPod.visible = false;
        setTimeout(() => { if (speedPod) speedPod.visible = true; }, 12000);
      }
    }
  }
  if (springPad && springPad.userData.ready && state.mode === 'play'){
    const d = Math.hypot(playerPos.x - springPad.position.x, playerPos.z - springPad.position.z);
    if (d < 1.5 && vy <= 0.2 && playerPos.y < 0.9){
      vy = 17;
      springPad.userData.ready = false;
      guide?.flashCap();
      Audio.sfx('power');
      cameraRig.kick(0.35);
      toast('SUPER JUMP!');
      setTimeout(() => { if (springPad) springPad.userData.ready = true; }, 2000);
    }
  }
}

/* ── player ──────────────────────────────────────────────────────────────── */
let playerRoot = null;
let vy = 0;
let grounded = true;
let facing = Math.PI;
let stepTimer = 0;
let jumpHold = false;

const playerPos = new THREE.Vector3(0, 0, 7.5);

function createPlayer(character){
  playerRoot = character.root;
  playerRoot.position.copy(playerPos);
  playerRoot.rotation.y = facing;
  scene.add(playerRoot);

  /* soft contact shadow */
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 20),
    new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  playerRoot.add(blob);
  playerRoot.userData.blob = blob;
}

const cameraRig = new CameraRig(camera, { distance: 12.4, height: 5.2, colliders });
let camYaw = 0;
const titleIdle = createIdle({ quiet: 2.2 });
let flyAngle = 0;      /* the flyover only advances while the visitor is idle */

/* ── input ───────────────────────────────────────────────────────────────── */
const keys = Object.create(null);
const down = (k) => !!keys[k];

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === ' ' && state.mode === 'play' && !busy()) jumpHold = true;
  if (k === 'e' && state.mode === 'play' && !busy()) interact();
  konami(k);
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/* drag to look */
let dragging = false, lastX = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (state.mode !== 'play') return;
  dragging = true; lastX = e.clientX;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - lastX) * 0.006;
  lastX = e.clientX;
});
canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (state.mode !== 'play' || busy()) return;
  /* a click (not a drag) on a portal ring opens it — no walking required */
  if (pointerDownAt){
    const moved = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
    pointerDownAt = null;
    if (moved > 8) return;
  } else {
    return;
  }
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1,
  ), camera);
  const portalHits = ray.intersectObjects(portalGroup.map((p) => p.group), true);
  if (!portalHits.length){
    /* no portal under the cursor — is it the arcade cabinet? */
    if (arcadeBuilding){
      const arcadeHits = ray.intersectObject(arcadeBuilding, true);
      if (arcadeHits.length) openCabinet();
    }
    return;
  }
  const hits = portalHits;
  /* walk up to whichever portal owns the mesh that was hit */
  let node = hits[0].object;
  while (node && !portalGroup.some((p) => p.group === node)) node = node.parent;
  const portal = portalGroup.find((p) => p.group === node);
  if (portal) enterPortal(portal);
});
canvas.addEventListener('pointercancel', () => { dragging = false; });

/* virtual stick */
const stick = $('#stick');
const knob = $('#stickKnob');
const stickVec = { x: 0, y: 0 };
let stickId = null;
if (touch && stick){
  const move = (e) => {
    e.preventDefault();
    const b = stick.getBoundingClientRect();
    const R = Math.max(20, (b.width - knob.offsetWidth) / 2 - 4);
    let dx = e.clientX - (b.left + b.width / 2);
    let dy = e.clientY - (b.top + b.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const c = Math.min(d, R);
    dx = (dx / d) * c; dy = (dy / d) * c;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stickVec.x = dx / R; stickVec.y = dy / R;
  };
  const end = () => {
    stickVec.x = stickVec.y = 0;
    knob.style.transform = 'translate(0,0)';
    stickId = null;
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    move(e);
  });
  stick.addEventListener('pointermove', (e) => {
    if (stickId === e.pointerId) move(e);
  });
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);
  stick.addEventListener('lostpointercapture', end);
  $('#jumpBtn')?.addEventListener('click', () => { jumpHold = true; });
}

/* ── 5 · gameplay ────────────────────────────────────────────────────────── */
const WALK = 6.6, RUN = 11.2, GRAVITY = 26, JUMP_V = 9.4;

/* the camera leads slightly in the walking direction (no allocation per frame) */
const aheadVec = new THREE.Vector3();
const _laVec = new THREE.Vector3();

function updatePlayer(dt){
  if (!playerRoot) return;

  /* how fast are we allowed to move right now? */
  const boosted = state.speedUntil > state.t;
  const running = down('shift');
  let speed = running ? RUN : WALK;
  if (boosted) speed *= 1.55;

  let ix = 0, iz = 0;
  if (down('w') || down('arrowup')) iz += 1;
  if (down('s') || down('arrowdown')) iz -= 1;
  if (down('a') || down('arrowleft')) ix -= 1;
  if (down('d') || down('arrowright')) ix += 1;

  /* stick input takes over on touch */
  if (touch && (Math.abs(stickVec.x) > 0.12 || Math.abs(stickVec.y) > 0.12)){
    ix = stickVec.x;
    iz = -stickVec.y;
  }

  const len = Math.hypot(ix, iz);
  const moving = len > 0.06;

  /* seated: the body stays on the bench until you stand or press a direction */
  if (state.seated){
    if (moving || jumpHold){ standUp(); }
    else {
      playerRoot.position.copy(playerPos);
      playerRoot.userData.blob.position.y = 0.03 - playerPos.y;
      animateCharacter(dt, { moving: false, running: false, boosted: false, seated: true });
      return;
    }
  }
  if (moving){
    ix /= len; iz /= len;
    /* input is camera-relative: forward is away from the camera */
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const dx = -iz * sin + ix * cos;
    const dz = -iz * cos - ix * sin;
    const target = Math.atan2(dx, dz);
    /* shortest-path turn */
    let diff = ((target - facing + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    facing += diff * Math.min(1, dt * 12);
    playerRoot.rotation.y = facing;

    const step = speed * dt;
    playerPos.x += dx * step;
    playerPos.z += dz * step;
    aheadVec.set(dx, 0, dz);            /* used by the camera's look-ahead */

    /* island edge */
    const r = Math.hypot(playerPos.x, playerPos.z);
    if (r > PLAY_RADIUS){
      playerPos.x = (playerPos.x / r) * PLAY_RADIUS;
      playerPos.z = (playerPos.z / r) * PLAY_RADIUS;
    }

    /* footsteps */
    stepTimer -= dt;
    if (stepTimer <= 0 && grounded){
      Audio.sfx('step');
      stepTimer = running ? 0.26 : 0.38;
    }
  }

  /* no input: let the camera lead fade away instead of snapping */
  if (!moving) aheadVec.multiplyScalar(Math.exp(-6 * dt));

  /* jump + gravity */
  if (jumpHold && grounded){
    vy = JUMP_V * (state.springBoost ? 1.25 : 1);
    grounded = false;
    Audio.sfx('jump');
  }
  jumpHold = false;

  vy -= GRAVITY * dt;
  playerPos.y += vy * dt;
  if (playerPos.y <= 0){
    if (!grounded){
      Audio.sfx('land');
      cameraRig.kick(0.16);
    }
    playerPos.y = 0;
    vy = 0;
    grounded = true;
  }

  playerRoot.position.copy(playerPos);
  playerRoot.userData.blob.position.y = 0.03 - playerPos.y;   // shadow stays on the floor

  animateCharacter(dt, { moving, running, boosted });
}

/* animation: glb clips when present, otherwise procedural limb swing */
let anim = null;
let animState = 'idle';

function animateCharacter(dt, { moving, running, boosted, seated = false }){
  if (!anim) return;
  const parts = anim.parts;

  if (anim.hasClips){
    const want = seated ? 'sit' : !grounded ? 'jump' : moving ? (running || boosted ? 'run' : 'walk') : 'idle';
    if (want !== animState){
      animState = want;
      anim.play(want, { fade: 0.2 });
    }
    return;
  }

  if (!parts) return;
  const t = state.t;

  /* seated pose: knees up, hands resting, a slow breath */
  if (seated){
    parts.legL.rotation.x = damp(parts.legL.rotation.x, -1.45, 9, dt);
    parts.legR.rotation.x = damp(parts.legR.rotation.x, -1.45, 9, dt);
    parts.armL.rotation.x = damp(parts.armL.rotation.x, -0.45, 9, dt);
    parts.armR.rotation.x = damp(parts.armR.rotation.x, -0.45, 9, dt);
    parts.torso.rotation.x = damp(parts.torso.rotation.x, 0.06, 9, dt);
    parts.hip.position.y = damp(parts.hip.position.y, 0.82 + Math.sin(t * 1.6) * 0.012, 9, dt);
    return;
  }
  const speed = running || boosted ? 11 : 6.6;
  if (!grounded){
    parts.legL.rotation.x = -0.5; parts.legR.rotation.x = 0.35;
    parts.armL.rotation.x = -1.5; parts.armR.rotation.x = -1.5;
    parts.torso.rotation.x = 0.1;
  } else if (moving){
    const s = Math.sin(t * (running || boosted ? 13 : 9));
    parts.legL.rotation.x = s * 0.7;
    parts.legR.rotation.x = -s * 0.7;
    parts.armL.rotation.x = -s * 0.6;
    parts.armR.rotation.x = s * 0.6;
    parts.torso.rotation.x = 0.06;
    parts.hip.position.y = 0.98 + Math.abs(Math.sin(t * (running ? 13 : 9))) * 0.05;
  } else {
    const breathe = Math.sin(t * 1.8) * 0.03;
    parts.legL.rotation.x = damp(parts.legL.rotation.x, 0, 8, dt);
    parts.legR.rotation.x = damp(parts.legR.rotation.x, 0, 8, dt);
    parts.armL.rotation.x = damp(parts.armL.rotation.x, breathe, 8, dt);
    parts.armR.rotation.x = damp(parts.armR.rotation.x, -breathe, 8, dt);
    parts.torso.rotation.x = breathe * 0.5;
    parts.hip.position.y = 0.98 + breathe * 0.2;
  }
}

/* portals + interaction */
function updatePortals(dt, t){
  state.nearPortal = null;
  portalGroup.forEach((p, i) => {
    p.shards.rotation.y += dt * 0.9;
    p.inner.rotation.z += dt * 0.6;
    p.disc.material.opacity = 0.18 + Math.sin(t * 2 + i) * 0.06;
    p.glowRing.material.opacity = 0.18 + Math.sin(t * 2 + i) * 0.08;
    p.group.position.y = Math.sin(t * 1.2 + i) * 0.06;

    if (state.mode !== 'play') return;
    const d = Math.hypot(playerPos.x - p.group.position.x, playerPos.z - p.group.position.z);
    if (d < 3.1){ state.nearPortal = p; state.nearPortalD = d; }
  });

  /* the arcade cabinet: stand in front of it and press E to play. Whichever of
     the two is nearer wins, so you never fight the prompt. */
  state.nearArcade = false;
  if (arcadeBuilding && state.mode === 'play'){
    const d = Math.hypot(playerPos.x - arcadeBuilding.position.x, playerPos.z - arcadeBuilding.position.z);
    state.arcadeD = d;
    if (d < 6.4 && (!state.nearPortal || d < state.nearPortalD)) state.nearArcade = true;
  }

  /* benches: stand next to one and you get the option to sit down */
  state.nearBench = null;
  if (state.mode === 'play' && !state.seated){
    let best = 1.9;
    benches.forEach((b) => {
      const d = Math.hypot(playerPos.x - b.position.x, playerPos.z - b.position.z);
      if (d < best){ best = d; state.nearBench = b; }
    });
  }

  const prompt = $('#prompt');
  const txt = $('#promptTxt');
  if (state.seated){
    prompt.classList.remove('hidden');
    txt.textContent = 'STAND UP';
  } else if (state.nearArcade && !state.nearPortal){
    prompt.classList.remove('hidden');
    txt.textContent = 'PLAY COIN RUSH';
  } else if (state.nearPortal){
    prompt.classList.remove('hidden');
    txt.textContent = `${state.portals.has(state.nearPortal.zone.id) ? 'RE-ENTER' : 'ENTER'} ${state.nearPortal.zone.name}`;
  } else if (state.nearNpc){
    prompt.classList.remove('hidden');
    txt.textContent = 'TALK TO BOT-9';
  } else if (state.nearBench){
    prompt.classList.remove('hidden');
    txt.textContent = 'SIT ON THE BENCH';
  } else {
    prompt.classList.add('hidden');
  }
}

function openCabinet(){
  if (tourOpen()) return;
  Audio.unlock();
  Audio.sfx('open');
  openArcade();
}

/** Sit on a bench: snap to the seat, face the way it faces, stop walking. */
function sitDown(bench){
  Audio.sfx('click');
  state.seated = bench;
  state.nearBench = null;
  const yaw = bench.rotation.y;
  /* sit ON the seat, a little back from the front edge, facing the same way
     the bench faces — not straddling it */
  const seat = new THREE.Vector3(
    bench.position.x - Math.sin(yaw) * 0.16,
    0.02,
    bench.position.z - Math.cos(yaw) * 0.16,
  );
  playerPos.copy(seat);
  facing = yaw;                        // look out over the front of the bench
  playerRoot.rotation.y = facing;
  vy = 0; grounded = true;
  cameraRig.kick(0.08);
  toast('TAKE A BREATH — E TO STAND UP', 1600);
}

function standUp(){
  Audio.sfx('step');
  const b = state.seated;
  state.seated = null;
  if (b){
    /* step off the front of the bench so you never pop back inside the seat */
    const yaw = b.rotation.y;
    playerPos.x = b.position.x + Math.sin(yaw) * 1.0;
    playerPos.z = b.position.z + Math.cos(yaw) * 1.0;
    playerPos.y = 0;
  }
  grounded = true;
}

function interact(){
  if (panelIsOpen()) { closePanel(); return; }
  if (tourOpen()) { tour.stop(); return; }
  if (state.seated){ standUp(); return; }
  if (state.nearBench){ sitDown(state.nearBench); return; }
  if (state.nearArcade && !state.nearPortal){ openCabinet(); return; }
  if (state.nearPortal){ enterPortal(state.nearPortal); return; }
  if (state.nearNpc){ talkToNpc(); return; }
}

/**
 * Opens the zone page in a NEW TAB.
 * This only ever runs inside a real click / key press handler, which is what
 * keeps pop-up blockers happy.
 */
/* Are we inside the app's preview iframe? Pop-ups are blocked there and so is
   top-level navigation — but the iframe may navigate ITSELF, which is what we
   use as the fallback so a door always opens. */
const EMBEDDED = (() => { try { return window.self !== window.top; } catch (e){ return true; } })();

/* Coming back from a chapter should drop you straight into the island, not on
   the landing screen. ?resume=1 says "you were already playing". */
const RESUME = new URLSearchParams(location.search).has('resume');

/** Where we were, and which doors were open — carried in the URL, no storage. */
function islandHash(){
  const v = [...state.portals].join(',');
  return `#x=${playerPos.x.toFixed(1)}&z=${playerPos.z.toFixed(1)}&v=${v}`;
}

function restoreFromHash(){
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return;
  const q = new URLSearchParams(raw);
  const x = parseFloat(q.get('x'));
  const z = parseFloat(q.get('z'));
  if (Number.isFinite(x) && Number.isFinite(z)){
    const r = Math.hypot(x, z);
    if (r < PLAY_RADIUS) playerPos.set(x, 0, z);
  }
  (q.get('v') || '').split(',').filter(Boolean).forEach((id) => {
    if (ZONES.some((zn) => zn.id === id)) state.portals.add(id);
  });
  updateHud();
}

function goTo(page){
  /* same-tab navigation: allowed everywhere, including sandboxed iframes */
  location.href = withMute(page);
}

/**
 * Opens the zone page in a NEW TAB, as the brief asks.
 * If the browser refuses (pop-up blocker) or we are inside a preview iframe,
 * it navigates this tab instead — a door that does not open is a bug.
 */
function enterPortal(p){
  Audio.sfx('portal');
  cameraRig.kick(0.4);
  markPortal(p.zone.id);
  const url = withMute(p.zone.page + islandHash());

  /* preview iframe: a new tab is impossible, so go straight to the page */
  if (EMBEDDED){
    toast(`OPENING ${p.zone.name}…`, 900);
    transitionTo(url);            /* eased fade, never a hard cut */
    return;
  }

  let win = null;
  try { win = window.open(url, '_blank'); } catch (e){ win = null; }

  if (win){
    try { win.opener = null; } catch (e){ /* older browsers */ }
    toast(`${p.zone.name} OPENED IN A NEW TAB`);
    return;
  }

  /* pop-up blocked: show a real link (cannot be blocked) and offer same-tab */
  toast('POP-UP BLOCKED — OPENING HERE INSTEAD', 2200);
  setTimeout(() => transitionTo(url), 260);
}

function markPortal(id){
  if (!ZONES.some((z) => z.id === id)) return;   /* e.g. story.html */
  if (state.portals.has(id)) return;
  state.lastProgressAt = state.t;
  state.guideHint = false;
  guide?.setHintTarget(null);
  state.portals.add(id);
  updateHud();

  /* the guide reacts, then walks on to the next chapter */
  guide?.spin();
  guide?.hop();
  const next = nextChapter();
  if (next){
    guide.leadTo(
      new THREE.Vector3(next.group.position.x, 0, next.group.position.z + 2.4),
      new THREE.Vector3(next.group.position.x, 1.7, next.group.position.z),
    );
  }
  const zone = ZONES.find((z) => z.id === id);
  toast(`PORTAL UNLOCKED · ${zone.name}`);
  if (state.portals.size === ZONES.length){
    setTimeout(() => unlock('all-portals', {
      title: 'WORLD EXPLORER',
      text: 'All five zones visited. The island salutes you.',
      cta: { label: 'Download resume', href: PROFILE.resume },
    }), 700);
  }
}

/* NPC */
function updateNpc(dt, t){
  if (!npc) return;
  const base = npc.userData.baseY ?? 0;
  npc.position.y = base + Math.sin(t * 1.6) * 0.06;
  npc.rotation.y = -0.6 + Math.sin(t * 0.6) * 0.25;
  npc.userData.glow.intensity = dayNight.night ? 1.6 : 0.25;

  if (state.mode !== 'play') return;
  const d = Math.hypot(playerPos.x - npc.position.x, playerPos.z - npc.position.z);
  state.nearNpc = d < 3.4;
  /* the robot leans towards you when you are close */
  if (d < 6){
    const target = Math.atan2(playerPos.x - npc.position.x, playerPos.z - npc.position.z);
    npc.rotation.y = damp(npc.rotation.y, target, 4, dt);
  }
}

const dialogue = createDialogue($('#dialogue'));

/* ── Claude: walk ahead, hint, click-to-talk ─────────────────────────────────── */
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
let pointerDownAt = null;

function nearestUnvisitedPortal(){
  let best = null, bestD = Infinity;
  portalGroup.forEach((p) => {
    if (state.portals.has(p.zone.id)) return;
    const d = Math.hypot(playerPos.x - p.group.position.x, playerPos.z - p.group.position.z);
    if (d < bestD){ bestD = d; best = p; }
  });
  return best;
}

function updateGuide(dt){
  if (!guide) return;
  const target = nearestUnvisitedPortal();
  const idle = state.t - state.lastProgressAt;

  /* hint mode: 30 s without visiting a portal → he walks over and waves you along */
  if (idle > 30 && target && !state.guideHint){
    state.guideHint = true;
    guide.setHintTarget(new THREE.Vector3(target.group.position.x, 0, target.group.position.z + 1.6));
    toast(GUIDE_NAME.toUpperCase() + ' KNOWS THE WAY · FOLLOW HIM');
    guide.hop(); guide.tilt();
    guide.say('We have not been through this one yet. Follow me.');
  }
  if (state.guideHint && target){
    guide.setHintTarget(new THREE.Vector3(target.group.position.x, 0, target.group.position.z + 1.6));
    /* bounce once it arrives */
    const d = Math.hypot(guide.root.position.x - target.group.position.x, guide.root.position.z - target.group.position.z);
    if (d < 4){ guide.bounce(); guide.tipCap(); }
  }

  guide.update(dt, state.t, {
    playerPos,
    grounded,
    camera,
    nearestPortal: target ? target.group.position : null,
    hint: state.guideHint,
  });
}

/* click / tap on Claude → a line in the dialogue box */
canvas.addEventListener('pointerdown', (e) => { pointerDownAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!pointerDownAt || !guide || state.mode !== 'play') return;
  const moved = Math.hypot(e.clientX - pointerDownAt.x, e.clientY - pointerDownAt.y);
  pointerDownAt = null;
  if (moved > 8) return;                       // that was a drag-look, not a click
  _ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  _ray.setFromCamera(_ndc, camera);
  if (guide.hitTest(_ray)){
    guide.hop();
    guide.say(GUIDE_LINES[randi(0, GUIDE_LINES.length - 1)]);
  }
});
function talkToNpc(){
  const line = ROBOT_LINES[randi(0, ROBOT_LINES.length - 1)];
  dialogue.show('BOT-9', line, { cps: 46 });
  Audio.sfx('open');
  clearTimeout(talkToNpc._t);
  talkToNpc._t = setTimeout(() => dialogue.hide(), 5200);
}

/* ── 6 · HUD + menus ─────────────────────────────────────────────────────── */
function updateHud(){
  const coinEl = $('#coinCount');
  if (coinEl) coinEl.textContent = String(state.coins.size).padStart(2, '0');
  const total = $('#coinTotal');
  if (total) total.textContent = String(COINS.length);
  $$('#portalDots i').forEach((el, i) => el.classList.toggle('on', state.portals.has(ZONES[i]?.id)));
  const pEl = $('#portalCount');
  if (pEl) pEl.textContent = `${state.portals.size}/${ZONES.length}`;
}

function bindHud(){
  bindSoundControls();
  armButtons();

  /* MAP: live overview of the island */
  $('#mapBtn')?.addEventListener('click', () => {
    Audio.sfx('click');
    const map = window.__MAP;
    if (!map) return;
    map.toggle();
    $('#mapBtn').setAttribute('aria-pressed', String(map.open()));
  });

  /* DOORS: five plain links. Works in any tab, iframe or preview, always. */
  $('#doorsBtn')?.addEventListener('click', () => {
    Audio.sfx('click');
    openPanel({
      title: 'THE FIVE DOORS',
      footer: 'PLAIN LINKS · NOTHING TO BLOCK',
      body: `
        <div class="doc">
          <p>Every chapter, as a normal link. Use these if a portal will not open
             — pop-ups and preview frames cannot stop an ordinary link.</p>
          <ul class="chapter-list">
            <li><a href="story.html">00 · The Gates</a> — the story entry</li>
            <li><a href="projects.html">01 · Hall of Creations</a> — five projects</li>
            <li><a href="skills.html">02 · Trials</a> — fifteen skills</li>
            <li><a href="about.html">03 · The Room</a> — education and the story</li>
            <li><a href="quests.html">04 · Work Experience</a> — what he has actually done</li>
            <li><a href="contact.html">05 · Epilogue</a> — contact and résumé</li>
          </ul>
          <h3>Or stay here</h3>
          <p>The 2D version of the whole portfolio is one link away, and it needs
             no WebGL at all.</p>
          <div class="play-row">
            <a class="btn btn--primary" href="index-2d.html">OPEN THE PLAIN PAGE</a>
            <a class="btn" href="story.html">CHAPTER ZERO →</a>
          </div>
        </div>`,
      onMount(body){
        $$('.chapter-list a', body).forEach((a) => a.addEventListener('click', () => Audio.sfx('portal')));
      },
    });
  });
  $('#hintClose')?.addEventListener('click', () => $('#hint')?.classList.add('hidden'));
  $('#promptBtn')?.addEventListener('click', (e) => { e.stopPropagation(); if (!busy()) interact(); });
  $('#menuBtn')?.addEventListener('click', () => openPanel({
    title: 'CHAPTERS',
    footer: 'YASH.DEV · MUMBAI',
    body: `
      <div class="guide-card">
        <div class="guide-face">${CLAUDE_PORTRAIT}</div>
        <div>
          <strong>${GUIDE_NAME}</strong>
          <span>Your guide. He walks ahead, waits at each door and points at what is next.</span>
        </div>
      </div>
      <div class="doc">
        <h3>Controls</h3>
        <ul>
          <li><b>W A S D</b> / arrows — walk</li>
          <li><b>Shift</b> — run · <b>Space</b> — jump</li>
          <li><b>E</b> — enter a portal / talk</li>
          <li><b>Drag</b> — look around · <b>Esc</b> — close panels</li>
          <li><b>M</b> — island map · <b>Click a ring</b> — open that chapter</li>
        </ul>
        <h3>Chapters</h3>
        <ul class="chapter-list">
          <li><a href="story.html">00 · The Gates</a> — the story entry, castle courtyard</li>
          <li><a href="projects.html">01 · Hall of Creations</a> — five projects, three podiums</li>
          <li><a href="skills.html">02 · Trials</a> — fifteen skills, honestly rated</li>
          <li><a href="about.html">03 · The Room</a> — education, interests, the story</li>
          <li><a href="quests.html">04 · Work Experience</a> — what he has actually done</li>
          <li><a href="contact.html">05 · Epilogue</a> — the rocket, and how to reach Yash</li>
        </ul>
        <h3>Prefer plain text?</h3>
        <p>Use the simple version for a fast, accessible 2D view of all the content.
        Every chapter also stands alone: open any of them without finishing the others.</p>
        <div class="play-row">
          <button class="btn btn--primary" id="menuResume">Resume</button>
          <button class="btn" id="menuSimple">Simple version</button>
          <a class="btn btn--red" href="${PROFILE.resume}" download>Download resume</a>
        </div>
      </div>`,
    onMount(body){
      $('#menuResume', body).addEventListener('click', () => { closePanel(); });
      $('#menuSimple', body).addEventListener('click', () => { closePanel(); enterSimple(); });
      $$('.chapter-list a', body).forEach((a) => {
        a.addEventListener('click', () => {
          Audio.sfx('portal');
          const id = a.getAttribute('href').replace('.html', '');
          markPortal(id);            /* story.html is not a portal — markPortal ignores it */
        });
      });
    },
  }));
}

/* Konami: coin + confetti rain */
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
let konamiBuf = [];
function konami(k){
  konamiBuf.push(k);
  if (konamiBuf.length > KONAMI.length) konamiBuf.shift();
  if (konamiBuf.join(',') !== KONAMI.join(',')) return;
  konamiBuf = [];
  Audio.sfx('konami');
  toast('CHEAT ACCEPTED · COIN STORM');
  confetti();
}

const confettiBits = [];
let confettiRoot = null;
function confetti(){
  if (confettiRoot){
    scene.remove(confettiRoot);
    confettiRoot = null;
    confettiBits.length = 0;
  }
  const N = 180;
  const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: false, color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  const colors = [PALETTE.red, PALETTE.sun, PALETTE.sky, PALETTE.ink];
  for (let i = 0; i < N; i++){
    const c = new THREE.Color(colors[i % colors.length]);
    mesh.setColorAt(i, c);
    confettiBits.push({
      p: new THREE.Vector3(rand(-12, 12), rand(14, 26), rand(-12, 12)),
      v: new THREE.Vector3(rand(-1, 1), rand(-3, -1), rand(-1, 1)),
      r: rand(0, 6.28),
      s: rand(0.6, 1.4),
    });
  }
  mesh.frustumCulled = false;
  confettiRoot = mesh;
  scene.add(mesh);
  setTimeout(() => {
    if (confettiRoot){ scene.remove(confettiRoot); confettiRoot = null; confettiBits.length = 0; }
  }, 9000);
}
function updateConfetti(dt){
  if (!confettiRoot) return;
  confettiBits.forEach((b, i) => {
    b.p.addScaledVector(b.v, dt * 6);
    b.p.y -= 4 * dt;
    b.r += dt * 3;
    if (b.p.y < 0.3){ b.p.y = rand(18, 26); b.p.x = rand(-12, 12); b.p.z = rand(-12, 12); }
    _q.setFromAxisAngle(_v.set(0.4, 0.7, 0.2).normalize(), b.r);
    _m4.compose(b.p, _q, _s.setScalar(b.s));
    confettiRoot.setMatrixAt(i, _m4);
  });
  confettiRoot.instanceMatrix.needsUpdate = true;
}

/* ── simple 2D version ───────────────────────────────────────────────────── */
function enterSimple(){
  state.mode = 'simple';
  document.body.classList.add('simple-mode');
  $('#hud').classList.add('hidden');
  $('#title').classList.add('hidden');
  $('#loading').classList.add('hidden');
  $('#simple').classList.remove('hidden');
  $('#simple').scrollTop = 0;
  cancelAnimationFrame(rafId);
}
function leaveSimple(){
  document.body.classList.remove('simple-mode');
  $('#simple').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  /* the same what-is-here dock the chapters use, folded to one tab */
  mountGuide({ ...GUIDES.island, compact: true, placement: 'bl' });
  state.mode = 'play';
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

/* ── 7 · loop ────────────────────────────────────────────────────────────── */
let rafId = 0;
let last = performance.now();
let debug = null;
let introPlaying = false;

/* fixed 60 Hz physics accumulator: identical motion at any refresh rate */
const FIXED_STEP = 1 / 60;
let physAcc = 0;

function loop(now){
  /* one central clock; dt is clamped so a tab switch can never teleport you */
  let dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (debug && debug.slowmo) dt *= 0.25;
  if (state.mode === 'simple'){ return; }
  if (state.paused){ rafId = requestAnimationFrame(loop); return; }

  state.t += dt;
  tweens.update(dt);          /* every timed animation, one manager */
  quality?.tick(dt);          /* adaptive quality */

  if (state.mode === 'title' || state.mode === 'boot'){
    /* slow flyover of the island behind the title card — it only turns while
       nobody is touching the page, so reading the title is not a moving target */
    flyAngle += dt * 0.075 * titleIdle.tick(dt);
    const a = flyAngle;
    camera.position.set(Math.cos(a) * 52, 27 + Math.sin(state.t * 0.3) * 2.5, Math.sin(a) * 52);
    camera.lookAt(0, 1.5, 0);
    /* keep the player idle and visible */
    if (playerRoot) playerRoot.rotation.y = Math.PI;
  } else if (state.mode === 'cutscene'){
    /* the rail owns the camera; the world keeps breathing */
  } else if (state.mode === 'play'){
    if (!busy()){
      /* player physics runs on a fixed 60 Hz step, interpolated by rendering */
      physAcc += dt;
      let steps = 0;
      while (physAcc >= FIXED_STEP && steps < 5){ updatePlayer(FIXED_STEP); physAcc -= FIXED_STEP; steps++; }
      if (steps === 5) physAcc = 0;      /* never spiral after a stall */
    }
    cameraRig.yaw = camYaw;
    const running = down('shift') || (state.speedUntil > state.t);
    _laVec.copy(aheadVec).multiplyScalar(running ? 2.4 : 1.1);
    cameraRig.update(dt, playerPos, { lookAhead: _laVec, running });
  }

  /* world life */
  dayNight.update(dt);
  tickWater(water, state.t);
  tickWind(state.t);
  clouds.update(dt, state.t);
  birds.update(state.t);
  particles.update(state.t);
  farIslands.update(dt, state.t);
  updateCoins(state.t);
  updatePowerups(dt, state.t);
  updatePortals(dt, state.t);
  updateNpc(dt, state.t);
  updateConfetti(dt);
  updateGuide(dt);
  window.__MAP?.update(dt);

  /* lamps glow at night */
  if (lamps.length){
    lamps.forEach((l) => { if (l.userData.light) l.userData.light.intensity = dayNight.night ? 2.2 : 0; });
  }

  /* portal ring animation on the HUD minimap-less tracker */
  if (playerRoot) playerRoot.visible = true;

  composer.render();
  debug?.tick();
  rafId = requestAnimationFrame(loop);
}

/* pause when hidden, resume on return */
document.addEventListener('visibilitychange', () => {
  state.paused = document.hidden;
  if (document.hidden){
    cancelAnimationFrame(rafId);
    Audio.stopMusic();
  } else if (state.mode !== 'simple'){
    Audio.startMusic();
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }
});

/* ── 8 · boot ────────────────────────────────────────────────────────────── */
async function boot(){
  const bar = loadingBar();
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]); } catch (e) {}
  bar.set(2, 'warming up…');

  /* the loading bar is driven by the models manifest (real bytes, not a fake timer) */
  try {
    models = await initModels(scene, ({ percent, file }) => {
      bar.set(Math.max(4, percent * 0.85), file);
    });
  } catch (err){
    console.error('[main] model init failed', err);
    $('#loadFile').textContent = 'model load failed — using built-ins';
  }

  buildWorld();
  bar.set(96, 'placing island props…');

  /* the player character is a model too */
  const character = models.createCharacter('player');
  anim = character;
  createPlayer(character);

  /* Claude: follows the player, reacts, hints, talks when clicked */
  guide = new Guide(scene, {
    position: new THREE.Vector3(2.9, 0, 6.6),
    scale: 0.86,
    mode: 'follow',
    glow: true,
    label: 'CLAUDE',
    onTalk: (line) => {
      Audio.sfx('click');
      dialogue.show(GUIDE_NAME, line, { cps: 42 });
      clearTimeout(talkToNpc._b);
      talkToNpc._b = setTimeout(() => dialogue.hide(), 5200);
    },
  });
  /* warm the other chapter pages while you play: no loading hitch on a door */
  ['projects', 'skills', 'about', 'quests', 'contact', 'story'].forEach((id) => {
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = `${id}.html`;
    document.head.appendChild(l);
  });

  /* ── the map: live island overview, click a marker to open that chapter ── */
  const map = createMap({
    getPlayer: () => ({ x: playerPos.x, z: playerPos.z }),
    getPortals: () => portalGroup.map((p) => ({
      id: p.zone.id, name: p.zone.name,
      x: p.group.position.x, z: p.group.position.z,
    })),
    getVisited: () => state.portals,
    getYaw: () => camYaw,
    onPick: (marker) => {
      const portal = portalGroup.find((p) => p.zone.id === marker.id);
      if (portal) enterPortal(portal);
    },
  });
  window.__MAP = map;

  window.__PORTALS = portalGroup;   /* QA handles: let tests aim at a ring */
  window.__CAM = camera;
  state.lastProgressAt = state.t;

  /* place a camera behind the player right away */
  cameraRig.update(0, playerPos, { snap: true });

  updateHud();
  bindHud();
  armAudio();

  /* ready */
  bar.set(100, 'ready');
  setTimeout(() => {
    $('#loading').classList.add('hidden');
    window.__YDEV_READY = true;          /* the 3D booted — cancel the 2D safety net */

    if (RESUME){
      /* back from a chapter: straight into the world, where you left off */
      state.mode = 'play';
      $('#title').classList.add('hidden');
      $('#hud').classList.remove('hidden');
      restoreFromHash();
      camYaw = 0;
      cameraRig.update(0, playerPos, { snap: true });
      revealOnLoad();
      toast('WELCOME BACK', 1600);
      if (state.portals.size) updateHud();
    } else {
      state.mode = 'title';
      $('#title').classList.remove('hidden');
      $('#hud').classList.add('hidden');
    }
  }, 420);

  quality = new Quality({ renderer, bloom, sun, onLevel: (l) => console.info('[quality]', ['low', 'medium', 'high'][l]) });
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced) quality.pin(forced);
  debug = initDebugPanel({ renderer, models, quality, camera, scene });
  revealOnLoad();
  rafId = requestAnimationFrame(loop);
}

/* ── the guided first visit ──────────────────────────────────────────────── */
let tour = null;
const tourOpen = () => !!tour && tour.isOpen();
/** true while any overlay owns the screen — the player must not walk under it */
function busy(){ return panelIsOpen() || tourOpen() || !!document.getElementById('arcade'); }

/* ── intro cutscene ──────────────────────────────────────────────────────── */
/**
 * A short eased rail around the island with letterbox bars, skippable with
 * Esc / Space / click. It hands straight over to the third-person camera.
 */
function playIntro(onDone){
  const lb = $('#letterbox');
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(34, 20, 34),
    new THREE.Vector3(22, 13, 30),
    new THREE.Vector3(12, 8.5, 20),
    new THREE.Vector3(4.5, 6.2, 12.5),
    new THREE.Vector3(0, 5.4, 9.6),
  ]);
  const look = new THREE.Vector3(0, 2.2, 0);
  introPlaying = true;
  state.mode = 'cutscene';
  lb?.classList.add('on');
  $('#hud')?.classList.add('hidden');

  /* watchdog: on a very slow machine the tween could crawl, so the intro also
     ends on a wall-clock timer. A cutscene must never trap the visitor. */
  clearTimeout(playIntro._timer);
  playIntro._timer = setTimeout(() => finishIntro(), 9000);

  tweens.add({
    key: 'intro',
    from: 0, to: 1,
    dur: 4.4,
    ease: Ease.easeInOutCubic,
    onUpdate(k){
      const p = curve.getPointAt(Math.min(0.999, k));
      camera.position.copy(p);
      camera.lookAt(look);
    },
    onDone(){ finishIntro(); },
  });

  function finishIntro(){
    if (!introPlaying) return;
    clearTimeout(playIntro._timer);
    introPlaying = false;
    tweens.cancel('intro');
    lb?.classList.remove('on');
    state.mode = 'play';
    $('#hud')?.classList.remove('hidden');
    cameraRig.update(0, playerPos, { snap: true });
    if (onDone) onDone();
  }
  playIntro.skip = finishIntro;
}

/* skip handler for the cutscene (keyboard and pointer) */
addEventListener('keydown', (e) => {
  if (introPlaying && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) playIntro.skip?.();
  /* M toggles the map, Esc closes it (and never blocks the game) */
  if (!introPlaying && !panelIsOpen()){
    if (e.key === 'm' || e.key === 'M'){
      const map = window.__MAP;
      if (map){
        map.toggle();
        document.getElementById('mapBtn')?.setAttribute('aria-pressed', String(map.open()));
        Audio.sfx('click');
      }
    } else if (e.key === 'Escape' && window.__MAP?.open()){
      window.__MAP.close();
      document.getElementById('mapBtn')?.setAttribute('aria-pressed', 'false');
    }
  }
});
$('#skipIntro')?.addEventListener('click', () => playIntro.skip?.());
$('#letterbox')?.addEventListener('pointerdown', () => playIntro.skip?.());

/* title screen buttons */
$('#startBtn')?.addEventListener('click', () => {
  Audio.unlock();
  Audio.startMusic();
  Audio.sfx('power');
  $('#title').classList.add('hidden');
  $('#hud').classList.remove('hidden');

  /* the same what-is-here dock the chapters use, folded to one tab */
  mountGuide({ ...GUIDES.island, compact: true, placement: 'bl' });
  carryMute();          /* sound off stays off when you walk through a door */

  /* eased rail through the island, then play */
  playIntro(() => startWelcome());
});

function ensureTour(){
  if (tour) return tour;
  tour = createTour({
    onStart: () => { dialogue.hide(); $('#hud')?.classList.add('tour-dim'); },
    onDone: () => { $('#hud')?.classList.remove('tour-dim'); },
  });
  $('#helpBtn')?.addEventListener('click', () => {
    Audio.sfx('click');
    tour.onDone = null;          /* a replay must not re-trigger the welcome */
    tour.start();
  });
  return tour;
}

function startWelcome(){
  /* every new visitor gets walked through the island before anything else */
  ensureTour();
  tour.onDone = () => { $('#hud')?.classList.remove('tour-dim'); welcomeDialogue(); };
  tour.start();
}

function welcomeDialogue(){
  const hint = $('#hint');
  if (hint){ hint.classList.remove('hidden'); setTimeout(() => hint.style.opacity = '.35', 12000); }
  /* CLAUDE takes over the welcome: two sentences, then he walks ahead */
  guide.hop();
  dialogue.choose(
    GUIDE_NAME,
    'Follow me. I am ' + GUIDE_NAME + ' — Yash built this place, I just walk around it. Which door first?',
    ['PROJECTS', 'SKILLS'],
    (pick) => {
      const id = pick === 'SKILLS' ? 'skills' : 'projects';
      chapterOrder = [id].concat(CHAPTERS.filter((c) => c !== id));
      const door = portalGroup.find((p) => p.zone.id === id);
      if (door){
        guide.leadTo(
          new THREE.Vector3(door.group.position.x, 0, door.group.position.z + 2.4),
          new THREE.Vector3(door.group.position.x, 1.7, door.group.position.z),
        );
        dialogue.show(GUIDE_NAME, 'Good pick. I will wait by the ring — walk in and press E, or just click it.', { cps: 46 });
        setTimeout(() => dialogue.hide(), 5200);
      }
    },
  );

  camYaw = 0;
  cameraRig.update(0, playerPos, { snap: true });
}

$('#simpleTop')?.addEventListener('click', () => enterSimple());
$('#backToWorld')?.addEventListener('click', () => leaveSimple());
$('#menuSimpleTop')?.addEventListener('click', () => enterSimple());

$('#npcTalk')?.addEventListener('click', () => { if (state.nearNpc) talkToNpc(); });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

addEventListener('pagehide', () => {
  cancelAnimationFrame(rafId);
  Audio.stopMusic();
  models?.dispose();
});

/* expose a tiny handle for debugging in the console */
window.YDEV = { state, scene, camera, renderer, enterSimple, leaveSimple, teleport(x, z){ playerPos.set(x, 0, z); } };

boot();
