# StudyMates 📚🎮

> **Study with a buddy who has a life too.**
> Set your timer. Open your books. Your little 3D companion will study right
> beside you — walking around their room, living their own routine.

A cozy, immersive study-companion web app. A fully rigged 3D buddy shares
your session in a real-time 3D room: writing, reading, typing, sipping tea,
stretching, gazing out the window, vibing to music, taking breaks — and
celebrating when you hit your daily goal.

**One vendored library (Three.js) · fully offline after first load · no login · local-first data.**

---

## Run it

Any static file server works (ES modules require `http(s)`, not `file://`):

```bash
cd studymates
python3 -m http.server 8000
# → http://localhost:8000
```

Or: `npx serve .`, VS Code Live Server, GitHub Pages, Netlify, Cloudflare Pages…

## Feature checklist

- [x] Original 3D characters (Milo & Momo), procedurally modeled + rigged in code
- [x] Full 3D study room: desk, chair, laptop, lamp (real light), window with
      sky/sun/moon/stars/rain, bed, bookcase, shelf, plant, clock (live hands),
      poster, calendar, backpack, door, rug — with soft shadows
- [x] 3D locomotion: buddy walks around the room, turns, sits/stands, fades
      out through the door for washroom breaks
- [x] 16 procedural poses + 6 expressions, damped/blended in real time
- [x] Morning / afternoon / evening / night lighting (auto from real time + manual)
- [x] Flexible timer: 15/25/30/45/50/60 + custom, focus / short / long, Pomodoro flow
- [x] Start / Pause / Resume / Reset / Skip, auto-continue with countdown
- [x] Behavior state machine: study loop, weighted activities, cooldowns, break
      sequences, washroom trips, rest, goal celebration, "boop" reactions
- [x] Local stats: today, week chart, sessions, streaks, average
- [x] Daily goal with progress + buddy celebration
- [x] Procedural audio: rain, birds, generative focus tones, chimes/SFX — all
      synthesized in-browser, no files, no streaming
- [x] Responsive: full room on desktop (camera auto-frames), stacked mobile layout
- [x] Accessibility: keyboard shortcuts (`Space`, `M`), focus styles, ARIA,
      reduced-motion mode (freezes secondary motion, particles, camera sway)
- [x] PWA: manifest + service worker, works offline (3D included)
- [x] Privacy: localStorage only, export/erase buttons, no analytics

## Architecture

```
studymates/
├── index.html            # UI shell + <canvas> stage + overlays + modals
├── manifest.webmanifest  # PWA manifest
├── netlify.toml          # static deploy config (publish ".", SW never cached)
├── sw.js                 # offline-first service worker
├── css/
│   ├── tokens.css        # palette + per-character CSS variables
│   ├── ui.css            # app UI + responsive + reduced-motion
│   └── room.css          # 3D stage frame, HUD sign, bubble/zzz/notes overlays
├── js/
│   ├── app.js            # bootstrap + UI wiring (thin layer)
│   ├── stage3d.js        # ★ 3D room + character rigs + animation + lighting
│   ├── characters.js     # ★ character registry (weights, bubbles, traits)
│   ├── behavior.js       # ★ behavior state machine (drives stage via view API)
│   ├── timer.js          # precise timer engine + pomodoro session manager
│   ├── audio.js          # procedural Web Audio engine
│   ├── store.js          # settings + stats (localStorage)
│   ├── utils.js          # dom / random / time / storage helpers
│   └── vendor/
│       └── three.module.min.js  # Three.js r160, vendored (MIT, unmodified)
├── assets/               # AI-generated ORIGINAL concept sheets (gallery only)
└── docs/ASSETS.md        # attribution & license record
```

The behavior brain (`behavior.js`) only talks to a tiny view interface —
`setPose(pose, expr)` / `setSpot(spot)` / `setCharacter(id)` — so the 3D stage
can evolve (or a new renderer be swapped in) without touching the brain,
timer, stats, or UI.

## 3D approach

- **No model files.** Room, furniture, and both buddies are built in code
  from Three.js primitives with flat cartoon shading + soft shadows.
- **Rigged buddies:** hierarchical joints (neck, shoulders, hips, legs) with
  per-frame damped posing — every transition blends smoothly, no canned clips.
- **Procedural life:** breathing, blinking, write-bob, type-tap, walk cycle,
  dance groove, jumping jacks, jump arcs, steam, rain, dust motes, leaf sway.
- **Real lighting:** sun/moon directional light with shadows, hemisphere fill,
  and a warm lamp point-light that takes over at night. Time-of-day cross-fades.
- **Cheap by design:** ~200 low-poly meshes, one 1024px shadow map, capped
  pixel ratio, transform-only animation, particles as Points/Sprites.

## Adding a character

1. Add palette + weights + bubbles to `characters.js` and `stage3d.js` (`STYLE`).
2. Add hair/outfit/prop variants in `buildCharacter()` (branch on id).
3. Add a concept sheet in `assets/` + a palette block in `css/tokens.css`.

Behavior, timer, stats, and settings pick the new buddy up automatically.

## Data & privacy

- `studymates.settings.v1`, `studymates.stats.v1` in localStorage.
- Nothing leaves the device. Export or erase anytime in Settings.

## Publish (Git + Netlify)

See **"Publish your site"** in the project handoff — short version:

```bash
cd studymates
git init && git add . && git commit -m "StudyMates 3D"
# create an empty repo on GitHub, then:
git remote add origin https://github.com/YOU/studymates.git
git branch -M main && git push -u origin main
```

Then Netlify → **Add new site → Import an existing project** → pick the repo.
`netlify.toml` already sets publish dir `.` with no build — deploy, done.
Every `git push` redeploys automatically.

## Roadmap

More buddies & rooms (library, café…), pets, outfits/unlocks, licensed music
library, optional cloud sync, streak freeze, focus-with-friends.

## License

Code: MIT (Three.js: MIT, © Three.js authors). Characters, art, and audio:
original works © StudyMates project — see `docs/ASSETS.md`.
