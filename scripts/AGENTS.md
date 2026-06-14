# scripts/

Build/asset tooling run by hand or via `package.json` (`dev`, `lint`). Vanilla Node ESM, no deps beyond `ffmpeg-static` + `@types/node`. Own `tsconfig.json` (extends root, adds `node` types). Not shipped — `docs/` is what deploys.

## Files
- `fragment_bg.js` — re-encodes `docs/bg.mp4` to a fragmented MP4 that is progressive-download-playable, seamlessly loopable, and under 100 MB
- `update_html_bg.js` — regenerates the 16×27 average-color LQIP placeholder (base64 PNG data URI in `docs/index.html`) from `docs/bg.png`. Hand-rolled PNG decode/encode + CRC32 + zlib, no image deps
- `serve_throttled.js` — bandwidth-throttled local static server for `docs/` (`npm run dev`); simulates a real network so progressive `bg.mp4` loading is observable

## fragment_bg.js — non-obvious
- **In-place rewrite**: `SOURCE == TARGET == docs/bg.mp4`. NOT idempotent — re-running re-encodes the already-lossy output (generational quality loss) and the rename overwrites the only copy of the source. Keep an untouched master elsewhere before running.
- **Downscale to 1080p**: encode `-vf` is `scale=-2:min(${MAX_HEIGHT}\,ih),fps=60,setpts=N/60/TB`. Height is capped at `MAX_HEIGHT` (1080) only when the source is taller (no upscaling); `-2` keeps aspect ratio with an even width (1280×2160 → 640×1080). The comma inside `min()` MUST stay escaped (`\\,` in the template literal → `\,` to ffmpeg) or it reads as a filter separator. `read_video_frame_count` counts frames and is intentionally left unscaled.
- **Loop seam**: this script does NOT precision-match track lengths — `worker/bg_worker.js` loops via MSE re-append on one timeline (`timestampOffset = loop_idx * period`) and takes the period from the **video** track's exact duration. `video_frames = read_video_frame_count()` keeps every frame (preserving the authored end→start visual loop) and IS the loop length. The seam stays clean as long as one invariant holds: **audio ≥ video duration**. Audio longer than the period just overlaps into the next loop (MSE coalesces it, harmless); audio SHORTER would gap the audio track every loop and stall playback (`renderer_bg.js` throws on the resulting `waiting`/frozen `currentTime`). So `audio_samples = video_frames × VIDEO_FRAME_SAMPLES (800) + AUDIO_PAD_SAMPLES` deliberately overshoots the video length by `AUDIO_PAD_SAMPLES` (4800 = 0.1 s) — an explicit safety margin so coverage does NOT depend on the AAC encoder's uncompensated priming (FFmpeg's native AAC prepends ~576 priming samples with no edit list in fragmented output, which already pushes the muxed audio past video, but the margin makes it robust to encoder changes). Do NOT reintroduce floor-to-AAC-frame alignment or derive the worker's period from `buffered.end`. See `worker/CLAUDE.md` BG-loop bullet.
- **2-pass**: pass 1 is video-only (`-an`), pass 2 adds audio; both share `-passlogfile` (only x264 reads it). `TARGET_SIZE_BYTES = 98 MiB` is deliberate headroom under the 100 MB goal; `video_bitrate` is solved from target size minus the 128 kbps audio.
- `-movflags +frag_keyframe+empty_moov+default_base_moof` is what makes it playable mid-download.
- Audio filter `atrim → asetpts → apad → atrim` forces exactly `audio_samples` PCM samples into the encoder (pads silence if the source audio is short, cuts if long). The AAC encoder then re-adds priming/end padding on top, so the muxed track ends slightly past `audio_samples` — which is fine and intended (see Loop seam).
- `read_video_frame_count()` decodes the whole file and scrapes the **last** `frame=` line from ffmpeg stderr — slow but exact; the count drives every downstream number.

## update_html_bg.js — non-obvious
- Only 8-bit RGB/RGBA PNG input is supported (throws otherwise). Center-crops `bg.png` to the 16:27 grid aspect, averages each cell (`SAMPLE_STEP=2` subsampling), dims by `BRIGHTNESS=0.85`.
- Output base64 must contain no `=` or `_` (click-css in `index.html` would mangle them): the PNG is zero-padded to a multiple of 3 bytes to avoid `=`; it throws if either char appears. Replaces the **single** PNG data URI in `index.html` (errors if not exactly one).

## serve_throttled.js — non-obvious
- Env knobs: `HOST` (127.0.0.1), `PORT` (3000), `LIMIT_MB_S` (10). Throttle works by pausing the read stream and `setTimeout`-resuming to hit `sent_bytes / BYTES_PER_MS`.
- Sends `cache-control: no-store` (forces re-fetch each load), supports Range (`206`)/`If-None-Match`/`If-Modified-Since` (`304`), and guards path traversal (resolved path must stay under `docs/`).

## When you change…
- The default background video pipeline: `fragment_bg.js` output feeds `docs/js/render/renderer_bg.js` + `docs/js/worker/bg_worker.js` — see root `Change map → Change default background video`.
- `docs/bg.png`: re-run `node scripts/update_html_bg.js` to refresh the placeholder data URI.
- Note: `AGENTS.md` in this folder is a byte-for-byte copy of this file (repo convention). Edit both, or copy `CLAUDE.md` over `AGENTS.md`.
