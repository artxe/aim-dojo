# render/

Rendering layer. `renderer.js` is the visible 2D canvas path; `renderer3d.js` renders to an `OffscreenCanvas` WebGL2 target and blits into the 2D canvas. Camera conversions live in `camera.js`.

## Files

- `camera.js` - coordinate conversions between 2D px and 3D yaw/pitch radians
- `mat4.js` - 4x4 matrix math for WebGL; imports only `../math.js`
- `renderer.js` - 2D canvas, grid, impacts, targets, crosshair image generation
- `renderer3d.js` - WebGL2 grid/targets/impacts/strokes, then `render_to_2d()`

## Maintenance Map

- Change mouse/camera scale: inspect `camera.js`, `calc/calc_sens.js:calc_rad_per_px()`, and `controller/screen.js:on_mousemove()`
- Change 2D target visuals: edit `renderer.js:draw_target()` and constants in `constants.js`
- Change 3D target/stroke visuals: edit `renderer3d.js`; mode render functions own `state.camera.proj/view`
- Change resizing behavior: edit `renderer.js:resize_2d()`, `renderer3d.js:resize_3d()`, and `controller/index.js:on_resize()`
- Change SA crop/crosshair: start in `renderer.js:draw_crosshair()` and `update_crosshair()`

## Camera

```
camera_to_2d()     3D yaw/pitch -> 2D x/y px; sets dimension="2d"
camera_to_3d()     2D x/y px -> 3D yaw/pitch; sets dimension="fps"
px_to_rad(px)      px -> rad using state.camera.fov & width
rad_to_px(rad)     rad -> px
target_to_2d(t3d)  Target3D -> Target; handles yaw wraparound at PI
target_to_3d(t)    Target -> Target3D
```

## 2D Path

Exports: `context_2d`, `crosshair_image`, `grid_pattern`, `draw_crosshair()`, `draw_crosshair_preview()`, `draw_grid()`, `draw_impacts()`, `draw_target()`, `resize_2d()`, `update_crosshair()`.

Typical render order:

1. `draw_grid()`
2. mode-specific `draw_target(...)` calls
3. `draw_impacts()`
4. `draw_crosshair()`

Notes:

- `resize_2d()` sets `canvas_el.width/height` and `state.camera.width/height` from `innerWidth/innerHeight * devicePixelRatio`, then draws idle grid + crosshair
- `draw_crosshair()` applies SA 4:3 side-crop bars when `state.game.sens == "sa"` and active mode is not `aim_booster`
- `update_crosshair()` closes and rebuilds `crosshair_image`, then redraws the settings preview

## 3D Path

Exports: `context_3d`, `build_stroke_vbo()`, `draw_grid_3d()`, `draw_impacts_3d()`, `draw_stroke()`, `draw_target_3d()`, `render_to_2d()`, `resize_3d()`.

Typical render order:

1. mode render sets `state.camera.proj/view` with `mat4.perspective()` and `mat4.view()`
2. `context_3d.clear()`
3. `draw_grid_3d()`
4. mode-specific `draw_target_3d(...)` calls
5. `draw_impacts_3d()`
6. `render_to_2d()`

Notes:

- `resize_3d()` only resizes the OffscreenCanvas viewport from `state.camera.width/height`
- WebGL draw helpers read `state.camera.proj/view`; keep those matrices updated in 3D mode render functions
- Target/impact positions use spherical yaw (`y`) and pitch (`p`) fields from `Target3D`
