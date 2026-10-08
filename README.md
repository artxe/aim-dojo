# AIM DOJO

Train your aim. Unify your sensitivity. One trainer for all your FPS games.

**Play:** https://artxe.github.io/aim-dojo/

## Modes

| Mode | Trains | Score |
|---|---|---|
| Aim Booster | Large swings on a growing stream of 2D targets | Bit/s |
| Precision | Arriving on a tiny target and stopping there | Bit/s |
| H-Tracking | Horizontal tracking with periodic blinks | Bit/s |
| Writing | Handwriting with the crosshair | Px/s |

Precision and H-Tracking adapt target size and speed to hold you at 70\~85% accuracy. Find a comfortable CPI in Aim Booster, then alternate Writing and Aim Booster to fine-tune it.

## Sensitivity

One sensitivity, matched across games by FOV axis and engine curve: APEX LEGENDS, Black Desert, Counter-Strike 2, Fortnite, League of Legends, Minecraft, Overwatch, PUBG: BATTLEGROUNDS, RAINBOW 6, Roblox, Sudden Attack, VALORANT. Each card gives the in-game value, hipfire and per-scope ADS, and eDPI. The CPI Normalizer takes your current CPI, game and in-game sensitivity and returns the mouse CPI that keeps the same turn per inch once you move to the recommended sensitivity.

## Requirements

PC with a mouse. Google Chrome is recommended: other browsers cannot read raw mouse input. A run takes pointer lock and fullscreen.

## Development

```
pnpm install
pnpm run dev              # throttled static server on http://localhost:3000
pnpm run lint             # modulepreload block + eslint --fix + tsc -b
pnpm run wrangler deploy  # background video Worker
```

`docs/` deploys as-is to GitHub Pages. Agent notes live in `CLAUDE.md` and `.claude/`.

## License

Dual license, see [LICENSE.md](LICENSE.md): `docs/index.html` and `docs/js/` are proprietary, the deployed game is free to play.
