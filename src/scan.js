// TRUE page-scanning AR, powered by the 8th Wall engine.
// No QR codes: every coloring page's artwork is its own image target. Open
// /scan.html once, point at ANY LunaColor page, and the engine recognizes
// which drawing it sees and summons that creature — standing on the paper,
// wearing the kid's coloring via the live page texture.
import * as THREE from 'three';
import { TOPICS } from './topics.js';
import { buildModel, applyPageTexture } from './models.js';
import { PageTexture, computeRegionRects } from './live-texture.js';

// The 8th Wall Threejs pipeline module looks for a global THREE.
window.THREE = THREE;

const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Desktops can't run the AR camera session — hand the visitor a QR that
// opens this exact scanner on their phone instead.
async function showPhoneCard() {
  const { default: QRCode } = await import('qrcode');
  const qr = await QRCode.toDataURL(location.href, { width: 220, margin: 2, color: { dark: '#2b2b52' } });
  fail('Grab a phone! 📱',
    `The camera magic runs on phones and tablets. Scan this with your phone camera to open the scanner there:<br><br>` +
    `<img src="${qr}" alt="QR to this scanner" style="width:180px;height:180px;border-radius:12px;background:#fff;padding:6px"><br>` +
    `<small>${location.href}</small>`);
}

const statusCard = document.getElementById('status-card');
const statusTitle = document.getElementById('status-title');
const statusText = document.getElementById('status-text');
const banner = document.getElementById('banner');
const liveBtn = document.getElementById('btn-capture');
const startBtn = document.getElementById('btn-start');

// iOS requires a user tap before a page may read motion sensors.
async function requestMotionPermission() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      await DeviceMotionEvent.requestPermission();
    }
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      await DeviceOrientationEvent.requestPermission();
    }
  } catch {
    // declined or unavailable — the engine will do what it can without IMU
  }
}

function fail(title, text) {
  statusCard.classList.remove('hidden');
  statusTitle.textContent = title;
  statusText.innerHTML = text;
}

// target name (= topic id) -> target JSON
const targets = {};
async function loadAllTargets() {
  await Promise.all(Object.keys(TOPICS).map(async (id) => {
    const r = await fetch(`targets/${id}.json`);
    if (!r.ok) return;
    const data = await r.json();
    // resolve the luminance image against wherever the site is hosted
    data.imagePath = new URL(data.imagePath.replace(/^\//, ''), document.baseURI).href;
    targets[id] = data;
  }));
  if (!Object.keys(targets).length) throw new Error('no image targets found');
}

// ---- shared state between the two pipeline modules ----
const state = {
  elapsed: 0,
  topicId: null,       // which page the camera currently sees
  lastPose: null,
  lastSeen: -10,
  live: true,
  textured: false,
  pageTex: null,
  rects: null,
  model: null
};

/**
 * Runs BETWEEN the camera-feed draw and the 3D render, so it always sees a
 * clean image of the paper (never the model) — no flicker, fully live.
 */
function liveTextureModule() {
  let lastUpdate = -1;
  return {
    name: 'lunacolor-livetexture',
    onRender: () => {
      if (!state.live || !state.lastPose || !state.pageTex) return;
      if (state.elapsed - state.lastSeen > 0.8) return;          // pose stale
      if (state.elapsed - lastUpdate < 0.15) return;              // ~6 fps
      const xrScene = window.XR8.Threejs.xrScene();
      if (!xrScene) return;
      lastUpdate = state.elapsed;
      try {
        const gl = xrScene.renderer.getContext();
        const ok = state.pageTex.update(gl, xrScene.camera, state.lastPose);
        // Keep the vivid default outfit until the page actually has crayon on
        // it — a blank page would otherwise dress the creature in white paper.
        if (ok && !state.textured && state.model && state.pageTex.coloredFraction > 0.02) {
          applyPageTexture(state.model, state.pageTex.texture, state.rects);
          state.textured = true;
          const t = TOPICS[state.topicId];
          banner.textContent = `🎨 ${t.emoji} is wearing YOUR coloring — keep coloring, it updates live!`;
        }
      } catch (e) {
        console.error('live texture update failed', e);
      }
    }
  };
}

function scenePipelineModule() {
  let anchor = null, stand = null, lift = null;
  let baseScale = 1;
  let foundAt = -1;
  let tableMode = null; // true = page flat on a table, false = upright (screen/wall)
  const _normal = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  // Damped world anchor: while the page is visible we ease toward its pose
  // (no jitter); when it leaves the frame the creature STAYS PUT in the room,
  // held by SLAM — walk around it, it doesn't move.
  const desired = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: 1, has: false };

  // build (or reuse) everything for the page the camera just recognized
  const perTopic = {};
  const switchTo = (id) => {
    state.topicId = id;
    let entry = perTopic[id];
    if (!entry) {
      const topic = TOPICS[id];
      const props = targets[id]?.properties;
      const model = buildModel(topic.model, {});
      const box = new THREE.Box3().setFromObject(model);
      entry = perTopic[id] = {
        model,
        box,
        rects: computeRegionRects(topic, props),
        pageTex: new PageTexture(props),
        textured: false
      };
    }
    if (state.model && state.model !== entry.model) lift.remove(state.model);
    if (state.model !== entry.model) lift.add(entry.model);
    state.model = entry.model;
    state.rects = entry.rects;
    state.pageTex = entry.pageTex;
    state.textured = entry.textured;
    applyMode(true); // re-ground the new model
    foundAt = state.elapsed; // replay the entrance pop for the new creature
  };

  // Orient the creature for how the page is being held:
  // flat on a table → tip it upright so it stands ON the paper;
  // upright on a screen/wall → keep it vertical, floating just in front,
  // so you see it standing in the scene instead of aiming at your face.
  const applyMode = (force = false) => {
    const entry = perTopic[state.topicId];
    if (!entry || tableMode === null) return;
    if (!force && applyMode._last === tableMode) return;
    applyMode._last = tableMode;
    const box = entry.box;
    if (tableMode) {
      stand.rotation.x = Math.PI / 2;
      lift.position.set(0, 0, 0);
      entry.model.position.y = -box.min.y;            // feet on the paper
    } else {
      stand.rotation.x = 0;
      lift.position.set(0, 0, 0.12);                  // pop out of the page
      entry.model.position.y = -(box.min.y + box.max.y) / 2; // centered on it
    }
  };

  const poseFrom = (detail) => {
    const props = targets[detail.name]?.properties;
    const aspect = props ? props.width / props.height : 0.75;
    return {
      position: detail.position,
      rotation: detail.rotation,
      width: detail.scaledWidth || detail.scale * aspect,
      height: detail.scaledHeight || detail.scale
    };
  };

  const show = ({ detail }) => {
    if (!anchor || !TOPICS[detail.name]) return;
    if (detail.name !== state.topicId) {
      switchTo(detail.name);
      const t = TOPICS[detail.name];
      banner.textContent = `✨ ${t.emoji} ${t.name} is ALIVE! Color the page and watch me wear it — live!`;
      liveBtn.classList.remove('hidden');
    }
    // remember textured flag per page
    if (perTopic[detail.name]) perTopic[detail.name].textured = state.textured;
    desired.pos.copy(detail.position);
    desired.quat.copy(detail.rotation);
    desired.scale = detail.scale * 0.9;
    if (!desired.has) {
      // first sighting: snap straight to the page, then ease from here on
      anchor.position.copy(desired.pos);
      anchor.quaternion.copy(desired.quat);
      baseScale = desired.scale;
      desired.has = true;
    }
    // which way is the page facing? (page normal vs world up)
    _normal.set(0, 0, 1).applyQuaternion(_quat.copy(detail.rotation));
    tableMode = Math.abs(_normal.y) > 0.55;
    applyMode();
    state.lastPose = poseFrom(detail);
    state.lastSeen = state.elapsed;
    anchor.visible = true;
  };

  liveBtn.addEventListener('click', () => {
    state.live = !state.live;
    liveBtn.textContent = state.live ? '🎨 Live coloring: ON' : '❄️ Colors frozen — tap to resume';
    banner.textContent = state.live
      ? '🎨 Live coloring back on — your strokes appear on the creature!'
      : '❄️ Frozen! Your creature keeps this look.';
  });

  return {
    name: 'lunacolor-scene',
    onStart: async () => {
      const { scene, camera, renderer } = window.XR8.Threejs.xrScene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8899ff, 1.1));
      const sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(2, 5, 3);
      scene.add(sun);
      // image-based lighting: glossy toy materials reflect a soft room, which
      // reads as "physical object" instead of flat computer graphics
      try {
        const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      } catch (e) { console.warn('env lighting unavailable', e); }

      anchor = new THREE.Group();
      stand = new THREE.Group();
      lift = new THREE.Group();
      stand.add(lift);
      anchor.add(stand);
      anchor.visible = false;
      scene.add(anchor);

      // soft contact shadow on the paper, so the creature feels grounded
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = shadowCanvas.height = 128;
      const sctx = shadowCanvas.getContext('2d');
      const grad = sctx.createRadialGradient(64, 64, 8, 64, 64, 62);
      grad.addColorStop(0, 'rgba(20,20,50,0.45)');
      grad.addColorStop(1, 'rgba(20,20,50,0)');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 128, 128);
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.75, 32),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(shadowCanvas),
          transparent: true, depthWrite: false
        })
      );
      shadow.position.z = 0.005; // just above the page plane
      anchor.add(shadow);

      const clock = new THREE.Clock();
      const tick = () => {
        const dt = clock.getDelta();
        state.elapsed += dt;
        state.model?.userData.animate?.(state.elapsed, dt);
        if (anchor && foundAt >= 0) {
          // damped follow while the page is in view; frozen in the room after
          if (desired.has && state.elapsed - state.lastSeen < 0.6) {
            const k = 1 - Math.pow(0.001, dt); // framerate-independent easing
            anchor.position.lerp(desired.pos, k);
            anchor.quaternion.slerp(desired.quat, k);
            baseScale += (desired.scale - baseScale) * k;
          }
          const p = Math.min((state.elapsed - foundAt) / 0.7, 1);
          const pop = p >= 1 ? 1 : 0.1 + 1.15 * Math.sin(p * Math.PI * 0.62) * p;
          anchor.scale.setScalar(baseScale * Math.max(pop, 0.05));
        }
        requestAnimationFrame(tick);
      };
      tick();

      camera.position.set(0, 2, 2);
      statusCard.classList.add('hidden');
      banner.textContent = '📄 Point your camera at any LunaColor page!';
    },
    listeners: [
      { event: 'reality.imagefound', process: show },
      { event: 'reality.imageupdated', process: show },
      {
        event: 'reality.imagelost',
        process: () => {
          // lunarkids-style: the creature stays and keeps animating forever
          if (anchor?.visible && state.topicId) {
            const t = TOPICS[state.topicId];
            banner.textContent = `${t.emoji} Still here! Point back at the page to keep coloring live.`;
          }
        }
      }
    ]
  };
}

async function start() {
  const XR8 = window.XR8;
  try {
    await loadAllTargets();
    XR8.XrController.configure({
      // SLAM world tracking is the difference between "sticker on the camera
      // feed" and a creature that lives in the room: the phone builds a map,
      // so the model stays planted while you walk around it.
      disableWorldTracking: false,
      imageTargetData: Object.values(targets)
    });
  } catch (e) {
    fail('No scannable pages yet 😿',
      'The image-target data is missing. Generate it with ' +
      '<code>node scripts/make-targets.mjs</code> + the image-target CLI (see README). ' +
      'Meanwhile, <a href="./">play in the coloring studio</a>!');
    return;
  }

  XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(),
    liveTextureModule(),               // reads the clean camera frame…
    XR8.Threejs.pipelineModule(),      // …before the 3D scene draws on top
    XR8.XrController.pipelineModule(),
    {
      name: 'lunacolor-errors',
      onCameraStatusChange: ({ status }) => {
        if (status === 'failed') {
          fail('Camera says no 😢',
            'Please allow camera access and reload — the magic needs to see your page!');
        }
      },
      onException: (err) => {
        console.error(err);
        if (String(err).includes('session manager')) { showPhoneCard(); return; }
        fail('The magic hiccuped 😅',
          'AR could not start on this device. <a href="./">Play in 3D instead!</a>');
      }
    },
    scenePipelineModule()
  ]);

  if (!IS_MOBILE) { showPhoneCard(); return; }

  // Wait for a tap: iOS needs a user gesture before granting motion sensors,
  // and it makes the camera permission prompt feel expected rather than scary.
  statusTitle.textContent = '🌙 Ready for magic!';
  statusText.textContent = 'Tap the button, say YES to the camera, then point at a LunaColor coloring page!';
  startBtn.classList.remove('hidden');
  startBtn.addEventListener('click', async () => {
    startBtn.classList.add('hidden');
    statusTitle.textContent = 'Waking up the magic…';
    statusText.textContent = 'Say yes when it asks to use the camera!';
    await requestMotionPermission();
    XR8.run({ canvas: document.getElementById('camerafeed') });
  }, { once: true });
}

if (window.XR8) start();
else {
  window.addEventListener('xrloaded', start);
  setTimeout(() => {
    if (!window.XR8) {
      fail('AR engine missing 🔧',
        'The 8th Wall engine file was not found at /external/xr/xr.js. ' +
        'Meanwhile, <a href="./">play with the 3D version here</a>!');
    }
  }, 8000);
}
