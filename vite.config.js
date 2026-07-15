import { defineConfig } from 'vite';

const KEY = process.env.ANTHROPIC_API_KEY;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function claude(system, user, maxTokens = 600) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  if (!r.ok) throw new Error('Anthropic API error ' + r.status);
  const data = await r.json();
  return data.content.map((b) => b.text || '').join('');
}

const apiPlugin = {
  name: 'lunacolor-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next();
      res.setHeader('content-type', 'application/json');
      try {
        const body = await readBody(req);

        if (req.url === '/api/ask') {
          if (!KEY) return res.end(JSON.stringify({ offline: true }));
          const system =
            'You are Luna, a cheerful space-bunny who teaches curious kids aged 4 to 9. ' +
            'Answer in one to three short, simple, joyful sentences. Never use scary, violent or grown-up content. ' +
            `The child is asking about: ${body.topicName}. ` +
            `Fun facts you know: ${(body.facts || []).join(' ')}`;
          const reply = await claude(system, String(body.question || '').slice(0, 500));
          return res.end(JSON.stringify({ reply }));
        }

        if (req.url === '/api/generate') {
          if (!KEY) return res.end(JSON.stringify({ offline: true }));
          const system =
            'You design simple coloring pages for young kids. Respond ONLY with valid JSON, no markdown fences.';
          const user =
            `Create a coloring page about "${String(body.topic || '').slice(0, 100)}". ` +
            'Return JSON with keys: name (short title), emoji (one emoji), ' +
            'facts (array of 5 short kid-friendly fun facts), ' +
            'svg (one SVG string, viewBox="0 0 400 400", containing 4 to 6 big simple shapes — path/circle/ellipse/rect — ' +
            'each with fill="white", stroke="#2b2b52", stroke-width="6", and a data-region attribute naming that body part). ' +
            'The shapes together must look like the subject. No <script>, no event attributes.';
          let text = await claude(system, user, 2500);
          text = text.replace(/```json|```/g, '').trim();
          const data = JSON.parse(text);
          return res.end(JSON.stringify({ data }));
        }

        res.statusCode = 404;
        res.end('{}');
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(e && e.message || e) }));
      }
    });
  }
};

export default defineConfig({
  // set VITE_BASE=/repo-name/ when building for GitHub Pages
  base: process.env.VITE_BASE || '/',
  plugins: [apiPlugin],
  // dev convenience: allow phone access through an HTTPS tunnel (cloudflared)
  server: { host: true, allowedHosts: true },
  build: {
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        scan: new URL('./scan.html', import.meta.url).pathname
      }
    }
  }
});
