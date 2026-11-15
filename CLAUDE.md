# Toon Kit: how Claude makes the video

You turn a topic into a finished **16:9 long-form cartoon explainer** (5–15 min) in the paper-cartoon finance-explainer style: chibi characters, hand-drawn scenes, maps and charts, black text cards that type in with the voice, and every visual synced to the word that names it.

Read these before your first storyboard of the session:
- `docs/STYLE.md`: the look, pacing numbers, scene recipes, writing rules
- `docs/ELEMENTS.md`: the storyboard format and every element type

All commands run from the kit root: `node kit/cli.js <command> <project>`.

## Before anything: health check (silent unless something's wrong)
1. `node -v` (needs 18+), `ffmpeg -version`, and `node_modules/` exists. If any is missing, tell the user to run `setup.bat` (Windows) or `bash setup.sh` (Mac/Linux) and stop.
2. Check that `.env` exists. Keys are only needed later: `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` for voice, and `OPENAI_API_KEY` or `FAL_KEY` for background plates. Don't block on them now.

## The workflow (stop at every ⏸ and wait for the user's OK)

### 1. Angle
If the user gave only a topic, propose **3 angles**, each as a title, a one-line hook (the cold-open sentence) and a length (default 8–12 min). ⏸ They pick one.
Then: `node kit/cli.js new <slug>`. Use a short kebab-case slug.

### 2. Research
Use web search. Go for primary and recent sources: filings, official data, and major outlets for news. Write `projects/<slug>/sources.md` as a table: claim | figure | source URL | date. Any number that will be said or shown **must** have a row. If sources disagree, use the conservative figure and say "about". Don't invent quotes; paraphrase what people said. Stay neutral on politics.

### 3. Outline
Lay out the cold open, then 3–6 chapters with 3–6 beats each, the payoff, and the closing line that loops back to the open. Note the open loop that ends each chapter. ⏸ OK.

### 4. Script, one chapter at a time
Write `script.md` chapter by chapter and show each chapter as you finish it. ⏸ OK per chapter (if the user says "just go", do the rest without stopping). Follow the writing rules and banned-phrase list in STYLE.md; it must not read like AI. Target about 150–165 words per minute of video.

### 5. Storyboard
Turn the approved script into `storyboard.json`:
- **Split into scenes**: one sentence or clause each, 2–7s. Mark the turns and punchlines as `"type":"card"`, one every 20–60s.
- Put **every recurring person or company in `cast`** first.
- Give each scene a recipe from STYLE.md and at least 2 beats, anchored to words in its `vo`.
- Backgrounds: use a `preset` where one fits. Use `bg.prompt` for anything specific (a casino, a port, a Senate hearing room, a desert data center). Give continuous locations the same prompt. Always set a `fallback` preset.
- Add `chapter` to the first scene of each chapter.
- Then run `node kit/cli.js check <slug>` and fix every warning.
- Then run `node kit/cli.js preview <slug>`, **open the sheets in `out/preview/` and look at them**, and fix overlaps, empty scenes, off-screen elements and anything that looks wrong. Re-preview just the changed scenes with `--scenes s010,s011`.
- Show the user one sheet per chapter (send the image files). ⏸ OK.

Write the storyboard in chunks (one chapter per edit) rather than one giant write.

### 6. Voice
- With ElevenLabs: `node kit/cli.js voice <slug>`. Results are cached per scene, so re-running only bills changed lines. If `ELEVENLABS_VOICE_ID` is missing, run `node kit/cli.js voices` and ask the user to pick one.
- With their own recording: put the file in the project, then run `node kit/cli.js align <slug> <file>`. The recording must match `vo` word for word, in scene order.
- Use `say` for anything TTS mispronounces (tickers, acronyms, numbers like "H200").
- Then run `check` again. Real timings move anchors, so fix any new warnings.

### 7. Background plates (costs money: confirm first)
Run `node kit/cli.js art <slug> --dry` to list the plates. Tell the user how many images will be made and the rough cost (gpt-image-1 at medium quality is about $0.04–0.07 per image; flux-dev is about $0.025). ⏸ OK.
Then run `node kit/cli.js art <slug>`. Look at every plate: no people, text or logos; style consistent; floor area clear. Regenerate bad ones with `--scenes s0xx --force` after tightening the prompt.
If the user has no image key, the code presets work fine. Say so and carry on.

### 8. Render
1. `node kit/cli.js render <slug> --draft` gives a fast 960×540 at 15fps for review. Send it to the user. ⏸ Notes?
2. Fix the notes, then re-render just those scenes for a look: `render <slug> --scenes s012,s013`.
3. `node kit/cli.js render <slug>` makes the final 1080p30 → `out/final.mp4`. A 10-min video takes roughly 10–25 min depending on CPU cores.

### 9. Style check (always, before saying done)
Run `preview` on the final timeline and go through **STYLE.md → Final check** item by item. Fix and re-render the scenes that fail. Then deliver:
- `out/final.mp4` (send it)
- `out/captions.srt` (for YouTube CC)
- `out/chapters.txt` (`node kit/cli.js chapters <slug>`)
- 3 title options, a description that includes the chapters and a sources list from `sources.md`, and a thumbnail idea (one big object with a face plus 2–4 words)

## Rules that always apply
- **Never invent numbers, quotes or events.** Every on-screen figure is in `sources.md`. Mark illustrative charts "(illustrative)".
- **No real logos and no photos of real people.** Companies become `blob` mascots; people become chibi caricatures with a name label.
- Characters, text and charts are drawn by code. AI images are **only** empty background plates (or prop PNGs with no text).
- Before you call anything finished, look at your own output (the preview sheets or the frames). Don't assume it renders well.
- Keep scene ids stable. Renumbering throws away cached audio and plates. To insert a scene, use a suffix (`s014b`).
- If the user wants a different look (palette, fonts, character proportions), it lives in `kit/player/` (characters.js, props.js, backgrounds.js, engine.js). Change it there, then preview.
- Don't spend money (voice regeneration of the whole script, image batches) without saying how much first.
