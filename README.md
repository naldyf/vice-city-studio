# Vice City — GTA 6 Cover Art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/naldyf/vice-city-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/naldyf/vice-city-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A minimal showcase for a Gemini-generated Vice City cover: a multi-panel
GTA-style cover at `app/cover.jpg` — a getaway driver in a pink suit leaning
on a sports car under a neon sunset, with a helicopter spotlight, a speedboat
chase and a neon nightclub in the surrounding panels. `app/index.html`
displays the cover full-width, offline, with no external requests and no
Rockstar Games logo, artwork or font. Everything here is original fan-made art.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` to `/output` and
writes `/output/dossier.json` with the vendored make.fun library. It runs
offline and produces identical bytes on every run.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vf79kset&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
