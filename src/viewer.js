// In-app 3D viewer with WebXR AR support (works on AR-capable phones;
// falls back to a touch/drag orbit view everywhere else).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { getModel } from './models.js';

export async function openViewer(topic, colors) {
  const overlay = document.createElement('div');
  overlay.className = 'viewer-overlay';
  overlay.innerHTML = `
    <div class="viewer-top">
      <span class="viewer-title">${topic.emoji} ${topic.name} is ALIVE!</span>
      <button class="btn btn-small viewer-close">✕ Close</button>
    </div>
    <p class="viewer-hint">Drag to spin • Pinch or scroll to zoom</p>
  `;
  document.body.appendChild(overlay);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  overlay.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 40);
  camera.position.set(0, 0.5, 2.4);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899ff, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  const model = await getModel(topic.id, topic.model, colors);
  scene.add(model);

  // frame the camera to fit whatever creature we got
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.5);
  camera.position.set(center.x, center.y + maxDim * 0.3, center.z + maxDim * 1.55);

  // Confetti burst so the reveal feels magical.
  const confetti = makeConfetti();
  scene.add(confetti.points);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.copy(center);

  let inAR = false;
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-ar').then((ok) => {
      if (!ok) return;
      const arBtn = ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
      arBtn.classList.add('webxr-ar-button');
      overlay.appendChild(arBtn);
    }).catch(() => {});
  }
  renderer.xr.addEventListener('sessionstart', () => {
    inAR = true;
    model.position.set(0, -0.4, -1.3);
    model.scale.setScalar(0.6);
  });
  renderer.xr.addEventListener('sessionend', () => {
    inAR = false;
    model.position.set(0, 0, 0);
    model.scale.setScalar(1);
  });

  const clock = new THREE.Clock();
  let elapsed = 0;
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    elapsed += dt;
    const t = elapsed;
    model.userData.animate?.(t, dt);
    confetti.update(t);
    if (!inAR) controls.update();
    renderer.render(scene, camera);
  });

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  overlay.querySelector('.viewer-close').addEventListener('click', () => {
    window.removeEventListener('resize', onResize);
    renderer.setAnimationLoop(null);
    renderer.dispose();
    overlay.remove();
  });
}

function makeConfetti() {
  const N = 120;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const seed = [];
  const palette = [[1, 0.36, 0.36], [1, 0.62, 0.26], [1, 0.85, 0.24], [0.42, 0.8, 0.47], [0.3, 0.59, 1], [0.61, 0.36, 0.9]];
  for (let i = 0; i < N; i++) {
    const c = palette[i % palette.length];
    col.set(c, i * 3);
    seed.push({ a: Math.random() * Math.PI * 2, r: 0.6 + Math.random() * 1.2, s: 0.5 + Math.random(), y: Math.random() * 2 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.9 }));
  return {
    points,
    update(t) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const s = seed[i];
        p[i * 3] = Math.cos(s.a + t * s.s) * s.r;
        p[i * 3 + 1] = ((s.y + t * 0.3 * s.s) % 2.2) - 0.8;
        p[i * 3 + 2] = Math.sin(s.a + t * s.s) * s.r;
      }
      geo.attributes.position.needsUpdate = true;
    }
  };
}
