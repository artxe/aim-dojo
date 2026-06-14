# calc/

Numeric sens/DPI/mouse-scale math. DOM lives in `controller/`, FOV side effects in `logic.js`, worker tuple format in `worker/`.

## Files
- `calc_sens.js` — per-game in-engine sens; `calc_rad_per_px()`; `lol_sens_to_dpi_scale()`. Imports `../math.js` only — NO `state`/`constants`
- `calc_dpi.js` — per-game DPI to preserve turning; reads `state.dpi_norm`
- `calc_pubg.js` — PUBG integer ↔ yaw conversion

## Non-obvious
- `calc_rad_per_px(fov_deg, width)` returns rad/px. The monitor-match point is derived INTERNALLY from FOV geometry — `match = width * (1 - cos(fov/2)) / 2` (arc-height ÷ diameter) — so the matching distance grows super-linearly with FOV and collapses to 0 (plain linear sens) as FOV → 0. It's the hot inner of nearly every sens calc. `on_mousemove` does NOT call it directly — `state.camera.sens` is the cached result, recomputed in `logic.update_camera_view()` and `render.resize_3d()`
- There is NO `match`/DPI parameter (removed along with the worker `dpi_x` field). DPI affects sensitivity ONLY via (a) OS pixels feeding the cached `state.camera.sens` for the camera, and (b) the explicit `dpi * sens` factor inside `calc_dpi_*`. The matching point itself is purely geometric (FOV + width), identical across DPIs
- Two layers: `calc_dpi_*` (main thread) read everything from `state` and take ZERO params; `calc_sens_*` / `calc_rad_per_px` are PURE and shared with `worker/calc_worker.js` (which has no `state`), so they MUST stay parameterized (`fov`/`width`/`height` only) — do NOT make them read `state` to "reduce params" (it would break the worker)
- `calc_sens.js` may import ONLY `../math.js` — enforced by a file-scoped `no-restricted-syntax` allow-list in `eslint.config.js` (NOT an inline header). This keeps the worker import tree (`calc_worker → calc_sens → math`, and `math.js` itself bans all imports) closed so `state.js` can never transitively reach the worker. Same guard exists for `calc_worker.js` (allow `./calc_sens.js` + `../math.js` only)
- Aspect-ratio-aware games (`al`, `cs2`, `mc`, `r6`, `sa`) feed through `convert_deg_across_aspect` first; aspect-independent (`fn`, `ow`, `pubg`, `val`) don't. Mirror this when adding a game.
- `calc_sens_*` returns raw in-engine sens. The 44-value `calc_worker.update_game_sens` derives multipliers (e.g. `x2`, `x4`, scope) by re-calling with FOV/N and dividing by the hipfire baseline
- `lol_sens_to_dpi_scale()` lives here but is LOL-only — piecewise-linear over 11 anchors (`.031_25 … 3.5`). LOL has no in-game sens; the DPI normalizer rescales DPI instead
- Each `calc_sens_*` has its own quirky base FOV/constants: `al` uses `70*1.55`, `cs2`/`r6` use `90`, `fn` uses `80`, `ow` uses raw rad multiplier `.006_6`, `val` uses `103` + `.07` scalar, `pubg` is log-scale (`base_sens=50`, `step≈15.0515`). Don't guess — copy from the game's actual config

## When you change…
- A sens formula: also verify `logic.update_camera_view()` branch for the same `sens` key. The FOV the renderer uses must match the FOV the sens calc assumes; otherwise mouse and target scale diverge
- `calc_rad_per_px`: only the two cache write sites call it — `logic.update_camera_view()` (fov change) + `render.resize_3d()` (width change) — and both populate `state.camera.sens`. Readers (`render/camera.js:px_to_rad`/`rad_to_px`, `controller/window.js:on_mousemove`) use the cached `state.camera.sens`, so changing the formula flows to them automatically
- PUBG math: `calc_pubg.js` + `calc_sens_pubg()` + PUBG INI rewrite in `controller/game_sens.js` (all three)
- Add a sens game: see root `Change map → Add sens game`
