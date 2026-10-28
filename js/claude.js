/* ═══════════════════════════════════════════════════════════════════════════
   claude.js — CLAUDE, the voxel guide.
   Every shape is a BoxGeometry, so he can never fail to load: no model file,
   no textures, no network. He follows the visitor, walks ahead to each door,
   turns around and points, sits on podium 1, cheers, and waves goodbye.

   The display name lives in ONE place: GUIDE_NAME in js/content.js.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { toon, addOutline, damp, clamp, rand, PALETTE } from './world.js';
import { springStep, dampAngle, StateBlend } from './anim.js';

export const CLAUDE = {
  body:     0xee8470,   // coral body
  bodyDark: 0xc9624d,   // dark-coral legs / stubs
  cap:      0x2f6fe0,   // blue cap
  brim:     0x2558b8,   // darker blue brim
  capRed:   0xff2a00,   // flashes red on a power-up
  eye:      0x121216,
  outline:  0.045,
};
/* older name, kept so nothing that still says BLOCKY breaks */
export const BLOCKY = CLAUDE;

/* ── one box, ink outline, toon shading ──────────────────────────────────── */
function block(w, h, d, color, { outline = CLAUDE.outline, x = 0, y = 0, z = 0 } = {}){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (outline > 0) addOutline(m, outline);
  return m;
}

/**
 * Build the character. Origin at the feet, facing +Z.
 * Returns a Group with `userData.rig` describing the moving parts.
 */
function makeNameplate(text){
  const pad = 26, fs = 34;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${fs}px "Press Start 2P", ui-monospace, monospace`;
  const tw = Math.ceil(ctx.measureText(text).width);
  c.width = tw + pad * 2 + 26;
  c.height = fs + pad * 1.2;

  const g = c.getContext('2d');
  g.fillStyle = '#fffdf7';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#ff2a00';
  g.fillRect(0, 0, 16, c.height);
  g.strokeStyle = '#121216';
  g.lineWidth = 6;
  g.strokeRect(3, 3, c.width - 6, c.height - 6);
  g.fillStyle = '#121216';
  g.font = `${fs}px "Press Start 2P", ui-monospace, monospace`;
  g.textBaseline = 'middle';
  g.fillText(text, 16 + pad * 0.5, c.height / 2 + 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  const h = 0.26;
  sprite.scale.set((c.width / c.height) * h, h, 1);
  sprite.position.y = 2.02;
  sprite.renderOrder = 5;
  return sprite;
}

export function createClaude({ scale = 1, capColor = CLAUDE.cap, label = '' } = {}){
  const root = new THREE.Group();
  root.name = 'claude';

  const rig = new THREE.Group();            // everything that bobs / hops
  root.add(rig);

  /* body: wide, flat, slightly wider than tall */
  const body = block(1.5, 1.02, 0.9, CLAUDE.body, { y: 0.72 });
  rig.add(body);
  [[-0.71, 0.35], [0.71, 0.35], [-0.71, -0.35], [0.71, -0.35]].forEach(([x, y]) => {
    const c = block(0.22, 0.5, 0.92, CLAUDE.body, { y: 0.72 + y, x, outline: 0 });
    rig.add(c);
  });

  /* cap + darker brim so the silhouette reads at a glance */
  const cap = block(1.58, 0.26, 0.98, capColor, { y: 1.34, outline: 0.03 });
  rig.add(cap);
  const brim = block(0.72, 0.11, 0.34, CLAUDE.brim, { y: 1.28, z: 0.56, outline: 0.03 });
  rig.add(brim);

  /* eyes: square black blocks, squashed when blinking */
  const eyeGeo = new THREE.BoxGeometry(0.17, 0.2, 0.05);
  const eyeMat = new THREE.MeshToonMaterial({ color: CLAUDE.eye });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.3, 0.86, 0.47);
  eyeR.position.set(0.3, 0.86, 0.47);
  rig.add(eyeL, eyeR);

  /* two small cheeks keep the face from reading blank */
  rig.add(block(0.1, 0.06, 0.03, CLAUDE.bodyDark, { x: -0.52, y: 0.72, z: 0.46, outline: 0 }));
  rig.add(block(0.1, 0.06, 0.03, CLAUDE.bodyDark, { x: 0.52, y: 0.72, z: 0.46, outline: 0 }));

  /* stub arms on pivots, so they can swing and point */
  const armPivot = (x) => {
    const p = new THREE.Group();
    p.position.set(x, 0.78, 0);
    const stub = block(0.24, 0.44, 0.34, CLAUDE.bodyDark, { y: -0.16, outline: 0.03 });
    p.add(stub);
    return p;
  };
  const armL = armPivot(-0.86);
  const armR = armPivot(0.86);
  rig.add(armL, armR);

  /* thin dark-coral legs that swing when he walks */
  const legPivot = (x) => {
    const p = new THREE.Group();
    p.position.set(x, 0.34, 0);
    p.add(block(0.18, 0.36, 0.2, CLAUDE.bodyDark, { y: -0.18, outline: 0.03 }));
    return p;
  };
  const legL = legPivot(-0.34);
  const legR = legPivot(0.34);
  rig.add(legL, legR);

  /* soft contact shadow — a disc, not a shadow map, so it reads far away */
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 18),
    new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  if (label) root.add(makeNameplate(label));

  root.scale.setScalar(scale);
  root.userData.rig = { rig, body, cap, brim, eyeL, eyeR, armL, armR, legL, legR, shadow };
  root.userData.baseCapColor = capColor;
  return root;
}
export const createMascot = createClaude;

/* ── behaviour ───────────────────────────────────────────────────────────── */
export class Claude {
  /**
   * @param {THREE.Scene} scene
   * @param {object} opts { position, scale, mode: 'follow'|'guide'|'stage'|'idle', onTalk, glow }
   */
  constructor(scene, { position = new THREE.Vector3(1.8, 0, 6.2), scale = 1, mode = 'follow', onTalk = null, glow = true, label = '' } = {}){
    this.scene = scene;
    this.root = createClaude({ scale, label });
    this.root.position.copy(position);
    scene.add(this.root);
    this.mode = mode;
    this.onTalk = onTalk;
    /* ?debug=1 leaves a handle for the console / QA sweeps */
    try { if (new URLSearchParams(location.search).has('debug')) window.__CLAUDE = this; } catch (e){ /* noop */ }

    this.vel = new THREE.Vector3();
    this.target = position.clone();
    this.facing = Math.PI;
    this.blinkAt = rand(3, 6);          /* a blink every 3–6 s, never on a loop */
    this.blinkT = 0;
    this.hopT = 0;
    this.spinT = 0;
    this.flashT = 0;
    this.bounceT = 0;
    this.tiltT = 0;
    this.shakeT = 0;
    this.tipT = 0;
    this.waveT = 0;
    this.sitT = 0;
    this.sitting = false;
    this.wasGrounded = true;
    this.hintTarget = null;
    this.camera = null;           // stage: the camera he keeps facing
    this.goal = null;             // guide: the door he is walking to
    this.pointing = null;         // guide: world position his arm aims at
    this.goalReached = false;
    this.state = 'idle';

    /* critically damped follow: he trails gently, never clips through you */
    this.spring = { x: position.x, z: position.z, vx: 0, vz: 0 };
    this.landSquash = 0;                /* squash & stretch on landing */
    this.blend = new StateBlend(['idle', 'walk', 'run', 'point', 'wave', 'sit', 'cheer'], { fade: 0.2 });

    /* a warm pool of light on the floor, so he is easy to find in a dark room.
       It sits BELOW him on purpose: a light inside the body lights the inside of
       the cap and paints a blue blob across his head. */
    this.glow = null;
    if (glow){
      this.glow = new THREE.PointLight(0xffc4ae, 1.1, 3.2, 2);
      this.glow.position.set(0, 0.06, 0);
      this.root.add(this.glow);
    }
  }

  /* ----- emotions ------------------------------------------------------- */
  hop(fromJump = false){ this.hopT = Math.max(this.hopT, fromJump ? 0.42 : 0.3); }
  spin(){ this.spinFrom = this.facing; this.spinT = 0.62; }
  flashCap(){ this.flashT = 0.9; }
  bounce(){ this.bounceT = 1.6; }
  tilt(){ this.tiltT = 1.1; }          // curious head-tilt
  shake(){ this.shakeT = 0.55; }       // quick joke shake
  tipCap(){ this.tipT = 0.9; }         // touches the brim
  wave(){ this.waveT = 1.6; }          // goodbye
  sit(){ this.sitting = true; this.sitT = 1; }
  stand(){ this.sitting = false; }
  say(line){ if (this.onTalk) this.onTalk(line); }

  /* ----- guidance ------------------------------------------------------- */
  /** Walk ahead of the visitor to `door`, wait there, then point at `then`. */
  leadTo(door, then = null){
    if (!door || !door.clone){ this.relax(); return; }   /* null-safe: hints can clear */
    this.mode = 'guide';
    this.goal = door.clone();
    this.pointing = (then || door).clone();
    this.goalReached = false;
  }
  /** Stop guiding and just tag along again. */
  relax(){ this.mode = 'follow'; this.goal = null; this.pointing = null; this.goalReached = false; }
  setHintTarget(v){ this.hintTarget = v; this.leadTo(v); }
  setMode(m){ this.mode = m; }

  /** Freeze him where he stands, square on to the camera, facing the visitor.
   *  Stage mode has no visitor position, so his angle is pinned here once the
   *  page has finished placing him — otherwise the idle sway walks him off. */
  faceVisitor(camera = null){
    this.camera = camera || null;
    if (camera){
      const d = new THREE.Vector3().subVectors(camera.position, this.root.position).setY(0);
      this.facing = Math.atan2(d.x, d.z);
    } else if (this.mode !== 'follow' && this.mode !== 'guide'){
      this.facing = 0;
    }
    this.root.rotation.y = this.facing;
    this.target.copy(this.root.position);      /* he is planted, not wandering */
    this.spring.x = this.root.position.x;
    this.spring.z = this.root.position.z;
    this.spring.vx = 0; this.spring.vz = 0;
    this.vel.set(0, 0, 0);
    return this;
  }

  /* ----- per frame ------------------------------------------------------ */
  /**
   * @param {number} dt
   * @param {number} t
   * @param {object} ctx { playerPos, grounded, nearestPortal, hint, camera }
   */
  update(dt, t, ctx = {}){
    const rig = this.root.userData.rig;
    const { playerPos, grounded = true, nearestPortal = null, camera = null } = ctx;
    const pos = this.root.position;

    /* ---------- where should he be? ---------- */
    if (this.mode === 'guide' && this.goal && playerPos){
      const toGoal = new THREE.Vector3().subVectors(this.goal, playerPos).setY(0);
      const dPlayer = toGoal.length();
      if (dPlayer < 4.2){
        /* arrived: stand at the door, turn round, point at what comes next */
        this.target.lerp(this.goal, 1 - Math.exp(-4 * dt));
        this.goalReached = true;
        this.state = 'waiting';
      } else {
        /* walk a couple of metres AHEAD of the visitor, on the way to the door */
        const dir = toGoal.normalize();
        const ahead = new THREE.Vector3().copy(playerPos).addScaledVector(dir, 2.7);
        /* small sideways offset so he never blocks the camera line */
        const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.55);
        ahead.add(side);
        this.target.lerp(ahead, 1 - Math.exp(-3.2 * dt));
        this.goalReached = false;
        this.state = 'leading';
      }
    } else if (this.mode === 'follow' && playerPos){
      const back = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
      const offset = back.multiplyScalar(-2.0);
      if (camera){
        const camDir = new THREE.Vector3().subVectors(playerPos, camera.position).setY(0).normalize();
        offset.add(new THREE.Vector3(-camDir.z, 0, camDir.x).multiplyScalar(0.9));
      }
      this.target.lerp(new THREE.Vector3(playerPos.x + offset.x, 0, playerPos.z + offset.z), 1 - Math.exp(-2.6 * dt));
      this.state = 'following';
    } else {
      this.state = this.mode === 'stage' ? 'stage' : 'idle';
    }

    /* a frozen mascot keeps his feet planted: the idle animation keeps
       running, but he never walks, drifts or gets nudged around            */
    if (this.frozen){
      pos.x = this.spring.x;
      pos.z = this.spring.z;
      Object.assign(this.vel, { x: 0, y: 0, z: 0 });
      this.root.position.copy(pos);
      this.root.rotation.y = this.facing;
      /* still alive: he breathes, blinks, sways the hat and the staff */
      rig.body.scale.y = 1 + Math.sin(t * 2.1) * 0.015;
      rig.rig.position.y = Math.sin(t * 1.3) * 0.012;
      this.blinkAt -= dt;
      if (this.blinkAt <= 0){ this.blinkT = 0.14; this.blinkAt = rand(2.4, 5.5); }
      if (this.blinkT > 0){ this.blinkT -= dt; rig.eyeL.scale.y = 0.12; rig.eyeR.scale.y = 0.12; }
      else { rig.eyeL.scale.y = 1; rig.eyeR.scale.y = 1; }
      if (rig.staff) rig.staff.rotation.z = Math.sin(t * 0.9) * 0.03;
      if (rig.userData && rig.userData.star) rig.userData.star.rotation.y = t * 0.6;
      if (this.waveT > 0){
        this.waveT -= dt;
        const k = Math.sin(t * 12) * 0.5 + 0.5;
        rig.armR.rotation.z = -1.5 - k * 0.35;
        if (this.waveT <= 0) rig.armR.rotation.z = -0.22;
      }
      return;
    }

    /* ---------- staged characters stand still, square on to the room ------ */
    if (this.mode === 'stage'){
      this.spring.x = this.root.position.x;
      this.spring.z = this.root.position.z;
      this.vel.set(0, 0, 0);
    }

    /* ---------- critically damped spring towards the target ---------- */
    if (!this.sitting){
      const before = { x: this.spring.x, z: this.spring.z };
      springStep(this.spring, this.target, {
        stiffness: 78, damping: 17, dt, maxSpeed: 11,
      });
      /* never walk into the visitor: personal space shrinks with the body */
      if (playerPos){
        const ax = this.spring.x - playerPos.x;
        const az = this.spring.z - playerPos.z;
        const ad = Math.hypot(ax, az);
        const MIN = 1.15 * this.root.scale.x;
        if (ad < MIN && ad > 0.0001){
          this.spring.x = playerPos.x + (ax / ad) * MIN;
          this.spring.z = playerPos.z + (az / ad) * MIN;
        }
      }
      pos.x = this.spring.x;
      pos.z = this.spring.z;
      this.vel.set((this.spring.x - before.x) / Math.max(dt, 0.0001), 0, (this.spring.z - before.z) / Math.max(dt, 0.0001));
    }
    const dx = this.target.x - pos.x;
    const dz = this.target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    const speed = Math.hypot(this.vel.x, this.vel.z);

    /* ---------- facing ---------- */
    let wantFace = this.facing;
    const moving = dist > 0.3 && !this.sitting;
    if (this.mode === 'stage' && this.camera){
      /* staged: stay square on to the visitor, even while they orbit */
      wantFace = Math.atan2(this.camera.position.x - pos.x, this.camera.position.z - pos.z);
    } else if (this.mode === 'guide' && this.goalReached && playerPos){
      /* at a door: turn around and face the visitor */
      wantFace = Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z);
    } else if (moving){
      wantFace = Math.atan2(this.vel.x, this.vel.z);
    } else if (playerPos && (this.mode === 'follow' || this.mode === 'guide')){
      wantFace = Math.atan2(playerPos.x - pos.x, playerPos.z - pos.z);
    } else if (dist < 0.6 && nearestPortal && Math.sin(t * 0.55) > 0.35){
      /* idle glance at whatever the visitor should look at */
      wantFace = Math.atan2(nearestPortal.x - pos.x, nearestPortal.z - pos.z);
    }
    /* shortest-angle damped turn: he never spins the long way round */
    this.facing = dampAngle(this.facing, wantFace, 8, dt);
    this.root.rotation.y = this.facing;

    /* ---------- state blend (0.2 s cross-fade, like a mixer) ---------- */
    const stateName = this.sitting ? 'sit'
      : (this.waveT > 0) ? 'wave'
      : (this.pointing && this.goalReached) ? 'point'
      : (this.spinT > 0 || this.hopT > 0) ? 'cheer'
      : moving ? (speed > 6.5 ? 'run' : 'walk')
      : 'idle';
    this.blend.play(stateName);
    const w = this.blend.update(dt);

    /* ---------- gait: sine waves tied to his actual speed ---------- */
    const stride = clamp(speed * 1.6, 3.5, 15);
    const gait = Math.sin(t * stride) * clamp(speed / 4, 0, 1);
    rig.legL.rotation.x = damp(rig.legL.rotation.x, gait * 0.85, 14, dt);
    rig.legR.rotation.x = damp(rig.legR.rotation.x, -gait * 0.85, 14, dt);

    /* ---------- arms: point, tip the cap, wave, or swing ---------- */
    const walkAmt = clamp((w.walk || 0) + (w.run || 0), 0, 1);
    let armLx = -gait * 0.6 * walkAmt + Math.sin(t * 1.6) * 0.08 * (w.idle || 0);
    let armRx = gait * 0.6 * walkAmt - Math.sin(t * 1.6) * 0.08 * (w.idle || 0);
    let armLz = 0, armRz = 0;

    if (this.tipT > 0){            // he reaches up and touches the brim
      this.tipT -= dt;
      const k = Math.sin((1 - this.tipT / 0.9) * Math.PI);
      armRx = -1.9 * k;
      armRz = 0.5 * k;
    } else if (this.waveT > 0){    // goodbye
      this.waveT -= dt;
      armRx = -2.3 + Math.sin(t * 14) * 0.45;
      armRz = 0.35;
    } else if (this.pointing && this.goalReached){
      /* aim the right stub at the next destination */
      const aim = new THREE.Vector3().subVectors(this.pointing, pos);
      const local = Math.atan2(aim.x, aim.z) - this.facing;
      armRx = -1.45 - Math.cos(local) * 0.55;
      armRz = clamp(Math.sin(local) * 0.9, -0.9, 0.9);
      this.state = 'pointing';
    }
    rig.armL.rotation.x = damp(rig.armL.rotation.x, armLx, 12, dt);
    rig.armR.rotation.x = damp(rig.armR.rotation.x, armRx, 12, dt);
    rig.armL.rotation.z = damp(rig.armL.rotation.z, armLz, 12, dt);
    rig.armR.rotation.z = damp(rig.armR.rotation.z, armRz, 12, dt);

    /* ---------- hop ---------- */
    if (this.hopT > 0){
      this.hopT -= dt;
      const k = 1 - Math.max(0, this.hopT) / 0.42;
      rig.rig.position.y = Math.sin(k * Math.PI) * 0.55;
    } else {
      /* landing: remember the moment, then squash */
      if (rig.rig.position.y > 0.001 && this.hopT <= 0) this.landSquash = 0.22;
      rig.rig.position.y = damp(rig.rig.position.y, 0, 10, dt);
    }
    if (this.landSquash > 0){
      this.landSquash -= dt;
      const k = clamp(this.landSquash / 0.22, 0, 1);
      const squash = Math.sin(k * Math.PI) * 0.18;
      rig.rig.scale.set(1 + squash * 0.7, 1 - squash, 1 + squash * 0.7);
    } else {
      rig.rig.scale.x = damp(rig.rig.scale.x, 1, 12, dt);
      rig.rig.scale.y = damp(rig.rig.scale.y, 1, 12, dt);
      rig.rig.scale.z = damp(rig.rig.scale.z, 1, 12, dt);
    }

    /* ---------- curious tilt + joke shake + sitting ---------- */
    if (this.tiltT > 0){
      this.tiltT -= dt;
      const k = Math.sin((1 - this.tiltT / 1.1) * Math.PI);
      rig.rig.rotation.z = 0.16 * k;
      rig.rig.rotation.x = -0.05 * k;
    } else if (this.sitting){
      rig.rig.rotation.z = damp(rig.rig.rotation.z, 0, 10, dt);
      rig.rig.rotation.x = damp(rig.rig.rotation.x, -0.04, 10, dt);
      rig.rig.position.y = damp(rig.rig.position.y, -0.26, 10, dt);
    } else {
      rig.rig.rotation.z = damp(rig.rig.rotation.z, 0, 10, dt);
      rig.rig.rotation.x = damp(rig.rig.rotation.x, 0, 10, dt);
    }
    if (this.shakeT > 0){
      this.shakeT -= dt;
      rig.rig.rotation.y = Math.sin(t * 42) * 0.14 * (this.shakeT / 0.55);
    } else {
      rig.rig.rotation.y = damp(rig.rig.rotation.y, 0, 10, dt);
    }

    /* ---------- spin on an achievement ---------- */
    if (this.spinT > 0){
      this.spinT -= dt;
      this.root.rotation.y += dt * 16;
      /* when the spin ends, snap back to the angle he started from */
      if (this.spinT <= 0 && this.spinFrom !== undefined){
        this.facing = this.spinFrom;
        this.root.rotation.y = this.facing;
      }
    }

    /* ---------- cap flash ---------- */
    if (this.flashT > 0){
      this.flashT -= dt;
      rig.cap.material.color.setHex(CLAUDE.capRed);
      rig.brim.material.color.setHex(CLAUDE.capRed);
      if (this.flashT <= 0){
        rig.cap.material.color.setHex(this.root.userData.baseCapColor);
        rig.brim.material.color.setHex(CLAUDE.brim);
      }
    }

    /* ---------- breathing + blink ---------- */
    rig.body.scale.y = 1 + Math.sin(t * 2.1) * 0.015;
    this.blinkAt -= dt;
    if (this.blinkAt <= 0){
      this.blinkT = 0.14;
      this.blinkAt = rand(2.4, 5.5);
    }
    if (this.blinkT > 0){
      this.blinkT -= dt;
      rig.eyeL.scale.y = 0.12;
      rig.eyeR.scale.y = 0.12;
    } else {
      rig.eyeL.scale.y = 1;
      rig.eyeR.scale.y = 1;
    }

    /* ---------- hint bounce ---------- */
    if (this.bounceT > 0){
      this.bounceT -= dt;
      rig.rig.position.y += Math.abs(Math.sin(t * 9)) * 0.22;
    }

    /* ---------- ground + shadow ---------- */
    if (this.mode !== 'stage') pos.y = 0;
    rig.shadow.scale.setScalar(1 - Math.min(0.4, rig.rig.position.y * 0.4));

    /* ---------- react to the visitor jumping ---------- */
    if (playerPos){
      if (this.wasGrounded && !grounded) this.hop(true);
      this.wasGrounded = grounded;
    }

    /* ---------- keep the glow with him ---------- */
    if (this.glow) this.glow.intensity = (this.mode === 'stage' ? 0.9 : 1.5) + Math.sin(t * 2.2) * 0.25;

    this.root.userData.clickable = true;
  }

  hitTest(raycaster){
    return raycaster.intersectObject(this.root, true).length > 0;
  }

  dispose(scene){
    scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
/** old name so existing imports keep working */
export const Mascot = Claude;

/* ── portrait for the dialogue box (crisp SVG, no image request) ─────────── */
export const CLAUDE_PORTRAIT = `
<svg viewBox="0 0 72 72" role="img" aria-label="Claude" xmlns="http://www.w3.org/2000/svg">
  <rect width="72" height="72" fill="#fffdf7"/>
  <g stroke="#121216" stroke-width="3">
    <rect x="13" y="26" width="46" height="30" fill="#ee8470"/>
    <rect x="11" y="16" width="50" height="10" fill="#2f6fe0"/>
    <rect x="31" y="10" width="24" height="7" fill="#2558b8"/>
    <rect x="21" y="35" width="8" height="9" fill="#121216" stroke="none"/>
    <rect x="43" y="35" width="8" height="9" fill="#121216" stroke="none"/>
    <rect x="8" y="33" width="6" height="13" fill="#c9624d"/>
    <rect x="58" y="33" width="6" height="13" fill="#c9624d"/>
    <rect x="21" y="56" width="8" height="10" fill="#c9624d"/>
    <rect x="43" y="56" width="8" height="10" fill="#c9624d"/>
  </g>
</svg>`;

/* ── confetti burst used by the celebration moments ──────────────────────── */
export function confettiBurst(scene, origin, { count = 120, spread = 4 } = {}){
  const geo = new THREE.BoxGeometry(0.075, 0.075, 0.015);
  const colors = [PALETTE.red, PALETTE.sun, PALETTE.sky, CLAUDE.body, CLAUDE.cap];
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ vertexColors: false }), count);
  const bits = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < count; i++){
    mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    bits.push({
      p: origin.clone().add(new THREE.Vector3(rand(-0.4, 0.4), rand(0, 0.6), rand(-0.4, 0.4))),
      v: new THREE.Vector3(rand(-spread, spread), rand(4, 9), rand(-spread, spread)),
      r: rand(0, 6.28), spin: rand(-6, 6), life: rand(1.6, 2.8),
    });
  }
  mesh.frustumCulled = false;
  scene.add(mesh);

  let alive = 0;
  return {
    mesh,
    update(dt){
      alive += dt;
      bits.forEach((b, i) => {
        b.v.y -= 14 * dt;
        b.p.addScaledVector(b.v, dt);
        b.r += b.spin * dt;
        q.setFromAxisAngle(new THREE.Vector3(0.3, 0.8, 0.5).normalize(), b.r);
        s.setScalar(Math.max(0, 1 - alive / b.life));
        m.compose(b.p, q, s);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (alive > 3){ scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); return false; }
      return true;
    },
  };
}
