---
paths:
  - "docs/js/game_mode/**"
  - "docs/js/struct/**"
---

# game_mode/

Each mode default-exports `/** @type {GameMode} */`; `index.js` maps `GameModeName` through getters with static imports.

```
init()              reset state; set_hud_labels(); update_camera_view() FIRST; build targets
on_frame()          read input/timer; advance targets/lerps; tracking modes call shoot()
on_move?()          after every mouse delta (polling rate); keep it a few comparisons
render()            2D context_2d, or prepare_3d_view() → draw_*_3d → draw_crosshair() on the 2D canvas
shoot()             hit/crit; SFX; push impacts; push state.stats.shoots
update_hud()        write score/accuracy; set state.hud.next_update_ms
dispose()           reset every per-run let/queue/pool; state.game.mode = null; reset_hud_labels();
                    state.impact.rad_size = 0; clear the disposed dimension's impacts; reset_run_state()
clear_score()       record.clear(); removeItem(STORAGE_KEY); set_mode_score(…, 0); bilingual send_toast
check_stats?()      drop expired shoots + decrement aggregates (HUD cadence, not per frame)
update_dimension?() RMB down/up + mousecancel; idempotent
```

## 2D vs 3D
- `aim_booster`, `writing` are always 2D with no `update_dimension` (its presence is what pitch-clamps the 2D `y`); `h_tracking`, `precision` are 2D/3D
- Fixed-2D modes still call `update_camera_view()` first in `init()` (it fills `sens`/`fov`/`sens_error`/`rad_size`), then force `dimension = "2d"`. `on_resize()` uses the projection half so that override survives; never simplify it to `update_camera_view()`
- `update_dimension()`: `update_camera_view()` → return if `state.camera.dimension` is still `"2d"` → convert camera if `x`/`y` or `pitch`/`yaw` non-zero → convert live targets → convert in-flight lerp endpoints. Without the guard a redundant call re-runs the one-way conversion

## Stats (`state.stats`)
- `shoots` entries `{ c, d, e, h, s }`; instant modes use `s = prev_ms`, `e = now_ms`; `h_tracking` adds `e - s` to `sum_*_ms` and demand bits to `d`
- `check_stats()` drops `e < now - window_ms`, clips the straddling entry in place (`shoots.at()` is a live reference) and recycles only on the full-expire branch
- `writing` bypasses `shoots`: `build_text()` posts `text_data` once per run (buffer transferred), `check_stats()` posts a stroke delta; `pending_drop`/`pending_push` zero in `dispose()`

## Scoring is a measurement with a unit
- `aim_booster`, `precision`: Fitts `TP = ID_e / MT` bit/s from `struct/fitts.js`; `h_tracking`: `track_bits / elapsed_s` bit/s; `writing`: `count_hit² / count_shoot / window_s`. No combined rating
- A `/s` denominator is `min(now_ms - start_ms, window_ms) / 1000`, never a literal 30
- A run banks one sample: `update_hud()` folds the live score into `run_sum`/`run_count` only when non-zero; `dispose()` pushes `run_sum / run_count` into the mode's `create_record` (all-time max) and persists `String(record.value)` under `<name>#runs`. No full-window gate
- Fitts: one trial per CLICK (`fitts.trial()` toward the attributed target, `fitts.click()` when none is live); `trial()` skips zero distance or time; `W_e = we_factor × SD` of signed axial errors, never the target radius; below `trial_min` the HUD shows `-` and nothing banks; `update_dimension()` calls `fitts.reset()`
- `h_tracking`: `move.speed` is base-radii per ms, independent of the live radius; one lerp block serves both dimensions; a blink is credited as demand (`blink_bits`) on the first on-target frame, a newer blink replaces a pending one; the staircase drives speed only
- `aim_booster`: targets grow then shrink on a clock; expiry costs a life with the full miss effect; the core is `r * core_ratio`, never `calc_core_radius`; the spawn box is inset by `target_diameter`
- `precision`: size and distance are independent knobs; the core is the one-arg `calc_core_radius(r)`
- `writing`: the pen samples per mouse delta (`on_move` → `shoot()` appends once the crosshair moved `line_width` px); strokes are a flat `Float64Array` ring (`LINE_STRIDE` 5)

## Pooling
- `shoot()`: `shoots_pool.obtain()` → assign every field (`c` even on a miss) → push. Never push a literal
- Targets: spawn `obtain()`s + fills; removal `recycle()`s exactly once (manual shift, not `splice`); a bulk `length = 0` recycles first
- Module-local state is not auto-reset; `dispose()` resets every per-run `let`. `aim_booster.end_ms`/`start_ms`/`history` (the rewind) are the deliberate exception

## struct/
- State-free; none may reach `state.js`. `staircase.feed(rate)` once per window, `level` 0–1; the mode maps it to its knob and persists `<name>#level`. `record` keeps an all-time max and still parses a legacy comma-joined ring
- `create_queue().array` is the RAW backing buffer (dropped entries still present): only for `aim_booster`'s rewind truncation, never structured-cloned to a worker

## Footguns
- 3D `render()` calling `draw_*_3d` before `prepare_3d_view()` draws stale matrices and skips the uniform upload
- 2D `render()` opens its own `save()` + `translate(-x, -y)` around the world block and closes it before `draw_crosshair()`; the draw helpers do not transform or restore
