# Agent Notes

## Fast Context

Vanilla JS SPA; `docs/` is deployed as-is. No framework or bundler. TypeScript runs with `checkJs: true`; global JS types live in `private.d.ts`. `docs/lib/` is third-party and excluded from lint/tsc.

Use the closest directory note first:

- `docs/js/game_mode/AGENTS.md` - adding/changing modes, scoring, 2D/3D target conversion
- `docs/js/controller/AGENTS.md` - input, settings, HUD, DOM refs, game-sens UI
- `docs/js/render/AGENTS.md` - camera math, 2D canvas, WebGL draw path
- `docs/js/worker/AGENTS.md` - worker messages and tuple sync
- `docs/js/calc/AGENTS.md` - sensitivity/DPI math and import boundaries

## Conventions

- Reads prefer destructuring: `const { x } = state.foo`
- Writes use full paths: `state.foo.x = value`
- Keep imports, object properties, function definitions, independent branches, independent `const` declarations, and order-insensitive state assignments alphabetized within a local group
- Comments are limited to JSDoc types and narrowly-scoped ESLint directives
- Check file-level `no-restricted-syntax` import rules before adding imports

## Source Of Truth

- Runtime state shape/defaults: `docs/js/state.js`
- Global JS types: `private.d.ts`
- Immutable defaults/tuning: `docs/js/constants.js`
- DOM IDs/refs: `docs/js/document.js`
- App startup wiring: `docs/js/main.js`

Avoid duplicating exact constants or full type/state declarations in notes; stale copies slow agents down.

## Hot Paths

- Start: `controller/menu.js` sets `state.game.mode`, then `logic.start_game()`; pointer lock + fullscreen are requested first — if both fail the game does not start (no error thrown)
- Frame: `logic.on_frame()` updates timer/audio time, runs `mode.on_frame()`, periodically `check_stats()` + `update_hud()`, then `mode.render()`; when `key_space` is held, frames before `next_frame_ms` are skipped (30 fps cap via `CONSTANTS.frame_limit.space_hold_interval_ms`)
- Resize: `controller/index.js:on_resize()` calls `resize_2d()` then `resize_3d()`; it does not call `update_fov()`
- Dimension changes: mode `update_dimension()` implementations call `logic.update_fov()` and convert active targets between 2D/3D
- Input: `controller/screen.js` maps Q/W/E/R/A + mouse buttons into `state.input` and calls `mode.shoot()`/`mode.update_dimension()`
- Worker: main thread uses `post_worker_message({ fn, ...args })`; worker responds with tuple arrays keyed by `fn`

## Change Map

- Add a mode: update `private.d.ts`, `constants.js`, `state.js`, `game_mode/index.js`, a new `game_mode/*.js`, menu/document/controller refs, clear-score handling, and any worker/render helpers it needs
- Add a sensitivity game: update `GameSensName`, `state` defaults, `logic.update_fov()`, `calc/`, `controller/game_sens.js`, `worker.update_game_sens()` tuple if displayed, DOM refs/markup
- Add settings UI: add DOM ref in `document.js`, initialize from `state` in `main.js`, bind behavior in `controller/setting.js` or a focused controller
- Add worker message: update `WorkerFunctionName`, `worker/worker.js`, `worker/index.js` response routing, and caller-side payload/tuple casts
- Change target/camera math: inspect `render/camera.js`, `logic.update_fov()`, and every mode with `update_dimension()`

## State Landmarks

- `state.game` controls active mode, resolution, sensitivity game, RAF id, and screensaver timeout
- `state.camera` stores 2D offsets, 3D yaw/pitch, FOV, canvas size, and WebGL matrices
- `state.stats` is the shared 30s scoring window; mode files decide how to fill and expire it
- `state.mode.*` stores mode-owned runtime state; see `docs/js/game_mode/AGENTS.md`
- `state.timer` tracks `now_ms` (rAF timestamp), `now_s` (AudioContext time — not `performance.now()`), `prev_ms`, `start_ms`, and `fps`
- `create_queue()` keeps a logical head index; use `.at()`, `.drop()`, `.clear()`, `.push()`, `.length`; `.array` exposes the raw backing array (needed when passing to worker)
