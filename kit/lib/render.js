// Headless-Chrome frame renderer + audio mixer.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { KIT_ROOT, projectDir, log, run, findChrome, writeJSON } from './util.js';

const PLAYER = pathToFileURL(path.join(KIT_ROOT, 'kit', 'player', 'player.html')).href;

export async function openPage(tl, scale = 1) {
  const exe = findChrome();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: exe || undefined,
    args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox', '--font-render-hinting=none', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: scale });
  page.on('pageerror', (e) => console.error('[player error]', e.message));
  await page.goto(PLAYER, { waitUntil: 'load' });
  await page.evaluate(async (t) => { await window.TOON.load(t); }, tl);
  return { browser, page };
}

export async function grab(page, t, type = 'jpeg') {
  await page.evaluate(async (tt) => { await window.TOON.seek(tt); }, t);
  return page.screenshot({ type, quality: type === 'jpeg' ? 92 : undefined, optimizeForSpeed: true, captureBeyondViewport: false });
}

// Still frames + contact sheet for the style check.
export async function preview(tl, outDir, { scenes, times = [0.15, 0.5, 0.92], cols = 4 } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (/^f\d+.*\.jpg$|^sheet/.test(f)) fs.unlinkSync(path.join(outDir, f));
  const { browser, page } = await openPage(tl, 0.5);
  const list = tl.scenes.filter((s) => !scenes || scenes.includes(s.id));
  let n = 0; const frames = [];
  for (const sc of list) for (const k of times) {
    const t = sc.start + Math.min(sc.dur - 0.05, Math.max(0.02, sc.dur * k));
    const buf = await grab(page, t);
    const f = path.join(outDir, `f${String(n++).padStart(4, '0')}_${sc.id}.jpg`); fs.writeFileSync(f, buf); frames.push(f);
  }
  await browser.close();
  // tile into sheets of cols x 4
  const per = cols * 4; const sheets = [];
  for (let i = 0; i < frames.length; i += per) {
    const chunk = frames.slice(i, i + per);
    const listF = path.join(outDir, `list${i}.txt`);
    const sheet = path.join(outDir, `sheet${String(i / per + 1).padStart(2, '0')}.jpg`);
    const ins = []; chunk.forEach((f) => ins.push('-i', f));
    const pads = chunk.length < per ? per - chunk.length : 0;
    const filt = chunk.map((_, j) => `[${j}:v]scale=480:270,drawtext=fontfile=${path.join(KIT_ROOT, 'node_modules/@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff').replace(/\\/g, '/').replace(/:/g, '\\:')}:text='${path.basename(chunk[j]).split('_').slice(1).join('_').replace('.jpg', '')}':x=8:y=8:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6[v${j}]`).join(';');
    const padIns = []; for (let p = 0; p < pads; p++) padIns.push(`color=black:s=480x270:d=1[p${p}]`);
    const all = chunk.map((_, j) => `[v${j}]`).join('') + Array.from({ length: pads }, (_, p) => `[p${p}]`).join('');
    const fc = [filt, ...padIns, `${all}xstack=inputs=${per}:layout=${Array.from({ length: per }, (_, j) => `${(j % cols) * 480}_${Math.floor(j / cols) * 270}`).join('|')}[out]`].join(';');
    await run('ffmpeg', ['-y', '-v', 'error', ...ins, '-filter_complex', fc, '-map', '[out]', '-frames:v', '1', sheet]);
    sheets.push(sheet); if (fs.existsSync(listF)) fs.unlinkSync(listF);
  }
  return { frames, sheets };
}

function ffmpegEncoder(out, fps, crf = 18) {
  const p = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg encode failed ' + c)))));
  return { p, done, write: (buf) => new Promise((res) => (p.stdin.write(buf) ? res() : p.stdin.once('drain', res))) };
}

export async function renderVideo(tl, outDir, { workers, draft = false, from = 0, to = tl.duration } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const fps = draft ? 15 : tl.fps; const scale = draft ? 0.5 : 1;
  const f0 = Math.floor(from * fps), f1 = Math.ceil(to * fps);
  const total = f1 - f0;
  const N = Math.max(1, Math.min(workers || Math.max(1, Math.floor(os.cpus().length / 2)), 8, Math.ceil(total / 60)));
  log(`rendering ${total} frames @${fps}fps with ${N} worker(s)${draft ? ' (draft 960x540)' : ''}`);
  const per = Math.ceil(total / N);
  const t0 = Date.now(); let doneFrames = 0;
  const chunks = [];
  await Promise.all(Array.from({ length: N }, async (_, w) => {
    const a = f0 + w * per, b = Math.min(f1, a + per); if (a >= b) return;
    const out = path.join(outDir, `chunk${w}.mp4`); chunks[w] = out;
    const enc = ffmpegEncoder(out, fps);
    const { browser, page } = await openPage(tl, scale);
    for (let f = a; f < b; f++) {
      const buf = await grab(page, f / fps);
      await enc.write(buf);
      doneFrames++;
      if (w === 0 && f % (fps * 5) === 0) { const el = (Date.now() - t0) / 1000; const rate = doneFrames / el; process.stdout.write(`\r  ${doneFrames}/${total} frames  ${(rate).toFixed(1)} fps  eta ${Math.round((total - doneFrames) / rate)}s   `); }
    }
    enc.p.stdin.end(); await enc.done; await browser.close();
  }));
  process.stdout.write('\n');
  const list = path.join(outDir, 'chunks.txt');
  fs.writeFileSync(list, chunks.filter(Boolean).map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join('\n'));
  const silent = path.join(outDir, 'video_silent.mp4');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
  for (const c of chunks.filter(Boolean)) fs.unlinkSync(c); fs.unlinkSync(list);
  log(`frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return silent;
}

// ---- audio: decode clips → mix in JS → wav ----
const SR = 44100;
async function decode(file) {
  const out = await new Promise((res, rej) => { const p = spawn('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }); const bufs = []; p.stdout.on('data', (d) => bufs.push(d)); p.on('close', (c) => (c === 0 ? res(Buffer.concat(bufs)) : rej(new Error('decode failed: ' + file)))); });
  return new Float32Array(out.buffer, out.byteOffset, Math.floor(out.length / 4));
}
function writeWav(file, data) {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + data.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(data[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, b);
}
export function sfxFile(name) {
  if (fs.existsSync(name)) return name;
  for (const dir of [path.join(KIT_ROOT, 'sfx'), path.join(KIT_ROOT, 'kit', 'sfx')]) for (const ext of ['.wav', '.mp3']) { const f = path.join(dir, name + ext); if (fs.existsSync(f)) return f; }
  return null;
}

export async function mixAudio(tl, outDir, { from = 0, to = tl.duration } = {}) {
  const len = Math.ceil((to - from) * SR) + SR;
  const voice = new Float32Array(len), fx = new Float32Array(len);
  let anyVoice = false, anyFx = false;
  for (const a of tl.audio) { if (a.t > to || a.t + a.dur < from) continue; const d = await decode(a.file); const o = Math.round((a.t - from) * SR); for (let i = 0; i < d.length; i++) { const j = o + i; if (j >= 0 && j < len) voice[j] += d[i]; } anyVoice = true; }
  const cache = {};
  for (const s of tl.sfx) { if (s.t < from || s.t > to) continue; const f = sfxFile(s.name); if (!f) continue; const d = cache[f] || (cache[f] = await decode(f)); const o = Math.round((s.t - from) * SR); const v = s.vol ?? 0.5; for (let i = 0; i < d.length; i++) { const j = o + i; if (j >= 0 && j < len) fx[j] += d[i] * v; } anyFx = true; }
  const vf = path.join(outDir, 'voice.wav'), ff = path.join(outDir, 'sfx.wav');
  writeWav(vf, voice); writeWav(ff, fx);
  return { voice: anyVoice ? vf : null, sfx: anyFx ? ff : null };
}

export async function finalMux(silent, aud, music, out, dur) {
  const ins = ['-i', silent]; const filters = []; const mixIn = [];
  let idx = 1;
  if (aud.voice) { ins.push('-i', aud.voice); filters.push(`[${idx}:a]aformat=channel_layouts=stereo,asplit=2[vo][vsc]`); mixIn.push('[vo]'); idx++; }
  if (aud.sfx) { ins.push('-i', aud.sfx); filters.push(`[${idx}:a]aformat=channel_layouts=stereo[fx]`); mixIn.push('[fx]'); idx++; }
  if (music && fs.existsSync(music)) {
    ins.push('-stream_loop', '-1', '-i', music);
    if (aud.voice) filters.push(`[${idx}:a]aformat=channel_layouts=stereo,volume=0.32[mu];[mu][vsc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck]`);
    else filters.push(`[${idx}:a]aformat=channel_layouts=stereo,volume=0.25[duck]`);
    mixIn.push('[duck]'); idx++;
  } else if (aud.voice) filters.push('[vsc]anullsink');
  if (!mixIn.length) { fs.copyFileSync(silent, out); return out; }
  filters.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=first,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5:LRA=11[aout]`);
  await run('ffmpeg', ['-y', '-v', 'error', ...ins, '-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(dur), '-movflags', '+faststart', out]);
  return out;
}

export function writeSrt(tl, file) {
  const lines = []; let n = 1;
  const ts = (t) => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  for (const sc of tl.scenes) {
    let group = [];
    const flush = () => { if (!group.length) return; lines.push(`${n++}\n${ts(sc.start + group[0].s)} --> ${ts(sc.start + group[group.length - 1].e + 0.1)}\n${group.map((w) => w.w).join(' ')}\n`); group = []; };
    for (const w of sc.words || []) { group.push(w); if (group.length >= 7 || /[.!?,;:]$/.test(w.w)) flush(); }
    flush();
  }
  fs.writeFileSync(file, lines.join('\n'));
}

export { writeJSON, projectDir };
