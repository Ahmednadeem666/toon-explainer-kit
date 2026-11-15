// TOON engine — deterministic scene player. TOON.load(timeline); await TOON.seek(seconds)
// Every frame is a pure function of time, so renders are repeatable and parallelizable.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1920, H = 1080, O = '#2b2522';
  const C = window.TOON_CHARS, PR = window.TOON_PROPS, BG = window.TOON_BG;
  const esc = PR.esc;

  // ---------- math ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const EASE = {
    linear: (k) => k,
    in: (k) => k * k * k,
    out: (k) => 1 - Math.pow(1 - k, 3),
    inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    back: (k) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
    elastic: (k) => (k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
    bounce: (k) => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; },
  };
  const ease = (name, k) => (EASE[name] || EASE.inOut)(clamp(k));
  function hash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); }
  const noise1 = (t, seed) => { const i = Math.floor(t), f = t - i; const a = rng(seed + i * 7919)() * 2 - 1, b = rng(seed + (i + 1) * 7919)() * 2 - 1; return lerp(a, b, f * f * (3 - 2 * f)); };

  function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

  // ---------- fonts & text ----------
  const FONT = { hand: 'Gochi Hand', marker: 'Permanent Marker', print: 'Patrick Hand' };
  let measureEl;
  const mcache = new Map();
  function measure(str, font, size) {
    const key = font + '|' + size + '|' + str;
    if (mcache.has(key)) return mcache.get(key);
    measureEl.setAttribute('font-family', font); measureEl.setAttribute('font-size', size); measureEl.textContent = str;
    const w = measureEl.getComputedTextLength(); mcache.set(key, w); return w;
  }
  function wrap(str, font, size, maxW) {
    const out = [];
    String(str).split('\n').forEach((para) => {
      const words = para.split(/\s+/).filter(Boolean); let line = '';
      words.forEach((w) => { const test = line ? line + ' ' + w : w; if (maxW && measure(test, font, size) > maxW && line) { out.push(line); line = w; } else line = test; });
      out.push(line);
    });
    return out;
  }

  // Text styles → markup around a block of lines. Returns {markup, w, h}
  function textBlock(spec, str, reveal) {
    const style = spec.style || 'plain';
    const fontKey = spec.font || ({ title: 'marker', neon: 'marker', banner: 'marker', price: 'marker' }[style] || 'hand');
    const font = FONT[fontKey] || fontKey;
    const size = spec.size || ({ title: 96, neon: 110, banner: 46, tag: 40, sticky: 40, sign: 48, plain: 48, chalk: 52, price: 72, label: 40 }[style] || 48);
    const color = spec.color || ({ neon: '#ff4a4a', chalk: '#f4f1ea', banner: '#fff', title: '#fff' }[style] || O);
    const lines = wrap(str, font, size, spec.maxWidth || (style === 'sticky' ? 300 : 1500));
    const lh = size * 1.12;
    const widths = lines.map((l) => measure(l, font, size));
    const tw = Math.max(1, ...widths), th = lines.length * lh;
    const anchor = spec.align === 'left' ? 'start' : 'middle';
    const ax = spec.align === 'left' ? -tw / 2 : 0;
    let shown = lines;
    if (reveal != null) { let n = Math.floor(reveal); shown = lines.map((l) => { const s = l.slice(0, Math.max(0, n)); n -= l.length + 1; return s; }); }
    const tspans = shown.map((l, i) => `<tspan x="${ax}" y="${(i - (lines.length - 1) / 2) * lh}">${esc(l)}</tspan>`).join('');
    const tAttrs = `font-family="${font}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="central"`;
    const padX = size * 0.45, padY = size * 0.3;
    const bw = tw + padX * 2, bh = th + padY * 2;
    let m = '';
    switch (style) {
      case 'tag': case 'label':
        m = `<rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="${size * 0.18}" fill="${spec.bg || '#fbf8ef'}" stroke="${O}" stroke-width="4"/><text ${tAttrs} fill="${color}">${tspans}</text>`; break;
      case 'sticky': {
        const s = Math.max(bw, bh, 220);
        m = `<rect x="${-s / 2 + 6}" y="${-s / 2 + 8}" width="${s}" height="${s}" fill="#000" opacity=".18"/><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" fill="${spec.bg || '#ffe46b'}" stroke="${O}" stroke-width="3"/><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s * 0.12}" fill="#000" opacity=".06"/><text ${tAttrs} fill="${color}">${tspans}</text>`; break;
      }
      case 'sign':
        m = `<rect x="${-bw / 2 - 10}" y="${-bh / 2 - 10}" width="${bw + 20}" height="${bh + 20}" rx="8" fill="#8a5a32" stroke="${O}" stroke-width="4"/><rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="4" fill="${spec.bg || '#f4ead2'}" stroke="${O}" stroke-width="3"/><text ${tAttrs} fill="${color}">${tspans}</text>`; break;
      case 'banner':
        m = `<rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="6" fill="${spec.bg || '#d6403a'}" stroke="${O}" stroke-width="4"/><text ${tAttrs} fill="${color}">${tspans}</text>`; break;
      case 'title': case 'price':
        m = `<text ${tAttrs} fill="${O}" stroke="${O}" stroke-width="${size * 0.16}" stroke-linejoin="round" transform="translate(4,6)">${tspans}</text><text ${tAttrs} fill="${color}" stroke="${O}" stroke-width="${size * 0.11}" stroke-linejoin="round" paint-order="stroke">${tspans}</text>`; break;
      case 'neon':
        m = `<text ${tAttrs} fill="${color}" filter="url(#glow)" opacity=".9">${tspans}</text><text ${tAttrs} fill="${color}">${tspans}</text>`; break;
      default:
        m = `<text ${tAttrs} fill="${color}"${spec.outline ? ` stroke="${spec.outline}" stroke-width="${size * 0.1}" paint-order="stroke" stroke-linejoin="round"` : ''}>${tspans}</text>`;
    }
    return { markup: m, w: bw, h: bh, chars: lines.join(' ').length };
  }

  function fmtNum(v, s) {
    const d = s.decimals ?? 0;
    let str = Math.abs(v).toFixed(d);
    if (s.commas !== false) { const [a, b] = str.split('.'); str = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : ''); }
    return (s.prefix || '') + (v < 0 ? '−' : (s.sign && v > 0 ? '+' : '')) + str + (s.suffix || '');
  }

  // ---------- element base ----------
  class El {
    constructor(spec, ctx, idx) {
      this.s = spec; this.ctx = ctx; this.seed = hash((spec.id || '') + ':' + idx + ':' + ctx.scene.id);
      this.r = rng(this.seed);
      this.at = spec.at ?? 0; this.until = spec.until ?? Infinity;
      this.inK = spec.in || this.defaultIn(); this.inDur = spec.inDur ?? (this.inK === 'none' ? 0 : 0.38);
      this.outK = spec.out || 'fade'; this.outDur = spec.outDur ?? 0.25;
      this.g = el('g', {});
      this.inner = el('g', {}, this.g);
      this.cache = '';
    }
    defaultIn() { return 'pop'; }
    mount(layer) { layer.appendChild(this.g); this.build(); }
    build() {}
    set(markup) { if (markup !== this.cache) { this.inner.innerHTML = markup; this.cache = markup; } }
    state(t) {
      const s = this.s;
      const st = { x: s.x ?? W / 2, y: s.y ?? H / 2, scale: s.scale ?? 1, rotate: s.rotate ?? 0, opacity: s.opacity ?? 1, sx: 1, sy: 1, walk: null };
      for (const m of s.moves || []) {
        if (t <= m.at) break;
        const k = ease(m.ease || 'inOut', (t - m.at) / (m.dur ?? 0.6));
        const from = { x: st.x, y: st.y, scale: st.scale, rotate: st.rotate, opacity: st.opacity };
        for (const key of ['x', 'y', 'scale', 'rotate', 'opacity']) if (m[key] != null) st[key] = lerp(from[key], m[key], k);
        if (m.arc && k < 1) st.y -= Math.sin(Math.PI * k) * m.arc;
        if (m.walk && t < m.at + (m.dur ?? 0.6)) st.walk = (t - m.at) * 13;
      }
      // entrance
      const p = this.inDur ? clamp((t - this.at) / this.inDur) : 1;
      if (p < 1) {
        switch (this.inK) {
          case 'pop': st.scale *= ease('back', p); break;
          case 'fade': st.opacity *= p; break;
          case 'grow': st.sy = ease('back', p); break;
          case 'drop': st.y -= (1 - ease('bounce', p)) * 700; break;
          case 'slam': { const k = ease('in', p); st.scale *= lerp(2.6, 1, k); st.opacity *= clamp(p * 3); break; }
          case 'spin': st.scale *= ease('back', p); st.rotate += (1 - ease('out', p)) * -200; break;
          case 'slideLeft': st.x += (1 - ease('out', p)) * 1100; break;
          case 'slideRight': st.x -= (1 - ease('out', p)) * 1100; break;
          case 'slideUp': st.y += (1 - ease('out', p)) * 800; break;
          case 'slideDown': st.y -= (1 - ease('out', p)) * 800; break;
          default: break;
        }
      }
      // exit
      if (t > this.until - this.outDur && isFinite(this.until)) {
        const q = clamp((t - (this.until - this.outDur)) / this.outDur);
        switch (this.outK) {
          case 'pop': st.scale *= 1 - ease('in', q); break;
          case 'slideLeft': st.x -= ease('in', q) * 1400; break;
          case 'slideRight': st.x += ease('in', q) * 1400; break;
          case 'slideDown': st.y += ease('in', q) * 900; break;
          case 'none': break;
          default: st.opacity *= 1 - q;
        }
      }
      // idle loops & punches
      const lt = t - this.at;
      if (s.float) st.y += Math.sin(lt * 2.2 + this.seed) * (s.float === true ? 8 : s.float);
      if (s.pulse) st.scale *= 1 + Math.sin(lt * 5) * (s.pulse === true ? 0.04 : s.pulse);
      if (s.wiggle) st.rotate += Math.sin(lt * 7 + this.seed) * (s.wiggle === true ? 4 : s.wiggle);
      if (s.spin) st.rotate += lt * (s.spin === true ? 90 : s.spin);
      for (const pt of s.punch || []) { const k = (t - pt) / 0.28; if (k >= 0 && k < 1) st.scale *= 1 + Math.sin(Math.PI * k) * 0.16; }
      const shakes = s.shake === true ? [{ at: this.at, until: this.until, amp: 6 }] : (Array.isArray(s.shake) ? s.shake : (s.shake ? [s.shake] : []));
      for (const sh of shakes) if (t >= (sh.at ?? 0) && t <= (sh.until ?? sh.at + (sh.dur ?? 0.5))) { st.x += noise1(t * 30, this.seed) * (sh.amp ?? 6); st.y += noise1(t * 30, this.seed + 9) * (sh.amp ?? 6); }
      return st;
    }
    visible(t) { return t >= this.at - 1e-6 && t < this.until; }
    update(t) {
      if (!this.visible(t)) { if (this.shown !== false) { this.g.setAttribute('display', 'none'); this.shown = false; } return; }
      if (this.shown !== true) { this.g.removeAttribute('display'); this.shown = true; }
      const st = this.state(t);
      const flip = this.s.flip ? -1 : 1;
      this.g.setAttribute('transform', `translate(${st.x.toFixed(2)} ${st.y.toFixed(2)}) rotate(${st.rotate.toFixed(2)}) scale(${(st.scale * st.sx * flip).toFixed(4)} ${(st.scale * st.sy).toFixed(4)})`);
      this.g.setAttribute('opacity', clamp(st.opacity).toFixed(3));
      this.draw(t, t - this.at, st);
    }
    draw() {}
    timeline(list, key, t, def) { let v = def; for (const a of list || []) { if (a.at <= t && a[key] != null) v = a[key]; } return v; }
  }

  // ---------- element types ----------
  class Character extends El {
    constructor(spec, ctx, idx) { super(spec, ctx, idx); if (spec.scale == null) this.s = Object.assign({}, spec, { scale: 1.4 }); }
    defaultIn() { return 'pop'; }
    build() { this.ch = C.build(this.s.look); this.blinkP = 2.6 + this.r() * 2; this.blinkO = this.r() * 3; }
    poseAt(t) {
      const acts = (this.s.actions || []).filter((a) => a.pose);
      let prev = this.s.pose || 'idle', cur = prev, tAt = -10;
      for (const a of acts) { if (a.at <= t) { prev = cur; cur = a.pose; tAt = a.at; } }
      const k = ease('out', (t - tAt) / 0.22);
      return k >= 1 || prev === cur ? (C.POSES[cur] ? cur : 'idle') : C.lerpPose(prev, cur, k);
    }
    mouth(t) {
      const talk = this.s.talk;
      if (!talk) return 0;
      const ranges = talk === true ? [[0, Infinity]] : talk;
      const scT = t; // talk ranges are scene-local
      if (!ranges.some(([a, b]) => scT >= a && scT <= b)) return 0;
      const words = this.ctx.scene.words || [];
      const speaking = words.length ? words.some((w) => scT >= w.s && scT <= w.e) : true;
      if (!speaking) return 0;
      return Math.max(0, Math.sin(scT * 22 + this.seed) * 0.6 + 0.4 + noise1(scT * 9, this.seed) * 0.3);
    }
    draw(t, lt, st) {
      let expr = this.timeline(this.s.actions, 'expr', t, this.s.expr || 'neutral');
      const dotEyes = !['happy', 'laugh', 'shocked', 'smug', 'tired', 'dead', 'money', 'blink'].includes(expr);
      const bt = (lt + this.blinkO) % this.blinkP;
      const eyeExpr = dotEyes && bt < 0.13 ? 'blink' : null;
      const walk = st.walk;
      const breathe = 1 + Math.sin(lt * 2.4 + this.seed) * 0.008;
      const bob = walk != null ? -Math.abs(Math.sin(walk)) * 8 : 0;
      const pose = this.poseAt(t);
      const mouthOpen = this.mouth(t);
      const headMarkup = this.ch.head(expr, mouthOpen, lt, !!eyeExpr);
      let hold = '';
      if (this.s.holding) { const hp = this.s.holding; hold = `<g transform="translate(${hp.x ?? 0},${hp.y ?? -128}) scale(${hp.scale ?? 0.45}) rotate(${hp.rotate ?? 0})">${PR.P[hp.prop] ? PR.P[hp.prop](hp) : ''}</g>`; }
      this.set(`<ellipse cx="0" cy="2" rx="62" ry="12" fill="#000" opacity=".16"/><g transform="translate(0,${bob}) scale(1,${breathe.toFixed(4)})">${this.ch.body(walk)}${this.ch.arms(pose)}${hold}${headMarkup}</g>`);
    }
  }

  class Text extends El {
    defaultIn() { return this.s.anim || (this.s.style === 'neon' ? 'fade' : 'pop'); }
    build() { this.tb = textBlock(this.s, this.s.text); if (['type', 'write'].includes(this.inK)) { this.typeDur = this.s.typeDur ?? Math.min(1.6, this.tb.chars * 0.045); this.inDur = 0.001; } }
    draw(t, lt) {
      if (this.inK === 'type') { const n = clamp(lt / this.typeDur) * this.tb.chars; this.set(textBlock(this.s, this.s.text, n).markup); return; }
      if (this.inK === 'write') { const k = clamp(lt / this.typeDur); const w = this.tb.w + 40; this.set(`<clipPath id="c${this.seed}"><rect x="${-w / 2}" y="${-this.tb.h}" width="${w * ease('out', k)}" height="${this.tb.h * 2}"/></clipPath><g clip-path="url(#c${this.seed})">${this.tb.markup}</g>`); return; }
      this.set(this.tb.markup);
    }
  }

  class Counter extends El {
    defaultIn() { return 'pop'; }
    draw(t, lt) {
      const s = this.s; const d = s.dur ?? 1.4; const k = ease('out', (lt - (s.delay ?? 0)) / d);
      const v = lerp(s.from ?? 0, s.to ?? 100, k);
      this.set(textBlock(Object.assign({ style: 'price' }, s), fmtNum(v, s)).markup);
    }
  }

  class Stamp extends El {
    defaultIn() { return 'slam'; }
    constructor(spec, ctx, idx) { super(spec, ctx, idx); this.s = Object.assign({ rotate: -12 }, spec); }
    build() {
      const s = this.s, c = s.color || '#d6403a', size = s.size || 84;
      const w = measure(s.text, FONT.marker, size) + size * 0.8, h = size * 1.5;
      this.set(`<g opacity=".92"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" fill="none" stroke="${c}" stroke-width="10"/><rect x="${-w / 2 + 12}" y="${-h / 2 + 12}" width="${w - 24}" height="${h - 24}" rx="6" fill="none" stroke="${c}" stroke-width="3"/><text font-family="${FONT.marker}" font-size="${size}" text-anchor="middle" dominant-baseline="central" fill="${c}">${esc(s.text)}</text></g>`);
    }
  }

  class Prop extends El {
    build() { const f = PR.P[this.s.prop || this.s.name]; this.base = f ? f(this.s) : `<text font-size="30" fill="red">? ${esc(this.s.prop)}</text>`; }
    draw(t, lt) {
      let m = this.base;
      if (this.s.face) { const f = this.s.face; const expr = this.timeline(this.s.actions, 'expr', t, f.expr || 'happy'); m += `<g transform="translate(${f.x ?? 0},${f.y ?? 0})">${PR.face(expr, f.size || 60, lt)}</g>`; }
      if (this.s.glow) m = `<g filter="url(#glow)">${m}</g>` + m;
      this.set(m);
    }
  }

  class Blob extends El {
    defaultIn() { return 'pop'; }
    build() { this.parts = PR.blob(this.s); }
    draw(t, lt) {
      const s = this.s; const expr = this.timeline(s.actions, 'expr', t, s.expr || 'happy');
      const fy = s.shape === 'pill' ? -60 : -60;
      const pose = this.timeline(s.actions, 'pose', t, s.pose || 'idle');
      let arms = '';
      if (s.arms !== false) { const up = pose === 'cheer' ? -70 : (pose === 'panic' ? -40 : 30); arms = `<path d="M-80,-40 Q-110,${up / 2} -112,${up}" stroke="${O}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M80,-40 Q110,${up / 2} 112,${up}" stroke="${O}" stroke-width="7" fill="none" stroke-linecap="round"/>`; }
      const label = s.label ? `<text y="${s.shape === 'pill' ? 40 : 6}" font-family="${FONT.marker}" font-size="${s.labelSize || 30}" text-anchor="middle" fill="${s.labelColor || '#fff'}" stroke="${O}" stroke-width="1.5">${esc(s.label)}</text>` : '';
      this.set(`<ellipse cx="0" cy="${s.shape === 'pill' ? 140 : 76}" rx="70" ry="12" fill="#000" opacity=".15"/>${this.parts.legs}${arms}${this.parts.shape}<g transform="translate(0,${fy - 20})">${PR.face(expr, s.faceSize || 70, lt, 0)}</g>${label}`);
    }
  }

  class RawSvg extends El {
    draw(t, lt) {
      let m = this.s.markup || '';
      if (this.s.face) { const f = this.s.face; const expr = this.timeline(this.s.actions, 'expr', t, f.expr || 'happy'); m += `<g transform="translate(${f.x ?? 0},${f.y ?? 0})">${PR.face(expr, f.size || 60, lt)}</g>`; }
      this.set(m);
    }
  }

  class Img extends El {
    defaultIn() { return 'pop'; }
    build() { const w = this.s.w || 400, h = this.s.h || 400; this.set(`<image href="${this.s.src}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`); }
  }

  class Bars extends El {
    defaultIn() { return this.s.panel ? 'pop' : 'none'; }
    build() { this.max = this.s.max ?? Math.max(...this.s.bars.map((b) => Math.abs(b.value))) * 1.1; }
    draw(t, lt) {
      const s = this.s, bars = s.bars, w = s.w || 900, h = s.h || 480, n = bars.length;
      const gap = w / n, bw = Math.min(160, gap * 0.6);
      const down = bars.every((b) => b.value <= 0);
      const base = down ? -h / 2 + 50 : h / 2 - 40;
      let m = '';
      if (s.panel !== false) m += `<rect x="${-w / 2 - 50}" y="${-h / 2 - 70}" width="${w + 100}" height="${h + 130}" rx="12" fill="#fbf8ef" stroke="${O}" stroke-width="5"/>`;
      if (s.title) m += `<text y="${-h / 2 - 20}" font-family="${FONT.hand}" font-size="${s.titleSize || 48}" text-anchor="middle" fill="${O}">${esc(s.title)}</text>`;
      m += `<path d="M${-w / 2},${base} H${w / 2}" stroke="${O}" stroke-width="4"/>`;
      const startDelay = this.inDur;
      bars.forEach((b, i) => {
        const bt = b.at != null ? b.at - this.at : startDelay + i * (s.stagger ?? 0.25);
        const k = ease('back', (lt - bt) / 0.6);
        if (lt < bt) return;
        const full = (Math.abs(b.value) / this.max) * (h - 100);
        const bh = Math.max(0, full * k);
        const x = -w / 2 + gap * (i + 0.5);
        const c = b.color || (b.value < 0 ? '#e0453c' : '#3a7bd5');
        const vtxt = b.text ?? fmtNum(b.value * clamp(k), s);
        if (down) {
          m += `<rect x="${x - bw / 2}" y="${base}" width="${bw}" height="${bh}" fill="${c}" stroke="${O}" stroke-width="4"/>`;
          if (b.face) m += `<g transform="translate(${x},${base + bh - 40})">${PR.face(b.face, 46, lt)}</g>`;
          m += `<text x="${x}" y="${base + bh + 44}" font-family="${FONT.marker}" font-size="40" text-anchor="middle" fill="${c}" stroke="${O}" stroke-width="1.5" opacity="${clamp(k)}">${esc(vtxt)}</text>`;
          if (b.label) m += `<text x="${x}" y="${base - 18}" font-family="${FONT.hand}" font-size="34" text-anchor="middle" fill="${O}">${esc(b.label)}</text>`;
          return;
        }
        m += `<rect x="${x - bw / 2}" y="${base - bh}" width="${bw}" height="${bh}" fill="${c}" stroke="${O}" stroke-width="4"/>`;
        if (b.face) m += `<g transform="translate(${x},${base - bh + 50})">${PR.face(b.face, 46, lt)}</g>`;
        m += `<text x="${x}" y="${base - bh - 24}" font-family="${FONT.hand}" font-size="38" text-anchor="middle" fill="${O}" opacity="${clamp(k)}">${esc(vtxt)}</text>`;
        if (b.label) m += `<text x="${x}" y="${base + 40}" font-family="${FONT.hand}" font-size="32" text-anchor="middle" fill="${O}">${esc(b.label)}</text>`;
      });
      this.set(m);
    }
  }

  class Line extends El {
    defaultIn() { return this.s.panel === false ? 'none' : 'pop'; }
    draw(t, lt) {
      const s = this.s, v = s.values, w = s.w || 1100, h = s.h || 520;
      const lo = s.min ?? Math.min(...v), hi = s.max ?? Math.max(...v);
      const px = (i) => -w / 2 + (i / (v.length - 1)) * w, py = (val) => h / 2 - ((val - lo) / (hi - lo || 1)) * h;
      const c = s.color || (v[v.length - 1] < v[0] ? '#e0453c' : '#3fbf4a');
      const d0 = s.drawAt != null ? s.drawAt - this.at : this.inDur;
      const k = ease(s.drawEase || 'inOut', (lt - d0) / (s.dur ?? 2));
      const seg = k * (v.length - 1); const iN = Math.floor(seg), f = seg - iN;
      const pts = []; for (let i = 0; i <= iN && i < v.length; i++) pts.push([px(i), py(v[i])]);
      if (iN < v.length - 1) pts.push([lerp(px(iN), px(iN + 1), f), lerp(py(v[iN]), py(v[iN + 1]), f)]);
      let m = '';
      if (s.panel !== false) m += `<rect x="${-w / 2 - 70}" y="${-h / 2 - 100}" width="${w + 140}" height="${h + 180}" rx="12" fill="${s.panelColor || '#fbf8ef'}" stroke="${O}" stroke-width="5"/>`;
      if (s.title) m += `<text y="${-h / 2 - 44}" font-family="${FONT.hand}" font-size="44" text-anchor="middle" fill="${s.titleColor || O}">${esc(s.title)}</text>`;
      if (s.axis !== false) m += `<path d="M${-w / 2},${-h / 2} V${h / 2 + 10} H${w / 2}" stroke="${s.axisColor || O}" stroke-width="3" fill="none" opacity=".6"/>`;
      (s.xLabels || []).forEach((lb, i, a) => { m += `<text x="${-w / 2 + (i / (a.length - 1)) * w}" y="${h / 2 + 46}" font-family="${FONT.hand}" font-size="26" text-anchor="middle" fill="${s.axisColor || O}" opacity=".8">${esc(lb)}</text>`; });
      if (pts.length > 1) {
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        if (s.area) m += `<path d="${d} L${pts[pts.length - 1][0]},${h / 2} L${pts[0][0]},${h / 2}Z" fill="${c}" opacity=".18"/>`;
        m += `<path d="${d}" stroke="${O}" stroke-width="${(s.width || 8) + 6}" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="${s.width || 8}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
        const e = pts[pts.length - 1];
        m += `<circle cx="${e[0]}" cy="${e[1]}" r="12" fill="${c}" stroke="${O}" stroke-width="4"/>`;
        if (s.rider) m += `<g transform="translate(${e[0]},${e[1] - 4}) scale(${s.rider.scale ?? 0.35})">${this.riderMarkup || (this.riderMarkup = ((rc) => rc.body() + rc.arms(s.rider.pose || 'cheer') + rc.head(s.rider.expr || 'happy', 0, 0))(C.build(s.rider.look || {})))}</g>`;
        if (s.endLabel && k >= 1) m += `<g transform="translate(${e[0]},${e[1] - 60})">${textBlock({ style: 'tag', size: 34 }, s.endLabel).markup}</g>`;
      }
      (s.markers || []).forEach((mk) => { if (seg >= mk.i) m += `<g transform="translate(${px(mk.i)},${py(v[mk.i]) - 70})">${textBlock({ style: 'tag', size: 30, color: mk.color }, mk.label).markup}</g><path d="M${px(mk.i)},${py(v[mk.i]) - 44} V${py(v[mk.i]) - 14}" stroke="${O}" stroke-width="3"/>`; });
      this.set(m);
    }
  }

  class Ticker extends El {
    defaultIn() { return 'none'; }
    constructor(spec, ctx, idx) { super(spec, ctx, idx); this.s = Object.assign({ x: 0, y: 60 }, spec); }
    build() {
      const items = this.s.items || [];
      let x = 0, m = '';
      const size = this.s.size || 34;
      const one = items.map((it) => { const up = (it.chg ?? 0) >= 0; const str = `${it.sym} ${it.price ?? ''} ${up ? '▲' : '▼'}${Math.abs(it.chg ?? 0)}%`; const w = measure(str, FONT.hand, size) + 60; const s = `<text x="${x}" y="0" font-family="${FONT.hand}" font-size="${size}" dominant-baseline="central" fill="${up ? '#5be05b' : '#ff5a4e'}">${esc(str)}</text>`; x += w; return s; }).join('');
      this.loopW = Math.max(x, 1);
      const reps = Math.ceil((W * 2) / this.loopW) + 1;
      for (let i = 0; i < reps; i++) m += `<g transform="translate(${i * this.loopW},0)">${one}</g>`;
      this.strip = m;
    }
    draw(t, lt) {
      const off = -((lt * (this.s.speed ?? 140)) % this.loopW);
      this.inner.innerHTML = `<rect x="0" y="${-(this.s.h || 56) / 2}" width="${W}" height="${this.s.h || 56}" fill="${this.s.bg || '#0b0c10'}"/><g transform="translate(${off.toFixed(1)},0)">${this.strip}</g>`;
    }
  }

  class MapEl extends El {
    defaultIn() { return 'none'; }
    constructor(spec, ctx, idx) { super(spec, ctx, idx); this.s = Object.assign({ x: 0, y: 0 }, spec); }
    build() {
      const s = this.s, st = `stroke="${s.border || O}" stroke-width="${s.borderWidth || 1.6}" stroke-linejoin="round"`;
      this.water = el('rect', { x: -2000, y: -2000, width: W + 4000, height: H + 4000, fill: s.water || '#9cc6cf' }, this.inner);
      this.paths = {};
      for (const f of s._paths || []) { this.paths[f.name] = el('path', { d: f.d, fill: s.land || '#ece0c3' }, this.inner); this.paths[f.name].setAttribute('stroke', s.border || O); this.paths[f.name].setAttribute('stroke-width', s.borderWidth || 1.6); this.paths[f.name].setAttribute('stroke-linejoin', 'round'); }
      this.over = el('g', {}, this.inner);
      this.cache = null; this.cacheKey = '';
      void st;
    }
    set() {}
    draw(t, lt) {
      const s = this.s;
      for (const hl of s.highlight || []) {
        const p = this.paths[hl._name]; if (!p) continue;
        const k = clamp((t - (hl.at ?? 0)) / 0.4);
        const col = k <= 0 ? (s.land || '#ece0c3') : (k >= 1 ? hl.color || '#d6403a' : mix(s.land || '#ece0c3', hl.color || '#d6403a', k));
        p.setAttribute('fill', col);
      }
      let m = '';
      for (const r of s._routes || []) {
        const k = ease('inOut', (t - (r.at ?? 0)) / (r.dur ?? 1.2)); if (k <= 0) continue;
        if (r.dashed) m += `<path d="${r.d}" stroke="${r.color || '#d6403a'}" stroke-width="${r.width || 7}" fill="none" stroke-linecap="round" stroke-dasharray="18 14" stroke-dashoffset="${(-lt * 60).toFixed(1)}" opacity="${k.toFixed(3)}"/>`;
        else m += `<path d="${r.d}" stroke="${r.color || '#d6403a'}" stroke-width="${r.width || 7}" fill="none" stroke-linecap="round" pathLength="1000" stroke-dasharray="${(k * 1000).toFixed(1)} 1000"/>`;
        if (k >= 1 && r.head !== false) m += `<circle cx="${r.end[0]}" cy="${r.end[1]}" r="10" fill="${r.color || '#d6403a'}" stroke="${O}" stroke-width="3"/>`;
      }
      for (const pn of s._pins || []) {
        const k = (t - (pn.at ?? 0)) / 0.45; if (k <= 0) continue;
        const dy = (1 - ease('bounce', k)) * -120;
        m += `<g transform="translate(${pn.xy[0]},${pn.xy[1] + dy})"><path d="M0,0 C-8,-14 -22,-26 -22,-42 A22,22 0 1,1 22,-42 C22,-26 8,-14 0,0Z" fill="${pn.color || '#d6403a'}" stroke="${O}" stroke-width="3.5"/><circle cx="0" cy="-42" r="8" fill="#fff" stroke="${O}" stroke-width="2.5"/></g>`;
        if (pn.label && k > 0.6) m += `<g transform="translate(${pn.xy[0] + (pn.dx ?? 0)},${pn.xy[1] - 100 + (pn.dy ?? 0)}) rotate(${pn.rotate ?? -3})">${textBlock({ style: 'tag', size: pn.size || 32 }, pn.label).markup}</g>`;
      }
      for (const lb of s._labels || []) { if (t < (lb.at ?? 0)) continue; m += `<g transform="translate(${lb.xy[0]},${lb.xy[1]}) rotate(${lb.rotate ?? 0})">${textBlock({ style: lb.style || 'plain', size: lb.size || 40, color: lb.color }, lb.text).markup}</g>`; }
      if (m !== this.cacheKey) { this.over.innerHTML = m; this.cacheKey = m; }
    }
  }
  function mix(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = (p, s) => (p >> s) & 255; const r = Math.round(lerp(ch(pa, 16), ch(pb, 16), k)), g = Math.round(lerp(ch(pa, 8), ch(pb, 8), k)), bl = Math.round(lerp(ch(pa, 0), ch(pb, 0), k)); return `rgb(${r},${g},${bl})`; }

  class Clock extends El {
    draw(t, lt) {
      const s = this.s; const parse = (str) => { const [h, mm] = String(str || '12:00').split(':').map(Number); return h * 60 + (mm || 0); };
      let mins = parse(s.time);
      if (s.to) mins = lerp(mins, parse(s.to), ease('inOut', (t - (s.toAt ?? this.at + 0.4)) / (s.toDur ?? 1.5)));
      const ha = (mins / 60) * 30 % 360, ma = (mins % 60) * 6;
      let ticks = ''; for (let i = 0; i < 12; i++) ticks += `<path d="M0,-78 V-66" stroke="${O}" stroke-width="${i % 3 ? 3 : 5}" transform="rotate(${i * 30})"/>`;
      const lb = s.label ? `<g transform="translate(0,130)">${textBlock({ style: 'banner', size: 34, bg: s.labelColor || '#d6403a' }, s.label).markup}</g>` : '';
      this.set(`<rect x="-14" y="-112" width="28" height="18" rx="4" fill="#b9b6b0" stroke="${O}" stroke-width="3"/><circle r="92" fill="${s.color || '#d6403a'}" stroke="${O}" stroke-width="5"/><circle r="80" fill="#fbf8ef" stroke="${O}" stroke-width="3"/>${ticks}<path d="M0,0 V-44" stroke="${O}" stroke-width="7" stroke-linecap="round" transform="rotate(${ha})"/><path d="M0,0 V-66" stroke="${O}" stroke-width="4.5" stroke-linecap="round" transform="rotate(${ma})"/><circle r="7" fill="${O}"/>${lb}`);
    }
  }

  class Calendar extends El {
    draw(t, lt) {
      const s = this.s; let day = s.day, month = s.month || 'NOV';
      let flipK = 1;
      for (const f of s.flips || []) { if (t >= f.at) { day = f.day ?? day; month = f.month ?? month; flipK = clamp((t - f.at) / 0.3); } }
      this.set(`<rect x="-90" y="-100" width="180" height="200" rx="10" fill="#fbf8ef" stroke="${O}" stroke-width="5"/><rect x="-90" y="-100" width="180" height="52" rx="10" fill="${s.color || '#d6403a'}" stroke="${O}" stroke-width="5"/><text y="-70" font-family="${FONT.marker}" font-size="32" text-anchor="middle" dominant-baseline="central" fill="#fff">${esc(month)}</text><g transform="translate(0,26) scale(1,${ease('back', flipK).toFixed(3)})"><text font-family="${FONT.marker}" font-size="96" text-anchor="middle" dominant-baseline="central" fill="${O}">${esc(day)}</text></g><circle cx="-50" cy="-100" r="8" fill="${O}"/><circle cx="50" cy="-100" r="8" fill="${O}"/>`);
    }
  }

  class Arrow extends El {
    defaultIn() { return 'none'; }
    constructor(spec, ctx, idx) { super(spec, ctx, idx); this.s = Object.assign({ x: 0, y: 0 }, spec); }
    draw(t, lt) {
      const s = this.s, [x1, y1] = s.from, [x2, y2] = s.to; const bend = s.bend ?? 0.2;
      const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
      const k = ease('out', lt / (s.dur ?? 0.5));
      const pt = (u) => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2];
      const N = 24; const pts = []; for (let i = 0; i <= N; i++) pts.push(pt((i / N) * k));
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      const c = s.color || '#d6403a', wdt = s.width || 12;
      const e = pts[N], pr = pts[N - 2] || pts[0]; const ang = Math.atan2(e[1] - pr[1], e[0] - pr[0]) * 180 / Math.PI;
      const head = k > 0.15 ? `<path d="M0,0 L-34,-22 L-34,22Z" fill="${c}" stroke="${O}" stroke-width="4" stroke-linejoin="round" transform="translate(${e[0]},${e[1]}) rotate(${ang})"/>` : '';
      this.set(`<path d="${d}" stroke="${O}" stroke-width="${wdt + 7}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="${wdt}" fill="none" stroke-linecap="round"/>${head}`);
    }
  }

  class Crowd extends El {
    defaultIn() { return 'none'; }
    build() {
      const s = this.s, n = s.n || 12, rows = s.rows || 2, r = rng(this.seed);
      const shirts = s.palette || ['#4a7fd4', '#d6403a', '#3aa35a', '#f2c230', '#8a5ac4', '#e8833a', '#5a6470', '#c95a8a'];
      const hairs = ['short', 'side', 'long', 'bob', 'curly', 'balding', 'bun', 'spiky', 'ponytail', 'afro'];
      const skins = ['light', 'fair', 'tan', 'brown', 'dark', 'olive'];
      this.people = [];
      const per = Math.ceil(n / rows), sp = s.spacing || 120;
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / per), col = i % per;
        const look = { skin: skins[Math.floor(r() * skins.length)], hair: hairs[Math.floor(r() * hairs.length)], hairColor: ['black', 'brown', 'blonde', 'gray', 'red'][Math.floor(r() * 5)], shirt: shirts[Math.floor(r() * shirts.length)], top: s.top || (r() < 0.3 ? 'suit' : 'shirt'), tie: s.top === 'suit' ? undefined : (r() < 0.3 ? '#c9343a' : undefined), glasses: r() < 0.2 ? 'round' : 'none' };
        this.people.push({ ch: C.build(look), x: (col - (per - 1) / 2) * sp + (row % 2 ? sp / 2 : 0) + (r() - 0.5) * 20, y: -row * 70, ph: r() * 6, row });
      }
      this.people.sort((a, b) => a.row - b.row ? b.row - a.row : 0);
    }
    draw(t, lt) {
      const s = this.s; const react = this.timeline(s.actions, 'react', t, s.react || 'idle'); const expr = this.timeline(s.actions, 'expr', t, s.expr || 'neutral');
      const pose = { cheer: 'cheer', panic: 'panic', jump: 'cheer', idle: 'idle', wave: 'wave', point: 'point' }[react] || 'idle';
      let m = '';
      for (const p of this.people) {
        const jy = (react === 'jump' || react === 'cheer') ? -Math.abs(Math.sin(lt * 7 + p.ph)) * (react === 'jump' ? 40 : 12) : (react === 'panic' ? Math.sin(lt * 30 + p.ph) * 3 : 0);
        m += `<g transform="translate(${p.x.toFixed(1)},${(p.y + jy).toFixed(1)})">${p.ch.body()}${p.ch.arms(pose)}${p.ch.head(expr, 0, lt + p.ph)}</g>`;
      }
      this.set(m);
    }
  }

  class LowerThird extends El {
    defaultIn() { return 'slideRight'; }
    constructor(spec, ctx, idx) { super(spec, ctx, idx); this.s = Object.assign({ x: 120, y: 900, layer: 'hud' }, spec); }
    build() {
      const s = this.s; const w1 = measure(s.name || '', FONT.marker, 52) + 60, w2 = measure(s.title || '', FONT.hand, 32) + 40;
      this.set(`<rect x="0" y="-48" width="${w1}" height="74" fill="#fbf8ef" stroke="${O}" stroke-width="4"/><text x="30" y="-10" font-family="${FONT.marker}" font-size="52" dominant-baseline="central" fill="${O}">${esc(s.name)}</text>${s.title ? `<rect x="0" y="26" width="${Math.max(w2, 160)}" height="46" fill="${s.color || '#d6403a'}" stroke="${O}" stroke-width="4"/><text x="20" y="50" font-family="${FONT.hand}" font-size="32" dominant-baseline="central" fill="#fff">${esc(s.title)}</text>` : ''}`);
    }
  }

  class Particles extends El {
    defaultIn() { return 'none'; }
    constructor(spec, ctx, idx) { super(spec, ctx, idx); this.s = Object.assign({ x: 0, y: 0 }, spec); }
    build() { const r = rng(this.seed); const n = this.s.n || 40; this.ps = []; for (let i = 0; i < n; i++) this.ps.push({ x: r() * W, y: r() * H, sp: 0.6 + r() * 0.8, rot: r() * 360, vr: (r() - 0.5) * 400, sw: r() * 6, c: r() }); }
    draw(t, lt) {
      const s = this.s, kind = s.kind || 'paper';
      const cols = s.colors || { paper: ['#fbf8ef', '#e8e2d2'], money: ['#7fbf6a'], confetti: ['#d6403a', '#f2c230', '#3a7bd5', '#3aa35a', '#e05aa0'], snow: ['#fff'], rain: ['#9fc3ff'], coins: ['#f2c230'] }[kind] || ['#fff'];
      const speed = (s.speed ?? (kind === 'rain' ? 900 : kind === 'snow' ? 90 : 260));
      let m = '';
      for (const p of this.ps) {
        const y = ((p.y + lt * speed * p.sp) % (H + 100)) - 50;
        const x = p.x + Math.sin(lt * 2 + p.sw) * (kind === 'rain' ? 0 : 30);
        const c = cols[Math.floor(p.c * cols.length)];
        const rot = p.rot + lt * p.vr;
        let shape;
        if (kind === 'rain') shape = `<path d="M0,0 l-4,26" stroke="${c}" stroke-width="3" opacity=".7"/>`;
        else if (kind === 'snow') shape = `<circle r="${3 + p.sw}" fill="${c}" opacity=".9"/>`;
        else if (kind === 'money') shape = `<rect x="-26" y="-13" width="52" height="26" rx="3" fill="${c}" stroke="${O}" stroke-width="2.5"/><text font-size="16" text-anchor="middle" dominant-baseline="central" font-family="${FONT.hand}" fill="${O}">$</text>`;
        else if (kind === 'coins') shape = `<ellipse rx="16" ry="${16 * Math.abs(Math.cos(rot / 50))}" fill="${c}" stroke="${O}" stroke-width="2.5"/>`;
        else if (kind === 'confetti') shape = `<rect x="-7" y="-4" width="14" height="8" fill="${c}"/>`;
        else shape = `<rect x="-14" y="-18" width="28" height="36" fill="${c}" stroke="${O}" stroke-width="2"/>`;
        m += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(0)})">${shape}</g>`;
      }
      this.set(m);
    }
  }

  class Doc extends El {
    build() {
      const s = this.s, w = s.w || 560, h = s.h || 660;
      let m = `<rect x="${-w / 2 + 8}" y="${-h / 2 + 10}" width="${w}" height="${h}" fill="#000" opacity=".15"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${s.bg || '#fbf8ef'}" stroke="${O}" stroke-width="5"/>`;
      if (s.header) m += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="70" fill="${s.headerColor || '#2c4f9a'}" stroke="${O}" stroke-width="5"/><text x="${-w / 2 + 26}" y="${-h / 2 + 36}" font-family="${FONT.marker}" font-size="34" dominant-baseline="central" fill="#fff">${esc(s.header)}</text>`;
      let y = -h / 2 + (s.header ? 120 : 70);
      if (s.title) { m += `<text x="0" y="${y}" font-family="${FONT.hand}" font-size="46" text-anchor="middle" fill="${O}">${esc(s.title)}</text><path d="M${-w / 2 + 40},${y + 18} H${w / 2 - 40}" stroke="${O}" stroke-width="3"/>`; y += 70; }
      for (const ln of s.lines || []) { const lines = wrap(ln, FONT.print, s.size || 34, w - 80); for (const l of lines) { m += `<text x="${-w / 2 + 40}" y="${y}" font-family="${FONT.print}" font-size="${s.size || 34}" fill="${O}">${esc(l)}</text>`; y += (s.size || 34) * 1.25; } y += 10; }
      if (s.big) m += `<text x="0" y="${y + 40}" font-family="${FONT.marker}" font-size="80" text-anchor="middle" fill="${s.bigColor || '#d6403a'}">${esc(s.big)}</text>`;
      if (s.signature) m += `<path d="M${w / 2 - 260},${h / 2 - 60} H${w / 2 - 40}" stroke="${O}" stroke-width="2.5"/><text x="${w / 2 - 250}" y="${h / 2 - 72}" font-family="${FONT.hand}" font-size="40" fill="#2c4f9a">${esc(s.signature)}</text>`;
      this.set(m);
    }
  }

  class CardText extends El {
    defaultIn() { return 'none'; }
    constructor(spec, ctx, idx) { super(spec, ctx, idx); this.s = Object.assign({ x: 0, y: 0 }, spec); }
    build() {
      const s = this.s; this.size = s.size || 76; this.font = FONT[s.font] || s.font || FONT.print;
      this.lines = wrap(s.text, this.font, this.size, s.maxWidth || 1250);
      const widths = this.lines.map((l) => measure(l, this.font, this.size));
      this.bw = Math.max(...widths); this.lh = this.size * 1.3;
      this.bx = s.bx ?? (W - this.bw) / 2; this.by = s.by ?? H / 2 - ((this.lines.length - 1) * this.lh) / 2;
      // char timing from words
      const words = this.ctx.scene.words || []; const full = this.lines.join(' ');
      this.ctimes = new Array(full.length).fill(0);
      let ci = 0;
      const toks = full.split(/(\s+)/);
      let wi = 0;
      for (const tk of toks) {
        if (/^\s+$/.test(tk)) { for (let j = 0; j < tk.length; j++) this.ctimes[ci++] = this.ctimes[Math.max(0, ci - 2)] || 0; continue; }
        if (!tk) continue;
        const w = words[wi++] || { s: (wi - 1) * 0.35, e: (wi - 1) * 0.35 + 0.3 };
        const dur = Math.min(Math.max(0.08, w.e - w.s), 0.6);
        for (let j = 0; j < tk.length; j++) this.ctimes[ci++] = w.s + (j / tk.length) * dur;
      }
    }
    draw(t) {
      const s = this.s; let n = 0; while (n < this.ctimes.length && this.ctimes[n] <= t) n++;
      if (s.instant) n = this.ctimes.length;
      let m = '', rem = n;
      this.lines.forEach((l, i) => { const shown = l.slice(0, Math.max(0, rem)); rem -= l.length + 1; if (shown) m += `<text x="${this.bx}" y="${this.by + i * this.lh}" font-family="${this.font}" font-size="${this.size}" dominant-baseline="central" fill="${s.color || '#f4f1ea'}" transform="skewX(-6)" style="transform-box:fill-box">${esc(shown)}</text>`; });
      this.set(m);
    }
  }

  class Glow extends El { // colored light pool behind things
    defaultIn() { return 'fade'; }
    build() { const r = this.s.r || 300; this.set(`<circle r="${r}" fill="${this.s.color || '#62e04b'}" opacity="${this.s.strength ?? 0.35}" filter="url(#soft)"/>`); }
  }

  const TYPES = { character: Character, text: Text, counter: Counter, stamp: Stamp, prop: Prop, blob: Blob, svg: RawSvg, image: Img, bars: Bars, line: Line, ticker: Ticker, map: MapEl, clock: Clock, calendar: Calendar, arrow: Arrow, crowd: Crowd, lowerThird: LowerThird, particles: Particles, doc: Doc, card: CardText, glow: Glow };

  // ---------- stage ----------
  let TL = null, svg, layers = {}, camG, whipG, moodR, fadeR, curIdx = -1, els = [], sceneObj = null, boilTurb, pending = [];

  function setup() {
    svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    document.body.appendChild(svg);
    const defs = el('defs', {}, svg);
    const S = TL.settings || {};
    defs.innerHTML = `
      <filter id="boil" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="${S.boilFreq ?? 0.022}" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${S.boil ?? 2.2}" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
      <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 ${S.grain ?? 0.09} 0"/></filter>
      <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${S.vignette ?? 0.45}"/></radialGradient>
      <radialGradient id="alarm" cx="50%" cy="50%" r="72%"><stop offset="45%" stop-color="#ff1a1a" stop-opacity="0"/><stop offset="100%" stop-color="#ff1a1a" stop-opacity=".55"/></radialGradient>
      <radialGradient id="greenglow" cx="50%" cy="50%" r="72%"><stop offset="40%" stop-color="#3dff6a" stop-opacity="0"/><stop offset="100%" stop-color="#3dff6a" stop-opacity=".35"/></radialGradient>`;
    boilTurb = defs.querySelector('#boil feTurbulence');
    whipG = el('g', {}, svg);
    camG = el('g', {}, whipG);
    layers.bg = el('g', {}, camG); layers.base = el('g', {}, camG);
    layers.main = el('g', S.boil === 0 ? {} : { filter: 'url(#boil)' }, camG);
    layers.top = el('g', {}, camG);
    layers.hud = el('g', {}, whipG);
    moodR = el('rect', { width: W, height: H, fill: 'none', 'pointer-events': 'none' }, svg);
    el('rect', { width: W, height: H, fill: 'url(#vig)' }, svg);
    if ((S.grain ?? 0.09) > 0) el('rect', { width: W, height: H, filter: 'url(#grain)', style: 'mix-blend-mode:multiply' }, svg);
    fadeR = el('rect', { width: W, height: H, fill: '#000', opacity: 0 }, svg);
    measureEl = el('text', { x: -9999, y: -9999 }, svg);
  }

  function buildScene(i) {
    for (const k in layers) layers[k].innerHTML = '';
    els = []; pending = [];
    const sc = TL.scenes[i]; sceneObj = sc;
    const ctx = { scene: sc };
    // background
    const bg = sc.bg || {};
    if (sc.type === 'card') layers.bg.innerHTML = `<rect width="${W}" height="${H}" fill="${bg.color || '#050505'}"/>`;
    else if (bg.image) { layers.bg.innerHTML = `<rect width="${W}" height="${H}" fill="#222"/>`; const im = el('image', { href: bg.image, x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'xMidYMid slice' }, layers.bg); pending.push(waitImg(im)); }
    else layers.bg.innerHTML = BG.render(bg, hash(sc.id));
    (sc.elements || []).forEach((spec, idx) => {
      const T = TYPES[spec.type]; if (!T) return;
      const e = new T(spec, ctx, idx);
      const layer = spec.layer || (spec.type === 'map' ? 'base' : (spec.type === 'ticker' || spec.type === 'lowerThird') ? 'hud' : 'main');
      e.mount(layers[layer] || layers.main);
      els.push(e);
    });
    svg.querySelectorAll('image').forEach((im) => { if (!pending.includes(im)) pending.push(waitImg(im)); });
    curIdx = i;
  }
  function waitImg(im) { return new Promise((res) => { const src = im.getAttribute('href'); const I = new Image(); I.onload = () => (I.decode ? I.decode().then(res, res) : res()); I.onerror = res; I.src = src; }); }

  function camAt(sc, t) {
    const cam = sc.camera;
    const base = { x: W / 2, y: H / 2, zoom: 1 };
    if (cam === false || cam === 'static' || sc.type === 'card') return base;
    const def = { from: { zoom: 1.0 }, to: { zoom: TL.settings?.push ?? 1.045 } };
    const c = cam || def;
    if (c.keys) { let cur = Object.assign({}, base, c.keys[0]); for (const k of c.keys.slice(1)) { if (t <= k.at) break; const p = ease(k.ease || 'inOut', (t - k.at) / (k.dur ?? 1)); for (const key of ['x', 'y', 'zoom']) if (k[key] != null) cur[key] = lerp(cur[key], k[key], p); } return cur; }
    const f = Object.assign({}, base, c.from), to = Object.assign({}, base, c.to);
    const t0 = c.at ?? 0, d = c.dur ?? sc.dur;
    const p = ease(c.ease || 'inOut', (t - t0) / d);
    return { x: lerp(f.x, to.x, p), y: lerp(f.y, to.y, p), zoom: lerp(f.zoom, to.zoom, p) };
  }

  function seek(T) {
    if (!TL) return;
    let i = TL.scenes.findIndex((s) => T >= s.start && T < s.start + s.dur);
    if (i < 0) i = T < 0 ? 0 : TL.scenes.length - 1;
    if (i !== curIdx) buildScene(i);
    const sc = sceneObj, t = T - sc.start;
    // camera + shake
    const cm = camAt(sc, t);
    let sx = 0, sy = 0;
    for (const sh of sc._shakes || []) { const k = (t - sh.at) / (sh.dur ?? 0.35); if (k >= 0 && k < 1) { const a = (sh.amp ?? 14) * Math.pow(1 - k, 2); sx += noise1(t * 40, 11) * a; sy += noise1(t * 40, 23) * a; } }
    camG.setAttribute('transform', `translate(${(W / 2 + sx).toFixed(2)} ${(H / 2 + sy).toFixed(2)}) scale(${cm.zoom.toFixed(4)}) translate(${(-cm.x).toFixed(2)} ${(-cm.y).toFixed(2)})`);
    if (boilTurb) boilTurb.setAttribute('seed', String((Math.floor(T * (TL.settings?.boilFps ?? 8)) % 6) + 1));
    for (const e of els) e.update(t);
    // transitions
    const tr = sc.transition || 'cut';
    let fade = 0, wx = 0;
    if (tr === 'fade') fade = 1 - clamp(t / 0.35);
    if (tr === 'flash') { fadeR.setAttribute('fill', '#fff'); fade = 0.85 * (1 - clamp(t / 0.3)); } else fadeR.setAttribute('fill', '#000');
    if (tr === 'whip') wx = (1 - ease('out', t / 0.3)) * 700;
    const tail = sc.dur - t; if (sc.fadeOut && tail < 0.35) fade = Math.max(fade, 1 - tail / 0.35);
    fadeR.setAttribute('opacity', fade.toFixed(3));
    whipG.setAttribute('transform', `translate(${wx.toFixed(1)} 0)`);
    // mood
    const mood = sc.mood;
    if (mood === 'alarm') { moodR.setAttribute('fill', 'url(#alarm)'); moodR.setAttribute('opacity', (0.55 + Math.sin(t * 6) * 0.45).toFixed(3)); }
    else if (mood === 'green') { moodR.setAttribute('fill', 'url(#greenglow)'); moodR.setAttribute('opacity', '1'); }
    else if (mood === 'night') { moodR.setAttribute('fill', '#1a2a6a'); moodR.setAttribute('opacity', '0.28'); moodR.setAttribute('style', 'mix-blend-mode:multiply'); }
    else if (mood === 'sepia') { moodR.setAttribute('fill', '#c9913a'); moodR.setAttribute('opacity', '0.25'); moodR.setAttribute('style', 'mix-blend-mode:multiply'); }
    else moodR.setAttribute('fill', 'none');
    if (pending.length) { const p = Promise.all(pending); pending = []; return p.then(() => true); }
    return true;
  }

  async function load(tl) {
    TL = tl; document.body.innerHTML = ''; setup();
    await document.fonts.ready;
    await Promise.all(['Gochi Hand', 'Permanent Marker', 'Patrick Hand'].map((f) => document.fonts.load(`40px "${f}"`)));
    curIdx = -1;
    return true;
  }

  window.TOON = { load, seek, TYPES };
})();
