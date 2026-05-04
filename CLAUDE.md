# CLAUDE.md

## Conventions

- All reads use destructuring: `const { x } = state.foo`
- All writes use full path: `state.foo.x = value`
- No comments of any kind (except JSDoc `@type`)
- Within each contextual group, all elements where order does not affect behavior are alphabetical: imports, destructuring, object properties, if-else chains, function definitions, sequential statements, etc.

## Architecture

Vanilla JS SPA, no framework or bundler. `docs/` = deployed as-is. `docs/lib/` = third-party (excluded from lint/tsc).

TypeScript: `checkJs: true`, `.js` files only. Global types (`Target`, `Target3D`, `GameMode`, etc.) are in `private.d.ts`.

**State:** `docs/js/state.js` (mutable) / `docs/js/constants.js` (immutable `const`)

**Rendering:**
- 2D (`dimension == "2d"`): LoL sensitivity, `state.camera.x/y` (px), `docs/js/renderer.js`
- 3D (`dimension == "3d"`): other games, `state.camera.yaw/pitch` (rad), `docs/js/renderer3d.js` → `render_to_2d()`

`camera_to_2d/3d()`, `px_to_rad/rad_to_px` — `docs/js/camera.js`

**Targets:**
- `Target`: `{ cr, cx, cy, r, x, y }` — body center(x/y), core center(cx/cy), radii(r/cr)
- `Target3D`: `{ cp, cr, cy, p, r, y }` — body yaw/pitch(y/p), core yaw/pitch(cy/cp), radii(r/cr)
- `calc_core_radius(r, base_radius)` → cr

**Game Modes** (`docs/js/game_mode/`): `/** @type {GameMode} */` default export

```
check_stats()   — update 30s sliding window
dispose()       — reset state on game end
init()          — initialize on game start
on_frame()      — move/spawn/despawn targets
render()        — render every frame
shoot()         — click/key hit detection
update_fov?()   — convert targets on 2D↔3D switch (optional)
update_hud()    — update score display
```

stats: push `{ c, e, h, s }` to `state.stats.shoots` → `check_stats()` removes expired entries from the front.

**Worker** (`docs/js/worker.js`): `check_writing_stats`, `update_game_sens` — postMessage via `docs/js/worker_manager.js`.

**Controller** (`docs/js/controller/`): `screen.js`, `menu.js`, `setting.js`, `game_sens.js`, `dpi_norm.js`, `index.js` (shared utils: `send_toast`, `set_text_if_changed`, `on_resize`)
