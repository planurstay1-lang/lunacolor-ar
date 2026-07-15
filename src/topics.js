// Built-in coloring topics. Each SVG shape with a data-region attribute is a
// tap-to-fill zone, and the same region names drive the 3D model's colors.

export const PALETTE = [
  '#ff5d5d', '#ff9f43', '#ffd93d', '#6bcB77', '#4d96ff',
  '#9b5de5', '#f15bb5', '#00c2d1', '#8d5524', '#f8f9fa',
  '#495057', '#212529'
];

const STROKE = 'stroke="#2b2b52" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"';

export const TOPICS = {
  rocket: {
    id: 'rocket',
    name: 'Blast-Off Rocket',
    emoji: '🚀',
    model: 'rocket',
    tagline: 'Color it, then launch it into your living room!',
    facts: [
      'Rockets have to go 40 times faster than a race car to reach space!',
      'The flame under a rocket is hotter than lava.',
      'Astronauts float inside their rocket because they are falling around Earth.',
      'The biggest rockets are taller than a 30-floor building.',
      'Rockets push hot gas down, and that pushes the rocket up — like letting go of a balloon!'
    ],
    qa: [
      { k: ['fast', 'speed'], a: 'Rockets zoom at about 28,000 km per hour — that is 40 race cars stuck together fast! 🚀' },
      { k: ['hot', 'flame', 'fire'], a: 'The rocket flame is around 3,000°C — way hotter than lava! That is why rockets need super strong metal.' },
      { k: ['moon'], a: 'A rocket can reach the Moon in about 3 days. Pack snacks — it is 384,000 km away!' },
      { k: ['astronaut', 'float'], a: 'Astronauts float because they are falling around the Earth in a big circle. It feels like a forever roller-coaster drop!' },
      { k: ['why', 'how', 'fly', 'work'], a: 'A rocket pushes hot gas DOWN really hard, and that pushes the rocket UP. Try letting go of a blown-up balloon — same trick!' }
    ],
    svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <g ${STROKE} fill="white">
        <path data-region="flame" d="M172 292 Q200 385 228 292 Q200 322 172 292 Z"/>
        <path data-region="finLeft" d="M162 225 L100 322 L162 296 Z"/>
        <path data-region="finRight" d="M238 225 L300 322 L238 296 Z"/>
        <path data-region="body" d="M160 125 h80 v150 q0 20 -20 20 h-40 q-20 0 -20 -20 Z"/>
        <path data-region="nose" d="M160 128 Q200 22 240 128 Z"/>
        <circle data-region="window" cx="200" cy="185" r="30"/>
      </g>
      <circle cx="200" cy="185" r="18" fill="none" stroke="#2b2b52" stroke-width="4"/>
      <circle cx="80" cy="90" r="4" fill="#2b2b52"/><circle cx="330" cy="70" r="4" fill="#2b2b52"/>
      <circle cx="320" cy="360" r="4" fill="#2b2b52"/><circle cx="60" cy="350" r="4" fill="#2b2b52"/>
    </svg>`,
    regions: {
      nose: 'Nose cone', body: 'Rocket body', window: 'Window',
      finLeft: 'Left fin', finRight: 'Right fin', flame: 'Flame'
    }
  },

  butterfly: {
    id: 'butterfly',
    name: 'Flutter Butterfly',
    emoji: '🦋',
    model: 'butterfly',
    tagline: 'Give it rainbow wings and watch it flap!',
    facts: [
      'Butterflies taste food with their FEET!',
      'A butterfly starts life as a caterpillar, then transforms inside a chrysalis.',
      'Some butterflies fly 4,000 km to find warm weather — like a tiny airplane trip.',
      'Butterfly wings are covered in thousands of tiny sparkly scales.',
      'Butterflies drink flower juice called nectar through a curly straw tongue.'
    ],
    qa: [
      { k: ['eat', 'food', 'drink'], a: 'Butterflies sip sweet flower juice called nectar through a curly straw tongue called a proboscis. Slurp! 🌸' },
      { k: ['taste', 'feet', 'foot'], a: 'Fun and silly but true: butterflies taste with their FEET! They stomp on a leaf to see if it is yummy.' },
      { k: ['caterpillar', 'born', 'baby', 'grow'], a: 'Every butterfly was once a caterpillar! It wraps itself in a chrysalis, and inside it transforms — like magic, but real!' },
      { k: ['fly', 'far', 'fast'], a: 'Monarch butterflies fly up to 4,000 km to stay warm in winter. That is like you walking across a whole country!' },
      { k: ['wing', 'color'], a: 'Their wings are covered in thousands of teeny sparkly scales, like a mosaic made of glitter dust!' }
    ],
    svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <g ${STROKE} fill="white">
        <path data-region="wingTopLeft" d="M182 175 C 110 70 25 110 45 195 C 60 250 140 245 182 205 Z"/>
        <path data-region="wingTopRight" d="M218 175 C 290 70 375 110 355 195 C 340 250 260 245 218 205 Z"/>
        <path data-region="wingBottomLeft" d="M184 215 C 108 245 75 330 135 345 C 180 352 192 282 190 235 Z"/>
        <path data-region="wingBottomRight" d="M216 215 C 292 245 325 330 265 345 C 220 352 208 282 210 235 Z"/>
        <ellipse data-region="body" cx="200" cy="215" rx="20" ry="75"/>
        <circle data-region="head" cx="200" cy="118" r="24"/>
      </g>
      <path d="M190 98 Q175 62 152 56" fill="none" stroke="#2b2b52" stroke-width="5" stroke-linecap="round"/>
      <path d="M210 98 Q225 62 248 56" fill="none" stroke="#2b2b52" stroke-width="5" stroke-linecap="round"/>
      <circle cx="192" cy="114" r="4" fill="#2b2b52"/><circle cx="208" cy="114" r="4" fill="#2b2b52"/>
    </svg>`,
    regions: {
      head: 'Head', body: 'Body',
      wingTopLeft: 'Top left wing', wingTopRight: 'Top right wing',
      wingBottomLeft: 'Bottom left wing', wingBottomRight: 'Bottom right wing'
    }
  },

  fish: {
    id: 'fish',
    name: 'Bubbles the Fish',
    emoji: '🐠',
    model: 'fish',
    tagline: 'Paint your own reef buddy — then watch it swim!',
    facts: [
      'Fish breathe underwater using special slits called gills.',
      'Some fish can glow in the dark like a nightlight!',
      'Fish sleep with their eyes open — they have no eyelids.',
      'The ocean is home to over 30,000 kinds of fish.',
      'Clownfish live inside stinging sea anemones and never get stung!'
    ],
    qa: [
      { k: ['breathe', 'water', 'gill'], a: 'Fish breathe with gills — special slits that grab air right out of the water. Built-in scuba gear! 🐠' },
      { k: ['sleep'], a: 'Fish sleep with their eyes OPEN because they have no eyelids. Imagine never blinking!' },
      { k: ['glow', 'dark', 'light'], a: 'Some deep-sea fish glow in the dark like little nightlights, to find friends in the deep dark ocean!' },
      { k: ['eat', 'food'], a: 'Most little fish munch on tiny plants, bugs, and teeny sea creatures called plankton. Yum yum!' },
      { k: ['how many', 'kinds', 'types'], a: 'There are more than 30,000 kinds of fish — more than all birds, lizards, and furry animals put together!' }
    ],
    svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <g ${STROKE} fill="white">
        <path data-region="tail" d="M282 200 L365 133 L349 200 L365 267 Z"/>
        <path data-region="finTop" d="M162 142 Q205 62 252 148 Z"/>
        <ellipse data-region="body" cx="182" cy="205" rx="115" ry="75"/>
        <path data-region="finSide" d="M148 213 Q190 193 216 228 Q180 262 148 213 Z"/>
      </g>
      <circle cx="112" cy="182" r="12" fill="#2b2b52"/>
      <path d="M82 226 Q94 238 110 232" fill="none" stroke="#2b2b52" stroke-width="5" stroke-linecap="round"/>
      <circle cx="320" cy="85" r="12" fill="none" stroke="#2b2b52" stroke-width="4"/>
      <circle cx="345" cy="55" r="8" fill="none" stroke="#2b2b52" stroke-width="4"/>
      <circle cx="60" cy="330" r="10" fill="none" stroke="#2b2b52" stroke-width="4"/>
    </svg>`,
    regions: { body: 'Body', tail: 'Tail', finTop: 'Top fin', finSide: 'Side fin' }
  },

  dino: {
    id: 'dino',
    name: 'Dara the Dino',
    emoji: '🦕',
    model: 'dino',
    tagline: 'A friendly long-neck dinosaur, back from 150 million years ago!',
    facts: [
      'Long-neck dinosaurs like Brachiosaurus were as tall as a 4-floor building.',
      'Dinosaurs lived a very very long time ago — millions of years before people.',
      'Some dinosaurs were as small as a chicken!',
      'Birds are actually tiny dinosaur cousins that are still alive today.',
      'A long-neck dino could eat 400 kg of leaves in one day — that is a bathtub full!'
    ],
    qa: [
      { k: ['big', 'tall', 'size'], a: 'Long-neck dinos were as tall as a 4-floor building! They could peek into a window at the tippy top. 🦕' },
      { k: ['eat', 'food'], a: 'Dara eats plants — up to 400 kg of leaves a day! That is a whole bathtub stuffed with salad.' },
      { k: ['alive', 'now', 'today', 'real', 'extinct'], a: 'Big dinosaurs are gone now, but guess what — birds are their tiny cousins! So a pigeon is kind of a mini dinosaur.' },
      { k: ['when', 'ago', 'old'], a: 'Dinosaurs lived around 150 MILLION years ago. That is before people, before dogs, before ice cream!' },
      { k: ['small', 'little'], a: 'Not all dinos were giants — some were as small as a chicken and probably just as silly!' }
    ],
    svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <g ${STROKE} fill="white">
        <rect data-region="legs" x="172" y="290" width="36" height="62" rx="16"/>
        <rect data-region="legs" x="252" y="290" width="36" height="62" rx="16"/>
        <path data-region="tail" d="M298 252 Q382 232 388 165 Q372 258 292 293 Z"/>
        <path data-region="neck" d="M138 252 C 108 190 112 128 142 98 L 180 120 C 162 160 166 212 190 248 Z"/>
        <ellipse data-region="body" cx="228" cy="263" rx="100" ry="60"/>
        <ellipse data-region="head" cx="152" cy="92" rx="36" ry="27"/>
      </g>
      <circle cx="162" cy="86" r="5" fill="#2b2b52"/>
      <path d="M128 102 Q138 110 150 107" fill="none" stroke="#2b2b52" stroke-width="4" stroke-linecap="round"/>
      <path d="M60 355 h280" fill="none" stroke="#2b2b52" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 26"/>
    </svg>`,
    regions: { head: 'Head', neck: 'Neck', body: 'Body', tail: 'Tail', legs: 'Legs' }
  }
};
