# game_mode/

Each mode default-exports `/** @type {GameMode} */`. `index.js` maps `GameModeName` → that default through 8 getters. Imports are STATIC, so every mode's module-load side effect (its `set_best_score()` write) runs at boot regardless — the getters shape the record, they do not defer loading.

## Mode contract
```
init()              reset state; call update_camera_view() FIRST, then build initial target(s) per dimension
on_frame()          read input/timer; advance targets/lerps; tracking modes call shoot() here
render()            2D context_2d, or prepare_3d_view() → draw_*_3d on #canvas-3d → draw_crosshair() on the 2D canvas
shoot()             evaluate hit/crit; play SFX; push to impacts/impacts_3d; push to state.stats.shoots
update_hud()        write peak/best/accuracy to DOM; set state.hud.next_update_ms = now + constants.hud.update_interval_ms
dispose()           clear state; state.game.mode = null; reset state.impact.rad_size; clear per-dim impacts
check_stats?()      drop expired shoots + decrement aggregates (only when HUD is due, not every frame)
update_dimension?() RMB down/up + mousecancel — must be idempotent
```

## 2D vs 3D
| modes | dimension |
|---|---|
| `aim_booster`, `writing` | always 2D, no `update_dimension` |
| `flick_180` | always 3D fpp; `update_dimension()` re-forces it, so RMB is ADS (fov only), never a shot |
| `flick`, `h_tracking`, `timing`, `twitch`, `v_tracking` | 2D/3D capable |

- The fixed-dimension modes STILL call `update_camera_view()` first in `init()`, then override — it is what populates `state.camera.sens`/`fov`. With `sens` still 0 (fresh load, no other mode run yet), `on_mousemove`'s 2D `y_limit = PI/2/sens - EPS | 0` is `Infinity | 0` = 0 and vertical mouse locks. That call also sets `state.impact.rad_size`, so their `dispose()` resets it like the 3D-capable modes
- `flick_180` additionally forces `state.camera.dist = 0` (so a tpp game — PUBG-80/`bdo`/`fn`/`mc` — renders fpp, not orbit) AND re-derives `state.impact.rad_size = px_to_rad(constants.impact.px_size)`, because zeroing `dist` after `update_camera_view` already computed `rad_size` leaves it stale (`sens` is dist-independent, so it stays correct). Those three lines ARE its `update_dimension()`, and `init()` is just `reset_run_state()` + `update_dimension()` — the override is re-applied in the same call RMB triggers, so `dimension`/`dist` can never leak back to the game's native value
- `aim_booster`/`writing` never call `update_camera_view` again mid-run and force only `dimension = "2d"` — they leave a tpp game's `dist` in place, harmless because nothing in a 2D frame reads `px_to_rad`
- A mid-run resize is safe for every shape because `on_resize()` uses `update_camera_projection()`, which re-derives `vfov`/`fov`/`sens`/`rad_size` for the new aspect off the stored `fov_axis`/`view_fov` plus the CURRENT (overridden) `dist`, and never rewrites `dimension`/`dist`. **That split exists FOR these overrides — do not "simplify" `on_resize()` back to `update_camera_view()`**
- Effective dimension = whatever `logic.update_camera_view()` returns for `state.game.sens` + `state.input.ads_stage` (NOT `mb_right` — `controller/CLAUDE.md`). `lol` toggles 2D↔fpp, `bdo`/`mc` toggle tpp↔fpp, `fn` stays tpp for BOTH `ADS` views and only `Scoped` goes fpp (the orbit pulls in, `tpp.fn` 3 → `tpp.fn_ads` 1), `pubg` uses tpp-80 or fpp-103 hipfire with fpp ADS, `al`/`cs2`/`ow`/`r6`/`rb`/`val` stay fpp and only change `fov`, `sa` cycles hipfire→TRG x5→TRG x15 (3 stages, the only game reaching `ads_stage == 2`)
- `update_dimension()` body order: `update_camera_view()` → convert camera if `x`/`y` or `pitch`/`yaw` is non-zero → convert active target(s) → convert ANY in-flight lerp endpoints (`size_lerp.from/to` in `h_tracking`/`v_tracking` are stored in current-dim units)

## Stats flow (shared `state.stats`)
- `shoots` entries are `{ s, e, h, c }` — start/end stamps of the scored interval, hit, crit. Instant-shot modes (`aim_booster`/`flick`/`flick_180`/`h_tracking`/`v_tracking`) use `s = prev_ms`, `e = now_ms`. `twitch`/`timing` instead record the target's remaining visible window (`s = now_ms`, `e = shot_hide_ms`), so `e - s` rewards shooting earlier
- `shoot()` pushes one entry and bumps aggregates: all modes increment `count_*`; ms-scored modes also add `e - s` (`twitch`/`timing` → `sum_hit_ms`/`sum_crit_ms`; `h_tracking`/`v_tracking` → `sum_shoot_ms`/`sum_hit_ms`/`sum_crit_ms`). `aim_booster`/`flick`/`flick_180` are count-only
- Tracking modes call `shoot()` every frame an input key is held → many tiny windowed entries
- `check_stats()` drops entries with `e < now - 30 s` (decrementing aggregates) and clips entries straddling the window edge: `first.s = window_ms` plus a partial `sum_*_ms -= window_ms - s`
- `aim_booster` alone pushes to its MODULE-LOCAL `shoots` queue, not `state.stats.shoots`, so the rewind history survives other modes' `reset_run_state()`
- `writing` does not use `shoots` at all: `init()`'s `build_text()` posts `text_data` + dims ONCE per run via `set_writing_text` with the buffer TRANSFERRED (main thread must not reuse it). `check_stats()` then sends only `lines.array` + `lines_start` (= `array.length - length`) to `writing_worker.check_writing_stats`, which rasterizes the strokes to an OffscreenCanvas, compares alpha against the cached `text_data`, and returns `[count_hit, count_shoot]` for `writing`'s handler to write into `state.stats`

## Scoring
| mode | formula | notes |
|---|---|---|
| aim_booster | `count_hit * 100` | spawn rate ramps; 10 s rewind |
| flick | `100 * (count_crit + count_hit) * count_hit / count_shoot` | accuracy-weighted |
| flick_180 | same as `flick` | see below |
| h_tracking | `sum_crit_ms + sum_hit_ms` | horizontal only; core rotates toward movement |
| timing | `(sum_crit_ms + sum_hit_ms) * count_hit / count_shoot` | accuracy-weighted ms |
| twitch | same as `timing` | |
| v_tracking | `sum_crit_ms + sum_hit_ms` | vertical only (pitch ±`pitch_limit`); core centered |
| writing | `7 * count_hit * (count_hit / count_shoot) ** 4` | accuracy⁴-weighted |

`update_hud()` persists new bests under the mode's local `STORAGE_KEY`. Score display + clear-button enablement ALWAYS go through `dom.js:set_best_score(<name>_score_el, clear_<name>_btn, score)` — the three call sites are module load, `clear_best_score()` (0), and `update_hud()`'s new-best branch. Writing `textContent`/`set_text_if_changed` directly would strand the Clear button enabled.

### flick_180 spawn + travel
3D-only, one target, `place_target(y, p, radius_mul)` where **(y, p) is the CORE** and the body center is derived (`p = p - r + cr`) — the core is the aim point, so every spawn direction is core-relative. Spawns ALTERNATE via `spawn_opposite`: random, opposite, random, opposite…
- **random** — `target.cy + random_spread()` in yaw (current core ±`spawn_range`) and a bare `random_spread()` in pitch (ABSOLUTE, around the horizon, so pitch cannot random-walk out of reach across turns), sized `random_radius_mul`, landing instantly (`place_target` right inside `shoot()`, `has_target` never drops)
- **opposite** — the exact antipode of the shooting facing (`yaw + PI`, `-pitch`), core-to-core, so a perfect 180° turn puts the crosshair back on the core. Parameterizing by body center instead misses by `r - cr`, which at `opposite_radius_mul` is big enough to not feel opposite. Sized `opposite_radius_mul` (far bigger — found blind after the turn, while the random one spawns on screen)
- The opposite spawn ALONE runs the transition: `shoot()` snapshots the departing body/radius into `travel_from_*`, `place_target`s the destination immediately, and gates it with `has_target = false`; a sphere then flies through the camera for `travel_duration_ms`, swapping `travel_from_*` → `target.p`/`target.y`/`travel_to_radius` at the midpoint where `dist` is 0 and the swap is invisible (without the radius swap it would leave at one `radius_mul` and pop to the other on arrival). Travel end only flips the two flags — nothing is placed there

## Per-mode pooling (see root `CLAUDE.md:GC avoidance`)
- `shoot()` — and the `on_frame` miss pushes in `twitch` (per-target loop) and `timing` (single miss) — does `shoots_pool.obtain()` → assign EVERY field (`c`/`e`/`h`/`s`) → `push`. Never push a literal; always set `c` even on a miss (`c = false`), or a recycled object's stale crit flag leaks
- `check_stats()` recycles on the full-expire branch only, AFTER `shoots.drop()`. The partial-window clip (`first.s = window_ms; break`) keeps the entry live — do NOT recycle there
- Targets: `flick`/`twitch` keep `target_pool_2d`/`target_pool_3d`, `aim_booster` keeps `target_pool`. Spawn `obtain()`s + fills; removal `recycle()`s the removed object (manual shift instead of `splice`/`length--`); a bulk `length = 0` recycles every entry first. `update_dimension()` `obtain()`s the destination, runs `convert_target_*(t, out)`, then recycles the source
- `h_tracking`/`v_tracking` keep `target`/`target_3d` as single `const`s converted in place; `flick_180` keeps one `const target` refilled on spawn (no pool); `timing` keeps persistent `target_store`/`target_3d_store` and points nullable `target`/`target_3d` at them (null = hidden)
- `dispose()` releases: `reset_run_state()` clears the shared `shoots_pool`/`impacts_pool`/`impacts_3d_pool`; modes with target pools clear theirs too. `aim_booster` has no `reset_run_state()` — it clears `target_pool` + `impacts_pool` itself and does NOT pool its module-local `shoots` (the rewind truncates `shoots.array`, so there is nothing to recycle)
- `writing` flattens `Line` to `{ ex, ey, sx, sy, t }` (was nested `{e:{x,y}, s:{x,y}, t}` with `s` aliasing the prior `e`) to drop the per-stroke point allocation, but stays unpooled — `check_stats()` ships `lines.array` raw, and the per-tick structured clone dwarfs the stroke literal

## Mode state landmarks
**`state.js` is for cross-cutting runtime state only. Each mode owns its own state — including persisted `best_score` — at module level.**

Every mode file has: `const STORAGE_KEY = "<name>#best_score"` · `let best_score = Number(localStorage.getItem(STORAGE_KEY) || 0)` · a module-load `set_best_score(...)` · `function clear_best_score()` (zero + `removeItem` + `set_best_score(..., 0)` + a mode-specific `send_toast`), included in the default export and called directly by `controller/setting.js` · `let peak_score`, reset in `dispose()`.

- Targets — `aim_booster`: `const targets` + `target_pool`. `flick`/`twitch`: `const targets, targets_3d` + both pools. `flick_180`: one `const target` (Target3D, no pool, no 2D counterpart) filled in place, gated by `let has_target`, plus module-local primitive travel state (`travel_from_*` = the departing body, `travel_*` = the live sphere). `h_tracking`/`v_tracking`: `const target, target_3d`, converted in place via the `out` arg. `timing`: `let target, target_3d` (nullable) pointing at persistent stores. `Target = {x,y,r,cx,cy,cr}`, `Target3D = {y,p,r,cy,cp,cr}` (y = yaw, p = pitch)
- Lerps (`h_tracking`, `v_tracking`): `const size_lerp`, `const speed_lerp` — `{active, from, to, start_ms}`, endpoints in current-dim units
- Move (`h_tracking`, `v_tracking`): `const move`. `h_tracking` moves the horizontal axis (`target.x` / `target_3d.y` yaw) with a core rotating toward movement; `v_tracking` moves only the vertical axis (`target.y` / `target_3d.p` pitch, reversing at ±`pitch_limit`) with the core kept centered
- Timers: `let next_change_*_ms`, `next_impact_ms`, `next_hide_ms`, `next_show_ms`, `speed` (timing)
- `aim_booster` extras: `let count, end_ms, start_ms` + a module-local `const shoots = create_queue()` (same `{c,e,h,s}` shape, private). `end_ms`/`start_ms` and the truncated `shoots` PERSIST across `dispose()` (dispose sets `end_ms`, leaves `start_ms`) to drive the 10 s rewind on the next `init()`; `count` is reset in `dispose()` and recomputed in `init()`. Session-scoped — a page reload resets it
- `writing`: `const lines` (queue of flat `Line`), `let has_pointer`/`pointer_x`/`pointer_y` (last stroke endpoint; `has_pointer = false` breaks the path), `let text_data`/`text_image` (rebuilt each run by `build_text()`, which shuffles `constants.mode.writing.sentences` in place and redraws into the reused module-scope `off` canvas; `dispose()` closes `text_image`)

`create_queue()` is exported from `state.js` for module-local queues (`aim_booster.shoots`, `writing.lines`).

## localStorage key conventions
- `<a>.<b>.<c>` (dots) = the `state.<a>.<b>.<c>` path; `state.js` owns read/write. E.g. `bg.type`, `crosshair.color`, `game.lol_sens`
- `<module>#<field>` (hash) = module-private persisted field; only that module touches it. E.g. `flick#best_score`. `state.js` does not know about these

## Footguns
- `update_dimension()`'s old-dimension branch is captured BEFORE `update_camera_view()`, so it must bail if `state.camera.dimension` is STILL `"2d"` after that call — every 2D/3D-capable mode starts with `if (state.camera.dimension == "2d") { return }`. `flick_180` is exempt: it converts nothing, only re-forces fpp. Idempotency is required (RMB down/up/`mousecancel` can all fire with no real transition); without the guard a redundant call still runs the one-way 2D→3D conversion, stranding live targets in the inactive array (or nulling `timing`'s visible target) and double-applying `px_to_rad`/`rad_to_px` to any active lerp
- Forgetting `state.impact.rad_size = 0` in a 3D-capable `dispose()` leaks the impact radius into the next mode
- Forgetting to clear `impacts` vs `impacts_3d` per the disposed dimension leaves stale visuals
- `update_dimension()` while a lerp is active and NOT converting its endpoints visibly snaps target size/speed
- 3D `render()` calling `draw_*_3d` before `prepare_3d_view()` draws with the previous frame's matrices
- `check_stats()` mutates `first.s` in place during the partial clip — treat `shoots.at()` as a live reference, not a copy
- Module-local state is NOT auto-reset between runs. `dispose()` MUST reset every per-run `let`/queue/array. `aim_booster.end_ms`/`start_ms` + its truncated `shoots` are the deliberate exceptions
- `shoot()` snapshot semantics: `twitch`/`timing` capture `next_hide_ms` into a local `shot_hide_ms` at the TOP of `shoot()`, because the function both writes it and reads it for the recorded entry — reading the live value after the write pushes the wrong end stamp
- Pool correctness: every `obtain()` must set ALL fields; every removal must `recycle()` exactly once (double-recycle puts one object at two live slots)
- Adding a mode: wire its clear button directly to `game_mode.<name>.clear_best_score` in `controller/setting.js`
