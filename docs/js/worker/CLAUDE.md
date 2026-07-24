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
| `check_writing_stats` | `line_width, lines, lines_start` | `[fn, count_hit, count_shoot]` | handled in `game_mode/writing.js`; if still in writing mode, writes `state.stats.count_hit/count_shoot` (bypasses `shoots` queue) |
| `set_writing_text` | `height, text_data, width` | none | caches the writing text alpha data + dims in worker module scope; posted once per run by `writing.js:build_text()` with `text_data.buffer` TRANSFERRED |
| `update_game_sens` | `dpi_scale, height, pubg_fov, width` | `[fn, ...52 numbers]` | handled in `controller/game_sens.js`; spreads into `update_game_sens(...)` |

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
- Fn params are SEMANTIC order (`update_game_sens(width, height, dpi_scale, pubg_fov)`), but the message object's keys are alphabetized (house convention), so `onmessage` maps between them — don't infer the signature from message-key order. There is no `dpi_x`/`match` field anymore — the matching point is derived geometrically inside `calc_rad_per_px` (FOV+width), so the worker needs no DPI. The worker has NO `state`, so every value it needs (resolution + PUBG FOV) MUST arrive as a message field / param
- 52-tuple order (push in `calc_worker.js`, accept in `controller/game_sens.js`, cast width in `worker/manager.js`'s dispatch, DOM refs in `controller/dom.js`):
  `al_hipfire, al_x1, al_x2, al_x3, al_x4, al_x6, al_x8, al_x10,`
  `bdo_hipfire, bdo_hipfire_exact,`
  `cs2_hipfire, cs2_45, cs2_40, cs2_15, cs2_10,`
  `fn_hipfire, fn_targeting, fn_scope,`
  `mc_hipfire,`
  `ow_hipfire, widow, ashe, freja, emre,`
  `pubg_hipfire, pubg_ads, pubg_x2, pubg_x3, pubg_x4, pubg_x6, pubg_x8, pubg_x15,`
  `r6_yaw, r6_yaw_unit, r6_x1, r6_x1_5, r6_x2, r6_x2_5, r6_x3, r6_x4, r6_x5, r6_x12, r6_ads_unit,`
  `sa_hipfire, sa_hipfire_exact,`
  `val_hipfire, spectre, vandal, guardian, marshal, operator25, operator5`
  All four call sites must move together
- `check_writing_stats` reuses a module-scope OffscreenCanvas (`off`/`off_context`) — sized per call via `off.height/width = ...`. The pixel loop walks alpha bytes (`alpha_i = 3; alpha_i += 4`) and counts `line_image_data[alpha_i]` against `text_data[alpha_i]`. Don't reallocate the canvas per stroke
- `writing.check_stats()` passes `lines.array` (the writing mode's module-local queue) — the RAW backing buffer — plus `lines_start` (= `array.length - length`, the logical head). The structured-cloned array is a plain Array with NO head awareness, so the worker MUST iterate from `lines_start`; starting at 0 would re-score expired (head-dropped) strokes until `create_queue` compaction. `text_data` is NOT in this message — it arrives once per run via `set_writing_text` (buffer transferred) and is cached worker-side (`writing_text_data`/`writing_width`/`writing_height`)
- `post_calc_worker_message()` / `post_bg_worker_message()` have two `Array.isArray` branches that both call `postMessage` with the same args (intentional — TS overload resolution; not a bug)
- Background video frames come from `HTMLVideoElement.requestVideoFrameCallback()` in `render/renderer_bg.js`, then `new VideoFrame(video, { timestamp })` is transferred via `post_bg_worker_message()` to `bg_worker.js`. Do not switch this path to `captureStream()`; browsers may cap it below the source FPS.
- Keep `calc_worker.js` and `bg_worker.js` separate: BG does continuous 60fps `VideoFrame` upload/draw plus MSE fragment fetch/append/evict, while `calc_worker.js` handles latency-sensitive calc/writing requests. Sharing one worker would let BG work delay stats/sens responses.
- `bg_worker.js` keeps its own logical-head append queue (`bg_append_queue_head`) and compacts it like `create_queue()`, but it is local to MSE fragment scheduling and is not the `state.js` queue type.
- BG stores parsed `bg.mp4` fragments in memory but appends to the `SourceBuffer` only around current playback (`APPEND_AHEAD_S`, evicting behind). Do not restore eager append-all behavior; large replacement default videos can trip SourceBuffer quota.
- BG loops by re-appending the same fragments on ONE continuous MSE timeline with `timestampOffset = loop_idx * bg_media_duration` — there is no `<video loop>`. The seam is clean only if the loop period equals the VIDEO track's exact duration: `bg_media_duration` is therefore parsed from the video track's summed sample durations (`read_bg_fragment_durations` over each fragment's `traf`/`trun`, ÷ `bg_video_timescale` from the moov), NOT from `sb.buffered.end`. `buffered.end` can sit past the video end when the audio track is longer (it usually is — AAC frames don't divide evenly into 60fps), which would insert a >1-frame video gap at every seam and stall playback (`renderer_bg.js` throws on the resulting `waiting`/frozen-`currentTime`). Each loop's append is hard-clipped to its exact boundary with `appendWindowEnd = (loop_idx + 1) * bg_media_duration`: the audio (longer than the video period) is the only thing that would overrun, so clipping drops its past-boundary tail and forces audio to restart in lockstep with the video every loop. `bg_media_duration` is only known once ALL fragments are summed (finalized in the `parse_bg_fragments` `done` branch), so it is `0` during first-pass streaming: `schedule_bg_append` therefore falls back to `Number.POSITIVE_INFINITY` while it is `0` (interior first-pass fragments are well within the video and need no clip). The ONLY first-pass fragment whose audio tail overruns is the last one, so the `done` branch pushes that final fragment and reads its durations BUT finalizes `bg_media_duration` (and sets `bg_fragments_loaded`) BEFORE calling `schedule_bg_append` — never `append_bg_fragment` — so the last fragment (and every loop) always appends with the exact boundary, not `INFINITY`. Do NOT collapse that back into `append_bg_fragment(last)` (it would schedule the last append with `bg_media_duration` still `0` → `appendWindowEnd = 0` throws, or the tail appends unclipped). Do NOT rely on the old overlap-into-next-loop "MSE coalesces" behavior — the per-loop AAC overrun isn't fully overwritten, so audio drifts seconds behind the video after tens of minutes. Video is unaffected (it ends exactly at the boundary). The append-ahead check (`bg_buffered_ahead`) measures the contiguous range from `bg_current_time`, not the last range, so a stray seam micro-gap can't fool the scheduler into stopping refills.

## When you change…
- Add a calc worker fn: branch in `calc_worker.js:onmessage`, impl returning `[fn, ...payload]`, `manager.js` dispatch branch, caller payload shape
- Change `update_game_sens` outputs: edit calc worker push order, controller handler tuple width, controller param signature + body, and `dom.js` refs together — partial edits silently desync the displayed values
- Change default BG transport/rendering: edit `render/renderer_bg.js` + `worker/bg_worker.js` together; keep `MediaSourceHandle`, `VideoFrame` ownership/closing, and `OffscreenCanvas` transfer semantics aligned
