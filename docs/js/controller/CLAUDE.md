# controller/

UI events + HUD. May read/write `state`, call `logic.js`, post worker msgs, update DOM. Game rules stay in `game_mode/`.

## Files
- `window.js` — keyboard/mouse/pointer-lock/resize/hash. Side-effect imports `dpi_norm`, `game_sens`, `menu` (boots them). Exports `on_resize()`
- `dom.js` — centralized DOM refs + helpers (`set_text_if_changed`, `send_toast`, …). Add new refs here first
- `hud.js` — dispatches `mode.update_hud()` plus timer/FOV display
- `menu.js` — mode/settings buttons; sets `state.game.mode` then `start_game()`
- `setting.js` — bg/crosshair/copy/clear-score/hash sync; exports `init_bg()`, `on_click_modal_backdrop()`, `parse_color()`, `sync_setting_hash()`. BG widgets: two `name="bg-type"` radios (`video` | `youtube`, `radio_item_onchange` + hidden `#bg-type` + the index.html IIFE), `:checked`-based CSS swaps the youtube URL input (`#bg-link-wrap`) and the `selector_button` dropdown `#bg-video-options` (`#bg-video-select-wrap`). The dropdown lists `Default` (value `default`) + uploaded files + a `[data-upload]` li; clicks delegated on the `<ul>`, `select_bg_video_option` sets the button value via `setAttribute` (never the IIFE `.value` setter). **Commit-on-Save model (NO live preview)**: `bg_snapshot` + localStorage = committed; `state.bg` = currently-DISPLAYED. `BgSpec = {type, video_id, youtube_link}`. `staged_bg()` reads the widgets; `show_bg(spec)` applies playback + sets `state.bg` (no commit, with `bg_shown_video`/`bg_iframe_el.src` no-reload guards + `bg_apply_token`); `commit_bg(spec)` writes `bg_snapshot`+localStorage. **Selecting a radio/option changes NOTHING visible** (just stages widgets). **Activate** = `show_bg(staged_bg())` + `bg_el[activate]` — the ONLY way to preview, layered OVER the still-open settings (`index.html` z-index: settings `z=2` < `#modal-backdrop` `z=3` via `:has(#bg[activate])>#modal-backdrop/z=3` < `#bg[activate]` `z=4`), so youtube play/volume work without losing the modal. **Dismiss card** (`on_click_modal_backdrop`/ESC bg-activate branch) → `show_bg(bg_snapshot)` (back to committed) + return to settings. **Save** = `show_bg(staged) → commit_bg(staged)`; for youtube it also `bg_el[activate]`s + toasts; Save does NOT close settings. **Close settings** → `reset_bg_widgets()` (widgets back to committed). **Boot** (`init_bg`): `set_bg_widgets` + `show_bg` from `bg_snapshot`; if committed type is `youtube`, ALWAYS auto-`activate`s the card so the user can hit play (youtube autoplay is blocked; LOOP is auto via the `?loop=1&playlist=ID` embed param in `youtube_embed_src`). Whether the settings view ALSO opens is decided independently by `sync_setting_hash` from the URL hash — the card just layers over it. `set_bg_widgets` runs under `bg_suppress` so the programmatic `bg_type_input.value` set doesn't re-fire `on_change_bg_type`. Upload = throwaway `<input type=file>`; persists to IDB (`add_bg_video(id, file)`, caller id) WITHOUT touching the selection, then — only if radio+selector didn't change during the await — `render_bg_options(id)` stages the new video (still needs Save). Delete = per-li `[data-delete]` button (`mousedown` `preventDefault`'d so the focused `<ul>` doesn't blur-close); deleting the committed video `commit_bg`s `default` + `show_bg`s it. `#bg` child visibility is driven by `#bg[data-show=default|video|youtube]` (set by `show_bg`, NOT `src`-presence) so the youtube iframe can stay loaded-but-hidden — `show_bg` only clears the iframe `src` when youtube is neither shown nor committed, and `commit_bg` clears it when committing non-youtube; this stops Activate-another→cancel from reloading a committed youtube. Dropdown option elements are created in `bg_video_option` and styled by setting `className` with click-css tokens (click-css's `MutationObserver` processes dynamically-added elements — NEVER use `.style` for created elements; `.style` is only for changing one property on a pre-existing element like `crosshair_rgba_el`). Long names (`> 18` chars) marquee: the name text is doubled with a ` ` gap inside an `overflow:hidden` clip span, and the track span's class carries `animation=bg-marquee_<dur>s_linear_infinite` with `<dur>` ∝ name length (keyframes `bg-marquee` in index.html `<style>`). The collapsed `#bg-video-select` button matches `#bg-link`'s `w=25ch` and ellipsises. Uploads persist in IndexedDB (`bg_store.js`)
- `game_sens.js` — monitor res, active sens game, PUBG INI rewrite, 44 sens DOM values
- `dpi_norm.js` — DPI normalizer inputs/result

## Non-obvious
- `contextmenu` is preventDefault'd globally so RMB is usable as game input
- `keydown`/`keyup` short-circuit when `ev.target instanceof HTMLInputElement` — settings text boxes keep working
- Q/W/E/R/A keydown ALSO calls `mode.shoot()` immediately (besides setting `state.input.key_*`). Tracking-style modes additionally read these flags inside `on_frame()` to drive continuous movement+shots
- RMB has dual behavior: if `mode.update_dimension` exists, it fires on BOTH down AND up AND `mousecancel` — must be idempotent. Otherwise RMB acts as `shoot()`
- Mouse move in-game reads cached `state.camera.sens` (rad/px) — populated by `logic.update_camera_view()` (fov change) and `render.resize_3d()` (width change). Changing `calc_rad_per_px` affects both sens displays and aim feel
- 2D mouse move clamps `y` to `±(PI/2/sens - EPS | 0)` (int px); 3D clamps `pitch` to `±(PI/2 - EPS)` rad
- Pointer lock loss in-game ⇒ `stop_game()`. But failure of `requestPointerLock` at game start does NOT abort — game runs unlocked
- Screensaver: 5 s after input idle (mouse OR keyboard — every input handler calls `reset_screen_saver_timer()`, single `constants.screen_saver.delay_ms`). Only outside a game AND outside an open modal. Timer id is `state.game.rest_timeout`; cleared on next input. `body[rest]` (CSS in `index.html`) drops the bg `brightness(.85)` filter AND hides all UI incl. `main` via `[rest]>:not(#bg-preview,#bg)/none`, leaving just the unfiltered 3-strip video; the WebGL tiling itself is unchanged
- Default BG pipeline: `render/renderer_bg.js` transfers `#bg-video-canvas` through `manager.js` to `bg_worker.js`; worker builds looping `MediaSource` from `bg.mp4` and sends a `MediaSourceHandle`; main thread plays it in a hidden video and posts one `VideoFrame` per `requestVideoFrameCallback()` tick through `post_bg_worker_message()`. Avoid `captureStream()` here; it can cap/drop frames.

## Game Sens Sync (44-tuple)
`worker/calc_worker.js:update_game_sens()` → `[fn, ...44 numbers]` → `manager.js` dispatches to `controller/game_sens.js`'s registered handler → handler casts as `Tuple<number, 44>` and spreads into `update_game_sens(...)`. Four places must stay in lock-step:
1. worker push order
2. controller handler tuple width
3. controller param signature + body
4. `dom.js` game-sens DOM refs

Parameter-order quirk: the message uses `{height, dpi_scale, width}` but the calc worker fn signature is `(width, height, dpi_scale)` — the dispatch in `calc_worker.js:onmessage` rewrites the order. Don't trust message-key order.

## When you change…
- Add a DOM element: `dom.js` ref → init from `state` in `main.js` (if state-backed) → bind in owning controller
- Add a mode button/score: `dom.js`, `menu.js`, `setting.js` clear-score, `main.js` initial best-score, mode localStorage key
- Add a sens display value: `dom.js` ref + `update_game_sens(...)` param + body + `calc_worker.update_game_sens()` push order + controller handler tuple width
- Input behavior: `window.js`; mode-specific shot logic still in `game_mode/*.js`
- BG/crosshair settings: `setting.js`; defaults from `state.js` / `constants.js`; default video transport lives in `render/renderer_bg.js` + `worker/bg_worker.js`. Uploaded-video library (add/select/delete) is `setting.js` + `bg_store.js` (IndexedDB); uploads render as a plain `<video loop>` (`renderer_bg.js:set_bg_upload_video`), bypassing the worker tiler entirely

## Controller-owned state
```
state.hud.next_update_ms      // gate for HUD refresh
state.impact.px_size          // 2D constant; .rad_size is update_camera_view()'s job
state.input.key_a/e/q/r/space/w, mb_left, mb_right
state.game.rest_timeout       // setTimeout id for screensaver
```
