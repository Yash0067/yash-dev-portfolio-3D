# yash.dev — a portfolio you can walk around

A small 3D island that *is* the portfolio. Load screen → title screen → welcome
cutscene → five zones you can walk to, each one opening a full page: **projects,
skills, about, quest log, contact**. Built with plain ES modules and Three.js
`0.160.0` from jsDelivr — no build step, no bundler, no framework.

```
index.html            the island (loading, title, cutscene, world, HUD, 2D version)
story.html            CHAPTER ZERO · the gates — castle courtyard + Claude narrating
index-2d.html         the paper edition — whole portfolio, no JS, no network
projects.html         podium room — top 3 projects on stone podiums + Claude
skills.html           skill matrix — 20 plaques + an open-door card, colour-coded
about.html            the room — desk, CRT, drawing board, bookshelf, window
quests.html           the road — three checkpoint flags for experience
contact.html          mission control — a rocket, and every real contact route
css/style.css         one UI kit: buttons, panels, HUD, dialogue, 2D page
js/world.js           shared 3D kit: renderer, toon ramp, outlines, water, sky,
                      day/night, clouds, birds, grass, trees, camera rig, composer
js/models.js          the only place that loads models: manifest, LoadingManager,
                      normalising, toon pass, outlines, mixers, cloning, dispose
js/story.js           the castle courtyard scene and its narration beats
js/claude.js          CLAUDE — the voxel guide (boxes only), dialogue portrait, confetti
js/page.js            shared sub-page skeleton: orbit camera, picking, post FX
js/main.js            the island: world build, player, coins, pads, portals, HUD
js/anim.js            damp, springs, easing, the tween manager, state blending
js/quality.js         adaptive quality (shadows / bloom / DPR) + FPS sampler
js/debug.js           the ?debug=1 panel
js/guide.js           the WHAT IS HERE dock — one legend per room, folded to a ? tab
js/map.js             the island map
js/audio.js           Web Audio chiptune + every SFX (original, generated live)
js/ui.js              panels, toasts, dialogue, achievements, simple-view toggle
js/content.js         ALL the text and data (edit here first)
assets/               avatar.png, logo.png, favicon.png, résumé PDF
models/               optional .glb drop-ins — see models/README.md
```

---

## Run it

Any static server works; ES modules need `http://`, not `file://`.

```bash
python3 -m http.server 8123      # then open http://localhost:8123
```

## The island map

`js/map.js` draws a live 2D plan of the island on a canvas — no library, no
textures, one `clearRect` and a dozen shapes per frame.

- **MAP** button in the HUD, or the **M** key. `Esc` closes it.
- Portals show as markers: filled red once visited, blue dot when not.
- The black arrow is you, pointing where the camera looks; **N** is north.
- **Click or tap a marker** to open that chapter straight away.
- Redraws at 12 fps while open, and stops drawing entirely when closed.

## Motion and quality

Everything that moves goes through `js/anim.js`:

| Need | Use |
|---|---|
| smooth follow, camera, lights | `damp(value, target, k, dt)` — frame-rate independent |
| rotation | `dampAngle` — always the short way round, never a spin |
| Claude's trail | `springStep` — critically damped, with a 1.15 m personal space |
| timed animation | `tweens.add({ key, from, to, dur, ease })` — one manager, replace-by-key |
| character states | `StateBlend` — named states, 0.2 s cross-fade, weights sum to 1 |
| chapter change | `transitionTo(url)` — eased fade, never a hard cut |

The loop clamps `dt` to 0.05 s and runs player physics on a fixed 60 Hz
accumulator, so 60 Hz and 144 Hz feel the same and a tab switch never teleports
anyone. `js/quality.js` watches the frame time and steps shadows, bloom and
device-pixel-ratio down (and back up) on its own.

Test it all with `TESTING.md`, or open `index.html?debug=1` for the live panel.

## The order of things

```
/                     → story.html       Chapter Zero: the gates
story.html            → index.html?story=1   the island (title card → PRESS START)
chapter pages         → index.html?resume=1  back into the island, where you left off
```

`index.html` redirects to `story.html` on a cold visit, so nobody lands in the
middle of the story. Two flags opt out:

| flag | meaning |
|---|---|
| `?story=1` | you have already seen Chapter Zero — show the island |
| `?resume=1` | you were playing — skip the title card **and** the intro cutscene |
| `?debug=1`, `?quality=low` | developer overrides, also skip the redirect |

Leaving the island for a chapter appends your state to the URL
(`#x=3.0&z=9.0&v=projects,skills`), so **BACK TO WORLD** drops you back on the
island at the same spot with the same doors already open — not on the landing
screen. No storage involved, so it works in private windows and preview frames.

## Thirteen builds

`js/content.js` holds all thirteen projects — the five that were already here
plus the eight from the older portfolio (IFA Hiring, CopaScore, CopaScore AI,
Sports Prediction, Smart Algo Trading, Godrej Properties, Employee Management,
SkillQuest), all dated 2025. The 3D hall puts the top three on podiums and the
other ten on the lit wall behind them — every card is clickable — and the
reading pages list all thirteen.

## The arcade cabinet

The Skill Arcade building is playable. Stand in front of it (the prompt reads
**PLAY COIN RUSH**) and press **E**, or click the building itself. Twenty
seconds, coins are +1, gems +5, bombs −3; mouse, finger or ← → move the basket.
It is `js/minigame.js`: one canvas, no assets, pauses itself when the tab hides.

## One address for the 3D side

Every reading page — the five chapters and the 2D copy — carries a floating
**PLAY THE ISLAND** pill (bottom-left, all screen sizes) that goes to
`index.html?resume=1`. The island is always one click away.

## CHAPTER ZERO · the story entry

`story.html` is the way in. A night courtyard: stone curtain wall, two towers,
an open gate, torchlight, floating candles, stars, and Claude waiting on the top
step with the narration.

- Four short beats, typed with 8-bit blips — arrival, the five chapters, the
  honest rule, your move. `ENTER` / `SPACE` / click advances.
- Each beat makes him react (tilt, shake, hop + cap flash).
- Ends in **STEP INSIDE →** which opens the island, or **PLAIN PAGE** for the 2D
  version.
- If WebGL is missing, the courtyard is skipped and the narration still reads.

The five doors, as named in the story:

| Chapter | Page | Room |
|---|---|---|
| 00 | `story.html` | The Gates |
| 01 | `projects.html` | Hall of Creations |
| 02 | `skills.html` | The Trials |
| 03 | `about.html` | The Room |
| 04 | `quests.html` | The Quest Log |
| 05 | `contact.html` | The Epilogue |

The art direction is an original wizarding-castle mood — stone, candlelight,
ink outlines, a night sky. No assets, names or logos are borrowed from any
existing film or game.

## The guide on the 2D page

`index-2d.html` is the reading copy of the portfolio, and Claude runs through it
there too: a small portrait and a plain-English note at the top of every
section — what the projects actually are, why the skills are rated honestly,
where the education sits, which contact route is fastest. It is static HTML, so
it survives with JavaScript off.

## The guide dock — "what is here"

Every room carries a small legend in a corner: what the room is, what each object
does, and what you are meant to click. It is in `js/guide.js` — one `mountGuide`
component, driven by a `GUIDES` table so the wording lives next to the mount and
the pages stay short:

```js
const page = bootPage({ canvas: $('#gl'), guide: GUIDES.about, /* … */ });
```

* opens by default on the five chapter pages, folded to a `? GUIDE` tab on the island;
* toggles with the tab, the **G** key, and closes with **ESC**;
* on the island it sits bottom-left, on the chapters bottom-right (top-right on the
  gates, where the dialogue box owns the bottom of the screen);
* on narrow screens it moves under the page bar so it never covers the 3D.

## Claude faces you

`Claude.faceVisitor(camera)` plants him and turns him square on to the visitor.
In `'stage'` mode (every chapter page) he remembers that camera and keeps facing
it as you orbit the room, so his eyes are never hidden. In `'follow'` / `'guide'`
mode (the island, the gates) he turns to the direction he is walking, then back to
you when he stops.

## Deploying it

The site is pure static files — **no build step, no bundler, no framework**, so
every host below just serves the folder as-is.

| Host | What to do |
|---|---|
| **Vercel** | drag the unzipped folder onto vercel.com/new (framework preset: *Other*, build command empty, output dir `.`). `vercel.json` is included. |
| **Netlify** | drag the folder onto app.netlify.com/drop, or connect the repo. `netlify.toml` is included. |
| **GitHub Pages** | push the folder, Settings → Pages → deploy from `main` / root. `.nojekyll` is included so the folders are served untouched. |
| **Any web server** | upload and point the document root at the folder. `serve.py` is only for local testing. |

There is no server code, no database and no API keys. Three.js is loaded from
jsDelivr (pinned to 0.160.0) and the two fonts from Google Fonts, so the pages
need an internet connection; everything else is inside the folder.

## Sound is per page — and it stays off

Pages are separate documents, so module state dies at every door. The visitor's
mute choice therefore travels in the URL: while sound is off, every same-tab
navigation (`transitionTo`, `goTo`, portals, the back link, chapter links) is
rewritten with `?mute=1` / `&mute=1` before the browser leaves the page, and
`audio.js` starts muted when it sees that flag. No `localStorage`, no
`sessionStorage` — the URL is the carrier.

Helper: `withMute(url)` in `js/audio.js`; `carryMute()` in `js/ui.js` patches
plain `<a href>` links at click time.

## Sitting down

Every bench on the island is a seat. Walk up to one and the prompt reads
**SIT ON THE BENCH**; `E` sits, `E` again (or any direction key) stands you up.
The plaza bench by the spawn pad is the first one you meet. The seated pose is a
procedural one in `animateCharacter()`, so it works with the built-in rig.

## Meet Claude

Claude is the visitor's guide — a coral voxel block with a blue cap, built out of
`BoxGeometry` in `js/claude.js`, so he **can never fail to load**. No model file,
no texture, no network.

What he does:

| | |
|---|---|
| **Walks ahead** | When you pick a door he heads for it, stops ~2.7 m in front of you, turns around and waits. |
| **Points** | At each door his right stub swings up and aims at what comes next. |
| **Idles** | Blinks (eyes squash), breathes, tips his cap, glances at whatever you look at. |
| **Reacts** | Hops when you jump, spins on an achievement or a portal, tilts when curious, shakes at a joke. |
| **Glows** | A small warm point light rides with him so he is findable in the dark rooms. |
| **Hints** | Stand still for 30 s and he walks to the nearest door you have not opened, bounces and calls you over. |
| **Story beats** | Sits on podium 1 in the Hall of Creations, cheers at the Trials, waves goodbye in the Epilogue. |

He talks in the game dialogue box at the bottom: his pixel portrait on the left,
his name in red, typed text with 8-bit blips. Two small choices exist ("Which
door first?") but the story stays linear — every chapter is reachable at any time.

**Rename him** in one line, `js/content.js`:

```js
export const GUIDE_NAME = 'Claude';
```

**Read aloud** (off by default): the `READ: OFF` button in the sound box, or
`setReadAloud(true)` from `js/ui.js`. Uses the Web Speech API; unsupported
browsers disable the button instead of failing.

## Run it

```bash
python3 serve.py            # http://localhost:8123
```

`serve.py` is a 40-line static server that sends **CORS headers** and
**no-cache**. That matters: ES modules are fetched in CORS mode, and inside a
sandboxed preview iframe the page has an opaque origin (`null`) — without
`Access-Control-Allow-Origin` the browser refuses `js/main.js` and the island
never boots. `python3 -m http.server` will not do this.

## Getting into the chapters

There are four independent ways to reach a page, so one blocked path never
strands you:

1. **Click the portal ring** in the world — no walking needed.
2. Walk into a ring and press **E**, or tap **GO** in the prompt.
3. **DOORS** in the top-right HUD — six plain links in a panel.
4. **MENU → Chapters** — the same list inside the pause menu.

Portals still open a **new tab** when the browser allows it. Inside the app
preview (where pop-ups are blocked) they navigate in place instead, and the DOORS
panel is always plain anchors that nothing can block.

## Controls

| Input | Action |
|---|---|
| `W A S D` / arrows | walk |
| `Shift` | run |
| `Space` | jump |
| `E` / `Enter` | enter the portal you are standing in |
| drag / `Q` `E` | orbit the camera |
| mouse wheel | zoom |
| `M` | mute |
| `Esc` | close a panel |
| `↑↑↓↓←→←→ B A` | konami |
| on mobile | joystick + jump button, or tap the ground to walk |

Portals open in a **new tab** (`window.open` called from the real click/key event,
so it is not popup-blocked) and leave the world running behind you.

---

## Rename the guide

One line, `js/content.js`:

```js
export const GUIDE_NAME = 'Claude';
```

That single constant is used by the dialogue box, the portrait label, the walk
ahead logic, the loading/title screens and the 2D page header.

## Add or edit a project

Everything lives in `js/content.js`. Add one object to `PROJECTS`:

```js
{
  id: 'my-project',            // unique, used as an anchor
  title: 'My Project',
  kind: 'WEB APP',             // shows under the title on the podium screen
  year: '2026',
  blurb: 'One line for cards and the simple view.',
  detail: 'Two or three sentences for the panel.',
  tech: ['HTML5', 'CSS3', 'JavaScript'],
  highlights: ['What you actually solved', 'Why it mattered'],
},
```

The first three entries are podium 1/2/3 (podium 1 is the tallest); the rest go to
the back-wall screens. Keep it honest — the site is generated from `content.js`
only, so there is no second place to forget to update.

Same pattern for `SKILLS` (`tier: 'core' | 'work' | 'basic'` sets the colour and
the level bar), `QUESTS`, `EDUCATION`, `INTERESTS`, `COINS` and `PROFILE`.

## Change the colours

One file, top of `css/style.css`:

```css
:root{
  --ink:    #121216;   /* outlines, text, borders            */
  --paper:  #f7f4ec;   /* page + sky base                    */
  --paper-2:#fffdf7;   /* cards, panels                      */
  --red:    #ff2a00;   /* the only interactive accent        */
  --sky:    #2f9bff;   /* support colour                     */
  --sun:    #ffc93c;   /* support colour                     */
}
```

The 3D side reads the same idea from `PALETTE` in `js/world.js`. Change a colour in
both places and the whole site follows — including the toon ramp and the outlines.

## Swap the character or props

See **`models/README.md`**: drop `player.glb`, `house.glb`, … into `/models` with
the exact filenames and they replace the procedural stand-ins on the next load.
Missing files never break the site — that is the fallback contract.

## Deploy

### GitHub Pages

```bash
git init && git add . && git commit -m "portfolio"
git branch -M main
git remote add origin https://github.com/Yash0067/yash.dev.git
git push -u origin main
```

Then **Settings → Pages → Deploy from branch → `main` / root**. Live at
`https://Yash0067.github.io/yash.dev/`. All paths are relative, so it works from a
sub-path without changes.

### Netlify

- Drag the folder onto <https://app.netlify.com/drop>, or
- `netlify deploy --prod --dir .`

No build command, no publish directory tricks — it is static files.

### Before you ship

1. Replace `assets/` with your real files if they changed (same filenames).
2. Check `content.js` — it is the only source of truth for text.
3. Add an `og:image` (1200×630) and point `og:url` at the live domain in
   `index.html`.
4. Run Lighthouse. The 3D page scores lower than the 2D one on purpose; the
   **Simple version** button is the recruiter-friendly, accessible path.

---

## Accessibility & performance notes

- **Simple version** (`#simpleBtn` on the title, `M` → menu, or `?simple=1`) is a
  complete, semantic, keyboard-only 2D copy of every section.
- `prefers-reduced-motion` disables the camera shake, the cutscene speed and the
  particle count; the day/night cycle slows right down.
- No WebGL → the simple version opens automatically with a short explanation.
- Pixel ratio is capped at 2; grass/coins/confetti are instanced; the renderer
  pauses when the tab is hidden; every sub-page disposes its scene on unload.
- Focus rings are visible on every button, link and control; portals are buttons,
  not divs.
- No `localStorage`/`sessionStorage` anywhere — the state lives in memory only.

## Credits

- Three.js `0.160.0` (MIT) via jsDelivr, `Reflector` / `UnrealBloomPass` from
  `three/addons`.
- Fonts: *Press Start 2P* and *VT323* (SIL Open Font License) via Google Fonts,
  with a monospace fallback so nothing shifts if they fail.
- Model slots are designed for CC0 packs (Kenney, Quaternius, Poly Pizza).
- Music and every sound effect are generated at runtime by `js/audio.js` — no
  samples, no third-party audio.
- All copy, projects, dates and numbers come from Yash Dhiver's own résumé.
