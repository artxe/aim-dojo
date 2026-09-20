# Agent Notes

Vanilla JS SPA, no bundler; `docs/` deploys as-is to GitHub Pages. pnpm only. `pnpm run dev` throttled static server · `pnpm run lint` = `scripts/update_html_preload.js` + `eslint --cache --fix .` + `tsc -b` · `pnpm run wrangler deploy`. TypeScript 7 `tsc`, `checkJs`; every named type is a global in `private.d.ts`; `docs/lib/` is excluded from lint and tsc; `docs/tsconfig.json` adds `lib: dom` and relaxes `noUncheckedIndexedAccess`.

## Map
- `docs/js/`: `state.js` persisted + cross-cutting state, pools · `constants.js` every knob and per-game number (imports `math.js` only) · `logic.js` run lifecycle + camera derivation · `sfx.js` synthesized SFX (never ship game audio) · `bg_store.js` IndexedDB store for uploaded BG videos (blob + meta; `controller/setting.js` is its only caller)
- `calc/` sens/CPI numerics · `controller/` input, settings, HUD, tutorial, DOM refs · `game_mode/` modes and scoring · `render/` camera math, 2D canvas, WebGL, BG video · `struct/` state-free containers · `worker/` writing-stats + BG workers · `component/` `x-select` · `docs/lib/` vendored click-css
- `scripts/` Node asset tooling, `cloudflare/` the BG video Worker: neither ships

## Conventions (not tool-enforced)
- Read `const { x } = state.foo`; write `state.foo.x = v`; branch on the local
- Loose equality only (`==`/`!=`)
- Alphabetize within local groups: imports (full specifier, `../` before `./`; bare side-effect imports keep boot order), named lists, object/type keys, function declarations, `else if` chains over string literals, order-insensitive assigns. `lube/ascii-order` enforces the first four, case-sensitive ASCII, so `PI` and `EPS` come before `abs`; what it leaves alone (module-level declarations, `else if` chains, assigns) stays case-insensitive. A trailing `_btn`/`_el`/`_input`/`_select` is ignored when it would reorder a numeric family (`al_x1_el, al_x10_el, al_x2_el`)
- Module-level declarations: UPPER_SNAKE consts first, then role groups (scalar state, reusable objects/pools, data tables), each sorted, `const`/`let` interleaved; group order is per file, match it. A WebGL program keeps its uniforms beside it
- File shape: imports → module-level declarations → `function` declarations → `export default` → the bare `{ … }` init block last. `scripts/` invert this: the block is the program
- Comments: JSDoc type tags/casts and lint/TS directives only, no prose. Cast: `/** @type {T} */(x)/**/`. No `@typedef`, no `import("./x.js").T`; JSDoc mirroring a declaration uses `typeof`
- No `any`, explicit (`*`) or implicit (`MessageEvent` data, `IDBObjectStore.get`): check `lib.dom` first, cast to the narrowest real type; worker messages are `private.d.ts` unions (`BgWorkerRequest`/`Reply`, `WritingWorkerRequest`/`Reply`)
- Arrow fns only for one-off use (arg-forwarding wrappers, module-load IIFEs); anything reused, named or hot-path is a `function`
- Bug-zero: no defensive error handling, logging or watchdogs. `throw` only as a dev-guard on an unreachable branch or as feature logic. No reactive error handlers (IndexedDB `request.onerror` → `reject` and the `main.js` tag's `onerror` are API channels, keep them)
- No top-level `await` under `docs/js/`
- State-free import closure: a module in `eslint.config.js:state_free_files` imports only from that set; register a new one there before a state-free file imports it
- Optimization must improve runtime perf; never reshape a documented core API (`create_queue`). Between `init()` and `dispose()` the per-frame path allocates nothing: queue entries and targets come from `struct/pool.js`, `convert_target_*` write into a passed `out`. Add a pool only when O(1) and it removes a real allocation
- One clock, `state.timer.now_ms` (rAF); every stamp/interval is `*_ms`. HUD fps is a frame count over `constants.hud.fps_interval_ms`, never `1000 / dt`
- A knob lives in `constants.js`, never at its use site; canvas/WebGL styles are pairs `*_style` (CSS) + `*_3d` (RGB(A)). `constants.cpi.ratio` is the fixed `math.js:PSI`, never a function of a game or view
- Bilingual prose, English chrome: player-facing prose is a `LangText` `{ en, ko }` resolved at render time through `i18n.js:lang_text()` (never aliased `t`); anything a player matches against a real game UI (HUD labels, settings titles, card fields, game/mode names, filenames, metadata) stays plain English. Korean prose names games as players do (배그, 롤, 카스2); 크로스헤어 not 조준선, 추천 감도 not 적정 감도. Korean-carrying containers carry `lang="ko"` + `word-spacing=normal`; no Korean webfont
- click-css expands `index.html`'s class syntax at runtime and a wrong token renders silently wrong: `tr` = transition, `tt` = text-transform; `lh` needs a unit; `calc()` operators need spaces (`calc(100%_-_4.5ch)`); `\_`/`\=` escape; `~` prefix skips auto-px; `--ident` after `:`/space/comma becomes `var()`
- localStorage keys: `<a>.<b>` mirrors a `state` path (`state.js` owns it); `<module>#<field>` is module-private (`<name>#runs`, `<name>#level`)

## Camera derivation
```
update_camera_view()        picks the VIEW from state.game.sens + state.input.ads_stage
                            → dimension, dist, fov_axis, sens_scale, view_fov → calls ↓
update_camera_projection()  owns the ASPECT (current width/height) → vfov → fov → sens → sens_error → rad_size
```
- Per-`sens` branches assign locals only; the shared tail writes state once and scales the raw `constants.tpp.<game>` `dist` by `render_dist_scale`
- `ads_fov` = fov of the field the player typed (`0` = hipfire; `ads_ref[scope]` for `cs2`/`rb`/`val`); `view_fov` = what the run shows. When they differ, `sens_scale = calc_sens_<game>(ads_fov) / calc_sens_<game>(view_fov)` (`rb` scales each side by its fov); a stage-2 view uses the same expression. `calc_sens_snap` always gets `ads_fov`
- Projection: `vfov` from `calc_real_hfov(fov_axis, view_fov, width, height)` → `fov = convert_deg_across_aspect(vfov, height, width)` → `sens = calc_camera_sens(fov) * sens_scale` → `rad_size = px_to_rad(constants.impact.px_size)`. `on_resize()` calls this half only; it leaves `dimension`/`dist` alone. Only `fov_axis`/`view_fov` are aspect-independent; never carry `vfov`/`fov` across a resize
- `sens_scale` is written only by `update_camera_view()`, never derived from `mb_right`; `sens_error` is a HUD readout, not a bug signal
- No vertical sens (`pitch_scale`/`sens_y`), no vertical error line, no per-game CPI ratio, no parallax/cross-view multiplier: sens is view-independent, `constants.tpp.*` is renderer-only

## FOV axis policy (data: `constants.fov.<game>.axis`)
| axis | games | locked | on 21:9 |
|---|---|---|---|
| `"h"` | `fn`, `ow` hipfire, `pubg`, `val` | horizontal at every aspect | no side bonus |
| `"v"` | `bdo`, `lol`, `mc`, `r6`, `rb`, `ow` scopes | vertical | side bonus |
| `"43"` | `al`, `cs2`, `sa` | horizontal below 4:3, vertical above | side bonus |

- Every fov field is a number as the game declares it; one `axis` per object (`ow.scopes.axis` is the one nested axis); views are picked by field name, never index. `calc_sens.js:calc_real_hfov()` is the one implementation; its only duplicate is `camera.js:calc_camera_sens`'s `bdo`/`sa` hipfire locks, change both
- `fov.<game>.ads` = selectable scopes keyed by what the player picks up (guns, heroes, `fn` field names, magnifications); `ads_ref` = the fov one shared typed field is matched at (`cs2`/`rb`/`val`); `ads_stage2` = second zoom (`0` = single). `state.game.ads_scope.<game>` holds the chosen key. `rb.rivals` is Rivals, a shooter inside Roblox (not Marvel Rivals); `rb.base` is Roblox's own slider

## Orderings
- Start: `start_game()` awaits pointer lock + fullscreen, `init()` and the first rAF in one `try`; any rejection exits both and nulls `state.game.mode`. Never lock-optional. Lost lock → `stop_game()`
- Resize: `resize_2d()` → `update_camera_projection()` → `resize_3d()` → `resize_bg()` → `layout_tutorial()`
- RMB: `update_dimension()` when `is_ads_available()` (mode defines it AND `ads_stage_count() > 1`), else `shoot()`. `state.input.ads_stage` is the logical ADS state, `mb_right` the raw button

## Change map
- Add/remove/rename a `docs/js/` module: `pnpm run lint` (regenerates the modulepreload block)
- Add a mode: `/add-game-mode` · add a sens game: `/add-sens-game`
- Add a settings control: ref in `controller/dom.js` → seed from `state` in `main.js` → bind in `controller/setting.js`; a new `fieldset[id^="setting-"]` also needs a `tutorial.js` step and the count bump in its `setting_btn` step
- Change the default BG video: R2 object + `constants.version` bump (`.claude/rules/cloudflare.md`)
