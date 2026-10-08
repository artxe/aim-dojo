---
paths:
  - "docs/js/calc/**"
---

# calc/

Two layers. `calc_cpi_*` run on the main thread, read `state`, take zero params, open with a dev-guard throw when `state.cpi_norm.game` is not their own, and divide `state.game.width`/`height` by `cpi_scale`. `calc_sens_*` and `calc_rad_per_px` are pure and stay parameterized; `state.js` imports `lol_sens_to_cpi_scale` from here, so `calc_sens.js` reading `state` is a cycle.

## calc_rad_per_px(fov_deg, width)
- The match point is internal: `match = width * (1 - cos(fov/2)) / 2`, the sagitta of the FOV arc in px. It must stay a length, not a ratio, so `width` cancels and the result is exactly ∝ `1/width`. Returns the mean rad/px over `[0, match]`
- Sens is view-independent: FPP/TPP is render-only, `constants.tpp.*` never enters a formula. Never reintroduce a parallax or cross-view multiplier

## calc_sens_<game>
- Numerator `calc_rad_per_px(true horizontal at the real aspect, width)` via `calc_real_hfov(constants.fov.<game>.axis, …)`; denominator = the engine's yaw-per-count rule in the game's own fov units on the RAW argument (aspect-invariant). Never conflate the two
- `calc_real_hfov(axis, fov_deg, width, height)`: `"h"` returns raw (a 16/9 rebase is a regression, it hands ultrawide a side bonus); `"v"` `convert_deg_across_aspect(vfov, height, width)`; `"43"` `convert_deg_across_aspect(hfov, 4/3, max(4/3, width/height))`, the `max` IS the crossover, test both sides of 4:3. One function, one direction; `ow` takes the true horizontal from the caller (`hipfire` under `"h"`, `scopes.*` under `scopes.axis`)
- Zoomed fields are `convert_deg_across_aspect(base, N, 1)` in the `constants.fov` IIFEs. `pubg` divides, and `x1 = base - 5`, `x4 = base / 4 - 1`, `x15 = base / 12` are deliberate; `cs2` stores literal scope fovs
- `fn`: `calc_sens_fn` (tan-ratio) IS Zoom Scaling Standard; the card pins `ADS`/`Scoped` at 100 %
- No vertical fields: the five games with one print it equal to the horizontal; nothing takes a `cpi_v`, `constants.fov` has no `vertical_ref`
- `cs2`: `calc_sens_cs2_yaw()` sets `m_yaw` so the 2 dp `sensitivity` rounds away; every multiplier divides by that exact base
- `r6`: `calc_sens_r6_file(width, height)` searches the integer yaw whose 6 dp unit rounds least; `Vertical` = same yaw; ADS ints share one unit. Memoised on `(width, height)` and returns the SAME object: read-only
- `rb`: yaw is fov-independent (`.5°` per count at `MouseSensitivity` 1); Rivals' aiming percent is already scaled by `ads_vfov / rb.base`. `rb_hipfire` = `rivals.hipfire`, not `base`. `Sensitivity × Horizontal` (`Vertical` = `Horizontal`) then `While Aiming` (= `While Scoped`) multiply; `calc_sens_rb_fields(width, height)` snaps `While Aiming` first, then grid-searches the pair so the rifle's 45° view is exact; memoised. `While Aiming` stays pinned to `rivals.rifle`, never to the `Trainer ADS` selection; per-weapon rows are `_exact` readouts
- `sa`: TRG has no settable zoom sens; the engine's `x5_sens`/`x15_sens` live in `constants.fov.sa` and reach `sens_scale` through `logic.js`; zoom fovs are tan-ratio
- `bdo` eats the OS pointer multiplier: `calc_sens_bdo` divides by `cpi_scale`, `calc_cpi_bdo` multiplies; keep both factors written out
- `lol_sens_to_cpi_scale()`: piecewise-linear over anchors every 10 sens; `sens 50` maps to exactly `1`, the neutral notch the card's advice rests on. LOL's slider is an OS pointer multiplier, so it writes `state.game.cpi_scale`
- `pubg`: `game.pubg_fov` (80 TPP | 103 FPP) moves only the hipfire calc; `fov.pubg.base` stays the ADS reference

## constants.sens.<game>
Every engine coefficient lives here. LINEAR `scale`; AFFINE `bdo`/`sa` `step * s + offset` in raw rad; CUBIC `mc`; LOG `pubg`. `decimals` is the input grid used by BOTH the card display and `calc_sens_snap`; `bdo`/`sa` `0` (integer fields), `mc` 16 (the `options.txt` value). `mul_decimals` is the scope field's own grid. The three `round_to(x, 2)` in `update_game_sens()` stay literal: reference readouts, not game grids.

## calc_sens_snap(sens_name, ads_fov, width, height, cpi_scale, pubg_fov)
- Returns `yaw(typed) / yaw(ideal)`; `logic.js` folds it into `sens_scale`
- Each branch rounds as the card displays, then applies that game's curve: linear `typed / exact`; affine `(step * typed + offset) / (step * exact + offset)`, never `typed / exact`; `mc` cubic; `pubg` `2 ** ((typed - exact) / step)`; `r6` snaps `yaw_unit` at 6 dp
- `ads_fov` selects the field chain (`0` = hipfire); one branch per game covers every `ads` key and needs BOTH halves. Multiplier games' ADS snap REPLACES the hipfire snap; `r6` compounds; `bdo`/`lol`/`mc`/`sa` ignore `ads_fov`; `fn`'s ADS half carries no rounding and its curve gap is real, do not fix it toward 0
- A view the typed field was not matched to (stage 2, a weapon sharing the field) is not expressible here; `logic.js` multiplies by `calc_sens_<game>(typed) / calc_sens_<game>(shown)`. Never add a second fov argument
- After changing a formula, verify the matching `logic.update_camera_view()` branch renders the fov the calc assumes
