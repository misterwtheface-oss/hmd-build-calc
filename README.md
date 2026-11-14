# How Many Dudes? Codex

Reference for How Many Dudes?: every Dude, Relic, Family and mechanic, with the game's own art, and the links between
them (Family membership, Dude / Family relic pools, shared mechanics, Dudes and relics that name each other).
Mobile first.

Live: https://misterwtheface-oss.github.io/hmd-build-calc/

## Build
```
python tools/build_data.py [--strict]   # reads ../_hmd_extract (local only), writes data.js + assets/icons + precache-list.json
node tools/render_check.js               # renders every tab, filter and detail view; fails on errors or missing art
node tools/serve.mjs                     # local preview; stop it when done
```
`git config core.hooksPath .githooks` once per clone: the pre-commit hook re-stamps cache-bust tokens.

Data comes from `../_hmd_extract/data/entities.json` (`tools/build_entities.py` there): Dude -> Family and relic ->
pool are decided from the game code; roles are a draft taxonomy (`data/roles_proposed.json`) under review.

## Art
All art goes through the `img` helper and the `*Chip` / `mini` functions in app.js. Icons are the game's own sprites
(96 px WebP, plain downscale), matched through the game's `sprite_names.json`; a missing sprite fails the build.
