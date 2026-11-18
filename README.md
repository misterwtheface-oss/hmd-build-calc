# How Many Dudes? Codex

Reference for How Many Dudes?: every Dude, Relic, Family and mechanic, with the game's own art, and the links between
them (Family membership, Dude / Family relic pools, synergies, Dudes and relics that name each other).
Synergies: an effect that raises a stat links to one that scales with it; an effect that triggers an event (Taunt,
Block) links to ones that react to or improve it. A Dude counts with all his relics. Roles derive from the same tags.
Draft: preview up to 3 offers against a saved build and see where they overlap.
Mobile first.

Live: https://misterwtheface-oss.github.io/hmd-build-calc/

## Build
```
python tools/build_data.py [--strict]   # reads ../_hmd_extract (local only), writes data.js + assets/icons + precache-list.json
                                         # + manifest.webmanifest and assets/app install icons (Spell Book sprite)
node tools/render_check.js               # renders every tab, filter and detail view; fails on errors or missing art
node tools/serve.mjs                     # local preview; stop it when done
```
`git config core.hooksPath .githooks` once per clone: the pre-commit hook re-stamps cache-bust tokens.

Data comes from `../_hmd_extract/data/entities.json` (`tools/build_entities.py` there): Dude -> Family and relic ->
pool are decided from the game code; synergy facets, edges and roles come from `tools/effect_tags.py` there.

## Art
All art goes through the `img` helper and the `*Chip` / `mini` functions in app.js. Icons are the game's own sprites
(96 px WebP, plain downscale), matched through the game's `sprite_names.json`; a missing sprite fails the build.
