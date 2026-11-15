#!/usr/bin/env node
// toon — cartoon explainer pipeline. Run `node kit/cli.js help`.
import fs from 'node:fs';
import path from 'node:path';
import { KIT_ROOT, projectDir, args, log, die, loadEnv, writeJSON } from './lib/util.js';
import { compileProject } from './lib/compile.js';
import { checkTimeline } from './lib/check.js';

loadEnv();
const a = args(process.argv.slice(2));
const [cmd, name] = a._;
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()) : undefined);
const need = () => { if (!name) die(`usage: toon ${cmd} <project>`); if (!fs.existsSync(projectDir(name))) die(`no project "${name}" — run: node kit/cli.js new ${name}`); };

const HELP = `
toon — cartoon explainer pipeline

  new <name>                  scaffold projects/<name>
  voices                      list your ElevenLabs voices
  voice <name> [--scenes a,b] [--force]   narrate each scene (ElevenLabs, cached)
  align <name> <file.mp3>     use your own recording instead (forced alignment)
  art <name> [--scenes a,b] [--force] [--provider openai|fal] [--dry]   paint background plates
  check <name>                pacing + style lint
  preview <name> [--scenes a,b] [--times 0.2,0.6,0.95]   contact sheets → out/preview/
  frame <name> <seconds|sceneId@sec>      one full-res PNG → out/frame.png
  render <name> [--draft] [--scenes a,b] [--workers N]   video → out/final.mp4 (draft.mp4)
  srt <name>                  captions file → out/captions.srt
  chapters <name>             YouTube chapter timestamps (from scene "chapter" fields) → out/chapters.txt
`;

async function main() {
  switch (cmd) {
    case 'new': {
      if (!name) die('usage: toon new <name>');
      const d = projectDir(name);
      if (fs.existsSync(d)) die(`projects/${name} already exists`);
      for (const sub of ['bg', 'audio', 'timings', 'assets', 'out']) fs.mkdirSync(path.join(d, sub), { recursive: true });
      const tpl = JSON.parse(fs.readFileSync(path.join(KIT_ROOT, 'kit', 'templates', 'storyboard.json'), 'utf8'));
      tpl.title = a.title || name;
      writeJSON(path.join(d, 'storyboard.json'), tpl);
      fs.writeFileSync(path.join(d, 'script.md'), `# ${tpl.title}\n\n## Hook\n\n## Chapter 1\n`);
      fs.writeFileSync(path.join(d, 'sources.md'), `# Sources for ${tpl.title}\n\n| Claim | Source | Date |\n|---|---|---|\n`);
      log(`created projects/${name}`);
      break;
    }
    case 'voices': { const { listVoices } = await import('./lib/voice.js'); await listVoices(); break; }
    case 'voice': { need(); const { voiceProject } = await import('./lib/voice.js'); await voiceProject(name, { only: list(a.scenes), force: a.force }); break; }
    case 'align': { need(); const f = a._[2] || die('usage: toon align <name> <file>'); const { alignProject } = await import('./lib/voice.js'); await alignProject(name, path.resolve(f)); break; }
    case 'art': { need(); const { artProject } = await import('./lib/art.js'); await artProject(name, { only: list(a.scenes), force: a.force, provider: a.provider, dry: a.dry }); break; }
    case 'check': { need(); const { tl, issues } = compileProject(name, { quiet: true }); checkTimeline(tl, issues); break; }
    case 'preview': {
      need(); const { tl, issues } = compileProject(name, { quiet: true }); checkTimeline(tl, issues);
      const { preview } = await import('./lib/render.js');
      const times = list(a.times)?.map(Number);
      const r = await preview(tl, path.join(projectDir(name), 'out', 'preview'), { scenes: list(a.scenes), times });
      log(`preview: ${r.frames.length} frames → ${r.sheets.map((s) => path.relative(KIT_ROOT, s)).join(', ')}`);
      break;
    }
    case 'frame': {
      need(); const { tl } = compileProject(name, { quiet: true });
      const spec = a._[2] || '0'; let t;
      if (spec.includes('@')) { const [id, s] = spec.split('@'); const sc = tl.scenes.find((x) => x.id === id) || die(`no scene ${id}`); t = sc.start + parseFloat(s); } else t = parseFloat(spec);
      const { openPage, grab } = await import('./lib/render.js');
      const { browser, page } = await openPage(tl, 1);
      const out = path.join(projectDir(name), 'out', a.out || 'frame.png');
      fs.writeFileSync(out, await grab(page, t, 'png')); await browser.close();
      log(`frame @${t.toFixed(2)}s → ${path.relative(KIT_ROOT, out)}`);
      break;
    }
    case 'chapters': {
      need(); const { tl } = compileProject(name, { quiet: true });
      const ts = (t) => { const s = Math.floor(t); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
      const lines = []; for (const sc of tl.scenes) if (sc.chapter) lines.push(`${ts(sc.start)} ${sc.chapter}`);
      if (lines.length && !lines[0].startsWith('0:00')) lines.unshift('0:00 Intro');
      const f = path.join(projectDir(name), 'out', 'chapters.txt'); fs.writeFileSync(f, lines.join('\n') + '\n');
      console.log(lines.join('\n')); log(`chapters → ${path.relative(KIT_ROOT, f)}`);
      break;
    }
    case 'srt': { need(); const { tl } = compileProject(name, { quiet: true }); const { writeSrt } = await import('./lib/render.js'); const f = path.join(projectDir(name), 'out', 'captions.srt'); writeSrt(tl, f); log(`captions → ${path.relative(KIT_ROOT, f)}`); break; }
    case 'render': {
      need();
      const { tl, issues } = compileProject(name, { quiet: true });
      checkTimeline(tl, issues);
      const R = await import('./lib/render.js');
      const outDir = path.join(projectDir(name), 'out');
      let from = 0, to = tl.duration;
      const sel = list(a.scenes);
      if (sel) { const ss = tl.scenes.filter((s) => sel.includes(s.id)); if (!ss.length) die('no matching scenes'); from = Math.min(...ss.map((s) => s.start)); to = Math.max(...ss.map((s) => s.start + s.dur)); }
      const silent = await R.renderVideo(tl, outDir, { workers: a.workers ? +a.workers : undefined, draft: !!a.draft, from, to });
      const aud = await R.mixAudio(tl, outDir, { from, to });
      const final = path.join(outDir, a.draft ? 'draft.mp4' : sel ? `part_${sel.join('-')}.mp4` : 'final.mp4');
      await R.finalMux(silent, aud, from === 0 ? tl.music : null, final, to - from);
      if (!sel) R.writeSrt(tl, path.join(outDir, 'captions.srt'));
      for (const f of ['video_silent.mp4', 'voice.wav', 'sfx.wav']) { const p = path.join(outDir, f); if (fs.existsSync(p)) fs.unlinkSync(p); }
      log(`done → ${path.relative(KIT_ROOT, final)}  (${(to - from).toFixed(1)}s)`);
      break;
    }
    default: console.log(HELP);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
