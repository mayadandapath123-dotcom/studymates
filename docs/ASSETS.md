# StudyMates — Asset Attribution & License Record

Rule: **no copyrighted characters, no scraped artwork, no redistributed music.**
Everything in the MVP is either hand-authored for this project or generated
live in the browser. This file records every asset's origin.

## 1. Character & room artwork (original, hand-authored)

| Asset | File(s) | Creator | Source | License |
|---|---|---|---|---|
| Milo design + rig (SVG) | `index.html` (`#char`), `css/character.css`, `css/tokens.css` | StudyMates project | Original, authored for this project | Project license (MIT for code; character design © StudyMates, free to use within the project) |
| Momo design (palette + hair + outfit variants on same rig) | same as above | StudyMates project | Original | Same as above |
| Study room scene (window, furniture, props — HTML/CSS/SVG) | `index.html`, `css/room.css` | StudyMates project | Original | Same as above |
| UI icons (play, pause, reset, streak flame, sound, settings, stats) | inline SVG in `index.html` | StudyMates project | Original, hand-drawn | Same as above |
| Favicon | inline SVG data-URI in `index.html` | StudyMates project | Original | Same as above |

Deliberately **not** referencing or imitating any existing cartoon/anime/game
character (no Doraemon, Shin-chan, Pokémon, Disney, Sanrio, etc.).

## 2. Concept art (AI-generated, original)

| Asset | File | Creator | Source | License / notes |
|---|---|---|---|---|
| Milo concept sheet | `assets/concept-milo.png` | AI image model, prompted by StudyMates | Generated Sep 2026. Prompt described an original chibi boy: fluffy chestnut cloud-hair, tan skin, freckles, oversized teal hoodie, cream pants, orange slippers; 4 study poses | Original output; no copyrighted character named or referenced in the prompt. Used as gallery/reference art only — the animated character is the hand-authored SVG rig |
| Momo concept sheet | `assets/concept-momo.png` | AI image model, prompted by StudyMates | Generated Sep 2026. Prompt described an original chibi girl: black puffball hair with star clip, deep-brown skin, coral overalls, striped tee, teal sneakers, headphones; 4 poses | Same as above |

Modifications: none (used as generated). If these are ever replaced by
commissioned art, update this record.

## 3. Audio (100% procedural, no files)

| Asset | File | Creator | License |
|---|---|---|---|
| Rain ambience (filtered noise) | `js/audio.js` | StudyMates project, synthesized at runtime | Original |
| Bird chirps (oscillator envelopes) | `js/audio.js` | StudyMates project, synthesized at runtime | Original |
| Focus tones (generative Cmaj7–Am7–Fmaj7–G6 pad) | `js/audio.js` | StudyMates project, original progression | Original |
| SFX: chime, tick, page, sip, pop | `js/audio.js` | StudyMates project, synthesized at runtime | Original |

No external music, samples, or sound files are shipped or streamed.

## 4. Fonts & libraries

| Asset | Source | License |
|---|---|---|
| Font stack (`Nunito → Quicksand → system rounded → system-ui`) | System fonts only; **nothing is downloaded** (works fully offline) | N/A |
| JavaScript | Zero dependencies, no frameworks, no CDN | N/A |

## 5. Third-party code

| Asset | File | Creator | Source | License |
|---|---|---|---|---|
| Three.js r160 (`three.module.min.js`, vendored) | `js/vendor/three.module.min.js` | Three.js authors | https://threejs.org / https://github.com/mrdoob/three.js (pinned `three@0.160.0`, downloaded from jsDelivr) | MIT — see license header in file. Unmodified. Used for all real-time 3D rendering; no other libraries. |

No OpenGameArt/Kenney/itch.io/OpenMoji/Lucide/media assets are used. Any
future third-party asset must be recorded here with creator, source URL,
license, and modifications before merging.
