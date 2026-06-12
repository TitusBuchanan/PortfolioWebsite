# THE ONE-WINGED ANGEL — open-world 3D action demo

A browser-playable, God of War–style action game starring Sephiroth, built from
scratch with **Three.js + WebGL** and embedded in the portfolio at `/game/`.
Everything is procedural — no external 3D models, textures, or audio files.

## Play

Open `/game/` on the deployed site, or locally:

```bash
npm run build
node server.js          # then visit http://localhost:5000/game/
```

Desktop Chrome/Edge with a dedicated GPU is strongly recommended.

### Controls

| Input | Action |
|-------|--------|
| `WASD` | Move (camera-relative) |
| Mouse | Camera (click canvas to capture pointer) |
| `LMB` | Light slash — chains a 3-hit combo |
| `RMB` | Heavy cleave |
| `Shift` | Sprint |
| `Space` | Dodge roll (i-frames) |
| `Q` | Lock-on toggle |
| `1` | Octaslash (35 SP) |
| `2` | Supernova (100 SP) |
| `Esc` | Pause (releases pointer) |

## What's in it

- **Open world** — ~750 m of procedural terrain (simplex fBm), a mountain ring,
  a Mako lake, worn paths, a ruined sanctum and a monolith arena. Instanced
  trees, rocks, wind-swept grass and glowing Mako crystals.
- **PS5-leaning rendering** — HDR pipeline with ACES filmic tone mapping,
  `UnrealBloomPass`, soft shadow maps, a custom atmospheric sky shader, animated
  Fresnel water, a full ~7-minute day/night cycle with moving sun/moon, and
  exponential fog.
- **God of War–style combat** — weighted combo strings with queued inputs,
  hitstop, screen shake, dodge i-frames, lock-on, a sword-trail ribbon, floating
  damage numbers, crits, an SP meter feeding two cinematic specials
  (Octaslash teleport-flurry and the slow-mo Supernova meteor storm).
- **Enemies & bosses** — shadow creepers, ranged Mako hunters, a Behemoth and a
  final Guardian of the Calamity with telegraphed windups, AoE slams and a rage
  phase.
- **Puzzles** — a Simon-style resonance-crystal sequence that opens the sanctum
  gate, a timed three-bell ritual, and a four-brazier ignition rite.
- **Progression** — XP, leveling (raises HP and damage), an objective beacon and
  a win/lose loop.
- **Procedural audio** — every sound (sword swings, impacts, bells, the ambient
  drone and wind bed) is synthesized live in WebAudio.

## Code layout (`js/`)

| File | Responsibility |
|------|----------------|
| `game.js` | Orchestrator: render pipeline, state, combat, objectives, main loop |
| `world.js` | Terrain, sky/water shaders, vegetation, ruins, puzzle props, lighting, day/night |
| `characters.js` | Procedural rigs (Sephiroth + enemies) and keyframe animation drivers |
| `fx.js` | Pooled GPU particles, sword-trail ribbon, floating damage numbers |
| `audio.js` | WebAudio synthesis for all SFX and the ambient bed |
| `util.js` | Seeded simplex noise, fBm, math helpers |

Three.js 0.160.0 is vendored under `vendor/` so the game runs with no external
network dependencies.

Append `?debug=1` to the URL to expose a `window.__SEPH_DEBUG` handle (teleport,
enemy counts) used by the automated smoke tests.

## Credits

Non-commercial fan tribute. FINAL FANTASY and Sephiroth are property of
Square Enix Co., Ltd. This demo is unaffiliated with and unendorsed by Square Enix.
