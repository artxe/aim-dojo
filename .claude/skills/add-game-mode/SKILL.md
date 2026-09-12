---
name: add-game-mode
description: Checklist for adding, renaming or removing a training mode (the GameMode contract, scoring as a measurement, pooling, persisted record, menu/settings/tutorial wiring, modulepreload regeneration). Use whenever GameModeName changes.
---

# Add a game mode

Read `docs/js/game_mode/CLAUDE.md` first (mode contract, 2D/3D rules, stats flow, scoring, pooling, footguns) and root `CLAUDE.md:GC avoidance`.

1. **`private.d.ts`** — add the key to `GameModeName`. `game_mode/index.js`'s `Record<GameModeName, GameMode>` now fails tsc until the module exists.
2. **`constants.js:mode.<name>`** — tuning numbers only (no strings; the tour explains the mode). If difficulty adapts, reuse `struct/staircase.js` and its shared `constants.staircase` band.
3. **`docs/js/game_mode/<name>.js`** — default-exports `/** @type {GameMode} */`. Shape: imports, then module-level declarations (UPPER consts, then per-file role groups), then `function`s, then `export default`, then the bare `{ … }` init block LAST.
   - Own `const STORAGE_KEY = "<name>#runs"`, `const record = create_record(localStorage.getItem(STORAGE_KEY) || "")`, `let run_count`/`run_sum`, a module-load `set_mode_score(<name>_score_el, clear_<name>_btn, record.value)`, and `clear_score()` (`record.clear()` + `removeItem` + `set_mode_score(…, 0)` + a bilingual `send_toast`). An adaptive mode adds `LEVEL_KEY = "<name>#level"` + `level_dirty`.
   - `init()`: `set_hud_labels(score_unit, accuracy_label, third_label)`, `reset_run_state()`, then `update_camera_view()` FIRST (it populates `state.camera.sens`/`fov`/`impact.rad_size`), then force `state.camera.dimension = "2d"` if the mode is 2D-only, then build the first target(s).
   - `on_frame()` / `render()` / `shoot()` / `update_hud()` / `check_stats()` / `dispose()` per the contract; `update_dimension()` only for a 2D/3D-capable mode (its PRESENCE is also what makes `on_mousemove` clamp the 2D `y` to the ±90° pitch range, so a fixed-2D mode must not define one — `game_mode/CLAUDE.md`), opening with `if (state.camera.dimension == "2d") { return }` after `update_camera_view()` and converting camera, targets and any in-flight lerp endpoints.
   - **Score is a MEASUREMENT with a unit**, never points. Serial pointing: `struct/fitts.js:create_fitts()` (`trial()`/`click()` per shot, `expire()` in `check_stats()`, `throughput()` in `update_hud()`, `reset()` on a dimension flip, `clear()` in `dispose()`). A rate: divide by `min(now_ms - start_ms, window_ms) / 1000`, never a hardcoded 30. `update_hud()` folds the live score into `run_sum`/`run_count` only when non-zero; `dispose()` banks `run_sum / run_count` into `record` and persists `String(record.value)`.
   - **No per-frame allocation between `init()` and `dispose()`**: `shoots_pool.obtain()` + fill EVERY field (`c`/`d`/`e`/`h`/`s`) + push; targets from a `create_pool`; `recycle()` at every drop site exactly once; `dispose()` clears pools, resets every per-run `let`, zeroes `state.impact.rad_size`, clears the disposed dimension's impacts, calls `reset_hud_labels()` and `reset_run_state()`, and sets `state.game.mode = null`. Strings drawn every frame are built at HUD cadence and cached (see `aim_booster.js:spawn_text`).
4. **`game_mode/index.js`** — import + getter (imports are static, so the module-load `set_mode_score` runs at boot).
5. **`controller/dom.js`** — `<name>_btn`, `<name>_score_el`, `clear_<name>_btn` refs (alphabetical).
6. **`docs/index.html`** — the menu `button#<name>` with its `span#<name>-score`, and `button#clear-<name>` in `#setting-clear-score`.
7. **`controller/menu.js`** — the `else if (ev.currentTarget == <name>_btn)` branch + listener.
8. **`controller/setting.js`** — `clear_<name>_btn.addEventListener("click", game_mode.<name>.clear_score)` in the init block.
9. **`controller/tutorial.js`** — one step beside the other mode steps: `keys: mode_keys("<name>", FIRE_TAP | FIRE_HOLD)` and a bilingual `text` explaining the drill, what the score measures and its unit. Mention the new unit in the `hud_score_el` step if it is new.
10. **`node scripts/update_html_preload.js`** — a new module on the boot graph needs the regenerated `<link rel="modulepreload">` block (stale = silently slower boot, not an error).
11. **Notes** — `game_mode/CLAUDE.md` (scoring table, mode state landmarks) and the mode list in root `CLAUDE.md` if it enumerates modes.

## Verify
- `pnpm run lint` clean.
- Start the mode: pointer lock + fullscreen granted, HUD labels are the mode's, `error` line reads the game's snap, Escape banks a run and the menu shows the record; Clear Score resets it and disables its button.
- RMB (and `mousecancel` via alt-tab) is idempotent in a 2D/3D mode; a resize mid-run keeps target sizes.
- A run of a few seconds still banks a sample (no full-window gate).
