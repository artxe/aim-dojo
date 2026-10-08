---
paths:
  - "cloudflare/**"
---

# cloudflare/

The default BG video's host. Not shipped with `docs/`, not in `tsc -b` (lint only). Deploy with `pnpm run wrangler deploy`; the script pins `--config`, so every subcommand goes through it.

- `worker.js` streams the one R2 object `bg.mp4` (bucket `aim-dojo`, binding `BUCKET`) at `https://aim-dojo.artxe.workers.dev/bg.mp4`; every other path is 404. `docs/js/worker/bg_worker.js:BG_VIDEO_URL` points here
- A Worker, not the bucket URL: no domain is owned (R2 custom domains need a zone in the account), `r2.dev` is rate-limited and non-production, and `workers.dev` fails closed past its daily request cap. The page's IndexedDB cache keyed by `constants.version` keeps it to one request per visitor per version
- CORS lives here, not in the bucket's CORS policy (a binding read bypasses it). `ALLOWED_ORIGINS` must list every origin that serves `docs/` (`pnpm run dev` = `http://localhost:3000`). A Cloudflare error page carries no `access-control-allow-origin`, so the page's `fetch` rejects instead of caching an HTML body as the video
- `cache-control: no-store` on purpose: IndexedDB is the cache, and the URL never changes when the video does, so an HTTP cache entry could serve old bytes under a new version key
- Replacing the video: `node scripts/fragment_bg.js` on the root `bg.mp4` master → `node scripts/update_html_bg.js` + `node scripts/update_images.js` → upload to the bucket as `bg.mp4` → bump `constants.version`
