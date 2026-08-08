# Agent Notes

Vanilla JS SPA, no bundler; `docs/` deploys as-is. tsc `checkJs:true`, types in `private.d.ts`. `docs/lib/` excluded from lint/tsc. **pnpm only** — `pnpm run <script>` / `pnpm dlx <pkg>`, never npm/npx. Scripts: `dev` (throttled static server), `lint` (`eslint --fix` + `tsc -b`).

## Where to look
`game_mode/` modes, scoring, 2D↔3D · `controller/` input, settings, HUD, DOM · `render/` camera math, 2D canvas, WebGL · `worker/` protocol, tuple sync, BG video · `calc/` sens/DPI numerics, import boundaries

## Source of truth (don't restate in notes)
- `state.js` — persisted + cross-cutting state; `create_queue()`; shared `shoots_pool`/`impacts_pool`/`impacts_3d_pool`
- `pool.js` — `create_pool(make)` free-list: `obtain`/`recycle`/`clear`
- `constants.js` — immutable tuning; imports only `math.js`
- `math.js` — `calc_core_radius`, `clamp`, `convert_deg_across_aspect`, `lerp`, `normalize_rad`, `round_to`, `to_deg`/`to_rad` + re-exported `Math.*`; imports nothing
- `private.d.ts` — global types
- `bg_store.js` — IndexedDB for uploaded BG blobs (split `bg_videos` meta + `bg_blobs` stores; DB version = schema version, NOT app version). `state.bg.video_id` = record id; blobs never touch localStorage
- `sfx.js` — AudioContext; top-level-await sound buffers; `get_audio_time()`, `play_shot/hit/miss()`, `set_audio_visible()`
- `component/select.js` — state-free light-DOM `x-select`: wires direct `button`/`ul`/`li[data-value]` markup, keyboard/focus/ARIA, native-like silent `.value`, user-only `change`, `selectaction`/`selectremove`. click-css styles the real child nodes
- `controller/dom.js` — all DOM refs + `send_toast`, `set_attr_if_changed`, `set_best_score`, `set_text_if_changed`
- `main.js` — startup wiring
- `docs/index.html` — markup + click-css style/class syntax, expanded at runtime by `docs/lib/click-css.min.js`
- `game_mode/<name>.js` — that mode's runtime AND persisted state, module-local: own `STORAGE_KEY = "<name>#best_score"`, `best_score`, score display, exported `clear_best_score()`. `state.js` knows nothing about modes

## Conventions
- Read `const { x } = state.foo`; write `state.foo.x = v` (review-enforced, not lint)
- Alphabetize within local groups: imports, object keys, fn defs, independent consts/branches, order-insensitive assigns
- `constants.fov.<game>` keys use in-game scope names (`x1`, `operator2_5`, `awp2`), never generic `ads`. One `convert_deg_across_aspect` per value — fold chains by composing tan-ratios (4:3-horizontal → vertical is `(deg, 4, 3)`, not 4:3→16:9→vertical). No `render_*` intermediate consts
- Comments = JSDoc + narrow ESLint directives only; no prose comments
- Type cast: `/** @type {T} */(x)/**/` — the trailing `/**/` is required for parser stability
- JSDoc mirroring an existing declaration uses `typeof` on the source of truth (`/** @type {typeof state.stats.shoots} */`) — never re-spell the shape
- Arrow functions are optional for one-off/disposable use (thin arg-forwarding wrappers). Reused/named/hot-path functions MUST use `function`
- **Bug-zero code**: no defensive error handling, logging, or watchdog instrumentation — native traces are the only debugging needed. Only allowed `throw`s are dev-guards on unreachable branches (`else { throw Error(fn) }`) and genuine feature logic (`QuotaExceededError`, `try/finally` cleanup). No reactive error handlers (`onerror`, `"error"` listeners)
- **State-free import closure** (lint-enforced): `eslint.config.js:state_free_files` lists the modules whose import chain never reaches `state.js` (localStorage ⇒ browser-only). Each may import ONLY from that set; `calc_sens.js` and both `worker/*_worker.js` have stricter per-file allow-lists. Add a new state-free module to `state_free_files` before any state-free file imports it
- **Optimization** exists to improve runtime perf — never trade perf for it, and don't reshape documented core APIs (e.g. `create_queue`). Add hot-path machinery (pools) only when it is O(1) ultra-light AND removes a real per-frame allocation; skip it where bookkeeping costs more or breaks correctness (`writing.lines` is consumed raw via `.array`, so flattened but NOT pooled)

## Non-obvious invariants
- **Start requires pointer lock + fullscreen.** `start_game()` keeps both `await`s, `.init()` and the first rAF in ONE `try`, so any rejection (e.g. the ~1.25 s pointer-lock cooldown right after an Escape release) aborts the whole call: `catch` exits lock/fullscreen and resets `state.game.mode = null` without ever starting a frame loop. Intentional — do not make it lock-optional. A module-level `starting` flag drops re-entrant calls. Losing pointer lock in-game → auto `stop_game()`
- **`update_camera_view()` is the single writer of camera view state.** Per-`sens` branches assign only LOCALS (`dimension`/`dist`/`vfov`); the shared tail writes `state.camera.*` once, so `fov = convert_deg_across_aspect(vfov, 9, 16)` exists at exactly one call site (PUBG included — its `fov` round-trips to the same 80/103 preset it used to assign). Tail order matters: `dist` (branches assign the RAW `constants.tpp.<game>`, never pre-scaled) × `constants.tpp.render_dist_scale` → `sens = calc_rad_per_px(fov, width)` → `rad_size = px_to_rad(constants.impact.px_size)`, which needs the already-scaled `dist`. Every new branch must keep those three derivations working
- **FOV never reflects the real window aspect.** `vfov` is read verbatim from `constants.fov.<game>.render` (vertical-at-16:9) and feeds `prepare_3d_view()`'s `mat4.perspective` directly; `fov` (horizontal, the one `sens` uses) is the fixed 9:16 swap of it. `on_resize()` does NOT call `update_camera_view()`, so only a dimension flip refreshes `fov` — and to the same number. Consequence: `game_mode/twitch.js`'s `convert_deg_across_aspect(fov, width, height)` spawn-spread reads the CURRENT real `width`/`height` against a FOV that never does. `state.camera.sens` IS refreshed on width change, in `render.resize_3d()`
- `constants.tpp.<game>` is renderer-orbit-only and never enters a sens formula — sens is view-independent (see `calc/CLAUDE.md`)
- `state.input.key_space` 30 fps cap SKIPS the rAF body and re-queues; it does not throttle rendering inside the frame
- `state.timer.now_s` comes from AudioContext (`sfx.js:get_audio_time()`), not `performance.now()` — use it for SFX-aligned timing, `now_ms` for everything else. `prev_ms` is the prior frame's `now_ms`; tracking modes use it as the start stamp `s` when pushing to `state.stats.shoots`
- **GC avoidance**: from `init()` to `dispose()` the per-frame hot path allocates nothing. Queue entries (`shoots`/`impacts`/`impacts_3d`) and per-mode targets come from `pool.js` free-lists — push `obtain()`s + fills every field, the drop site `recycle()`s before `drop()`, `dispose()` `clear()`s the pools. `convert_target_*` write into a passed `out`. Per-mode details in `game_mode/CLAUDE.md`

## Hot paths
- **Start**: `controller/menu.js` → `logic.start_game(mode)` (sets `state.game.mode`) → lock + fullscreen → `hud.set_controls()` → `mode.init()` → first rAF
- **Frame**: `logic.on_frame()` → space-hold gate → timer/audio update → `mode.on_frame()` → if `now_ms >= state.hud.next_update_ms`: `check_stats?()` + `update_hud()` → toggle `#canvas-3d` display on `dimension` crossing `2d` → `mode.render()` → next rAF
- **Resize**: `controller/window.js:on_resize()` → `resize_2d()` → `resize_3d()` (no FOV refresh)
- **Dimension flip** (RMB down/up, `mousecancel`): `mode.update_dimension()` → `update_camera_view()` → `convert_camera_to_2d/3d` if camera state non-zero → `convert_target_to_2d/3d` → convert in-flight lerp endpoints
- **Input**: `controller/window.js` writes `state.input.key_*`/`mb_*`, then calls `mode.shoot()` (Q/W/E/R/A keydown, LMB down) or `mode.update_dimension()` (RMB down/up if defined, else `shoot()`)
- **Worker**: calc via `post_calc_worker_message({ fn, ...args })`, responses `[fn, ...payload]` dispatched by `manager.js`. BG uses separate object messages via `post_bg_worker_message()`

## Change map (then read the closest dir note)
- **Add mode**: `private.d.ts:GameModeName` · `constants.js:mode.*` (incl. `guide` — the in-game controls-panel line) · new `game_mode/*.js` (own `STORAGE_KEY`, `best_score` init, `clear_best_score` export, score display) · `game_mode/index.js` · `controller/dom.js` (score_el + clear_btn) · `menu.js` · `setting.js:CLEAR_SCORE_HANDLERS`
- **Add sens game**: `private.d.ts:GameSensName` · `state.js` defaults (incl. the `dpi_norm.sens` fallback) · `constants.fov.<game>.render` (`[base]` / `[base, zoom]`; pubg alone `[fov103, fov80, zoom]` — vertical-at-16:9, last entry = ads/scope zoom) · `logic.update_camera_view()` branch (destructure `render`, set LOCAL `vfov`, plus LOCAL `dimension` only if not the `"fpp"` default and LOCAL `dist = constants.tpp.<game>` if tpp) · `constants.fov.<game>`'s flat calc-only fields (at whatever aspect basis that game's sens formula assumes) · `calc/calc_sens.js` + `calc/calc_dpi.js` · `controller/game_sens.js` · `worker/calc_worker.js:update_game_sens` tuple · DOM refs + markup
- **Add settings UI**: ref in `controller/dom.js` → init from `state` in `main.js` → bind in `controller/setting.js`
- **Add calc worker msg**: `worker/calc_worker.js` dispatch + impl · `worker/manager.js` dispatch branch · caller payload
- **Change default BG video**: `render/renderer_bg.js` · `worker/bg_worker.js` · `worker/manager.js:post_bg_worker_message` · `private.d.ts:MediaSourceHandle` · `docs/index.html` bg canvas/preload
- **Change BG options**: `controller/setting.js` + `bg_store.js` + `render/renderer_bg.js:set_bg_upload_video()` + `docs/index.html#setting-background` + `private.d.ts:BackgroundType`/`BgVideo` — see `controller/CLAUDE.md` for the commit-on-Save model
- **Change target/camera/impact math**: `calc/calc_sens.js:calc_rad_per_px` · `render/camera.js` · `logic.update_camera_view()` · `render/renderer_3d.js:resize_3d()` · every mode with `update_dimension()`

## State landmarks
`state.js` = persisted-or-cross-cutting only. Mode runtime = module-local in `game_mode/<name>.js`.

| key | contents |
|---|---|
| `game` | `mode`, `resolution`, `sens` (game), `raf_id`, `rest_timeout` (screensaver setTimeout id), `width`/`height`/`dpi_scale`/`lol_sens`/`pubg_fov` |
| `camera` | `dimension: "2d"\|"fpp"\|"tpp"`, 2D `x`/`y`, 3D `yaw`/`pitch`, `fov`, `vfov`, `dist`, `width`/`height`, `sens`, WebGL `proj`/`view` |
| `stats` | shared 30 s window (`constants.hud.window_ms`): `shoots` queue + `count_*`/`sum_*_ms` aggregates |
| `impact` | `rad_size` only (3D) |
| `impacts` / `impacts_3d` | visual queues, cleared per-dimension on `dispose()` |
| `timer` | `now_ms` (rAF), `now_s` (AudioContext), `prev_ms`, `start_ms`, `next_frame_ms`, `fps` |
| `input` | `key_a/e/q/r/space/w`, `mb_left`/`mb_right` — raw flags |
| `audio` / `bg` / `crosshair` / `dpi_norm` | user settings, localStorage-backed (key = state-tree path) |

- `camera.fov` — horizontal, 16:9-basis, paired with `width` for `sens`; derived from `vfov` via `convert_deg_across_aspect(vfov, 9, 16)`. `camera.vfov` — vertical, 16:9-basis, straight from `constants.fov.<game>.render`. `camera.dist` — TPP orbit offset in world units (`constants.tpp.<game>` × `render_dist_scale`); reset to `0` at the top of every `update_camera_view()`, set only by tpp branches, scaled once in the tail. `proj`/`view` are mutated in place by `prepare_3d_view()`
- `stats`: modes push to `shoots`; `check_stats()` expires entries and decrements aggregates. Exception: `aim_booster` pushes to its own module-local `shoots`
- `impact.rad_size` is derived by `update_camera_view()` as `px_to_rad(constants.impact.px_size)` and reset by 3D-capable mode `dispose()`; the 2D impact radius reads `constants.impact.px_size` directly
- `audio` = `{ bgm_volume, sfx_volume }` (0–100, scaled by `constants.audio.*_max_gain`). `bg` = `{ blur, type, video_id, youtube_link }` — `blur` toggles `body[bg-blur]` (in-game BG blur), uploaded blobs live in IndexedDB
- Mode-private state (`best_score`, peak/targets/lerps/timers) lives in `game_mode/<name>.js` module-locals, keyed `<module>#<field>` in localStorage

## create_queue (state.js)
Logical-head ring. `.length`, `.at(i)`, `.push()`, `.drop()`, `.clear()` respect the head. `.array` is the RAW backing buffer (head-dropped entries still present) — use it only when passing to a worker TOGETHER WITH the head offset (`lines_start = array.length - length`; a structured-cloned plain Array knows nothing about the head, so the worker must iterate from that offset), or for `aim_booster`'s `.array.length =` rewind truncation. Compacts IN PLACE (`copyWithin`, no allocation) when `head > 2048` AND `head > q.length / 2` (half the RAW backing array, not the logical `.length`) — keeps the backing linear so `.array` stays valid while avoiding a periodic `slice` spike.

Entry objects are pooled OUTSIDE the queue (`pool.js`): push a pooled object, `recycle()` at the drop site.
