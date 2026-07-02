# Agent Notes

Vanilla JS SPA. `docs/` deploys as-is. No bundler. tsc `checkJs:true`; types in `private.d.ts`. `docs/lib/` excluded from lint/tsc.

## Where to look first
- Modes / scoring / 2D-3D conversion → `docs/js/game_mode/`
- Input / settings / HUD / DOM / game-sens UI → `docs/js/controller/`
- Camera math / 2D canvas / WebGL → `docs/js/render/`
- Worker protocol / tuple sync / default BG video worker → `docs/js/worker/`
- Sensitivity / DPI numerics / import boundaries → `docs/js/calc/`

## Source of Truth (don't duplicate in notes)
- `state.js` — cross-cutting + localStorage-hydrated state; exports `create_queue()` impl and the shared `shoots_pool`/`impacts_pool`/`impacts_3d_pool` (entry-object pools)
- `pool.js` — `create_pool(make)`: free-list object pool (`obtain`/`recycle`/`clear`) used to keep the per-frame hot path allocation-free
- `bg_store.js` — IndexedDB CRUD for uploaded background-video blobs (split `bg_videos` meta + `bg_blobs` stores; DB version = schema version, NOT app version). `state.bg.video_id` references a record id; blobs never touch localStorage
- `private.d.ts` — global JS types
- `constants.js` — immutable tuning; imports `./math.js` only
- `controller/dom.js` — all DOM refs/helpers
- `main.js` — startup wiring
- `docs/index.html` — markup plus click-css style/class syntax; `docs/lib/click-css.min.js` expands it at runtime
- `game_mode/<name>.js` — that mode's runtime AND persisted state (module-local). Each mode owns its `STORAGE_KEY = "<name>#best_score"`, `best_score`, score-display init, and exports `clear_best_score()` for `setting.js`. `state.js` knows nothing about modes.

## Conventions
- Read: `const { x } = state.foo`; write: `state.foo.x = v` (style enforced by review, not lint)
- Alphabetize within local groups (imports, object keys, fn defs, independent consts/branches, order-insensitive assigns)
- Comments = JSDoc + narrow ESLint directives only; no prose comments
- Bug-zero code: no defensive error handling, logging, or watchdog instrumentation. Native traces (error site + stack) are the only debugging needed. The ONLY `throw`s allowed are dev-guards on unreachable branches (`else { throw Error(fn) }`, `if (!mode) throw Error()`) and recovery that is genuine feature logic (e.g. `QuotaExceededError` handling, `try/finally` resource cleanup). No reactive error handlers (`onerror`, `"error"` listeners) — the browser surfaces native errors itself
- HTML style/class syntax in `docs/index.html` uses click-css; consult https://raw.githubusercontent.com/artxe/click-css/refs/heads/main/README.md ONLY when genuinely unsure of the syntax — for edits reusing patterns already visible in the file (removing a token, editing a `:not(a,b,c)` list, deleting a `selector/prop=value` rule), just make the change
- Optimization (esp. GC avoidance) exists to IMPROVE runtime perf — never trade perf to achieve it, and don't change documented core APIs (e.g. `create_queue`) for it. Only add hot-path machinery (object pools, etc.) when it is O(1) ultra-light AND removes a real per-frame allocation; skip it where bookkeeping costs more than it saves or where it breaks correctness (e.g. `writing.lines` is consumed raw via `.array`, so flattened but NOT pooled)
- Type cast pattern: `/** @type {T} */(x)/**/` — trailing `/**/` is required for parser stability

## Non-obvious invariants
- `start_game()` silently swallows pointer-lock/fullscreen failure and proceeds anyway (catch path also calls `exitPointerLock/exitFullscreen`). Game runs even without lock.
- Pointer lock loss in-game → auto `stop_game()` (`on_pointerlockchange`)
- `update_camera_view()` ALSO derives `state.camera.sens` (cached `calc_rad_per_px`) and `state.impact.rad_size = state.camera.sens * 20` at the end. Every new `sens` branch must keep these derivations working.
- `state.camera.sens` (rad/px for mouse) is also refreshed in `render.resize_3d()` — width changes there don't pass through `update_camera_view`
- `on_resize()` does NOT call `update_camera_view()`. FOVs derived from `convert_deg_across_aspect(...)` with screen `width`/`height` args go stale after resize until the next dimension flip (constant-span uses like `val`'s 2.5× ADS zoom don't).
- `state.input.key_space` 30 fps cap works by SKIPPING the rAF body and re-queueing — not by throttling rendering inside the frame
- `state.timer.now_s` comes from AudioContext (`sfx.js:get_audio_time()`), not `performance.now()`. Use it for SFX-aligned timing; `now_ms` for everything else.
- `state.timer.prev_ms` is the prior frame's `now_ms` — tracking modes use it as the start timestamp `s` when pushing to `state.stats.shoots`
- GC avoidance (perf): from `init()` to `dispose()` the per-frame hot path allocates nothing. Queue entries (`shoots`/`impacts`/`impacts_3d`) and per-mode targets come from `pool.js` free-lists — push obtains + fills all fields, the drop site `recycle()`s before `drop()`, and `dispose()` (via `reset_run_state()` or the mode) `clear()`s the pools to release memory. `convert_target_*` write into a passed `out`. `aim_booster` deliberately does NOT pool `shoots` (no `check_stats`/drop path — it truncates `shoots.array` for the rewind, so there is nothing to recycle)

## Hot paths
- Start: `controller/menu.js` passes the mode name to `logic.start_game(mode)` (which sets `state.game.mode = mode`) → request lock+fullscreen → `mode.init()` → first rAF
- Frame: `logic.on_frame()` → space-hold gate → timer/audio update → `mode.on_frame()` → if `now_ms >= state.hud.next_update_ms`: `check_stats?()` + `update_hud()` → `mode.render()` → next rAF
- Resize: `controller/window.js:on_resize()` → `resize_2d()` → `resize_3d()` (no FOV refresh)
- Dimension flip (RMB down/up, mousecancel): `mode.update_dimension()` → `update_camera_view()` → `convert_camera_to_2d/3d` if camera state non-zero → `convert_target_to_2d/3d` → convert in-flight lerp endpoints
- Input: `controller/window.js` writes `state.input.key_*/mb_*`, calls `mode.shoot()` (Q/W/E/R/A keydown, LMB down) or `mode.update_dimension()` (RMB down/up if defined, else `shoot()`)
- Worker: calc calls use `post_calc_worker_message({ fn, ...args })`; responses are `[fn, ...payload]` and `manager.js` dispatches directly. BG uses separate object messages via `post_bg_worker_message()`

## Change map (start here, then closest dir note)
- Add mode: `private.d.ts:GameModeName`, `constants.js:mode.*`, new `game_mode/*.js` (includes its own `STORAGE_KEY`, `best_score` init, `clear_best_score` export, score_el textContent), `game_mode/index.js`, `controller/dom.js` (score_el + clear_btn refs), `menu.js`, `setting.js:CLEAR_SCORE_HANDLERS` Map entry
- Add sens game: `private.d.ts:GameSensName`, `state.js` defaults (incl. `dpi_norm.sens` fallback for the new game), `logic.update_camera_view()` branch (set `dimension` + `fov`; verify `rad_size` derivation), `calc/calc_sens.js` + `calc/calc_dpi.js`, `controller/game_sens.js`, `worker/calc_worker.js:update_game_sens` tuple, DOM refs/markup
- Add settings UI: ref in `controller/dom.js` → init from `state` in `main.js` → bind in `controller/setting.js`
- Add calc worker msg: `worker/calc_worker.js` dispatch + impl, `worker/manager.js` dispatch branch, caller payload
- Change default background video: `render/renderer_bg.js`, `worker/bg_worker.js`, `worker/manager.js:post_bg_worker_message`, `private.d.ts:MediaSourceHandle`, `docs/index.html` bg canvas/preload
- Change background-video options (`video` radio = `default`-or-uploaded via the `#bg-video-options` selector; `youtube` radio = URL): `controller/setting.js` (`init_bg`/`show_bg`/`commit_bg`/`staged_bg` + selector render/select/upload/delete — commit-on-Save, NO live preview; selecting only stages, Activate previews, Save commits), `bg_store.js` (IndexedDB), `render/renderer_bg.js:set_bg_upload_video()` (uploads play as a plain fullscreen `<video loop>` — NO worker tiling, the 3-strip WebGL is default-only), `docs/index.html` `#setting-background` (`bg-type` radios + `#bg-video-select` selector + `#bg-link` + the `#bg-upload-video` element + `#bg[data-show=default|video|youtube]` picks which child shows — `setting.js:show_bg` sets it; bg-activate card z-layered over settings), `private.d.ts:BackgroundType`/`BgVideo`. `state.bg.type` is `default`/`video`/`youtube` (= currently displayed); localStorage/`bg_snapshot` = committed. `show_bg` keeps the youtube iframe `src` loaded while youtube is still committed (`bg_snapshot.type == "youtube"`) so Activate-another→cancel doesn't reload it; `commit_bg` clears the iframe `src` when committing a non-youtube type. The `video` radio covers BOTH `default` and `video` (the selector decides which)
- Change target/camera/impact math: `calc/calc_sens.js:calc_rad_per_px`, `render/camera.js`, `logic.update_camera_view()` (`rad_size` + `state.camera.sens` derivation), `render/renderer_3d.js:resize_3d()` (sens cache refresh), every mode with `update_dimension()`

## State landmarks
Split: `state.js` = persisted-or-cross-cutting only. Mode runtime = module-local in `game_mode/<name>.js`.
- `state.game` — active `mode`, `resolution`, `sens` (game), `raf_id`, `rest_timeout` (screensaver setTimeout id), `width`/`height`/`dpi_scale`/`lol_sens`
- `state.camera` — `dimension: "2d"|"fps"|"tps"`, 2D `x/y`, 3D `yaw/pitch`, `fov`, `width/height`, `sens` (cached rad/px, derived from fov+width), WebGL `proj/view` (mutated in-place by `prepare_3d_view()`)
- `state.stats` — shared 30s scoring window (`constants.hud.window_ms`); modes push to `shoots`; `check_stats()` expires + decrements aggregates
- `state.impact` — `px_size` (2D constant), `rad_size` (3D, derived by `update_camera_view()`, reset by 3D-capable mode `dispose()`)
- `state.impacts` / `state.impacts_3d` — visual queues; cleared per-dimension on `dispose()`
- `state.timer` — `now_ms` (rAF), `now_s` (AudioContext), `prev_ms`, `start_ms`, `next_frame_ms` (space-hold gate), `fps`
- `state.input.key_a/e/q/r/space/w, mb_left/mb_right` — raw flags; modes read in `on_frame()`/`shoot()`
- `state.bg` / `state.crosshair` / `state.dpi_norm` — user-settings containers, localStorage-backed (key = state-tree path). `state.bg` is `{ type: "default"|"video"|"youtube", video_id, youtube_link }` only; uploaded video blobs live in IndexedDB via `bg_store.js`
- Mode-private state (`best_score`, peak/targets/lerps/timers) lives in `game_mode/<name>.js` module-locals, NOT in `state.*` (see `game_mode/CLAUDE.md`). localStorage key for module-private fields uses `<module>#<field>` form

## create_queue (state.js)
Logical-head ring. `.length`, `.at(i)`, `.push()`, `.drop()`, `.clear()` respect head. `.array` is the RAW backing buffer (head-dropped entries still present) — only use when passing to worker that re-indexes via `.at(i)`, or for `aim_booster`'s direct `.array.length =` rewind truncation. Compacts IN PLACE (`copyWithin`, no allocation) when `head > 2048` AND `head > q.length/2` (HALF THE RAW BACKING ARRAY, not the head-respecting logical `.length`) — keeps the backing linear (so `.array` and `.array.length =` stay valid) while avoiding a periodic `slice` allocation spike.

Entry objects are pooled OUTSIDE the queue (`pool.js`), not by `create_queue` itself — push a pooled object, `recycle()` it at the drop site. Do NOT pool entries for a queue whose `.array` is consumed raw elsewhere (e.g. `writing.lines` → worker): a recycled object re-pushed at a new index would also appear at its stale index in the raw backing buffer. `writing.lines` therefore flattens its `Line` to `{ ex, ey, sx, sy, t }` (no nested point objects, no aliasing) but does NOT pool.
