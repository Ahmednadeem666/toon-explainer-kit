// ElevenLabs voice: per-scene TTS with character timestamps → word timings.
// Also: forced alignment for your own recorded narration.
import fs from 'node:fs';
import path from 'node:path';
import { projectDir, readJSON, writeJSON, log, warn, die, sha, probeDuration, run } from './util.js';
import { norm } from './compile.js';

const API = 'https://api.elevenlabs.io/v1';
const key = () => process.env.ELEVENLABS_API_KEY || die('ELEVENLABS_API_KEY missing — add it to .env (see .env.example)');

function charsToWords(text, chars, starts, ends) {
  const words = []; let cur = '', s = null, e = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) { if (cur) { words.push({ w: cur, s, e }); cur = ''; s = null; } continue; }
    if (s == null) s = starts[i];
    cur += c; e = ends[i];
  }
  if (cur) words.push({ w: cur, s, e });
  return words.map((w) => ({ w: w.w, s: +w.s.toFixed(3), e: +w.e.toFixed(3) }));
}

export async function listVoices() {
  const r = await fetch(`${API}/voices`, { headers: { 'xi-api-key': key() } });
  if (!r.ok) die(`ElevenLabs ${r.status}: ${await r.text()}`);
  const j = await r.json();
  for (const v of j.voices) console.log(`${v.voice_id}  ${v.name}  ${(v.labels && Object.values(v.labels).join(', ')) || ''}`);
}

export async function voiceProject(proj, { only, force } = {}) {
  const dir = projectDir(proj);
  key();
  const sb = readJSON(path.join(dir, 'storyboard.json'));
  const voiceId = sb.voice?.id || process.env.ELEVENLABS_VOICE_ID || die('No voice id: set ELEVENLABS_VOICE_ID in .env or "voice": {"id": "..."} in storyboard.json');
  const model = sb.voice?.model || process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  const settings = Object.assign({ stability: 0.42, similarity_boost: 0.8, style: 0.18, use_speaker_boost: true, speed: 1.0 }, sb.voice?.settings || {});
  fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });
  const scenes = sb.scenes.filter((s) => s.vo);
  let made = 0, chars = 0;
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    if (only && !only.includes(sc.id)) continue;
    const text = sc.vo.trim();
    const say = (sc.say || text).trim(); // optional pronunciation override sent to TTS
    const tf = path.join(dir, 'timings', `${sc.id}.json`);
    const h = sha(say + voiceId + model + JSON.stringify(settings));
    if (!force && fs.existsSync(tf) && readJSON(tf).hash === h && readJSON(tf).text === text) continue;
    const body = { text: say, model_id: model, voice_settings: settings, previous_text: scenes[i - 1]?.vo, next_text: scenes[i + 1]?.vo };
    let r, tries = 0;
    while (true) {
      r = await fetch(`${API}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': key(), 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok || ++tries > 3 || ![429, 500, 502, 503].includes(r.status)) break;
      await new Promise((res) => setTimeout(res, 2000 * tries));
    }
    if (!r.ok) die(`ElevenLabs ${r.status} on scene ${sc.id}: ${await r.text()}`);
    const j = await r.json();
    const mp3 = path.join('audio', `${sc.id}.mp3`);
    fs.writeFileSync(path.join(dir, mp3), Buffer.from(j.audio_base64, 'base64'));
    const al = j.alignment || j.normalized_alignment;
    let words = charsToWords(say, al.characters, al.character_start_times_seconds, al.character_end_times_seconds);
    if (say !== text) words = remapWords(text, words);
    const dur = await probeDuration(path.join(dir, mp3));
    writeJSON(tf, { text, hash: h, audio: mp3, duration: +dur.toFixed(3), words });
    made++; chars += say.length;
    log(`voiced ${sc.id} (${dur.toFixed(1)}s)`);
  }
  log(`voice done — ${made} scene(s) generated, ${chars} characters billed${made ? '' : ' (all cached)'}`);
}

// If "say" differs from "vo" (pronunciation fixes), map spoken word times back onto VO words by position.
function remapWords(text, spoken) {
  const toks = text.split(/\s+/).filter(Boolean);
  if (!spoken.length) return [];
  const t0 = spoken[0].s, t1 = spoken[spoken.length - 1].e;
  return toks.map((w, i) => { const a = spoken[Math.min(spoken.length - 1, Math.round((i / toks.length) * spoken.length))]; const b = spoken[Math.min(spoken.length - 1, Math.round(((i + 1) / toks.length) * spoken.length) - 1)] || a; return { w, s: Math.max(t0, a.s), e: Math.min(t1, Math.max(a.s + 0.05, b.e)) }; });
}

// Own recording: one file for the whole narration → align → split per scene.
export async function alignProject(proj, file) {
  const dir = projectDir(proj);
  const sb = readJSON(path.join(dir, 'storyboard.json'));
  const scenes = sb.scenes.filter((s) => s.vo);
  const full = scenes.map((s) => s.vo.trim()).join('\n');
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(file)]), path.basename(file));
  form.append('text', full);
  log('aligning narration with ElevenLabs forced alignment…');
  const r = await fetch(`${API}/forced-alignment`, { method: 'POST', headers: { 'xi-api-key': key() }, body: form });
  if (!r.ok) die(`ElevenLabs ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const aw = j.words.filter((w) => w.text.trim());
  let k = 0;
  const ranges = scenes.map((sc) => { const n = sc.vo.trim().split(/\s+/).filter(Boolean).length; const ws = aw.slice(k, k + n); k += n; return { sc, ws }; });
  if (k !== aw.length) warn(`word count mismatch: script ${k} vs aligned ${aw.length} — check the recording matches the script exactly`);
  fs.mkdirSync(path.join(dir, 'audio'), { recursive: true });
  const total = await probeDuration(file);
  for (let i = 0; i < ranges.length; i++) {
    const { sc, ws } = ranges[i]; if (!ws.length) continue;
    const prevEnd = i ? ranges[i - 1].ws.at(-1)?.end ?? 0 : 0;
    const nextStart = ranges[i + 1]?.ws[0]?.start ?? total;
    const a = i ? (prevEnd + ws[0].start) / 2 : Math.max(0, ws[0].start - 0.1);
    const b = i < ranges.length - 1 ? (ws.at(-1).end + nextStart) / 2 : total;
    const mp3 = path.join('audio', `${sc.id}.mp3`);
    await run('ffmpeg', ['-y', '-v', 'error', '-ss', a.toFixed(3), '-to', b.toFixed(3), '-i', file, '-ac', '1', '-ar', '44100', '-b:a', '160k', path.join(dir, mp3)]);
    const toks = sc.vo.trim().split(/\s+/).filter(Boolean);
    const words = ws.map((w, j) => ({ w: toks[j] || w.text, s: +(w.start - a).toFixed(3), e: +(w.end - a).toFixed(3) }));
    writeJSON(path.join(dir, 'timings', `${sc.id}.json`), { text: sc.vo.trim(), hash: 'own-recording', audio: mp3, duration: +(b - a).toFixed(3), words });
  }
  void norm;
  log(`aligned ${ranges.length} scenes from ${path.basename(file)}`);
}
