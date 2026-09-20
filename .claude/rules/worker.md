---
paths:
  - "docs/js/worker/**"
---

# worker/

A worker is for work that would hitch a frame. The sens card runs inline in `controller/game_sens.js`; do not move it back into a worker. `manager.js` is a thin post/dispatch layer creating both module Workers via `new URL("./x_worker.js", import.meta.url)` (move a file → update it); feature modules own response semantics. Keep the two workers separate: BG does continuous frame upload + MSE work, `writing_worker.js` serves latency-sensitive stats. Both import only `../constants.js` + `../math.js` (lint) and have no `state`; every value arrives as a message field.

## Writing protocol
Send `post_writing_worker_message({ fn, ...args })`; the response is always `[fn, ...payload]`, dispatched by `fn` in `manager.js`.

| fn | keys | response |
|---|---|---|
| `check_writing_stats` | `drop_count, line_width, segments` | `[fn, count_hit, count_shoot]` → `writing.js` writes `state.stats.count_hit/count_shoot` if still in writing mode |
| `set_writing_text` | `height, text_data, width` | none; caches the alpha data + dims, resets the stroke ring; posted once per run with `text_data.buffer` transferred |

- Keys are alphabetized, params are semantic, so `onmessage` remaps; do not infer signatures from key order
- `check_writing_stats` is a DELTA: only strokes added since the last tick (a transferred `Float64Array` of `ex,ey,sx,sy`) plus `drop_count` for the ones that aged out. The worker owns the stroke history in its own ring (`LINE_STRIDE` 4, doubling + `copyWithin`). Never send the whole list again
- The OffscreenCanvas is sized once by `set_writing_text` and `clearRect`'d per call; reassigning `off.width`/`height` per call reallocates the bitmap and resets context state
- `writing.js:build_text()` stays main-thread inside `init()` (before the first rAF) so `text_image` exists on frame one

## BG protocol
`post_bg_worker_message()` sends object messages; `manager.js` forwards raw worker `data` to `render/renderer_bg.js:on_bg_worker_message`.

| fn | keys | effect |
|---|---|---|
| `init` | `canvas, dpr, height, visible, width` | WebGL + MediaSource; replies `{ fn: "handle", handle }` |
| `frame` | `frame` | draw the `VideoFrame` if newer |
| `resize` | `dpr, height, width` | destination layout |
| `time` | `time` | append/evict MSE fragments around playback |
| `visible` | `visible` | skip drawing while hidden |

Responses: `handle`, `started`, `frame`. The `frame` ack is the backpressure release: `renderer_bg.js` clears `bg_frame_in_flight` and forwards one pending frame. The worker holds parsed fragments in memory but appends only around playback (`constants.bg.append_ahead_s`/`evict_behind_s`); no eager append-all (SourceBuffer quota).

## BG loop seam
- Looping re-appends the same fragments on one timeline, `timestampOffset = loop_idx * bg_media_duration`; no `<video loop>`
- `bg_media_duration` is the VIDEO track's summed sample durations (`traf`/`trun` ÷ the moov timescale), never `sb.buffered.end` (the audio track runs longer and would open a gap at every seam)
- Each loop is clipped with `appendWindowEnd = (loop_idx + 1) * bg_media_duration`, so the audio overrun is dropped and restarts in lockstep. Do not rely on MSE coalescing the overlap; audio drifts
- `bg_media_duration` is `0` during the first pass (`schedule_bg_append` falls back to `Infinity`). The `done` branch of `parse_bg_fragments` finalizes it and sets `bg_fragments_loaded` BEFORE scheduling the last fragment; never collapse that into `append_bg_fragment(last)`
- `bg_buffered_ahead` measures the contiguous range from `bg_current_time`, not the last range
- `bg_append_queue_head` is a local logical-head queue for fragment scheduling, not the `struct/queue.js` type

## When you change
- A writing fn: `writing_worker.js:onmessage` branch + impl returning `[fn, ...payload]` · `manager.js` dispatch · caller payload
- BG transport/rendering: edit `render/renderer_bg.js` + `bg_worker.js` together; keep `MediaSourceHandle`, `VideoFrame` close ownership and `OffscreenCanvas` transfer aligned
