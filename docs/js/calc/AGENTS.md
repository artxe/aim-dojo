# calc/

Sensitivity and DPI math. Keep this layer numeric; DOM updates belong in `controller/`, and worker tuple formatting belongs in `worker/`.

## Files

- `calc_sens.js` - `calc_sens_{al,cs2,fn,mc,ow,pubg,r6,sa,val}()`, `calc_rad_per_px()`; imports only `../math.js`
- `calc_dpi.js` - `calc_dpi_{al,cs2,fn,lol,mc,ow,pubg,r6,sa,val}()`; reads `state.dpi_norm`
- `calc_pubg.js` - `calc_pubg_converted(sens)`; imports only `../math.js` or `./calc_sens.js`
- `index.js` - re-exports all calc helpers

## Key Functions

- `calc_rad_per_px(fov_deg, width)` returns radians-per-pixel for mouse movement and sensitivity conversion
- `calc_pubg_converted(sens)` converts PUBG integer-style sensitivity to yaw multiplier: `0.02 * 2 ** ((sens - 50) / 15.0515)`
- `calc_dpi_*()` functions use `state.dpi_norm` and return the DPI needed to preserve equivalent turning behavior for the selected game/sens pair

## Maintenance Map

- Add a sensitivity game: update `GameSensName`, `logic.update_fov()`, `calc_sens.js`, `calc_dpi.js`, `controller/game_sens.js`, worker tuple output if displayed, and DOM refs/markup
- Change mouse conversion: keep `calc_rad_per_px()` consistent with `controller/screen.js:on_mousemove()` and render camera conversions
- Change PUBG math: update `calc_pubg.js`, `calc_sens_pubg()`, and PUBG INI rewrite in `controller/game_sens.js`

## Boundaries

Several files embed per-file ESLint `no-restricted-syntax` import rules. Check the file header before adding imports; violating those boundaries is a lint error.
