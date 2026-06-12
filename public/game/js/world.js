// World generation: terrain, sky, water, vegetation, ruins, puzzle props, lighting & day/night.
import * as THREE from 'three';
import { fbm, noise2, clamp, lerp, smoothstep, mulberry32, dist2d } from './util.js';

export const HALF = 400;            // world half-extent
export const WATER_Y = -2;

export const SITES = {
  spawn: { x: 0, z: 30, r: 55, h: 3 },
  lake:  { x: 150, z: 120, r: 75, h: -8 },
  ruins: { x: 0, z: -180, r: 85, h: 4 },
  arena: { x: 0, z: -266, r: 50, h: 4 },
};

export function terrainHeight(x, z) {
  let h = fbm(x * 0.013, z * 0.013, 5) * 11
        + fbm(x * 0.004 + 7.3, z * 0.004 - 2.1, 3) * 26 + 6;
  // mountain ring walls the playable area
  const d0 = Math.hypot(x, z);
  h += Math.pow(clamp((d0 - 290) / 120, 0, 1), 2) * 85;
  // flatten gameplay sites
  for (const k in SITES) {
    const s = SITES[k];
    const d = Math.hypot(x - s.x, z - s.z);
    const m = smoothstep(s.r * 0.55, s.r, d);
    h = lerp(s.h, h, m);
  }
  // worn path from spawn to the sanctum gate
  if (z < 40 && z > -150) {
    const m = smoothstep(7, 26, Math.abs(x)) + smoothstep(-148, -140, -z) * 0; // path width mask
    const zm = smoothstep(40, 25, z) * smoothstep(-160, -140, z);
    h = lerp(3.5, h, clamp(m + (1 - zm), 0, 1));
  }
  return h;
}

function slopeAt(x, z) {
  const e = 1.2;
  const dx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
  const dz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

export function createWorld(scene) {
  const rng = mulberry32(4242);
  const colliders = [];       // {x,z,r}
  const uTime = { value: 0 };

  /* ---------------- terrain ---------------- */
  const SEG = 220;
  const tGeo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, SEG, SEG);
  tGeo.rotateX(-Math.PI / 2);
  const pos = tGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const sl = slopeAt(x, z);
    const v = noise2(x * 0.05, z * 0.05) * 0.5 + 0.5;
    c.setRGB(0.13 + v * 0.06, 0.24 + v * 0.05, 0.12);                 // grass
    tmp.setRGB(0.33, 0.29, 0.16); c.lerp(tmp, smoothstep(0.45, 0.75, noise2(x * 0.02 + 9, z * 0.02))); // dry patches
    tmp.setRGB(0.30, 0.30, 0.35); c.lerp(tmp, smoothstep(0.45, 0.9, sl));  // rock on slopes
    tmp.setRGB(0.80, 0.84, 0.92); c.lerp(tmp, smoothstep(34, 48, h) * (1 - smoothstep(0.8, 1.4, sl))); // snow caps
    tmp.setRGB(0.34, 0.30, 0.21); c.lerp(tmp, smoothstep(1.6, 0.2, h));    // shoreline
    tmp.setRGB(0.05, 0.13, 0.13); c.lerp(tmp, smoothstep(-1.0, -5.0, h));  // lakebed
    tmp.setRGB(0.18, 0.42, 0.26); c.lerp(tmp, smoothstep(0.66, 0.85, noise2(x * 0.06 - 31, z * 0.06 + 17)) * 0.5); // mako veins
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  tGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  tGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  /* ---------------- sky ---------------- */
  const skyUni = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uDay: { value: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUni, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        uniform vec3 uSunDir; uniform float uDay; varying vec3 vDir;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 zen = mix(vec3(0.010,0.012,0.034), vec3(0.13,0.30,0.58), uDay);
          vec3 hor = mix(vec3(0.045,0.05,0.10), vec3(0.88,0.60,0.34), uDay);
          vec3 col = mix(hor, zen, pow(h, 0.8));
          float s = max(dot(d, uSunDir), 0.0);
          vec3 sc = mix(vec3(0.55,0.65,1.0), vec3(1.0,0.86,0.55), uDay);
          col += sc * (pow(s, 700.0) * 5.0 + pow(s, 16.0) * 0.4 * (0.25 + uDay));
          float st = step(0.9986, hash(floor(d * 320.0))) * (1.0 - uDay) * smoothstep(0.02, 0.2, d.y);
          col += vec3(st);
          gl_FragColor = vec4(col, 1.0);
        }`
    })
  );
  sky.renderOrder = -10;
  scene.add(sky);

  /* ---------------- water ---------------- */
  const waterUni = {
    uTime, uDay: skyUni.uDay,
    uSunDir: skyUni.uSunDir,
    uCam: { value: new THREE.Vector3() },
  };
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2, HALF * 2, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: waterUni, transparent: true, fog: false,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uTime; uniform float uDay; uniform vec3 uSunDir; uniform vec3 uCam; varying vec3 vW;
        void main(){
          float w = sin(vW.x*0.42 + uTime*1.4) + sin(vW.z*0.36 - uTime*1.1) + sin((vW.x+vW.z)*0.21 + uTime*0.6);
          vec3 n = normalize(vec3(w*0.075, 1.0, w*0.06));
          vec3 V = normalize(uCam - vW);
          float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
          vec3 deep = mix(vec3(0.004,0.012,0.02), vec3(0.015,0.07,0.09), uDay);
          vec3 skyc = mix(vec3(0.04,0.05,0.10), vec3(0.45,0.6,0.75), uDay);
          vec3 col = mix(deep, skyc, fres * 0.85);
          float spec = pow(max(dot(reflect(-uSunDir, n), V), 0.0), 80.0);
          col += mix(vec3(0.3,0.4,0.9), vec3(1.0,0.9,0.7), uDay) * spec * 1.6;
          col += vec3(0.1,0.5,0.35) * pow(max(w*0.33,0.0), 4.0) * 0.06; // mako shimmer
          gl_FragColor = vec4(col, 0.93);
        }`
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  scene.add(water);

  /* ---------------- lighting ---------------- */
  const hemi = new THREE.HemisphereLight(0x90b0d8, 0x1c2018, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  scene.fog = new THREE.FogExp2(0x9db1c8, 0.0017);

  /* ---------------- vegetation & rocks (instanced) ---------------- */
  const dummy = new THREE.Object3D();
  const col3 = new THREE.Color();

  function scatter(count, fits) {
    const out = [];
    let guard = count * 30;
    while (out.length < count && guard-- > 0) {
      const x = (rng() * 2 - 1) * (HALF - 30), z = (rng() * 2 - 1) * (HALF - 30);
      const h = terrainHeight(x, z);
      if (fits(x, z, h)) out.push([x, z, h]);
    }
    return out;
  }
  const clearOfSites = (x, z, pad = 0) =>
    dist2d(x, z, SITES.ruins.x, SITES.ruins.z) > SITES.ruins.r + pad &&
    dist2d(x, z, SITES.arena.x, SITES.arena.z) > SITES.arena.r + pad &&
    !(Math.abs(x) < 12 && z < 40 && z > -150);

  // trees
  const treeSpots = scatter(260, (x, z, h) => h > 0.8 && h < 30 && slopeAt(x, z) < 0.65 && clearOfSites(x, z, 4) && dist2d(x, z, 0, 30) > 14);
  const trunkM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.36, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 1 }), treeSpots.length);
  // 3 irregular foliage blobs per tree to break the lollipop silhouette
  const canopyM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.7, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), treeSpots.length * 3);
  treeSpots.forEach(([x, z, h], i) => {
    const s = 0.7 + rng() * 1.1;
    dummy.position.set(x, h + 1.6 * s, z); dummy.scale.setScalar(s); dummy.rotation.y = rng() * 6.28;
    dummy.updateMatrix(); trunkM.setMatrixAt(i, dummy.matrix);
    for (let b = 0; b < 3; b++) {
      const bs = s * (b === 0 ? 1 : 0.45 + rng() * 0.35);
      dummy.position.set(
        x + (b === 0 ? 0 : (rng() - 0.5) * 2.0 * s),
        h + (3.4 + 1.1) * s + (b === 0 ? 0 : (rng() - 0.7) * 1.6 * s),
        z + (b === 0 ? 0 : (rng() - 0.5) * 2.0 * s));
      dummy.scale.set(bs, bs * (0.75 + rng() * 0.35), bs);
      dummy.rotation.set(rng(), rng() * 6.28, rng());
      dummy.updateMatrix(); canopyM.setMatrixAt(i * 3 + b, dummy.matrix);
      col3.setRGB(0.05 + rng() * 0.05, 0.16 + rng() * 0.12, 0.07 + rng() * 0.05);
      canopyM.setColorAt(i * 3 + b, col3);
    }
  });
  trunkM.castShadow = canopyM.castShadow = true;
  scene.add(trunkM, canopyM);

  // rocks
  const rockSpots = scatter(150, (x, z, h) => h > 0 && clearOfSites(x, z, 2) && dist2d(x, z, 0, 30) > 10);
  const rockM = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x565660, roughness: 0.9 }), rockSpots.length);
  rockSpots.forEach(([x, z, h], i) => {
    const s = 0.5 + rng() * 2.0;
    dummy.position.set(x, h + s * 0.3, z); dummy.scale.set(s, s * (0.6 + rng() * 0.6), s);
    dummy.rotation.set(rng(), rng() * 6.28, rng()); dummy.updateMatrix();
    rockM.setMatrixAt(i, dummy.matrix);
    if (s > 1.5) colliders.push({ x, z, r: s * 0.9 });
  });
  rockM.castShadow = true;
  scene.add(rockM);

  // grass with wind sway
  const grassGeo = new THREE.PlaneGeometry(0.16, 1.0, 1, 2);
  grassGeo.translate(0, 0.5, 0);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4a6a38, roughness: 1, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         float wph = instanceMatrix[3][0] * 0.35 + instanceMatrix[3][2] * 0.45;
         transformed.x += sin(uTime * 1.8 + wph) * position.y * 0.32;
         transformed.z += cos(uTime * 1.3 + wph) * position.y * 0.18;
       #endif`
    );
  };
  const grassSpots = scatter(9000, (x, z, h) => h > 0.8 && h < 24 && slopeAt(x, z) < 0.55 && clearOfSites(x, z));
  const grassM = new THREE.InstancedMesh(grassGeo, grassMat, grassSpots.length);
  grassSpots.forEach(([x, z, h], i) => {
    dummy.position.set(x, h - 0.05, z);
    dummy.scale.set(1, 0.6 + rng() * 1.0, 1);
    dummy.rotation.set(0, rng() * 6.28, 0);
    dummy.updateMatrix(); grassM.setMatrixAt(i, dummy.matrix);
    col3.setRGB(0.22 + rng() * 0.2, 0.4 + rng() * 0.25, 0.16 + rng() * 0.1);
    grassM.setColorAt(i, col3);
  });
  scene.add(grassM);

  /* ---------------- mako crystals (ambient) ---------------- */
  const makoMat = new THREE.MeshStandardMaterial({ color: 0x103325, emissive: 0x35e88a, emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.92 });
  const makoSpots = scatter(30, (x, z, h) => h > 0.5 && clearOfSites(x, z) && dist2d(x, z, 0, 30) > 26);
  const makoM = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.8, 0), makoMat, makoSpots.length);
  makoSpots.forEach(([x, z, h], i) => {
    const s = 0.5 + rng() * 1.6;
    dummy.position.set(x, h + s * 0.7, z); dummy.scale.set(s * 0.6, s * 1.6, s * 0.6);
    dummy.rotation.set(rng() * 0.5 - 0.25, rng() * 6.28, rng() * 0.5 - 0.25);
    dummy.updateMatrix(); makoM.setMatrixAt(i, dummy.matrix);
  });
  scene.add(makoM);

  /* ---------------- stone helpers ---------------- */
  const stone = new THREE.MeshStandardMaterial({ color: 0x6a6a74, roughness: 0.92 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x46464e, roughness: 0.95 });
  function box(w, h, d, x, y, z, mat = stone, ry = 0, rz = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = rz;
    m.castShadow = m.receiveShadow = true;
    scene.add(m); return m;
  }
  function column(x, z, h) {
    const g = terrainHeight(x, z);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, h, 10), stone);
    m.position.set(x, g + h / 2, z); m.castShadow = m.receiveShadow = true;
    scene.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), stoneDark);
    cap.position.set(x, g + h + 0.3, z); cap.castShadow = true; scene.add(cap);
    colliders.push({ x, z, r: 1.3 });
  }

  /* ---------------- puzzle 1: resonance crystals (near spawn) ---------------- */
  const crystals = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const x = Math.cos(a) * 21, z = 30 + Math.sin(a) * 21;
    const g = terrainHeight(x, z);
    const mat = makoMat.clone(); mat.emissiveIntensity = 0.5;
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), mat);
    mesh.scale.set(0.9, 2.4, 0.9);
    mesh.position.set(x, g + 2.0, z);
    mesh.castShadow = true;
    scene.add(mesh);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 0.9, 8), stoneDark);
    base.position.set(x, g + 0.45, z); base.castShadow = base.receiveShadow = true;
    scene.add(base);
    colliders.push({ x, z, r: 1.7 });
    crystals.push({ idx: i, mesh, mat, pos: new THREE.Vector3(x, g + 2, z), lit: false, baseY: g + 2 });
  }
  const crystalLight = new THREE.PointLight(0x40ff90, 6, 50, 1.8);
  crystalLight.position.set(0, terrainHeight(0, 30) + 6, 30);
  scene.add(crystalLight);

  /* ---------------- sanctum gate & walls ---------------- */
  const GZ = -140;
  box(2.4, 11, 2.4, -7, terrainHeight(-7, GZ) + 5.5, GZ); colliders.push({ x: -7, z: GZ, r: 2 });
  box(2.4, 11, 2.4, 7, terrainHeight(7, GZ) + 5.5, GZ);  colliders.push({ x: 7, z: GZ, r: 2 });
  box(1.8, 2, 17, 0, terrainHeight(0, GZ) + 11.4, GZ); // lintel
  for (const sgn of [-1, 1]) {
    for (let wx = 12; wx <= 64; wx += 8) {
      const x = sgn * wx;
      const g = terrainHeight(x, GZ);
      box(8.4, 6.5 + noise2(x * 0.3, 0) * 1.5, 2.6, x, g + 3, GZ, stoneDark);
      colliders.push({ x, z: GZ, r: 4.4 });
    }
  }
  const gateMesh = box(11.6, 10, 1.4, 0, terrainHeight(0, GZ) + 5, GZ, stoneDark);
  const gateRune = new THREE.Mesh(new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ color: 0x35e88a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
  gateRune.position.set(0, terrainHeight(0, GZ) + 5.5, GZ + 0.75);
  scene.add(gateRune);
  const gateCollider = { x: 0, z: GZ, r: 6.2 };
  colliders.push(gateCollider);
  const gate = { mesh: gateMesh, rune: gateRune, open: false, opening: false, t: 0, baseY: gateMesh.position.y, collider: gateCollider };

  /* ---------------- the Forgotten Sanctum (ruined nave) ---------------- */
  for (let z = -156; z >= -208; z -= 9) {
    column(-10, z, 5 + rng() * 4);
    column(10, z, 5 + rng() * 4);
  }
  for (const sgn of [-1, 1]) {
    for (let z = -152; z >= -212; z -= 12) {
      if (rng() < 0.7) {
        const g = terrainHeight(sgn * 17, z);
        box(2.2, 4 + rng() * 4, 10, sgn * 17, g + 2.5, z, stoneDark);
        colliders.push({ x: sgn * 17, z, r: 4.5 });
      }
    }
  }
  // altar
  const ag = terrainHeight(0, -214);
  box(10, 1, 8, 0, ag + 0.5, -214, stone);
  box(7, 1, 5.5, 0, ag + 1.5, -214, stoneDark);
  box(2, 2.6, 1.2, 0, ag + 3.3, -216, stone);

  /* ---------------- puzzle 2: the three bells ---------------- */
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xc89a3c, metalness: 0.9, roughness: 0.35, emissive: 0x6a4a10, emissiveIntensity: 0.15 });
  const bells = [];
  const bellSpots = [[-13, -188], [13, -188], [0, -206]];
  for (let i = 0; i < 3; i++) {
    const [x, z] = bellSpots[i];
    const g = terrainHeight(x, z);
    box(0.5, 4.6, 0.5, x - 1.6, g + 2.3, z, stoneDark);
    box(0.5, 4.6, 0.5, x + 1.6, g + 2.3, z, stoneDark);
    box(4.0, 0.5, 0.7, x, g + 4.8, z, stoneDark);
    const grp = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.78, 1.0, 14), bellMat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.09, 8, 18), bellMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = -0.5;
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), stoneDark);
    clapper.position.y = -0.62;
    cup.castShadow = true;
    grp.add(cup, rim, clapper);
    grp.position.set(x, g + 4.0, z);
    scene.add(grp);
    colliders.push({ x: x - 1.6, z, r: 0.6 }, { x: x + 1.6, z, r: 0.6 });
    bells.push({ group: grp, pos: new THREE.Vector3(x, g + 3.4, z), rung: false, swing: 0 });
  }

  /* ---------------- arena: monolith ring + braziers ---------------- */
  const A = SITES.arena;
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.32) continue; // entrance gap (north side)
    const x = A.x + Math.cos(a) * 42, z = A.z + Math.sin(a) * 42;
    const g = terrainHeight(x, z);
    box(3.4, 9 + rng() * 3, 1.8, x, g + 4.5, z, stoneDark, a + Math.PI / 2, (rng() - 0.5) * 0.12);
    colliders.push({ x, z, r: 2.6 });
  }
  const braziers = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const x = A.x + Math.cos(a) * 27, z = A.z + Math.sin(a) * 27;
    const g = terrainHeight(x, z);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.6, 8), stoneDark);
    pil.position.set(x, g + 0.8, z); pil.castShadow = true; scene.add(pil);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.5, 0.55, 10), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.5 }));
    bowl.position.set(x, g + 1.85, z); bowl.castShadow = true; scene.add(bowl);
    const light = new THREE.PointLight(0xff8838, 0, 22, 1.6);
    light.position.set(x, g + 3.2, z); scene.add(light);
    colliders.push({ x, z, r: 1.0 });
    braziers.push({ pos: new THREE.Vector3(x, g + 2.1, z), lit: false, light });
  }

  /* ---------------- objective beacon ---------------- */
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 280, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x7cfc9a, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  );
  beacon.position.set(0, 100, 0);
  scene.add(beacon);

  /* ---------------- day / night ---------------- */
  const fogDay = new THREE.Color(0x9db1c8), fogNight = new THREE.Color(0x05060e), fogC = new THREE.Color();
  const sunDay = new THREE.Color(0xfff2dd), sunset = new THREE.Color(0xff9040), moon = new THREE.Color(0x8090c8);
  const sunDir = new THREE.Vector3();
  let dayFactor = 1;

  const world = {
    terrainHeight, colliders, crystals, bells, braziers, gate, beacon, sun, SITES,
    get dayFactor() { return dayFactor; },
    setBeacon(x, z) { beacon.visible = true; beacon.position.set(x, 100, z); },
    hideBeacon() { beacon.visible = false; },

    update(dt, elapsed, playerPos, camera) {
      uTime.value = elapsed;
      sky.position.copy(camera.position);

      // sun / moon cycle (7 minute day)
      const ang = elapsed * (Math.PI * 2 / 420) + 1.1;
      const sy = Math.sin(ang), sx = Math.cos(ang);
      dayFactor = smoothstep(-0.12, 0.25, sy);
      const night = sy < -0.04;
      sunDir.set(night ? -sx : sx, Math.max(night ? -sy : sy, 0.08), 0.35).normalize();
      skyUni.uSunDir.value.copy(sunDir);
      skyUni.uDay.value = dayFactor;

      sun.position.copy(playerPos).addScaledVector(sunDir, 170);
      sun.target.position.copy(playerPos);
      sun.intensity = night ? 0.35 : lerp(0.3, 2.6, dayFactor);
      if (night) sun.color.copy(moon);
      else sun.color.copy(sunDay).lerp(sunset, 1 - smoothstep(0.05, 0.45, sy));
      hemi.intensity = lerp(0.16, 0.75, dayFactor);

      fogC.copy(fogNight).lerp(fogDay, dayFactor);
      scene.fog.color.copy(fogC);

      waterUni.uCam.value.copy(camera.position);

      // gentle pulse on ambient crystals + beacon
      makoMat.emissiveIntensity = 1.2 + Math.sin(elapsed * 2.1) * 0.35;
      beacon.material.opacity = 0.11 + Math.sin(elapsed * 3) * 0.045;
      crystalLight.intensity = 4 + Math.sin(elapsed * 2.4) * 1.5 + (1 - dayFactor) * 4;

      // gate opening animation
      if (gate.opening && !gate.open) {
        gate.t += dt;
        gate.mesh.position.y = gate.baseY - Math.min(gate.t / 3, 1) * 10.5;
        gate.rune.material.opacity = Math.max(0, 0.8 - gate.t * 0.4);
        if (gate.t >= 3) {
          gate.open = true;
          gate.collider.r = 0; // disable collision
        }
      }
      // bell swings decay
      for (const b of bells) {
        if (b.swing > 0) {
          b.group.rotation.z = Math.sin(elapsed * 9) * b.swing * 0.3;
          b.swing = Math.max(0, b.swing - dt * 0.6);
        }
      }
      // brazier flames flicker
      for (const br of braziers) {
        if (br.lit) br.light.intensity = 11 + Math.sin(elapsed * 11 + br.pos.x) * 2.5 + Math.random() * 1.5;
      }
    },
  };
  return world;
}
