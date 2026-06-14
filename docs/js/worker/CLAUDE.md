# worker/

Offloads heavy work. Keep protocol small, tuple order explicit, allocations bounded. `manager.js` stays a thin post/dispatch layer; feature modules own response semantics.

## Files
- `manager.js` — creates module Workers at module load, posts messages, and directly dispatches calc responses to owning modules; exports `post_calc_worker_message()` and `post_bg_worker_message()`
- `calc_worker.js` — sens-display and writing-stats worker context. May import ONLY `../calc/calc_sens.js` + `../math.js` — enforced by a file-scoped allow-list in `eslint.config.js` so `state.js` can never enter the worker import tree (the worker runs off-thread with no `state`)
- `bg_worker.js` — dedicated default-background pipeline: fetches/fragments `bg.mp4`, owns worker-side `MediaSource` + WebGL2 draw into transferred `OffscreenCanvas`

`new URL("./calc_worker.js", import.meta.url)` and `new URL("./bg_worker.js", import.meta.url)` hard-pin worker module paths — moving either file means updating `manager.js`.

## Protocol
Calc worker send: `post_calc_worker_message({ fn, ...args })`. Response shape is ALWAYS `[fn, ...payload]`; `manager.js` destructures `[fn, ...result]` and dispatches by `fn`.

| fn | message keys | response | main-thread effect |
|---|---|---|---|
| `check_writing_stats` | `height, line_width, lines, text_data, width` | `[fn, count_hit, count_shoot]` | handled in `game_mode/writing.js`; if still in writing mode, writes `state.stats.count_hit/count_shoot` (bypasses `shoots` queue) |
| `update_game_sens` | `height, dpi_scale, width` | `[fn, ...44 numbers]` | handled in `controller/game_sens.js`; spreads into `update_game_sens(...)` |

`bg_worker.js` is separate and does NOT use `post_calc_worker_message()` / tuple responses. `manager.js` forwards raw bg worker `data` to `render/renderer_bg.js:on_bg_worker_message`, and callers post object messages through `post_bg_worker_message()`:

| fn | message keys | effect |
|---|---|---|
| `init` | `canvas, dpr, height, visible, width` | initialize WebGL + MediaSource and send `{fn:"handle", handle}` |
| `frame` | `frame` | draw one `VideoFrame` if its timestamp is newer |
| `resize` | `dpr, height, width` | update destination layout |
| `time` | `time` | append/evict MSE fragments around playback time |
| `visible` | `visible` | skip drawing while hidden |

BG worker responses are `{fn:"handle", handle}`, `{fn:"started"}`, and `{fn:"frame"}`. The `frame` ack is the backpressure release: `renderer_bg.js` clears `bg_frame_in_flight` and forwards one pending `VideoFrame` if present.

## Non-obvious
- Fn params are SEMANTIC order (`update_game_sens(width, height, dpi_scale)`), but the message object's keys are alphabetized (house convention), so `onmessage` maps between them — don't infer the signature from message-key order. There is no `dpi_x`/`match` field anymore — the matching point is derived geometrically inside `calc_rad_per_px` (FOV+width), so the worker needs no DPI. The worker has NO `state`, so every value it needs (resolution) MUST arrive as a message field / param
- 44-tuple order (push in `calc_worker.js`, accept in `controller/game_sens.js`, cast width in `controller/game_sens.js`'s registered handler, DOM refs in `controller/dom.js`):
  `al_hipfire, al_x1, al_x2, al_x3, al_x4, al_x6, al_x8, al_x10,`
  `cs2_hipfire, cs2_45, cs2_40, cs2_15, cs2_10,`
  `fn_hipfire, fn_targeting, fn_scope,`
  `mc_hipfire,`
  `ow_hipfire, widow, ashe, freja, emre,`
  `pubg_hipfire, pubg_ads, pubg_x2, pubg_x3, pubg_x4, pubg_x6, pubg_x8, pubg_x15,`
  `r6_hipfire, r6_x1, r6_x2_5, r6_x3_5, r6_x5, r6_x12,`
  `sa_hipfire,`
  `val_hipfire, spectre, vandal, guardian, marshal, operator25, operator5`
  All four call sites must move together
- `check_writing_stats` reuses a module-scope OffscreenCanvas (`off`/`off_context`) — sized per call via `off.height/width = ...`. The pixel loop walks alpha bytes (`alpha_i = 3; alpha_i += 4`) and counts `line_image_data[alpha_i]` against `text_data[alpha_i]`. Don't reallocate the canvas per stroke
- `writing.check_stats()` passes `lines.array` (the writing mode's module-local queue) — the RAW backing buffer. The worker re-indexes via `lines.at(i)` so head-dropped entries in the array don't matter today, but a different access pattern would break this
- `post_calc_worker_message()` / `post_bg_worker_message()` have two `Array.isArray` branches that both call `postMessage` with the same args (intentional — TS overload resolution; not a bug)
- Background video frames come from `HTMLVideoElement.requestVideoFrameCallback()` in `render/renderer_bg.js`, then `new VideoFrame(video, { timestamp })` is transferred via `post_bg_worker_message()` to `bg_worker.js`. Do not switch this path to `captureStream()`; browsers may cap it below the source FPS.
- Keep `calc_worker.js` and `bg_worker.js` separate: BG does continuous 60fps `VideoFrame` upload/draw plus MSE fragment fetch/append/evict, while `calc_worker.js` handles latency-sensitive calc/writing requests. Sharing one worker would let BG work delay stats/sens responses.
- `bg_worker.js` keeps its own logical-head append queue (`bg_append_queue_head`) and compacts it like `create_queue()`, but it is local to MSE fragment scheduling and is not the `state.js` queue type.
- BG stores parsed `bg.mp4` fragments in memory but appends to the `SourceBuffer` only around current playback (`APPEND_AHEAD_S`, evicting behind). Do not restore eager append-all behavior; large replacement default videos can trip SourceBuffer quota.
- BG loops by re-appending the same fragments on ONE continuous MSE timeline with `timestampOffset = loop_idx * bg_media_duration` — there is no `<video loop>`. The seam is clean only if the loop period equals the VIDEO track's exact duration: `bg_media_duration` is therefore parsed from the video track's summed sample durations (`read_bg_video_duration` over each fragment's `traf`/`trun`, ÷ `bg_video_timescale` from the moov), NOT from `sb.buffered.end`. `buffered.end` can sit past the video end when the audio track is longer (it usually is — AAC frames don't divide evenly into 60fps), which would insert a >1-frame video gap at every seam and stall playback (`renderer_bg.js` throws on the resulting `waiting`/frozen-`currentTime`). Audio being longer than the period just overlaps into the next loop, which MSE coalesces. The append-ahead check (`bg_buffered_ahead`) measures the contiguous range from `bg_current_time`, not the last range, so a stray seam micro-gap can't fool the scheduler into stopping refills.

## When you change…
- Add a calc worker fn: branch in `calc_worker.js:onmessage`, impl returning `[fn, ...payload]`, `manager.js` dispatch branch, caller payload shape
- Change `update_game_sens` outputs: edit calc worker push order, controller handler tuple width, controller param signature + body, and `dom.js` refs together — partial edits silently desync the displayed values
- Change default BG transport/rendering: edit `render/renderer_bg.js` + `worker/bg_worker.js` together; keep `MediaSourceHandle`, `VideoFrame` ownership/closing, and `OffscreenCanvas` transfer semantics aligned
