# Progress

## State
- 2026-11-14 to 2026-11-18: first build through the Draft's trinkets, food and landscape layout; detail in
  [Progress_2026-11-14_to_18.md](Progress_2026-11-14_to_18.md).

- 2026-11-19 to 2026-11-23: magnitude n, channels (DPS, Crit, Damage Dealt), Enemies tab, Draft offer box / Team
  view, Dude base stats, pool-odds weighting, first Dude audits; detail in
  [Progress_2026-11-19_to_23.md](Progress_2026-11-19_to_23.md).

- 2026-11-24: Dude page base stats carry a bar each (share of that stat's largest value among all Dudes; Draft
  team-view totals stay bare). Effect edges bar higher-order groups (Damage, Crit, Defense, Health, Mobility, Summons:
  EDGE_GROUPS in app.js) by how many of his ability + relics touch each, with that group's facet chips under the bar
  (tap opens the channel): 540 -> 180 bars over 53 Dudes, bars at 1: 427 -> 45. Role: / Function: labels before chips.
  Function rows: one per primary Function, its name once ("Support:") then each Focus chip with ×n.
- 2026-11-24 (2): Dude page reorder (user): hero = icon | name + Family chip / Role: chips; stats; Effect functions
  (one row per Function); Effect edges: each group bar (n = effects touching it) has two folds under it, closed by
  default, side by side: Producer (Gives / Triggers) and Consumer (Scales / On / Boosts) chips; Intrinsic effect;
  Relics; Synergy Dudes / relics; Indirect synergies; Family (chip + its Dudes); Names / Named by kept at the end.
  Relic priority: the user's order per Dude from the audit, _hmd_extract/data/relic_priority.json -> relic pr ->
  relics sorted with #n on the card; empty so far (Agent, Alien to backfill).
- 2026-11-24 (3): Indirect synergies list only chains that end at the page's own effects (what boosts him:
  Evasion -> Golden Glove -> Hit -> Probe), not the chains he starts for others (user). All pages (Dude, relic,
  trinket, food). Alien 319 -> 51 rows; all Dudes 6615 -> 3241; 20 Dudes have none.
  Grouped under the own effect each chain feeds (icon + ability / relic name header), in his kit order; one row per
  linking effect: [Golden Glove] Triggers Hit from Gives Evasion, the chips open the channel pages instead of
  listing every provider (user). Alien 51 rows -> 4.
- 2026-11-24 (4): Dude page: Top trinkets and Top food sections after Relics, 4 each with #1-#4, from the extract's
  data/held_picks.json -> dude picks {tr, fd} (build_data warns on an unknown id). DRAFT: Claude's broad pass for 50
  Dudes (no Echo / Skeledude / Streaker) from ability + relics + base stats, a why line per Dude in the file; main
  dishes only (no extra-stat pick yet). User refines.
- 2026-11-24 (5): held picks rules (user): purpose = weight trinket offers toward a present Dude (5 Dudes, one
  trinket each, limited rerolls; the offer still weighs every other relic). Every trinket in at least 2 Dudes' top 4
  (lower bound, met: 32/32); upper bound to be set. Method: per Dude vs all trinkets, then per trinket vs all Dudes.
  Rulings: Baseball Bat = a Direct Crit every 3s, on every On Hit / On Crit kit (28 lists); Shovel = Zombie +
  Frankendude (Lich dropped); Fedora = Max HP + Attack Power payoffs with no relic needing copies (Manager,
  Construction, Druid; more candidates in the screen). Code: Fedora walks Roster order, which skips summon types;
  the knocked-out count Shovel / Organ Bucket read skips summons (dude_knock_out, roster_refresh_num_unconscious_dudes).
- 2026-11-24 (6): Trinket and food pages: Recommended on section (one shared pickedBy), the Dudes whose top 4 hold it,
  one row per placement #1-#4 (empty placements skipped); for the user's per-trinket review before the upper bound.
- 2026-11-24 (7): Distance Traveled synergy channel (user): the six "X feet he travels" effects scale with it, fed by
  Run Speed and every Dash (Tractor Beam, Lasso, Blitz too); code: position delta per step, so Dashes count (extract
  docs/effect_tagging.md). 155 links. Held picks: ADHD #1 for Electrician (Fuzzy Socks: Dash + Run Speed twice).
- 2026-11-24 (8): Run Speed dropped as a Distance Traveled provider (user: it does not add distance travelled; Dash
  does). Channel now Dash only: 48 links. Fuzzy Socks keeps its own Run Speed link, so ADHD still pays twice (user).
- 2026-11-24 (9): Teleport and Thrown added as Distance Traveled sources from code: teleports count in full (38 links);
  a throw stuns at launch, so it counts for River Raft, Wave Function, Cutoff Jorts and Taser but not Fuzzy Socks or
  Spell Book, and Ground Wire / Mag Boots clear the stun only on landing (4 links: Electrician's own throws). 90 links.
- 2026-11-24 (10): Top trinkets / Recommended on now come from a function (user: code-backed, never a hand list):
  extract tools/held_picks.py --assign --write. Score = the Draft's log weighting over wield links (ability link 1,
  relic link = pool odds), each Dude's top 4, every trinket on 2-10 Dudes (upper bound "for now"); summons
  (DudeType.temporary) get none. Soccer Dude's Shot tagged as Direct Damage from code (links him to On Hit effects).
  Food picks still the draft list.
- 2026-11-24 (11): Back keeps your place: a page reached by Back (or the phone's back) returns to where you left it
  scrolled (Dude page -> linked trinket -> Back lands at the same spot); a newly opened page starts at the top. The
  scroll is stored on the history entry (app.js open() / route()).
- 2026-11-24 (12): Draft weighting = grow, rare 2 (user: overlaps should gain value as the build's focus forms, the
  Venn centre). A channel scores rarity^2 x (summed pair weights)^1.5, so each overlap adds more than the last;
  rarity^2 keeps the focus off generic stats, which have the most overlaps. Gated effects (user): a facet in a
  sentence that opens with a condition ("When X, ...") weighs the odds X is open: per gate, the summed weights of the
  build's effects that open it, capped at 1 (extract effect_tags gates / gate_src, AMBIENT = Hit, Hit Taken, Fatal
  Damage, Knock Out, Thrown, Cleaved always open (user 2026-11-25: thrown / cleaved happen naturally in a fight); a gate the effect opens itself counts open). Simulated drafts (200, gate-aware
  measure): Families 4.9 -> 4.0, top-3 channel share 68% -> 70%, builds led by Attack Power / DPS / Damage Dealt
  22% -> 8%. Trinket picks regenerated with the same formula (extract tools/held_picks.py reads mode, rare, grow from
  app.js).
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

## Open
- [ ] Held picks audit (user 2026-11-24): one trinket per session, alphabetical, then food, from each trinket's
  Recommended on section; extract docs/held_picks_audit.md (rule HMD-picks-pace). ADHD, Airhorn done (2026-11-25: Regular Dude excluded like summons; AoE gap
multiplier for AoE-giving held items); Bad Credit done 2026-11-25 (Damage Taken consumer fed by Taunt and
Intercept Damage, less own Evade / Deflect / Block; self vs ally damage stores); Bag of Nuts done 2026-11-25
(Direct hit reactions sorted per hit / per damage / once by tools/hit_kind.py; On Direct Crit / On Lifesteal fed by hit rate
gated by the chance; own-roll outputs weighed by uptime); Baseball Bat, Black Belt, Bongos done 2026-11-25 (every
Direct hit source weighed in hits per second, held_picks.py --rates; Bongos floor 1); Crazy Straw done 2026-11-25 (own-roll uptime also for a self-given chance stat, plus the Dude's own
Lifesteal; Tennis out; thin holders Cave / Football / Cowboy revisit at audit end); next: Cutoff Jorts. Bounds 2-10 Dudes per trinket (upper "for now").
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
