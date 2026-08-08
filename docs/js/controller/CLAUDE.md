# controller/

UI events + HUD. May read/write `state`, call `logic.js`, post worker messages, update DOM. Game rules stay in `game_mode/`.

## Files
- `window.js` — keyboard/mouse/pointer-lock/resize/hash. Side-effect imports `dpi_norm`, `game_sens`, `menu` (boots them). Exports `on_resize()`
- `dom.js` — centralized DOM refs (~150) + `send_toast`, `set_attr_if_changed`, `set_best_score`, `set_text_if_changed`. Add new refs here first. `set_best_score(score_el, clear_btn, score)` is the SINGLE writer of a mode's best-score display — it also sets `clear_btn.disabled = !score`, so a 0-score mode's Clear button is dead
- `hud.js` — `update_hud(mode)` takes the ALREADY-resolved `GameMode` from `logic.on_frame()`, so it never imports `game_mode/index.js`. Calls `mode.update_hud()`, then writes the EMA fps (`fps * .9 + frame_fps * .1`) + elapsed timer and the `2D` / `<dimension> <fov>°` readout. `set_controls(name, mode)` fills the in-game controls panel ONCE per run from `logic.start_game()` — the guide line is `constants.mode[name].guide`, the RMB row is derived (`mode.update_dimension ? "ADS" : "Shoot"`), never a per-mode string
- `menu.js` — the 8 mode buttons; passes the mode name to `start_game(mode)`. The settings button is bound in `setting.js`, NOT here
- `setting.js` — bg/crosshair/audio/copy/clear-score/hash sync; exports `init_bg()`, `on_click_modal_backdrop()`, `parse_color()`, `sync_setting_hash()`
- `game_sens.js` — monitor resolution, active sens game, settings-file rewrite, the 54 sens DOM values
- `dpi_norm.js` — DPI normalizer inputs/result

## Background settings (setting.js)
**Commit-on-Save, NO live preview.** `bg_snapshot` + localStorage = committed; `state.bg` = currently DISPLAYED. `BgSpec = {type, video_id, youtube_link}`.
- `staged_bg()` reads the widgets · `show_bg(spec)` applies playback + sets `state.bg` (no commit; `bg_shown_video` / `bg_iframe_el.src` no-reload guards + `bg_apply_token` for out-of-order awaits) · `commit_bg(spec)` writes `bg_snapshot` + localStorage
- Selecting a radio/option changes NOTHING visible — it only stages. **Activate** = `show_bg(staged_bg())` + `bg_el[activate]`, the only way to preview, layered OVER the still-open settings (`index.html` z-order: settings `z=2` < `#modal-backdrop` `z=3` < `#bg[activate]` `z=4`). **Dismiss** → `show_bg(bg_snapshot)`. **Save** = `show_bg(staged)` → `commit_bg(staged)`, youtube also activates the card; Save does NOT close settings. **Close settings** → `reset_bg_widgets()`
- Boot (`init_bg`): `set_bg_widgets` + `show_bg` under `bg_suppress`; a committed youtube auto-activates because autoplay is blocked
- Widgets: two `name="bg-type"` radios (`video` | `youtube`) + hidden `#bg-type`; `:checked` CSS swaps `#bg-link-wrap` against `#bg-video-select-wrap`. The `video` radio covers BOTH `default` and uploaded — the `x-select#bg-video-select` decides which. Static rows use `data-value`, uploaded rows add `data-removable`, upload is `data-action="upload"`; `bg_video_option()` builds the `<li>` incl. delete + long-name (`> 18`) marquee. Collapsed width matches `#bg-link`'s `w=25ch`
- Upload persists to IndexedDB first, then re-stages via `render_bg_options(id)` ONLY if radio + selector stayed unchanged during the await. Delete = `selectremove`; deleting the committed video commits + shows `default`
- `#bg[data-show=default|video|youtube]` picks which child shows (`show_bg` sets it). `show_bg` keeps the youtube iframe `src` loaded while youtube is still committed so Activate-another → cancel doesn't reload it; `commit_bg` clears the `src` when committing a non-youtube type

## Other settings (setting.js)
- Crosshair: every handler ends in `update_crosshair_widgets()` — NOT `update_crosshair()` directly — which disables `reset_crosshair_btn` when all six `state.crosshair` fields equal `constants.crosshair`, then redraws. The init block calls it once for the boot state
- `bg.blur` toggles `body[bg-blur]`, which adds `blur(2px) brightness(.7)` to the BG layers while `[locked]` (in-game)
- `audio.bgm_volume` / `audio.sfx_volume` are 0–100 sliders (a mobile duplicate exists for BGM), scaled by `constants.audio.bgm_max_gain`/`sfx_max_gain`

## game_sens.js specifics
- Recommend DPI lives HERE, not in `dpi_norm.js`: `#dpi-x` is an input bound in this file's init block, `#dpi-y` stays a derived span. **DPI is an INTEGER everywhere** — `state.dpi_norm.x` stores exactly the whole number typed (`round`ed, never rescaled), the input carries no `decimals` attr so arrows step 1, and `y` is `round(x * constants.dpi.psi)` (supergolden ratio, Newton-solved in `constants.js`), never user-set
- `state.dpi_norm.x = 0` (nothing stored) means AUTO: `current_dpi()` falls back to `round(constants.dpi.x * width / 1_920)`, the only place resolution still scales the recommendation — a user-set DPI is a physical mouse setting and must NOT move when `game.resolution` changes. Clearing the field + Enter re-enters auto. `current_dpi().x` also feeds every eDPI cell, so the handler re-posts `post_update_game_sens()`
- R6: display AND file both come from `calc/calc_sens.js:calc_sens_r6_file()`, so the card shows the exact INI values, PUBG-style
- MC card shows `<in-game %>%, <options.txt value>` — the percent is 2 dp (`round_to(file * 200, 2)`), deliberately NOT the integer MC would label. MC's in-game slider is unusable as an input path, so matching its label is pointless:
  - the label is `(int)(mouseSensitivity * 200)` — a FLOOR, hence many-to-one. `100%` means `mouseSensitivity ∈ [0.5, 0.505)`, not `0.5`, so an in-game percent NEVER identifies a file value
  - the slider writes `(mouseX - (x + 4)) / (width - 8)` with `width = 150`, so dragging quantizes to the **1/142 grid** (finer and offset at GUI scale > 1). Real-world `options.txt` values in the wild are exactly `49/142`, `57/142`, `36/142`. Step = `200/142 ≈ 1.408 %`, so 58 of the 199 integer percents (3, 6, 10, 13, 17, 20, …) are unreachable by slider at all
  - `0.0`/`1.0` are special-cased to `*yawn*`/`HYPERSPEED!!!`, so `0%`/`200%` are never shown

  Consequence: the drag-drop rewrite is the ONLY exact path, and touching the in-game slider afterwards destroys the written precision. The percent is a rough sanity read; `mc_hipfire_file` is the deliverable. What is non-linear is the FEEL — `calc_sens_mc` inverts the cubic `(.2 + .6 * s)³ × 1.2°`
- MC rewrite FORCES the view: `fov:` gets the literal `1.0` and `fovEffectScale:` gets `0.0` (no sprint/speed FOV pumping). MC's slider is vertical FOV = 70 + `fov` × 40 (±1 ⇒ 30–110°), so `1.0` IS the 110 that `constants.fov.mc.hipfire` assumes — MC FOV is NOT user-selectable, and changing `hipfire` means changing that literal. All three MC keys are `\n`-anchored lookbehinds (`(?<=\nfov:)` can't hit `fovEffectScale:`) and accept a leading `-`
- Files rewritten: PUBG `GameUserSettings.ini`, MC `options.txt`, R6 `GameSettings.ini`

## Game sens sync (54-tuple)
`worker/calc_worker.js:update_game_sens()` → `[fn, ...54 numbers]` → `manager.js` → `game_sens.js`'s registered handler casts as `Tuple<number, 54>` and spreads into `update_game_sens(...)`. Four places move together: worker push order, controller handler tuple width, controller param signature + body, `dom.js` refs. Order is listed in `worker/CLAUDE.md`.

The message uses `{dpi_scale, height, pubg_fov, width}` but the worker fn signature is `(width, height, dpi_scale, pubg_fov)` — `calc_worker.js:onmessage` remaps. Don't infer the signature from message-key order.

## Non-obvious
- `contextmenu` is preventDefault'd globally so RMB is usable as game input
- `#controls` (bottom-left, `[hud]`) fades to `op=.25` via the `controls-fade` keyframes 6 s after it appears. The animation restarts every run for free — `[hud]` is `display:none` until `body[locked]`, and a display flip replays CSS animations, so no JS timer. `@media (prefers-reduced-motion: reduce)` sets `animation:none` (id beats the class rule), leaving it at full opacity; headless Chrome reports `reduce`, so screenshots never show the faded state
- `keydown`/`keyup` short-circuit when `is_keyboard_control(ev)` finds an input/button/select/textarea/contenteditable/`x-select` in `ev.composedPath()` — settings controls keep working while the screensaver timer still resets
- Q/W/E/R/A keydown ALSO calls `mode.shoot()` immediately besides setting `state.input.key_*`. Tracking modes additionally read those flags in `on_frame()` for continuous movement + shots
- RMB is dual: if `mode.update_dimension` exists it fires on down AND up AND `mousecancel` — must be idempotent. Otherwise RMB acts as `shoot()`
- `mousecancel` is NOT a native event — `on_blur()` (window `blur`: alt-tab, OS dialog, devtools) dispatches it so `mb_left`/`mb_right` can't stay stuck true. `on_blur()` also zeroes every `state.input.key_*` directly (same risk, no event contract needed since nothing outside `window.js` listens)
- `on_mousemove` reads the cached `state.camera.sens` — populated by `logic.update_camera_view()` (fov change) and `render.resize_3d()` (width change). Changing `calc_rad_per_px` moves both the sens displays and aim feel
- 2D mouse move clamps `y` to `±(PI/2/sens - EPS | 0)` (int px); 3D clamps `pitch` to `±(PI/2 - EPS)` rad
- Pointer lock loss in-game ⇒ `stop_game()`; lock/fullscreen failure at start ABORTS `start_game()` (root `CLAUDE.md`)
- Screensaver: 5 s after input idle, mouse OR keyboard — every input handler calls `reset_screen_saver_timer()` (`constants.screen_saver.delay_ms`). Armed only outside a game (`!state.game.mode`; an open modal does NOT block it). Timer id is `state.game.rest_timeout`. `body[rest]` drops the `brightness(.85)` BG filter and hides UI via `[rest]>:not(#bg-preview,#bg,main)/none`, while `main` fades to `op=.3` (`op=0` on coarse pointers) — leaving the unfiltered 3-strip video
- Default BG pipeline: `render/renderer_bg.js` transfers `#bg-video-canvas` through `manager.js` to `bg_worker.js`; the worker builds a looping `MediaSource` from `bg.mp4` and returns a `MediaSourceHandle`; the main thread plays it in a hidden video and posts one `VideoFrame` per `requestVideoFrameCallback()` tick. Avoid `captureStream()` — it can cap/drop frames

## When you change…
- Add a DOM element: `dom.js` ref → init from `state` in `main.js` (if state-backed) → bind in the owning controller
- Add a mode button/score: `dom.js` · `menu.js` · `setting.js` clear-score · `main.js` initial best score · the mode's localStorage key
- Add a sens display value: all four 54-tuple sites above
- Input behavior: `window.js`; mode-specific shot logic stays in `game_mode/*.js`
- BG/crosshair settings: `setting.js`; defaults from `state.js`/`constants.js`; default-video transport in `render/renderer_bg.js` + `worker/bg_worker.js`; upload library in `setting.js` + `bg_store.js`

## Controller-owned state
`state.hud.next_update_ms` (HUD refresh gate) · `state.input.key_a/e/q/r/space/w`, `mb_left`, `mb_right` · `state.game.rest_timeout` (screensaver setTimeout id)
