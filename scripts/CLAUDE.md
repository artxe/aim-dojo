# scripts/

Build/asset tooling, run by hand or via `package.json`. Vanilla Node ESM, no deps beyond `ffmpeg-static` + `@types/node`. Own `tsconfig.json` (extends root, adds `node` types). Not shipped — `docs/` is what deploys.

## Files
- `fragment_bg.js` — re-encodes `docs/bg.mp4` into a fragmented MP4 that is progressive-download-playable, seamlessly loopable, and under 100 MB
- `update_html_bg.js` — regenerates the 16×27 average-color LQIP placeholder (base64 PNG data URI in `docs/index.html`) from `docs/bg.png`. Hand-rolled PNG decode/encode + CRC32 + zlib, no image deps
- `serve_throttled.js` — bandwidth-throttled local static server for `docs/` (`pnpm run dev`); simulates a real network so progressive `bg.mp4` loading is observable

## fragment_bg.js
- **In-place rewrite**: `SOURCE == TARGET == docs/bg.mp4`. NOT idempotent — re-running re-encodes already-lossy output (generational loss) and the rename overwrites the only copy. Keep an untouched master elsewhere before running
- **Downscale to 1080p**: `-vf scale=-2:min(${MAX_HEIGHT}\,ih),fps=60,setpts=N/60/TB`. Height caps at `MAX_HEIGHT` (1080) only when the source is taller (no upscaling); `-2` keeps the aspect with an even width (1280×2160 → 640×1080). The comma inside `min()` MUST stay escaped (`\\,` in the template literal → `\,` for ffmpeg) or it reads as a filter separator
- **Loop seam**: this script does NOT precision-match track lengths — `worker/bg_worker.js` loops via MSE re-append on one timeline and takes the period from the VIDEO track's exact duration. `video_frames = read_video_frame_count()` keeps every frame (preserving the authored end→start visual loop) and IS the loop length. The seam stays clean as long as **audio ≥ video duration**: audio longer than the period is clipped per loop by the worker (harmless), audio SHORTER would gap the audio track every loop and stall playback. So `audio_samples = video_frames × VIDEO_FRAME_SAMPLES (800) + AUDIO_PAD_SAMPLES` deliberately overshoots by 4800 samples (0.1 s) — an explicit margin on top of FFmpeg's uncompensated AAC priming (~576 samples, no edit list in fragmented output), robust to encoder changes. Do NOT reintroduce floor-to-AAC-frame alignment or derive the worker's period from `buffered.end`. See `worker/CLAUDE.md:BG loop seam`
- **2-pass**: pass 1 is video-only (`-an`), pass 2 adds audio; both share `-passlogfile` (only x264 reads it). `TARGET_SIZE_BYTES = 99 MiB` is deliberate headroom under the 100 MB goal; `video_bitrate` is solved from target size minus the 128 kbps audio
- `-movflags +frag_keyframe+empty_moov+default_base_moof` is what makes it playable mid-download
- Audio filter `atrim → asetpts → apad → atrim` forces exactly `audio_samples` PCM samples into the encoder (pads silence if short, cuts if long). AAC then re-adds priming/end padding, so the muxed track ends slightly past `audio_samples` — intended
- `read_video_frame_count()` decodes the whole file and scrapes the LAST `frame=` line from ffmpeg stderr — slow but exact; the count drives every downstream number, and is intentionally read unscaled

## update_html_bg.js
- Only 8-bit RGB/RGBA PNG input is supported (throws otherwise). Center-crops `bg.png` to the 16:27 grid aspect, averages each cell (`SAMPLE_STEP = 2` subsampling), dims by `BRIGHTNESS = 0.85`
- Output base64 must contain no `=` or `_` (click-css would mangle them): the PNG is zero-padded to a multiple of 3 bytes to avoid `=`, and it throws if either char appears. Replaces the SINGLE PNG data URI in `index.html` (errors if not exactly one)

## serve_throttled.js
- Hardcoded, NOT env-configurable: `HOST` 0.0.0.0, `PORT` 3000, `LIMIT_MB_S` 10. Throttling pauses the read stream and `setTimeout`-resumes to hit `sent_bytes / BYTES_PER_MS`
- Sends `cache-control: no-cache, no-store, must-revalidate` for HTML (forces re-fetch each load), supports Range (`206`) / `If-None-Match` / `If-Modified-Since` (`304`), and guards path traversal (the resolved path must stay under `docs/`)

## When you change…
- The default BG video pipeline: `fragment_bg.js` output feeds `docs/js/render/renderer_bg.js` + `docs/js/worker/bg_worker.js` — see root `CLAUDE.md:Change map`
- `docs/bg.png`: re-run `node scripts/update_html_bg.js` to refresh the placeholder data URI
