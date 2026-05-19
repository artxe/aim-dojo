# controller/

UI event handlers and HUD. Controllers may read/write `state`, call `logic.js`, post worker messages, and update DOM. Game rules stay in `game_mode/`.

## Files

- `index.js` - side-effect imports `dpi_norm`, `game_sens`, `menu`; exports `active_game_sens`, `change_bg_video`, `on_resize()`, `send_toast()`, `set_text_if_changed()`
- `menu.js` - mode/settings button clicks; starts games by setting `state.game.mode` then calling `start_game()`
- `screen.js` - keyboard/mouse/pointer-lock/resize events, screensaver timer, HUD timer; exports `update_hud()`
- `setting.js` - background, crosshair, copy helpers, clear scores; exports `change_bg_video()`, `on_change_bg_type()`, `on_click_modal_backdrop()`
- `game_sens.js` - monitor resolution, active sensitivity game, PUBG INI rewrite, 44 sensitivity DOM values
- `dpi_norm.js` - DPI normalizer inputs and result

## Maintenance Map

- Add a DOM element: add ref in `document.js`, initialize in `main.js` if state-backed, then bind in the owning controller
- Add a game mode button/score: update `document.js`, `menu.js`, `setting.js` clear-score logic, `main.js` initial score, and mode localStorage key
- Add a sensitivity display: update `document.js`, `game_sens.js:update_game_sens(...)`, and `worker.update_game_sens()` tuple order
- Change pointer/input behavior: start in `screen.js`; mode-specific shot behavior still lives in `game_mode/*.js`
- Change background/crosshair settings: start in `setting.js`; persistent defaults come from `state.js` and `constants.js`

## Event Flow

- `on_resize()` calls `resize_2d()` then `resize_3d()`; it does not call `update_fov()`
- Q/W/E/R/A keydown sets `state.input.key_* = true` and calls `mode.shoot()` when in-game
- Q/W/E/R/A keyup clears the matching key flag
- Space hold sets `state.input.key_space`; `logic.on_frame()` throttles through `CONSTANTS.frame_limit.space_hold_interval_ms`
- Left mouse down sets `mb_left` and calls `mode.shoot()`
- Right mouse down sets `mb_right`; calls `mode.update_dimension()` if present, otherwise `mode.shoot()`
- Right release or `mousecancel` clears mouse flags and calls `mode.update_dimension()` when present
- Mouse move in 2D updates `camera.x/y`; in 3D updates `camera.yaw/pitch`; both use `calc_rad_per_px(camera.fov, camera.width)`
- Pointer lock loss while in-game calls `stop_game()`
- Outside a game, idle mouse/key sets `<body rest>` after 5s/10s unless settings or background activation is open

## Settings Behavior

- `change_bg_video()` supports `default`, SOOP live/VOD URLs, arbitrary `webview`, `youtu.be`, and `www.youtube.com/watch?v=...`
- Crosshair inputs write `state.crosshair.*`, persist to localStorage, then call `update_crosshair()`
- Reset crosshair copies defaults from `CONSTANTS.crosshair`
- Copy buttons use `navigator.clipboard.writeText()` and `send_toast()`
- Clear-score buttons remove `{mode}.best_score` from localStorage and reset state plus menu DOM

## Game Sens Sync

`worker/worker.js:update_game_sens()` returns 44 numbers. Keep this tuple order synchronized with:

- `worker/index.js` `Tuple<number, 44>` cast
- `controller/game_sens.js:update_game_sens(...)` parameter order
- `document.js` game-sens DOM refs

## Controller-Owned State

```
state.hud.next_update_ms
state.impact.px_size / .rad_size
state.input.key_a/key_e/key_q/key_r/key_space/key_w
state.input.mb_left/mb_right
state.game.rest_timeout
```

## DOM Ref Source

All DOM IDs are centralized in `document.js`. Add refs there first, then import them into the controller that owns the behavior.
