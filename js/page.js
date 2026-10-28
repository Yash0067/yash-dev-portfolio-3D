/* ═══════════════════════════════════════════════════════════════════════════
   page.js — the shared skeleton for the five sub-pages.
   Renderer, camera, orbit, picking, post-processing, pause-on-hidden, disposal.
   Each page keeps its own scene content in its own file.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { createRenderer, createComposer, toon, addOutline, damp, clamp } from './world.js';
import { Audio, withMute } from './audio.js';
import { openPanel, closePanel, panelIsOpen, carryMute, mountPageChrome } from './ui.js';
import { revealOnLoad, transitionTo, createIdle } from './anim.js';
import { mountGuide } from './guide.js';

/* fade the chapter in, and fade out when you leave it */
export function wireChapterChrome(){
  carryMute();          /* sound off stays off when you walk through a door */
  /* every chapter gets the fade cover, even though only index.html ships it */
  if (!document.getElementById('fade')){
    const fade = document.createElement('div');
    fade.id = 'fade';
    fade.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fade);
  }
  revealOnLoad();
  ['projects', 'skills', 'about', 'quests', 'contact', 'story'].forEach((id) => {
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = `${id}.html`;
    document.head.appendChild(l);
  });
  /* a floating way back into the 3D island — always on screen, on every device */
  if (!document.querySelector('.float3d')){
    const float = document.createElement('a');
    float.className = 'float3d';
    float.href = withMute('index.html?resume=1' + (location.hash || ''));
    float.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 3 3 20h18L12 3Z"/></svg> PLAY THE ISLAND';
    float.setAttribute('aria-label', 'Go to the 3D island');
    document.body.appendChild(float);
  }

  /* BACK TO WORLD always resumes the island instead of the landing screen */
  const back = document.querySelector('#backBtn');
  if (back){
    back.setAttribute('href', withMute('index.html?resume=1' + (location.hash || '')));
  }

  /* keep the island state when hopping between chapters */
  const carry = () => (location.hash || '');
  document.querySelectorAll('.jumpbar a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && !href.includes('#')) a.setAttribute('href', href + carry());
  });

  document.querySelectorAll('a[href$=".html"]').forEach((a) => {
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;
      e.preventDefault();
      transitionTo(href, { ms: 260 });   /* transitionTo() adds the mute flag */
    });
  });
}

export function bootPage({
  canvas,
  background = 0xf7f4ec,
  fog = null,                     // { color, near, far }
  camera = { pos: [0, 6, 14], look: [0, 2, 0], fov: 42 },
  bloom = 0.32,
  vignette = 0.45,
  autoRotate = 0.04,
  pitchLimit = [0.05, 1.1],
  distanceLimit = [6, 40],
  target = new THREE.Vector3(0, 2, 0),
  guide = null,                    // { tag, blurb, items } — the what-is-here dock
} = {}){
  wireChapterChrome();
  if (guide) mountGuide(guide);
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  if (fog) scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);

  const cam = new THREE.PerspectiveCamera(camera.fov, innerWidth / innerHeight, 0.1, 300);
  cam.position.set(...camera.pos);
  cam.lookAt(new THREE.Vector3(...camera.look));

  const { composer, bloom: bloomPass } = createComposer(renderer, scene, cam, { bloom, vignette });

  /* orbit state */
  const idle = createIdle({ quiet: 2.4 });
  const orbit = {
    target,
    yaw: Math.atan2(cam.position.x - target.x, cam.position.z - target.z),
    pitch: Math.asin(clamp((cam.position.y - target.y) / cam.position.distanceTo(target), -1, 1)),
    dist: cam.position.distanceTo(target),
    auto: autoRotate,
  };
  let dragging = false, lastX = 0, lastY = 0, moved = 0, downAt = null;
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  function applyOrbit(){
    const { yaw, pitch, dist, target: t } = orbit;
    cam.position.set(
      t.x + Math.sin(yaw) * dist * Math.cos(pitch),
      t.y + Math.sin(pitch) * dist,
      t.z + Math.cos(yaw) * dist * Math.cos(pitch),
    );
    cam.lookAt(t);
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0;
    lastX = e.clientX; lastY = e.clientY;
    downAt = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    orbit.yaw -= dx * 0.005;
    orbit.pitch = clamp(orbit.pitch + dy * 0.004, pitchLimit[0], pitchLimit[1]);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    orbit.dist = clamp(orbit.dist + e.deltaY * 0.012, distanceLimit[0], distanceLimit[1]);
  }, { passive: true });

  /* clicking an object: pages register pickable meshes with a userData.pick id */
  const pickables = [];
  function pickable(obj, data){
    obj.traverse((o) => { if (o.isMesh && !o.userData.isOutline){ o.userData.pick = data; pickables.push(o); } });
    return obj;
  }

  let onClick = null;
  canvas.addEventListener('click', (e) => {
    if (moved > 8) return;
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, cam);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits.length){
      const data = hits[0].object.userData.pick;
      if (onClick) onClick(data, hits[0]);
    }
  });

  /* hover cursor */
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) return;
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, cam);
    const hits = raycaster.intersectObjects(pickables, false);
    canvas.style.cursor = hits.length ? 'pointer' : 'grab';
  });

  /* frame loop */
  const updateFns = [];
  let raf = 0, last = performance.now(), paused = false;

  function frame(now){
    const dt = Math.min((now - last) / 1000, 0.1);   // 10 fps floor: slow devices keep real-time pacing
    last = now;
    if (!paused){
      const t = now / 1000;
      /* auto-rotate only while the visitor is idle */
      if (!dragging && orbit.auto) orbit.yaw += orbit.auto * idle.tick(dt) * dt;
      applyOrbit();
      updateFns.forEach((fn) => fn(dt, t));
      composer.render();
    }
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!document.hidden){ last = performance.now(); }
  });

  addEventListener('resize', () => {
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });

  applyOrbit();
  raf = requestAnimationFrame(frame);

  window.__PAGE = { scene, camera: cam, renderer };   /* console / QA handle */

  /* free everything when the chapter is left, so chapters never leak */
  addEventListener('pagehide', () => {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    composer?.dispose?.();
    renderer.dispose();
  });

  return {
    renderer, scene, camera: cam, composer, bloom: bloomPass, orbit, THREE,
    onUpdate(fn){ updateFns.push(fn); return fn; },
    pickable,
    onClick(fn){ onClick = fn; },
    get raycaster(){ return raycaster; },
    get pointer(){ return pointer; },
    stop(){ cancelAnimationFrame(raf); paused = true; },
    resume(){ paused = false; last = performance.now(); },
  };
}

/* ── helpers shared by the sub-pages ─────────────────────────────────────── */

/** A floating "screen": dark panel with a glowing border + a canvas texture. */
export function makeScreen({
  w = 3, h = 1.8, title = '', subtitle = '', accent = 0xff2a00,
  bg = 0x0f0f14, theme = 'dark', progress = 0, index = '',
} = {}){
  /* 300 px per world unit: the plaques are read from a few metres away, and
     210 px made the small caps mushy on a normal display.                  */
  const cw = Math.min(1180, Math.round(300 * w));
  const ch = Math.round((cw * h) / w);
  const cv = document.createElement('canvas');
  cv.width = cw;
  cv.height = ch;
  const x = cv.getContext('2d');
  const accentCss = '#' + new THREE.Color(accent).getHexString();
  const light = theme === 'light';
  const ink = light ? '#121216' : '#fffdf7';
  const dim = light ? 'rgba(18,18,22,.66)' : 'rgba(255,253,247,.68)';
  const pad = Math.round(cw * 0.055);
  const PIXEL = '"Press Start 2P", "Arial Black", system-ui, sans-serif';
  const TEXT = 'system-ui, "Segoe UI", Arial, sans-serif';

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  function draw(){
    /* ── face ──────────────────────────────────────────────────────────── */
    x.clearRect(0, 0, cw, ch);
    x.fillStyle = light ? '#fffdf7' : '#0b0b10';
    x.fillRect(0, 0, cw, ch);
    if (light){
      /* a wash of the accent colour, so a wall of cards still reads as colour */
      x.globalAlpha = 0.12;
      x.fillStyle = accentCss;
      x.fillRect(0, 0, cw, ch);
      x.globalAlpha = 1;
    } else {
      x.fillStyle = 'rgba(255,255,255,.045)';
      for (let i = 0; i < cw; i += 12) for (let j = 0; j < ch; j += 12) x.fillRect(i, j, 2, 2);
    }

    /* ── solid accent band across the top ──────────────────────────────── */
    const bandH = Math.round(ch * (light ? 0.16 : 0.10));
    x.fillStyle = accentCss;
    x.fillRect(0, 0, cw, bandH);

    /* catalogue number, white on the band */
    if (index){
      x.fillStyle = light ? '#fffdf7' : '#0b0b10';
      x.font = `bold ${Math.round(Math.min(bandH * 0.52, cw * 0.085))}px ${PIXEL}`;
      x.textAlign = 'right';
      x.textBaseline = 'middle';
      x.fillText(index, cw - pad, bandH / 2 + 1);
      x.textAlign = 'left';
    }

    /* ── heavy ink frame — the brutalist edge that makes it pop ─────────── */
    const frame = Math.max(4, Math.round(cw * 0.011));
    x.strokeStyle = ink;
    x.lineWidth = frame;
    x.strokeRect(frame / 2, frame / 2, cw - frame, ch - frame);

    /* ── vertical layout: title gets whatever the footer does not need ──── */
    const maxW = cw - pad * 2;
    const pillH = Math.round(ch * (light ? 0.175 : 0.12));
    const barH = (light && progress > 0) ? Math.round(ch * 0.05) : 0;
    const gap = Math.round(ch * 0.055);
    const pillTop = ch - pillH - Math.round(gap * 0.6);
    const barTop = pillTop - (barH ? barH + Math.round(gap * 0.55) : 0);
    const titleTop = bandH + Math.round(ch * 0.065);
    const availH = barTop - titleTop - Math.round(gap * 0.3);

    /* ── title: bold, wrapped, as large as it can be ────────────────────── */
    const measure = (str, size) => {
      x.font = `bold ${size}px ${PIXEL}`;
      /* Press Start 2P advances at roughly one em per glyph; the estimate keeps
         the layout honest even before the webfont has actually loaded       */
      /* Press Start 2P is wide and the fallback is narrower, so the estimate
         has to be generous or a long word gets cut by the clip           */
      return Math.max(x.measureText(str).width, str.length * size * 1.22);
    };
    const wrap = (size) => {
      const words = String(title).toUpperCase().split(/\s+/);
      const lines = [];
      let line = '';
      words.forEach((word) => {
        const test = line ? line + ' ' + word : word;
        if (measure(test, size) > maxW && line){ lines.push(line); line = word; }
        else line = test;
      });
      if (line) lines.push(line);
      return lines;
    };
    let size = Math.round(Math.min(cw * 0.105, availH * 0.46));
    let lines = wrap(size);
    const fits = () => lines.length <= 3
      && lines.every((l) => measure(l, size) <= maxW)
      && lines.length * size * 1.22 <= availH;
    while (size > 13 && !fits()){ size -= 2; lines = wrap(size); }

    /* clip so nothing can ever spill off the card, whatever the font */
    x.save();
    x.beginPath();
    x.rect(frame, titleTop - Math.round(size * 0.2), cw - frame * 2, availH + Math.round(size * 0.3));
    x.clip();
    x.fillStyle = ink;
    x.textBaseline = 'top';
    x.font = `bold ${size}px ${PIXEL}`;
    let ty = titleTop;
    lines.slice(0, 3).forEach((line) => {
      x.fillText(line, pad, ty);
      ty += Math.round(size * 1.22);
    });
    x.restore();

    /* ── the coloured tag at the bottom ─────────────────────────────────── */
    if (subtitle){
      const sub = String(subtitle).toUpperCase();
      let sSize = Math.round(pillH * 0.56);
      /* the system font is always available, so this width is the real one */
      x.font = `bold ${sSize}px ${TEXT}`;
      while (sSize > 9 && x.measureText(sub).width + pillH * 0.7 > maxW){
        sSize -= 1;
        x.font = `bold ${sSize}px ${TEXT}`;
      }
      const pw = Math.min(maxW, x.measureText(sub).width + pillH * 0.7);
      x.fillStyle = accentCss;
      x.fillRect(pad, pillTop, pw, pillH);
      x.save();
      x.beginPath();
      x.rect(pad, pillTop, pw, pillH);
      x.clip();
      x.fillStyle = light ? '#fffdf7' : '#0b0b10';
      x.font = `bold ${sSize}px ${TEXT}`;
      x.textBaseline = 'middle';
      x.fillText(sub, pad + pillH * 0.35, pillTop + pillH / 2 + 1);
      x.restore();
      x.textBaseline = 'top';
    }

    /* ── level bar ──────────────────────────────────────────────────────── */
    if (barH){
      x.fillStyle = 'rgba(18,18,22,.18)';
      x.fillRect(pad, barTop, maxW, barH);
      x.fillStyle = accentCss;
      x.fillRect(pad, barTop, Math.max(barH, maxW * Math.min(1, progress)), barH);
    }
    tex.needsUpdate = true;
  }
  draw();
  /* fonts usually land after the first paint — redraw once, so the plaques
     are crisp on the first visit too, not only on the second             */
  if (document.fonts && document.fonts.ready){
    const again = () => draw();
    document.fonts.ready.then(again).catch(() => {});
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', again);
    setTimeout(again, 900);          /* safety net for a slow webfont */
  }
  const group = new THREE.Group();

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.12), toon(bg));
  bezel.castShadow = true; bezel.receiveShadow = true;
  addOutline(bezel, light ? 0.026 : 0.03);
  group.add(bezel);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }),
  );
  face.position.z = 0.065;
  group.add(face);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.22, 0.09, 0.16),
    new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }),
  );
  edge.position.y = -(h / 2) - 0.1;
  group.add(edge);

  group.userData.face = face;
  group.userData.texture = tex;
  group.userData.redraw = draw;
  return group;
}

export function makePodium({ width = 2.2, height = 2.4, depth = 2.2, accent = 0xff2a00 } = {}){
  const g = new THREE.Group();
  const stone = toon(0xb7b0a2);
  const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), stone);
  block.position.y = height / 2;
  block.castShadow = true; block.receiveShadow = true;
  addOutline(block, 0.02);
  g.add(block);

  const top = new THREE.Mesh(new THREE.BoxGeometry(width * 1.08, 0.16, depth * 1.08), toon(0xd9d2c2));
  top.position.y = height + 0.06;
  top.castShadow = true; top.receiveShadow = true;
  addOutline(top, 0.02);
  g.add(top);

  const base = new THREE.Mesh(new THREE.BoxGeometry(width * 1.16, 0.22, depth * 1.16), toon(0x9f988a));
  base.position.y = 0.11;
  base.receiveShadow = true;
  addOutline(base, 0.02);
  g.add(base);

  /* engraved number plate (canvas) */
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const x = cv.getContext('2d');
  x.fillStyle = '#e8e2d4'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#121216'; x.lineWidth = 10; x.strokeRect(14, 14, 228, 228);
  x.fillStyle = '#121216';
  x.font = 'bold 150px "Press Start 2P", monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(g.userData.number || '1'), 128, 138);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;

  return { group: g, height, plateTexture: tex, accent };
}

/** tiny 3D floating particles around a scene */
export function floatDust(count = 120, spread = 16, color = 0xffffff){
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++){
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = Math.random() * spread * 0.7;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    seed[i] = Math.random() * 6.28;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      uniform float uTime; attribute float aSeed; varying float vA;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.6 + aSeed) * 0.6;
        p.x += cos(uTime * 0.4 + aSeed * 2.0) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 26.0 / -mv.z;
        vA = 0.25 + 0.55 * abs(sin(uTime + aSeed));
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        if (length(c) > 0.5) discard;
        gl_FragColor = vec4(uColor, vA);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { points: pts, update(t){ mat.uniforms.uTime.value = t; } };
}
