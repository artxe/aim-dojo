# TODO

## Owner decisions

- The default background is third-party footage in a public repository: `docs/bg.webp` (committed, served by GitHub Pages), the 16x27 placeholder in `docs/index.html` and the video in the R2 bucket behind `cloudflare/worker.js` are edited from a fan-recorded video of aespa's Winter (uploaded by VirginSnow0101, `LICENSE.md` section 4.1(a)); the notice and takedown clause do not grant the right to publish it. Options: (a) keep it, accepting the takedown risk (only with the uploader's consent); (b) replace video, still and placeholder with the owner's own or a CC0 / licensed clip, then rerun `scripts/update_html_bg.js` and `scripts/update_images.js`; (c) drop the default background and keep only user uploads. Recommended: (b).
