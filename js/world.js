/* ═══════════════════════════════════════════════════════════════════════════
   world.js — the shared 3D kit.
   Toon materials, ink outlines, the floating island, water, sky, clouds,
   birds, wind-blown grass, props, day/night, camera rig and post-processing.
   Every page builds its scene out of these pieces so the look stays identical.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* ── palette ─────────────────────────────────────────────────────────────── */
export const PALETTE = {
  ink:    0x121216,
  paper:  0xf7f4ec,
  paper2: 0xfffdf7,
  paper3: 0xefeade,
  red:    0xff2a00,
  sky:    0x2f9bff,
  sun:    0xffc93c,
  grass:  0xf2efe6,
  grass2: 0xcfe3c4,
  rock:   0xc9c3b4,
  water:  0x2f9bff,
  grey:   0x6d6d74,
};

/* ── small maths helpers ─────────────────────────────────────────────────── */
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/* ── renderer ────────────────────────────────────────────────────────────── */
export function createRenderer(canvas, { shadows = true } = {}){
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  /* context loss: say so instead of freezing on a black canvas */
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    document.documentElement.classList.add('gl-lost');
    let note = document.getElementById('glLostNote');
    if (!note){
      note = document.createElement('div');
      note.id = 'glLostNote';
      note.className = 'gl-note';
      note.innerHTML = '<b>GRAPHICS PAUSED</b> The browser reset the 3D context. It restores on its own — if it does not, reload the page.';
      document.body.appendChild(note);
    }
  }, false);
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    document.documentElement.classList.remove('gl-lost');
    document.getElementById('glLostNote')?.remove();
  }, false);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  if (shadows){
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  return renderer;
}

/* ── toon shading ────────────────────────────────────────────────────────── */
let RAMP = null;
/** 4-step ramp: the heart of the cel look. */
export function toonRamp(){
  if (RAMP) return RAMP;
  const steps = [0.58, 0.74, 0.89, 1.0];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((s, i) => {
    const v = Math.round(s * 255);
    data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  RAMP = tex;
  return tex;
}

/** Every solid object in the project uses this. */
export function toon(color, opts = {}){
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonRamp(),
    ...opts,
  });
}

/* ── ink outlines ────────────────────────────────────────────────────────── */
export const OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: PALETTE.ink, side: THREE.BackSide,
});

/** Inverted hull outline — cheap, works with instancing and skinned meshes. */
export function addOutline(object, grow = 0.035){
  if (!object || !object.geometry) return object;
  const hull = new THREE.Mesh(object.geometry, OUTLINE_MAT);
  hull.scale.setScalar(1 + grow);
  hull.castShadow = false;
  hull.receiveShadow = false;
  hull.renderOrder = -1;
  hull.userData.isOutline = true;
  object.add(hull);
  return object;
}

/** Outline every mesh under a group (used on loaded GLB models). */
export function outlineGroup(root, grow = 0.03){
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline && !o.isInstancedMesh) meshes.push(o); });
  meshes.forEach((m) => addOutline(m, grow));
  return root;
}

/** Convert every material in a node to the shared toon ramp. */
export function toonify(root, { outline = true, grow = 0.03 } = {}){
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) meshes.push(o); });
  meshes.forEach((o) => {
    const src = Array.isArray(o.material) ? o.material : [o.material];
    const mats = src.map((m) => {
      const t = toon(m?.color ? m.color.getHex() : 0xffffff);
      if (m?.map) t.map = m.map;
      if (m?.transparent) { t.transparent = true; t.opacity = m.opacity; }
      return t;
    });
    o.material = Array.isArray(o.material) ? mats : mats[0];
    o.castShadow = true;
    o.receiveShadow = true;
    if (outline) addOutline(o, grow);
  });
  return root;
}

/* ── wind (grass, trees, banners) ────────────────────────────────────────── */
const WIND = [];           // materials that need their uTime pushed each frame
export function windMaterial(color, strength = 0.16, height = 1){
  const mat = toon(color);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWind = { value: strength };
    shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         float phase = instanceMatrix[3][0] * 0.35 + instanceMatrix[3][2] * 0.28;
       #else
         float phase = 0.0;
       #endif
       float bend = max(0.0, position.y / ${height.toFixed(1)});
       transformed.x += sin(uTime * 1.7 + phase) * uWind * bend * bend;
       transformed.z += cos(uTime * 1.3 + phase * 1.7) * uWind * 0.6 * bend * bend;`,
    );
    mat.userData.shader = shader;
  };
  WIND.push(mat);
  return mat;
}
export function tickWind(t){
  for (const m of WIND){
    const s = m.userData.shader;
    if (s) s.uniforms.uTime.value = t;
  }
}

/* ── sky dome + day/night ────────────────────────────────────────────────── */
const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main(){
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const SKY_FRAG = /* glsl */`
  uniform vec3 top; uniform vec3 bottom; uniform vec3 sunColor; uniform vec3 sunDir;
  varying vec3 vDir;
  void main(){
    float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(bottom, top, pow(h, 0.85));
    float glow = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 22.0);
    col = mix(col, sunColor, glow * 0.55);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createSky(scene){
  const geo = new THREE.SphereGeometry(240, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      top:    { value: new THREE.Color(0xc9e2fa) },
      bottom: { value: new THREE.Color(0xfffdf8) },
      sunColor: { value: new THREE.Color(0xffe8a8) },
      sunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
    },
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false;
  scene.add(dome);
  return dome;
}

/* keyframed day cycle — one full loop every ~4 minutes */
const DAY_KEYS = [
  { at: 0.00, top: 0x1b2740, bottom: 0x2b3a55, sun: 0xffd9a0, sunI: 0.35, hemi: 0x3d4c66, hemiI: 0.5, fog: 0x2b3a55, bloom: 0.55, night: true  },
  { at: 0.22, top: 0xcfe6fb, bottom: 0xfffdf6, sun: 0xfffaf0, sunI: 1.72, hemi: 0xe6f1ff, hemiI: 1.15, fog: 0xfaf7ef, bloom: 0.28, night: false },
  { at: 0.50, top: 0xd9edff, bottom: 0xffffff, sun: 0xffffff, sunI: 1.95, hemi: 0xeaf4ff, hemiI: 1.2,  fog: 0xfbf8f1, bloom: 0.24, night: false },
  { at: 0.74, top: 0xffc7a8, bottom: 0xfff0d8, sun: 0xff9a5c, sunI: 1.5,  hemi: 0xffd9bd, hemiI: 0.95, fog: 0xfff2e0, bloom: 0.4,  night: false },
  { at: 0.88, top: 0x2a3350, bottom: 0x8b6b7a, sun: 0xff8a5c, sunI: 0.7,  hemi: 0x51607e, hemiI: 0.6, fog: 0x6b5b6a, bloom: 0.5,  night: true  },
  { at: 1.00, top: 0x1b2740, bottom: 0x2b3a55, sun: 0xffd9a0, sunI: 0.35, hemi: 0x3d4c66, hemiI: 0.5, fog: 0x2b3a55, bloom: 0.55, night: true  },
];

export class DayNight {
  /**
   * @param {object} o  { scene, sky, sun, hemi, renderer, bloom, water, speed }
   */
  constructor({ scene, sky, sun, hemi, fog, bloom, water, speed = 1 / 240 }){
    this.scene = scene; this.sky = sky; this.sun = sun; this.hemi = hemi;
    this.fog = fog; this.bloom = bloom; this.water = water;
    this.speed = speed;                 // fraction of a day per second
    this.time = 0.30;                   // start mid-morning
    this.night = false;
    this.onPhase = null;                // callback(night:bool)
    this._c = new THREE.Color();
    this._apply();
  }
  update(dt){
    this.time = (this.time + dt * this.speed) % 1;
    this._apply();
  }
  set(t){ this.time = t % 1; this._apply(); }
  _sample(){
    const keys = DAY_KEYS;
    let i = 0;
    while (i < keys.length - 2 && this.time > keys[i + 1].at) i++;
    const a = keys[i], b = keys[i + 1];
    const t = (this.time - a.at) / Math.max(0.0001, b.at - a.at);
    const num = (k) => lerp(a[k], b[k], t);
    return { a, b, t, num };
  }
  _apply(){
    const { a, b, t, num } = this._sample();
    const mixC = (ca, cb) => this._c.setHex(ca).lerp(new THREE.Color(cb), t).clone();

    if (this.sky){
      this.sky.material.uniforms.top.value.copy(mixC(a.top, b.top));
      this.sky.material.uniforms.bottom.value.copy(mixC(a.bottom, b.bottom));
      this.sky.material.uniforms.sunColor.value.copy(mixC(a.sun, b.sun));
    }
    if (this.sun){
      this.sun.color.copy(mixC(a.sun, b.sun));
      this.sun.intensity = num('sunI');
      this.scene.background = mixC(a.fog, b.fog);
    }
    if (this.hemi){
      this.hemi.color.copy(mixC(a.hemi, b.hemi));
      this.hemi.intensity = num('hemiI');
    }
    if (this.fog) this.fog.color.copy(mixC(a.fog, b.fog));
    if (this.bloom) this.bloom.strength = num('bloom');
    if (this.water){
      const u = this.water.material.uniforms;
      if (u && u.uTint) u.uTint.value.setHex(this.night ? 0x1b3f7a : 0x2f9bff);
      if (u && u.uNight) u.uNight.value = this.night ? 1 : 0;
      if (u && u.uFog) u.uFog.value.copy(this.fog ? this.fog.color : new THREE.Color(PALETTE.paper));
    }
    const night = num('sunI') < 0.9;
    if (night !== this.night){
      this.night = night;
      if (this.onPhase) this.onPhase(night);
    }
    this.sunDir = this.sun ? this.sun.position : null;
    if (this.sky && this.sun) this.sky.material.uniforms.sunDir.value.copy(this.sun.position).normalize();
  }
}

/* ── water ───────────────────────────────────────────────────────────────── */
export function createWater({ size = 520, y = -26 } = {}){
  const geo = new THREE.PlaneGeometry(size, size, 70, 70);
  const mat = new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(PALETTE.sky) },
      uNight:{ value: 0 },
      uInk:  { value: new THREE.Color(PALETTE.ink) },
      uFog:  { value: new THREE.Color(PALETTE.paper) },
      uFogNear: { value: 90 },
      uFogFar:  { value: 250 },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec2 vUv; varying float vWave; varying vec3 vViewPos;
      void main(){
        vUv = uv;
        vec3 p = position;
        float w1 = sin(p.x * 0.055 + uTime * 0.9) * 1.5;
        float w2 = cos(p.y * 0.07 - uTime * 0.7) * 1.2;
        float w3 = sin((p.x + p.y) * 0.035 + uTime * 0.45) * 1.9;
        p.z += w1 + w2 + w3;
        vWave = (w1 + w2 + w3) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTint; uniform float uNight; uniform vec3 uInk;
      uniform vec3 uFog; uniform float uFogNear; uniform float uFogFar;
      varying vec2 vUv; varying float vWave; varying vec3 vViewPos;
      void main(){
        /* flat cel bands instead of a smooth gradient */
        float band = smoothstep(-0.4, 0.6, vWave);
        vec3 deep = mix(uTint * 0.72, uTint * 0.35, uNight);
        vec3 shallow = mix(uTint, uTint * 0.9 + 0.18, uNight);
        vec3 col = mix(deep, shallow, band);
        /* white foam stripes that drift */
        float line = smoothstep(0.86, 0.94, sin((vUv.x * 52.0) + vUv.y * 18.0 + vWave * 2.0));
        col = mix(col, vec3(1.0), line * 0.35);
        /* fade to the sky so the plane never reads as a blue wall */
        float d = length(vViewPos);
        col = mix(col, uFog, smoothstep(uFogNear, uFogFar, d));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}
export function tickWater(water, t){
  if (water?.material?.uniforms?.uTime) water.material.uniforms.uTime.value = t;
}

/* ── the floating island ─────────────────────────────────────────────────── */
export function createIsland({ radius = 26, depth = 22 } = {}){
  const island = new THREE.Group();

  /* grass cap */
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.97, 2.4, 48, 1), toon(0xe6edd8));
  top.position.y = -1.2;
  top.receiveShadow = true; top.castShadow = true;
  island.add(top);

  /* a slightly brighter inner disc, so the play area reads as a "stage" */
  const inner = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.86, 48), toon(0xf1f5e6));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.012;
  inner.receiveShadow = true;
  island.add(inner);

  /* ink rim */
  const rim = new THREE.Mesh(new THREE.RingGeometry(radius * 0.985, radius, 64), new THREE.MeshBasicMaterial({ color: PALETTE.ink }));
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.02;
  island.add(rim);

  /* rocky underside: a low-poly cone with a jagged silhouette */
  const rockGeo = new THREE.ConeGeometry(radius * 0.97, depth, 11, 3);
  const pos = rockGeo.attributes.position;
  for (let i = 0; i < pos.count; i++){
    const y = pos.getY(i);
    if (y < 0){
      const n = 0.86 + Math.random() * 0.28;
      pos.setX(i, pos.getX(i) * n);
      pos.setZ(i, pos.getZ(i) * n);
    }
  }
  rockGeo.computeVertexNormals();
  const rock = new THREE.Mesh(rockGeo, toon(PALETTE.rock, { flatShading: true }));
  rock.position.y = -1.2 - depth / 2;
  rock.rotation.y = 0.3;
  rock.castShadow = true; rock.receiveShadow = true;
  island.add(rock);

  addOutline(rock, 0.012);
  return island;
}

/* ── clouds ──────────────────────────────────────────────────────────────── */
export function createClouds(scene, count = 9, radius = 90){
  const group = new THREE.Group();
  const mat = toon(PALETTE.paper2);
  for (let i = 0; i < count; i++){
    const c = new THREE.Group();
    const puffs = randi(3, 5);
    for (let p = 0; p < puffs; p++){
      const r = rand(1.5, 2.9);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
      m.position.set(p * rand(2.2, 3.2) - puffs * 1.2, rand(-0.6, 0.9), rand(-1.4, 1.4));
      m.castShadow = false;
      c.add(m);
      addOutline(m, 0.05);
    }
    const a = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
    const d = radius + rand(-6, 58);
    c.position.set(Math.cos(a) * d, rand(18, 40), Math.sin(a) * d);
    c.scale.setScalar(rand(0.7, 1.35));
    c.userData.speed = rand(0.25, 0.6);
    c.userData.spin = rand(0.02, 0.06);
    group.add(c);
  }
  scene.add(group);
  return {
    group,
    update(dt, t){
      group.children.forEach((c, i) => {
        c.position.x += c.userData.speed * dt * 2.2;
        if (c.position.x > radius + 90) c.position.x = -radius - 90;
        c.position.y += Math.sin(t * 0.4 + i) * dt * 0.5;
      });
    },
  };
}

/* ── birds ───────────────────────────────────────────────────────────────── */
export function createBirds(scene, count = 7){
  const birds = new THREE.Group();
  const bodyMat = toon(PALETTE.ink);
  const wingMat = toon(PALETTE.paper2);
  for (let i = 0; i < count; i++){
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 3, 6), bodyMat);
    body.rotation.z = Math.PI / 2;
    b.add(body);
    const wingGeo = new THREE.BoxGeometry(0.9, 0.06, 0.34);
    const wl = new THREE.Mesh(wingGeo, wingMat);
    const wr = new THREE.Mesh(wingGeo, wingMat);
    wl.position.set(0, 0.06, 0.32); wr.position.set(0, 0.06, -0.32);
    b.add(wl, wr);
    b.userData = {
      wl, wr,
      r: rand(24, 46), y: rand(9, 20), a: rand(0, Math.PI * 2),
      speed: rand(0.12, 0.28) * (Math.random() < 0.5 ? 1 : -1),
      flap: rand(6, 10), ph: rand(0, 6.28),
    };
    b.scale.setScalar(rand(0.9, 1.5));
    birds.add(b);
  }
  scene.add(birds);
  return {
    group: birds,
    update(t){
      birds.children.forEach((b) => {
        const d = b.userData;
        const a = d.a + t * d.speed * 0.6;
        b.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 0.7 + d.ph) * 1.6, Math.sin(a) * d.r);
        b.rotation.y = -a + (d.speed > 0 ? Math.PI : 0);
        const f = Math.sin(t * d.flap + d.ph) * 0.7;
        d.wl.rotation.x = f; d.wr.rotation.x = -f;
      });
    },
  };
}

/* ── grass (one InstancedMesh) ───────────────────────────────────────────── */
export function createGrass(scene, { count = 1400, radius = 24, skip = () => false } = {}){
  const blade = new THREE.ConeGeometry(0.055, 0.26, 3, 1);
  blade.translate(0, 0.13, 0);
  const mat = windMaterial(0xbdd2a8, 0.09, 0.26);
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  let placed = 0, guard = 0;
  while (placed < count && guard++ < count * 12){
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (skip(x, z)) continue;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI);
    const sc = rand(0.65, 1.5);
    m.compose(v.set(x, 0, z), q, s.set(sc, sc * rand(0.8, 1.4), sc));
    mesh.setMatrixAt(placed++, m);
  }
  mesh.count = placed;
  scene.add(mesh);
  return mesh;
}

/* ── trees, lamps, benches, crates, signs ────────────────────────────────── */
const TREE_TRUNK = 0.34;
export function createTree({ scale = 1, kind = 'round' } = {}){
  const g = new THREE.Group();
  const trunkMat = toon(0xd8cdb2);
  const leafMat = toon(kind === 'pine' ? 0xdff0d2 : 0xe9f5df);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.6, 6), trunkMat);
  trunk.position.y = 1.3; trunk.castShadow = true; trunk.receiveShadow = true;
  g.add(trunk); addOutline(trunk, 0.06);

  if (kind === 'pine'){
    for (let i = 0; i < 3; i++){
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5 - i * 0.34, 1.5, 7), leafMat);
      cone.position.y = 2.4 + i * 0.95;
      cone.castShadow = true; cone.receiveShadow = true;
      cone.userData.sway = { amt: 0.014 + i * 0.006, ph: Math.random() * 6.28, base: cone.position.y };
      g.add(cone); addOutline(cone, 0.05);
    }
  } else {
    const crown = new THREE.Group();
    const balls = [
      [0, 3.5, 0, 1.55], [-1.0, 3.1, 0.4, 1.05], [1.0, 3.2, -0.3, 1.1], [0.2, 4.2, 0.2, 1.0],
    ];
    balls.forEach(([x, y, z, r]) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), leafMat);
      b.position.set(x, y, z);
      b.castShadow = true; b.receiveShadow = true;
      crown.add(b); addOutline(b, 0.05);
    });
    crown.userData.sway = { amt: 0.02, ph: Math.random() * 6.28, base: 0 };
    g.add(crown);
  }
  g.scale.setScalar(scale);
  return g;
}

export function createLamp({ color = PALETTE.sun } = {}){
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.0, 6), toon(PALETTE.ink));
  post.position.y = 1.5; post.castShadow = true;
  g.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.12), toon(PALETTE.ink));
  arm.position.set(0.3, 3.0, 0); g.add(arm);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), new THREE.MeshBasicMaterial({ color }));
  bulb.position.set(0.62, 2.86, 0);
  g.add(bulb);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity: 0.55, depthWrite: false,
  }));
  glowSprite.scale.set(2.2, 2.2, 1);
  glowSprite.position.copy(bulb.position);
  g.add(glowSprite);
  g.userData.bulb = bulb;
  return g;
}

let GLOW_TEX = null;
export function glowTexture(){
  if (GLOW_TEX) return GLOW_TEX;
  const s = 128, c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,.42)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = grad; x.fillRect(0, 0, s, s);
  GLOW_TEX = new THREE.CanvasTexture(c);
  GLOW_TEX.colorSpace = THREE.SRGBColorSpace;
  return GLOW_TEX;
}

export function createBench(){
  const g = new THREE.Group();
  const wood = toon(0xe0d3b4);
  const metal = toon(PALETTE.ink);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.7), wood);
  seat.position.y = 0.75; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.14), wood);
  back.position.set(0, 1.12, -0.28); back.rotation.x = -0.14; g.add(back);
  [-1, 1].forEach((s) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.14), metal);
    leg.position.set(s * 0.95, 0.38, 0.22); g.add(leg);
    const leg2 = leg.clone(); leg2.position.z = -0.22; g.add(leg2);
  });
  const meshes = [];
  g.traverse((o) => { if (o.isMesh) meshes.push(o); });
  meshes.forEach((o) => { o.castShadow = true; o.receiveShadow = true; addOutline(o, 0.05); });
  return g;
}

export function createCrate(size = 1){
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), toon(0xe4d7b8));
  box.position.y = size / 2; box.castShadow = true; box.receiveShadow = true;
  addOutline(box, 0.04);
  g.add(box);
  const band = new THREE.Mesh(new THREE.BoxGeometry(size * 1.02, size * 0.14, size * 1.02), toon(PALETTE.red));
  band.position.y = size * 0.5; g.add(band);
  return g;
}

export function createSignpost(text = 'ZONE'){
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 6), toon(PALETTE.ink));
  post.position.y = 1.1; g.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.62, 0.12), toon(PALETTE.paper2));
  board.position.y = 2.0; g.add(board); addOutline(board, 0.05);
  g.traverse((o) => { if (o.isMesh){ o.castShadow = true; } });
  return g;
}

/* ── floating dust / sparkle particles ───────────────────────────────────── */
export function createParticles(scene, count = 260, spread = 40){
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++){
    positions[i * 3] = rand(-spread, spread);
    positions[i * 3 + 1] = rand(1, 22);
    positions[i * 3 + 2] = rand(-spread, spread);
    seeds[i] = Math.random() * 6.28;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffc93c) }, uSize: { value: 34 } },
    vertexShader: /* glsl */`
      uniform float uTime; uniform float uSize;
      attribute float aSeed;
      varying float vAlpha;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.5 + aSeed) * 2.0;
        p.x += cos(uTime * 0.3 + aSeed * 1.7) * 1.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.35 + 0.65 * sin(aSeed)) / -mv.z;
        vAlpha = 0.35 + 0.45 * sin(uTime * 1.3 + aSeed);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vAlpha;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        if (length(c) > 0.5) discard;
        gl_FragColor = vec4(uColor, vAlpha);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return {
    points: pts,
    update(t){ mat.uniforms.uTime.value = t; },
  };
}

/* ── camera rig: smooth follow + collision + shake ───────────────────────── */
export class CameraRig {
  constructor(camera, { distance = 11.5, height = 6.6, colliders = [] } = {}){
    this.camera = camera;
    this.fovBase = camera.fov || 55;
    this.fovRun = this.fovBase + 7;      // a touch wider when sprinting
    this.lookAhead = new THREE.Vector3();  // soft lead in the walking direction
    this.forward = new THREE.Vector3();
    this.distance = distance;
    this.height = height;
    this.colliders = colliders;
    this.yaw = 0;
    this.pitch = 0.46;
    this.pos = new THREE.Vector3(0, 12, 22);
    this.look = new THREE.Vector3();
    this.want = new THREE.Vector3();
    this.wantLook = new THREE.Vector3();
    this.shake = 0;
    this._ray = new THREE.Raycaster();
    this._dir = new THREE.Vector3();
    this._from = new THREE.Vector3();
  }
  kick(amount = 0.35){ this.shake = Math.min(1, this.shake + amount); }
  /**
   * @param {number} dt
   * @param {THREE.Vector3} target  the player
   * @param {object} o { snap, lookAhead:Vector3, running:boolean }
   */
  update(dt, target, { snap = false, lookAhead = null, running = false } = {}){
    /* yaw 0 = camera sits behind the player on +Z, looking towards -Z */
    const dist = this.distance, h = this.height;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.want.set(
      target.x + sy * dist * Math.cos(this.pitch),
      target.y + h * Math.sin(this.pitch) * 1.7,
      target.z + cy * dist * Math.cos(this.pitch),
    );

    /* pull in when a building is between the player and the camera */
    if (this.colliders.length){
      this._from.set(target.x, target.y + 1.8, target.z);
      this._dir.subVectors(this.want, this._from);
      const d = this._dir.length();
      if (d > 0.01){
        this._dir.divideScalar(d);
        this._ray.set(this._from, this._dir);
        this._ray.far = d;
        const hit = this._ray.intersectObjects(this.colliders, true)[0];
        if (hit) this.want.copy(this._from).addScaledVector(this._dir, Math.max(3.2, hit.distance - 0.8));
      }
    }
    if (this.want.y < 1.6) this.want.y = 1.6;

    /* soft look-ahead: aim slightly past the player in the walking direction,
       smoothed so it never snaps when you change direction */
    if (lookAhead){
      this.lookAhead.lerp(lookAhead, 1 - Math.exp(-3.2 * dt));
    } else {
      this.lookAhead.multiplyScalar(Math.exp(-3.2 * dt));
    }

    this.wantLook.set(
      target.x + this.lookAhead.x,
      target.y + 1.7 + this.lookAhead.y * 0.25,
      target.z + this.lookAhead.z,
    );
    const k = snap ? 1 : 1 - Math.exp(-7 * dt);
    this.pos.lerp(this.want, k);
    this.look.lerp(this.wantLook, k);

    /* gentle FOV push while running — never a jump */
    const wantFov = running ? this.fovRun : this.fovBase;
    this.camera.fov = damp(this.camera.fov, wantFov, 4.5, dt);
    this.camera.updateProjectionMatrix();

    /* landing / portal shake */
    if (this.shake > 0.001){
      const s = this.shake * 0.5;
      this.camera.position.set(
        this.pos.x + (Math.random() - 0.5) * s,
        this.pos.y + (Math.random() - 0.5) * s,
        this.pos.z + (Math.random() - 0.5) * s,
      );
      this.shake *= Math.exp(-6 * dt);
    } else {
      this.camera.position.copy(this.pos);
    }
    this.camera.lookAt(this.look);
  }
}

/* ── post-processing: bloom + vignette ───────────────────────────────────── */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.55 },
    uTint: { value: new THREE.Color(0x121216) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uAmount; uniform vec3 uTint;
    varying vec2 vUv;
    void main(){
      vec4 tex = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      float vig = smoothstep(0.82, 0.24, d);
      tex.rgb = mix(tex.rgb * mix(vec3(1.0), uTint, 0.35), tex.rgb, vig);
      gl_FragColor = tex;
    }`,
};

export function createComposer(renderer, scene, camera, { bloom = 0.3, vignette = 0.55 } = {}){
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), bloom, 0.65, 0.92,
  );
  composer.addPass(bloomPass);
  const vig = new ShaderPass(VignetteShader);
  vig.uniforms.uAmount.value = vignette;
  composer.addPass(vig);
  return { composer, bloom: bloomPass, vignette: vig };
}

/* ── disposal ────────────────────────────────────────────────────────────── */
export function disposeObject(root){
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach((m) => {
      if (m.map) m.map.dispose();
      if (m.gradientMap) m.gradientMap.dispose?.();
      m.dispose();
    });
  });
}

/* ── misc ────────────────────────────────────────────────────────────────── */
export function makeGroundRing(radius, thickness, color = PALETTE.ink, opacity = 1){
  const m = new THREE.Mesh(
    new THREE.RingGeometry(radius - thickness, radius, 64),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}

export function billboardText(text, { size = 1, color = '#121216', bg = '#fffdf7' } = {}){
  const pad = 28, font = 64;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `bold ${font}px "Press Start 2P", monospace`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = font + pad * 2;
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.strokeStyle = color; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);
  x.font = `bold ${font}px "Press Start 2P", monospace`;
  x.fillStyle = color; x.textBaseline = 'middle'; x.textAlign = 'center';
  x.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set((w / h) * size, size, 1);
  return sprite;
}


/* ── far islands: pale silhouettes for depth, no gameplay ───────────────── */
export function createFarIslands(scene, count = 4){
  const group = new THREE.Group();
  for (let i = 0; i < count; i++){
    const a = (i / count) * Math.PI * 2 + rand(-0.4, 0.4);
    const d = rand(78, 118);
    const island = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(rand(3.4, 5.4), rand(2.8, 4.4), 1.6, 9), new THREE.MeshBasicMaterial({ color: 0xe4e9dc }));
    island.add(cap);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(rand(3.0, 4.8), rand(5, 8), 8, 1), new THREE.MeshBasicMaterial({ color: 0xd7ddd0 }));
    rock.rotation.x = Math.PI;
    rock.position.y = -8;
    island.add(rock);
    for (let t = 0; t < 2; t++){
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 5), new THREE.MeshBasicMaterial({ color: 0xcfdcc0 }));
      tree.position.set(rand(-2, 2), 1.6, rand(-2, 2));
      island.add(tree);
    }
    island.position.set(Math.cos(a) * d, rand(-6, 14), Math.sin(a) * d);
    island.rotation.y = rand(0, 6.28);
    island.userData.bob = rand(0, 6.28);
    group.add(island);
  }
  scene.add(group);
  return {
    group,
    update(dt, t){
      group.children.forEach((c) => { c.position.y += Math.sin(t * 0.25 + c.userData.bob) * dt * 0.35; });
    },
  };
}
