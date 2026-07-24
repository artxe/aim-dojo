# controller/

UI events + HUD. May read/write `state`, call `logic.js`, post worker msgs, update DOM. Game rules stay in `game_mode/`.

## Files
- `window.js` — keyboard/mouse/pointer-lock/resize/hash. Side-effect imports `dpi_norm`, `game_sens`, `menu` (boots them). Exports `on_resize()`
- `dom.js` — centralized DOM refs + helpers (`set_text_if_changed`, `send_toast`, …). Add new refs here first
- `hud.js` — dispatches `mode.update_hud()` plus timer/FOV display
- `menu.js` — mode buttons (the 7 game modes); passes the mode name to `start_game(mode)` (which sets `state.game.mode`). The settings button (`setting_btn`) is bound in `setting.js`, NOT here
- `setting.js` — bg/crosshair/copy/clear-score/hash sync; exports `init_bg()`, `on_click_modal_backdrop()`, `parse_color()`, `sync_setting_hash()`. BG widgets: two `name="bg-type"` radios (`video` | `youtube`, `radio_item_onchange` + hidden `#bg-type` + the index.html IIFE), `:checked`-based CSS swaps the youtube URL input (`#bg-link-wrap`) and the light-DOM `x-select#bg-video-select` (`#bg-video-select-wrap`). The selector owns direct `button`/`ul`/`li` markup; static rows use `data-value`, dynamic uploaded-video rows add `data-removable`, and upload is `data-action="upload"`. `XSelectElement` owns value/focus/keyboard/ARIA behavior and emits `selectaction`/`selectremove`; click-css styles the real nodes directly. **Commit-on-Save model (NO live preview)**: `bg_snapshot` + localStorage = committed; `state.bg` = currently-DISPLAYED. `BgSpec = {type, video_id, youtube_link}`. `staged_bg()` reads the widgets; `show_bg(spec)` applies playback + sets `state.bg` (no commit, with `bg_shown_video`/`bg_iframe_el.src` no-reload guards + `bg_apply_token`); `commit_bg(spec)` writes `bg_snapshot`+localStorage. **Selecting a radio/option changes NOTHING visible** (just stages widgets). **Activate** = `show_bg(staged_bg())` + `bg_el[activate]` — the ONLY way to preview, layered OVER the still-open settings (`index.html` z-index: settings `z=2` < `#modal-backdrop` `z=3` via `:has(#bg[activate])>#modal-backdrop/z=3` < `#bg[activate]` `z=4`). **Dismiss card** → `show_bg(bg_snapshot)` + return to settings. **Save** = `show_bg(staged) → commit_bg(staged)`; youtube also activates the card; Save does NOT close settings. **Close settings** → `reset_bg_widgets()`. **Boot** (`init_bg`): `set_bg_widgets` + `show_bg`; committed youtube auto-activates because autoplay is blocked. `set_bg_widgets` runs under `bg_suppress`. Upload persists to IDB without touching selection, then — only if radio+selector stayed unchanged during the await — `render_bg_options(id)` stages the new video. Delete = `selectremove`; deleting the committed video commits/shows `default`. `#bg[data-show=default|video|youtube]` controls child visibility and the iframe no-reload rules remain in `show_bg`/`commit_bg`. `bg_video_option()` creates the actual styled `<li>` including delete and long-name (`> 18`) marquee UI. The collapsed selector matches `#bg-link`'s `w=25ch`; uploads persist in IndexedDB (`bg_store.js`)
- `game_sens.js` — monitor res, active sens game, settings-file rewrite (PUBG `GameUserSettings.ini`, MC `options.txt`, R6 `GameSettings.ini`), 52 sens DOM values. R6 display AND file both come from `calc/calc_sens.js:calc_sens_r6_file()` (yaw/pitch fixed at 1 so the 6dp `MouseSensitivityMultiplierUnit` carries the whole hipfire sens; per-scope ADS ints (≤200 — the file accepts past the UI's 100) share a 6dp `ADSMouseMultiplierUnit` grid-scanned over `[max_ratio/200, max_ratio/100]` for min worst-scope error) — the card shows the exact INI values, PUBG-style
- `dpi_norm.js` — DPI normalizer inputs/result

## Non-obvious
- `contextmenu` is preventDefault'd globally so RMB is usable as game input
- `keydown`/`keyup` short-circuit when `is_keyboard_control(ev)` finds an input/button/select/textarea/contenteditable/`x-select` in `ev.composedPath()` — settings controls and custom selectors keep working while the screen-saver timer still resets
- Q/W/E/R/A keydown ALSO calls `mode.shoot()` immediately (besides setting `state.input.key_*`). Tracking-style modes additionally read these flags inside `on_frame()` to drive continuous movement+shots
- RMB has dual behavior: if `mode.update_dimension` exists, it fires on BOTH down AND up AND `mousecancel` — must be idempotent. Otherwise RMB acts as `shoot()`
- `mousecancel` is not a native browser event — `on_blur()` (bound to window `blur`, i.e. focus loss: alt-tab, OS dialog, devtools) dispatches it so `mb_left`/`mb_right` can't stay stuck true after the tab loses focus mid-press. `on_blur()` also directly zeroes all `state.input.key_*` flags (same stuck-flag risk, no event contract needed since nothing outside `window.js` listens for a key analog)
- Mouse move in-game reads cached `state.camera.sens` (rad/px) — populated by `logic.update_camera_view()` (fov change) and `render.resize_3d()` (width change). Changing `calc_rad_per_px` affects both sens displays and aim feel
- 2D mouse move clamps `y` to `±(PI/2/sens - EPS | 0)` (int px); 3D clamps `pitch` to `±(PI/2 - EPS)` rad
- Pointer lock loss in-game ⇒ `stop_game()`. Failure of `requestPointerLock`/`requestFullscreen` at game start DOES abort — `start_game()`'s catch resets `state.game.mode = null` without starting a frame loop (lock/fullscreen are required, not optional)
- Screensaver: 5 s after input idle (mouse OR keyboard — every input handler calls `reset_screen_saver_timer()`, single `constants.screen_saver.delay_ms`). Only outside a game (armed whenever `!state.game.mode` — an open modal does NOT block it). Timer id is `state.game.rest_timeout`; cleared on next input. `body[rest]` (CSS in `index.html`) drops the bg `brightness(.85)` filter AND hides all UI incl. `main` via `[rest]>:not(#bg-preview,#bg)/none`, leaving just the unfiltered 3-strip video; the WebGL tiling itself is unchanged
- Default BG pipeline: `render/renderer_bg.js` transfers `#bg-video-canvas` through `manager.js` to `bg_worker.js`; worker builds looping `MediaSource` from `bg.mp4` and sends a `MediaSourceHandle`; main thread plays it in a hidden video and posts one `VideoFrame` per `requestVideoFrameCallback()` tick through `post_bg_worker_message()`. Avoid `captureStream()` here; it can cap/drop frames.

## Game Sens Sync (52-tuple)
`worker/calc_worker.js:update_game_sens()` → `[fn, ...52 numbers]` → `manager.js` dispatches to `controller/game_sens.js`'s registered handler → handler casts as `Tuple<number, 52>` and spreads into `update_game_sens(...)`. Four places must stay in lock-step:
1. worker push order
2. controller handler tuple width
3. controller param signature + body
4. `dom.js` game-sens DOM refs

Parameter-order quirk: the message uses `{dpi_scale, height, pubg_fov, width}` but the calc worker fn signature is `(width, height, dpi_scale, pubg_fov)` — the dispatch in `calc_worker.js:onmessage` rewrites the order. Don't trust message-key order.

## When you change…
- Add a DOM element: `dom.js` ref → init from `state` in `main.js` (if state-backed) → bind in owning controller
- Add a mode button/score: `dom.js`, `menu.js`, `setting.js` clear-score, `main.js` initial best-score, mode localStorage key
- Add a sens display value: `dom.js` ref + `update_game_sens(...)` param + body + `calc_worker.update_game_sens()` push order + controller handler tuple width
- Input behavior: `window.js`; mode-specific shot logic still in `game_mode/*.js`
- BG/crosshair settings: `setting.js`; defaults from `state.js` / `constants.js`; default video transport lives in `render/renderer_bg.js` + `worker/bg_worker.js`. Uploaded-video library (add/select/delete) is `setting.js` + `bg_store.js` (IndexedDB); uploads render as a plain `<video loop>` (`renderer_bg.js:set_bg_upload_video`), bypassing the worker tiler entirely

## Controller-owned state
```
state.hud.next_update_ms      // gate for HUD refresh
state.input.key_a/e/q/r/space/w, mb_left, mb_right
state.game.rest_timeout       // setTimeout id for screensaver
```
