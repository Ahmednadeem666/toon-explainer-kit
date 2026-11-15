// AI background plates. Each scene with bg.prompt gets bg/<id>.jpg (1920x1080).
// Providers: openai (gpt-image) | fal (flux). The house style prefix lives in style/bg-style.txt.
import fs from 'node:fs';
import path from 'node:path';
import { KIT_ROOT, projectDir, readJSON, log, warn, die, run, sha, writeJSON } from './util.js';

function stylePrefix() {
  const f = path.join(KIT_ROOT, 'style', 'bg-style.txt');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '';
}
function styleRef() {
  for (const n of ['reference.png', 'reference.jpg', 'reference.jpeg', 'reference.webp']) { const f = path.join(KIT_ROOT, 'style', n); if (fs.existsSync(f)) return f; }
  return null;
}

async function openaiImage(prompt) {
  const k = process.env.OPENAI_API_KEY || die('OPENAI_API_KEY missing in .env');
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const quality = process.env.OPENAI_IMAGE_QUALITY || 'medium';
  const ref = styleRef();
  let r;
  if (ref) {
    const form = new FormData();
    form.append('model', model); form.append('prompt', prompt + '\n\nMatch ONLY the drawing style, line weight, palette treatment and texture of the attached reference image. Do not copy its layout, objects, characters or text.');
    form.append('size', '1536x1024'); form.append('quality', quality);
    form.append('image[]', new Blob([fs.readFileSync(ref)], { type: ref.endsWith('.png') ? 'image/png' : 'image/jpeg' }), path.basename(ref));
    r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${k}` }, body: form });
  } else {
    r = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${k}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, prompt, size: '1536x1024', quality, n: 1 }) });
  }
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const d = j.data[0];
  if (d.b64_json) return Buffer.from(d.b64_json, 'base64');
  return Buffer.from(await (await fetch(d.url)).arrayBuffer());
}

async function falImage(prompt) {
  const k = process.env.FAL_KEY || die('FAL_KEY missing in .env');
  const model = process.env.FAL_MODEL || 'fal-ai/flux/dev';
  const r = await fetch(`https://fal.run/${model}`, { method: 'POST', headers: { Authorization: `Key ${k}`, 'content-type': 'application/json' }, body: JSON.stringify({ prompt, image_size: 'landscape_16_9', num_images: 1, enable_safety_checker: true }) });
  if (!r.ok) throw new Error(`fal ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return Buffer.from(await (await fetch(j.images[0].url)).arrayBuffer());
}

export async function artProject(proj, { only, force, provider, dry } = {}) {
  const dir = projectDir(proj);
  const sb = readJSON(path.join(dir, 'storyboard.json'));
  provider = provider || process.env.IMAGE_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : process.env.FAL_KEY ? 'fal' : null);
  const prefix = stylePrefix();
  const todo = sb.scenes.filter((s) => s.bg && s.bg.prompt && (!only || only.includes(s.id)));
  const manifestF = path.join(dir, 'bg', 'manifest.json');
  const manifest = fs.existsSync(manifestF) ? readJSON(manifestF) : {};
  // Reuse: scenes with identical prompts share one plate (saves money, keeps continuity)
  const byPrompt = {};
  let made = 0;
  fs.mkdirSync(path.join(dir, 'bg'), { recursive: true });
  for (const sc of todo) {
    const full = `${prefix}\n\nSCENE: ${sc.bg.prompt}`;
    const h = sha(full + provider);
    const out = path.join(dir, 'bg', `${sc.id}.jpg`);
    if (!force && fs.existsSync(out) && manifest[sc.id] === h) continue;
    if (byPrompt[h]) { fs.copyFileSync(byPrompt[h], out); manifest[sc.id] = h; continue; }
    if (dry) { console.log(`--- ${sc.id}\n${full}\n`); continue; }
    if (!provider) die('No image provider: add OPENAI_API_KEY or FAL_KEY to .env (or drop your own 1920x1080 images into projects/<name>/bg/<sceneId>.jpg)');
    log(`painting ${sc.id} via ${provider}…`);
    let buf;
    try { buf = provider === 'fal' ? await falImage(full) : await openaiImage(full); }
    catch (e) { warn(`${sc.id}: ${e.message.slice(0, 300)}`); continue; }
    const raw = path.join(dir, 'bg', `${sc.id}.raw`);
    fs.writeFileSync(raw, buf);
    await run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080', '-q:v', '3', out]);
    fs.unlinkSync(raw);
    manifest[sc.id] = h; byPrompt[h] = out; made++;
    writeJSON(manifestF, manifest);
  }
  writeJSON(manifestF, manifest);
  log(`art done — ${made} new plate(s)`);
}
