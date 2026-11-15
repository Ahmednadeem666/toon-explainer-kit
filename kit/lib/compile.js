// Compiles projects/<name>/storyboard.json + voice timings into a render-ready timeline.
// Resolves word anchors ("at": "trillion+0.2"), projects maps, collects SFX.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectDir, readJSON, KIT_ROOT, warn } from './util.js';
import { compileMap } from './maps.js';

export const norm = (w) => String(w).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%.]/g, '').replace(/\.$/, '');

// Rough narration timing when no audio exists yet (≈155 wpm with punctuation pauses).
export function estimateWords(text, rate = 1) {
  const toks = String(text || '').split(/\s+/).filter(Boolean);
  let t = 0.15; const out = [];
  for (const w of toks) {
    const d = (0.1 + 0.046 * w.replace(/[^\w]/g, '').length) / rate;
    out.push({ w, s: +t.toFixed(3), e: +(t + d).toFixed(3) });
    t += d + 0.03;
    if (/[,;:—–]$/.test(w)) t += 0.18; else if (/[.!?…]$/.test(w)) t += 0.38;
  }
  return { words: out, duration: t + 0.1, estimated: true };
}

export function loadTimings(proj, scene) {
  const f = path.join(projectDir(proj), 'timings', `${scene.id}.json`);
  if (fs.existsSync(f)) {
    const tj = readJSON(f);
    if (tj.text === (scene.vo || '').trim()) return tj;
    return Object.assign(estimateWords(scene.vo), { stale: true });
  }
  return estimateWords(scene.vo);
}

function makeResolver(scene, words, dur, issues) {
  const toks = words.map((w) => norm(w.w));
  return function resolve(v, label) {
    if (v == null) return v;
    if (typeof v === 'number') return v;
    let s = String(v).trim();
    let off = 0;
    const m = s.match(/^(.*?)([+-]\d+(?:\.\d+)?)$/);
    if (m && m[1]) { s = m[1].trim(); off = parseFloat(m[2]); }
    let base;
    if (s === 'start') base = 0;
    else if (s === 'end') base = dur;
    else if (/^\d+(\.\d+)?%$/.test(s)) base = (parseFloat(s) / 100) * dur;
    else if (/^#\d+$/.test(s)) { const i = parseInt(s.slice(1), 10) - 1; base = words[i] ? words[i].s : 0; }
    else if (/^\d+(\.\d+)?$/.test(s)) base = parseFloat(s);
    else {
      let occ = 1; const mm = s.match(/^(.*)#(\d+)$/); if (mm) { s = mm[1]; occ = parseInt(mm[2], 10); }
      let useEnd = false; if (s.startsWith('after:')) { useEnd = true; s = s.slice(6); }
      const phrase = s.split(/\s+/).map(norm).filter(Boolean);
      let found = -1;
      for (const loose of [false, true]) { // exact match first, then prefix ("chip" → "chips")
        let seen = 0;
        for (let i = 0; i <= toks.length - phrase.length; i++) {
          let ok = true;
          for (let j = 0; j < phrase.length; j++) { const tk = toks[i + j], ph = phrase[j]; if (!(tk === ph || (loose && j === phrase.length - 1 && tk.startsWith(ph)))) { ok = false; break; } }
          if (ok && ++seen === occ) { found = i; break; }
        }
        if (found >= 0) break;
      }
      if (found < 0) { issues.push(`scene ${scene.id}: anchor "${v}" (${label}) not found in VO — using 0`); base = 0; }
      else base = useEnd ? words[found + phrase.length - 1].e : words[found].s;
    }
    return Math.max(0, +(base + off).toFixed(3));
  };
}

const fileUrl = (proj, p) => (/^(https?:|file:|data:)/.test(p) ? p : pathToFileURL(path.resolve(projectDir(proj), p)).href);

export function compileProject(proj, opts = {}) {
  const dir = projectDir(proj);
  const sb = readJSON(path.join(dir, 'storyboard.json'));
  const settings = Object.assign({ fps: 30, boil: 2.2, grain: 0.09, vignette: 0.45, push: 1.045 }, sb.settings || {});
  const issues = [];
  let T = 0;
  const scenes = [];
  const sfx = [];
  const audio = [];
  const lead = settings.lead ?? 0.12;
  for (const raw of sb.scenes) {
    const sc = JSON.parse(JSON.stringify(raw));
    if (!sc.id) { issues.push('a scene is missing "id"'); continue; }
    const tm = sc.vo ? loadTimings(proj, sc) : { words: [], duration: sc.dur || 2, estimated: true };
    if (tm.stale) issues.push(`scene ${sc.id}: VO text changed since voice was generated — run "voice" again (using estimate)`);
    const words = tm.words.map((w) => ({ w: w.w, s: w.s + lead, e: w.e + lead }));
    const dur = sc.dur ?? +(tm.duration + lead + (sc.pad ?? settings.pad ?? 0.25)).toFixed(3);
    const R = makeResolver(sc, words, dur, issues);
    sc.words = words; sc.dur = dur; sc.start = +T.toFixed(3); sc._estimated = !!tm.estimated;
    if (tm.audio && fs.existsSync(path.join(dir, tm.audio))) audio.push({ file: path.join(dir, tm.audio), t: sc.start + lead, dur: tm.duration });
    else if (!tm.estimated && tm.audio) issues.push(`scene ${sc.id}: audio file missing`);

    if (sc.bg && sc.bg.image) sc.bg.image = fileUrl(proj, sc.bg.image);
    else if (sc.bg && sc.bg.prompt && !sc.bg.preset) {
      const guess = path.join(dir, 'bg', `${sc.id}.jpg`);
      if (fs.existsSync(guess)) sc.bg.image = fileUrl(proj, `bg/${sc.id}.jpg`);
      else { issues.push(`scene ${sc.id}: background prompt not generated yet — run "art" (using fallback preset)`); sc.bg.preset = sc.bg.fallback || 'solid'; }
    }
    if (sc.camera && typeof sc.camera === 'object') {
      if (sc.camera.at != null) sc.camera.at = R(sc.camera.at, 'camera.at');
      for (const k of sc.camera.keys || []) k.at = R(k.at ?? 0, 'camera.keys.at');
    }
    sc._shakes = (sc.shake || []).map((s) => Object.assign({}, s, { at: R(s.at, 'shake.at') }));
    for (const s of sc.sfx || []) sfx.push({ name: s.name || s, t: sc.start + R(s.at ?? 0, 'sfx.at'), vol: s.vol });

    const els = sc.elements || (sc.elements = []);
    if (sc.type === 'card') els.unshift({ type: 'card', text: sc.text || sc.vo, size: sc.size, font: sc.font, color: sc.color, instant: sc.instant });
    for (let ei = 0; ei < els.length; ei++) {
      if (els[ei].who) { // recurring cast member → same look every scene
        const c = (sb.cast || {})[els[ei].who];
        if (!c) issues.push(`scene ${sc.id}: cast "${els[ei].who}" not defined in storyboard.cast`);
        else els[ei] = Object.assign({}, JSON.parse(JSON.stringify(c)), els[ei], { look: Object.assign({}, c.look || {}, els[ei].look || {}) });
      }
      const e = els[ei];
      const L = `${e.type}${e.id ? '#' + e.id : ''}`;
      for (const k of ['at', 'until', 'drawAt', 'toAt']) if (e[k] != null) e[k] = R(e[k], `${L}.${k}`);
      for (const m of e.moves || []) m.at = R(m.at, `${L}.moves.at`);
      for (const a of e.actions || []) a.at = R(a.at, `${L}.actions.at`);
      for (const f of e.flips || []) f.at = R(f.at, `${L}.flips.at`);
      for (const b of e.bars || []) if (b.at != null) b.at = R(b.at, `${L}.bars.at`);
      if (e.punch) e.punch = [].concat(e.punch).map((p) => R(p, `${L}.punch`));
      if (e.shake && typeof e.shake === 'object') for (const s of [].concat(e.shake)) { if (s.at != null) s.at = R(s.at, `${L}.shake.at`); if (s.until != null) s.until = R(s.until, `${L}.shake.until`); }
      if (Array.isArray(e.talk)) e.talk = e.talk.map(([a, b]) => [R(a, `${L}.talk`), R(b, `${L}.talk`)]);
      if (e.type === 'image' && e.src) e.src = fileUrl(proj, e.src);
      if (e.type === 'stamp' || e.in === 'slam') sc._shakes.push({ at: (e.at ?? 0) + (e.inDur ?? 0.38) * 0.95, dur: 0.35, amp: e.shakeAmp ?? 16 });
      if (e.type === 'map') compileMap(e, R, issues, sc.id);
      if (e.sfx) for (const s of [].concat(e.sfx)) { const o = typeof s === 'string' ? { name: s } : s; sfx.push({ name: o.name, t: sc.start + (o.at != null ? R(o.at, `${L}.sfx`) : (e.at ?? 0)), vol: o.vol }); }
    }
    delete sc.shake;
    scenes.push(sc);
    T += dur;
  }
  const tl = { fps: settings.fps, width: 1920, height: 1080, duration: +T.toFixed(3), settings, scenes, sfx, audio, music: sb.music ? path.resolve(dir, sb.music) : null, title: sb.title || proj };
  if (opts.write !== false) {
    fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'out', 'timeline.json'), JSON.stringify(tl));
  }
  if (opts.quiet !== true) for (const i of issues) warn(i);
  return { tl, issues };
}

export { KIT_ROOT };
