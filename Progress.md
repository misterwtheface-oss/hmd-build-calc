# Progress

## State
- 2026-11-14 to 2026-11-18: first build through the Draft's trinkets, food and landscape layout; detail in
  [Progress_2026-11-14_to_18.md](Progress_2026-11-14_to_18.md).

- 2026-11-19 to 2026-11-23: magnitude n, channels (DPS, Crit, Damage Dealt), Enemies tab, Draft offer box / Team
  view, Dude base stats, pool-odds weighting, first Dude audits; detail in
  [Progress_2026-11-19_to_23.md](Progress_2026-11-19_to_23.md).

- 2026-11-24: Dude page reorder + base stat bars, Top trinkets / food and Recommended on (held picks from a
  function over code tags), Distance Traveled channel, Back keeps your place, Draft weighting grow / rare 2; detail in
  [Progress_2026-11-24.md](Progress_2026-11-24.md).

- 2026-11-25 (1): Draft role fill (user: early deaths come from teams missing a role, most of all recovery). Effect
  role per Dude, Tank / DPS / Healer / Support (Healer split from Support, user), primary + optional secondary (half);
  set in the Dude audit, until then mapped from the game's DudeType.roles (extract tools/effect_roles.py ->
  data/effect_roles.json; Regular Dude has no code role). A Dude offer of a new type while the team has < 5 types
  (Act 1 brings five) adds 40 x the share of missing roles it fills x (missing / type picks left); shown as "Fills
  <role>" on the offer. Dude page: Effect role line. Simulated: Act 1 teams with all four roles 17% -> 54% (ceiling
  57% with three random Dudes per offer), synergy unchanged.
- 2026-11-25 (2): Pocket Dice (user: dice are best spent rerolling Flyers and Trinket Stashes; the Merchant can be
  restocked with cash, relic stashes are left alone). Draft Offers: a Pocket Dice count (- / +). For three Dude or
  three trinket offers it scores everything a reroll could bring (new Dude types, summons excluded / unbound
  trinkets scored on the free Dudes; uniform draw assumed), and shows Reroll when the expected best of a fresh three
  beats the best offered by more than a die saved is worth (user: save for later offers): the die's expected gain at
  each remaining offer (5 Flyers in Act 1, 5 Trinket Stashes), the dice-th largest, 0 with a die to spare; else Keep.
  The Reroll button spends a die and clears the offers. Memoised per state (~50-90 ms on desktop).
- 2026-11-25 (3): Offer draws decoded (extract docs/offer_draws.md): Trinket and Relic Stashes draw every eligible
  option equally (array_get_random), so the Draft's uniform assumption holds. Flyers are weighted: an undiscovered
  Dude Type 3, a discovered one 1 (equal once all are discovered); a new player's first Flyer shows 2 Dudes. The
  first decode was aimed 0x100000 low (wrong function), hence its fragments.
- 2026-11-25 (4): Reroll advice judged on the typical result (user: one outlier, Necrodude 209 on a Viking / Psionic /
  General + Ancient Sword build, lifted the average best of a fresh three to 25.3 while the median was 11.9): Reroll
  when the median best of a fresh three beats the best offered by more than a saved die is worth; the line shows the
  chance a fresh three beats the best offered ("63% better · 11.9 vs 9.3").
- 2026-11-25 (5): Necrodude check (user). Code: Bony Backhand's on-summon taunt runs taunt_enemies_in_range ->
  taunt_enemy, which emits on_taunt_dude for any taunter on the Dudes' team (no summon check); Ancient Sword's handler
  (anon@29619) checks only its cooldown and summon_chance, then summons a Skeledude at the taunter: the two loop,
  capped by the Sword's cooldown (extract code/decomp_taunt). Kept as script options, live unchanged: WEIGHT.exp (grow
  power), dedupe2 (A: drop a two-step pair whose middle effect already pairs directly with the consumer), growOn
  "build" (B: a channel grows only with the build's own effects, the offer's add linearly). tools/weight_preview.js
  compares them (simulated drafts + top offers on the user's build and 4 simulated builds; summons no longer offered
  in the simulation): report extract docs/weight_scenarios_2026-11-25.md.
- 2026-11-25 (6): A and B switched on (user): WEIGHT dedupe2 true, growOn "build". User's build: Necrodude 209.6 ->
  66.8, Knight 39.5 next.
- 2026-11-25 (7): In-game glossary tooltips (user). Tapping a highlighted keyword in any Dude ability, relic, trinket
  or enemy trait opens the game's own Dudex popup for that thing: every entry the game lists for it (code lists, not
  text; extract tools/glossary_map.py -> data/glossary.json), the tapped one first in mustard when the names match.
  Entries: 66 glossary terms, 34 stats, Dude abilities (tap = his page), 7 consumables; term numbers come from the
  term's Dude (Revenant 10% = Lich ability). A keyword inside an entry opens that term's own list (‹ back). Bottom
  sheet on a phone, centred box when wide. FEATURES.glossary. Two traits (Phased, Hellfire) build their list through
  a call the dump can't read: no popup (their text names no mechanic). render_check opens all 621 popups.

- 2026-11-25 (8): Held picks weigh sizes, not tag counts (user, Diss Track audit). Extract tools/damage_sources.py:
  every effect whose code deals damage to enemies (67) now feeds Damage Dealt scalers (Diss Track, Crazy Straw,
  Medical License, Lifesteal); tools/damage_size.py sizes each Damage Dealt / Healing link as a share of the Dude's
  own DPS (user: damage dealt, healed or avoided weigh the same), over one median reference. Skeledude-only stats
  (Bone Axe) no longer count for the Necrodude. All assumptions in extract data/scoring_config.json. Recommended on
  and Top trinkets rebuilt: 31 of 49 Dudes changed.

- 2026-11-26: Draft role fill staged by pick (user: it weighed too high early, crowding out shared mechanics).
  Role weight per Dude pick 0/3/3/40/100 (app.js ROLE.stage): the 2nd and 3rd Dude are chosen mostly on synergy, the
  4th and 5th must cover every role, a secondary counting as covered (a primary still scores more). 300 simulated
  drafts (tools/weight_preview.js; report extract docs/role_stage_2026-11-26.md): role fill overrules synergy on the
  2nd / 3rd Dude 14% / 9% (was 35% / 33%); Act 1 teams with every role covered 54% (was 62%). Only 5 of 50 Dudes
  have a secondary role, all mapped from code; none audited yet.

- 2026-11-26 (2): Draft roles = our Functions (user), not the game's roles: Offense, Defense, Support, Healing.
  Healing is a Function of its own, split off Support (Heal focus, 45 effects), shown green; Defense moved from olive
  to a yellower tone. Each Dude's role is scored from his ability (3) and his own relics (1 each): primary = top,
  secondary = next if it reaches 3 (extract tools/effect_roles.py); 22 Dudes now have a secondary (was 5). Simulated
  drafts: Act 1 teams with every role covered 78% (was 54% on the game's roles); report extract
  docs/role_functions_2026-11-26.md.
- 2026-11-26 (3): Top trinkets cap by the trinket's own score (user, Baseball Bat revisit): a full trinket (10 Dudes)
  keeps the Dudes who score it highest; the lowest moves to his next choice (extract held_picks.py assign(), deferred
  acceptance, then the floor of 2). Alien no longer holds the Bat (0.94, one Probe link); Ghost does (2.57). 7 Dudes
  changed; extract docs/held_picks_audit.md § Baseball Bat.

- 2026-11-26 (4): Debuffs split by what they do (user): enemies take more damage = Offense · Debuff, enemies deal less
  = Support · Debuff. Read from code (the enemy buff's stats, Toxin's buff = Attack Power down, the effect's variable
  names; extract tools/code_tags.py debuff_side): 12 Support, 5 Offense, 3 mixed kept Offense until ruled (Veneers,
  Psychic Hood, Saddle Horn). Roles moved: Assassin gains secondary Support, Explorer gains Support, Vampire loses
  Offense.

## Open
- [ ] Mixed debuffs (both sides): Veneers, Psychic Hood, Saddle Horn stay Offense (user 2026-11-26) until each one's Dude audit (Football, Psionic, Cowboy); extract tools/code_tags.py debuff_side.
- [ ] Held picks audit (user 2026-11-24): one trinket per session, alphabetical, then food, from each trinket's
  Recommended on section; extract docs/held_picks_audit.md (rule HMD-picks-pace). ADHD, Airhorn done (2026-11-25: Regular Dude excluded like summons; AoE gap
multiplier for AoE-giving held items); Bad Credit done 2026-11-25 (Damage Taken consumer fed by Taunt and
Intercept Damage, less own Evade / Deflect / Block; self vs ally damage stores); Bag of Nuts done 2026-11-25
(Direct hit reactions sorted per hit / per damage / once by tools/hit_kind.py; On Direct Crit / On Lifesteal fed by hit rate
gated by the chance; own-roll outputs weighed by uptime); Baseball Bat, Black Belt, Bongos done 2026-11-25 (every
Direct hit source weighed in hits per second, held_picks.py --rates; Bongos floor 1); Crazy Straw done 2026-11-25 (own-roll uptime also for a self-given chance stat, plus the Dude's own
Lifesteal; Tennis out; thin holders Cave / Football / Cowboy revisit at audit end); Cutoff Jorts done 2026-11-25 (Dash target kind
from code, extract tools/dash_target.py: farthest / far ally x1.5, nearest x0.5 on distance links); Diss Track done 2026-11-25 (damage sources + sizes in one unit, extract data/scoring_config.json); Ear Gauges 2026-11-26 (Tank trinket like Bad Credit: Damage Taken + own-save detractor; knockout full heals x0.1 as Healing; Knock Out saves tagged from code, extract tools/ko_saves.py; done, Farmer source check / per-source boosts / 12 s heal rate left as is); next: Face Tattoo. Bounds 2-10 Dudes per trinket (upper "for now").
- [ ] User check on a real phone: the keyboard stays up between Draft offer picks (tested headless only).
- [ ] Flyer rerolls: does a reroll leave out the Dudes / trinkets just shown? (extract docs/offer_draws.md, Open)
- [ ] Draft weighting: gentler curve (WEIGHT.exp 1.25) kept as an option, not live; report extract
  docs/weight_scenarios_2026-11-25.md.
- [ ] Backlog (user 2026-11-25, later): a "discovered Dudes" setting so the Dude reroll advice weighs undiscovered Dude
  Types 3:1 as the game does (extract docs/offer_draws.md).
- [ ] Trinkets: no Function / Focus tags yet (needs their code decoded like relics); user review of trinket tags.
- [ ] User audit of Function / Focus tags (extract data/code_tags_audit.md) and synergy edges; refactor as needed.
  In progress as the Dude audit (alphabetical, one Dude at a time, user analysis + code answers only, no Claude
  opinion): extract docs/dude_audit.md. Agent Dude done 2026-11-23 (incl. relic blurbs); Alien Dude done 2026-11-23 (incl. relic blurbs).
