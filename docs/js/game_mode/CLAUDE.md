# game_mode/

Each mode default-exports `/** @type {GameMode} */`. `index.js` re-exports 7 modes keyed by `GameModeName`.

## Mode contract
```
init()              reset state; call update_camera_view() FIRST, then build initial target(s) per dimension
on_frame()          per-frame work (read input/timer; advance targets/lerps; tracking modes call shoot() here)
render()            draw frame (2D context_2d, or prepare_3d_view() then draw_*_3d on #canvas-3d, then draw_crosshair() on the 2D canvas)
shoot()             evaluate hit/crit; play SFX; push to impacts/impacts_3d; push to state.stats.shoots
update_hud()        write peak/best/accuracy to DOM; set state.hud.next_update_ms = now + 50ms
dispose()           clear state; state.game.mode = null; reset state.impact.rad_size; clear per-dim impacts
check_stats?()      drop expired shoots + decrement aggregates (called only when HUD due, not every frame)
update_dimension?() RMB down/up + mousecancel — must be idempotent
```

## 2D vs 3D
- Always 2D: `aim_booster`, `writing` — no `update_dimension`. Their `init()` STILL calls `update_camera_view()` first, then overrides `state.camera.dimension = "2d"`: it's what populates `state.camera.sens`/`fov`, and `on_mousemove`'s 2D `y_limit = PI/2/sens - EPS | 0` with sens still 0 (fresh load, no other mode run yet) is `Infinity | 0` = 0 → vertical mouse locked. Since that call also sets `state.impact.rad_size`, their `dispose()` resets it like the 3D-capable modes
- 2D/3D capable: `flick`, `h_tracking`, `timing`, `twitch`, `v_tracking`
- Effective dimension = result of `logic.update_camera_view()` given `state.game.sens` + `state.input.mb_right` (e.g. `lol` toggles 2D↔FPP, `fn`/`mc` toggle TPP↔FPP, PUBG uses TPP 80 or FPP 103 hipfire and FPP ADS, `cs2`/`ow`/`r6`/`val` stay FPP but change `fov`)
- `update_dimension()` body order: `update_camera_view()` → if camera state non-zero (`x`/`y` or `pitch`/`yaw`) convert via `convert_camera_to_2d/3d` → convert active target(s) via `convert_target_to_2d/3d` → convert ANY in-flight lerp endpoints (e.g. `size_lerp.from/to` in `h_tracking`/`v_tracking` — they're stored in current-dim units)
- 3D `render()` MUST call `prepare_3d_view()` BEFORE any `draw_*_3d`; lower-level helpers only read `state.camera.proj/view`

## Stats flow (shared `state.stats`)
- `shoots` queue items: `{ s, e, h, c }` — `s`/`e` = start/end timestamps of the scored interval, `h` = hit, `c` = crit. Instant-shot modes (`aim_booster`/`flick`/`h_tracking`/`v_tracking`) use `s = prev_ms`, `e = now_ms`. `twitch`/`timing` instead record the target's remaining visible window: `s = now_ms` (shot time), `e = shot_hide_ms` (captured `next_hide_ms`) — so `e - s` rewards shooting earlier. `aim_booster` alone pushes to its MODULE-LOCAL `shoots` queue (rewind persistence), not `state.stats.shoots`
- `shoot()` pushes one entry and bumps aggregates: all modes increment `count_*`; the ms-scored modes also add `e - s` (`twitch`/`timing` → `sum_hit_ms`/`sum_crit_ms`; `h_tracking`/`v_tracking` → `sum_shoot_ms`/`sum_hit_ms`/`sum_crit_ms`). `aim_booster`/`flick` are count-only
- Tracking modes call `shoot()` every frame an input key is held → many tiny windowed entries
- `check_stats()` drops entries with `e < now-30s` (decrementing aggregates) and clips entries straddling the window edge: `first.s = window_ms` plus a partial `sum_*_ms -= window_ms - s`
- `writing` is special: does NOT use `shoots`. `init()`'s `build_text()` posts `text_data` (+dims) ONCE per run via `set_writing_text` with the buffer TRANSFERRED (main thread must not reuse it). `check_stats()` then sends only `lines.array` + `lines_start` (= `array.length - length`, the logical head — the worker iterates from it so head-dropped strokes past the 30 s window don't score) to `calc_worker.check_writing_stats`, which renders the strokes to an OffscreenCanvas, compares alpha against the cached `text_data`, returns `[count_hit, count_shoot]`, and `writing`'s registered worker handler writes them to `state.stats`

## Scoring
| mode | formula | notes |
|---|---|---|
| aim_booster | `count_hit * 100` | spawn-rate ramps with 10 s rewind |
| flick | `100 * (count_crit + count_hit) * count_hit / count_shoot` | accuracy-weighted |
| h_tracking | `sum_crit_ms + sum_hit_ms` | horizontal-only; core rotates toward movement |
| timing | `(sum_crit_ms + sum_hit_ms) * count_hit / count_shoot` | accuracy-weighted ms |
| twitch | `(sum_crit_ms + sum_hit_ms) * count_hit / count_shoot` | |
| v_tracking | `sum_crit_ms + sum_hit_ms` | vertical-only (pitch ±`pitch_limit`); core centered |
| writing | `7 * count_hit * (count_hit / count_shoot) ** 4` | accuracy⁴ weighted |

`update_hud()` persists new bests with the mode's local `STORAGE_KEY` (`{mode}#best_score`). `controller/setting.js` wires each clear button directly to that mode's `clear_best_score()`.

## GC avoidance (allocation-free hot path)
From `init()` to `dispose()` the per-frame path allocates nothing (perf: avoids rAF-time GC stutter). Without touching `create_queue`, entry objects are reused via `pool.js` free-lists:
- `shoot()` (and the `on_frame` miss pushes in `twitch` — a per-target loop — and `timing` — a single miss): `const e = shoots_pool.obtain()` → assign EVERY field (`c`/`e`/`h`/`s`) → `shoots.push(e)`. Never push a literal. Always set `c` even on a miss (`c = false`) so a recycled object's stale crit flag can't leak.
- `check_stats()`: on the full-expire branch, `shoots_pool.recycle(first)` AFTER `shoots.drop()`. The partial-window-clip branch (`first.s = window_ms; break`) does NOT drop, so does NOT recycle.
- Targets: `flick`/`twitch` keep `target_pool_2d`/`target_pool_3d`, `aim_booster` keeps `target_pool`. Spawn `obtain()`s + fills; removal `recycle()`s the removed object (replace `splice`/`length--` with a manual shift + recycle — no array churn); a bulk `length = 0` recycles every entry first. `update_dimension()` converts by `obtain()`-ing the destination, `convert_target_*(t, out)` in place, then recycling the source.
- `h_tracking`/`v_tracking` keep `target`/`target_3d` as single `const` objects converted in place; `timing` keeps persistent `target_store`/`target_3d_store` and points the nullable `target`/`target_3d` at them (null still means "hidden").
- `dispose()` releases: `reset_run_state()` `clear()`s the shared `shoots_pool`/`impacts_pool`/`impacts_3d_pool`; modes with target pools `clear()` them too. `aim_booster` (no `reset_run_state`) clears `target_pool` + `impacts_pool` itself and does NOT pool its module-local `shoots` (it truncates `shoots.array` for the rewind — nothing to recycle).
- `writing` flattens `Line` to `{ ex, ey, sx, sy, t }` (was nested `{e:{x,y}, s:{x,y}, t}` with `s` aliasing the prior `e`) to drop the per-stroke point allocation, but does NOT pool: `check_stats()` ships `lines.array` (raw backing) + `lines_start` to the worker (which skips the pre-head region), and the per-tick structured clone dwarfs the stroke-literal allocation anyway.

## Mode state landmarks

Rule: **`state.js` is for cross-cutting runtime state only. Each mode owns its own state (including persisted `best_score`) at module-level in `game_mode/<name>.js`.**

Each mode file:
- `const STORAGE_KEY = "<name>#best_score"` — module-private localStorage key. Key style `#` distinguishes module-private keys from state-tree keys (`.`-separated)
- `let best_score = Number(localStorage.getItem(STORAGE_KEY) || 0)` — hydrated at module load
- `<name>_score_el.textContent = String(best_score)` — initial display, runs at module load
- `function clear_best_score()` — zeros + `removeItem` + `set_text_if_changed(<name>_score_el, 0)` + mode-specific `send_toast(...)`. Included in the mode's default `GameMode` export and called directly by `controller/setting.js`
- `let peak_score` — per-run; reset in `dispose()`
- Targets — `aim_booster`: `const targets` (+ `target_pool`). `flick`/`twitch`: `const targets, targets_3d` (+ `target_pool_2d`/`target_pool_3d`). `h_tracking`/`v_tracking`: `const target, target_3d` (converted in place via the `out` arg, so no reassignment). `timing`: `let target, target_3d` (nullable; point at persistent `const target_store`/`target_3d_store` when visible, null = hidden). `Target = {x,y,r,cx,cy,cr}`, `Target3D = {y,p,r,cy,cp,cr}` (y=yaw, p=pitch)
- Lerp state (`h_tracking`, `v_tracking`): `const size_lerp`, `const speed_lerp`. `{active, from, to, start_ms}`; endpoints in current dim units — convert on `update_dimension`
- Move state (`h_tracking`, `v_tracking`): `const move`. `h_tracking` moves the horizontal axis (`target.x` / `target_3d.y` yaw) with a core that rotates toward movement; `v_tracking` moves ONLY the vertical axis (`target.y` / `target_3d.p` pitch, reversing at ±`pitch_limit`) with the core kept centered (`cx=x,cy=y` / `cp=p,cy=y`)
- Timers: `let next_change_*_ms`, `let next_impact_s`, `let next_hide_ms`, `let next_show_ms`, `let speed` (timing)
- `aim_booster` extras: `let count, end_ms, start_ms` + a MODULE-LOCAL `const shoots = create_queue()` (same `{c,e,h,s}` entry shape as `state.stats.shoots`, but private — `reset_run_state()` never touches it, so the rewind history survives runs of other modes). `end_ms`/`start_ms` (plus the truncated `shoots` queue) PERSIST across `dispose()` (dispose sets `end_ms`, leaves `start_ms` untouched) to drive the 10 s rewind on next `init()`; `count` is reset to 0 in `dispose()` and recomputed in `init()`. Session-scoped: page reload resets it
- `writing`: `const lines` (queue of flat `Line` `{ex,ey,sx,sy,t}`), `let has_pointer`/`pointer_x`/`pointer_y` (last stroke endpoint; `has_pointer=false` breaks the path), `let text_data` / `let text_image` (rebuilt each run by `init()`'s `build_text()` — shuffles `constants.mode.writing.sentences` in place and redraws into the reused module-scope `off` canvas; `dispose()` closes `text_image`)

`create_queue()` is exported from `state.js` for module-local queues (currently `aim_booster.shoots`, `writing.lines`).

## localStorage key conventions
- `<a>.<b>.<c>` (dot-separated) = `state.<a>.<b>.<c>` path. `state.js` owns read/write. Examples: `bg.type`, `crosshair.color`, `dpi_norm.dpi`, `game.lol_sens`
- `<module>#<field>` (`#`-separated) = module-private persisted field. Only that module reads/writes. Examples: `flick#best_score`, `twitch#best_score`. State.js does NOT know about these

## Footguns
- Forgetting `state.impact.rad_size = 0` in `dispose()` of a 3D-capable mode leaks impact radius into the next mode
- Forgetting to clear `impacts` vs `impacts_3d` per the disposed dimension leaves stale visuals
- `update_dimension()` running while a lerp is active and NOT converting its endpoints visibly snaps target size/speed
- `update_dimension()`'s old-dimension branch (`if (dimension == "2d") {...}`, captured BEFORE `update_camera_view()`) must bail out if `state.camera.dimension` is STILL `"2d"` after that call — every 2D/3D-capable mode's first branch starts with `if (state.camera.dimension == "2d") { return }` for exactly this reason. Without it, a redundant call that doesn't actually change dimension (idempotency is required — RMB down/up/`mousecancel` can all fire without a real transition) still runs the one-way 2D→3D conversion: it strands live targets in the inactive array/nulls the visible `target` (`timing`), and double-applies `px_to_rad`/`rad_to_px` to any active lerp/speed value each time it fires
- 3D `render()` calling `draw_*_3d` before `prepare_3d_view()` draws with the previous frame's matrices
- `check_stats()` modifies aggregates AND mutates `first.s` in place during partial-window clip; treat `shoots.at()` as a live reference, not a copy
- Module-local state is NOT auto-reset between runs. `dispose()` MUST reset every per-run `let`/queue/array (peak, lerp.active, targets.length=0, etc.). `aim_booster.end_ms`/`start_ms` (and the truncated `shoots` queue) are deliberate exceptions — they survive `dispose()` to drive the rewind feature (`count` is reset in `dispose()` and recomputed in `init()`)
- `shoot()` snapshot semantics: `twitch` and `timing` capture `next_hide_ms` into a local `shot_hide_ms` at the top of `shoot()` because the function both writes `next_hide_ms` AND reads it for the recorded `shoots` entry; reading the live value after the write would push the wrong end-timestamp into stats
- Adding a mode: don't forget to wire its clear button directly to `game_mode.<name>.clear_best_score` in `controller/setting.js`
- Pool correctness (see GC section): every `obtain()` must set ALL fields (stale field from a recycled object otherwise leaks); every removal (`drop`/`splice`/`length--`/`length=0`) must `recycle()` exactly once (double-recycle puts one object at two live slots → corruption); on a partial-window clip `check_stats()` keeps the entry live, so don't recycle there
