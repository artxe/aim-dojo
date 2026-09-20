---
paths:
  - "docs/js/controller/**"
---

# controller/

UI events + HUD: may read/write `state`, call `logic.js`, post worker messages, touch DOM. Game rules stay in `game_mode/`. `logic.js` imports only `dom`, `hud`, `game_sens`. `dom.js:set_mode_score(score_el, clear_btn, score)` is the single writer of a mode's record display; `set_hud_labels()` from every `init()`, `reset_hud_labels()` from every `dispose()`.

## window.js
- `pointerrawupdate` when present, else `mousemove` + `#browser-notice`; only one is bound. `on_mousemove` reads cached `state.camera.sens`, clamps 2D `y` to the pitch range only when `is_ads_available()`, and ends with `mode.on_move?.()`
- RMB: `is_ads_available(mode)` (defines `update_dimension` AND `ads_stage_count() > 1`) → `update_dimension()` on down, up and `mousecancel`, must be idempotent; otherwise `shoot()`. `ads_stage` is written inside that branch only
- `is_ads_cycled()` = `sa` always or `game.ads_toggle`. Cycle-vs-hold and stage count are independent axes; a third stage is reachable only in cycle mode. Stage resets at `mousecancel` and in `start_game()`
- `mousecancel` is synthesized by `on_blur()`; `contextmenu` is prevented globally
- `keydown` order: `defaultPrevented`/`repeat` → Escape + tour → Escape + modal → tour arrows → `is_keyboard_control()` → game keys
- Screensaver: `state.game.rest_timeout` is tri-state (`>0` pending, `-1` resting, `0` neither); armed only when `!mode && !is_tutorial_active()`

## game_sens.js
- `init_game_sens()` is the boot entry (`main.js` only): `active_game_sens()` → `update_cpi_display()` → `update_game_sens()`
- `update_game_sens()` is zero-param, reads `state.game` (not `ads_scope`), computes locals on the game-resolution basis (`width / cpi_scale`), then writes every cell with `set_text_if_changed`; no worker. Its const band is per-game, not alphabetical. A new cell = this function + `dom.js` + markup
- `sync_game_resolution()` (from `start_game()`) overwrites `game.width`/`height` from `screen.* × devicePixelRatio`; the inputs drive the card only
- CPI is an integer; `cpi_norm.x = 0` means auto (`constants.cpi.x * width / ref_width`), a user-set CPI never scales with resolution; `y = round(x * constants.cpi.ratio)`
- `Trainer ADS` selectors are trainer-only; no cell follows them. Eight typed handlers persist `game.ads_scope.<game>`; `main.js` seeds `.value` silently
- `set_active_game_sens(name)` is the tour's entry: no persist, no `[open]`; `change_active_game_sens()` adds both. `close_game_sens_list()` is the single clearer, called by `start_game()` (before its awaits), `open_setting_view()`, `stop_tutorial()`
- MC: the `options.txt` value is the deliverable, the percent a sanity read (the slider floors and quantizes). The rewrite forces `fov: 1.0` (= the 110° `fov.mc.hipfire`), `fovEffectScale: 0.0`, `bobView: false`, `damageTiltStrength: 0.0`. No rewrite reads the CPI pair

## setting.js
- Background is commit-on-Save, no live preview. `bg_snapshot` + localStorage = committed, `state.bg` = displayed. `staged_bg()` reads widgets; `show_bg(spec)` applies (`bg_apply_token` guards out-of-order awaits); `commit_bg(spec)` persists. Activate = preview over the open settings; Dismiss = `show_bg(bg_snapshot)`; Save = show + commit, does not close; Close = `reset_bg_widgets()`
- `none` turns the background off but keeps `video_id`/`youtube_link`; `#bg` paints itself opaque black over the default clip behind it
- The hash IS the modal state, `replaceState` only; `sync_setting_hash()` on boot and `hashchange`
- `#bg-blur` and `#ads-toggle` share one click-css class string; keep them byte-identical. Crosshair handlers end in `update_crosshair_widgets()`, never `update_crosshair()` directly

## tutorial.js
- One ordered `steps` array, the one array deliberately not alphabetized; the sens stretch is `sens_games.flatMap(sens_step)`. `sens_cards` is a full `Record<GameSensName, …>`; a card's controls are `extras` on it and inherit its `game` (a step without `game` would spotlight a hidden box)
- `show_step()` re-asserts `set_active_game_sens(game || tour_game)` and `[open]` on every step; the tour never persists a game
- Dim = `#tutorial-spotlight`'s box-shadow; blur = `#tutorial-shade` with `clip-path: path(evenodd, …)` (never `polygon`, which slits the hole). An `x-select[open]` inside the target is unioned into the hole
- `#tutorial-shade` is the only click-advance; the hole falls through to the real UI; `#tutorial-spotlight` stays `pe=none`. `block_tutorial_click` runs capture-phase on `mousedown`, `mouseup` AND `click` for `activate_bg_btn`, `menu_el`, `save_bg_btn`, `#game-sens-list li > b`; blocked controls keep their cursor
- The tip animates position only (`tr=left,top`), never size. No `prefers-reduced-motion` block
- `show_hud_preview(on)` is derived per step. `Skip`/`Exit` hints are built from the `*_LABEL` consts. The tour is the only place controls are explained; `mode_keys()` derives RMB from `update_dimension`
- `#game-sens-list` is `ox=clip oy=auto`; the file tooltip and ADS dropdown escape its clip via `position: fixed` + `anchor()` (anchor rules in `index.html`'s `<style>` block). Never put `absolute`/`l=`/`t=` back on them
