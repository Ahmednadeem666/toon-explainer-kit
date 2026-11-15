// Chibi character generator. Origin = feet center. Character is ~320px tall at scale 1.
// Everything returns SVG markup strings; the engine swaps face/arms per frame.
(function () {
  const OUT = '#2b2522';
  const SW = 4.5;
  const SKIN = {
    light: '#f3dab4', fair: '#f8e3c8', tan: '#e2b98d', olive: '#d1a676',
    brown: '#b07b50', dark: '#7d5133', deep: '#5c3a22',
  };
  const HAIRC = {
    black: '#2a2321', brown: '#5b3a24', blonde: '#e8c46a', red: '#b5502b',
    gray: '#b9b6b0', white: '#efece6', ginger: '#c8692f', blue: '#3b5bb5', pink: '#e17aa4',
  };
  const col = (v, map, d) => (v ? map[v] || v : d);

  const HEAD_Y = -238, HEAD_R = 74;
  const SHOULDER = { L: [-33, -156], R: [33, -156] };

  // Hand positions per pose (relative to feet origin). c = elbow control point (optional).
  const POSES = {
    idle:     { L: [-47, -92], R: [47, -92] },
    point:    { L: [-47, -92], R: [128, -178], cR: [80, -150] },
    pointL:   { L: [-128, -178], R: [47, -92], cL: [-80, -150] },
    wave:     { L: [-47, -92], R: [78, -262], cR: [88, -170] },
    cheer:    { L: [-84, -272], R: [84, -272], cL: [-80, -190], cR: [80, -190] },
    hold:     { L: [-26, -122], R: [26, -122], cL: [-52, -120], cR: [52, -120] },
    holdUp:   { L: [-30, -270], R: [30, -270], cL: [-62, -200], cR: [62, -200] },
    shrug:    { L: [-92, -168], R: [92, -168], cL: [-62, -120], cR: [62, -120] },
    think:    { L: [-47, -92], R: [22, -196], cR: [58, -128] },
    facepalm: { L: [-47, -92], R: [6, -236], cR: [56, -150] },
    hips:     { L: [-40, -104], R: [40, -104], cL: [-74, -130], cR: [74, -130] },
    panic:    { L: [-70, -222], R: [70, -222], cL: [-78, -150], cR: [78, -150] },
    present:  { L: [-47, -92], R: [118, -128], cR: [74, -120] },
    typing:   { L: [-30, -128], R: [30, -128], cL: [-56, -116], cR: [56, -116] },
    salute:   { L: [-47, -92], R: [40, -278], cR: [90, -196] },
    cross:    { L: [24, -128], R: [-24, -128], cL: [-44, -140], cR: [44, -140] },
  };

  function eyesFor(expr, glasses) {
    const ey = HEAD_Y - 4, ex = 25;
    const dot = (x, rx = 6.5, ry = 8.5) => `<ellipse cx="${x}" cy="${ey}" rx="${rx}" ry="${ry}" fill="${OUT}"/><circle cx="${x + 2}" cy="${ey - 3}" r="2" fill="#fff"/>`;
    const closed = (x) => `<path d="M${x - 8},${ey} Q${x},${ey + 5} ${x + 8},${ey}" stroke="${OUT}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    const happyArc = (x) => `<path d="M${x - 8},${ey + 3} Q${x},${ey - 8} ${x + 8},${ey + 3}" stroke="${OUT}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    switch (expr) {
      case 'blink': return closed(-ex) + closed(ex);
      case 'happy': case 'laugh': return happyArc(-ex) + happyArc(ex);
      case 'shocked': return `<circle cx="${-ex}" cy="${ey}" r="11" fill="#fff" stroke="${OUT}" stroke-width="3"/><circle cx="${-ex}" cy="${ey}" r="3.5" fill="${OUT}"/><circle cx="${ex}" cy="${ey}" r="11" fill="#fff" stroke="${OUT}" stroke-width="3"/><circle cx="${ex}" cy="${ey}" r="3.5" fill="${OUT}"/>`;
      case 'smug': case 'tired': return `<path d="M${-ex - 9},${ey - 1} L${-ex + 9},${ey - 1}" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>` + `<path d="M${-ex - 7},${ey - 1} Q${-ex},${ey + 8} ${-ex + 7},${ey - 1}Z" fill="${OUT}"/>` + `<path d="M${ex - 9},${ey - 1} L${ex + 9},${ey - 1}" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>` + `<path d="M${ex - 7},${ey - 1} Q${ex},${ey + 8} ${ex + 7},${ey - 1}Z" fill="${OUT}"/>`;
      case 'dead': return `<path d="M${-ex - 7},${ey - 7} l14,14 m0,-14 l-14,14 M${ex - 7},${ey - 7} l14,14 m0,-14 l-14,14" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>`;
      case 'money': return `<text x="${-ex}" y="${ey + 8}" font-family="Gochi Hand" font-size="26" text-anchor="middle" fill="#2f8f3a">$</text><text x="${ex}" y="${ey + 8}" font-family="Gochi Hand" font-size="26" text-anchor="middle" fill="#2f8f3a">$</text>`;
      default: return dot(-ex) + dot(ex);
    }
  }

  function browsFor(expr) {
    const by = HEAD_Y - 26, ex = 25;
    const line = (x1, y1, x2, y2) => `<path d="M${x1},${y1} L${x2},${y2}" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>`;
    switch (expr) {
      case 'angry': return line(-ex - 11, by - 4, -ex + 9, by + 5) + line(ex + 11, by - 4, ex - 9, by + 5);
      case 'worried': case 'sad': case 'cry': case 'nervous': return line(-ex - 10, by + 4, -ex + 9, by - 4) + line(ex + 10, by + 4, ex - 9, by - 4);
      case 'shocked': return line(-ex - 9, by - 10, -ex + 9, by - 12) + line(ex - 9, by - 12, ex + 9, by - 10);
      case 'smug': return line(-ex - 9, by, -ex + 9, by) + line(ex - 9, by - 7, ex + 9, by - 3);
      case 'confused': return line(-ex - 9, by - 6, -ex + 9, by - 2) + line(ex - 9, by + 3, ex + 9, by + 3);
      default: return '';
    }
  }

  function mouthFor(expr, open) {
    const my = HEAD_Y + 30;
    if (open > 0.05 && !['shocked', 'laugh', 'grin', 'scream'].includes(expr)) {
      const h = 4 + open * 11;
      return `<ellipse cx="0" cy="${my}" rx="${9 + open * 2}" ry="${h}" fill="#5a2a22" stroke="${OUT}" stroke-width="3"/>`;
    }
    switch (expr) {
      case 'happy': case 'smile': return `<path d="M-14,${my - 3} Q0,${my + 11} 14,${my - 3}" stroke="${OUT}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      case 'grin': case 'laugh': return `<path d="M-17,${my - 5} Q0,${my + 22} 17,${my - 5} Z" fill="#5a2a22" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M-12,${my + 6} Q0,${my + 14} 12,${my + 6}" fill="#e46a6a"/>`;
      case 'sad': case 'cry': return `<path d="M-12,${my + 5} Q0,${my - 7} 12,${my + 5}" stroke="${OUT}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      case 'worried': case 'nervous': return `<path d="M-13,${my + 2} q4.3,-5 8.6,0 t8.6,0 t8.6,0" stroke="${OUT}" stroke-width="3.2" fill="none" stroke-linecap="round" transform="translate(-0.5,0)"/>`;
      case 'shocked': case 'scream': return `<ellipse cx="0" cy="${my + 3}" rx="10" ry="14" fill="#5a2a22" stroke="${OUT}" stroke-width="3"/>`;
      case 'angry': return `<rect x="-14" y="${my - 4}" width="28" height="10" rx="3" fill="#fff" stroke="${OUT}" stroke-width="3"/><path d="M-5,${my - 4} v10 M5,${my - 4} v10" stroke="${OUT}" stroke-width="2"/>`;
      case 'smug': return `<path d="M-10,${my + 2} Q4,${my + 6} 15,${my - 6}" stroke="${OUT}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      case 'confused': return `<path d="M-11,${my + 3} L11,${my - 2}" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>`;
      case 'dead': case 'tired': return `<path d="M-10,${my + 2} L10,${my + 2}" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>`;
      case 'money': return `<path d="M-15,${my - 4} Q0,${my + 16} 15,${my - 4}" stroke="${OUT}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      default: return `<path d="M-9,${my} Q0,${my + 3} 9,${my}" stroke="${OUT}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    }
  }

  function extrasFor(expr, t) {
    let s = '';
    if (['worried', 'nervous', 'shocked'].includes(expr)) {
      const bob = Math.sin(t * 6) * 2;
      s += `<path d="M${HEAD_R - 6},${HEAD_Y - 44 + bob} q-9,15 0,20 q9,-5 0,-20Z" fill="#8fd3ff" stroke="${OUT}" stroke-width="2.5"/>`;
    }
    if (['happy', 'grin', 'laugh', 'smile', 'love'].includes(expr)) {
      s += `<ellipse cx="-44" cy="${HEAD_Y + 18}" rx="11" ry="6" fill="#f29a9a" opacity=".55"/><ellipse cx="44" cy="${HEAD_Y + 18}" rx="11" ry="6" fill="#f29a9a" opacity=".55"/>`;
    }
    if (expr === 'cry') {
      const k = (t * 1.6) % 1;
      s += `<path d="M-25,${HEAD_Y + 6} v${18 + k * 20}" stroke="#7cc4ff" stroke-width="5" stroke-linecap="round"/><path d="M25,${HEAD_Y + 6} v${18 + ((k + 0.5) % 1) * 20}" stroke="#7cc4ff" stroke-width="5" stroke-linecap="round"/>`;
    }
    if (expr === 'angry') {
      s += `<path d="M${HEAD_R - 18},${HEAD_Y - 62} l8,8 m-8,0 l8,-8 m6,10 l8,8 m-8,0 l8,-8" stroke="#d6403a" stroke-width="3.5" stroke-linecap="round"/>`;
    }
    if (expr === 'confused') {
      s += `<text x="${HEAD_R + 6}" y="${HEAD_Y - 52}" font-family="Gochi Hand" font-size="42" fill="${OUT}">?</text>`;
    }
    return s;
  }

  function glassesFor(g) {
    if (!g || g === 'none') return '';
    const ey = HEAD_Y - 4;
    if (g === 'sunglasses') return `<path d="M-48,${ey - 10} H48" stroke="${OUT}" stroke-width="4"/><path d="M-46,${ey - 10} h36 q0,22 -18,22 q-18,0 -18,-22Z M10,${ey - 10} h36 q0,22 -18,22 q-18,0 -18,-22Z" fill="#1d1d24" stroke="${OUT}" stroke-width="3"/>`;
    if (g === 'square') return `<rect x="-44" y="${ey - 14}" width="34" height="26" rx="5" fill="#fff" fill-opacity=".25" stroke="${OUT}" stroke-width="3.5"/><rect x="10" y="${ey - 14}" width="34" height="26" rx="5" fill="#fff" fill-opacity=".25" stroke="${OUT}" stroke-width="3.5"/><path d="M-10,${ey - 3} H10" stroke="${OUT}" stroke-width="3.5"/>`;
    return `<circle cx="-25" cy="${ey}" r="16" fill="#fff" fill-opacity=".25" stroke="${OUT}" stroke-width="3.5"/><circle cx="25" cy="${ey}" r="16" fill="#fff" fill-opacity=".25" stroke="${OUT}" stroke-width="3.5"/><path d="M-9,${ey - 2} Q0,${ey - 7} 9,${ey - 2}" stroke="${OUT}" stroke-width="3.5" fill="none"/>`;
  }

  // Hair: returns {back, front}
  function hairFor(style, c) {
    const r = HEAD_R, y = HEAD_Y;
    const st = `fill="${c}" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"`;
    switch (style) {
      case 'none': case 'bald': return { back: '', front: '' };
      case 'short': return { back: '', front: `<path d="M${-r - 2},${y - 2} C${-r - 6},${y - r - 30} ${r + 6},${y - r - 30} ${r + 2},${y - 2} C${r - 6},${y - 40} ${r - 28},${y - 52} ${10},${y - 50} C${-10},${y - 58} ${-40},${y - 38} ${-r - 2},${y - 2}Z" ${st}/>` };
      case 'side': return { back: '', front: `<path d="M${-r - 2},${y + 4} C${-r - 8},${y - r - 32} ${r + 8},${y - r - 32} ${r + 2},${y - 6} C${r - 4},${y - 44} ${r - 40},${y - 62} ${-6},${y - 56} C${-30},${y - 44} ${-56},${y - 32} ${-r - 2},${y + 4}Z" ${st}/><path d="M-6,${y - 56} C10,${y - 70} 30,${y - 74} 52,${y - 66}" stroke="${OUT}" stroke-width="3" fill="none" opacity=".5"/>` };
      case 'spiky': return { back: '', front: `<path d="M${-r},${y - 6} L${-r - 10},${y - 46} L${-r + 18},${y - 52} L${-50},${y - 96} L${-22},${y - 72} L${-8},${y - 112} L${14},${y - 76} L${42},${y - 104} L${46},${y - 64} L${r + 10},${y - 60} L${r - 2},${y - 26} L${r},${y - 6} C${r - 10},${y - 40} ${-r + 10},${y - 40} ${-r},${y - 6}Z" ${st}/>` };
      case 'long': return {
        back: `<path d="M${-r - 6},${y - 10} C${-r - 14},${y + 60} ${-r - 4},${y + 110} ${-r + 6},${y + 120} L${r - 6},${y + 120} C${r + 4},${y + 110} ${r + 14},${y + 60} ${r + 6},${y - 10}Z" ${st}/>`,
        front: `<path d="M${-r - 4},${y + 30} C${-r - 12},${y - r - 32} ${r + 12},${y - r - 32} ${r + 4},${y + 30} C${r - 6},${y - 20} ${r - 22},${y - 46} ${4},${y - 52} C${-24},${y - 44} ${-r + 8},${y - 20} ${-r - 4},${y + 30}Z" ${st}/>` };
      case 'bob': return {
        back: `<path d="M${-r - 8},${y - 10} C${-r - 12},${y + 40} ${-r - 2},${y + 56} ${-r + 10},${y + 58} L${r - 10},${y + 58} C${r + 2},${y + 56} ${r + 12},${y + 40} ${r + 8},${y - 10}Z" ${st}/>`,
        front: `<path d="M${-r - 6},${y + 20} C${-r - 12},${y - r - 32} ${r + 12},${y - r - 32} ${r + 6},${y + 20} C${r - 2},${y - 26} ${r - 20},${y - 34} ${r - 30},${y - 34} L${-r + 30},${y - 34} C${-r + 18},${y - 34} ${-r + 2},${y - 26} ${-r - 6},${y + 20}Z" ${st}/>` };
      case 'bun': return { back: '', front: `<circle cx="0" cy="${y - r - 16}" r="26" ${st}/><path d="M${-r - 2},${y + 2} C${-r - 8},${y - r - 30} ${r + 8},${y - r - 30} ${r + 2},${y + 2} C${r - 8},${y - 40} ${-r + 8},${y - 40} ${-r - 2},${y + 2}Z" ${st}/>` };
      case 'ponytail': return { back: `<path d="M${r - 10},${y - 40} C${r + 50},${y - 40} ${r + 40},${y + 40} ${r + 20},${y + 70} C${r + 14},${y + 30} ${r + 10},${y - 6} ${r - 14},${y - 20}Z" ${st}/>`, front: `<path d="M${-r - 2},${y + 2} C${-r - 8},${y - r - 30} ${r + 8},${y - r - 30} ${r + 2},${y + 2} C${r - 8},${y - 40} ${-r + 8},${y - 40} ${-r - 2},${y + 2}Z" ${st}/>` };
      case 'curly': { let s = ''; for (let i = 0; i < 9; i++) { const a = Math.PI * (1.05 + i * 0.1125); s += `<circle cx="${Math.cos(a) * (r + 2)}" cy="${y + Math.sin(a) * (r + 2)}" r="22" ${st}/>`; } return { back: '', front: s }; }
      case 'afro': return { back: `<circle cx="0" cy="${y - 18}" r="${r + 34}" ${st}/>`, front: '' };
      case 'balding': return { back: '', front: `<path d="M${-r - 4},${y + 12} C${-r - 14},${y - 22} ${-r + 2},${y - 50} ${-r + 22},${y - 46} C${-r + 12},${y - 20} ${-r + 10},${y} ${-r + 6},${y + 14}Z M${r + 4},${y + 12} C${r + 14},${y - 22} ${r - 2},${y - 50} ${r - 22},${y - 46} C${r - 12},${y - 20} ${r - 10},${y} ${r - 6},${y + 14}Z" ${st}/>` };
      case 'bowl': return { back: '', front: `<path d="M${-r - 6},${y - 2} C${-r - 10},${y - r - 36} ${r + 10},${y - r - 36} ${r + 6},${y - 2} L${r - 10},${y - 22} L${-r + 10},${y - 22}Z" ${st}/>` };
      case 'mohawk': return { back: '', front: `<path d="M-14,${y - r + 4} C-20,${y - r - 46} 20,${y - r - 46} 14,${y - r + 4}Z" ${st}/>` };
      default: return hairFor('short', c);
    }
  }

  function hatFor(h, c) {
    const r = HEAD_R, y = HEAD_Y;
    if (!h || h === 'none') return '';
    const o = `stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"`;
    switch (h) {
      case 'hardhat': return `<path d="M${-r + 4},${y - 30} C${-r + 4},${y - r - 40} ${r - 4},${y - r - 40} ${r - 4},${y - 30}Z" fill="${c || '#f2c230'}" ${o}/><rect x="${-r - 12}" y="${y - 36}" width="${2 * r + 24}" height="14" rx="7" fill="${c || '#f2c230'}" ${o}/><path d="M0,${y - r - 18} v40" stroke="${OUT}" stroke-width="3" opacity=".35"/>`;
      case 'tophat': return `<rect x="${-r + 12}" y="${y - r - 92}" width="${2 * r - 24}" height="100" rx="6" fill="${c || '#f4f1ea'}" ${o}/><rect x="${-r + 12}" y="${y - r - 10}" width="${2 * r - 24}" height="16" fill="#c9343a" ${o}/><rect x="${-r - 14}" y="${y - r + 6}" width="${2 * r + 28}" height="14" rx="7" fill="${c || '#f4f1ea'}" ${o}/>`;
      case 'cap': return `<path d="M${-r + 2},${y - 24} C${-r + 2},${y - r - 36} ${r - 2},${y - r - 36} ${r - 2},${y - 24}Z" fill="${c || '#2e6fd8'}" ${o}/><path d="M${r - 10},${y - 30} Q${r + 46},${y - 34} ${r + 52},${y - 18} L${r - 4},${y - 18}Z" fill="${c || '#2e6fd8'}" ${o}/>`;
      case 'beanie': return `<path d="M${-r + 2},${y - 22} C${-r},${y - r - 40} ${r},${y - r - 40} ${r - 2},${y - 22}Z" fill="${c || '#c9343a'}" ${o}/><rect x="${-r - 4}" y="${y - 34}" width="${2 * r + 8}" height="20" rx="8" fill="${c || '#c9343a'}" ${o}/><circle cx="0" cy="${y - r - 26}" r="12" fill="#fff" ${o}/>`;
      case 'crown': return `<path d="M-46,${y - r + 6} L-52,${y - r - 46} L-24,${y - r - 18} L0,${y - r - 56} L24,${y - r - 18} L52,${y - r - 46} L46,${y - r + 6}Z" fill="${c || '#f2c230'}" ${o}/>`;
      case 'hairnet': return `<path d="M${-r - 4},${y - 6} C${-r - 10},${y - r - 34} ${r + 10},${y - r - 34} ${r + 4},${y - 6} C${r - 10},${y - 34} ${-r + 10},${y - 34} ${-r - 4},${y - 6}Z" fill="${c || '#c8c8c4'}" ${o}/><path d="M-40,${y - 60} l16,16 m10,-30 l16,16 m10,-12 l16,16 M-56,${y - 30} l14,14" stroke="${OUT}" stroke-width="2" opacity=".35"/>`;
      case 'headphones': return `<path d="M${-r - 4},${y - 4} C${-r - 4},${y - r - 40} ${r + 4},${y - r - 40} ${r + 4},${y - 4}" stroke="${OUT}" stroke-width="9" fill="none"/><rect x="${-r - 16}" y="${y - 22}" width="20" height="40" rx="8" fill="${c || '#333'}" ${o}/><rect x="${r - 4}" y="${y - 22}" width="20" height="40" rx="8" fill="${c || '#333'}" ${o}/>`;
      case 'cowboy': return `<path d="M${-r + 16},${y - r + 4} C${-r + 10},${y - r - 60} ${r - 10},${y - r - 60} ${r - 16},${y - r + 4}Z" fill="${c || '#8a5a32'}" ${o}/><path d="M${-r - 40},${y - r - 6} Q0,${y - r + 26} ${r + 40},${y - r - 6} Q0,${y - r + 8} ${-r - 40},${y - r - 6}Z" fill="${c || '#8a5a32'}" ${o}/>`;
      case 'party': return `<path d="M-30,${y - r + 2} L0,${y - r - 74} L30,${y - r + 2}Z" fill="${c || '#e05aa0'}" ${o}/><circle cx="0" cy="${y - r - 76}" r="9" fill="#f2c230" ${o}/>`;
      default: return '';
    }
  }

  function beardFor(b, c) {
    if (!b || b === 'none') return '';
    const y = HEAD_Y;
    if (b === 'mustache') return `<path d="M-22,${y + 24} Q-10,${y + 14} 0,${y + 22} Q10,${y + 14} 22,${y + 24} Q10,${y + 30} 0,${y + 24} Q-10,${y + 30} -22,${y + 24}Z" fill="${c}" stroke="${OUT}" stroke-width="3"/>`;
    if (b === 'stubble') { let s = ''; for (let i = 0; i < 26; i++) { const a = Math.PI * (0.12 + (i / 25) * 0.76); const rr = HEAD_R - 10 - (i % 3) * 6; s += `<circle cx="${Math.cos(a) * rr}" cy="${y + Math.sin(a) * rr}" r="1.6" fill="${OUT}" opacity=".45"/>`; } return s; }
    return `<path d="M${-HEAD_R + 4},${y + 4} C${-HEAD_R + 6},${y + 74} ${HEAD_R - 6},${y + 74} ${HEAD_R - 4},${y + 4} C${HEAD_R - 20},${y + 30} 20,${y + 22} 0,${y + 44} C-20,${y + 22} ${-HEAD_R + 20},${y + 30} ${-HEAD_R + 4},${y + 4}Z" fill="${c}" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  }

  function torsoFor(look) {
    const top = look.top || 'shirt';
    const c = look.shirt || '#4a7fd4';
    const o = `stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"`;
    const base = `M-36,-168 Q-40,-168 -42,-150 L-46,-70 Q-46,-62 -38,-62 L38,-62 Q46,-62 46,-70 L42,-150 Q40,-168 36,-168Z`;
    if (top === 'dress') {
      return `<path d="M-34,-168 L34,-168 L42,-120 L66,-48 Q66,-40 58,-40 L-58,-40 Q-66,-40 -66,-48 L-42,-120Z" fill="${c}" ${o}/>`;
    }
    let s = `<path d="${base}" fill="${c}" ${o}/>`;
    if (top === 'suit' || top === 'blazer') {
      const shirtC = look.inner || '#f4f1ea';
      s = `<path d="${base}" fill="${c}" ${o}/><path d="M-16,-168 L0,-120 L16,-168Z" fill="${shirtC}" stroke="${OUT}" stroke-width="3"/>`;
      if (look.tie !== false) s += `<path d="M-5,-160 L5,-160 L8,-128 L0,-116 L-8,-128Z" fill="${look.tie || '#c9343a'}" stroke="${OUT}" stroke-width="2.5"/>`;
      s += `<path d="M-16,-168 L-6,-130 L-20,-142 M16,-168 L6,-130 L20,-142" stroke="${OUT}" stroke-width="3" fill="none" stroke-linejoin="round"/><path d="M0,-118 V-66" stroke="${OUT}" stroke-width="2.5" opacity=".5"/><circle cx="0" cy="-100" r="2.5" fill="${OUT}"/><circle cx="0" cy="-82" r="2.5" fill="${OUT}"/>`;
    } else if (top === 'hoodie') {
      s += `<path d="M-30,-170 Q0,-140 30,-170" stroke="${OUT}" stroke-width="3.5" fill="none"/><path d="M-8,-150 v24 M8,-150 v24" stroke="${OUT}" stroke-width="2.5"/><path d="M-24,-100 h48 v20 h-48z" fill="none" stroke="${OUT}" stroke-width="2.5" opacity=".6"/>`;
    } else if (top === 'labcoat') {
      s = `<path d="${base}" fill="#f6f6f2" ${o}/><path d="M-14,-168 L0,-128 L14,-168Z" fill="${c}" stroke="${OUT}" stroke-width="3"/><path d="M0,-128 V-62" stroke="${OUT}" stroke-width="3"/><rect x="14" y="-118" width="18" height="14" fill="none" stroke="${OUT}" stroke-width="2.5"/>`;
    } else if (top === 'vest') {
      s += `<path d="M-42,-150 L-24,-168 L-14,-62 M42,-150 L24,-168 L14,-62" fill="none" stroke="${OUT}" stroke-width="3"/><path d="M-44,-100 h88 M-45,-84 h90" stroke="#f2f2ea" stroke-width="7"/><path d="M-44,-100 h88 M-45,-84 h90" stroke="${OUT}" stroke-width="1" opacity=".3"/>`;
    } else if (top === 'turtleneck') {
      s += `<rect x="-22" y="-176" width="44" height="16" rx="7" fill="${c}" ${o}/>`;
    } else if (top === 'polo' || top === 'shirt') {
      s += `<path d="M-18,-168 L0,-152 L18,-168" stroke="${OUT}" stroke-width="3" fill="none" stroke-linejoin="round"/>`;
      if (look.tie) s += `<path d="M-4,-156 L4,-156 L7,-126 L0,-114 L-7,-126Z" fill="${look.tie}" stroke="${OUT}" stroke-width="2.5"/>`;
    } else if (top === 'jersey') {
      s += `<text x="0" y="-100" font-family="Permanent Marker" font-size="34" text-anchor="middle" fill="#fff" stroke="${OUT}" stroke-width="1.5">${look.number || 7}</text>`;
    }
    if (look.badge) s += `<rect x="-36" y="-136" width="30" height="18" rx="3" fill="#fff" stroke="${OUT}" stroke-width="2.5"/>`;
    return s;
  }

  function legsFor(look, walkPhase) {
    const pants = look.pants || '#3a3f4a';
    const shoes = look.shoes || OUT;
    const dress = look.top === 'dress';
    const top = dress ? -44 : -66;
    const a = walkPhase == null ? 0 : Math.sin(walkPhase) * 14;
    const leg = (x, dx) => `<path d="M${x},${top} L${x + dx},-8" stroke="${OUT}" stroke-width="${dress ? 9 : 19}" stroke-linecap="round"/><path d="M${x},${top} L${x + dx},-8" stroke="${dress ? (look.skinC) : pants}" stroke-width="${dress ? 4 : 11}" stroke-linecap="round"/>`;
    const shoe = (x) => `<ellipse cx="${x}" cy="-5" rx="15" ry="8" fill="${shoes}" stroke="${OUT}" stroke-width="3"/>`;
    return leg(-17, -a) + leg(17, a) + shoe(-19 - a) + shoe(19 + a);
  }

  function armPath(side, hand, ctrl, color) {
    const [sx, sy] = SHOULDER[side];
    const [hx, hy] = hand;
    let cx, cy;
    if (ctrl) { [cx, cy] = ctrl; } else {
      const mx = (sx + hx) / 2, my = (sy + hy) / 2;
      const dx = hx - sx, dy = hy - sy, len = Math.hypot(dx, dy) || 1;
      const sgn = side === 'L' ? -1 : 1;
      cx = mx + (-dy / len) * 10 * -sgn; cy = my + (dx / len) * 10 * -sgn;
      if (Math.abs(cx) < Math.abs(mx)) cx = mx + sgn * 8;
    }
    const d = `M${sx},${sy} Q${cx},${cy} ${hx},${hy}`;
    return `<path d="${d}" stroke="${OUT}" stroke-width="19" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${color}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  }

  // Public: static body parts (back layer + torso/legs) and dynamic head/arms
  function build(look) {
    look = look || {};
    const skinC = col(look.skin, SKIN, SKIN.light);
    const hairC = col(look.hairColor, HAIRC, HAIRC.brown);
    const hair = hairFor(look.hair || 'short', hairC);
    const sleeve = look.top === 'labcoat' ? '#f6f6f2' : (look.top === 'vest' ? (look.inner || '#e9e4d8') : (look.shirt || '#4a7fd4'));
    return {
      skinC, hairC, hair, sleeve,
      look: Object.assign({}, look, { skinC }),
      head(expr, mouthOpen, t, blink) {
        return `${hair.back}<circle cx="0" cy="${HEAD_Y}" r="${HEAD_R}" fill="${skinC}" stroke="${OUT}" stroke-width="${SW}"/>` +
          `<ellipse cx="${-HEAD_R + 2}" cy="${HEAD_Y + 6}" rx="9" ry="13" fill="${skinC}" stroke="${OUT}" stroke-width="3.5"/><ellipse cx="${HEAD_R - 2}" cy="${HEAD_Y + 6}" rx="9" ry="13" fill="${skinC}" stroke="${OUT}" stroke-width="3.5"/>` +
          `<circle cx="0" cy="${HEAD_Y}" r="${HEAD_R - 2.2}" fill="${skinC}"/>` +
          beardFor(look.beard, hairC) + eyesFor(blink ? 'blink' : expr, look.glasses) + browsFor(expr) + mouthFor(expr, mouthOpen) +
          glassesFor(look.glasses) + hair.front + hatFor(look.hat, look.hatColor) + extrasFor(expr, t);
      },
      body(walkPhase) {
        return legsFor(this.look, walkPhase) + torsoFor(look);
      },
      arms(pose) {
        const P = typeof pose === 'object' ? pose : (POSES[pose] || POSES.idle);
        const hand = (p) => `<circle cx="${p[0]}" cy="${p[1]}" r="10" fill="${skinC}" stroke="${OUT}" stroke-width="3.5"/>`;
        return armPath('L', P.L, P.cL, sleeve) + armPath('R', P.R, P.cR, sleeve) + hand(P.L) + hand(P.R);
      },
    };
  }

  function lerpPose(a, b, k) {
    const A = POSES[a] || POSES.idle, B = POSES[b] || POSES.idle;
    const L = (p, q) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    const ctl = (pa, pb, side) => {
      if (!pa && !pb) return undefined;
      const def = side === 'L' ? [-60, -120] : [60, -120];
      return L(pa || def, pb || def);
    };
    const out = { L: L(A.L, B.L), R: L(A.R, B.R) };
    if (A.cL || B.cL) out.cL = k < 0.5 ? (A.cL ? L(A.cL, B.cL || A.cL) : undefined) : (B.cL ? L(A.cL || B.cL, B.cL) : undefined);
    if (A.cR || B.cR) out.cR = k < 0.5 ? (A.cR ? L(A.cR, B.cR || A.cR) : undefined) : (B.cR ? L(A.cR || B.cR, B.cR) : undefined);
    return out;
  }

  window.TOON_CHARS = { build, POSES, lerpPose, HEAD_Y, HEAD_R, OUT, SKIN, HAIRC, faceParts: { eyesFor, browsFor, mouthFor, extrasFor } };
})();
