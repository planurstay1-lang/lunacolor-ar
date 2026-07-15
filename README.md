# 🌙 LunaColor AR

Magical coloring pages for kids: color a page (on screen or printed), then watch it
come alive as an animated 3D creature in AR — and ask it anything.

Inspired by lunarkids.io. AR powered by the **open-source 8th Wall engine**
(free, MIT-licensed framework + free distributed engine binary).

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
```

Optional — enable the real AI (Luna's Claude-powered answers + the "Dream up ANY page" generator):

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Without a key everything still works: Luna answers from each topic's built-in
fact bank, and the AI page maker shows a friendly "needs a key" note.

## How the physical-page AR works — no QR codes

**The artwork itself is the marker.** Open `/scan.html` once and point the
camera at ANY LunaColor page — the engine recognizes which drawing it sees
and summons that page's creature.

1. `src/sheet.js` composes the printable sheet (frame + title + line art).
   The **Print** button in the studio prints exactly this sheet.
2. `scripts/make-targets.mjs` renders the *same* sheet to PNG (`targets-src/`).
3. `npx @8thwall/image-target-cli` turns each PNG into tracking data
   (already generated into `public/targets/`), named after its topic id.
4. `/scan.html` loads **all** targets into the self-hosted 8th Wall engine
   (`public/external/xr/xr.js`); on `imagefound` it reads `detail.name` to know
   which page is in view and anchors that topic's animated 3D model to the
   paper — while live-texturing it with the kid's coloring.

### Using professional 3D models

Drop a GLB file at `public/models/<topicId>.glb` (e.g. `public/models/dino.glb`)
and it replaces the procedural model everywhere — all of its animation clips
play in an **infinite loop**, lunarkids-style. `public/models/fish.glb` (a CC0
Khronos sample) is included as a working demo; swap it for kid-friendly art.
Good free sources: poly.pizza (CC0 filter), Quaternius packs, Sketchfab CC0.

Exception: if the kid has colored the page on screen, the in-app viewer keeps
the procedural model so the creature wears exactly the colors they painted.

On the scan page, once the creature appears it **stays and keeps animating**
even if tracking is lost — pointing back at the page re-anchors it.

### 🎨 LIVE 3D coloring (the lunarkids effect)

On the scan page the creature's skin **is the physical page**, streamed live:
crayon strokes appear on the animated 3D model in real time while the kid
colors. How it works (`src/live-texture.js` + `applyPageTexture` in
`src/models.js`):

1. A capture pipeline module sits **between** the 8th Wall camera-feed pass and
   the Three.js render pass, so each frame it can read a clean image of the
   paper — the model never occludes it and there is no flicker.
2. Using the tracked page pose, a lattice of page points is projected into the
   camera frame; the page is unwarped flat via a triangle-mesh homography
   (perspective-correct) into a 512px canvas texture, ~6× per second.
3. Every model part's UVs are remapped into its region's rectangle on the page,
   so the body of the rocket literally wears whatever is drawn inside the
   rocket-body outline — stripes, dots, glitter pen, everything.
4. The **"Live coloring"** button freezes/unfreezes the stream, so kids can
   lock in a look they love.

Tips: bright even light, keep the page flat, hold the phone roughly facing the
page. Note: live texturing uses the procedural models (their UVs map to the
page regions); GLB models in `public/models/` are used by the in-app 3D viewer.

### Adding a new page

1. Add a topic in `src/topics.js` (SVG shapes need `data-region` attributes).
2. Add a matching 3D builder in `src/models.js` (or let it fall back to the sparkle creature).
3. Regenerate targets:
   ```bash
   node scripts/make-targets.mjs
   printf 'targets-src/<id>.png\n\n\npublic/targets\n<id>\n' | npx -y @8thwall/image-target-cli
   ```
4. Patch the JSON's `imagePath` to `/targets/<id>_luminance.png`.

## Testing AR on a phone

Cameras require HTTPS. Easiest options:

- Deploy (`npm run build` → any static host + a tiny `/api` function), or
- Local network: `npx vite --host` behind an HTTPS tunnel (e.g. `cloudflared tunnel --url http://localhost:5173`).

Then print a page (or display the PNG from `targets-src/`), scan its QR with a
phone, allow the camera, and point it at the page.

Note: colored-in pages usually track *better* than blank ones (more visual
features). The decorative frame and dots on the sheet exist to guarantee a
trackable baseline.

## Attribution

The 8th Wall distributed engine binary is used under its limited-use license —
see `public/external/xr/LICENSE` and the
[attribution guidelines](https://8thwall.org/docs/open-source).

## Selling physical copies

See [ETSY-LISTING-KIT.md](./ETSY-LISTING-KIT.md).
