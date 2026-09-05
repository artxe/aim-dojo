---
name: add-sens-game
description: Checklist for adding, renaming or removing a game on the sensitivity card list (FOV + engine-curve constants, camera view branch, calc_sens + both calc_sens_snap halves, CPI normalizer, card cells and markup, Trainer ADS selector, tutorial card). Use whenever GameSensName changes.
---

# Add a sens game

Read root `CLAUDE.md` (Camera derivation, the FOV-axis table, the ADS-scope invariants) and `docs/js/calc/CLAUDE.md` before writing a formula. Every per-game number is DATA in `constants.js`; a formula never hardcodes one.

Work in this order. Each step's tsc/lint failure points at the next one.

1. **`private.d.ts`** — add the key to `GameSensName`. tsc now fails on every `Record<GameSensName, …>` until the rest is done; that is the checklist.
2. **`constants.js`**
   - `cpi_norm.default_sens.<game>` — the CPI-normalizer's first-load / switch-to default (ONE place; `state.js` and `cpi_norm.js` both read it).
   - `fov.<game>` — an IIFE holding EVERY fov the game has, rendered view and card-only scope alike, in the game's OWN declared units, named after the in-game scope (`hipfire`/`base`/`x1`/`widow`/…, never a generic `ads`), plus ONE `axis: FovAxis` (`"h"` locked horizontal at every aspect, `"v"` locked vertical, `"43"` horizontal declared at 4:3 with the crossover). Zoomed fields are `convert_deg_across_aspect(base, N, 1)` unless the game really divides (pubg). If the player can pick a scope: an `ads` map (keys = what the player picks up, values REFERENCING the same locals); if ONE typed field covers several scopes: `ads_ref` (same keys, value = the fov that field is matched at); if a scope has a second zoom stage: `ads_stage2` (same keys, `0` = single stage). A vertical sensitivity field gets NO constant: the card prints it equal to the horizontal one (`calc/CLAUDE.md:No vertical fields`).
   - `sens.<game>` — engine coefficients copied from the game's config (`scale`, or `step`/`offset` for affine, cubic/log terms) + `decimals` (the in-game input grid) + `mul_decimals` if the game has a separate scope field.
   - `tpp.<game>` only if the hipfire view is third person (renderer orbit only, never a sens term).
3. **`state.js`** — with an `ads` map: `game.ads_scope.<game>` via `read_ads_scope(ads, "game.ads_scope.<game>", "<default key>")`.
4. **`calc/calc_sens.js`**
   - `calc_sens_<game>(fov, width, height)` — PURE, parameterized, delegates the numerator to `calc_real_hfov(axis, …)` and keeps the ENGINE rule in the game's own fov units on the raw argument (`calc/CLAUDE.md:Two layers`). Keep the sort order of the exports.
   - A `calc_sens_snap` branch covering BOTH halves: the hipfire field rounded to `decimals`, and the ADS field chain driven by the `ads_fov` ARGUMENT (`0` = hipfire) rounded to `mul_decimals`, so every scope in `ads` is covered by that one branch. Affine games (`bdo`/`sa`) are `(step*round+offset)/(step*exact+offset)`, never `typed/exact`.
5. **`calc/calc_cpi.js`** — `calc_cpi_<game>()` (zero params, reads `state.cpi_norm`, opens with the dev-guard throw, divides `state.game.width/height` by `cpi_scale`). Wire it into `controller/cpi_norm.js:update_cpi_norm_result`.
6. **`logic.js:update_camera_view()`** — one branch assigning ONLY locals: `ads_fov` (the fov of the field the player TYPED, `ads_ref[scope]` for a shared field, `0` = hipfire), `fov_axis`, `view_fov` (what the run SHOWS), `dimension`/`dist = constants.tpp.<game>` only when not the `"fpp"` default, and `sens_scale = calc_sens_<game>(ads_fov) / calc_sens_<game>(view_fov)` whenever the two differ. Add the game to `ads_stage_count()` if it has an `ads_stage2`.
7. **`render/camera.js:calc_camera_sens`** — only if the game does NOT zoom-correct sens (like `bdo`/`sa`): lock to the hipfire fov there, inlining the same `calc_real_hfov` rule.
8. **`controller/dom.js`** — one ref per card cell (`<game>_<field>_el`), the `<game>_el` `li`, and `<game>_ads_scope_select` if there is a selector. Keep the alphabetical order (see the numeric-family carve-out in root `CLAUDE.md`).
9. **`docs/index.html`** — the `li#<game>` card in `#game-sens-list`: title `b`, one row per typed field (`Hipfire(<fov basis>)` labels carry the basis), reference rows, and as the LAST row `Trainer ADS:` with an `x-select#<game>-ads-scope` whose `data-value`s are the `ads` keys (`data-label` for short button text). Add the `#<game>-ads-scope` `anchor-name`/`position-anchor` pair in the `<style>` block. Add the option to `#cpi-norm-game`.
10. **`controller/game_sens.js`** — `active_game_sens()` branch; `on_change_<game>_ads_scope` (persist + `update_game_sens()`); the `update_game_sens()` block that computes this game's locals (rounded exactly as `calc_sens_snap` rounds them) AND writes every cell with `set_text_if_changed`; the `mouseup`/`change` listeners in the init block. A settings-file rewrite gets its own `download_updated_<game>_file` + `on_click_<game>_file`/`on_drop_<game>_file` + a `fieldset[dragover]#<game>-file` in the card.
11. **`main.js`** — seed `<game>_ads_scope_select.value = ads_scope.<game>` (the setter is silent, so no `change` fires).
12. **`controller/tutorial.js:sens_cards.<game>`** — `{ el, extras?, text }` with a bilingual `LangText` quirk the PLAYER hits (not FOV-axis theory); the ADS selector and any file box go in `extras`. Korean prose uses the name players use (`배그`, `롤`, `카스2`, …); chrome stays official English.
13. **Notes** — the FOV-axis table and the ADS-scope bullets in root `CLAUDE.md`, the per-game leftovers in `calc/CLAUDE.md`, the `Trainer ADS` list in `controller/CLAUDE.md`.

## Verify
- `pnpm run lint` (eslint --fix + tsc -b) is clean.
- Card and trainer agree: feed the card's displayed hipfire sens into the CPI normalizer at the same CPI and it returns that CPI; `error` on the HUD reads about the snap (±0.5 %) at hipfire and each scope, larger only where the game's own fields cannot cover the view.
- Aspect: check the card at 5:4, 4:3, 16:9 and 21:9 (`#monitor-width`/`height`). An `"h"` game's hipfire must not move, a `"v"` game's must widen, a `"43"` game holds its number below 4:3 and widens above.
- RMB through every `Trainer ADS` option (and stage 2 with ADS Toggle on where `ads_stage2` exists): the HUD fov line shows the scope's fov and the sens line shows the expected gap.
