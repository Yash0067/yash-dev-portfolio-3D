# TESTING.md — the checklist

Work top to bottom. Anything that fails is a bug; the rule for this project is
**simplify until it works**, never ship a "sometimes".

Run the server first (CORS matters, see README):

```bash
python3 serve.py          # http://localhost:8123
```

Debug tools used below:

| URL | What it adds |
|---|---|
| `?debug=1` | FPS / frame time / triangles, quality override, chapter jump, model status, slow-motion |
| `?quality=low` | pins the cheapest quality level (useful for slow laptops and CI) |
| `?quality=high` | pins full quality (shadows + bloom + DPR 2) |

---

## 1 · The full journey — no dead ends

- [ ] Opening `/` lands on **story.html — CHAPTER ZERO · THE GATES** (not the island).
- [ ] `story.html` → four beats → **STEP INSIDE →** → `index.html?story=1` → loading bar fills → title card with **PRESS START**, **SIMPLE VERSION**, **CHAPTER ZERO**.
- [ ] From a chapter, **BACK TO WORLD** → `index.html?resume=1…` → **straight into play**, no title card, same position and same open doors.
- [ ] `index.html` opened by hand → redirects to Chapter Zero. `index.html?story=1` does not.
- [ ] **PRESS START** → letterbox bars slide in → camera flies an eased rail → bars slide out → Claude speaks and offers **PROJECTS / SKILLS**.
- [ ] Press `Esc` (or `Space`, or click the bars) during the cutscene → it ends immediately and you get the same choice. No stuck state.
- [ ] Pick a door → Claude walks ahead, stops, turns, points. The dialogue closes on its own.
- [ ] Walk into a ring → prompt appears → `E` opens the chapter. **New tab** in a normal browser tab; **same tab** inside the preview iframe.
- [ ] In the chapter: **BACK TO WORLD** returns to the island; the jump bar (bottom) reaches all five chapters; **← →** not required, links only.
- [ ] Chapter → island → chapter again, three times: the island still runs, no console errors.
- [ ] **MENU → Chapters** opens every chapter, including **00 · The Gates**.
- [ ] `story.html` → four beats → **STEP INSIDE →** lands on the island.
- [ ] `index-2d.html` → the whole portfolio as text, every link works.
- [ ] Title card → **SIMPLE VERSION** → the 2D page → **BACK TO THE 3D ISLAND** returns.

## 2 · Every control, desktop and touch

Desktop:

- [ ] `W A S D` and arrow keys move; `Shift` runs (FOV widens smoothly); `Space` jumps; `E` interacts.
- [ ] Drag the mouse to orbit; the camera never snaps and has no jitter.
- [ ] `M` toggles the map; `Esc` closes the map, then panels.
- [ ] Click a portal ring in the world → opens the chapter. Click a marker on the map → same.
- [ ] Konami code (↑↑↓↓←→←→ B A) → coin + confetti.
- [ ] Every dialogue choice is clickable and keyboard-focusable.

Touch (Chrome device toolbar, or a real phone):

- [ ] The joystick appears bottom-left; dragging moves you; it springs back to centre.
- [ ] **JUMP** works; the prompt **GO** button opens the chapter.
- [ ] The map is reachable with the **MAP** button and its markers respond to a tap.
- [ ] Rotate the phone: layout reflows, the map shrinks, nothing overlaps the joystick.

## 3 · Audio

- [ ] No sound before the first click/keypress (browser policy respected).
- [ ] After the first gesture, music and SFX play.
- [ ] **SOUND ON/OFF** mutes everything on every screen (island, all five chapters, story).
- [ ] The volume slider changes level and persists while you move between chapters.
- [ ] **READ: OFF** toggles speech; unsupported browsers show **READ: N/A** instead of failing.

## 4 · Failure paths — friendly, never blank

- [ ] Rename `models/player.glb` → reload: the console warns and a procedural player appears. Debug panel shows `○ player` (fallback).
- [ ] Throttle the network to **Slow 3G**: the loading bar crawls but the page never goes blank; after 9 s with no boot the 2D version appears with a note.
- [ ] DevTools → **Disable WebGL** → reload: the 2D page appears with "2D MODE" and a **retry 3D** link. No spinner forever.
- [ ] Offline (DevTools → Offline) → reload: the same friendly fallback, no white screen.
- [ ] WebGL context loss: DevTools → Rendering → *Simulate context loss* → "GRAPHICS PAUSED" note appears; when it restores, the note disappears and the scene continues.

## 5 · Resilience

- [ ] Resize the window from 320 px to 2560 px: no stretching, no scrollbars, the canvas follows.
- [ ] Switch tabs for 30 s and come back: the timer does not jump, nothing teleports (`dt` is clamped to 0.05 s).
- [ ] Switch tabs while a chapter is open and return: the animation resumes, no crash.
- [ ] Reload mid-chapter: the page still boots.
- [ ] Leave a chapter open for 5 minutes: memory in the DevTools performance monitor stays flat (dispose on `pagehide`).

## 6 · Console hygiene

- [ ] `index.html?debug=1` — console shows **no errors**.
- [ ] Each of `story.html`, `projects.html`, `skills.html`, `about.html`, `quests.html`, `contact.html` — no errors.
- [ ] Expected and acceptable: `404` lines for `models/*.glb` (optional files, procedural fallbacks used).
- [ ] No `THREE.WebGLRenderer: Context Lost` loops, no unhandled promise rejections.

## 7 · Performance

- [ ] `?debug=1` → frame time at or under **16.7 ms** on the island while walking.
- [ ] Force the slow path: `?quality=low` → still smooth, shadows off, bloom reduced.
- [ ] Open the island, leave it idle 60 s: quality stays at **high** on a normal desktop and **never** oscillates between levels.
- [ ] On a throttled CPU (DevTools 4× slowdown): the quality level drops by itself (watch the `quality` row) and the map/dialogue stay usable.
- [ ] `prefers-reduced-motion: reduce` (DevTools → Rendering): the cutscene still plays but UI transitions are instant; dust/confetti are reduced; no motion sickness loops.

## 8 · Cleanliness

- [ ] No shadow acne on the plaza (no striped self-shadowing).
- [ ] No z-fighting between the plaza disc and the island top.
- [ ] Text on the podiums and plaques is not blurry (canvas text is drawn at 2× and shrunk).
- [ ] Claude never walks through the player and never stands inside the camera.

---

### Quick regression script

```bash
# start the server
python3 serve.py &

# every page answers
for f in index.html index-2d.html story.html projects.html skills.html \
         about.html quests.html contact.html; do
  printf "%-16s %s\n" "$f" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8123/$f)"
done
```

All eight must print `200`.

## The guide dock + facing

- [ ] Every chapter shows the **WHAT IS HERE** card bottom-right on first load;
      the island shows a folded **? GUIDE** tab bottom-left once play starts.
- [ ] `G` toggles the card, `ESC` closes it, the `×` closes it, the tab reopens it.
- [ ] The card never covers the jump bar, the dialogue box, or the chapter footer.
- [ ] At ≤820 px the card moves under the page bar and still scrolls.
- [ ] Claude's eyes face the camera on `about`, `skills`, `quests`, `contact`,
      `projects` and `story` — orbit the room and he keeps facing you.
- [ ] On `projects` he faces you again once his arrival spin has finished.
- [ ] His nameplate reads **CLAUDE** above him in every room, and is readable at
      desktop and phone widths.

## Résumé sync, sound and sitting

- [ ] Mute on any chapter, then follow a door / BACK TO WORLD / jump-bar link:
      the next page opens with **SOUND OFF** and `?mute=1` in the URL.
- [ ] Muting on the island and pressing a portal keeps sound off in the new tab.
- [ ] `contact.html` lists three résumé versions; each download returns a PDF.
- [ ] Every claim on the site matches `assets/resumes/*.pdf` (dates, employer
      names, skills, interests) — no "student", no "present" year.
- [ ] Walk to any bench: prompt says **SIT ON THE BENCH**; `E` sits with the knees
      up, `E` again stands; a direction key also stands.
- [ ] No tree stands behind a portal arch — orbit every zone and check the ring
      reads clean against the sky.
- [ ] Claude has no light on top of his cap: the blue is flat, not a bright blob.
