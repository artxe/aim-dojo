---
paths:
  - "scripts/**"
---

# scripts/

Node ESM asset tooling, not shipped; own `tsconfig.json` (extends root, adds `node` types). Deps: `ffmpeg-static`, `subset-font`. File shape is inverted here: the init block is the program, helpers below it are hoisted.

## fragment_bg.js
- In-place rewrite: `SOURCE == TARGET == bg.mp4` at the repo root (gitignored; the shipped copy is the R2 object). NOT idempotent: re-running re-encodes lossy output and overwrites the only copy. Keep an untouched master elsewhere
- Downscale `-vf scale=-2:min(${MAX_HEIGHT}\,ih),fps=60,setpts=N/60/TB`: caps height only when taller, `-2` keeps an even width. The comma inside `min()` must stay escaped or ffmpeg reads a filter separator
- Loop period = the video frame count from `read_video_frame_count()` (decodes the whole file, exact, read unscaled); the worker loops by MSE re-append on one timeline from the VIDEO track's duration. The seam holds only while audio ≥ video duration, so `audio_samples = video_frames × VIDEO_FRAME_SAMPLES + AUDIO_PAD_SAMPLES` deliberately overshoots. Do not reintroduce floor-to-AAC-frame alignment or derive the period from `buffered.end`
- 2-pass (pass 1 `-an`, pass 2 adds audio, shared `-passlogfile`); `video_bitrate` is solved from `TARGET_SIZE_BYTES` minus the audio. `-movflags +frag_keyframe+empty_moov+default_base_moof` makes it playable mid-download
- The audio filter `atrim → asetpts → apad → atrim` forces exactly `audio_samples` PCM samples; AAC re-adds priming, so the muxed track ends slightly past it (intended)

## update_html_bg.js
- The placeholder (16×27 average-colour PNG data URI in `docs/index.html`) is `bg.mp4`'s FIRST frame, like `docs/bg.webp`; there is no separate image master
- ffmpeg does crop/average/dim into raw RGB; the PNG is hand-encoded (IHDR/IDAT/IEND only), because ffmpeg's PNG encoder can emit colour chunks that shift the browser colour
- The base64 must contain no `=` or `_` (click-css would mangle them): the PNG is zero-padded to a multiple of 3 bytes and the script throws if either appears. Replaces the single data URI; errors unless exactly one

## update_fonts.js
- The glyph set is read from `docs/index.html`'s single `<h1>`, never hardcoded; it throws unless exactly one `<h1>` exists
- The `wght` axis is deliberately not pinned: `@font-face` declares no `font-weight`, so the browser synthesizes bold for the heading; pinning swaps that for real Bold outlines, a visual change. Adopt it only together with `font-weight: 700`
- `Orbitron-VariableFont_wght.ttf` stays as the master (deployed, never fetched); `ShareTechMono-Regular.ttf` stays untouched (it renders every UI string, no safe charset)

## update_images.js
- `docs/favicon.png` is a MASTER: og/twitter/schema keep its URL, `rel="icon"` must point at `docs/icon.png`, never back at `favicon.png`. Do not unify the four references
- `docs/bg.webp` ← `bg.mp4`'s first frame; `docs/icon.png` ← `favicon.png`. Not in-place, safe to re-run

## update_html_preload.js
- `pnpm run lint` runs it first, so a stale `<link rel="modulepreload">` block (a silently slower boot, not an error) cannot survive a lint pass
- Idempotent and marker-free: strips every existing `./js/…` modulepreload line, walks static imports from `docs/js/main.js`, reinserts a path-sorted block above the `main.js` `<script>` `ANCHOR`, matching its indentation. Throws unless the anchor appears exactly once; editing that tag means editing `ANCHOR`
- Workers are excluded: `bg_worker.js`/`writing_worker.js` are fetched with destination `worker`, and a `modulepreload` (destination `script`) would not be reused

## serve_throttled.js
- `pnpm run dev`. `HOST`/`PORT`/`LIMIT_MB_S` are hardcoded. Sends `no-store` for HTML, supports Range/`If-None-Match`/`If-Modified-Since`, guards path traversal under `docs/`. The BG video comes from `workers.dev` and is not throttled by it

## When you change
- `bg.mp4` (after `fragment_bg.js`): run BOTH `update_html_bg.js` and `update_images.js`
- `docs/favicon.png`: `update_images.js` · the `<h1>` text or the Orbitron master: `update_fonts.js`
- Add/remove/rename a module under `docs/js/`: `pnpm run lint`
