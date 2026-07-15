import './style.css';
import { TOPICS, PALETTE } from './topics.js';
import { openViewer } from './viewer.js';
import { askLuna } from './chat.js';
import { sheetSvg } from './sheet.js';

const CUSTOM = {}; // AI-generated topics live here for the session
const state = { topic: null, colors: {}, selected: PALETTE[0] };

const $ = (sel, el = document) => el.querySelector(sel);
const app = $('#app');

/* ---------------- routing ---------------- */
window.addEventListener('hashchange', route);
route();

function route() {
  const m = location.hash.match(/^#\/color\/([\w-]+)/);
  if (m && getTopic(m[1])) renderStudio(getTopic(m[1]));
  else renderHome();
}

function getTopic(id) {
  return TOPICS[id] || CUSTOM[id] || null;
}

/* ---------------- home ---------------- */
function renderHome() {
  document.body.classList.remove('studio-mode');
  const cards = Object.values({ ...TOPICS, ...CUSTOM }).map((t) => `
    <a class="card" href="#/color/${t.id}">
      <div class="card-art">${t.svg}</div>
      <div class="card-label">${t.emoji} ${t.name}</div>
      <div class="card-tag">${t.tagline || 'An AI-made adventure!'}</div>
    </a>`).join('');

  app.innerHTML = `
    <section class="hero">
      <h1>Color it. Scan it.<br><span class="pop">Watch it come ALIVE!</span></h1>
      <p class="hero-sub">Magical coloring pages that jump off the paper as 3D creatures in AR —
      and every creature loves answering questions!</p>
      <div class="hero-steps">
        <div class="step"><span>1</span>🖍️ Color a page — on screen or printed</div>
        <div class="step"><span>2</span>📱 Tap “Bring to Life” or scan the page</div>
        <div class="step"><span>3</span>🤯 Play with your 3D creature &amp; ask it anything</div>
      </div>
      <div class="hero-cta">
        <a class="btn btn-primary" href="scan.html">📷 Scan a printed page</a>
        <a class="btn btn-etsy" href="https://www.etsy.com/shop/LunaColorAR" target="_blank" rel="noopener">
          🛍️ Get printed coloring books on Etsy
        </a>
      </div>
    </section>

    <section class="gallery">
      <h2>Pick your adventure</h2>
      <div class="grid">${cards}</div>
    </section>

    <section class="ai-create">
      <h2>✨ Dream up ANY page with AI</h2>
      <p>Type anything — “a robot octopus”, “volcano”, “unicorn birthday cake” — and our AI draws a brand-new coloring page with fun facts!</p>
      <form id="ai-form">
        <input id="ai-input" type="text" maxlength="80" placeholder="What do you want to color today?" required>
        <button class="btn btn-primary" type="submit">Create my page!</button>
      </form>
      <p id="ai-status" class="ai-status"></p>
    </section>

    <footer class="footer">
      Made with 🌙 by LunaColor AR • AR powered by the open-source
      <a href="https://github.com/8thwall/8thwall" target="_blank" rel="noopener">8th Wall engine</a>
    </footer>
  `;

  $('#ai-form').addEventListener('submit', onAiCreate);
}

async function onAiCreate(e) {
  e.preventDefault();
  const text = $('#ai-input').value.trim();
  const status = $('#ai-status');
  if (!text) return;
  status.textContent = '🎨 Luna is drawing your page… (about 15 seconds)';
  try {
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: text })
    });
    const data = await r.json();
    if (data.offline) {
      status.textContent = '🔌 AI page maker needs an ANTHROPIC_API_KEY on the server. Try the ready-made pages above!';
      return;
    }
    if (!data.data) throw new Error(data.error || 'no data');
    const t = data.data;
    const id = 'ai-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
    CUSTOM[id] = {
      id,
      name: t.name,
      emoji: t.emoji || '✨',
      model: 'crystal',
      tagline: 'A page imagined just for you!',
      facts: t.facts || [],
      qa: [],
      svg: sanitizeSvg(t.svg),
      regions: {}
    };
    location.hash = `#/color/${id}`;
  } catch (err) {
    status.textContent = '😿 Oops, the AI got tangled in crayons. Try again!';
    console.error(err);
  }
}

function sanitizeSvg(svg) {
  return String(svg)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

/* ---------------- coloring studio ---------------- */
function renderStudio(topic) {
  document.body.classList.add('studio-mode');
  state.topic = topic;
  state.colors = {};

  app.innerHTML = `
    <div class="studio">
      <div class="studio-left">
        <div class="studio-head">
          <a class="btn btn-small" href="#/">← All pages</a>
          <h2>${topic.emoji} ${topic.name}</h2>
        </div>
        <div class="canvas-wrap" id="canvas-wrap">${topic.svg}</div>
        <div class="palette" id="palette"></div>
        <div class="action-row">
          <button class="btn btn-primary" id="btn-live">🪄 Bring to Life in 3D / AR</button>
          <button class="btn" id="btn-print">🖨️ Print this page</button>
          <button class="btn btn-small" id="btn-reset">Start over</button>
        </div>
      </div>

      <aside class="studio-right">
        <div class="luna-card">
          <div class="luna-head"><span class="luna-avatar">🐰</span>
            <div><strong>Luna the Space Bunny</strong><br><small>Ask me anything about ${topic.name.toLowerCase()}!</small></div>
          </div>
          <div class="chat-log" id="chat-log">
            <div class="msg msg-luna">Hi friend! I'm Luna! 🌙 Color the picture, then ask me a question — like “what do you eat?” or “how big are you?”</div>
          </div>
          <form class="chat-form" id="chat-form">
            <input id="chat-input" type="text" maxlength="200" placeholder="Ask Luna a question…" autocomplete="off">
            <button class="btn btn-primary btn-small" type="submit">Ask</button>
          </form>
        </div>
        <div class="facts-card">
          <h3>🌟 Did you know?</h3>
          <ul>${topic.facts.slice(0, 3).map((f) => `<li>${f}</li>`).join('')}</ul>
        </div>
      </aside>
    </div>
  `;

  // tap-to-fill coloring
  const svg = $('#canvas-wrap svg');
  svg.querySelectorAll('[data-region]').forEach((shape) => {
    shape.classList.add('fillable');
    shape.addEventListener('click', () => {
      const region = shape.dataset.region;
      state.colors[region] = state.selected;
      svg.querySelectorAll(`[data-region="${region}"]`)
        .forEach((s) => s.setAttribute('fill', state.selected));
    });
  });

  // palette
  const pal = $('#palette');
  PALETTE.forEach((color, i) => {
    const b = document.createElement('button');
    b.className = 'swatch' + (i === 0 ? ' active' : '');
    b.style.background = color;
    b.title = color;
    b.addEventListener('click', () => {
      state.selected = color;
      pal.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
      b.classList.add('active');
    });
    pal.appendChild(b);
  });
  state.selected = PALETTE[0];

  $('#btn-live').addEventListener('click', () => openViewer(topic, state.colors));
  $('#btn-reset').addEventListener('click', () => renderStudio(topic));
  $('#btn-print').addEventListener('click', () => printSheet(topic));
  $('#chat-form').addEventListener('submit', onAsk);
}

async function onAsk(e) {
  e.preventDefault();
  const input = $('#chat-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  const log = $('#chat-log');
  log.insertAdjacentHTML('beforeend', `<div class="msg msg-kid">${escapeHtml(q)}</div>`);
  const thinking = document.createElement('div');
  thinking.className = 'msg msg-luna';
  thinking.textContent = '🌙 thinking…';
  log.appendChild(thinking);
  log.scrollTop = log.scrollHeight;
  const answer = await askLuna(state.topic, q);
  thinking.textContent = answer;
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

/* ---------------- printable sheet ---------------- */
async function printSheet(topic) {
  document.getElementById('print-sheet')?.remove();

  // Same composition the AR image target was generated from (see src/sheet.js).
  // No QR — the artwork itself is the marker; a tiny footer line tells grown-ups
  // where the scanner lives.
  const sheet = document.createElement('div');
  sheet.id = 'print-sheet';
  sheet.innerHTML = `<div class="ps-frame">${sheetSvg(topic, { printUrl: new URL("scan.html", document.baseURI).href })}</div>`;
  document.body.appendChild(sheet);
  window.print();
}
