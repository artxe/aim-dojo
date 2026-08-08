# worker/

Offloads heavy work. Keep the protocol small, tuple order explicit, allocations bounded. `manager.js` stays a thin post/dispatch layer; feature modules own response semantics.

## Files
- `manager.js` — creates both module Workers at module load, posts messages, dispatches calc responses to the owning modules. Exports `post_calc_worker_message()` / `post_bg_worker_message()`
- `calc_worker.js` — sens-display + writing-stats context. Imports ONLY `../calc/calc_sens.js`, `../constants.js`, `../math.js` (file-scoped eslint allow-list) so `state.js` can never enter the worker tree
- `bg_worker.js` — default-background pipeline: fetches/fragments `bg.mp4`, owns the worker-side `MediaSource` + WebGL2 draw into a transferred `OffscreenCanvas`. Imports ONLY `../constants.js` + `../math.js`

`new URL("./calc_worker.js", import.meta.url)` / `new URL("./bg_worker.js", import.meta.url)` hard-pin the module paths — moving either file means updating `manager.js`.

Keep the two workers SEPARATE: BG does continuous 60 fps `VideoFrame` upload/draw plus MSE fetch/append/evict, while `calc_worker.js` serves latency-sensitive requests. Sharing one would let BG work delay stats/sens responses.

## Calc protocol
Send `post_calc_worker_message({ fn, ...args })`; the response is ALWAYS `[fn, ...payload]`, which `manager.js` destructures and dispatches by `fn`.

| fn | message keys | response | main-thread effect |
|---|---|---|---|
| `check_writing_stats` | `line_width, lines, lines_start` | `[fn, count_hit, count_shoot]` | `game_mode/writing.js`; if still in writing mode, writes `state.stats.count_hit/count_shoot` (bypasses the `shoots` queue) |
| `set_writing_text` | `height, text_data, width` | none | caches the writing alpha data + dims in worker scope; posted once per run by `writing.js:build_text()` with `text_data.buffer` TRANSFERRED |
| `update_game_sens` | `dpi_scale, height, pubg_fov, width` | `[fn, ...54 numbers]` | `controller/game_sens.js`; spreads into `update_game_sens(...)` |

Fn params are in SEMANTIC order (`update_game_sens(width, height, dpi_scale, pubg_fov)`) but message keys are alphabetized (house convention), so `onmessage` remaps — don't infer signatures from key order. There is no `dpi_x`/`match` field: the matching point is derived geometrically inside `calc_rad_per_px`. The worker has NO `state`, so every value it needs must arrive as a message field.

### 54-tuple order
Push in `calc_worker.js`, accept in `controller/game_sens.js`, cast width in `manager.js`'s dispatch, DOM refs in `controller/dom.js` — **all four move together**.
```
al_hipfire, al_x1, al_x2, al_x3, al_x4, al_x6, al_x8, al_x10,
bdo_hipfire, bdo_hipfire_exact,
cs2_hipfire, cs2_45, cs2_40, cs2_15, cs2_10,
fn_hipfire, fn_targeting, fn_scope,
mc_hipfire, mc_hipfire_file,
ow_hipfire, widow, ashe, freja, emre,
pubg_hipfire, pubg_ads, pubg_x2, pubg_x3, pubg_x4, pubg_x6, pubg_x8, pubg_x15,
r6_yaw, r6_yaw_unit, r6_x1, r6_x1_5, r6_x2, r6_x2_5, r6_x3, r6_x4, r6_x5, r6_x12, r6_ads_unit,
rb_hipfire,
sa_hipfire, sa_hipfire_exact,
val_hipfire, spectre, vandal, guardian, marshal, operator25, operator5
```
The `fn` values use `calc_sens_fn_legacy`, not `calc_sens_fn` (see `calc/CLAUDE.md`).

`calc_sens_mc` returns the `options.txt` value (`mc_hipfire_file`); `mc_hipfire` is the in-game percent DERIVED from it (`× 200`), not a second calc call (see `controller/CLAUDE.md`).

## BG protocol
Separate from the calc tuple path: `manager.js` forwards raw bg worker `data` to `render/renderer_bg.js:on_bg_worker_message`, and callers post object messages through `post_bg_worker_message()`.

| fn | message keys | effect |
|---|---|---|
| `init` | `canvas, dpr, height, visible, width` | initialize WebGL + MediaSource, send `{fn:"handle", handle}` |
| `frame` | `frame` | draw one `VideoFrame` if its timestamp is newer |
| `resize` | `dpr, height, width` | update destination layout |
| `time` | `time` | append/evict MSE fragments around playback time |
| `visible` | `visible` | skip drawing while hidden |

Responses: `{fn:"handle", handle}`, `{fn:"started"}`, `{fn:"frame"}`. The `frame` ack is the backpressure release — `renderer_bg.js` clears `bg_frame_in_flight` and forwards one pending `VideoFrame`.

Frames come from `HTMLVideoElement.requestVideoFrameCallback()` in `renderer_bg.js`, then `new VideoFrame(video, { timestamp })` is transferred. Do NOT switch this to `captureStream()` — browsers may cap it below source FPS.

## Non-obvious
- `check_writing_stats` reuses a module-scope OffscreenCanvas (`off`/`off_context`), resized per call. The pixel loop walks alpha bytes (`alpha_i = 3; alpha_i += 4`) counting `line_image_data[alpha_i]` against `text_data[alpha_i]`. Don't reallocate per stroke
- `writing.check_stats()` passes `lines.array` — the RAW backing buffer — plus `lines_start` (= `array.length - length`). The structured clone is a plain Array with NO head awareness, so the worker MUST iterate from `lines_start`; starting at 0 re-scores expired strokes until compaction. `text_data` is not in that message; it arrives once per run via `set_writing_text`
- `post_calc_worker_message()`/`post_bg_worker_message()` each have two `Array.isArray` branches calling `postMessage` with the same args — intentional, for TS overload resolution
- `bg_worker.js` keeps its own logical-head append queue (`bg_append_queue_head`) and compacts it like `create_queue()`, but it is local to MSE fragment scheduling — not the `state.js` queue type
- BG holds parsed `bg.mp4` fragments in memory but appends to the `SourceBuffer` only around current playback (`APPEND_AHEAD_S`, evicting behind). Do not restore eager append-all; large replacement videos trip the SourceBuffer quota

### BG loop seam (read before touching MSE code)
Looping re-appends the same fragments on ONE continuous timeline with `timestampOffset = loop_idx * bg_media_duration` — there is no `<video loop>`. The seam is clean only if the loop period equals the VIDEO track's exact duration, so `bg_media_duration` is parsed from the video track's summed sample durations (`read_bg_fragment_durations` over each fragment's `traf`/`trun`, ÷ `bg_video_timescale` from the moov) — **NOT** from `sb.buffered.end`, which can sit past the video end when the audio track is longer (it usually is; AAC frames don't divide evenly into 60 fps), inserting a >1-frame video gap at every seam and stalling playback (`renderer_bg.js` throws on the resulting `waiting`/frozen `currentTime`).

Each loop's append is hard-clipped with `appendWindowEnd = (loop_idx + 1) * bg_media_duration`. Audio is the only thing that overruns, so clipping drops its tail and forces audio to restart in lockstep with video every loop.

`bg_media_duration` is known only once ALL fragments are summed (finalized in the `parse_bg_fragments` `done` branch), so it is `0` during first-pass streaming and `schedule_bg_append` falls back to `Number.POSITIVE_INFINITY` while it is (interior first-pass fragments are well inside the video and need no clip). The ONLY first-pass fragment whose audio tail overruns is the last one, so the `done` branch pushes it and reads its durations BUT finalizes `bg_media_duration` (and sets `bg_fragments_loaded`) BEFORE calling `schedule_bg_append` — never `append_bg_fragment`.

- Do NOT collapse that back into `append_bg_fragment(last)`: it would schedule with `bg_media_duration` still `0` (`appendWindowEnd = 0` throws) or append the tail unclipped
- Do NOT rely on the old overlap-into-next-loop "MSE coalesces it" behavior — the per-loop AAC overrun isn't fully overwritten, so audio drifts seconds behind video after tens of minutes (video is unaffected; it ends exactly at the boundary)
- The append-ahead check (`bg_buffered_ahead`) measures the contiguous range from `bg_current_time`, not the last range, so a stray seam micro-gap can't fool the scheduler into stopping refills

## When you change…
- Add a calc fn: branch in `calc_worker.js:onmessage` · impl returning `[fn, ...payload]` · `manager.js` dispatch branch · caller payload shape
- Change `update_game_sens` outputs: worker push order + controller tuple width + controller param signature/body + `dom.js` refs — partial edits silently desync displayed values
- Change BG transport/rendering: edit `render/renderer_bg.js` + `bg_worker.js` together; keep `MediaSourceHandle`, `VideoFrame` ownership/closing, and `OffscreenCanvas` transfer semantics aligned
