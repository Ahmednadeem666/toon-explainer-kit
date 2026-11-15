# Toon Kit

Claude makes long-form cartoon explainer videos: chibi characters in hand-drawn scenes, maps that light up, charts that draw themselves, black text cards that type out with the voice, and every visual synced to the word that names it.

Free to use. Works on Windows, Mac and Linux.

---

## 1. Unzip it
Unzip somewhere easy to find, like your Desktop. You'll get a folder called **toon-explainer-kit-main**.

## 2. Install the two tools it needs
Skip any you already have: **Node.js 18+** and **ffmpeg**.

**Windows (PowerShell)**
```
winget install OpenJS.NodeJS.LTS; winget install Gyan.FFmpeg
```
**Mac**
```
brew install node ffmpeg
```

## 3. Run setup once
On Windows, double-click **setup.bat** inside the folder. On Mac or Linux, run this inside the folder:
```
bash setup.sh
```
It installs the renderer (about 200 MB including a headless Chrome) and renders a test frame.

## 4. Open the folder in Claude Code and say what you want
```
make a video about why the stock market crashed
```
or use the slash command: `/make-video why the stock market crashed`

Claude reads the kit's rules and walks you through it, stopping for your OK at each step: **angle → research → script (chapter by chapter) → storyboard preview → voice → backgrounds → draft → final render → style check**.

## 5. Have your ElevenLabs key ready
Put it in `.env` for the voiceover. You can also record your own narration and give Claude the file; it aligns every word for you.
Optional: an **OpenAI** or **fal** key in `.env` gets you AI-painted background plates. Without one, Claude uses the built-in code-drawn backgrounds.

Your finished video lands in **projects/&lt;name&gt;/out/final.mp4**, with `captions.srt` and `chapters.txt` next to it.

---

### What's inside
| | |
|---|---|
| `CLAUDE.md` | the workflow Claude follows |
| `docs/STYLE.md` | the house style: pacing, colours, scene recipes, writing rules |
| `docs/ELEMENTS.md` | storyboard format: characters, mascots, maps, charts, counters, stamps, cards… |
| `kit/` | the renderer (headless Chrome → ffmpeg) and the CLI |
| `style/bg-style.txt` | the prompt prefix for AI backgrounds. Drop a `style/reference.png` to lock the look. |
| `sfx/` | drop your own `pop.wav`, `whoosh.wav`, `cash.wav`… to override the built-in ones |
| `projects/demo` | a 40-second sample storyboard |
| `site/` | the landing page (deployed on Vercel via `vercel.json`) — not needed to make videos |

### Commands (Claude runs these for you)
```
node kit/cli.js new <name>        node kit/cli.js check <name>
node kit/cli.js voice <name>      node kit/cli.js preview <name>
node kit/cli.js align <name> f.mp3   node kit/cli.js render <name> --draft
node kit/cli.js art <name> --dry  node kit/cli.js render <name>
```

### Costs (rough)
- **Voice:** ElevenLabs bills per character, and a 10-minute script is about 9–10k characters. Lines are cached, so re-runs only bill the lines you changed.
- **Backgrounds:** about $0.03–0.07 per plate, and a 10-minute video uses 30–80 plates (scenes in the same location share one). Claude shows you the count before spending.
- **Rendering:** free and local. A 10-minute video takes roughly 10–25 minutes depending on your CPU.

---
More free kits drop first in the Telegram → **[t.me/affcooker](https://www.t.me/affcooker)**
