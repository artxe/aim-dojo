# worker/

Offloads heavy work. Keep the protocol small, allocations bounded. `manager.js` stays a thin post/dispatch layer; feature modules own response semantics.

**A worker is for work that would hitch a frame — not for "this looks like computation".** The ENTIRE 60-value sens card measures **0.181 ms** (~100 % of it `calc_sens_r6_file`'s grid scan; the other ~50 `calc_sens_*` calls are below noise), so it runs inline in `controller/game_sens.js`. It was `calc_worker.js:update_game_sens` shipping a positional 60-tuple four files had to edit in lockstep — **don't put it back**. The bar `check_writing_stats` clears and sens never did: it rasterizes ~1546 × 1200 (15 sentences × `grid.size` 80), `getImageData`s ~7 MB and walks 1.86 M alpha bytes, **every 50 ms** while the mode runs.

## Files
- `manager.js` — creates both module Workers at module load, posts messages, dispatches responses to the owning modules. Exports `post_bg_worker_message()` / `post_writing_worker_message()`
- `writing_worker.js` — writing-stats context ONLY. Imports NOTHING today (eslint caps it at `../constants.js` + `../math.js`), so `state.js` can never enter the worker tree
- `bg_worker.js` — default-background pipeline: fetches/fragments `bg.mp4`, owns the worker-side `MediaSource` + WebGL2 draw into a transferred `OffscreenCanvas`. Imports ONLY `../constants.js` + `../math.js`

`new URL("./writing_worker.js", import.meta.url)` / `new URL("./bg_worker.js", import.meta.url)` hard-pin the module paths — moving either file means updating `manager.js`.

Keep the two workers SEPARATE: BG does continuous 60 fps `VideoFrame` upload/draw plus MSE fetch/append/evict, while `writing_worker.js` serves latency-sensitive stats requests. Sharing one would let BG work delay them.

## Writing protocol
Send `post_writing_worker_message({ fn, ...args })`; the response is ALWAYS `[fn, ...payload]`, which `manager.js` destructures and dispatches by `fn`.

| fn | message keys | response | main-thread effect |
|---|---|---|---|
| `check_writing_stats` | `line_width, lines, lines_start` | `[fn, count_hit, count_shoot]` | `game_mode/writing.js`; if still in writing mode, writes `state.stats.count_hit/count_shoot` (bypasses the `shoots` queue) |
| `set_writing_text` | `height, text_data, width` | none | caches the writing alpha data + dims in worker scope; posted once per run by `writing.js:build_text()` with `text_data.buffer` TRANSFERRED |

Fn params are in SEMANTIC order but message keys are alphabetized (house convention), so `onmessage` remaps — don't infer signatures from key order. The worker has NO `state`, so every value it needs must arrive as a message field.

`writing.js:build_text()` stays MAIN-thread despite being the one remaining heavy burst (15 `measureText` + 15 `fillText` + a full `getImageData` on that same ~1.8 M px canvas): it runs once per run inside `init()` BEFORE the first rAF, so it delays run start instead of hitching a frame, and moving it would make `text_image` arrive asynchronously — first frames with no text to trace.

## BG protocol
`manager.js` forwards raw bg worker `data` to `render/renderer_bg.js:on_bg_worker_message`; callers post object messages via `post_bg_worker_message()`.

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
- `post_writing_worker_message()`/`post_bg_worker_message()` each have two `Array.isArray` branches calling `postMessage` with the same args — intentional, for TS overload resolution
- `bg_worker.js` keeps its own logical-head append queue (`bg_append_queue_head`) and compacts it like `create_queue()`, but it is local to MSE fragment scheduling — not the `state.js` queue type
- BG holds parsed `bg.mp4` fragments in memory but appends to the `SourceBuffer` only around current playback (`APPEND_AHEAD_S`, evicting behind). Do not restore eager append-all; large replacement videos trip the SourceBuffer quota

### BG loop seam (read before touching MSE code)
Looping re-appends the same fragments on ONE continuous timeline with `timestampOffset = loop_idx * bg_media_duration` — no `<video loop>`. The seam is clean only if the loop period equals the VIDEO track's exact duration, so `bg_media_duration` comes from the video track's summed sample durations (`read_bg_fragment_durations` over each fragment's `traf`/`trun`, ÷ `bg_video_timescale` from the moov) — **NOT** `sb.buffered.end`, which sits past the video end when the audio track is longer (it usually is; AAC frames don't divide evenly into 60 fps), inserting a >1-frame gap at every seam and stalling playback (`renderer_bg.js` throws on the resulting `waiting`/frozen `currentTime`).

Each loop's append is hard-clipped with `appendWindowEnd = (loop_idx + 1) * bg_media_duration`. Audio is the only thing that overruns, so clipping drops its tail and forces audio to restart in lockstep with video every loop.

`bg_media_duration` is known only once ALL fragments are summed (finalized in the `parse_bg_fragments` `done` branch), so it is `0` during first-pass streaming and `schedule_bg_append` falls back to `Number.POSITIVE_INFINITY` while it is (interior first-pass fragments are well inside the video and need no clip). The ONLY first-pass fragment whose audio tail overruns is the last one, so the `done` branch pushes it and reads its durations BUT finalizes `bg_media_duration` (and sets `bg_fragments_loaded`) BEFORE calling `schedule_bg_append` — never `append_bg_fragment`.

- Do NOT collapse that back into `append_bg_fragment(last)`: it would schedule with `bg_media_duration` still `0` (`appendWindowEnd = 0` throws) or append the tail unclipped
- Do NOT rely on the old overlap-into-next-loop "MSE coalesces it" behavior — the per-loop AAC overrun isn't fully overwritten, so audio drifts seconds behind video after tens of minutes (video is unaffected; it ends exactly at the boundary)
- The append-ahead check (`bg_buffered_ahead`) measures the contiguous range from `bg_current_time`, not the last range, so a stray seam micro-gap can't fool the scheduler into stopping refills

## When you change…
- Add a writing fn: branch in `writing_worker.js:onmessage` · impl returning `[fn, ...payload]` · `manager.js` dispatch branch · caller payload shape
- Change a sens card value: `controller/game_sens.js:update_game_sens()` + `dom.js` refs — no worker, no protocol
- Change BG transport/rendering: edit `render/renderer_bg.js` + `bg_worker.js` together; keep `MediaSourceHandle`, `VideoFrame` ownership/closing, and `OffscreenCanvas` transfer semantics aligned
