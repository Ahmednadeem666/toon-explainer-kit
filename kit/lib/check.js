// Style & pacing lint. Mirrors the rules in STYLE.md so problems surface before a long render.
import { log, warn } from './util.js';

export function checkTimeline(tl, issues) {
  const S = tl.settings; const maxGap = S.maxGap ?? 4.5;
  const out = []; const add = (lvl, msg) => out.push([lvl, msg]);
  let words = 0, cards = 0, lastCard = 0, sameBgRun = 0, prevBg = null, est = 0;
  for (const sc of tl.scenes) {
    words += (sc.words || []).length; if (sc._estimated) est++;
    if (sc.type === 'card') {
      cards++; lastCard = sc.start;
      const n = (sc.text || sc.vo || '').split(/\s+/).length;
      if (n > 14) add('warn', `${sc.id}: text card has ${n} words — keep cards to 3–12 words (punchlines, turns, cliffhangers)`);
      continue;
    }
    if (sc.start - lastCard > (S.cardGap ?? 75) && tl.duration > 120) { add('tip', `${sc.id}: no text card for ${Math.round(sc.start - lastCard)}s — drop a black card at the next big turn`); lastCard = sc.start; }
    if (sc.dur > (S.maxScene ?? 9.5)) add('warn', `${sc.id}: ${sc.dur.toFixed(1)}s long — split into 2+ scenes (reference cuts every ~3–4s, rarely >8s)`);
    // visual beats: entrances, actions, moves, punches, highlights
    const beats = [0];
    for (const e of sc.elements || []) {
      if (e.at != null) beats.push(e.at);
      for (const a of e.actions || []) beats.push(a.at);
      for (const m of e.moves || []) beats.push(m.at);
      for (const p of e.punch || []) beats.push(p);
      for (const h of e.highlight || []) beats.push(h.at);
      for (const p of e._pins || []) beats.push(p.at);
      for (const r of e._routes || []) beats.push(r.at);
      for (const b of e.bars || []) if (b.at != null) beats.push(b.at);
      if (e.type === 'line' || e.type === 'counter') beats.push((e.at ?? 0) + 1);
      const x = e.x ?? 960, y = e.y ?? 540;
      if (x < -300 || x > 2220 || y < -300 || y > 1500) if (!(e.moves || []).length) add('warn', `${sc.id}: ${e.type} sits off-screen at (${x},${y})`);
    }
    beats.push(sc.dur); beats.sort((a, b) => a - b);
    let gap = 0, gapAt = 0; for (let i = 1; i < beats.length; i++) if (beats[i] - beats[i - 1] > gap) { gap = beats[i] - beats[i - 1]; gapAt = beats[i - 1]; }
    if (gap > maxGap) add('warn', `${sc.id}: nothing new happens for ${gap.toFixed(1)}s (from ${gapAt.toFixed(1)}s) — add a beat: expression change, pop-in label, punch, camera move`);
    if (!(sc.elements || []).length) add('warn', `${sc.id}: empty scene (background only)`);
    const bgKey = JSON.stringify(sc.bg || {});
    sameBgRun = bgKey === prevBg ? sameBgRun + 1 : 0; prevBg = bgKey;
    if (sameBgRun === 3) add('tip', `${sc.id}: 4 scenes in a row on the same background — change location or go to a map/chart/card`);
  }
  const mins = tl.duration / 60;
  log(`${tl.scenes.length} scenes · ${mins.toFixed(1)} min · ${words} words (${Math.round(words / mins)} wpm) · ${cards} text cards${est ? ` · ${est} scene(s) on estimated timing (no voice yet)` : ''}`);
  for (const i of issues) add('error', i);
  for (const [lvl, m] of out) (lvl === 'tip' ? log : warn)(`${lvl === 'error' ? 'ERROR ' : lvl === 'tip' ? 'tip: ' : ''}${m}`);
  if (!out.length) log('style check: clean ✓');
  return out;
}
