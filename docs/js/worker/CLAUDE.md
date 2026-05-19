# worker/

Offloads heavier computation from the main thread. Keep the worker protocol small and tuple order explicit.

## Files

- `index.js` - creates the module Worker, routes responses, exports `post_worker_message()`
- `worker.js` - Worker context; imports only `../calc/calc_sens.js` and `../math.js`

`new URL("./worker.js", import.meta.url)` means both files must stay in this directory.

## Protocol

Send via `post_worker_message({ fn, ...args })`.

| fn | args | response | main-thread side effect |
|---|---|---|---|
| `check_writing_stats` | `height, line_width, lines, text_data, width` | `["check_writing_stats", count_hit, count_shoot]` | if `state.game.mode == "writing"`, updates `state.stats.count_hit/count_shoot` |
| `update_game_sens` | `height, dpi_scale, width` | `["update_game_sens", ...44 numbers]` | calls `controller/game_sens.update_game_sens(...result)` |

## Sync Points

- Add a worker function by updating `WorkerFunctionName`, `worker.js:onmessage`, the worker implementation, `index.js` response routing, and the caller payload
- `writing.check_stats()` passes `state.mode.writing.lines.array`, not the queue wrapper
- `check_writing_stats()` redraws submitted `Line[]` strokes to an OffscreenCanvas and compares alpha against `text_data`
- `update_game_sens()` tuple order must stay synchronized with `controller/game_sens.js:update_game_sens(...)` and the `Tuple<number, 44>` cast in `index.js`
- `post_worker_message()` accepts either a transfer list or `StructuredSerializeOptions`
