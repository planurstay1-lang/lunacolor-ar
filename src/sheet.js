// The printable sheet layout. IMPORTANT: this exact composition is also what
// scripts/make-targets.mjs renders into the 8th Wall image target, so the
// printed page and the tracked image stay identical.
//
// No QR code: the artwork itself IS the marker. The scanner recognizes which
// page it's looking at through image tracking alone.

const INK = '#2b2b52';

export function sheetSvg(topic, { printUrl = null } = {}) {
  const art = topic.svg
    .replace('<svg', '<svg x="60" y="150" width="680" height="680"')
    .replace(/viewBox="0 0 400 400"/, 'viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet"');
  const dots = Array.from({ length: 26 }, (_, i) => {
    const t = i / 26 * Math.PI * 2;
    const x = 400 + Math.cos(t) * 355, y = 500 + Math.sin(t) * 460;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${6 + (i % 3) * 3}" fill="${INK}"/>`;
  }).join('');
  // print-time only: a whisper-small URL line (negligible for tracking)
  const urlLine = printUrl
    ? `<text x="400" y="972" text-anchor="middle" font-family="Arial" font-size="13" fill="${INK}" opacity="0.75">scanner: ${printUrl}</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    <rect width="800" height="1000" fill="white"/>
    <rect x="18" y="18" width="764" height="964" rx="26" fill="none" stroke="${INK}" stroke-width="10"/>
    <rect x="38" y="38" width="724" height="924" rx="18" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="22 14"/>
    ${dots}
    <text x="400" y="95" text-anchor="middle" font-family="Arial Black, Arial" font-size="44" font-weight="900" fill="${INK}">${topic.emoji} ${topic.name.toUpperCase()}</text>
    <text x="400" y="132" text-anchor="middle" font-family="Arial" font-size="22" fill="${INK}">LunaColor AR &#8226; color me, then scan me!</text>
    ${art}
    <text x="400" y="905" text-anchor="middle" font-family="Arial" font-size="21" font-weight="bold" fill="${INK}">1. Color me!  2. Open the LunaColor scanner!  3. Point the camera at me!</text>
    <text x="400" y="945" text-anchor="middle" font-family="Arial" font-size="18" fill="${INK}">lunacolor-ar &#8226; page: ${topic.id}</text>
    ${urlLine}
  </svg>`;
}
