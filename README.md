# Vice City Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/naldyf/vice-city-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/naldyf/vice-city-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice City Studio turns any photo into GTA-style cover art — the multi-panel
poster look with bold caption lettering and a Vice City neon-sunset grade —
and exports it as a hi-def PNG to share. It runs offline in a desktop browser
from its own static files: photos never leave the machine.

The front page now features a finished cover: a Gemini-generated Vice City
multi-panel cover (getaway driver in a pink suit, helicopter, speedboat chase,
neon nightclub) at `app/cover.jpg`. The Studio tool itself is still available
at `app/studio.html`.

## How it works

1. **Photos** — upload your own (or try a sample). The first photo fills all
   three panels; add more to give each panel its own photo.
2. **Panels** — click a panel in the live preview to select it, drag the photo
   to reposition it, zoom to crop it. Hero panel plus two supporting panels,
   arranged for the export size.
3. **Grade** — the GTA-ify engine: contrast and saturation, a gentle
   posterize blended back with the original so faces keep their modelling, a
   neon-sunset duotone tint, halftone print dots, grain and a vignette.
   Three grades (Vice Sunset, Neon Night, Golden Hour) plus a strength slider.
4. **Caption** — bold condensed lettering (Anton, shipped under the SIL Open
   Font License) with a neon offset shadow, and a letterspaced tagline.
5. **Export** — one click per size: Landscape 1920 × 1080, Square 1080 × 1080,
   Portrait 1080 × 1350, Story 1080 × 1920 — or export all four at once.

Everything is original: no Rockstar Games logo, artwork or font. The fonts
(Anton, Oswald) ship under the SIL Open Font License in `app/fonts/`, and the
sample photos were made with an image model.

## Run it

```sh
node serve.ts          # app/ on http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with the vendored make.fun
library. It runs offline and produces identical bytes on every run.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vf79kset&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
