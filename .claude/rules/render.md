---
paths:
  - "docs/js/render/**"
---

# render/

Three stacked canvases, never composited: `#canvas-3d` (WebGL2) beneath `#canvas` (2D) beneath `#canvas-crosshair`. `logic.on_frame()` toggles `#canvas-3d` when `dimension` crosses `2d`; in a 3D frame the mode still clears the 2D canvas. `state.render.scale`% sizes the `#canvas-3d`, `#canvas` and bg buffers and CSS scales them back; `#canvas-crosshair` is always native, so the crosshair never blurs.

## camera.js
- `calc_camera_sens(fov_deg)` is the only producer of `state.camera.sens`, called only by `logic.update_camera_projection()`. Its `bdo`/`sa` branches ignore the arg and lock to the hipfire fov (neither game zoom-corrects), inlining the axis rule; keep them in step with `calc_real_hfov`
- `state.camera.sens_scale` is written only by `logic.update_camera_view()`. Never derive any of it from `state.input.mb_right` here: the fixed-2D modes flip `mb_right` without re-running the view, and a resize would then scale `sens` to a view it is not in
- `px_to_rad`/`rad_to_px` read the cached `sens` and multiply by `1 + dist / sky_sphere_radius`, so screen-px quantities spawn at the same apparent size in fpp and tpp. Spawn-time only: a target seen across an RMB flip is not re-converted (it grows/shrinks like a real zoom)
- Sizes go through that `sens` map, not the projection's centre slope, so the mouse counts to cross a target are identical in every game, fov and dimension; on-screen size varying with fov is the intent
- `convert_camera_to_2d/3d()` transform `x`/`y` ↔ `pitch`/`yaw` only, never `dimension`; modes call `update_camera_view()` first and guard with `if (x || y)` / `if (pitch || yaw)`
- `convert_target_*(target, out)` take a required `out`, handle yaw wraparound, and rebuild the core straight (drop its lateral rotation)

## renderer_2d.js
- `resize_2d()` sets `state.camera.width`/`height` from `innerWidth`/`innerHeight × devicePixelRatio` (never scaled — they are the aim/sens space), sizes `#canvas` at `state.render.scale`% of them and leaves that ratio as the context's base transform, so every caller keeps drawing in unscaled px; `#canvas-crosshair` takes the unscaled size. `resize_3d()` reads those and never touches `sens`. Order: `resize_2d` → `update_camera_projection` → `resize_3d`
- The caller owns the world transform: `draw_aim_guides_2d`/`draw_grid`/`draw_impacts`/`draw_target` do not `save`/`translate`/`restore`. A mode's `render()` wraps the world block in one `save()` + `translate(-x, -y)` … `restore()` and calls `draw_crosshair()` at the centred origin after it (`aim_booster` needs no translate; its crosshair carries the offset)
- 2D order: `draw_grid()` → `draw_target()` → `draw_impacts()` → `draw_crosshair()`
- `draw_crosshair(x, y)` owns `#canvas-crosshair` alone: it clears that canvas and draws at its centre offset by `x`/`y` (`0, 0` everywhere but `aim_booster`), outside the caller's transform. No letterbox bars without a matching `calc_camera_sens` branch. `update_crosshair()` on any `state.crosshair.*` change
- Impacts are pooled: `record_shot_2d/3d` `obtain()` from `impacts_pool`/`impacts_3d_pool`, fill every field (`c = void 0` on a miss), push; `draw_impacts*()` `recycle()` each expired entry before `drop()`. Fade/expiry runs on `state.timer.now_ms`; `max_life_ms = duration_ms * (1 + spacing * (rings - 1))`

## renderer_3d.js
- `resize_3d()` sizes the buffer to `state.render.scale`% of `state.camera.width`/`height`, but `u_viewport` keeps the unscaled size so px line widths hold one apparent size at every scale
- `state.camera.proj`/`view` are `Float32Array(16)` owned by `state.js`; `prepare_3d_view()` writes them in place, never replaces them
- Discs and rings are procedural: the vertex shader builds the billboard from `gl_VertexID`/`gl_InstanceID` + `u_center`/`u_radius` with no vertex buffer (`vao_empty`). Do not reintroduce a shared scratch VBO for round geometry. Radius reaches the shader in world units (`tan(radius_rad) * dist`)
- GL state is cached and `prepare_3d_view()` invalidates it: it bumps `frame_id`, each program re-uploads `u_proj`/`u_view`/`u_viewport` on its first draw of a frame, `current_program` skips redundant `useProgram`. A `draw_*_3d` without a preceding `prepare_3d_view()` draws stale AND skips the upload. `u_viewport` is the size cached in `resize_3d()`
- `draw_target_3d`: body fill → body ring → core fill → core ring; do not batch the fills ahead of the rings (the core is tangent to the body edge and the seam moves)
- `build_stroke_vbo` records the instanced attribs into a VAO once; `draw_stroke` is bind + `drawArraysInstanced`, never re-points attribs
- 3D order: `prepare_3d_view()` → `draw_grid_3d()` → `draw_target_3d()` → `draw_impacts_3d()` → `draw_crosshair()` on the 2D canvas. The 3D impact radius is `state.impact.rad_size`

## renderer_bg.js
- Transfers `#bg-video-canvas` to `bg_worker.js`, handles `MediaSourceHandle`/frame acks in `on_bg_worker_message`. The upload path `set_bg_upload_video(blob|null)` is a plain `<video loop>`, not routed through the worker
- `update_bg_video()` branches on `state.bg.type` (`default` plays the hidden MSE video, `video` the upload element, `youtube`/`none` pause both) and owns re-arming: a paused element's `requestVideoFrameCallback` never fires again, so `restart_bg_video_frames()` runs on the `bg_video_running` false→true edge. Do not move it to a caller; the type transitions have no other choke point
- `resize_bg()` and the `init` post size the worker canvas from `innerWidth`/`innerHeight`, never the canvas's `clientWidth`/`clientHeight` (a hidden canvas measures 0×0 and the worker would draw into nothing). `get_bg_dpr()` folds `state.render.scale` into the `dpr` it posts, which is what scales the bg buffer
- Frames come from `requestVideoFrameCallback` + a transferred `VideoFrame`; never `captureStream()` (browsers may cap it below source fps)
