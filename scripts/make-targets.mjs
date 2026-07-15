// Renders each coloring page to a PNG (the same artwork that gets printed),
// ready to be processed by `npx @8thwall/image-target-cli` into tracking data.
// Usage: node scripts/make-targets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { TOPICS } from '../src/topics.js';
import { sheetSvg } from '../src/sheet.js';

const OUT = new URL('../targets-src/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

for (const topic of Object.values(TOPICS)) {
  const svg = sheetSvg(topic);
  writeFileSync(`${OUT}${topic.id}.svg`, svg);
  await sharp(Buffer.from(svg), { density: 150 }).png().toFile(`${OUT}${topic.id}.png`);
  console.log(`rendered ${topic.id}.png`);
}
console.log('Done. Now run: npx @8thwall/image-target-cli for each PNG in targets-src/');
