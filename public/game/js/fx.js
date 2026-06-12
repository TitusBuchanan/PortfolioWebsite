// Visual effects: pooled GPU point particles, sword trail ribbon, floating damage numbers.
import * as THREE from 'three';
import { rand } from './util.js';

/* ---------------- particle pool ---------------- */
export class Particles {
  constructor(scene, max = 3000) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10000);

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
        varying vec3 vC; varying float vA;
        void main(){
          vC = aColor; vA = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (190.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vC, a);
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(o) {
    const count = o.count || 10;
    const c1 = new THREE.Color(o.color || 0xffffff);
    const c2 = new THREE.Color(o.color2 !== undefined ? o.color2 : (o.color || 0xffffff));
    for (let n = 0; n < count; n++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      const i3 = i * 3;
      this.pos[i3] = o.pos.x + rand(-1, 1) * (o.posSpread || 0);
      this.pos[i3 + 1] = o.pos.y + rand(-1, 1) * (o.posSpread || 0);
      this.pos[i3 + 2] = o.pos.z + rand(-1, 1) * (o.posSpread || 0);
      const sp = o.speed === undefined ? 4 : o.speed;
      let vx = rand(-1, 1), vy = rand(-1, 1), vz = rand(-1, 1);
      const vl = Math.hypot(vx, vy, vz) || 1;
      vx /= vl; vy /= vl; vz /= vl;
      this.vel[i3] = (o.vel ? o.vel.x : 0) + vx * sp * rand(0.3, 1);
      this.vel[i3 + 1] = (o.vel ? o.vel.y : 0) + vy * sp * rand(0.3, 1) + (o.up || 0);
      this.vel[i3 + 2] = (o.vel ? o.vel.z : 0) + vz * sp * rand(0.3, 1);
      const t = Math.random();
      this.col[i3] = c1.r + (c2.r - c1.r) * t;
      this.col[i3 + 1] = c1.g + (c2.g - c1.g) * t;
      this.col[i3 + 2] = c1.b + (c2.b - c1.b) * t;
      this.size[i] = (o.size || 1.4) * rand(0.6, 1.4);
      this.maxLife[i] = this.life[i] = (o.life || 0.7) * rand(0.6, 1.3);
      this.alpha[i] = 1;
      this.grav[i] = o.gravity === undefined ? -6 : o.gravity;
      this.drag[i] = o.drag === undefined ? 1.5 : o.drag;
    }
  }

  update(dt) {
    const { pos, vel, life, maxLife, alpha, grav, drag } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) { alpha[i] = 0; continue; }
      life[i] -= dt;
      const i3 = i * 3;
      const dr = Math.max(0, 1 - drag[i] * dt);
      vel[i3] *= dr; vel[i3 + 2] *= dr;
      vel[i3 + 1] += grav[i] * dt;
      pos[i3] += vel[i3] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt;
      alpha[i] = Math.max(0, life[i] / maxLife[i]);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}

/* ---------------- sword trail ribbon ---------------- */
export class SwordTrail {
  constructor(scene, segments = 22) {
    this.n = segments;
    this.tips = [];
    this.bases = [];
    this.ages = [];
    const verts = new Float32Array(segments * 2 * 3);
    const alphas = new Float32Array(segments * 2);
    const idx = [];
    for (let i = 0; i < segments - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c2 = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, b, c2, b, d, c2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10000);
    this.geo = geo;
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uColor: { value: new THREE.Color(0xbfe8ff) } },
      vertexShader: `attribute float aAlpha; varying float vA; void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(uColor, vA * 0.55); }`,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  push(tip, base) {
    this.tips.unshift(tip.clone());
    this.bases.unshift(base.clone());
    this.ages.unshift(0);
    if (this.tips.length > this.n) { this.tips.pop(); this.bases.pop(); this.ages.pop(); }
  }

  update(dt) {
    for (let i = 0; i < this.ages.length; i++) this.ages[i] += dt;
    while (this.ages.length && this.ages[this.ages.length - 1] > 0.22) {
      this.tips.pop(); this.bases.pop(); this.ages.pop();
    }
    if (this.tips.length < 2) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    const v = this.geo.attributes.position.array;
    const a = this.geo.attributes.aAlpha.array;
    for (let i = 0; i < this.n; i++) {
      const j = Math.min(i, this.tips.length - 1);
      const t = this.tips[j], b = this.bases[j];
      v[i * 6] = t.x; v[i * 6 + 1] = t.y; v[i * 6 + 2] = t.z;
      v[i * 6 + 3] = b.x; v[i * 6 + 4] = b.y; v[i * 6 + 5] = b.z;
      const fade = i < this.tips.length ? Math.max(0, 1 - this.ages[j] / 0.22) : 0;
      a[i * 2] = fade; a[i * 2 + 1] = fade * 0.6;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  clear() { this.tips.length = this.bases.length = this.ages.length = 0; this.mesh.visible = false; }
}

/* ---------------- floating damage numbers (DOM) ---------------- */
export class DamageNumbers {
  constructor(layerEl) {
    this.layer = layerEl;
    this.items = [];
  }
  show(worldPos, text, cls = '') {
    const el = document.createElement('div');
    el.className = 'dmgNum ' + cls;
    el.textContent = text;
    this.layer.appendChild(el);
    this.items.push({ el, pos: worldPos.clone(), t: 0, dx: rand(-30, 30) });
  }
  update(dt, camera) {
    const v = new THREE.Vector3();
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.t > 0.85) { it.el.remove(); this.items.splice(i, 1); continue; }
      v.copy(it.pos).project(camera);
      if (v.z > 1) { it.el.style.opacity = '0'; continue; }
      const x = (v.x * 0.5 + 0.5) * innerWidth + it.dx * it.t;
      const y = (-v.y * 0.5 + 0.5) * innerHeight - it.t * 70;
      it.el.style.transform = `translate(${x}px, ${y}px) scale(${1 + Math.max(0, 0.25 - it.t) * 3})`;
      it.el.style.opacity = String(Math.max(0, 1 - it.t / 0.85));
    }
  }
}
