/* ═══════════════════════════════════════════════════════════════════════════
   models.js — ONE place that knows about every 3D model in the project.

   · MODELS is the manifest: add an entry here and the model appears everywhere.
   · initModels(scene, onProgress) loads everything in parallel, shows real
     progress, and resolves to a registry.
   · Anything that fails to load is replaced by a procedural fallback, so the
     site can never break because a .glb is missing.
   · setupModel() normalises size, grounds the pivot, converts materials to the
     shared toon ramp and adds the ink outline.

   Drop your .glb files into /models with the file names from the manifest.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import {
  PALETTE, toon, toonify, addOutline, outlineGroup, createTree, createLamp,
  createBench, createCrate, rand, randi,
} from './world.js';

/* ── manifest ─────────────────────────────────────────────────────────────
   path        : where the file lives ('' = procedural only for now)
   height      : target height in world units (auto-scale), null = keep size
   position    : where the world builder should drop it
   animations  : names you expect inside the glb (idle/walk/run/jump)
   fallback    : function returning a procedural THREE.Group
   ──────────────────────────────────────────────────────────────────────── */
export const MODELS = {
  player: {
    id: 'player', path: '', height: 2.6,
    position: [0, 0, 0], rotation: 0, castShadow: true, receiveShadow: true,
    outline: true, animations: ['idle', 'walk', 'run', 'jump'],
    fallback: () => buildFallbackPlayer(),
  },
  robot: {
    id: 'robot', path: '', height: 1.5,
    position: [3.2, 0, 4.2], rotation: -0.5, castShadow: true, receiveShadow: true,
    outline: true, animations: ['idle', 'wave'],
    fallback: () => buildFallbackRobot(),
  },
  house: {
    id: 'house', path: '', height: 6.2,
    position: [-16, 0, -6], rotation: 0.5, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => buildFallbackHouse(),
  },
  arcade: {
    id: 'arcade', path: '', height: 4.6,
    position: [16, 0, -7], rotation: -0.7, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => buildFallbackArcade(),
  },
  library: {
    id: 'library', path: '', height: 5.0,
    position: [0, 0, -25], rotation: 0, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => buildFallbackLibrary(),
  },
  questboard: {
    id: 'questboard', path: '', height: 4.4,
    position: [-17, 0, 12], rotation: 0.35, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => buildFallbackQuestboard(),
  },
  mailbox: {
    id: 'mailbox', path: '', height: 3.4,
    position: [17, 0, 12], rotation: -0.6, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => buildFallbackMailbox(),
  },
  tree: {
    id: 'tree', path: '', height: 5.2,
    position: null, rotation: 0, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => createTree({ kind: 'round' }),
  },
  pine: {
    id: 'pine', path: '', height: 6.0,
    position: null, rotation: 0, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => createTree({ kind: 'pine' }),
  },
  lamp: {
    id: 'lamp', path: '', height: 3.2,
    position: null, rotation: 0, castShadow: true, receiveShadow: true,
    outline: false, animations: [], fallback: () => createLamp(),
  },
  bench: {
    id: 'bench', path: '', height: 1.3,
    position: null, rotation: 0, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => createBench(),
  },
  crate: {
    id: 'crate', path: '', height: 1.0,
    position: null, rotation: 0, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => createCrate(1),
  },
  signpost: {
    id: 'signpost', path: '', height: 2.4,
    position: null, rotation: 0, castShadow: true, receiveShadow: true,
    outline: true, animations: [], fallback: () => buildFallbackSign(),
  },
};

/* ── registry ────────────────────────────────────────────────────────────── */
const registry = new Map();     // id → { template, clips, isFallback, box }
const mixers = [];              // every live AnimationMixer, updated in one loop
let loadingManager = null;

/* ── tiny helpers ────────────────────────────────────────────────────────── */
function sizedBox(w, h, d, color, { outline = true, grow = 0.04, y = h / 2, x = 0, z = 0 } = {}){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (outline) addOutline(m, grow);
  return m;
}

/* ── procedural fallbacks (used until you drop in real .glb files) ───────── */
function buildFallbackHouse(){
  const g = new THREE.Group();
  g.add(sizedBox(6.0, 3.8, 5.4, 0xfffdf7, { y: 1.9, grow: 0.02 }));

  /* gable roof: two slabs */
  const roofMat = toon(PALETTE.red);
  const roofA = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.34, 4.1), roofMat);
  roofA.position.set(0, 5.0, -1.35); roofA.rotation.x = -0.62;
  const roofB = roofA.clone(); roofB.position.z = 1.35; roofB.rotation.x = 0.62;
  [roofA, roofB].forEach((r) => { r.castShadow = true; r.receiveShadow = true; addOutline(r, 0.02); g.add(r); });

  /* gable ends */
  const gable = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 5.4, 3, 1), toon(0xfffdf7));
  gable.rotation.x = Math.PI / 2; gable.rotation.z = Math.PI / 2;
  gable.position.y = 3.8; gable.scale.set(1, 1, 1);
  gable.castShadow = true; addOutline(gable, 0.02);
  g.add(gable);

  g.add(sizedBox(0.12, 2.0, 1.3, PALETTE.ink, { y: 1.0, z: 2.72, grow: 0.02 }));
  g.add(sizedBox(1.1, 1.0, 0.14, 0xffc93c, { y: 2.5, x: -1.9, z: 2.72, grow: 0.02 }));
  g.add(sizedBox(1.1, 1.0, 0.14, 0xffc93c, { y: 2.5, x: 1.9, z: 2.72, grow: 0.02 }));
  g.add(sizedBox(0.8, 1.5, 0.8, 0xd8d2c2, { y: 5.6, x: 2.0, z: -1.0, grow: 0.02 }));
  g.add(sizedBox(3.0, 0.25, 1.4, 0xe6dfcd, { y: 0.12, z: 3.3, grow: 0.02 }));
  return g;
}

function buildFallbackArcade(){
  const g = new THREE.Group();
  g.add(sizedBox(2.6, 3.6, 1.5, 0xfffdf7, { y: 1.8, grow: 0.02 }));
  g.add(sizedBox(2.8, 0.7, 1.6, PALETTE.red, { y: 3.75, grow: 0.02 }));
  /* screen */
  const screen = sizedBox(2.0, 1.5, 0.1, PALETTE.sky, { y: 2.6, z: 0.78, outline: false });
  screen.material.emissive = new THREE.Color(PALETTE.sky);
  screen.material.emissiveIntensity = 0.35;
  g.add(screen);
  g.add(sizedBox(2.2, 0.16, 0.1, PALETTE.ink, { y: 2.6, z: 0.84, outline: false }));
  /* control deck + joystick + buttons */
  g.add(sizedBox(2.4, 0.28, 1.0, 0xe6dfcd, { y: 1.5, z: 0.9, grow: 0.02 }));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), toon(PALETTE.ink));
  stick.position.set(-0.6, 1.85, 0.95); g.add(stick);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(PALETTE.red));
  ball.position.set(-0.6, 2.12, 0.95); g.add(ball);
  [0.2, 0.55].forEach((x) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10), toon(x > 0.4 ? PALETTE.sun : PALETTE.sky));
    b.position.set(x, 1.68, 0.95); g.add(b);
  });
  g.add(sizedBox(1.4, 0.5, 0.06, 0xfffdf7, { y: 1.05, z: 0.78, outline: false }));
  return g;
}

function buildFallbackLibrary(){
  const g = new THREE.Group();
  g.add(sizedBox(6.4, 4.4, 2.0, 0xfffdf7, { y: 2.2, grow: 0.02 }));
  /* shelves of colourful books */
  const colors = [PALETTE.red, PALETTE.sky, PALETTE.sun, 0x6e7a5e, 0x8a6ea8, 0xd88a4a];
  for (let row = 0; row < 3; row++){
    const y = 0.8 + row * 1.2;
    g.add(sizedBox(5.9, 0.14, 1.7, 0xd8d2c2, { y, z: 0.2, outline: false }));
    let x = -2.6;
    while (x < 2.7){
      const w = rand(0.18, 0.34), h = rand(0.6, 0.95);
      if (x + w > 2.8) break;
      g.add(sizedBox(w, h, 0.8, colors[randi(0, colors.length - 1)], { y: y + h / 2 + 0.05, x: x + w / 2, z: 0.35, outline: false }));
      x += w + 0.05;
    }
  }
  g.add(sizedBox(7.2, 0.3, 2.6, PALETTE.ink, { y: 4.5, grow: 0.02 }));
  g.add(sizedBox(6.8, 0.2, 2.2, PALETTE.paper2, { y: 4.7, grow: 0.02 }));
  return g;
}

function buildFallbackQuestboard(){
  const g = new THREE.Group();
  [-1.7, 1.7].forEach((x) => g.add(sizedBox(0.3, 4.0, 0.3, PALETTE.ink, { y: 2.0, x, grow: 0.03 })));
  g.add(sizedBox(4.6, 2.9, 0.28, 0xe0d3b4, { y: 2.9, grow: 0.02 }));
  const papers = [[-1.3, 3.4], [0.2, 3.2], [1.2, 3.5], [-0.5, 2.5]];
  papers.forEach(([x, y], i) => {
    const p = sizedBox(1.0, 0.8, 0.06, 0xfffdf7, { y, x, z: 0.2, outline: true, grow: 0.03 });
    p.rotation.z = (i - 1.5) * 0.08;
    g.add(p);
  });
  g.add(sizedBox(4.9, 0.3, 0.4, PALETTE.red, { y: 4.45, grow: 0.02 }));
  return g;
}

function buildFallbackMailbox(){
  const g = new THREE.Group();
  g.add(sizedBox(0.35, 2.2, 0.35, PALETTE.ink, { y: 1.1, grow: 0.04 }));
  const box = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 12, 1, false, 0, Math.PI), toon(PALETTE.red));
  box.rotation.z = Math.PI / 2; box.rotation.y = Math.PI / 2;
  box.position.y = 2.5; box.castShadow = true;
  addOutline(box, 0.03);
  g.add(box);
  g.add(sizedBox(1.9, 0.18, 1.4, PALETTE.red, { y: 1.72, grow: 0.01 }));
  g.add(sizedBox(1.1, 0.12, 0.06, PALETTE.ink, { y: 2.6, z: 0.72, outline: false }));
  g.add(sizedBox(0.08, 1.1, 0.08, PALETTE.ink, { y: 3.1, x: 0.9, grow: 0.02 }));
  g.add(sizedBox(0.55, 0.4, 0.06, PALETTE.sun, { y: 3.55, x: 1.2, grow: 0.02 }));
  return g;
}

function buildFallbackSign(){
  const g = new THREE.Group();
  g.add(sizedBox(0.18, 2.0, 0.18, PALETTE.ink, { y: 1.0, grow: 0.04 }));
  const board = sizedBox(1.5, 0.6, 0.12, PALETTE.paper2, { y: 1.9, grow: 0.04 });
  board.rotation.z = 0.06;
  g.add(board);
  g.add(sizedBox(1.1, 0.12, 0.14, PALETTE.red, { y: 1.9, z: 0.02, outline: false }));
  return g;
}

/** Player fallback: hoodie + glasses, split into rig parts for animation. */
export function buildFallbackPlayer(){
  const root = new THREE.Group();

  const hip = new THREE.Group(); hip.name = 'hip'; hip.position.y = 0.98; root.add(hip);

  const torso = new THREE.Group(); torso.name = 'torso'; hip.add(torso);
  torso.add(sizedBox(0.96, 1.12, 0.60, 0x2a2a33, { y: 0.58, grow: 0.05 }));     // jacket
  torso.add(sizedBox(0.12, 0.7, 0.06, PALETTE.red, { y: 0.62, z: 0.32, outline: false })); // zip
  torso.add(sizedBox(0.5, 0.2, 0.6, PALETTE.ink, { y: 0.05, grow: 0.03 }));      // waistband
  torso.add(sizedBox(0.9, 0.52, 0.24, 0xf3efe4, { y: 0.94, z: -0.34, grow: 0.03 })); // hood
  torso.add(sizedBox(0.94, 0.12, 0.26, PALETTE.red, { y: 1.19, z: -0.3, outline: false })); // hood lining

  const head = new THREE.Group(); head.name = 'head'; head.position.y = 1.32; torso.add(head);
  head.add(sizedBox(0.94, 0.86, 0.84, 0xf6e6d2, { y: 0.12, grow: 0.05 }));
  head.add(sizedBox(1.0, 0.26, 0.92, 0x14141a, { y: 0.56, grow: 0.02 }));           // hair top
  head.add(sizedBox(1.0, 0.4, 0.22, 0x14141a, { y: 0.42, z: -0.42, grow: 0.02 }));   // hair back
  head.add(sizedBox(0.24, 0.16, 0.24, 0xf0dcc6, { y: -0.34, grow: 0.02 }));          // neck
  /* glasses */
  [-0.2, 0.2].forEach((x) => {
    head.add(sizedBox(0.32, 0.26, 0.05, PALETTE.ink, { y: 0.16, x, z: 0.42, outline: false }));
  });
  head.add(sizedBox(0.12, 0.05, 0.05, PALETTE.ink, { y: 0.16, z: 0.39, outline: false }));

  const arm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.66, 1.02, 0);
    const upper = sizedBox(0.3, 0.95, 0.32, 0x2a2a33, { y: -0.42, grow: 0.05 });
    pivot.add(upper);
    pivot.add(sizedBox(0.32, 0.2, 0.34, PALETTE.red, { y: -0.9, grow: 0.02 }));    // cuff
    pivot.add(sizedBox(0.28, 0.24, 0.3, 0xf6e6d2, { y: -1.04, grow: 0.04 }));      // hand
    pivot.name = side < 0 ? 'armL' : 'armR';
    torso.add(pivot);
    return pivot;
  };
  const armL = arm(-1), armR = arm(1);

  const leg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.24, 0, 0);
    pivot.add(sizedBox(0.36, 0.95, 0.38, 0x2a2a33, { y: -0.48, grow: 0.05 }));
    pivot.add(sizedBox(0.4, 0.18, 0.56, PALETTE.ink, { y: -0.95, z: 0.08, grow: 0.02 }));
    pivot.name = side < 0 ? 'legL' : 'legR';
    hip.add(pivot);
    return pivot;
  };
  const legL = leg(-1), legR = leg(1);

  root.userData.parts = { hip, torso, head, armL, armR, legL, legR };
  root.userData.isFallbackPlayer = true;
  return root;
}

/** NPC fallback: a small robot-cat with an antenna and a screen face. */
export function buildFallbackRobot(){
  const root = new THREE.Group();
  const body = new THREE.Group(); body.name='body'; body.position.y = 0.55; root.add(body);

  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.5, 6, 12), toon(PALETTE.paper2));
  shell.castShadow = true; addOutline(shell, 0.04);
  body.add(shell);

  const head = new THREE.Group(); head.name = 'head'; head.position.y = 0.72; body.add(head);
  head.add(sizedBox(0.8, 0.62, 0.66, 0xfffdf7, { y: 0.2, grow: 0.05 }));
  head.add(sizedBox(0.62, 0.34, 0.06, PALETTE.ink, { y: 0.22, z: 0.36, outline: false }));
  [-0.16, 0.16].forEach((x) => {
    const eye = sizedBox(0.11, 0.13, 0.03, PALETTE.sky, { y: 0.22, x, z: 0.4, outline: false });
    eye.material = new THREE.MeshBasicMaterial({ color: PALETTE.sky });
    head.add(eye);
  });
  /* ears + antenna */
  [-0.3, 0.3].forEach((x) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 4), toon(PALETTE.red));
    ear.position.set(x, 0.58, 0); head.add(ear);
  });
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 5), toon(PALETTE.ink));
  ant.position.set(0, 0.72, 0); head.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: PALETTE.red }));
  tip.position.set(0, 0.94, 0); head.add(tip);

  /* arms + treads */
  [-1, 1].forEach((s) => {
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34, 4, 8), toon(PALETTE.ink));
    a.position.set(s * 0.66, -0.05, 0); a.rotation.z = s * 0.25; body.add(a);
    const tread = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10), toon(PALETTE.ink));
    tread.rotation.z = Math.PI / 2; tread.position.set(s * 0.3, -0.74, 0); body.add(tread);
  });

  root.userData.parts = { body, head, tip };
  return root;
}

/* ── normalisation + material setup ──────────────────────────────────────── */
function setupModel(object, entry){
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());

  /* auto-scale to the target height, then sit the pivot on the ground */
  if (entry.height && size.y > 0.0001){
    const s = entry.height / size.y;
    if (Math.abs(s - 1) > 0.02) object.scale.multiplyScalar(s);
  }
  object.updateWorldMatrix(true, true);
  const box2 = new THREE.Box3().setFromObject(object);
  object.position.y -= box2.min.y;                 // ground the pivot
  const centre = box2.getCenter(new THREE.Vector3());
  object.position.x -= centre.x;
  object.position.z -= centre.z;

  toonify(object, { outline: entry.outline !== false });

  object.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = entry.castShadow !== false;
    o.receiveShadow = entry.receiveShadow !== false;
    o.frustumCulled = true;
  });

  /* collision box in local space, recomputed after scaling */
  object.updateWorldMatrix(true, true);
  const finalBox = new THREE.Box3().setFromObject(object);
  const localBox = finalBox.clone();
  return { object, box: localBox };
}

/* ── the loader ──────────────────────────────────────────────────────────── */
/**
 * @param {THREE.Scene} scene used only to warm the renderer/keep refs
 * @param {(p:{percent:number,file:string,loaded:number,total:number})=>void} onProgress
 * @returns {Promise<{getModel,cloneModel,getAnimations,getCollider,list,createCharacter,update,draco,dispose}>}
 */
let draco = null;   /* module scope: dispose() needs it on pagehide */

export function initModels(scene, onProgress = () => {}){
  loadingManager = new THREE.LoadingManager();
  loadingManager.onProgress = (url, loaded, total) => {
    onProgress({
      percent: Math.round((loaded / Math.max(1, total)) * 100),
      file: url.split('/').pop(),
      loaded, total,
    });
  };

  const loader = new GLTFLoader(loadingManager);
  try {
    draco = new DRACOLoader(loadingManager);
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
    loader.setDRACOLoader(draco);
  } catch (e){ console.warn('[models] DRACO unavailable', e); }

  const entries = Object.values(MODELS);
  onProgress({ percent: 0, file: 'starting…', loaded: 0, total: entries.length });

  let done = 0;
  const jobs = entries.map((entry) => new Promise((resolve) => {
    const finish = (template, clips, isFallback) => {
      console.log('[models] loaded', entry.id, isFallback ? '(fallback)' : '(glb)');
      registry.set(entry.id, { template, clips: clips || [], isFallback, entry });
      done++;
      onProgress({ percent: Math.round((done / entries.length) * 100), file: entry.path || `${entry.id} (built-in)`, loaded: done, total: entries.length });
      resolve();
    };

    const useFallback = (why) => {
      console.warn(`[models] "${entry.id}" → procedural fallback (${why})`);
      let g = new THREE.Group();
      try {
        if (entry.fallback) g = entry.fallback();
      } catch (err){
        /* a broken fallback must never strand the loading screen */
        console.error(`[models] fallback for "${entry.id}" failed:`, err);
        g = new THREE.Group();
      }
      /* fallbacks are authored at world scale, so skip the height normaliser */
      g.traverse((o) => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
      finish(g, [], true);
    };

    /* single-file / offline builds set this to skip the GLB requests entirely */
    if (!entry.path || (typeof window !== 'undefined' && window.__NO_GLB)){ return useFallback('no path'); }

    loader.load(
      entry.path,
      (gltf) => {
        console.log('[models] glb ok', entry.id);
        try {
          const { object, box } = setupModel(gltf.scene, entry);
          registry.set(entry.id, { template: object, clips: gltf.animations || [], isFallback: false, entry, box });
          done++;
          onProgress({ percent: Math.round((done / entries.length) * 100), file: entry.path, loaded: done, total: entries.length });
          resolve();
        } catch (err){ useFallback(err?.message || 'setup failed'); }
      },
      undefined,
      () => useFallback('file not found'),
    );
  }));

  return Promise.all(jobs).then(() => api);
}

/* ── public API ──────────────────────────────────────────────────────────── */
function getEntry(id){
  const rec = registry.get(id);
  if (!rec) throw new Error(`[models] unknown model "${id}"`);
  return rec;
}

const api = {
  /** The shared template. Do not mutate it — clone first. */
  getModel(id){ return getEntry(id).template; },
  getAnimations(id){ return getEntry(id).clips; },
  getCollider(id){
    const rec = getEntry(id);
    return new THREE.Box3().setFromObject(rec.template);
  },
  isFallback(id){ return getEntry(id).isFallback; },

  /** A fresh instance you can move around / animate. */
  cloneModel(id, { outlineKeep = true } = {}){
    const rec = getEntry(id);
    const clone = skeletonClone(rec.template);
    clone.traverse((o) => {
      if (o.userData.isOutline && !outlineKeep) o.visible = false;
      if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; }
    });
    return clone;
  },

  /**
   * Character helper: clones the model, builds a mixer and named actions.
   * Falls back to procedural limb animation when the glb has no clips.
   */
  createCharacter(id, { onDone } = {}){
    const rec = getEntry(id);
    const root = skeletonClone(rec.template);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    const mixer = rec.clips.length ? new THREE.AnimationMixer(root) : null;
    const actions = {};
    if (mixer){
      rec.clips.forEach((clip) => {
        const name = clip.name.toLowerCase();
        const act = mixer.clipAction(clip);
        act.enabled = true;
        actions[name] = act;
      });
      mixers.push(mixer);
    }
    let current = null;
    const play = (name, { fade = 0.2, once = false } = {}) => {
      const act = actions[name] || actions[Object.keys(actions)[0]];
      if (!act || act === current) return;
      act.reset();
      act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
      act.clampWhenFinished = once;
      act.fadeIn(fade).play();
      if (current) current.fadeOut(fade);
      current = act;
    };
    /* parts must be looked up on the CLONE — userData is shared by reference */
    let parts = null;
    if (rec.template.userData?.parts){
      parts = {};
      Object.keys(rec.template.userData.parts).forEach((k) => {
        parts[k] = root.getObjectByName(k) || null;
      });
      if (Object.values(parts).some((v) => !v)) parts = null;
    }
    return { root, mixer, actions, play, hasClips: !!mixer, parts, onDone };
  },

  /** update every live mixer in one place */
  update(dt){
    for (let i = 0; i < mixers.length; i++) mixers[i].update(dt);
  },

  /** free GPU memory (called on pagehide) */
  dispose(){
    registry.forEach((rec) => {
      rec.template.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      });
    });
    registry.clear();
    if (draco) draco.dispose();
  },

  get list(){
    return [...registry.entries()].map(([id, r]) => ({ id, fallback: r.isFallback, clips: r.clips.length }));
  },
};
