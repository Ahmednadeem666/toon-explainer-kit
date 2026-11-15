// Code-drawn background presets (1920x1080). Free fallback when no AI background is used.
// Characters stand on the "floor line" around y=880 in every preset.
(function () {
  const O = '#2b2522';
  const W = 1920, H = 1080;
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); }
  const grad = (id, stops, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const rect = (fill) => `<rect width="${W}" height="${H}" fill="${fill}"/>`;

  function skyline(r, baseY, color, lit, count = 26) {
    let s = '';
    let x = -40;
    while (x < W + 40) {
      const w = 60 + r() * 110, h = 120 + r() * 300;
      s += `<rect x="${x}" y="${baseY - h}" width="${w}" height="${h + 4}" fill="${color}"/>`;
      if (lit) for (let yy = baseY - h + 20; yy < baseY - 20; yy += 34) for (let xx = x + 12; xx < x + w - 20; xx += 28) if (r() < 0.45) s += `<rect x="${xx}" y="${yy}" width="12" height="16" fill="${lit}" opacity="${0.5 + r() * 0.5}"/>`;
      x += w + 4 + r() * 18;
    }
    return s;
  }
  function hillsPath(y, amp, r, fill, n = 5) {
    let d = `M0,${H} L0,${y}`;
    const step = W / n;
    for (let i = 0; i < n; i++) { const x1 = i * step + step / 2, x2 = (i + 1) * step; d += ` Q${x1},${y - amp * (0.5 + r())} ${x2},${y + (r() - 0.5) * amp * 0.4}`; }
    return `<path d="${d} L${W},${H}Z" fill="${fill}" stroke="${O}" stroke-width="4"/>`;
  }
  function mountains(r, y, fill, n = 6) {
    let d = `M-50,${H} L-50,${y}`; let x = -50;
    for (let i = 0; i < n; i++) { const w = (W + 100) / n; d += ` L${x + w * 0.5},${y - 140 - r() * 200} L${x + w},${y - r() * 40}`; x += w; }
    return `<path d="${d} L${W + 50},${H}Z" fill="${fill}" stroke="${O}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  function clouds(r, n, color = '#fff', op = 0.9) {
    let s = '';
    for (let i = 0; i < n; i++) { const x = r() * W, y = 80 + r() * 260, k = 0.6 + r() * 0.8; s += `<g transform="translate(${x},${y}) scale(${k})" opacity="${op}"><path d="M-100,30 C-130,30 -130,-10 -96,-12 C-90,-50 -30,-56 -14,-28 C4,-60 70,-52 70,-12 C104,-12 104,30 74,30Z" fill="${color}" stroke="${O}" stroke-width="3.5"/></g>`; }
    return s;
  }
  function stars(r, n) { let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${r() * W}" cy="${r() * H * 0.55}" r="${1 + r() * 2.2}" fill="#fff" opacity="${0.4 + r() * 0.6}"/>`; return s; }

  const PRESETS = {
    black: () => rect('#050505'),
    solid: (o) => rect(o.color || '#e9e2d0'),
    paper: () => {
      let l = ''; for (let y = 140; y < H; y += 52) l += `<path d="M0,${y} H${W}" stroke="#9fc3e6" stroke-width="2"/>`;
      return rect('#fbf8ef') + l + `<path d="M180,0 V${H}" stroke="#e58a8a" stroke-width="3"/>`;
    },
    board: (o) => rect(o.wall || '#3c4a5a') + `<rect x="120" y="80" width="1680" height="900" rx="14" fill="#8a5a32" stroke="${O}" stroke-width="5"/><rect x="146" y="106" width="1628" height="848" rx="6" fill="#f7f4ec" stroke="${O}" stroke-width="4"/>`,
    sunset: (o, r) => `<defs>${grad('sky', [[0, '#3d2a5c'], [0.45, '#e0607a'], [0.8, '#f3a36b'], [1, '#f7c88a']])}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/>` +
      `<circle cx="${o.sunX || 380}" cy="${o.sunY || 330}" r="78" fill="#ffe08a" stroke="${O}" stroke-width="4"/>` + clouds(r, 3, '#f7b0a8', 0.8) +
      mountains(r, 720, '#b0505a') + mountains(r, 820, '#7a3a4a', 7) + `<rect x="0" y="880" width="${W}" height="200" fill="#d9894f" stroke="${O}" stroke-width="4"/>`,
    hills: (o, r) => `<defs>${grad('sky', [[0, '#7cc4ff'], [1, '#d8f0ff']])}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/>` + `<circle cx="1620" cy="180" r="70" fill="#ffe08a" stroke="${O}" stroke-width="4"/>` + clouds(r, 5) + hillsPath(700, 160, r, '#8fcf6a') + hillsPath(860, 90, r, '#6ab04c', 4),
    night: (o, r) => `<defs>${grad('sky', [[0, '#0d1530'], [1, '#2a3a66']])}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 90) + `<path d="M1560,150 a70,70 0 1,0 60,110 a56,56 0 1,1 -60,-110Z" fill="#f4efd2" stroke="${O}" stroke-width="3"/>` + hillsPath(720, 150, r, '#1e3a3a') + hillsPath(860, 90, r, '#16302c', 4),
    'city-night': (o, r) => `<defs>${grad('sky', [[0, '#101a3a'], [1, '#34406e']])}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/>` + stars(r, 60) + `<circle cx="1600" cy="160" r="50" fill="#f4efd2" stroke="${O}" stroke-width="3"/>` + skyline(r, 860, '#1c2340', '#ffd76a') + skyline(r, 880, '#141a30', '#f2c25a') + `<rect x="0" y="876" width="${W}" height="204" fill="#2a2f3e" stroke="${O}" stroke-width="4"/>`,
    'city-day': (o, r) => `<defs>${grad('sky', [[0, '#8ccaf5'], [1, '#e2f3ff']])}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/>` + clouds(r, 4) + skyline(r, 860, '#a9b8c9', '#e8f4ff') + skyline(r, 880, '#8796a8', '#d8ecff') + `<rect x="0" y="876" width="${W}" height="204" fill="#9a9a96" stroke="${O}" stroke-width="4"/>`,
    office: (o, r) => {
      let win = ''; for (let i = 0; i < 4; i++) win += `<rect x="${130 + i * 440}" y="90" width="340" height="300" fill="#cfe8f7" stroke="${O}" stroke-width="5"/><path d="M${300 + i * 440},90 V390 M${130 + i * 440},240 H${470 + i * 440}" stroke="${O}" stroke-width="4"/>`;
      return rect(o.wall || '#e8e2d2') + `<rect x="0" y="0" width="${W}" height="440" fill="${o.wall2 || '#dfe7ea'}"/>` + win + `<rect x="0" y="436" width="${W}" height="10" fill="#b9b2a0"/><rect x="0" y="860" width="${W}" height="220" fill="#7a5a44" stroke="${O}" stroke-width="5"/>`;
    },
    'trading-floor': (o, r) => {
      let boards = '';
      for (let i = 0; i < 3; i++) { boards += `<rect x="${110 + i * 580}" y="120" width="540" height="300" rx="8" fill="#0d0f12" stroke="#3a3f4a" stroke-width="5"/>`; for (let j = 0; j < 7; j++) { const up = r() < (o.mood === 'red' ? 0.2 : o.mood === 'green' ? 0.85 : 0.5); boards += `<text x="${140 + i * 580}" y="${165 + j * 38}" font-family="Gochi Hand" font-size="26" fill="${up ? '#5be05b' : '#ff5a4e'}">${['NOVA', 'OPAL', 'SAGE', 'TERN', 'VOLT', 'WREN', 'FLUX', 'HALO', 'GRID'][Math.floor(r() * 9)]} ${(20 + r() * 400).toFixed(2)} ${up ? '▲' : '▼'}${(r() * 9).toFixed(1)}%</text>`; } }
      const c = o.mood === 'red' ? '#3a0f12' : o.mood === 'green' ? '#0f2a16' : '#16181e';
      let desks = ''; for (let i = 0; i < 7; i++) desks += `<rect x="${-40 + i * 290}" y="${760}" width="250" height="40" fill="#2a2d36" stroke="${O}" stroke-width="4"/><rect x="${10 + i * 290}" y="${690}" width="90" height="66" fill="#1b2028" stroke="${O}" stroke-width="3"/>`;
      return rect(c) + boards + `<rect x="0" y="40" width="${W}" height="46" fill="#000"/>` + `<rect x="0" y="860" width="${W}" height="220" fill="#22252c" stroke="${O}" stroke-width="4"/>` + desks;
    },
    studio: (o, r) => { let p = ''; for (let i = 0; i < 8; i++) p += `<rect x="${i * 250 - 40}" y="60" width="220" height="560" fill="${i % 2 ? '#1e3a7a' : '#244896'}" opacity=".9"/>`; return rect('#152a5a') + p + skyline(r, 620, '#2c4f9a', '#9fc3ff') + `<rect x="0" y="620" width="${W}" height="16" fill="#e0453c"/><rect x="0" y="860" width="${W}" height="220" fill="#0f1c3a" stroke="${O}" stroke-width="4"/>`; },
    capitol: (o, r) => `<defs>${grad('sky', [[0, '#8ccaf5'], [1, '#e2f3ff']])}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/>` + clouds(r, 3) + `<g transform="translate(960,620) scale(1.4)">${window.TOON_PROPS.P.capitol({})}</g>` + `<rect x="0" y="740" width="${W}" height="340" fill="#7cc35a" stroke="${O}" stroke-width="4"/><path d="M880,740 L1040,740 L1300,1080 L620,1080Z" fill="#e8e2d2" stroke="${O}" stroke-width="4"/>`,
    warehouse: (o, r) => { let ln = ''; for (let y = 300; y < 760; y += 26) ln += `<path d="M700,${y} H1220" stroke="${O}" stroke-width="2" opacity=".35"/>`; return rect('#b8bcc0') + `<rect x="0" y="0" width="${W}" height="120" fill="#9a9fa4"/><rect x="680" y="280" width="560" height="580" fill="#d2d5d8" stroke="${O}" stroke-width="5"/>` + ln + `<rect x="0" y="860" width="${W}" height="220" fill="#8a8e92" stroke="${O}" stroke-width="4"/><path d="M0,940 H${W}" stroke="#f2c230" stroke-width="10" stroke-dasharray="60 40"/>`; },
    room: (o, r) => rect(o.wall || '#efe2c8') + `<rect x="1180" y="160" width="460" height="380" fill="#bfe3ff" stroke="${O}" stroke-width="6"/><path d="M1410,160 V540 M1180,350 H1640" stroke="${O}" stroke-width="5"/><rect x="0" y="860" width="${W}" height="220" fill="#b0855a" stroke="${O}" stroke-width="5"/><rect x="0" y="830" width="${W}" height="30" fill="#e8dcc0" stroke="${O}" stroke-width="3"/>`,
    desert: (o, r) => `<defs>${grad('sky', [[0, '#f0a35e'], [1, '#f9d79a']])}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1500" cy="260" r="90" fill="#fff1b8" stroke="${O}" stroke-width="4"/>` + mountains(r, 780, '#c97a4a', 5) + `<rect x="0" y="860" width="${W}" height="220" fill="#e7b36e" stroke="${O}" stroke-width="4"/>`,
    space: (o, r) => rect('#070a1a') + stars(r, 220) + `<circle cx="1500" cy="1250" r="560" fill="#2e6fd8" stroke="${O}" stroke-width="5"/><path d="M1100,900 q120,-60 200,10 t220,-20" stroke="#5fbf6a" stroke-width="40" fill="none" opacity=".8"/>`,
    chalkboard: () => rect('#3a4a40') + `<rect x="60" y="50" width="1800" height="980" rx="10" fill="#2f4a3a" stroke="#7a5236" stroke-width="22"/>`,
  };

  function render(spec, seed) {
    spec = spec || {};
    const fn = PRESETS[spec.preset] || PRESETS.solid;
    return fn(spec, rng(seed || 7));
  }
  window.TOON_BG = { render, PRESETS };
})();
