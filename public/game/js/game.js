// THE ONE-WINGED ANGEL — open-world action demo. Main game orchestrator.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { clamp, lerp, angleLerp, rand, dist2d } from './util.js';
import { createWorld, terrainHeight, SITES } from './world.js';
import { createSephiroth, animSephiroth, createCreeper, createHunter, createGuardian, animQuad, animHunter, animGuardian } from './characters.js';
import { Particles, SwordTrail, DamageNumbers } from './fx.js';
import { SFX } from './audio.js';

/* ================= DOM ================= */
const $ = (id) => document.getElementById(id);
const ui = {
  loading: $('loading'), hud: $('hud'), title: $('title'), pause: $('pause'), death: $('death'), win: $('win'),
  hpFill: $('hpFill'), stFill: $('stFill'), spFill: $('spFill'), spBar: $('spBar'),
  lvl: $('lvl'), xpT: $('xpT'), obj: $('obj'), objDist: $('objDist'),
  combo: $('combo'), comboN: $('comboN'), killN: $('killN'),
  boss: $('boss'), bossName: $('bossName'), bossFill: $('bossFill'),
  lock: $('lock'), msg: $('msg'), hint: $('hint'), dmgFx: $('dmgFx'), ultFx: $('ultFx'),
  winStats: $('winStats'),
};

/* ================= renderer / scene ================= */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 2000);

const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.45, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

/* ================= world & actors ================= */
const world = createWorld(scene);
const particles = new Particles(scene);
const trail = new SwordTrail(scene);
const numbers = new DamageNumbers($('dmgLayer'));

const rig = createSephiroth();
scene.add(rig.group);

/* ================= state ================= */
const player = {
  pos: new THREE.Vector3(0, terrainHeight(0, 30), 30),
  vel: new THREE.Vector3(),
  yaw: Math.PI,
  hp: 100, maxHp: 100, st: 100, maxSt: 100, sp: 0,
  lvl: 1, xp: 0, xpNext: 60,
  dmgMul: 1,
  atk: null, queued: null,
  dodge: null, iframes: 0, stDelay: 0,
  octa: null, ult: null, wingT: 0, permaWing: false,
  combo: 0, comboT: 0,
  dead: false, deathT: 0,
  runT: 0, speedSm: 0, stepT: 0,
  lock: null,
};
let camYaw = 0, camPitch = 0.3;
let shake = 0, hitStop = 0, gameTime = 0, realTime = 0;
let started = false, paused = false, won = false;
let kills = 0, deaths = 0;
let hintCooldown = 0;

const enemies = [];
const projectiles = [];
let scoutPack = [];
let behemoth = null, guardian = null;
let ambientT = 0;

/* ================= input ================= */
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyQ') toggleLock();
  if (e.code === 'Digit1') tryOctaslash();
  if (e.code === 'Digit2') tryUlt();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('mousedown', (e) => {
  if (!started || paused || player.dead || won) return;
  if (e.button === 0) queueAttack('light');
  if (e.button === 2) queueAttack('heavy');
});
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  camYaw -= e.movementX * 0.0026;
  camPitch = clamp(camPitch + e.movementY * 0.0022, -0.45, 1.15);
});

function lockPointer() { renderer.domElement.requestPointerLock(); }
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (started && !locked && !player.dead && !won) {
    paused = true;
    ui.pause.classList.remove('hidden');
  } else if (locked) {
    paused = false;
    ui.pause.classList.add('hidden');
  }
});

$('btnStart').addEventListener('click', () => {
  SFX.init();
  started = true;
  ui.title.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  lockPointer();
  showMsg('THE PLANET TREMBLES', 2.6);
});
$('btnResume').addEventListener('click', lockPointer);
$('btnRetry').addEventListener('click', respawn);
$('btnAgain').addEventListener('click', () => location.reload());

/* ================= helpers ================= */
let msgTimer = null;
function showMsg(text, dur = 2.4) {
  ui.msg.textContent = text;
  ui.msg.style.opacity = '1';
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { ui.msg.style.opacity = '0'; }, dur * 1000);
}
function showHint(text) {
  ui.hint.textContent = text;
  ui.hint.style.opacity = '1';
  hintCooldown = 0.3;
}

const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();

function collideWorld(p, r) {
  for (const c of world.colliders) {
    if (c.r <= 0) continue;
    const dx = p.x - c.x, dz = p.z - c.z;
    const d = Math.hypot(dx, dz), min = c.r + r;
    if (d < min && d > 0.0001) {
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }
  const dc = Math.hypot(p.x, p.z);
  if (dc > 372) { p.x *= 372 / dc; p.z *= 372 / dc; }
}

/* ================= enemy spawning ================= */
function makeHpBar() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.13), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 0.09), new THREE.MeshBasicMaterial({ color: 0xe84040, depthWrite: false, fog: false }));
  fg.position.z = 0.002;
  g.add(bg, fg);
  g.visible = false;
  scene.add(g);
  return { g, fg };
}

function spawnEnemy(kind, x, z, opts = {}) {
  let rigE, hp, dmg, speed, range, height;
  if (kind === 'creeper') { rigE = createCreeper(false); hp = 42; dmg = 12; speed = 5.4; range = 2.3; height = 1.7; }
  else if (kind === 'hunter') { rigE = createHunter(); hp = 34; dmg = 13; speed = 4.2; range = 26; height = 2.6; }
  else if (kind === 'behemoth') { rigE = createCreeper(true); hp = 420; dmg = 24; speed = 4.6; range = 4.6; height = 4.2; }
  else { rigE = createGuardian(); hp = 760; dmg = 26; speed = 3.6; range = 5.2; height = 7; }
  const y = terrainHeight(x, z);
  rigE.group.position.set(x, y, z);
  scene.add(rigE.group);
  const e = {
    kind, rig: rigE, pos: new THREE.Vector3(x, y, z), yaw: rand(6.28),
    hp, maxHp: hp, dmg, speed, range, height,
    state: opts.guard ? 'guard' : 'idle', stT: rand(2),
    windup: 0, atkCd: 0, kb: new THREE.Vector3(),
    dead: false, deathT: 0, hpBar: makeHpBar(),
    boss: kind === 'behemoth' || kind === 'guardian',
    xp: kind === 'creeper' ? 22 : kind === 'hunter' ? 30 : kind === 'behemoth' ? 160 : 400,
    ambient: !!opts.ambient, pack: opts.pack || null,
    anim: null, animP: 0, aoeMark: null,
  };
  if (e.boss) e.hpBar.g.visible = false;
  particles.spawn({ pos: e.pos.clone().setY(y + 1), count: 26, color: 0x8040e0, color2: 0x301060, speed: 5, size: 1.6, life: 0.8, gravity: 1 });
  enemies.push(e);
  return e;
}

function spawnScouts() {
  scoutPack = [];
  const cx = 22, cz = -8;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    scoutPack.push(spawnEnemy('creeper', cx + Math.cos(a) * 6, cz + Math.sin(a) * 6, { pack: 'scout' }));
  }
}

/* ================= combat ================= */
const ATTACKS = {
  l1: { name: 'l1', dur: 0.42, as: 0.13, ae: 0.27, range: 3.6, arc: 1.6, dmg: [13, 18], kb: 3, st: 7, next: 'l2' },
  l2: { name: 'l2', dur: 0.46, as: 0.1, ae: 0.26, range: 3.6, arc: 1.7, dmg: [15, 20], kb: 3, st: 7, next: 'l3' },
  l3: { name: 'l3', dur: 0.64, as: 0.22, ae: 0.36, range: 3.9, arc: 1.5, dmg: [25, 34], kb: 9, st: 9, crit: 0.35 },
  heavy: { name: 'heavy', dur: 0.88, as: 0.4, ae: 0.58, range: 4.1, arc: 2.4, dmg: [35, 47], kb: 12, st: 16, crit: 0.25 },
};

function queueAttack(type) {
  if (player.dodge || player.octa || player.ult) return;
  if (!player.atk) {
    startAttack(type === 'heavy' ? ATTACKS.heavy : ATTACKS.l1);
  } else if (player.atk.t > player.atk.def.as) {
    player.queued = type;
  }
}

function startAttack(def) {
  if (player.st < def.st) return;
  player.st -= def.st;
  player.stDelay = 0.7;
  player.atk = { def, t: 0, hitDone: false };
  player.queued = null;
  // face lock target or camera forward
  if (player.lock && !player.lock.dead) {
    player.yaw = Math.atan2(player.lock.pos.x - player.pos.x, player.lock.pos.z - player.pos.z);
  } else {
    player.yaw = camYaw + Math.PI;
  }
  SFX.swing(def.name === 'heavy' ? 0.7 : 1 + Math.random() * 0.2);
}

function attackSweep(def) {
  const fx2 = Math.sin(player.yaw), fz = Math.cos(player.yaw);
  let any = false;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    const reach = def.range + (e.boss ? 1.6 : 0);
    if (d > reach) continue;
    const ang = Math.acos(clamp((dx * fx2 + dz * fz) / (d || 0.001), -1, 1));
    if (ang > def.arc / 2) continue;
    const isCrit = Math.random() < (def.crit || 0.08);
    const dmg = Math.round(rand(def.dmg[0], def.dmg[1]) * player.dmgMul * (isCrit ? 1.8 : 1));
    hurtEnemy(e, dmg, isCrit, def.kb, fx2, fz);
    any = true;
  }
  strikeInteractables(def, fx2, fz);
  if (any) {
    hitStop = 0.07;
    shake = Math.min(shake + (def.name === 'heavy' ? 0.5 : 0.28), 0.8);
  }
}

function hurtEnemy(e, dmg, crit, kb, fx2, fz) {
  e.hp -= dmg;
  e.kb.x += fx2 * kb * 0.8; e.kb.z += fz * kb * 0.8;
  player.combo++; player.comboT = 2.2;
  player.sp = Math.min(100, player.sp + (crit ? 7 : 4));
  V.copy(e.pos); V.y += e.height * 0.6;
  particles.spawn({ pos: V, count: crit ? 18 : 10, color: 0xffd080, color2: 0xff5020, speed: 7, size: 1.1, life: 0.4, gravity: -2 });
  numbers.show(V, String(dmg), crit ? 'crit' : '');
  SFX.hit(crit);
  if (e.hp <= 0 && !e.dead) killEnemy(e);
}

function killEnemy(e) {
  e.dead = true; e.deathT = 0;
  e.hpBar.g.visible = false;
  kills++; ui.killN.textContent = kills;
  gainXp(e.xp);
  V.copy(e.pos); V.y += e.height * 0.5;
  particles.spawn({ pos: V, count: 40, color: 0x7cfc9a, color2: 0x107040, speed: 6, size: 1.5, life: 1.1, gravity: 2, drag: 1 }); // lifestream release
  if (e === behemoth || e === guardian) {
    SFX.boom(true);
    shake = 1;
    ui.boss.classList.add('hidden');
  }
}

function gainXp(amount) {
  player.xp += amount;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.lvl++;
    player.xpNext = Math.round(60 * Math.pow(player.lvl, 1.4));
    player.maxHp += 20;
    player.hp = player.maxHp;
    player.dmgMul = 1 + (player.lvl - 1) * 0.13;
    SFX.levelup();
    showMsg('LEVEL ' + player.lvl, 1.8);
    particles.spawn({ pos: player.pos.clone().add(V.set(0, 1, 0)), count: 40, color: 0xf0c050, color2: 0xe8a020, speed: 4, up: 5, size: 1.4, life: 1, gravity: -1 });
  }
}

function damagePlayer(dmg, srcX, srcZ) {
  if (player.iframes > 0 || player.dead || player.ult || won) return;
  player.hp -= dmg;
  player.iframes = 0.35;
  shake = Math.min(shake + 0.6, 1);
  ui.dmgFx.style.opacity = '0.9';
  setTimeout(() => { ui.dmgFx.style.opacity = '0'; }, 120);
  SFX.hurt();
  const dx = player.pos.x - srcX, dz = player.pos.z - srcZ;
  const d = Math.hypot(dx, dz) || 1;
  player.vel.x += (dx / d) * 8; player.vel.z += (dz / d) * 8;
  numbers.show(player.pos.clone().add(V.set(0, 2, 0)), String(dmg), 'hurt');
  if (player.hp <= 0) {
    player.hp = 0; player.dead = true; player.deathT = 0;
    deaths++;
    SFX.death();
    document.exitPointerLock();
    setTimeout(() => ui.death.classList.remove('hidden'), 1100);
  }
}

function respawn() {
  ui.death.classList.add('hidden');
  player.dead = false;
  player.hp = player.maxHp; player.st = player.maxSt;
  player.pos.set(0, terrainHeight(0, 30), 30);
  player.vel.set(0, 0, 0);
  player.atk = null; player.octa = null; player.ult = null;
  player.lock = null;
  // clear regular enemies, reset bosses
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.boss) { scene.remove(e.rig.group); scene.remove(e.hpBar.g); enemies.splice(i, 1); }
    else if (!e.dead) { e.hp = e.maxHp; e.state = 'guard'; e.pos.set(SITES.arena.x, terrainHeight(SITES.arena.x, SITES.arena.z), SITES.arena.z); }
  }
  ui.boss.classList.add('hidden');
  if (objIdx === 0) spawnScouts();
  lockPointer();
}

/* ---- octaslash ---- */
function tryOctaslash() {
  if (!started || paused || player.dead || player.sp < 35 || player.octa || player.ult || won) return;
  let best = null, bd = 17;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = player.pos.distanceTo(e.pos);
    if (d < bd) { bd = d; best = e; }
  }
  player.sp -= 35;
  player.octa = { t: 0, hitIdx: 0, target: best };
  player.atk = null; player.queued = null;
  player.iframes = 1.4;
  SFX.octa();
  showMsg('OCTASLASH', 1);
}

function updateOctaslash(dt) {
  const o = player.octa;
  o.t += dt;
  const idx = Math.floor(o.t / 0.13);
  if (idx > o.hitIdx && o.hitIdx < 8) {
    o.hitIdx = idx;
    const tgt = o.target && !o.target.dead ? o.target : null;
    if (tgt) {
      const a = rand(6.28);
      player.pos.x = tgt.pos.x + Math.cos(a) * 2.2;
      player.pos.z = tgt.pos.z + Math.sin(a) * 2.2;
      player.yaw = Math.atan2(tgt.pos.x - player.pos.x, tgt.pos.z - player.pos.z);
      const dmg = Math.round(rand(10, 14) * player.dmgMul);
      hurtEnemy(tgt, dmg, o.hitIdx === 8, o.hitIdx === 8 ? 14 : 1, Math.sin(player.yaw), Math.cos(player.yaw));
    } else {
      player.pos.x += Math.sin(player.yaw) * 3;
      player.pos.z += Math.cos(player.yaw) * 3;
    }
    shake = 0.35;
  }
  if (o.t > 8 * 0.13 + 0.25) player.octa = null;
}

/* ---- supernova ---- */
function tryUlt() {
  if (!started || paused || player.dead || player.sp < 100 || player.ult || player.octa || won) return;
  player.sp = 0;
  player.ult = { t: 0, spawnT: 0, meteors: [] };
  player.iframes = 99;
  ui.ultFx.style.opacity = '1';
  showMsg('SUPERNOVA', 2);
  SFX.boom(true);
}

function updateUlt(dt) {
  const u = player.ult;
  u.t += dt;
  player.wingT = Math.min(1, player.wingT + dt * 1.6);
  if (u.t > 1.0 && u.t < 4.2) {
    u.spawnT -= dt;
    if (u.spawnT <= 0) {
      u.spawnT = 0.24;
      const a = rand(6.28), r = rand(3, 13);
      const tx = player.pos.x + Math.cos(a) * r, tz = player.pos.z + Math.sin(a) * r;
      const ty = terrainHeight(tx, tz);
      u.meteors.push({
        pos: new THREE.Vector3(tx + rand(-8, 8), ty + 38, tz + rand(-8, 8)),
        tgt: new THREE.Vector3(tx, ty, tz), speed: rand(42, 55),
      });
    }
  }
  for (let i = u.meteors.length - 1; i >= 0; i--) {
    const m = u.meteors[i];
    V.copy(m.tgt).sub(m.pos).normalize();
    m.pos.addScaledVector(V, m.speed * dt);
    particles.spawn({ pos: m.pos, count: 3, color: 0xffa040, color2: 0xff3000, speed: 1.5, size: 1.8, life: 0.4, gravity: 0, drag: 0 });
    if (m.pos.y <= m.tgt.y + 1) {
      particles.spawn({ pos: m.tgt, count: 45, color: 0xffc060, color2: 0xff3000, speed: 11, up: 6, size: 2.2, life: 0.8, gravity: -4 });
      SFX.boom(false);
      shake = Math.min(shake + 0.5, 1.2);
      for (const e of enemies) {
        if (e.dead) continue;
        if (dist2d(e.pos.x, e.pos.z, m.tgt.x, m.tgt.z) < 7) {
          hurtEnemy(e, Math.round(rand(48, 62) * player.dmgMul), true, 10,
            (e.pos.x - m.tgt.x) / 7, (e.pos.z - m.tgt.z) / 7);
        }
      }
      u.meteors.splice(i, 1);
    }
  }
  if (u.t > 5.2 && u.meteors.length === 0) {
    player.ult = null;
    player.iframes = 0.5;
    ui.ultFx.style.opacity = '0';
  }
}

/* ================= lock-on ================= */
function toggleLock() {
  if (player.lock) { player.lock = null; return; }
  let best = null, bd = 32;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = player.pos.distanceTo(e.pos);
    if (d < bd) { bd = d; best = e; }
  }
  player.lock = best;
}

/* ================= puzzles & objectives ================= */
let objIdx = -1;
const CRYSTAL_SEQ = [2, 0, 3, 1];
let demoT = 0, demoIdx = 0, inputIdx = 0, crystalsSolved = false;
let bellTimer = -1, bellsSolved = false;
let braziersLit = 0;

const OBJ_DEFS = [
  { text: 'Slay the shadows prowling the eastern hollow', beacon: [22, -8] },
  { text: 'Strike the four Mako crystals in the order they sing', beacon: [0, 30] },
  { text: 'Pass the gate — enter the Forgotten Sanctum', beacon: [0, -180] },
  { text: 'Ring the three bells of the Cetra within 6 seconds', beacon: [0, -198] },
  { text: 'Slay the Behemoth in the arena of monoliths', beacon: [SITES.arena.x, SITES.arena.z] },
  { text: 'Ignite the four ceremonial braziers', beacon: [SITES.arena.x, SITES.arena.z] },
  { text: 'Destroy the Guardian of the Calamity', beacon: [SITES.arena.x, SITES.arena.z] },
];

function advanceObjective() {
  objIdx++;
  const def = OBJ_DEFS[objIdx];
  if (!def) return;
  ui.obj.textContent = def.text;
  if (def.beacon) world.setBeacon(def.beacon[0], def.beacon[1]);
  if (objIdx > 0) SFX.chime();
  if (objIdx === 2) {
    spawnEnemy('hunter', -8, -165); spawnEnemy('hunter', 8, -172);
    spawnEnemy('creeper', 0, -160); spawnEnemy('creeper', -5, -175);
  }
  if (objIdx === 4) {
    behemoth = spawnEnemy('behemoth', SITES.arena.x, SITES.arena.z, { guard: true });
    showMsg('A ROAR SHAKES THE MONOLITHS', 2.6);
  }
  if (objIdx === 6) {
    guardian = spawnEnemy('guardian', SITES.arena.x, SITES.arena.z, { guard: true });
    player.permaWing = true;
    showMsg('THE CALAMITY DESCENDS', 3);
    shake = 1;
    SFX.boom(true);
  }
}

function strikeInteractables(def, fx2, fz) {
  const tryStrike = (pos, cb) => {
    const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > def.range + 1.2) return;
    const ang = Math.acos(clamp((dx * fx2 + dz * fz) / (d || 0.001), -1, 1));
    if (ang < def.arc / 2 + 0.4) cb();
  };
  if (objIdx === 1 && !crystalsSolved) {
    for (const c of world.crystals) tryStrike(c.pos, () => strikeCrystal(c));
  }
  if (objIdx === 3 && !bellsSolved) {
    for (const b of world.bells) tryStrike(b.pos, () => strikeBell(b));
  }
  if (objIdx === 5) {
    for (const br of world.braziers) tryStrike(br.pos, () => strikeBrazier(br));
  }
}

function strikeCrystal(c) {
  if (c.lit) return;
  if (c.idx === CRYSTAL_SEQ[inputIdx]) {
    c.lit = true; inputIdx++;
    SFX.crystal(inputIdx, true);
    particles.spawn({ pos: c.pos, count: 22, color: 0x7cfc9a, color2: 0x20a060, speed: 4, size: 1.4, life: 0.8, gravity: -1 });
    if (inputIdx >= 4) {
      crystalsSolved = true;
      world.gate.opening = true;
      world.gate.rune.material.opacity = 0.8;
      showMsg('THE GATE YIELDS', 2.4);
      SFX.chime();
      advanceObjective();
    }
  } else {
    SFX.crystal(0, false);
    inputIdx = 0;
    for (const cc of world.crystals) cc.lit = false;
    showMsg('THE CRYSTALS FALL SILENT', 1.6);
  }
}

function strikeBell(b) {
  b.swing = 1;
  SFX.bell();
  if (b.rung) return;
  b.rung = true;
  if (bellTimer < 0) bellTimer = 6;
  if (world.bells.every((x) => x.rung)) {
    bellsSolved = true; bellTimer = -1;
    showMsg('THE SEAL BREAKS', 2.4);
    advanceObjective();
  }
}

function strikeBrazier(br) {
  if (br.lit || objIdx !== 5) return;
  br.lit = true;
  braziersLit++;
  SFX.ignite();
  showMsg(braziersLit < 4 ? `${braziersLit} / 4 BRAZIERS BURN` : 'THE RITE IS COMPLETE', 1.8);
  if (braziersLit >= 4) advanceObjective();
}

function updateObjectives(dt) {
  if (objIdx === 0 && scoutPack.length && scoutPack.every((e) => e.dead)) {
    showMsg('THE CRYSTALS SING', 2.4);
    advanceObjective();
  }
  if (objIdx === 1) {
    demoT += dt;
    if (demoT > 0.85) {
      demoT = 0;
      const c = world.crystals[CRYSTAL_SEQ[demoIdx]];
      if (!c.lit) {
        c.pulse = 1;
        if (player.pos.distanceTo(c.pos) < 45) SFX.crystal(CRYSTAL_SEQ[demoIdx], true);
      }
      demoIdx = (demoIdx + 1) % 4;
    }
    if (dist2d(player.pos.x, player.pos.z, 0, 30) < 28) showHint('STRIKE THE CRYSTALS IN THE ORDER THEY SING');
  }
  if (objIdx === 2 && player.pos.z < -150) {
    showMsg('THE FORGOTTEN SANCTUM', 2.6);
    advanceObjective();
  }
  if (objIdx === 3) {
    if (bellTimer > 0) {
      bellTimer -= dt;
      if (bellTimer <= 0 && !bellsSolved) {
        bellTimer = -1;
        for (const b of world.bells) b.rung = false;
        showMsg('THE ECHO FADES…', 1.8);
      }
    }
    if (dist2d(player.pos.x, player.pos.z, 0, -198) < 26) showHint('RING ALL THREE BELLS WITHIN 6 SECONDS');
  }
  if (objIdx === 4 && behemoth && behemoth.dead) {
    showMsg('THE BEAST FALLS', 2.4);
    advanceObjective();
  }
  if (objIdx === 5 && dist2d(player.pos.x, player.pos.z, SITES.arena.x, SITES.arena.z) < 40) {
    showHint('STRIKE THE BRAZIERS TO IGNITE THEM');
  }
  if (objIdx === 6 && guardian && guardian.dead && !won) {
    won = true;
    world.hideBeacon();
    document.exitPointerLock();
    const mins = Math.floor(gameTime / 60), secs = Math.floor(gameTime % 60);
    ui.winStats.textContent = `${kills} fiends slain — level ${player.lvl} — ${deaths} deaths — ${mins}m ${String(secs).padStart(2, '0')}s`;
    setTimeout(() => ui.win.classList.remove('hidden'), 1500);
  }
  // crystal glow states
  for (const c of world.crystals) {
    c.pulse = Math.max(0, (c.pulse || 0) - dt * 2.2);
    c.mat.emissiveIntensity = (c.lit ? 3.2 : 0.45) + (c.pulse || 0) * 3.5;
    c.mesh.rotation.y += dt * (c.lit ? 2 : 0.4);
    c.mesh.position.y = c.baseY + Math.sin(gameTime * 1.5 + c.idx) * 0.1;
  }
  // brazier flames
  for (const br of world.braziers) {
    if (br.lit && Math.random() < 0.7) {
      particles.spawn({ pos: br.pos, count: 2, color: 0xffb050, color2: 0xff4000, speed: 0.6, up: 2.4, size: 1.5, life: 0.7, gravity: 0, drag: 0.4, posSpread: 0.35 });
    }
  }
}

/* ================= enemies update ================= */
function updateEnemy(e, dt) {
  if (e.dead) {
    e.deathT += dt;
    e.rig.group.position.y = e.pos.y - e.deathT * 1.2;
    e.rig.group.scale.multiplyScalar(Math.max(0.0001, 1 - dt * 1.2));
    if (e.deathT > 1.3) {
      scene.remove(e.rig.group); scene.remove(e.hpBar.g);
      enemies.splice(enemies.indexOf(e), 1);
    }
    return;
  }
  const dx = player.pos.x - e.pos.x, dz = player.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  e.atkCd = Math.max(0, e.atkCd - dt);

  // knockback decay
  e.pos.x += e.kb.x * dt * 6; e.pos.z += e.kb.z * dt * 6;
  e.kb.multiplyScalar(Math.max(0, 1 - dt * 7));

  let moveSpeed = 0;
  const face = () => { e.yaw = angleLerp(e.yaw, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt)); };

  if (e.state === 'guard') {
    if (d < (e.kind === 'guardian' ? 50 : 42)) {
      e.state = 'chase';
      if (e.boss) {
        ui.boss.classList.remove('hidden');
        ui.bossName.textContent = e.kind === 'behemoth' ? 'BEHEMOTH OF THE MONOLITHS' : 'GUARDIAN OF THE CALAMITY';
      }
    }
  } else if (e.state === 'idle') {
    e.stT += dt;
    if (e.stT > 2.5) { e.stT = 0; e.wanderA = rand(6.28); }
    if (e.wanderA !== undefined) {
      e.pos.x += Math.sin(e.wanderA) * dt * 1.2;
      e.pos.z += Math.cos(e.wanderA) * dt * 1.2;
      e.yaw = angleLerp(e.yaw, e.wanderA, dt * 3);
      moveSpeed = 0.25;
    }
    if (d < 30 && !player.dead) e.state = 'chase';
  } else if (e.state === 'chase') {
    face();
    if (player.dead) { e.state = 'idle'; }
    else if (e.kind === 'hunter') {
      // skirmish at range, cast bolts
      if (d > 20) { e.pos.x += (dx / d) * e.speed * dt; e.pos.z += (dz / d) * e.speed * dt; moveSpeed = 1; }
      else if (d < 11) { e.pos.x -= (dx / d) * e.speed * dt; e.pos.z -= (dz / d) * e.speed * dt; moveSpeed = 1; }
      if (e.atkCd <= 0 && d < 30) { e.state = 'windup'; e.windup = 0; }
    } else if (d > e.range) {
      e.pos.x += (dx / d) * e.speed * dt;
      e.pos.z += (dz / d) * e.speed * dt;
      moveSpeed = 1;
      if (e.kind === 'guardian' && e.atkCd <= 0 && d < 16 && d > e.range) {
        // ranged slam on distant player
        e.state = 'aoe'; e.windup = 0;
        e.aoeTarget = player.pos.clone();
      }
    } else if (e.atkCd <= 0) {
      e.state = 'windup'; e.windup = 0;
    }
  } else if (e.state === 'windup') {
    face();
    e.windup += dt / (e.boss ? 0.7 : 0.55);
    if (e.windup >= 1) {
      e.state = 'strike'; e.stT = 0;
      if (e.kind === 'hunter') {
        // fire bolt
        V.set(player.pos.x - e.pos.x, (player.pos.y + 1.2) - (e.pos.y + 1.8), player.pos.z - e.pos.z).normalize();
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x103015, emissive: 0x40ff90, emissiveIntensity: 4 }));
        mesh.position.set(e.pos.x, e.pos.y + 1.8, e.pos.z);
        scene.add(mesh);
        projectiles.push({ mesh, vel: V.clone().multiplyScalar(15), life: 4, dmg: e.dmg });
        e.state = 'chase'; e.atkCd = 2.6 + rand(1);
      }
    }
  } else if (e.state === 'strike') {
    // lunge
    e.pos.x += Math.sin(e.yaw) * dt * 10;
    e.pos.z += Math.cos(e.yaw) * dt * 10;
    if (e.stT === 0) {
      const reach = e.range + 1.3;
      if (d < reach) {
        if (e.kind === 'behemoth' || e.kind === 'guardian') {
          // AoE shock around self
          particles.spawn({ pos: e.pos.clone().setY(e.pos.y + 0.5), count: 30, color: e.kind === 'guardian' ? 0x30e0d0 : 0xff6030, color2: 0x802010, speed: 9, size: 1.6, life: 0.5, gravity: -3 });
          SFX.boom(false);
        }
        damagePlayer(Math.round(e.dmg * rand(0.85, 1.15)), e.pos.x, e.pos.z);
      }
      e.stT = 0.001;
    }
    if (e.stT >= 0) { e.state = 'recover'; e.stT = 0.5; e.atkCd = e.boss ? 1.6 : 1.3 + rand(0.8); }
  } else if (e.state === 'recover') {
    e.stT -= dt;
    if (e.stT <= 0) e.state = 'chase';
  } else if (e.state === 'aoe') {
    // guardian targeted ground slam
    face();
    e.windup += dt;
    if (!e.aoeMark) {
      e.aoeMark = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.4, 32),
        new THREE.MeshBasicMaterial({ color: 0xe040ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      e.aoeMark.rotation.x = -Math.PI / 2;
      e.aoeMark.position.copy(e.aoeTarget).setY(terrainHeight(e.aoeTarget.x, e.aoeTarget.z) + 0.15);
      scene.add(e.aoeMark);
    }
    e.aoeMark.scale.setScalar(1 - e.windup * 0.5);
    if (e.windup >= 1) {
      particles.spawn({ pos: e.aoeMark.position, count: 50, color: 0xe040ff, color2: 0x501080, speed: 10, up: 5, size: 1.8, life: 0.7, gravity: -4 });
      SFX.boom(true);
      shake = Math.min(shake + 0.4, 1);
      if (dist2d(player.pos.x, player.pos.z, e.aoeTarget.x, e.aoeTarget.z) < 4.6) {
        damagePlayer(Math.round(e.dmg * 1.3), e.aoeTarget.x + 0.1, e.aoeTarget.z);
      }
      scene.remove(e.aoeMark); e.aoeMark = null;
      e.state = 'recover'; e.stT = 0.7; e.atkCd = 2.2;
    }
  }

  // separation
  for (const o of enemies) {
    if (o === e || o.dead) continue;
    const sx = e.pos.x - o.pos.x, sz = e.pos.z - o.pos.z;
    const sd = Math.hypot(sx, sz), min = e.boss || o.boss ? 3 : 1.4;
    if (sd < min && sd > 0.001) {
      e.pos.x += (sx / sd) * (min - sd) * 0.5;
      e.pos.z += (sz / sd) * (min - sd) * 0.5;
    }
  }
  collideWorld(e.pos, 0.6);
  e.pos.y = terrainHeight(e.pos.x, e.pos.z);

  // rage phase for guardian
  const enraged = e.kind === 'guardian' && e.hp < e.maxHp * 0.5;
  if (enraged) e.speed = 5;

  // drive rig
  e.rig.group.position.copy(e.pos);
  e.rig.group.rotation.y = e.yaw;
  const wind = e.state === 'windup' ? Math.min(e.windup, 1) : 0;
  if (e.kind === 'creeper' || e.kind === 'behemoth') animQuad(e.rig, gameTime + e.pos.x, moveSpeed, wind);
  else if (e.kind === 'hunter') animHunter(e.rig, gameTime + e.pos.x, wind);
  else animGuardian(e.rig, gameTime, { windup: wind, anim: null, animP: 0 });

  // hp bar
  if (!e.boss) {
    const hb = e.hpBar;
    hb.g.visible = e.hp < e.maxHp && d < 40;
    if (hb.g.visible) {
      hb.g.position.set(e.pos.x, e.pos.y + e.height + 0.5, e.pos.z);
      hb.g.lookAt(camera.position);
      hb.fg.scale.x = Math.max(0.001, e.hp / e.maxHp);
      hb.fg.position.x = -(1 - hb.fg.scale.x) * 0.63;
    }
  } else if (!ui.boss.classList.contains('hidden') && (e === behemoth || e === guardian)) {
    ui.bossFill.style.transform = `scaleX(${Math.max(0, e.hp / e.maxHp)})`;
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    particles.spawn({ pos: p.mesh.position, count: 1, color: 0x40ff90, speed: 0.3, size: 0.9, life: 0.25, gravity: 0, drag: 0 });
    const hitGround = p.mesh.position.y < terrainHeight(p.mesh.position.x, p.mesh.position.z);
    const dp = p.mesh.position.distanceTo(V.copy(player.pos).setY(player.pos.y + 1.1));
    if (dp < 0.9 && player.iframes <= 0) {
      damagePlayer(p.dmg, p.mesh.position.x, p.mesh.position.z);
      p.life = 0;
    }
    if (p.life <= 0 || hitGround) {
      particles.spawn({ pos: p.mesh.position, count: 10, color: 0x40ff90, color2: 0x107040, speed: 4, size: 1, life: 0.4 });
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
    }
  }
}

function updateAmbientSpawns(dt) {
  if (objIdx < 1 || won) return;
  ambientT -= dt;
  if (ambientT > 0) return;
  ambientT = 9;
  const ambientAlive = enemies.filter((e) => e.ambient && !e.dead).length;
  if (ambientAlive >= 4) return;
  const a = rand(6.28), r = rand(55, 90);
  const x = player.pos.x + Math.cos(a) * r, z = player.pos.z + Math.sin(a) * r;
  if (Math.hypot(x, z) > 350) return;
  if (dist2d(x, z, SITES.arena.x, SITES.arena.z) < 55) return;
  spawnEnemy(Math.random() < 0.65 ? 'creeper' : 'hunter', x, z, { ambient: true });
}

/* ================= player update ================= */
function updatePlayer(dt) {
  if (player.dead) {
    player.deathT += dt;
    animSephiroth(rig, { t: gameTime, runT: player.runT, speed: 0, attack: null, dodgeP: null, wingT: player.wingT, dead: true, deathT: player.deathT });
    rig.group.position.copy(player.pos);
    return;
  }

  player.iframes = Math.max(0, player.iframes - dt);
  player.stDelay = Math.max(0, player.stDelay - dt);
  if (player.stDelay <= 0) player.st = Math.min(player.maxSt, player.st + 22 * dt);
  player.comboT -= dt;
  if (player.comboT <= 0) player.combo = 0;

  if (player.octa) { updateOctaslash(dt); }
  if (player.ult) { updateUlt(dt); }

  /* movement input */
  let ix = 0, iz = 0;
  if (keys.KeyW) iz += 1; if (keys.KeyS) iz -= 1;
  if (keys.KeyA) ix -= 1; if (keys.KeyD) ix += 1;
  const moving = (ix || iz) && !player.octa && !player.ult;
  const sprint = keys.ShiftLeft && moving && player.st > 1 && !player.atk;
  if (sprint) { player.st -= 14 * dt; player.stDelay = Math.max(player.stDelay, 0.4); }

  // dodge
  if (keys.Space && !player.dodge && !player.octa && !player.ult && player.st >= 20) {
    keys.Space = false;
    player.st -= 20; player.stDelay = 0.7;
    const fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
    const rgtX = Math.cos(camYaw), rgtZ = -Math.sin(camYaw);
    let dxv = fwdX * iz + rgtX * ix, dzv = fwdZ * iz + rgtZ * ix;
    if (!ix && !iz) { dxv = Math.sin(player.yaw); dzv = Math.cos(player.yaw); }
    const dl = Math.hypot(dxv, dzv) || 1;
    player.dodge = { t: 0, dx: dxv / dl, dz: dzv / dl };
    player.iframes = Math.max(player.iframes, 0.32);
    player.atk = null; player.queued = null;
    SFX.dodge();
  }
  if (keys.Space) keys.Space = false;

  let speed = 0;
  if (player.dodge) {
    const dgd = player.dodge;
    dgd.t += dt;
    const burst = 14 * (1 - dgd.t / 0.38);
    player.pos.x += dgd.dx * burst * dt;
    player.pos.z += dgd.dz * burst * dt;
    player.yaw = Math.atan2(dgd.dx, dgd.dz);
    if (dgd.t > 0.38) player.dodge = null;
    speed = 1;
  } else if (moving && (!player.atk || player.atk.t < player.atk.def.as * 0.5)) {
    const sp = (sprint ? 10.5 : 6.2) * (player.atk ? 0.25 : 1);
    const fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
    const rgtX = Math.cos(camYaw), rgtZ = -Math.sin(camYaw);
    let mx = fwdX * iz + rgtX * ix, mz = fwdZ * iz + rgtZ * ix;
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml; mz /= ml;
    player.pos.x += mx * sp * dt;
    player.pos.z += mz * sp * dt;
    speed = sprint ? 1 : 0.65;
    if (player.lock && !player.lock.dead && !player.atk) {
      player.yaw = Math.atan2(player.lock.pos.x - player.pos.x, player.lock.pos.z - player.pos.z);
    } else if (!player.atk) {
      player.yaw = angleLerp(player.yaw, Math.atan2(mx, mz), 1 - Math.exp(-12 * dt));
    }
    // footsteps
    player.stepT -= dt * (sprint ? 1.6 : 1);
    if (player.stepT <= 0) { player.stepT = 0.33; SFX.step(); }
  }
  // residual knockback velocity
  player.pos.x += player.vel.x * dt;
  player.pos.z += player.vel.z * dt;
  player.vel.multiplyScalar(Math.max(0, 1 - dt * 8));

  player.speedSm = lerp(player.speedSm, speed, 1 - Math.exp(-10 * dt));
  player.runT += dt * (0.4 + player.speedSm);

  /* attacks */
  if (player.atk) {
    const a = player.atk;
    a.t += dt;
    const def = a.def;
    if (!a.hitDone && a.t >= def.as) {
      a.hitDone = true;
      attackSweep(def);
    }
    if (a.t >= def.dur) {
      if (player.queued) {
        const nxt = player.queued === 'heavy' ? ATTACKS.heavy : (def.next ? ATTACKS[def.next] : ATTACKS.l1);
        startAttack(nxt);
      } else {
        player.atk = null;
      }
    } else if (player.queued && def.next && a.t >= def.ae + 0.06 && player.queued !== 'heavy') {
      startAttack(ATTACKS[def.next]);
    }
  }

  /* terrain & collision */
  collideWorld(player.pos, 0.55);
  const gy = terrainHeight(player.pos.x, player.pos.z);
  const hover = player.ult ? 2.2 : 0;
  player.pos.y = lerp(player.pos.y, gy + hover, 1 - Math.exp(-14 * dt));

  /* wing */
  const wantWing = player.ult || player.permaWing;
  player.wingT = clamp(player.wingT + (wantWing ? dt * 1.6 : -dt * 1.2), 0, 1);

  /* lock-on maintenance */
  if (player.lock && (player.lock.dead || player.pos.distanceTo(player.lock.pos) > 45)) player.lock = null;

  /* drive rig */
  rig.group.position.copy(player.pos);
  rig.group.rotation.y = player.yaw;
  const atkState = player.octa
    ? { name: 'stab', p: (player.octa.t % 0.13) / 0.13 }
    : player.ult
      ? { name: 'ult', p: Math.min(player.ult.t / 1.2, 1) }
      : player.atk
        ? { name: player.atk.def.name, p: player.atk.t / player.atk.def.dur }
        : null;
  animSephiroth(rig, {
    t: gameTime, runT: player.runT, speed: player.speedSm,
    attack: atkState, dodgeP: player.dodge ? player.dodge.t / 0.38 : null,
    wingT: player.wingT, dead: false, deathT: 0,
  });

  /* sword trail */
  const active = (player.atk && player.atk.t > player.atk.def.as - 0.06 && player.atk.t < player.atk.def.ae + 0.08) || player.octa;
  if (active) {
    rig.parts.swordTip.getWorldPosition(V2);
    rig.parts.swordBase.getWorldPosition(V3);
    trail.push(V2, V3);
  }
  trail.update(dt);
}

/* ================= camera ================= */
function updateCamera(dt) {
  if (player.lock && !player.lock.dead) {
    const dx = player.pos.x - player.lock.pos.x, dz = player.pos.z - player.lock.pos.z;
    camYaw = angleLerp(camYaw, Math.atan2(dx, dz), 1 - Math.exp(-5 * dt));
    camPitch = lerp(camPitch, 0.3, 1 - Math.exp(-4 * dt));
  }
  const dist = 4.8;
  const cp = Math.cos(camPitch), spch = Math.sin(camPitch);
  V.set(player.pos.x, player.pos.y + 1.7, player.pos.z); // look target
  // shoulder offset
  const rgtX = Math.cos(camYaw), rgtZ = -Math.sin(camYaw);
  V.x += rgtX * 0.6; V.z += rgtZ * 0.6;
  const cx = V.x + Math.sin(camYaw) * cp * dist;
  const cy = V.y + spch * dist;
  const cz = V.z + Math.cos(camYaw) * cp * dist;
  const minY = terrainHeight(cx, cz) + 0.45;
  camera.position.set(cx, Math.max(cy, minY), cz);
  if (shake > 0.001) {
    camera.position.x += rand(-1, 1) * shake * 0.14;
    camera.position.y += rand(-1, 1) * shake * 0.14;
    camera.position.z += rand(-1, 1) * shake * 0.14;
    shake *= Math.max(0, 1 - dt * 6);
  }
  camera.lookAt(V);

  // lock-on reticle
  if (player.lock && !player.lock.dead) {
    V2.copy(player.lock.pos); V2.y += player.lock.height * 0.65;
    V2.project(camera);
    if (V2.z < 1) {
      ui.lock.classList.remove('hidden');
      ui.lock.style.left = `${(V2.x * 0.5 + 0.5) * innerWidth}px`;
      ui.lock.style.top = `${(-V2.y * 0.5 + 0.5) * innerHeight}px`;
    } else ui.lock.classList.add('hidden');
  } else ui.lock.classList.add('hidden');
}

/* cinematic orbit behind the title screen */
function titleCamera(t) {
  const a = t * 0.08;
  const x = Math.cos(a) * 26, z = 30 + Math.sin(a) * 26;
  camera.position.set(x, terrainHeight(x, z) + 7, z);
  camera.lookAt(0, terrainHeight(0, 30) + 3, 30);
}

/* ================= HUD ================= */
function updateHUD() {
  ui.hpFill.style.transform = `scaleX(${clamp(player.hp / player.maxHp, 0, 1)})`;
  ui.stFill.style.transform = `scaleX(${clamp(player.st / player.maxSt, 0, 1)})`;
  ui.spFill.style.transform = `scaleX(${clamp(player.sp / 100, 0, 1)})`;
  ui.spBar.classList.toggle('full', player.sp >= 100);
  ui.lvl.textContent = player.lvl;
  ui.xpT.textContent = `XP ${player.xp}/${player.xpNext}`;
  ui.combo.style.opacity = player.combo >= 3 ? '1' : '0';
  ui.comboN.textContent = player.combo;
  const def = OBJ_DEFS[objIdx];
  if (def && def.beacon) {
    const d = Math.round(dist2d(player.pos.x, player.pos.z, def.beacon[0], def.beacon[1]));
    ui.objDist.textContent = d > 12 ? `▲ ${d}m` : '▲ HERE';
  } else ui.objDist.textContent = '';
}

/* ================= main loop ================= */
const clock = new THREE.Clock();
let firstFrame = true;

function loop() {
  requestAnimationFrame(loop);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  realTime += rawDt;
  let dt = rawDt;
  if (hitStop > 0) { hitStop -= rawDt; dt *= 0.07; }
  if (player.ult && player.ult.t < 1) dt *= 0.45; // dramatic wind-up slow-mo
  if (paused || !started) dt = 0;

  gameTime += dt;
  hintCooldown -= rawDt;
  if (hintCooldown <= 0) ui.hint.style.opacity = '0';

  if (started) {
    updatePlayer(dt);
    if (dt > 0) {
      for (let i = enemies.length - 1; i >= 0; i--) updateEnemy(enemies[i], dt);
      updateProjectiles(dt);
      updateAmbientSpawns(dt);
      updateObjectives(dt);
    }
    updateCamera(rawDt);
    updateHUD();
  } else {
    titleCamera(realTime);
  }

  particles.update(Math.max(dt, started ? 0 : rawDt));
  numbers.update(rawDt, camera);
  world.update(Math.max(dt, started ? 0 : rawDt), started ? gameTime : realTime, started ? player.pos : camera.position, camera);

  composer.render();

  if (firstFrame) {
    firstFrame = false;
    ui.loading.classList.add('hidden');
    ui.title.classList.remove('hidden');
    rig.group.position.copy(player.pos);
    rig.group.rotation.y = player.yaw;
    animSephiroth(rig, { t: 0, runT: 0, speed: 0, attack: null, dodgeP: null, wingT: 0, dead: false, deathT: 0 });
    advanceObjective();
    spawnScouts();
  }
}
loop();

// Opt-in debug handle for automated verification (?debug=1). No effect otherwise.
if (new URLSearchParams(location.search).get('debug') === '1') {
  window.__SEPH_DEBUG = {
    player, enemies,
    teleport(x, z) { player.pos.set(x, terrainHeight(x, z), z); },
    nearestEnemyDist() {
      let m = Infinity;
      for (const e of enemies) if (!e.dead) m = Math.min(m, player.pos.distanceTo(e.pos));
      return m;
    },
    aliveEnemies() { return enemies.filter((e) => !e.dead).length; },
  };
}
