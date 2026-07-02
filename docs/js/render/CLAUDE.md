# render/

`renderer_2d.js` = visible 2D canvas (`#canvas`, topmost layer). `renderer_3d.js` = a SEPARATE transparent WebGL2 canvas (`#canvas-3d`) stacked BENEATH the 2D canvas, shown/hidden by `logic.on_frame()` toggling `canvas_3d_el.style.display` when `state.camera.dimension` crosses `2d`. No compositing between them. Camera conversions in `camera.js`.

## Files
- `camera.js` — 2D px ↔ 3D yaw/pitch rad conversions (`state.camera.dimension` is owned by `logic.update_camera_view()`, NOT here)
- `mat4.js` — 4×4 matrix math; imports `../math.js` only
- `renderer_2d.js` — 2D canvas: grid, impacts, targets, crosshair, dynamic crosshair image
- `renderer_3d.js` — WebGL2 grid/targets/impacts/strokes drawn to its own `#canvas-3d` (no blit/compositing into the 2D canvas)
- `renderer_bg.js` — background-video canvas: transfers `#bg-video-canvas` to `bg_worker.js`, receives the worker `MediaSourceHandle` / frame acks (`on_bg_worker_message`), `resize_bg()`, `set_bg_video_visible()`, audio enable/volume. Also owns the uploaded-video path via `set_bg_upload_video(blob|null)` — a plain fullscreen `#bg-upload-video` `<video loop>` (object URL revoked on swap), NOT routed through the worker. `update_bg_video()` branches on `state.bg.type`: `default` plays the hidden MSE frame-source video (→worker tiler), `video` plays the upload element, `youtube` pauses both (iframe shows)

## Non-obvious
- `state.camera.proj`/`view` are mutable `Float32Array(16)` owned by `state.js`. `prepare_3d_view()` writes IN-PLACE via `mat4.perspective(proj, ...)` / `mat4.view(view, ...)` — never replaces the references. Lower-level 3D draw helpers read these; they do not compute them. `mat4` exports take the destination `Float32Array` as their first arg
- `renderer_3d.js` keeps three shared `DYNAMIC_DRAW` VBOs: `disc_vbo` (target/core fills), `ring_vbo` (target rings + impact rings), `guide_vbo` (aim guides; grows on demand when chain length exceeds capacity). `build_disc_vbo_from_angles` / `build_ring_vbo_from_angles` write into module-scope `Float32Array` scratch + `bufferSubData` the shared VBO + return the same `VboInfo` each call — caller must NOT `deleteBuffer` and must finish its `draw_fill`/`draw_stroke` before the next `build_*` of the same kind (disc and ring use separate VBOs, so disc→draw→ring→draw is safe; back-to-back disc→disc loses the first's data)
- Unit-circle `cos`/`sin` for the disc/ring triangle/strip layout are precomputed once into module-scope `Float32Array` LUTs (`unit_cos`/`unit_sin`, length `VERTEX + 1`)
- The 2D and 3D canvases are SEPARATE stacked DOM layers (`#canvas-3d` beneath `#canvas`); the 3D scene is NEVER composited into the 2D canvas. In a 3D frame the mode clears the 2D canvas to transparent and draws only `draw_crosshair()` on it, so the crosshair (topmost layer) overlays the `#canvas-3d` scene showing through. `draw_crosshair()` is always 2D, drawn AFTER the mode's 3D draws
- `resize_2d()` sets BOTH `canvas_el.width/height` AND `state.camera.width/height` from `innerWidth/innerHeight * devicePixelRatio`. `resize_3d()` sets `#canvas-3d` `width/height` + the GL viewport using values `resize_2d()` already wrote AND refreshes `state.camera.sens` (rad/px cache) from the new width — call order matters
- `controller/window.js:on_resize()` calls them then stops; does NOT call `update_camera_view()`. Aspect-dependent FOVs (`al`, `cs2`, `mc`, `ow`, `r6`, `sa`) go stale until next dimension flip
- `convert_camera_to_2d()`/`convert_camera_to_3d()` only transform `x`/`y` ↔ `pitch`/`yaw` — they do NOT touch `state.camera.dimension` (`logic.update_camera_view()` owns it; modes call it first, then convert). `update_dimension()` in modes guards the convert with `if (x || y)` / `if (pitch || yaw)` to skip zero-conversion noise
- `convert_target_to_2d(t3d)` handles yaw wraparound at PI (otherwise sign flip after conversion teleports the target across the screen)
- Both conversions DELIBERATELY drop the core's lateral rotation: only `h_tracking` rotates its core toward the movement direction (`v_tracking` keeps it centered), and converting that angle across 2D↔3D isn't worth the math, so the core is reconstructed straight (2D `cy = y - r + cr`, 3D `cp = p + r - cr`). A dimension flip mid-rotation snaps the core upright — intentional, not a bug. So `convert_target_to_2d` reads `target.y`/`p` but not `target.cy`, and `convert_target_to_3d` reads `target.x`/`y` but not `target.cx`
- `convert_target_to_2d`/`convert_target_to_3d` take a REQUIRED `out` target as 2nd arg and write fields in place (returning `out`) — no internal allocation. Modes pass a persistent/pooled target so a dimension flip allocates nothing — see `game_mode/CLAUDE.md`
- `px_to_rad`/`rad_to_px` read the cached `state.camera.sens` (= `calc_rad_per_px(fov, width)`), they do NOT recompute it. Call sites must keep `state.camera.sens` current (it is: `update_camera_view()` on fov change, `resize_3d()` on width change)
- Impacts are pooled: `record_shot_2d`/`record_shot_3d` obtain an entry from `impacts_pool`/`impacts_3d_pool` (`state.js`), fill all fields (set `c = void 0` for a miss so `c == null` still renders black), and push. `draw_impacts()`/`draw_impacts_3d()` `recycle()` each expired entry before `drop()`. Don't push a raw object literal — it breaks steady-state reuse
- `draw_crosshair()` overlays SA 4:3 side-crop bars when `state.game.sens == "sa"` AND active mode ≠ `aim_booster`. Adding another side-letterbox sens means editing this branch
- `update_crosshair()` closes the old `crosshair_image` ImageBitmap and rebuilds it, then redraws the settings preview. Call it any time a `state.crosshair.*` field changes

## Draw orders
2D: `draw_grid()` → mode `draw_target(target, alpha)` → `draw_impacts()` → `draw_crosshair()`. Modes wrap with `context_2d.save/restore` and `translate(round(w/2), round(h/2))` to center origin.

3D: mode calls `prepare_3d_view()` → `draw_grid_3d()` → mode `draw_target_3d(target_3d, alpha)` → `draw_impacts_3d()` (all on `#canvas-3d`) → then on the 2D canvas `draw_crosshair()`. `Target3D` uses spherical `y`/`p`; 3D impact radius comes from `state.impact.rad_size` (set by `update_camera_view()`)

## When you change…
- Mouse/camera/impact scale: `camera.js`, `calc/calc_sens.js:calc_rad_per_px()`, `logic.update_camera_view()` (`rad_size` + `state.camera.sens` derivation), `render/renderer_3d.js:resize_3d()` (sens refresh on width change)
- 2D target visuals: `renderer_2d.js:draw_target()` + `constants.target`
- 3D target/stroke visuals: `renderer_3d.js`; mode `render()` should call `prepare_3d_view()` before any 3D draw
- Resize behavior: `renderer_2d.js:resize_2d()`, `renderer_3d.js:resize_3d()`, `controller/window.js:on_resize()`
- SA crop/crosshair: `renderer_2d.js:draw_crosshair()` + `update_crosshair()`
- Impact entry shape: `renderer_2d.js:record_shot_2d()` + `renderer_3d.js:record_shot_3d()` + the matching `impacts_pool`/`impacts_3d_pool` factory in `state.js` + the `draw_impacts*` recycle/drop loop
