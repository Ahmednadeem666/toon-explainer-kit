# House style: "paper-cartoon finance explainer"

This style is studied from a 15-minute reference ("Why the Stock Market Just Crashed"). Every rule below comes from what that video does.

## The look
- **Flat 2D cartoon with hand-drawn outlines.** Outlines are dark brown-black (`#2b2522`), 4–5px, with round joins. Fills are flat with very little shading. A light paper grain and a soft vignette sit over every frame. The line boil (a slight wobble) keeps still shots alive.
- **Chibi people.** Big round head (about as tall as the body), dot eyes, small expressive mouth, simple body, stick legs. The emotion lives in the face, eyebrows and sweat drops.
- **Everything has a face.** Companies, chips, buildings, bar-chart bars and money can all get a face and an expression. This is the main comedy device.
- **Fonts.** Gochi Hand for labels, Permanent Marker for big numbers and stamps, Patrick Hand (slightly slanted) for black text cards.
- **Colour means something:**
  - green (`#3fbf4a` / neon `#5be05b`): gains, hype, AI money
  - red (`#d6403a` / neon `#ff4a4a`): losses, panic, danger
  - warm sunset (pink/orange): story moments, "the journey"
  - night blue: tension, waiting, secrets
  - cream paper / whiteboard: explanation, charts, data
  - deep green felt or dark rooms: casinos, trading floors, high stakes

## Pacing (measured from the reference)
- **A cut every ~3.2s (median); 90% of shots are under 7s.** One scene = one sentence or one clause. `check` warns above 9.5s.
- **Something changes every 2–4s inside a scene.** That can be an expression change, a pop-in label, a counter, a punch on a key word, or a camera move. `check` flags dead stretches longer than 4.5s.
- **Black text cards about every 20–60s.** In the first five minutes, the reference cuts to black with handwritten text 16 times. Use them for:
  - the cold open's first line
  - turns: "But.", "Then Thursday happened.", "And the ones that did have buyers…"
  - punchlines and cliffhangers before a chapter break
  - half-sentences that hand off to the next visual ("So your retirement may be quietly lending…" then cut to the visual)

  Keep them to 3–12 words. They type in exactly as they're spoken.
- **Every number appears on screen when it's said.** Use a counter, a tag, or a neon board. Anchor it to the word.

## Recurring scene recipes (use these, mix them)
1. **The stage.** A character in a location (office, kitchen, street, news studio) reacts with an expression change on the key word. A prop or label pops up.
2. **Map moment.** Beige land, blue-grey water, the country turns red on its name, a pin drops with a paper tag, and a dashed route draws between places. Push the camera in toward the action.
3. **Chart on paper.** A whiteboard or lined paper background with bars or a line that draws on. Bars have faces, values tick up, and a red arrow points at the one that matters.
4. **The big metaphor.** A giant glowing object (the chip) stands in for an idea: tilting off a cliff, crushing a character, on a casino table. Use `prop` with `scale` 2–4, plus `glow`, `moves` with `rotate`, and a sunset or night background.
5. **Trading floor.** A dark room with ticker boards, a crowd that jumps when markets are green and panics when they're red, paper flying, neon index numbers, and the `alarm` mood when markets fall.
6. **News desk.** The `studio` background, a person with a `lowerThird`, a `LIVE` banner, and a ticker along the bottom.
7. **Document close-up.** A `doc` with a header, quote lines and a stamp slamming on top (APPROVED / DENIED / AT RISK).
8. **Time stamp.** A `clock` or `calendar` in the corner whenever the narration says a day or time ("Tuesday, Nov 3", "4:00 PM ET").
9. **Crowd/vote/people.** A `crowd` reacting, ballot boxes, wanted posters: any time "people" or "everyone" is the subject.
10. **Black card.** See pacing above.

Don't run the same recipe more than 3 scenes in a row. `check` nudges you after 4 scenes on the same background.

## Characters
- **Real public figures:** draw a chibi caricature with 1–2 signature traits (hair, glasses, a jacket colour). Name them with a `lowerThird` or `tag` the first time they appear. Keep them respectful. Never use photos.
- **Companies:** use a `blob` mascot in a brand-ish colour with the name on it, never the real logo.
- **The viewer stand-in:** an everyday character ("your 401k guy", "a retail investor") recurs through the video. Define them in `cast`.
- **Keep every recurring person in `cast`** so their look never drifts.

## Camera
- By default, every scene slowly pushes in (1.0 → 1.045).
- **One purposeful move per scene at most:** a zoom into the map hotspot, a pan from the cause to the effect, or a push onto a face for the reaction.
- Use shake only for impact: stamps, crashes, slams.
- Transitions are mostly hard cuts. Use `flash` for good news or a reveal, `whip` for "meanwhile, elsewhere", and `fade` for chapter breaks.

## Sound
- The voice leads. Music sits low and ducks under the voice automatically.
- SFX are sparse and land on the beat: `pop` (labels), `whoosh` (moves and whips), `stamp`/`thud` (slams), `cash` (money), `tick` (clocks), `ding` (reveals), `rise`/`fall` (charts), `alarm` (crash), `type` (typing). Use about one per scene at most, not on every pop. Users can drop better SFX into `sfx/` with the same names, and those win.

## AI background plates
- Use backgrounds only: **no people, text, logos or numbers in the plate**. Characters and all text are drawn by code so they stay sharp, consistent and animatable.
- Leave the bottom-middle third empty as a floor or stage for characters.
- The house prompt lives in `style/bg-style.txt`. Put a style reference image at `style/reference.png` and the OpenAI provider will match its look on every plate.
- Reuse one plate across neighbouring scenes in the same location: give them the identical prompt and `art` makes it only once.

## Writing (the narration)
- Short sentences, second person ("your retirement"), concrete numbers, one idea per sentence.
- Cold open on the most dramatic moment, then "To understand how we got here…". Use 3–6 chapters, and end every chapter on an open loop.
- Make the joke with the picture, not the words. The narrator stays dry; the visuals are funny.
- **Banned phrases (they read as AI):** delve, tapestry, landscape, navigate, "in today's world", "it's important to note", "game-changer", "buckle up", "let's dive in", "a testament to", "in conclusion", "the stakes have never been higher", "here's the thing", "but here's the kicker", "make no mistake", "at the end of the day", "unpack". Also cut rhetorical-question chains and triple-adjective lists.
- Every figure has a row in `sources.md`. If it's an estimate, say "about" or "roughly" in the VO.

## Final check (do it on the preview sheets before you say "done")
- [ ] No scene is just a background and a character standing still. Every scene has at least 2 beats.
- [ ] Every number in the VO appears on screen, timed to the word.
- [ ] The look matches across scenes: same cast looks, same palette logic, no stray plate with text or people in it.
- [ ] Nothing is cut off at the frame edge. Labels don't cover faces.
- [ ] Text cards are frequent enough and short.
- [ ] Real people are caricatured and labeled; there are no real logos.
- [ ] Audio: the voice is clear over the music, and SFX aren't spammy.
