# game_mode/

Each mode default-exports a `/** @type {GameMode} */` object. `index.js` imports and re-exports all 7 modes by `GameModeName`.

## Mode Contract

```
init()              reset mode runtime state before first frame
on_frame()          update targets/stats inputs for one frame
render()            draw one frame
shoot()             process current input as a shot/action
update_hud()        update score DOM and set state.hud.next_update_ms
dispose()           clear mode state and set state.game.mode = null
check_stats?()      expire/recompute 30s stats before HUD update
update_dimension?() right-click dimension/FOV transition for 2D/3D modes
```

## 2D vs 3D

- Always 2D: `aim_booster`, `writing`; no `update_dimension()`
- 2D/3D capable: `flick`, `full_tracking`, `timing`, `tracking`, `twitch`
- `update_dimension()` calls `logic.update_fov()`, then converts active targets with `target_to_2d()` or `target_to_3d()`
- 3D `render()` functions set `state.camera.proj/view` with `mat4.perspective()` and `mat4.view()` before WebGL draw calls
- Effective dimension depends on `state.game.sens` and `state.input.mb_right`; `lol` can be 2D/FPS, `fn`/`mc`/`pubg` can be TPS/FPS

## Maintenance Map

- Add a mode: add `GameModeName`, `CONSTANTS.mode.*`, `state.mode.*`, mode file, `game_mode/index.js` export, menu/document refs, clear-score logic, and scoring HUD updates
- Add 3D support to a mode: add `targets_3d` or `target_3d`, `update_dimension()`, camera matrix setup in `render()`, and conversion on right-click
- Change scoring: update `update_hud()`, `check_stats()` expiration, localStorage best-score key, and clear-score handling in `controller/setting.js`
- Change target behavior: check both `shoot()` and `on_frame()`; tracking modes also update stats every frame

## Scoring

| mode | score formula |
|---|---|
| aim_booster | `count_hit * 100` with 10s rewind target-rate ramp |
| flick | `100 * (count_crit + count_hit) * count_hit / count_shoot` |
| full_tracking | `sum_crit_ms + sum_hit_ms` |
| timing | `(sum_crit_ms + sum_hit_ms) * count_hit / count_shoot` |
| tracking | `sum_crit_ms + sum_hit_ms` |
| twitch | `(sum_crit_ms + sum_hit_ms) * count_hit / count_shoot` |
| writing | `7 * count_hit * (count_hit / count_shoot) ** 4` |

## Stats Flow

- Shot-like modes push `{ c, e, h, s }` to `state.stats.shoots`; `e` is expiry/end time, `s` is start time, `h` is hit, `c` is crit
- `check_stats()` drops expired entries against `CONSTANTS.stats.window_ms`, then subtracts/recomputes affected aggregates
- Tracking modes accumulate per-frame `sum_shoot_ms`, `sum_hit_ms`, and `sum_crit_ms`
- `writing` delegates hit counting to `worker.check_writing_stats`

## Mode State Landmarks

- All modes have `best_score` from localStorage and per-run `peak_score`
- Target arrays: `aim_booster.targets`, `flick.targets/targets_3d`, `twitch.targets/targets_3d`
- Single targets: `tracking.target/target_3d`, `full_tracking.target/target_3d`, `timing.target/target_3d`
- Movement/lerp state lives only in `tracking` and `full_tracking`
- `writing` owns `lines`, `pointer`, `text_data`, and `text_image`
