// Procedural 3D models, studio-toy style: smooth lathed/curved geometry,
// glossy "vinyl toy" materials, faces with eye glints, layered animations.
// Each mesh is tagged with a coloring region name, so the kid's colors from
// the 2D page (or the live camera texture of the physical page) paint it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const INK = '#2b2b52';

// glossy vinyl-toy plastic
const toy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.4, metalness: 0.02,
  clearcoat: 0.7, clearcoatRoughness: 0.25, ...extra
});
const inkMat = () => toy(INK, { roughness: 0.5 });

const tag = (mesh, region) => { mesh.userData.region = region; return mesh; };

const sphere = (r, seg = 32) => new THREE.SphereGeometry(r, seg, seg);

function addEyes(parent, { x = 0, y = 0, z = 0, gap = 0.09, r = 0.045, dir = 1 } = {}) {
  for (const s of [-1, 1]) {
    const white = new THREE.Mesh(sphere(r, 16), toy('#ffffff'));
    white.position.set(x, y, z + s * gap);
    parent.add(white);
    const pupil = new THREE.Mesh(sphere(r * 0.55, 12), inkMat());
    pupil.position.set(x + dir * r * 0.55, y + r * 0.1, z + s * gap);
    parent.add(pupil);
    const glint = new THREE.Mesh(sphere(r * 0.2, 8), toy('#ffffff'));
    glint.position.set(x + dir * r * 0.8, y + r * 0.35, z + s * gap + r * 0.2);
    parent.add(glint);
  }
}

/* ------------------------------------------------------------------ */
/* live page texture                                                    */
/* ------------------------------------------------------------------ */
export function applyPageTexture(model, texture, rects) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    const rect = rects[o.userData.region];
    if (!rect) return;
    const geo = (o.geometry = o.geometry.clone());
    const uv = geo.attributes.uv;
    if (!uv) return;
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (let i = 0; i < uv.count; i++) {
      u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i));
      v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i));
    }
    const su = u1 - u0 || 1, sv = v1 - v0 || 1;
    for (let i = 0; i < uv.count; i++) {
      const u = (uv.getX(i) - u0) / su, v = (uv.getY(i) - v0) / sv;
      uv.setXY(i, rect.u0 + u * rect.w, rect.v0 + v * rect.h);
    }
    uv.needsUpdate = true;
    const old = o.material;
    o.material = new THREE.MeshStandardMaterial({
      map: texture, roughness: 0.65, metalness: 0.02, side: old.side
    });
    old.dispose();
  });
}

/* ------------------------------------------------------------------ */
/* optional authored GLB (in-app viewer only; see README)               */
/* ------------------------------------------------------------------ */
export async function getModel(topicId, kind, colors = {}) {
  if (Object.values(colors).some(Boolean)) return buildModel(kind, colors);
  try {
    const url = `models/${topicId}.glb`;
    const head = await fetch(url, { method: 'HEAD' });
    if (head.ok) {
      const gltf = await new GLTFLoader().loadAsync(url);
      const group = new THREE.Group();
      const scene = gltf.scene;
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1.2 / Math.max(size.x, size.y, size.z, 0.0001);
      scene.scale.setScalar(scale);
      box.setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      scene.position.set(-center.x, -box.min.y, -center.z);
      group.add(scene);
      if (gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(scene);
        for (const clip of gltf.animations) {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        }
        group.userData.animate = (t, dt) => mixer.update(dt || 0.016);
      } else {
        group.userData.animate = (t) => { group.rotation.y = Math.sin(t * 0.5) * 0.3; };
      }
      return group;
    }
  } catch { /* fall through */ }
  return buildModel(kind, colors);
}

export function buildModel(kind, colors = {}) {
  const c = (region, fallback) => colors[region] || fallback;
  const builders = { rocket, butterfly, fish, dino };
  return (builders[kind] || crystal)(c, colors);
}

/* ------------------------------------------------------------------ */
/* 🚀 rocket                                                            */
/* ------------------------------------------------------------------ */
function rocket(c) {
  const g = new THREE.Group();

  const bodyPts = [
    new THREE.Vector2(0.22, -0.62), new THREE.Vector2(0.31, -0.5),
    new THREE.Vector2(0.345, -0.2), new THREE.Vector2(0.35, 0.05),
    new THREE.Vector2(0.32, 0.35), new THREE.Vector2(0.29, 0.52),
    new THREE.Vector2(0.28, 0.56)
  ];
  const body = tag(new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 48), toy(c('body', '#f4f4f8'))), 'body');
  g.add(body);

  const nosePts = [
    new THREE.Vector2(0.28, 0), new THREE.Vector2(0.24, 0.14),
    new THREE.Vector2(0.16, 0.32), new THREE.Vector2(0.06, 0.47),
    new THREE.Vector2(0.0, 0.52)
  ];
  const nose = tag(new THREE.Mesh(new THREE.LatheGeometry(nosePts, 48), toy(c('nose', '#ff5d5d'))), 'nose');
  nose.position.y = 0.56;
  g.add(nose);

  for (const [y, r] of [[0.55, 0.285], [-0.5, 0.315]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 12, 48), inkMat());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.035, 16, 40), inkMat());
  rim.position.set(0, 0.12, 0.36);
  g.add(rim);
  const glass = tag(new THREE.Mesh(sphere(0.135), toy(c('window', '#9ad9ff'), {
    roughness: 0.1, clearcoat: 1, emissive: new THREE.Color('#5ab7e8'), emissiveIntensity: 0.15
  })), 'window');
  glass.position.set(0, 0.12, 0.34);
  glass.scale.z = 0.5;
  g.add(glass);

  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0.1);
  finShape.quadraticCurveTo(-0.32, -0.05, -0.4, -0.52);
  finShape.lineTo(-0.12, -0.42);
  finShape.quadraticCurveTo(-0.06, -0.18, 0, 0.1);
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3
  });
  const finL = tag(new THREE.Mesh(finGeo, toy(c('finLeft', '#ff9f43'))), 'finLeft');
  finL.position.set(-0.28, -0.25, 0.025);
  g.add(finL);
  const finR = tag(new THREE.Mesh(finGeo.clone(), toy(c('finRight', '#ff9f43'))), 'finRight');
  finR.scale.x = -1;
  finR.position.set(0.28, -0.25, 0.025);
  g.add(finR);

  const flameGroup = new THREE.Group();
  flameGroup.position.y = -0.78;
  const flameOuter = tag(new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.55, 24), toy(c('flame', '#ff9f1c'), {
    emissive: new THREE.Color(c('flame', '#ff7b00')), emissiveIntensity: 0.9, transparent: true, opacity: 0.95
  })), 'flame');
  flameOuter.rotation.x = Math.PI;
  flameOuter.position.y = -0.18;
  flameGroup.add(flameOuter);
  const flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 20), toy('#ffe27a', {
    emissive: new THREE.Color('#ffd23f'), emissiveIntensity: 1.4
  }));
  flameInner.rotation.x = Math.PI;
  flameInner.position.y = -0.12;
  flameGroup.add(flameInner);
  const glow = new THREE.PointLight('#ff9f1c', 0.9, 2.2);
  glow.position.y = -0.25;
  flameGroup.add(glow);
  g.add(flameGroup);

  g.userData.animate = (t) => {
    g.position.y = Math.sin(t * 2.1) * 0.05;
    g.rotation.y = Math.sin(t * 0.55) * 0.3;
    g.rotation.z = Math.sin(t * 1.3) * 0.03;
    const f = 0.85 + Math.abs(Math.sin(t * 15)) * 0.3;
    flameOuter.scale.set(1, f, 1);
    flameInner.scale.set(1, 0.8 + Math.abs(Math.sin(t * 19 + 1)) * 0.4, 1);
    glow.intensity = 0.7 + Math.abs(Math.sin(t * 17)) * 0.5;
  };
  return g;
}

/* ------------------------------------------------------------------ */
/* 🦋 butterfly                                                         */
/* ------------------------------------------------------------------ */
function butterfly(c) {
  const g = new THREE.Group();

  const body = tag(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 8, 24), toy(c('body', '#8d5524'))), 'body');
  g.add(body);
  for (const y of [-0.18, 0, 0.18]) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.016, 10, 32), inkMat());
    seg.rotation.x = Math.PI / 2;
    seg.position.y = y;
    g.add(seg);
  }
  const head = tag(new THREE.Mesh(sphere(0.145), toy(c('head', '#a06a3a'))), 'head');
  head.position.y = 0.46;
  g.add(head);
  addEyes(g, { x: 0, y: 0.5, z: 0.1, gap: 0.06, r: 0.038, dir: 0 });

  // curled antennae
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.05, 0.56, 0.02),
      new THREE.Vector3(s * 0.12, 0.75, 0.05),
      new THREE.Vector3(s * 0.24, 0.86, 0.06),
      new THREE.Vector3(s * 0.3, 0.82, 0.06)
    ]);
    const ant = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.012, 8), inkMat());
    g.add(ant);
    const tip = new THREE.Mesh(sphere(0.03, 12), inkMat());
    tip.position.copy(curve.getPoint(1));
    g.add(tip);
  }

  // scalloped wing (drawn for the right side, mirrored for the left)
  const wingShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.22, 0.5, 0.82, 0.66, 0.95, 0.3);
    s.bezierCurveTo(1.02, 0.08, 0.82, -0.06, 0.55, -0.08);
    s.bezierCurveTo(0.68, -0.26, 0.5, -0.46, 0.26, -0.4);
    s.bezierCurveTo(0.08, -0.34, 0, -0.16, 0, 0);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.012, bevelSegments: 2
    });
  };

  const wings = [
    ['wingTopRight', 1, 0.22, 1, 0.15], ['wingTopLeft', -1, 0.22, 1, 0.15],
    ['wingBottomRight', 1, -0.05, 0.62, -0.75], ['wingBottomLeft', -1, -0.05, 0.62, -0.75]
  ];
  const flappers = [];
  for (const [region, side, y, scale, rot] of wings) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.08, y, 0);
    const wing = tag(new THREE.Mesh(wingShape(), toy(c(region, '#f15bb5'), { side: THREE.DoubleSide })), region);
    wing.scale.set(side * scale, scale, 1);
    wing.rotation.z = side * rot * -1;
    pivot.add(wing);
    flappers.push([pivot, side, region.includes('Bottom') ? 0.45 : 0]);
    g.add(pivot);
  }

  g.userData.animate = (t) => {
    for (const [pivot, side, lag] of flappers) {
      pivot.rotation.y = side * (Math.sin(t * 5.5 - lag) * 0.65 + 0.15);
    }
    g.position.y = Math.sin(t * 1.6) * 0.08;
    g.rotation.z = Math.sin(t * 0.8) * 0.06;
    g.rotation.y = Math.sin(t * 0.4) * 0.35;
  };
  return g;
}

/* ------------------------------------------------------------------ */
/* 🐠 fish                                                              */
/* ------------------------------------------------------------------ */
function fish(c) {
  const g = new THREE.Group();

  const body = tag(new THREE.Mesh(sphere(0.5, 48), toy(c('body', '#ff9f43'))), 'body');
  body.scale.set(1.3, 0.85, 0.62);
  g.add(body);

  const lips = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.03, 12, 24), inkMat());
  lips.position.set(-0.63, -0.02, 0);
  lips.rotation.y = Math.PI / 2;
  g.add(lips);
  addEyes(g, { x: -0.42, y: 0.14, z: 0, gap: 0.26, r: 0.075, dir: -1 });

  // fan tail with two lobes
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.quadraticCurveTo(0.2, 0.05, 0.46, 0.32);
  tailShape.quadraticCurveTo(0.3, 0.08, 0.36, 0);
  tailShape.quadraticCurveTo(0.3, -0.08, 0.46, -0.32);
  tailShape.quadraticCurveTo(0.2, -0.05, 0, 0);
  const tailPivot = new THREE.Group();
  tailPivot.position.x = 0.58;
  const tail = tag(new THREE.Mesh(
    new THREE.ExtrudeGeometry(tailShape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.015, bevelSegments: 2 }),
    toy(c('tail', '#ffd93d'), { side: THREE.DoubleSide })
  ), 'tail');
  tail.position.z = -0.022;
  tailPivot.add(tail);
  g.add(tailPivot);

  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.quadraticCurveTo(0.12, 0.34, 0.42, 0.3);
  finShape.quadraticCurveTo(0.26, 0.08, 0.3, 0);
  finShape.lineTo(0, 0);
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 2 });
  const finTop = tag(new THREE.Mesh(finGeo, toy(c('finTop', '#ff5d5d'), { side: THREE.DoubleSide })), 'finTop');
  finTop.position.set(-0.28, 0.36, -0.017);
  g.add(finTop);

  const sideFins = [];
  for (const s of [-1, 1]) {
    const fin = tag(new THREE.Mesh(finGeo.clone(), toy(c('finSide', '#ff5d5d'), { side: THREE.DoubleSide })), 'finSide');
    fin.scale.setScalar(0.65);
    fin.position.set(-0.15, -0.08, s * 0.3);
    fin.rotation.set(s * -1.25, 0, -0.9);
    sideFins.push(fin);
    g.add(fin);
  }

  // little bubbles rising from the mouth
  const bubbles = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(sphere(0.035 + i * 0.012, 12), toy('#bfe8ff', { transparent: true, opacity: 0.45, roughness: 0.1 }));
    bubbles.push([b, i]);
    g.add(b);
  }

  g.userData.animate = (t) => {
    tailPivot.rotation.y = Math.sin(t * 6.5) * 0.5;
    for (const f of sideFins) f.rotation.z = -0.9 + Math.sin(t * 5) * 0.25;
    g.rotation.y = Math.sin(t * 1.1) * 0.35;
    g.position.y = Math.sin(t * 2) * 0.07;
    for (const [b, i] of bubbles) {
      const ph = (t * 0.4 + i * 0.33) % 1;
      b.position.set(-0.72 - ph * 0.15, 0.1 + ph * 0.75, Math.sin(ph * 9 + i) * 0.05);
      b.material.opacity = 0.45 * (1 - ph);
    }
  };
  return g;
}

/* ------------------------------------------------------------------ */
/* 🦕 dino                                                              */
/* ------------------------------------------------------------------ */
function dino(c) {
  const g = new THREE.Group();

  const body = tag(new THREE.Mesh(sphere(0.5, 48), toy(c('body', '#6bcb77'))), 'body');
  body.scale.set(1.35, 0.95, 0.85);
  body.position.y = 0.1;
  g.add(body);

  // rounded back plates along the spine (share the body region)
  for (const [x, y, s] of [[-0.18, 0.56, 0.8], [0.02, 0.6, 1], [0.22, 0.56, 0.9], [0.4, 0.44, 0.7]]) {
    const plate = tag(new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.16 * s, 16), toy(c('body', '#57b361'))), 'body');
    plate.scale.z = 0.45;
    plate.position.set(x, y, 0);
    g.add(plate);
  }

  // graceful S-curved neck + head
  const neckPivot = new THREE.Group();
  neckPivot.position.set(-0.42, 0.3, 0);
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.05, 0),
    new THREE.Vector3(-0.14, 0.32, 0),
    new THREE.Vector3(-0.2, 0.66, 0),
    new THREE.Vector3(-0.14, 0.92, 0)
  ]);
  const neck = tag(new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 20, 0.145, 16), toy(c('neck', '#6bcb77'))), 'neck');
  neckPivot.add(neck);
  const headGroup = new THREE.Group();
  headGroup.position.set(-0.14, 0.98, 0);
  const skull = tag(new THREE.Mesh(sphere(0.19), toy(c('head', '#8ee08f'))), 'head');
  skull.scale.set(1.15, 0.95, 0.95);
  headGroup.add(skull);
  const snout = tag(new THREE.Mesh(sphere(0.12), toy(c('head', '#8ee08f'))), 'head');
  snout.scale.set(1.2, 0.8, 0.9);
  snout.position.set(-0.16, -0.05, 0);
  headGroup.add(snout);
  addEyes(headGroup, { x: -0.08, y: 0.08, z: 0, gap: 0.13, r: 0.045, dir: -1 });
  for (const s of [-1, 1]) { // rosy cheeks
    const cheek = new THREE.Mesh(sphere(0.045, 12), toy('#ffb3c1', { roughness: 0.7 }));
    cheek.position.set(-0.1, -0.04, s * 0.15);
    headGroup.add(cheek);
  }
  neckPivot.add(headGroup);
  g.add(neckPivot);

  // tapering tail: a chain of spheres along a curve
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0.52, 0.12, 0);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.28, 0.02, 0),
    new THREE.Vector3(0.52, 0.14, 0),
    new THREE.Vector3(0.68, 0.34, 0)
  ]);
  for (let i = 0; i <= 6; i++) {
    const p = tailCurve.getPoint(i / 6);
    const seg = tag(new THREE.Mesh(sphere(0.16 - i * 0.021, 20), toy(c('tail', '#57b361'))), 'tail');
    seg.position.copy(p);
    tailPivot.add(seg);
  }
  g.add(tailPivot);

  // sturdy legs with toes
  const legGeo = new THREE.CylinderGeometry(0.105, 0.125, 0.5, 20);
  for (const [x, z] of [[-0.3, 0.22], [-0.3, -0.22], [0.3, 0.22], [0.3, -0.22]]) {
    const leg = tag(new THREE.Mesh(legGeo, toy(c('legs', '#4f9e58'))), 'legs');
    leg.position.set(x, -0.38, z);
    g.add(leg);
    const foot = tag(new THREE.Mesh(sphere(0.135, 16), toy(c('legs', '#4f9e58'))), 'legs');
    foot.scale.set(1.25, 0.5, 1.1);
    foot.position.set(x - 0.02, -0.62, z);
    g.add(foot);
  }

  g.position.y = 0.25;
  g.userData.animate = (t) => {
    neckPivot.rotation.z = Math.sin(t * 1.3) * 0.1;
    neckPivot.rotation.x = Math.sin(t * 0.9) * 0.05;
    tailPivot.rotation.y = Math.sin(t * 2.1) * 0.28;
    g.rotation.y = Math.sin(t * 0.45) * 0.3;
    const breathe = 1 + Math.sin(t * 1.8) * 0.012;
    body.scale.set(1.35 * breathe, 0.95 * breathe, 0.85 * breathe);
  };
  return g;
}

/* ------------------------------------------------------------------ */
/* ✨ generic sparkle creature for AI-generated topics                  */
/* ------------------------------------------------------------------ */
function crystal(c, colors) {
  const g = new THREE.Group();
  const names = Object.keys(colors);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0),
    toy(colors[names[0]] || '#9b5de5', { roughness: 0.25, clearcoat: 1 }));
  g.add(core);
  const orbiters = [];
  const rest = names.slice(1);
  const n = Math.max(rest.length, 3);
  for (let i = 0; i < n; i++) {
    const orb = new THREE.Mesh(sphere(0.1, 16),
      toy(colors[rest[i % Math.max(rest.length, 1)]] || ['#ffd93d', '#4d96ff', '#f15bb5'][i % 3]));
    orbiters.push([orb, (i / n) * Math.PI * 2]);
    g.add(orb);
  }
  g.userData.animate = (t) => {
    core.rotation.y = t * 0.8;
    core.rotation.x = Math.sin(t * 0.5) * 0.3;
    for (const [orb, phase] of orbiters) {
      orb.position.set(Math.cos(t * 1.2 + phase) * 0.8, Math.sin(t * 2 + phase) * 0.25, Math.sin(t * 1.2 + phase) * 0.8);
    }
  };
  return g;
}
