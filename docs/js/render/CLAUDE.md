# render/

Two SEPARATE stacked canvases, never composited: `#canvas-3d` (transparent WebGL2) beneath `#canvas` (2D, topmost). `logic.on_frame()` shows/hides `#canvas-3d` when `state.camera.dimension` crosses `2d`. In a 3D frame the mode clears the 2D canvas to transparent and draws only `draw_crosshair()` on it, so the crosshair overlays the 3D scene showing through.

## Files
- `camera.js` — 2D px ↔ 3D yaw/pitch rad conversions (`state.camera.dimension` is owned by `logic.update_camera_view()`, not here)
- `mat4.js` — 4×4 matrix math; imports `../math.js` only
- `renderer_2d.js` — grid, impacts, targets, crosshair, dynamic crosshair image
- `renderer_3d.js` — WebGL2 grid/targets/impacts/strokes on `#canvas-3d`
- `renderer_bg.js` — BG video canvas: transfers `#bg-video-canvas` to `bg_worker.js`, handles worker `MediaSourceHandle`/frame acks (`on_bg_worker_message`), `resize_bg()`, `set_bg_video_visible()`, audio enable/volume. Also owns the upload path via `set_bg_upload_video(blob|null)` — a plain fullscreen `#bg-upload-video` `<video loop>` (object URL revoked on swap), NOT routed through the worker. `update_bg_video()` branches on `state.bg.type`: `default` plays the hidden MSE frame-source video (→ worker tiler), `video` plays the upload element, `youtube` pauses both

## Non-obvious
- `state.camera.proj`/`view` are mutable `Float32Array(16)` owned by `state.js`. `prepare_3d_view()` writes IN PLACE via `mat4.perspective(proj, …)` / `mat4.view(view, …)` — never replaces the references. Lower-level draw helpers only read them. `mat4` exports take the destination array first
- Three shared `DYNAMIC_DRAW` VBOs: `disc_vbo` (target/core fills), `ring_vbo` (target + impact rings), `guide_vbo` (aim guides; grows on demand), plus one static unit-sphere VBO for `flick_180`'s camera-crossing transition. The sphere shader derives its yellow, pixel-width silhouette from the view-space normal, so it needs no per-frame ring geometry. `build_disc_vbo_from_angles` / `build_ring_vbo_from_angles` write into module-scope `Float32Array` scratch, `bufferSubData` the shared VBO, and return the SAME `VboInfo` every call — never `deleteBuffer`, and finish the `draw_fill`/`draw_stroke` before the next `build_*` of the same kind (disc→draw→ring→draw is safe; disc→disc loses the first's data)
- Unit-circle `cos`/`sin` for disc/ring layout are precomputed once into module-scope LUTs (`unit_cos`/`unit_sin`, length `VERTEX + 1`)
- `resize_2d()` sets BOTH `canvas_el.width/height` AND `state.camera.width/height` from `innerWidth/innerHeight * devicePixelRatio`. `resize_3d()` then sets `#canvas-3d` size + GL viewport from those values AND refreshes `state.camera.sens` from the new width — call order matters. Neither calls `update_camera_view()`; FOV is aspect-independent by design (root `CLAUDE.md:Non-obvious invariants`), so nothing goes stale on resize
- `convert_camera_to_2d/3d()` only transform `x`/`y` ↔ `pitch`/`yaw` — they do NOT touch `state.camera.dimension`. Modes call `update_camera_view()` first, then convert, guarded by `if (x || y)` / `if (pitch || yaw)`
- `convert_target_to_2d(t3d)` handles yaw wraparound at PI (otherwise the post-conversion sign flip teleports the target across the screen)
- Both target conversions DELIBERATELY drop the core's lateral rotation (only `h_tracking` rotates its core toward movement) and rebuild it straight: 2D `cy = y - r + cr`, 3D `cp = p + r - cr`. So `convert_target_to_2d` reads `target.y`/`p` but not `cy`, and `convert_target_to_3d` reads `target.x`/`y` but not `cx`. A flip mid-rotation snaps the core upright — intentional
- Both take a REQUIRED `out` target as 2nd arg and write in place (returning `out`) — no internal allocation; modes pass a persistent/pooled target
- `px_to_rad`/`rad_to_px` read the cached `state.camera.sens` (= `calc_rad_per_px(fov, width)`), they never recompute it — call sites keep it current (`update_camera_view()` on fov change, `resize_3d()` on width change). They ALSO multiply by `1 + state.camera.dist / sky_sphere_radius`: the TPP orbit camera compresses apparent size by the inverse, so screen-px quantities (target radii, spacings, speeds, 1 px stroke, `impact.rad_size`) spawn at the SAME apparent size in fpp and tpp (`dist = 0` elsewhere ⇒ factor 1). Deliberately spawn-time only — a target spawned in one view and then seen through an RMB tpp↔fpp flip is NOT re-converted, so it visibly grows/shrinks (mirrors zooming in the real game); hit tests stay consistent because pivot-space offset and radius compress by the same factor
- **Sizes go through that same `sens` map, NOT the projection's true center slope `2*tan(vfov/2)/height` — by design, not as an approximation to fix.** Because the mouse is `yaw += movementX * sens`, `r = base_radius * sens` makes the mouse counts needed to cross a target identical in EVERY game, every fov, hipfire or ADS, 2D or 3D. Rebuilding sizes on the exact inverse projection (`atan(px * 2*tan(vfov/2)/height)`) pins on-screen size at N px instead and spreads that count from 20 to 31.7 across the game list (worst: `lol`/`mc` at vfov 110) — tried and reverted 2026-07. The cost is that on-screen size varies with fov (a 20 px 2D target renders 12.6 px at vfov 110, 20.0 px at a vfov-30 scope, and grows on ADS) — which is exactly what fov does in a real game: it changes apparent size, never angular size. Sub-pixel targets at extreme fov are likewise correct (at fov 179 one center pixel spans ~5°)
- Impacts are pooled: `record_shot_2d`/`record_shot_3d` `obtain()` from `impacts_pool`/`impacts_3d_pool`, fill ALL fields (`c = void 0` for a miss, so `c == null` still renders black), and push. `draw_impacts()`/`draw_impacts_3d()` `recycle()` each expired entry before `drop()`. Never push a raw literal — it breaks steady-state reuse
- `draw_crosshair()` overlays SA 4:3 side-crop bars when `state.game.sens == "sa"` AND the active mode ≠ `aim_booster`. Another side-letterbox sens means editing that branch
- `update_crosshair()` closes the old `crosshair_image` ImageBitmap, rebuilds it, and redraws the settings preview — call it on ANY `state.crosshair.*` change

## Draw orders
- **2D**: `draw_grid()` → mode `draw_target(target, alpha)` → `draw_impacts()` → `draw_crosshair()`. Modes wrap with `context_2d.save/restore` + `translate(round(w/2), round(h/2))` to center the origin
- **3D**: `prepare_3d_view()` (MUST come before any `draw_*_3d`) → `draw_grid_3d()` → mode `draw_target_3d(target_3d, alpha)` → `draw_impacts_3d()` → then `draw_crosshair()` on the 2D canvas. `Target3D` uses spherical `y`/`p`; the 3D impact radius comes from `state.impact.rad_size`

## When you change…
- 2D target visuals: `renderer_2d.js:draw_target()` + `constants.target`
- 3D target/stroke visuals: `renderer_3d.js`
- Resize: `renderer_2d.js:resize_2d()` · `renderer_3d.js:resize_3d()` · `controller/window.js:on_resize()`
- SA crop/crosshair: `renderer_2d.js:draw_crosshair()` + `update_crosshair()`
- Impact entry shape: `record_shot_2d()` + `record_shot_3d()` + the matching pool factory in `state.js` + the `draw_impacts*` recycle/drop loop
