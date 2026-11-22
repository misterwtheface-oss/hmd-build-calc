# Progress

## State
- 2026-11-14 to 2026-11-18: first build through the Draft's trinkets, food and landscape layout; detail in
  [Progress_2026-11-14_to_18.md](Progress_2026-11-14_to_18.md).

- 2026-11-19: every magnitude bar shows its n (Family cards, Common / Build effects; Overlap already did).
  Dude page: Function chips carry ×n (how many of his ability + relics have that Function · Focus) and a new
  Effect edges section bars each facet (Gives / Scales / Triggers / On / Boosts + channel) by how many of his
  ability + relics carry it; tap opens the channel.

- 2026-11-19 (2): effects on a channel nothing else gives / uses (Toughness: 50 givers, no reader in code; only
  take_damage, stat refresh and the inspector read toughness_realtime) now show as grey chips with no rail after the
  linked ones (were hidden). Team view too. Chip order: granting (Gives, Triggers), receiving (Scales, On, Boosts), then grey. Rail = connector: granting teal on the right,
  receiving mustard on the left.

- 2026-11-19 (3): DPS is fed by Attack Power and Attack Speed (user; reverses 2026-11-14 "DPS takes no stat
  edge"). Decoded realtime_stats_refresh: dps_realtime = live Attack Power / (attack time / Attack Speed mult); no
  Crit. The 44 "Scales DPS" effects (Cool Shades = 10 x dps_realtime) now link to every Attack Power / Attack Speed
  giver they reach: +3722 effect links (8422 -> 12144).

- 2026-11-19 (4): fix: stats that link through the event they cause (Deflection -> Deflect, Evasion -> Evade, Block
  Chance -> Block, Regeneration, Healing Received, Miss Chance, Crit Exposure, Multistrike; data.js `via`) showed as
  grey chips though their links existed; now railed, open the event's page and count in Effect edges / bars.

- 2026-11-19 (5): Crit Damage scales with Crit Chance (user; decoded: the crit multiplier applies only after the
  crit_chance roll in deal_damage / deal_aoe_damage / deal_attack_damage). Every Crit Damage giver links to the Crit
  Chance givers it reaches (+473 effect links); its chip receives (left rail) and opens Crit Chance (data.js cvia).

- 2026-11-19 (6): Damage Dealt channel (user): the 9 effects that scale with damage actually dealt (were DPS) and
  Lifesteal givers, fed by Attack Power, Attack Speed and Vulnerability on enemies (take_damage multiplies by
  1 + vulnerability before on_deal_damage / lifesteal; any Dude hitting the target benefits). Glass Cannon's self
  Vulnerability links nothing (user: no in-app enemy applies it to Dudes). Chips are now grey per effect when that
  effect has no link through the facet (fx[3] = 0), not only per channel: self Cleave / Run Speed nothing of his uses.

- 2026-11-19 (7): Enemies tab (the game's name; code type AnimalType): all 69 enemies sorted by the round they can
  first appear (enemies_get_available_for_round: start <= round), with tiers, last round, flying. Enemy page: stats
  in the game's own format (stat_value_to_text: HP with commas, DPS / Attack Speed 1 decimal, Run Speed Ft/Second,
  others %), real values = info x Dude baseline for relative stats, else info or the baseline (stats_init); traits
  with their numbers (47, TraitInfo); boss fights that field it. Trait page lists every enemy with it. Icons from the
  structs' asset references. Full-game enemies are Tier 3 only (tiers [3], gs_constArg43).
- 2026-11-19 (8): fix: Oregano "stacking up to" = 30 (the relic's own variables block; was 1 from a buff inside it).

- 2026-11-19 (9): Draft build: the trinket / meal rows under each Dude are gone; a trinket or meal given from an
  offer shows lit at the end of that Dude's relic icons (tooltip: name + the meal's extra stat), tap it to take it back.

- 2026-11-19 (10): Draft offers: a new Family's gain is shown apart. Overlap = the offer's own fit; each Family a Dude
  offer brings in gets its own bar (its relics' pairs listed under it); Total = both, still what picks the
  highlighted (best) offer. Each bar kind scales to its own largest among the offers.

- 2026-11-22 (1): Draft offers: one box adds the next offer (replaces a search box per empty slot), at the top of the
  Offers pane (pinned there on a sideways phone). While it has focus on a short screen (phone keyboard up) it fills
  the visible strip above the keyboard, hits in columns; a tapped hit or Enter adds it and the keyboard stays up for
  the next. Hits: names starting with the text first, offers already in a slot left out. Viewport
  interactive-widget=resizes-content (Android shrinks the page for the keyboard).

- 2026-11-22 (2): Draft meal offer: once an extra stat is chosen only its chip shows; tapping it clears the choice
  and the full list comes back.

- 2026-11-22 (3): Draft Team view: a picked Family / Universal / Promoter relic is its group's, no longer counted as an
  effect of the Dude(s) it applies to. Under a Dude: his own ability, held items and relics, with edges to the other
  Dudes and to each group (one row per Family / source); under each Family and Global: its picked relics and their
  edges to the Dudes and other groups (as the offers' Family rows already did).

- 2026-11-22 (4): fix: a Family relic reaches every Dude (its texts: "All Dudes gain", "When a Dude ..."); its Family only
  decides who can be offered it. Trinket / meal offers: a Family relic's edges now count in every free Dude's row, not
  only its members' (Crazy Straw <-> False Fangs on every Dude, was Lich Dude only).

- 2026-11-22 (5): Draft Offers / Team: a full-width two-button bar over both panes (was small chips in the offers
  pane), stuck under the page header while scrolling (header height tracked as --toph).

- 2026-11-22 (6): Draft Team view: each Dude's / group's effect list sits in a collapsible "Effects" section, closed
  by default; an opened one stays open across re-renders (picks, removals). Edges stay shown.

- 2026-11-22 (7): Draft Team view: under each Dude, every Family / Global row folds (closed by default, name and score
  as its header), kept open across re-renders like the Effects list. Dude rows stay open.

- 2026-11-22 (8): fix: Medical License scales with Damage Dealt (self). Code: its on_deal_damage_wearer hook (anon@5478)
  adds to medical_license_damage_stored; the tagger now reads "For every X damage the Wielder deals". Only tag change.

- 2026-11-22 (9): Draft Team view, for long mature builds (user: get to a section without scrolling past dozens of
  effects): only each Dude / Family / Global header and its relic picks (collection tracking) stay shown; one closed
  "Effects" fold per group holds its effect list and every edge row; Build effects folds too. Replaces (6) / (7)'s
  separate folds. Opened folds stay open across re-renders.

## Open
- [ ] User review of the receiver-based Draft weighting (2026-11-18 (3)); channel weights (rarity) unchanged.
- [ ] Trinkets: no Function / Focus tags yet (needs their code decoded like relics); user review of trinket tags.
- [ ] User audit of Function / Focus tags (extract data/code_tags_audit.md) and synergy edges; refactor as needed.