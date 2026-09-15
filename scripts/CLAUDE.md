# scripts/

Build/asset tooling, run by hand or via `package.json`. Vanilla Node ESM, no deps beyond `ffmpeg-static` (video + images), `subset-font` (fonts) and `@types/node`. Own `tsconfig.json` (extends root, adds `node` types). Not shipped — `docs/` is what deploys.

## Files
- `fragment_bg.js` — re-encodes the root `bg.mp4` (gitignored; the shipped copy is the R2 object, `cloudflare/CLAUDE.md`) into a fragmented MP4 that is progressive-download-playable, seamlessly loopable, and under 100 MB
- `update_html_bg.js` — regenerates the 16×27 average-color LQIP placeholder (base64 PNG data URI in `docs/index.html`) from `bg.mp4`'s FIRST FRAME. ffmpeg does crop/average/dim into raw RGB; the PNG is hand-encoded (CRC32 + zlib)
- `update_fonts.js` — regenerates `docs/fonts/Orbitron-subset.woff2` from the variable-font master, keeping only the glyphs the logo actually uses
- `update_images.js` — regenerates the two SHIPPED images from their masters via `ffmpeg-static`: `docs/bg.webp` ← `bg.mp4`'s first frame, `docs/icon.png` (128×128) ← `docs/favicon.png`
- `update_html_preload.js` — regenerates the `<link rel="modulepreload">` block in `docs/index.html` by walking the import graph from `docs/js/main.js`. **`pnpm run lint` runs it first**, so a stale block — not a build error, just a silently slower boot — can't survive a lint pass
- `serve_throttled.js` — bandwidth-throttled local static server for `docs/` (`pnpm run dev`); simulates a real network for the page's own assets — the BG video comes from `workers.dev` and is NOT throttled by it

## fragment_bg.js
- **In-place rewrite**: `SOURCE == TARGET == bg.mp4` (repo root). NOT idempotent — re-running re-encodes already-lossy output and the rename overwrites the only copy. Keep an untouched master elsewhere
- **Downscale to 1080p**: `-vf scale=-2:min(${MAX_HEIGHT}\,ih),fps=60,setpts=N/60/TB`. Height caps at `MAX_HEIGHT` (1080) only when the source is taller (no upscaling); `-2` keeps the aspect with an even width (1280×2160 → 640×1080). The comma inside `min()` MUST stay escaped (`\\,` in the template literal → `\,` for ffmpeg) or it reads as a filter separator
- **Loop seam**: this script does NOT precision-match track lengths — `worker/bg_worker.js` loops via MSE re-append on one timeline and takes the period from the VIDEO track's exact duration. `video_frames = read_video_frame_count()` keeps every frame (preserving the authored end→start visual loop) and IS the loop length. The seam stays clean as long as **audio ≥ video duration**: audio longer than the period is clipped per loop by the worker (harmless), audio SHORTER would gap the audio track every loop and stall playback. So `audio_samples = video_frames × VIDEO_FRAME_SAMPLES (800) + AUDIO_PAD_SAMPLES` deliberately overshoots by 4800 samples (0.1 s) — an explicit margin on top of FFmpeg's uncompensated AAC priming (~576 samples, no edit list in fragmented output), robust to encoder changes. Do NOT reintroduce floor-to-AAC-frame alignment or derive the worker's period from `buffered.end`. See `worker/CLAUDE.md:BG loop seam`
- **2-pass**: pass 1 is video-only (`-an`), pass 2 adds audio; both share `-passlogfile` (only x264 reads it). `TARGET_SIZE_BYTES = 99 MiB` is deliberate headroom under the 100 MB goal; `video_bitrate` is solved from target size minus the 128 kbps audio
- `-movflags +frag_keyframe+empty_moov+default_base_moof` is what makes it playable mid-download
- Audio filter `atrim → asetpts → apad → atrim` forces exactly `audio_samples` PCM samples into the encoder (pads silence if short, cuts if long). AAC then re-adds priming/end padding, so the muxed track ends slightly past `audio_samples` — intended
- `read_video_frame_count()` decodes the whole file and scrapes the LAST `frame=` line from ffmpeg stderr — slow but exact; the count drives every downstream number, and is intentionally read unscaled

## update_html_bg.js
- **The placeholder and `bg.webp` are the video's first frame on purpose**: both stand in for `bg.mp4` until it starts, so the swap to video is seamless. There is no separate image master — a `docs/bg.png` (the same frame from the pre-encode source) was one until 2026-09-15 and drifted from the shipped video (SSIM 0.978)
- ffmpeg graph: `crop` to the 16:27 grid aspect (centered) → `format=rgb24` → `scale=16:27:flags=area` (exact cell average, in RGB) → `colorchannelmixer` × `BRIGHTNESS = 0.85` → `rawvideo`. The PNG stays hand-encoded (IHDR/IDAT/IEND only): ffmpeg's PNG encoder can emit colour chunks (`cHRM`/`gAMA`) that shift the placeholder's colour in the browser
- Output base64 must contain no `=` or `_` (click-css would mangle them): the PNG is zero-padded to a multiple of 3 bytes to avoid `=`, and it throws if either char appears. Replaces the SINGLE PNG data URI in `index.html` (errors if not exactly one)

## update_fonts.js
- Orbitron is used in exactly ONE place — the `<h1>AIM DOJO</h1>` logo — so 37.64 KB of variable font shipped for **7 glyphs**. The WOFF2 subset is **1.68 KB (4.5 %)**
- **The glyph set is READ FROM `docs/index.html`'s `<h1>`, never hardcoded.** Change the logo text and re-running the script picks the new glyphs up; a hardcoded charset would silently drop letters instead. It throws unless the file has exactly one `<h1>`
- **The `wght` axis is deliberately NOT pinned.** Pinning to 700 saves another 0.58 KB, but the `@font-face` declares no `font-weight` descriptor, so the browser treats the face as 400 and synthesises bold for the `fw=700` heading. Pinning swaps that faux-bold for genuine Orbitron Bold outlines — a visual change, not an optimisation. To adopt it: pin the axis AND add `font-weight: 700`, accepting that the logo's stroke changes
- `Orbitron-VariableFont_wght.ttf` stays as the master, like `favicon.png` — deployed but never fetched
- `ShareTechMono-Regular.ttf` (41.8 KB) is deliberately untouched: it renders every string in the UI, including game names and toasts, so there is no safe fixed charset to subset against. A plain TTF→WOFF2 conversion would still save ~40 % and needs a different tool — `subset-font` has no keep-everything mode

## update_images.js
**`favicon.png` is a MASTER, not a shipped asset.** It deploys because the `og:image`/`twitter:image`/schema URL points at it, but only crawlers fetch it; the page references `icon.png`. `bg.webp`'s master is the gitignored root `bg.mp4` (first frame).
- **`rel="icon"` must NEVER point back at `favicon.png`** — 1638×1638 / 1.62 MB, downloaded in full by every uncached visitor as a tab icon. `icon.png` is the same art at 128×128 / 17.1 KB (99 % cut). og/twitter/schema deliberately keep the big URL (social cards want it, platforms cache it) — don't "unify" the four references
- The frame is 640×1080 — `fragment_bg.js`'s 1080p cap, 1:1 for the three `calc(100%/3)` strips. WebP `-quality 90` = **22.2 KB**, SSIM **0.990** against the video frame; the BG is dimmed (`brightness(.85)`/`.7`) and often blurred in-game anyway
- Re-run after replacing either master. Not in-place and safe to re-run — each encode writes a different path than it reads

## update_html_preload.js
- No bundler ⇒ the browser discovers each module only after parsing its importer. Boot graph = **35 modules / 317 KB / 17 levels deep**, so without preload the floor is ~17 sequential round trips; the generated block hands over every URL up front
- Measured A/B (headless Chrome, `performance.now()` in a module script right after `main.js`, cold cache, 4–5 runs): **40 ms** RTT **446 → 377 ms**, **100 ms** RTT **942 → 796 ms** — steady ~15 %, ranges never overlapping. **Never validate this on localhost** — at RTT ≈ 0 depth costs nothing and the difference vanishes into noise. Test server was HTTP/1.1 (6-connection cap throttles the preloads too); GitHub Pages is HTTP/2 and should do better — expected, NOT measured
- Idempotent and marker-free: it strips every existing `<link href="./js/…" rel="modulepreload">` line, then reinserts a freshly sorted block immediately above the `<script src="./js/main.js" type="module">` anchor, matching that line's indentation. Throws unless the anchor appears exactly once (same contract as `update_html_bg.js`'s single-data-URI check)
- Hrefs are sorted by path, not by graph depth — preloads all fire in parallel so order is irrelevant, and sorting keeps the diff stable
- **Workers are deliberately excluded.** `bg_worker.js` / `writing_worker.js` are fetched by `new Worker(url, { type: "module" })` with request destination `worker`; a `modulepreload` entry has destination `script` and would not be reused, risking a double fetch

## serve_throttled.js
- Hardcoded, NOT env-configurable: `HOST` 0.0.0.0, `PORT` 3000, `LIMIT_MB_S` 10. Throttling pauses the read stream and `setTimeout`-resumes to hit `sent_bytes / BYTES_PER_MS`
- Sends `cache-control: no-cache, no-store, must-revalidate` for HTML (forces re-fetch each load), supports Range (`206`) / `If-None-Match` / `If-Modified-Since` (`304`), and guards path traversal (the resolved path must stay under `docs/`)

## When you change…
- The default BG video pipeline: `fragment_bg.js` output feeds `docs/js/render/renderer_bg.js` + `docs/js/worker/bg_worker.js` — see root `CLAUDE.md:Change map`
- `bg.mp4` (after `fragment_bg.js`): re-run BOTH `node scripts/update_html_bg.js` (placeholder data URI) and `node scripts/update_images.js` (the shipped `bg.webp`)
- `docs/favicon.png`: re-run `node scripts/update_images.js` to refresh `docs/icon.png`
- The `<h1>` logo text or `Orbitron-VariableFont_wght.ttf`: re-run `node scripts/update_fonts.js`
- Add/remove/rename a module under `docs/js/`: `pnpm run lint` (runs `update_html_preload.js`)
