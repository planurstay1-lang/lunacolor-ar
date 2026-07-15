// LIVE page texturing — the "AR coloring book" effect: every frame we grab
// the camera's view of the physical page, unwarp it flat (perspective-correct,
// via a triangle-mesh homography), and stream it into a THREE texture that the
// 3D creature wears as its skin. The kid's strokes appear on the model in
// real time while they color.
import * as THREE from 'three';

// Art placement inside the printed sheet — MUST match src/sheet.js.
const ART = { x: 60, y: 150, size: 680, sheetW: 800, sheetH: 1000 };

function cropBounds(targetProps = {}) {
  const ow = targetProps.originalWidth || ART.sheetW;
  const oh = targetProps.originalHeight || ART.sheetH;
  return {
    x0: ((targetProps.left || 0) / ow) * ART.sheetW,
    y0: ((targetProps.top || 0) / oh) * ART.sheetH,
    x1: (((targetProps.left || 0) + (targetProps.width || ow)) / ow) * ART.sheetW,
    y1: (((targetProps.top || 0) + (targetProps.height || oh)) / oh) * ART.sheetH
  };
}

/**
 * Per-region rectangles in texture UV space (THREE convention: v=0 bottom),
 * insetted a little so parts sample crayon, not the black outline.
 * Multi-shape regions (e.g. two legs) use the union of their boxes.
 */
export function computeRegionRects(topic, targetProps) {
  const crop = cropBounds(targetProps);
  const cw = crop.x1 - crop.x0, ch = crop.y1 - crop.y0;

  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px;height:400px;visibility:hidden';
  host.innerHTML = topic.svg;
  document.body.appendChild(host);

  const boxes = {};
  for (const shape of host.querySelectorAll('[data-region]')) {
    const r = shape.dataset.region;
    const bb = shape.getBBox();
    const b = boxes[r] || (boxes[r] = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
    b.x0 = Math.min(b.x0, bb.x); b.y0 = Math.min(b.y0, bb.y);
    b.x1 = Math.max(b.x1, bb.x + bb.width); b.y1 = Math.max(b.y1, bb.y + bb.height);
  }
  host.remove();

  const k = ART.size / 400; // art viewBox → sheet px
  const rects = {};
  for (const [region, b] of Object.entries(boxes)) {
    const inset = Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.1;
    const sx0 = ART.x + (b.x0 + inset) * k, sx1 = ART.x + (b.x1 - inset) * k;
    const sy0 = ART.y + (b.y0 + inset) * k, sy1 = ART.y + (b.y1 - inset) * k;
    const fx0 = (sx0 - crop.x0) / cw, fx1 = (sx1 - crop.x0) / cw;
    const fy0 = (sy0 - crop.y0) / ch, fy1 = (sy1 - crop.y0) / ch; // from top
    rects[region] = { u0: fx0, v0: 1 - fy1, w: fx1 - fx0, h: fy1 - fy0 };
  }
  return rects;
}

export class PageTexture {
  constructor(targetProps) {
    const aspect = targetProps?.width && targetProps?.height
      ? targetProps.width / targetProps.height : 0.75;
    this.w = 512;
    this.h = Math.round(512 / aspect);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.cam = document.createElement('canvas');
    this.camCtx = this.cam.getContext('2d');
    this.grid = 6;
    this._vec = new THREE.Vector3();
    this._pos = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this.hasContent = false;
    // fraction of the page carrying real crayon color (0..1) — used to keep
    // the creature in its vivid default outfit until the kid actually colors
    this.coloredFraction = 0;
  }

  /**
   * Read the camera frame (call BEFORE the 3D scene is rendered on top!) and
   * unwarp the tracked page into this.texture.
   * pose = { position, rotation, width, height } (page size in scene units).
   * Returns true if the texture was updated.
   */
  update(gl, camera, pose) {
    const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight;
    this._pos.copy(pose.position);
    this._quat.copy(pose.rotation);

    // project a (grid+1)² lattice of page points into buffer pixels (y-up)
    const G = this.grid;
    const pts = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let gy = 0; gy <= G; gy++) {
      const row = [];
      for (let gx = 0; gx <= G; gx++) {
        const u = gx / G, v = gy / G; // v from top of page
        this._vec.set((u - 0.5) * pose.width, (0.5 - v) * pose.height, 0)
          .applyQuaternion(this._quat).add(this._pos).project(camera);
        if (this._vec.z < -1 || this._vec.z > 1) return false; // behind camera
        const px = ((this._vec.x + 1) / 2) * bw;
        const py = ((this._vec.y + 1) / 2) * bh;
        row.push({ x: px, y: py });
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
      pts.push(row);
    }

    // clamp read window to the buffer; skip if the page is too small on screen
    const x0 = Math.max(0, Math.floor(minX)), y0 = Math.max(0, Math.floor(minY));
    const x1 = Math.min(bw, Math.ceil(maxX)), y1 = Math.min(bh, Math.ceil(maxY));
    const rw = x1 - x0, rh = y1 - y0;
    if (rw < 60 || rh < 60) return false;

    const buf = new Uint8Array(rw * rh * 4);
    gl.readPixels(x0, y0, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, buf);

    // GL rows are bottom-up; flip into a top-down ImageData
    const img = new ImageData(rw, rh);
    for (let r = 0; r < rh; r++) {
      img.data.set(buf.subarray(r * rw * 4, (r + 1) * rw * 4), (rh - 1 - r) * rw * 4);
    }
    this.cam.width = rw; this.cam.height = rh;
    this.camCtx.putImageData(img, 0, 0);

    // buffer px (y-up) → cam canvas px (y-down, local to read window)
    const local = (p) => ({ x: p.x - x0, y: (y1 - 1) - p.y });

    // warp each grid cell (two triangles) into the flat page canvas
    const cw = this.w / G, ch = this.h / G;
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        const s00 = local(pts[gy][gx]), s10 = local(pts[gy][gx + 1]);
        const s01 = local(pts[gy + 1][gx]), s11 = local(pts[gy + 1][gx + 1]);
        // note: texture canvas is top-down like the page (v flip happens in UVs)
        const d00 = { x: gx * cw, y: gy * ch }, d10 = { x: (gx + 1) * cw, y: gy * ch };
        const d01 = { x: gx * cw, y: (gy + 1) * ch }, d11 = { x: (gx + 1) * cw, y: (gy + 1) * ch };
        warpTriangle(this.ctx, this.cam, s00, s10, s01, d00, d10, d01);
        warpTriangle(this.ctx, this.cam, s10, s11, s01, d10, d11, d01);
      }
    }
    this.texture.needsUpdate = true;
    this.hasContent = true;
    this._measureColor();
    return true;
  }

  // Estimate how much of the page is actually colored in. High saturation
  // threshold keeps warm indoor lighting on white paper from counting.
  _measureColor() {
    if (!this._probe) {
      this._probe = document.createElement('canvas');
      this._probe.width = 64;
      this._probe.height = 80;
      this._probeCtx = this._probe.getContext('2d', { willReadFrequently: true });
    }
    this._probeCtx.drawImage(this.canvas, 0, 0, 64, 80);
    const data = this._probeCtx.getImageData(0, 0, 64, 80).data;
    let colored = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn > 45 && mx > 60) colored++;
    }
    this.coloredFraction = colored / n;
  }
}

// Affine-map triangle s0-s1-s2 of img onto triangle d0-d1-d2 of ctx.
function warpTriangle(ctx, img, s0, s1, s2, d0, d1, d2) {
  const den = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(den) < 1e-6) return;
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / den;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / den;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / den;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / den;
  const e = d0.x - a * s0.x - c * s0.y;
  const f = d0.y - b * s0.x - d * s0.y;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y); ctx.lineTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, b, c, d, e, f);
  // expand by a hair to hide seams between triangles
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
