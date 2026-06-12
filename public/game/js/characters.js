// Procedurally-built character rigs (no external assets) + pose/animation drivers.
import * as THREE from 'three';

const M = {
  coat:   new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 0.55, metalness: 0.25 }),
  strap:  new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.4, metalness: 0.5 }),
  pauldron: new THREE.MeshStandardMaterial({ color: 0x9a9aa8, roughness: 0.3, metalness: 0.95 }),
  hair:   new THREE.MeshStandardMaterial({ color: 0xdadae6, roughness: 0.42, metalness: 0.55 }),
  skin:   new THREE.MeshStandardMaterial({ color: 0xe6cfc0, roughness: 0.6 }),
  eye:    new THREE.MeshStandardMaterial({ color: 0x102015, emissive: 0x46ff7a, emissiveIntensity: 3.5 }),
  blade:  new THREE.MeshStandardMaterial({ color: 0xe8e8f2, metalness: 1, roughness: 0.12, emissive: 0x404a55, emissiveIntensity: 0.5 }),
  hilt:   new THREE.MeshStandardMaterial({ color: 0x18181e, roughness: 0.4, metalness: 0.7 }),
  feather: new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.8, side: THREE.DoubleSide }),
};

function mesh(geo, mat, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}

/* ================= SEPHIROTH ================= */
export function createSephiroth() {
  const group = new THREE.Group();          // root at feet
  const body = new THREE.Group();           // full-body tilt/roll
  group.add(body);

  /* legs */
  const hips = new THREE.Group(); hips.position.y = 1.0; body.add(hips);
  function leg(side) {
    const thigh = new THREE.Group(); thigh.position.set(0.13 * side, 0, 0); hips.add(thigh);
    mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.5, 8), M.coat, 0, -0.25, 0, thigh);
    const shin = new THREE.Group(); shin.position.y = -0.5; thigh.add(shin);
    mesh(new THREE.CylinderGeometry(0.072, 0.06, 0.42, 8), M.coat, 0, -0.21, 0, shin);
    const boot = mesh(new THREE.BoxGeometry(0.13, 0.1, 0.26), M.strap, 0, -0.45, 0.05, shin);
    boot.castShadow = true;
    return { thigh, shin };
  }
  const L = leg(-1), R = leg(1);

  /* coat skirt */
  const coat = new THREE.Group(); coat.position.y = 0.02; hips.add(coat);
  const skirt = mesh(new THREE.CylinderGeometry(0.24, 0.5, 0.95, 10, 1, true), M.coat, 0, -0.48, 0, coat);
  skirt.material = M.coat;

  /* torso */
  const torso = new THREE.Group(); torso.position.y = 1.0; body.add(torso);
  mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.62, 10), M.coat, 0, 0.33, 0, torso);
  // crossed chest straps
  const s1 = mesh(new THREE.BoxGeometry(0.05, 0.55, 0.26), M.strap, 0, 0.36, 0.0, torso); s1.rotation.z = 0.5;
  const s2 = mesh(new THREE.BoxGeometry(0.05, 0.55, 0.26), M.strap, 0, 0.36, 0.0, torso); s2.rotation.z = -0.5;

  /* head + the iconic silver hair */
  const headG = new THREE.Group(); headG.position.y = 0.76; torso.add(headG);
  mesh(new THREE.SphereGeometry(0.13, 14, 12), M.skin, 0, 0.02, 0, headG);
  mesh(new THREE.SphereGeometry(0.02, 6, 6), M.eye, -0.05, 0.04, 0.115, headG);
  mesh(new THREE.SphereGeometry(0.02, 6, 6), M.eye, 0.05, 0.04, 0.115, headG);
  const hair = new THREE.Group(); headG.add(hair);
  mesh(new THREE.SphereGeometry(0.145, 12, 10), M.hair, 0, 0.05, -0.03, hair);
  // long parted bangs
  for (const sgn of [-1, 1]) {
    const bang = mesh(new THREE.ConeGeometry(0.05, 0.55, 6), M.hair, sgn * 0.1, -0.16, 0.1, hair);
    bang.rotation.set(0.25, 0, sgn * -0.18);
  }
  // flowing back hair: curved tubes down to the knees
  for (let i = 0; i < 5; i++) {
    const off = (i - 2) * 0.05;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(off * 0.6, 0.1, -0.1),
      new THREE.Vector3(off, -0.35, -0.22),
      new THREE.Vector3(off * 1.4, -0.85, -0.16),
      new THREE.Vector3(off * 1.7, -1.3, -0.26),
    ]);
    mesh(new THREE.TubeGeometry(curve, 10, 0.042 - Math.abs(off) * 0.18, 6), M.hair, 0, 0, 0, hair);
  }

  /* arms */
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(0.27 * side, 0.6, 0); torso.add(sh);
    const pad = mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.pauldron, 0, 0.03, 0, sh);
    pad.scale.set(1.25, 1, 1.25);
    mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.42, 8), M.coat, 0, -0.21, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.42; sh.add(el);
    mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.4, 8), M.coat, 0, -0.2, 0, el);
    const hand = new THREE.Group(); hand.position.y = -0.42; el.add(hand);
    mesh(new THREE.SphereGeometry(0.055, 8, 8), M.strap, 0, 0, 0, hand);
    return { sh, el, hand };
  }
  const AL = arm(-1), AR = arm(1);

  /* Masamune — absurdly long nodachi */
  const sword = new THREE.Group();
  AR.hand.add(sword);
  mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.42, 8), M.hilt, 0, -0.18, 0, sword);
  const guard = mesh(new THREE.BoxGeometry(0.14, 0.035, 0.07), M.hilt, 0, 0.04, 0, sword);
  const blade = mesh(new THREE.BoxGeometry(0.035, 3.7, 0.075), M.blade, 0, 1.93, 0, sword);
  blade.castShadow = true;
  const swordBase = new THREE.Object3D(); swordBase.position.y = 0.1; sword.add(swordBase);
  const swordTip = new THREE.Object3D(); swordTip.position.y = 3.8; sword.add(swordTip);
  sword.rotation.set(0.4, 0, -0.15); // resting angle, blade trailing low

  /* the one black wing (right shoulder) */
  const wing = new THREE.Group();
  wing.position.set(0.18, 0.62, -0.16);
  torso.add(wing);
  const feathers = [];
  for (let i = 0; i < 13; i++) {
    const f = mesh(new THREE.PlaneGeometry(0.16, 1.1 + i * 0.12), M.feather, 0, 0, 0, null);
    const pivot = new THREE.Group();
    pivot.add(f);
    f.position.y = (1.1 + i * 0.12) / 2;
    wing.add(pivot);
    feathers.push(pivot);
  }
  wing.scale.setScalar(0.001);
  wing.visible = false;

  return {
    group,
    parts: {
      body, hips, torso, headG, hair, coat,
      legL: L.thigh, legR: R.thigh, shinL: L.shin, shinR: R.shin,
      armL: AL.sh, armR: AR.sh, elL: AL.el, elR: AR.el,
      sword, swordBase, swordTip, blade, wing, feathers,
    },
  };
}

/* piecewise keyframe sampler with smooth easing: keys = [[t, v], ...] */
export function kf(p, keys) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (p <= keys[i + 1][0]) {
      const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
      const u = (p - t0) / (t1 - t0);
      const e = u * u * (3 - 2 * u);
      return v0 + (v1 - v0) * e;
    }
  }
  return keys[keys.length - 1][1];
}

/* drives the Sephiroth rig from a compact state object */
export function animSephiroth(rig, s) {
  const P = rig.parts;
  const cad = s.runT * 9.5;
  const sw = Math.sin(cad) * s.speed;

  P.hips.position.y = 1.0 + Math.abs(Math.cos(cad)) * 0.06 * s.speed;
  P.legL.rotation.x = sw * 0.85;
  P.legR.rotation.x = -sw * 0.85;
  P.shinL.rotation.x = Math.max(0, -sw) * 1.0 + 0.08 * s.speed;
  P.shinR.rotation.x = Math.max(0, sw) * 1.0 + 0.08 * s.speed;

  P.torso.rotation.set(0.04 + s.speed * 0.22 + Math.sin(s.t * 1.7) * 0.015 * (1 - s.speed), 0, 0);
  P.headG.rotation.x = -s.speed * 0.12;
  P.hair.rotation.x = -0.05 - s.speed * 0.3 + Math.sin(s.t * 2.2) * 0.04;
  P.coat.rotation.x = s.speed * 0.4;
  P.body.rotation.set(0, 0, 0);

  P.armL.rotation.set(-sw * 0.55 - 0.12, 0, 0.12);
  P.elL.rotation.x = -0.25 - s.speed * 0.3;
  // right arm rests with sword trailing
  P.armR.rotation.set(0.18, 0, -0.22);
  P.elR.rotation.x = -0.3;
  P.sword.rotation.set(0.4, 0, -0.15);

  if (s.dodgeP !== null) {
    const p = s.dodgeP;
    P.body.rotation.x = Math.sin(p * Math.PI) * 0.7;
    P.coat.rotation.x = 1.0;
    P.hair.rotation.x = -0.8;
  }

  if (s.attack) {
    const { name } = s.attack, p = s.attack.p;
    if (name === 'l1') {
      P.torso.rotation.y = kf(p, [[0, 0], [0.22, 0.65], [0.5, -0.8], [1, 0]]);
      P.armR.rotation.x = kf(p, [[0, 0.18], [0.22, -1.6], [0.5, -1.35], [1, 0.18]]);
      P.armR.rotation.y = kf(p, [[0, 0], [0.22, 0.9], [0.5, -1.2], [1, 0]]);
      P.sword.rotation.x = kf(p, [[0, 0.4], [0.22, 1.5], [0.5, 1.5], [1, 0.4]]);
    } else if (name === 'l2') {
      P.torso.rotation.y = kf(p, [[0, -0.5], [0.2, -0.8], [0.5, 0.8], [1, 0]]);
      P.armR.rotation.x = kf(p, [[0, -1.3], [0.2, -1.7], [0.5, -1.3], [1, 0.18]]);
      P.armR.rotation.y = kf(p, [[0, -0.8], [0.2, -1.2], [0.5, 1.0], [1, 0]]);
      P.sword.rotation.x = 1.5;
    } else if (name === 'l3') {
      P.torso.rotation.x = kf(p, [[0, 0], [0.3, -0.35], [0.55, 0.5], [1, 0.05]]);
      P.armR.rotation.x = kf(p, [[0, 0.18], [0.3, -2.7], [0.55, -0.5], [1, 0.18]]);
      P.armR.rotation.y = 0;
      P.sword.rotation.x = kf(p, [[0, 0.4], [0.3, 0.1], [0.55, 1.2], [1, 0.4]]);
    } else if (name === 'heavy') {
      P.torso.rotation.y = kf(p, [[0, 0], [0.38, 1.4], [0.62, -2.4], [1, 0]]);
      P.armR.rotation.x = kf(p, [[0, 0.18], [0.38, -1.5], [0.62, -1.4], [1, 0.18]]);
      P.armR.rotation.y = kf(p, [[0, 0], [0.38, 1.3], [0.62, -1.5], [1, 0]]);
      P.sword.rotation.x = 1.55;
      P.coat.rotation.x = 0.8;
    } else if (name === 'stab') {
      P.torso.rotation.y = kf(p, [[0, 0.4], [0.35, -0.3], [1, 0]]);
      P.armR.rotation.x = kf(p, [[0, -0.4], [0.3, -1.55], [0.7, -1.55], [1, 0.18]]);
      P.armR.rotation.y = 0;
      P.sword.rotation.x = kf(p, [[0, 0.6], [0.3, 0.02], [0.7, 0.02], [1, 0.4]]);
    } else if (name === 'ult') {
      P.armR.rotation.set(kf(p, [[0, 0.18], [0.3, -2.2], [1, -2.4]]), 0, kf(p, [[0, -0.2], [0.3, -1.0], [1, -1.1]]));
      P.armL.rotation.set(kf(p, [[0, -0.1], [0.3, -2.2], [1, -2.4]]), 0, kf(p, [[0, 0.1], [0.3, 1.0], [1, 1.1]]));
      P.headG.rotation.x = -0.4;
      P.hair.rotation.x = -0.6;
      P.coat.rotation.x = 0.9;
    }
  }

  // wing unfurl (0..1)
  if (s.wingT > 0.001) {
    P.wing.visible = true;
    P.wing.scale.setScalar(Math.max(0.001, s.wingT));
    P.wing.rotation.z = 0.5 - s.wingT * 0.2;
    P.feathers.forEach((f, i) => {
      const spread = s.wingT * (0.25 + i * 0.135);
      f.rotation.z = 0.35 + spread;
      f.rotation.x = -0.25 - i * 0.02 + Math.sin(s.t * 2 + i * 0.4) * 0.05 * s.wingT;
    });
  } else {
    P.wing.visible = false;
  }

  if (s.dead) {
    const p = Math.min(s.deathT / 1.4, 1);
    P.body.rotation.x = -p * Math.PI / 2;
    rig.group.position.y -= 0; // handled by game
  }
}

/* ================= ENEMIES ================= */
const EM = {
  fiend: new THREE.MeshStandardMaterial({ color: 0x16121e, roughness: 0.7, metalness: 0.2 }),
  fiendSpike: new THREE.MeshStandardMaterial({ color: 0x201430, emissive: 0x8040e0, emissiveIntensity: 1.6, roughness: 0.4 }),
  robe: new THREE.MeshStandardMaterial({ color: 0x141019, roughness: 0.85 }),
  guardSkin: new THREE.MeshStandardMaterial({ color: 0x9a8ea6, roughness: 0.55, metalness: 0.3 }),
  vein: new THREE.MeshStandardMaterial({ color: 0x0a2025, emissive: 0x30e0d0, emissiveIntensity: 2.2 }),
};

export function createCreeper(boss = false) {
  const group = new THREE.Group();
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x100808, emissive: boss ? 0xff3030 : 0xb060ff, emissiveIntensity: 2.5,
  });
  const bodyG = new THREE.Group(); bodyG.position.y = 0.62; group.add(bodyG);
  const bod = mesh(new THREE.IcosahedronGeometry(0.55, 1), EM.fiend, 0, 0, 0, bodyG);
  bod.scale.set(0.75, 0.6, 1.15);
  const head = mesh(new THREE.IcosahedronGeometry(0.28, 1), EM.fiend, 0, 0.18, 0.55, bodyG);
  mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat, -0.1, 0.22, 0.78, bodyG);
  mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat, 0.1, 0.22, 0.78, bodyG);
  for (let i = 0; i < 3; i++) {
    const sp = mesh(new THREE.ConeGeometry(0.09, 0.5 + i * 0.12, 6), EM.fiendSpike, 0, 0.3, 0.15 - i * 0.3, bodyG);
    sp.rotation.x = -0.5 - i * 0.15;
  }
  if (boss) for (const sgn of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(0.09, 0.7, 6), EM.fiendSpike, sgn * 0.2, 0.42, 0.62, bodyG);
    horn.rotation.x = -0.9; horn.rotation.z = sgn * -0.4;
  }
  const tail = mesh(new THREE.ConeGeometry(0.12, 0.9, 6), EM.fiend, 0, 0.05, -0.85, bodyG);
  tail.rotation.x = Math.PI / 2 + 0.3;
  const legs = [];
  for (const [lx, lz] of [[-0.4, 0.35], [0.4, 0.35], [-0.4, -0.35], [0.4, -0.35]]) {
    const lg = new THREE.Group(); lg.position.set(lx, 0.55, lz); group.add(lg);
    mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.6, 6), EM.fiend, 0, -0.3, 0, lg);
    legs.push(lg);
  }
  if (boss) group.scale.setScalar(2.6);
  return { group, parts: { bodyG, head, legs, eyeMat, tail } };
}

export function createHunter() {
  const group = new THREE.Group();
  const root = new THREE.Group(); root.position.y = 1.0; group.add(root);
  const robe = mesh(new THREE.ConeGeometry(0.5, 1.7, 9), EM.robe, 0, 0.4, 0, root);
  const hood = mesh(new THREE.SphereGeometry(0.26, 10, 8), EM.robe, 0, 1.25, 0, root);
  hood.scale.set(1, 1.15, 1.05);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x081008, emissive: 0x40ff90, emissiveIntensity: 3 });
  mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat, 0, 1.24, 0.2, root);
  const orb = mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x0a2014, emissive: 0x40ff90, emissiveIntensity: 2.5 }), 0, 0.7, 0.45, root);
  for (const sgn of [-1, 1]) {
    const a = mesh(new THREE.ConeGeometry(0.09, 0.7, 6), EM.robe, sgn * 0.4, 0.85, 0.2, root);
    a.rotation.set(0.9, 0, sgn * -0.7);
  }
  return { group, parts: { root, robe, orb, eyeMat } };
}

export function createGuardian() {
  const group = new THREE.Group();
  const root = new THREE.Group(); group.add(root);
  const robe = mesh(new THREE.ConeGeometry(1.5, 4.2, 10), EM.robe, 0, 2.1, 0, root);
  const torso = mesh(new THREE.CylinderGeometry(0.8, 0.6, 1.6, 10), EM.guardSkin, 0, 4.4, 0, root);
  // glowing jenova veins
  for (let i = 0; i < 6; i++) {
    const v = mesh(new THREE.BoxGeometry(0.06, 1.5, 0.06), EM.vein, Math.cos(i * 1.05) * 0.72, 4.4, Math.sin(i * 1.05) * 0.72, root);
    v.rotation.z = (i % 2 ? 0.18 : -0.14);
  }
  const headG = new THREE.Group(); headG.position.y = 5.6; root.add(headG);
  mesh(new THREE.SphereGeometry(0.42, 12, 10), EM.guardSkin, 0, 0, 0, headG);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x100a14, emissive: 0xe040ff, emissiveIntensity: 4 });
  mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat, -0.16, 0.06, 0.36, headG);
  mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat, 0.16, 0.06, 0.36, headG);
  const halo = mesh(new THREE.TorusGeometry(1.1, 0.05, 8, 32), EM.vein, 0, 5.9, -0.5, root);
  // massive blade arms
  const arms = [];
  for (const sgn of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sgn * 1.1, 5.0, 0); root.add(sh);
    mesh(new THREE.SphereGeometry(0.4, 8, 8), EM.guardSkin, 0, 0, 0, sh);
    const bl = mesh(new THREE.BoxGeometry(0.18, 3.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x303040, metalness: 0.9, roughness: 0.25, emissive: 0x30e0d0, emissiveIntensity: 0.6 }), 0, -1.8, 0, sh);
    bl.geometry.translate(0, 0, 0);
    sh.rotation.z = sgn * 0.5;
    arms.push(sh);
  }
  return { group, parts: { root, robe, torso, headG, halo, arms, eyeMat } };
}

/* quadruped scuttle for creepers / behemoth */
export function animQuad(rig, t, speed, windup) {
  const P = rig.parts;
  P.legs.forEach((lg, i) => {
    const ph = (i % 2 ? 0 : Math.PI) + (i < 2 ? 0 : Math.PI / 2);
    lg.rotation.x = Math.sin(t * 11 + ph) * 0.7 * speed;
  });
  P.bodyG.position.y = 0.62 + Math.abs(Math.sin(t * 11)) * 0.04 * speed;
  P.bodyG.rotation.x = -windup * 0.55;
  P.bodyG.position.y += windup * 0.25;
  P.tail.rotation.z = Math.sin(t * 5) * 0.3;
  P.eyeMat.emissiveIntensity = 2.5 + windup * 6;
}

export function animHunter(rig, t, windup) {
  const P = rig.parts;
  P.root.position.y = 1.0 + Math.sin(t * 2.2) * 0.18;
  P.root.rotation.z = Math.sin(t * 1.6) * 0.06;
  P.orb.scale.setScalar(1 + windup * 1.6);
  P.orb.material.emissiveIntensity = 2.5 + windup * 8;
}

export function animGuardian(rig, t, s) {
  const P = rig.parts;
  P.root.position.y = Math.sin(t * 1.4) * 0.25 + 0.15;
  P.halo.rotation.z = t * 0.8;
  P.headG.rotation.y = Math.sin(t * 0.7) * 0.25;
  const wind = s.windup || 0;
  if (s.anim === 'sweep') {
    const p = s.animP;
    P.root.rotation.y = kf(p, [[0, -0.8], [0.4, -1.2], [0.7, 1.6], [1, 0]]);
    P.arms[1].rotation.z = kf(p, [[0, 0.5], [0.4, 2.2], [0.7, -0.6], [1, 0.5]]);
  } else if (s.anim === 'slam') {
    const p = s.animP;
    P.arms[0].rotation.z = kf(p, [[0, -0.5], [0.45, -2.6], [0.6, -0.2], [1, -0.5]]);
    P.arms[1].rotation.z = kf(p, [[0, 0.5], [0.45, 2.6], [0.6, 0.2], [1, 0.5]]);
    P.root.position.y += kf(p, [[0, 0], [0.45, 1.2], [0.6, -0.2], [1, 0]]);
  } else {
    P.arms[0].rotation.z = -0.5 + Math.sin(t * 1.8) * 0.1 - wind;
    P.arms[1].rotation.z = 0.5 - Math.sin(t * 1.8) * 0.1 + wind;
  }
  P.eyeMat.emissiveIntensity = 4 + wind * 8;
}
