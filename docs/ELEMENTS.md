# Storyboard reference

`projects/<name>/storyboard.json` is the whole video. The stage is **1920×1080**, origin top-left. Characters stand on the **floor line, y ≈ 860–900**.

## File shape

```json
{
  "title": "Why the Stock Market Just Crashed",
  "voice": { "id": "optional-voice-id", "model": "eleven_multilingual_v2", "settings": { "stability": 0.42, "similarity_boost": 0.8, "style": 0.18, "speed": 1.0 } },
  "music": "assets/music.mp3",
  "settings": { "fps": 30, "boil": 2.2, "grain": 0.09, "vignette": 0.45, "push": 1.045, "maxGap": 4.5, "maxScene": 9.5, "cardGap": 75 },
  "cast": { "gary": { "type": "character", "look": { "...": "..." } } },
  "scenes": [ { "id": "s001", "vo": "...", "elements": [] } ]
}
```

- `music` loops under the whole video and ducks automatically while the voice is talking.
- `settings.boil` is how strong the hand-drawn line wobble is (0 turns it off). `push` is the default slow camera zoom per scene.
- `cast` holds recurring characters and mascots. In a scene, `{"type":"character","who":"gary", ...}` pulls in Gary's look, so he looks the same in every scene. Anything set on the element overrides the cast entry for that scene only.

## Scene

| field | meaning |
|---|---|
| `id` | unique, sortable: `s001`, `s002`… Audio and backgrounds are cached per id, so never reuse an id for a different line. |
| `vo` | the narration for this scene. **One sentence, or one clause of a long sentence. Aim for 2–7s.** |
| `say` | optional pronunciation override sent to TTS (e.g. `"vo": "NVDA fell"`, `"say": "Nvidia fell"`). Word timing still maps onto `vo`. |
| `type` | `"card"` gives a black text card where the words type in as they're spoken. Omit it for a normal scene. |
| `text` | card only: different on-screen text from the VO (rare). |
| `bg` | `{ "preset": "office" }` · `{ "prompt": "…", "fallback": "office" }` (AI plate, made by `art`) · `{ "image": "assets/x.jpg" }` · `{ "preset": "solid", "color": "#1d2b3a" }` |
| `camera` | default is a gentle push-in. `false` = locked. `{ "from": {"x":960,"y":540,"zoom":1}, "to": {"x":1300,"y":420,"zoom":1.35}, "at": "word", "dur": 1.2, "ease": "inOut" }` or `{ "keys": [ {"at":0,"zoom":1}, {"at":"chips","x":1400,"y":500,"zoom":1.6,"dur":0.8} ] }` |
| `mood` | colour overlay: `alarm` (pulsing red edges) · `green` (hype glow) · `night` · `sepia` (flashback) |
| `transition` | `cut` (default) · `fade` · `flash` · `whip` |
| `shake` | `[ {"at":"crashed","dur":0.4,"amp":18} ]` camera shake. Stamps and `"in":"slam"` shake automatically. |
| `sfx` | `[ {"name":"whoosh","at":"start"} ]` |
| `chapter` | YouTube chapter title that starts at this scene (`node kit/cli.js chapters <name>`) |
| `dur` | force the duration in seconds (only for silent beats with no `vo`) |
| `pad` | extra tail after the narration ends (default 0.25s) |

## Timing: word anchors

Any time field (`at`, `until`, `moves[].at`, `actions[].at`, `punch`, highlight/pin/route `at`, camera `at`…) takes:

- a number: seconds from scene start, e.g. `1.2`
- a word from the scene's `vo`: `"trillion"`. Matching ignores case and punctuation; a prefix also works (`"chip"` matches `"chips"`)
- a phrase: `"seven companies"`
- the Nth occurrence: `"the#2"`
- an offset: `"crashed+0.2"`, `"Monday-0.3"`
- the end of a word: `"after:trillion"`
- `"start"`, `"end"`, `"end-0.5"`, `"50%"`, or `"#5"` (the 5th word)

**Sync rule:** every new visual lands on the word that names it. If the VO says "six hundred thousand chips", the counter starts at `"six"`. Anchors that don't match are reported by `check`.

## Common element fields

`x, y, scale, rotate, opacity, flip` · `at` (appears at, default 0) · `until` (disappears at) · `in`: `pop` (default) | `fade` | `grow` | `drop` | `slam` | `spin` | `slideLeft` | `slideRight` | `slideUp` | `slideDown` | `none` · `inDur` · `out`: `fade` | `pop` | `slideLeft` | `slideRight` | `slideDown` | `none` · `layer`: `bg` | `base` | `main` (default, gets the line boil) | `top` | `hud` (ignores the camera)

Motion:
- `moves`: `[ {"at":"word","dur":0.6,"x":1200,"y":880,"scale":1.2,"rotate":0,"opacity":1,"ease":"inOut|out|in|back|elastic|bounce|linear","arc":120,"walk":true} ]`. Moves run in order. `walk` swings the legs; `arc` makes it a jump.
- `punch`: `["word","word2"]` gives a quick scale bump on each word. Use it for emphasis.
- `float: 8` (bob up and down) · `pulse: 0.04` · `wiggle: 4` · `spin: 90` (degrees per second) · `shake: {"at":"x","until":"y","amp":6}`
- `sfx`: `"pop"` or `{"name":"cash","at":"word","vol":0.6}`

## Element types

### character: chibi person
```json
{ "type": "character", "who": "gary", "x": 700, "y": 880, "scale": 1.4,
  "expr": "neutral", "pose": "idle",
  "actions": [ {"at":"crashed","expr":"shocked","pose":"panic"}, {"at":"end-1","expr":"sad","pose":"idle"} ],
  "talk": [["start","end"]], "holding": {"prop":"moneyStack","scale":0.4},
  "look": { "skin":"light", "hair":"side", "hairColor":"brown", "top":"suit", "shirt":"#2c3440", "tie":"#c9343a", "glasses":"round", "hat":"none", "beard":"none", "pants":"#3a3f4a" } }
```
- Origin is the **feet**. Default scale is 1.4 (about 450px tall). Use 1.2–1.7 for a hero, 0.6–0.9 for background people.
- `expr`: `neutral` `happy` `smile` `grin` `laugh` `sad` `cry` `worried` `nervous` `shocked` `scream` `angry` `smug` `confused` `tired` `dead` `money`
- `pose`: `idle` `point` `pointL` `wave` `cheer` `hold` `holdUp` `shrug` `think` `facepalm` `hips` `panic` `present` `typing` `salute` `cross`. Poses blend over 0.2s.
- `skin`: `light` `fair` `tan` `olive` `brown` `dark` `deep`, or any hex colour
- `hair`: `short` `side` `spiky` `long` `bob` `bun` `ponytail` `curly` `afro` `balding` `bowl` `mohawk` `none`. `hairColor`: `black` `brown` `blonde` `red` `gray` `white` `ginger`, or hex.
- `top`: `shirt` `polo` `suit` `blazer` `hoodie` `dress` `labcoat` `vest` (hi-vis) `turtleneck` `jersey`, with `shirt` as the colour, `inner` for the shirt under a suit, and `tie` as a colour or `false`
- `glasses`: `round` `square` `sunglasses` · `hat`: `hardhat` `tophat` `cap` `beanie` `crown` `hairnet` `headphones` `cowboy` `party` (`hatColor`) · `beard`: `stubble` `full` `mustache`
- `talk`: the mouth moves only while words are being spoken inside these ranges. Use it when a character is "the one saying it".
- Characters blink, breathe and cast a shadow on their own.

### blob: mascot for companies and concepts (instead of real logos)
```json
{ "type": "blob", "shape": "square", "color": "#76b900", "label": "NVIDIA", "expr": "grin", "x": 1500, "y": 860, "scale": 0.9, "actions": [{"at":"fell","expr":"shocked","pose":"panic"}] }
```
`shape`: `circle` `pill` `square` `cloud` `drop`. `legs:false` and `arms:false` hide limbs. `pose`: `cheer` or `panic` moves the arms.

### prop: library object (centred at x,y)
`{ "type":"prop", "prop":"chip", "x":960, "y":420, "scale":2, "glow":true, "face":{"expr":"smug","y":0,"size":70} }`

Props: `bill` `moneyStack` (n) `moneyPile` `coin` (text) `coinStack` (n) `goldBar` `chip` (text) `bank` (text) `capitol` `factory` `house` `tower` (text) `datacenter` `briefcase` `laptop` (trend) `phone` (trend, text) `monitor` (trend: `up`|`down`|array) `barrel` (text) `crate` (text) `truck` (text) `ship` `document` (text, lines) `megaphone` `podium` (text) `desk` `piggy` `moneyBag` (text) `rocket` `arrowBig` (dir: up|down) `gavel` `trophy` `ballot` (text) `lightbulb` `clipboard` (text) `stopwatch` `fire` `cloud` `tweet` (name, handle, text, a made-up account)

Every prop takes `color`, and many take `color2`. Add `face` to any prop to make it a character.

### text
`{ "type":"text", "text":"WEDNESDAY'S RALLY", "style":"tag", "x":600, "y":300, "rotate":-4, "size":44, "at":"rally", "in":"pop" }`
- `style`: `plain` (`outline` colour optional) · `tag` (paper label) · `sticky` (yellow note) · `sign` (board on a frame) · `banner` (red ribbon, `bg`) · `title` (big outlined marker) · `price` (outlined numbers) · `neon` (glowing) · `chalk`
- `font`: `hand` (Gochi Hand, default) · `marker` (Permanent Marker) · `print` (Patrick Hand)
- `in`: `type` types it out letter by letter, and `write` wipes it on. `typeDur` sets the speed. `maxWidth` wraps lines, `align: "left"` left-aligns.

### counter: ticking number
`{ "type":"counter", "from":0, "to":600000, "prefix":"", "suffix":" CHIPS", "decimals":0, "sign":false, "style":"price", "size":90, "x":960, "y":300, "at":"six", "dur":1.4 }`
Use `style:"neon"` with `color` for a stock board look.

### stamp
`{ "type":"stamp", "text":"DENIED", "color":"#d6403a", "x":1400, "y":500, "at":"rejected", "rotate":-12 }` slams in and shakes the camera.

### bars: bar chart
`{ "type":"bars", "title":"MICROSOFT'S SPENDING PLAN", "bars":[{"label":"BEFORE","value":175,"color":"#3a7bd5"},{"label":"NOW","value":170,"at":"now","face":"worried"}], "prefix":"$", "suffix":"B", "panel":true, "x":960, "y":560, "w":900, "h":480 }`
If every value is negative, the bars hang down from the top line (the "one-day falls" look). `panel:false` drops the chart straight onto a `board` or `paper` background.

### line: line chart (draws on)
`{ "type":"line", "values":[10,14,13,22,30,18], "xLabels":["JAN","FEB","MAR","APR","MAY","JUN"], "title":"NVIDIA SHARE PRICE", "drawAt":"climbed", "dur":2.5, "color":"#3fbf4a", "area":true, "endLabel":"-$5T", "markers":[{"i":3,"label":"WEDNESDAY"}], "rider":{"look":{},"pose":"cheer","expr":"grin","scale":0.35}, "panel":false, "axis":false, "w":1400, "h":520 }`
`rider` puts a character on the moving tip of the line, like the reference's "riding the stock" shots.

### map
```json
{ "type":"map", "region":"east-asia",
  "highlight":[ {"name":"China","color":"#d6403a","at":"China"}, {"name":"Taiwan","color":"#e8833a","at":"Taiwan"} ],
  "pins":[ {"ll":[121.5,25.0],"label":"600,000 H200 CHIPS","at":"six"} ],
  "routes":[ {"from":[-122,37],"to":"China","at":"shipped","dashed":true,"color":"#d6403a"} ],
  "labels":[ {"place":"Iran","text":"IRAN","style":"plain","size":44,"at":"Iran"} ],
  "land":"#ece0c3", "water":"#9cc6cf" }
```
- `region`: `world` `usa` (states) `north-america` `south-america` `latin-america` `caribbean` `europe` `africa` `middle-east` `asia` `east-asia` `south-asia` `southeast-asia` `china` `russia` `oceania` `arctic`, or `bounds: [W,S,E,N]`, or `focus: ["Iran"]` with `zoomOut: 1.8`
- Names use Natural Earth spelling (`United States of America`, `Dem. Rep. Congo`). Aliases work: USA, UK, UAE, Korea. For US states, use `region:"usa"` and state names.
- `ll` is `[lon, lat]`. `place` is a country or state name (its centroid). Routes are cartoon arcs; `greatCircle:true` makes them real great circles.
- Maps sit under everything else, so add characters, stamps and text on top. Combine them with `camera` zooms for the "move across the map" feel.

### clock / calendar
`{ "type":"clock", "time":"9:30", "to":"16:00", "toAt":"close", "toDur":2, "label":"4:00 PM ET", "x":200, "y":200, "scale":0.8 }`
`{ "type":"calendar", "month":"NOV", "day":3, "flips":[{"at":"Thursday","day":5}], "x":1700, "y":220 }`
Put a clock or calendar in the corner whenever the story moves through time. The reference does this constantly.

### arrow
`{ "type":"arrow", "from":[400,300], "to":[900,600], "bend":0.25, "color":"#d6403a", "width":12, "at":"here", "dur":0.5 }` draws itself on.

### crowd
`{ "type":"crowd", "n":14, "rows":2, "spacing":200, "x":960, "y":1000, "scale":0.85, "top":"suit", "expr":"neutral", "react":"idle", "actions":[{"at":"rally","react":"jump","expr":"grin"},{"at":"crash","react":"panic","expr":"shocked"}] }`
`react`: `idle` `cheer` `jump` `panic` `wave` `point`. Each person gets a different look, seeded so it stays the same between renders.

### doc: paper, letter, report or agreement close-up
`{ "type":"doc", "header":"VANDA RESEARCH", "title":"AGREEMENT", "lines":["We'll buy what you can't sell","up to"], "big":"$6.3B", "signature":"Jensen H.", "w":560, "h":660, "x":700, "y":520 }`

### lowerThird
`{ "type":"lowerThird", "name":"LISA SU", "title":"AMD CEO", "at":"Lisa" }` is the news-style name strip. Use it the first time a real person appears.

### ticker
`{ "type":"ticker", "y":1050, "items":[{"sym":"NVDA","price":"182.10","chg":-4.2}], "speed":140 }`

### particles
`{ "type":"particles", "kind":"paper|money|confetti|snow|rain|coins", "n":40, "at":"panic", "until":"end" }`

### glow
`{ "type":"glow", "color":"#62e04b", "r":320, "x":960, "y":420, "strength":0.35 }` is a soft light pool behind a hero object.

### svg: anything custom
`{ "type":"svg", "markup":"<path d='M-60,0 L60,0' stroke='#2b2522' stroke-width='5'/>", "x":960, "y":540, "face":{"expr":"happy","size":50} }`
Draw around (0,0). Follow the house style: `#2b2522` outlines 4–5px wide, flat fills, round joins. Use this for one-off objects (a bridge, a slot machine, a train) instead of forcing a prop that doesn't fit.

### image
`{ "type":"image", "src":"assets/oil-rig.png", "w":500, "h":400, "x":1300, "y":600 }` for transparent PNGs. These can be generated (see `art`) or supplied by the user. **Never use photos of real people.**
