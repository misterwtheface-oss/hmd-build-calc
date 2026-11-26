"use strict";
/* How Many Dudes? Codex — data: window.HMD (tools/build_data.py). Mobile first. */

const FEATURES = { roles: true, synergy: true, draft: true, glossary: true };

const H = window.HMD;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- indexes ---------- */
const DUDE = Object.fromEntries(H.dudes.map((d) => [d.t, d]));
const RELIC = Object.fromEntries(H.relics.map((r) => [r.id, r]));
const FAM = Object.fromEntries(H.families.map((f) => [f.id, f]));
// Trinkets (Trinket Stash): each is bound to one Dude Type for the rest of the run, the Wielder
const TRINKET = Object.fromEntries(H.trinkets.map((t) => [t.id, t]));
// Food (Food Dude): a meal for one Dude Type = its main stat, plus one extra stat (foodstat) rolled with the offer
for (const st of H.foodstats) st.icon = H.pools.food.icon;
const FOOD = Object.fromEntries(H.food.map((m) => [m.id, m]));
const FOODSTAT = Object.fromEntries(H.foodstats.map((m) => [m.id, m]));
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
const dudesSorted = H.dudes.filter((d) => d.name).sort(byName);
const relicsSorted = H.relics.slice().sort(byName);
const trinketsSorted = H.trinkets.slice().sort(byName);
const foodSorted = H.food.slice().sort(byName);
// Enemies (AnimalType): what the fights are made of; stats arrive in the game's own format
const ENEMY = Object.fromEntries(H.enemies.map((e) => [e.id, e]));
const TRAIT = Object.fromEntries(H.traits.map((t) => [t.id, t]));
const enemiesSorted = H.enemies.slice().sort((a, b) => a.from - b.from || byName(a, b));
const relicsOfDude = (t) => relicsSorted.filter((r) => r.dude === t);
const relicsOfFamilyPool = (f) => relicsSorted.filter((r) => r.pool !== "dude" && r.fam === f);
const membersOf = (f) => dudesSorted.filter((d) => d.fam.includes(f));
// relic sources outside a game Family (the game's collection groups): Universal (always in the pool) and Promoter
// (won in the Promoter Dude's underground fights). The app's Global group holds both; a relic's group = its source
const SOURCES = ["universal", "promoter"];
const SOURCE = Object.fromEntries(SOURCES.map((p) => [p, { id: "global", src: p, name: H.pools[p].name, icon: H.pools[p].icon || FAM.global?.icon }]));
const groupOf = (r) => SOURCE[r.pool] || FAM[r.fam];
const relicsOfSource = (p) => relicsSorted.filter((r) => r.pool === p);
const refsFrom = (key) => H.refs.filter((e) => e.a === key);
const refsTo = (key) => H.refs.filter((e) => e.b === key);

// Synergy (extract tools/effect_tags.py): every effect carries facets [facet, channel, scope]; an edge joins a unit
// that gives / triggers a channel with a unit that scales with / reacts to it. A unit is a Dude together with his own
// relics, one Family / universal / Promoter relic, or one Trinket. Rare channels (Taunt, Block) weigh more than common ones.
const unitOf = (x) => (x.t ? "dude:" + x.t : x.pool === "dude" ? "dude:" + x.dude : keyOf(x));
const CH = Object.fromEntries(H.chans.map((c) => [c.id, c]));
// the channel page an effect's channel links through: itself, the event its stat causes (Deflection -> Deflect), or
// the channel its value comes from (Crit Damage <- Crit Chance: that chip receives)
const chOf = (c) => (CH[c] ? c : H.via[c] || H.cvia[c]);
// a facet links when its channel does and this effect has a link through it (fx[3] = 0: none, e.g. a self debuff)
const fxLive = (f) => f[3] !== 0 && chOf(f[1]);
const chWeight = (c) => CH[c]?.r || 0;
const SYN = {};
for (const [a, b, score, chs] of H.syn) {
  (SYN[a] = SYN[a] || []).push({ u: b, score, chs });
  (SYN[b] = SYN[b] || []).push({ u: a, score, chs });
}
const unitItem = (u) => itemOf(u);
const FACET = { gives: "Gives", scales: "Scales", emits: "Triggers", reacts: "On", boosts: "Boosts" };
// channels an effect touches that link to another unit (shown as chips; the facet verb says how)
const fxShown = (x) => x.fx.filter(fxLive);
// effect-level pairs (build_data.py): effect key -> [{o: other effect, ch, label: this side's facet, olabel: the other's,
// give: this side provides the channel, so the other side (its consumer) receives it; wield: a trinket link that
// holds only when the trinket is bound to that Dude; g / og: the gates of this side's facet / the other's}]
// GATE: effect key -> gate channel -> the effects that open it (extract effect_tags gate_src, user 2026-11-24): a
// facet in a "When X, ..." sentence only happens when X does, so its pairs weigh the odds that X is in the build
const PAIR = {}, GATE = {};
{
  const { keys, names, fac, p, gsrc = [] } = H.pairs;
  for (const [a, b, c, v, pf, cf, w, pg = [], cg = []] of p) {
    const give = `${FACET[fac[pf]]} ${names[v]}`, use = `${FACET[fac[cf]]} ${names[c]}`, wield = !!w;
    const g1 = pg.map((i) => names[i]), g2 = cg.map((i) => names[i]);
    (PAIR[keys[a]] = PAIR[keys[a]] || []).push({ o: keys[b], ch: names[c], label: give, olabel: use, give: true, wield, g: g1, og: g2 });
    (PAIR[keys[b]] = PAIR[keys[b]] || []).push({ o: keys[a], ch: names[c], label: use, olabel: give, give: false, wield, g: g2, og: g1 });
  }
  for (const [e, g, xs] of gsrc) (GATE[keys[e]] = GATE[keys[e]] || {})[names[g]] = xs.map((i) => keys[i]);
}
// two-step pairs (build_data.py p2): effect key -> [{o, mid: the middle effect, ch, label, olabel, give, two}]. The
// provider feeds what triggers mid, mid makes ch happen, the consumer reacts to it (Cleave -> GET DOWN! -> Dash ->
// Cool Shades). They hold only while mid is in the build, and a channel reached this way weighs HALF (user 2026-11-23).
// Built on first use: labels name mid, and the item lookups are defined further down
const HALF = 0.5;
let P2 = null;
function pairs2(k) {
  if (!P2) {
    P2 = {};
    const { keys, names, fac, p2 = [] } = H.pairs;
    for (const [a, b, c, v, m, pf] of p2) {
      const mid = keys[m], mx = itemOf(mid), via = ` · via ${(mx?.t ? mx.ab : mx?.name) || ""}`;   // a Dude: his ability
      const give = `${FACET[fac[pf]]} ${names[v]}${via}`, use = `${FACET.reacts} ${names[c]}${via}`;
      (P2[keys[a]] = P2[keys[a]] || []).push({ o: keys[b], mid, ch: names[c], label: give, olabel: use, give: true, two: true });
      // the consumer side also keeps the provider's facet (src: Gives Evasion) for the Indirect synergies rows
      (P2[keys[b]] = P2[keys[b]] || []).push({ o: keys[a], mid, ch: names[c], label: use, olabel: give, give: false, two: true,
        src: [fac[pf], names[v]] });
    }
  }
  return P2[k] || [];
}
// an effect's pairs: direct ones, then two-step ones whose middle effect has(mid)
// (WEIGHT.dedupe2: a two-step pair is left out when its middle effect already pairs directly with its consumer on the channel)
const dup2 = (l, k) => (PAIR[l.give ? l.o : k] || []).some((p) => p.o === l.mid && p.ch === l.ch);
const pairsOf = (k, has) => [...(PAIR[k] || []), ...pairs2(k).filter((l) => has(l.mid) && !(WEIGHT.dedupe2 && dup2(l, k)))];
// a row channel key: a two-step channel is kept apart ("Dash|2") so it scores HALF
const chKey = (l) => (l.two ? l.ch + "|2" : l.ch);
const chBase = (c) => c.replace(/\|2$/, "");
const chRank = (c) => chWeight(chBase(c)) * (c.endsWith("|2") ? HALF : 1);
// the effects of a unit: a Dude's ability with every relic of his pool (he can hold them all), or one relic
const effectsOfUnit = (u) => (u.startsWith("dude:") ? [u, ...relicsOfDude(u.slice(5)).map((r) => "relic:" + r.id)] : [u]);
const fxLabel = ([f, c, s]) => `${FACET[f]} ${c}${s === "team" && f === "gives" ? " · team" : s === "enemy" ? " · enemy" : ""}`;

// Role = the game's own list on the Dude (Tank, AOE, Single Target, Healing, Control).
// Function / Focus = our category on each effect (ability or relic), from code: x.fn = [function, focus] | null
const ROLES = ["Tank", "AOE", "Single Target", "Healing", "Control"];
const hasRole = (d, r) => d.roles.includes(r);
const fnText = (x) => (x.fn ? x.fn.join(" · ") : "");
// display order: by Function, then Focus, in taxonomy order
const FN_ORDER = ["Offense · Single", "Offense · Area", "Offense · Debuff", "Offense · Self-Scaling", "Defense · Taunt",
  "Defense · Mitigation", "Support · Heal", "Support · Protection", "Support · Buff", "Utility · Summon",
  "Utility · Economy", "Utility · Reposition"];
const fnRank = (x) => (FN_ORDER.indexOf(fnText(x)) + FN_ORDER.length + 1) % (FN_ORDER.length + 1);

function itemEffects(items, n) {
  const count = {};
  for (const x of items) for (const [, c] of fxShown(x)) count[c] = (count[c] || 0) + 1;
  return Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([c, v]) => [c, v, chOf(c)]);
}
function familyEffects(f, n) {
  const members = membersOf(f).map((d) => d.t);
  return itemEffects([...membersOf(f), ...H.relics.filter((r) => r.fam === f || members.includes(r.dude))], n);
}
// magnitude bar: share of the largest value of this field among the shown entries (rule A-magnitude-bars)
const bar = (v, max) => `<span class="bar"><i style="width:${max ? Math.round((100 * v) / max) : 0}%"></i></span>`;
function effectList(f, n, big) {
  return effectBars(familyEffects(f, n), big);
}
// entries [label, n, channel (defaults to the label)]; every bar shows its n
function effectBars(eff, big) {
  const max = Math.max(0, ...eff.map((e) => e[1]));
  return `<div class="effects${big ? " big" : ""}">${eff
    .map(([k, v, c = k]) => `<span class="eff"${big ? ` data-open="ch:${encodeURIComponent(c)}"` : ""}><span>${esc(k)}</span><b>${v}</b>${bar(v, max)}</span>`)
    .join("")}</div>`;
}
// a Dude's effect edges, one bar per higher-order group of the linked channel (Damage, Crit, Defense ...): n = how many
// of his effects (ability + relics) touch that group. Under the bar, two folds closed by default: Producer (Gives /
// Triggers) and Consumer (Scales / On / Boosts; the chip rail side, receives()), each with its facet chips (open the
// channel)
const EDGE_GROUPS = {
  Damage: ["Attack Power", "Attack Speed", "DPS", "Damage Dealt", "Direct Damage Dealt", "Cleave", "Hit"],
  Crit: ["Crit", "Crit Chance", "Direct Crit"],
  Defense: ["Block", "Deflect", "Evade", "Enemy Miss", "Taunt"],
  Health: ["HP", "Max HP", "Healing", "Lifesteal", "Regeneration Tick", "Temporary Health", "Fatal Damage", "Knock Out"],
  Mobility: ["Run Speed", "Dash", "Thrown"],
  Summons: ["Summon", "Skeledude"],
};
const EDGE_GROUP = Object.fromEntries(Object.entries(EDGE_GROUPS).flatMap(([g, cs]) => cs.map((c) => [c, g])));
const edgeGroup = (f) => EDGE_GROUP[chOf(f[1])] || chOf(f[1]);
function dudeEdges(t) {
  const by = new Map();
  for (const x of [DUDE[t], ...relicsOfDude(t)]) {
    const seen = new Set();
    for (const f of fxShown(x)) {
      const g = edgeGroup(f), e = by.get(g) || { g, n: 0, fx: [new Map(), new Map()] };
      if (!seen.has(g)) e.n++, seen.add(g);
      e.fx[receives(f) ? 1 : 0].set(fxLabel(f), f);
      by.set(g, e);
    }
  }
  return [...by.values()].sort((a, b) => b.n - a.n || a.g.localeCompare(b.g));
}
function edgeBars(t) {
  const es = dudeEdges(t), max = Math.max(0, ...es.map((e) => e.n));
  const side = (e, i, name) => `<div>${fold(`edge:${t}|${e.g}|${i}`, name, e.fx[i].size ? `<span class="chipline">${[...e.fx[i].values()].map(fxChip).join("")}</span>` : "")}</div>`;
  return es.length ? `<div class="effects big">${es
    .map((e) => `<div class="eff grp"><span>${esc(e.g)}</span><b>${e.n}</b>${bar(e.n, max)}<div class="ecols">${side(e, 0, "Producer")}${side(e, 1, "Consumer")}</div></div>`)
    .join("")}</div>` : "";
}

// partner units of a unit (Dudes or standalone relics), strongest first, each with the channels that join them
const partners = (u, kind, limit) =>
  (SYN[u] || []).filter((p) => p.u.startsWith(kind + ":")).slice(0, limit);
const partnerMini = (p) => mini(unitItem(p.u), p.chs.slice(0, 3).map(esc).join(" · "), true);
// two-step synergies of some effects (a Dude's ability + relics, or one relic), in a closed fold: only chains that end
// at one of these effects (they receive: Evasion -> Golden Glove -> Hit -> Probe), not the chains they start for others
// (user 2026-11-24). Under each effect fed (icon + name header), one row per linking effect (Golden Glove): what it
// triggers for him (Triggers Hit) and what sets it off (Gives Evasion); the chips open their channel pages instead of
// listing every provider. Rarest channel first
const midChip = (k) => { const x = itemOf(k); return `<button class="chiplink" data-open="${k}">${img(x.icon, x.name)}${esc(x.t ? x.ab : x.name)}</button>`; };
function twoStep(id, own) {
  const groups = own.map((k) => {
    const by = new Map();   // linking effect -> {ch, src: facet label -> facet}
    for (const l of pairs2(k)) {
      if (l.give || own.includes(l.o) || !itemOf(l.o) || !itemOf(l.mid)) continue;
      const r = by.get(l.mid) || { mid: l.mid, ch: new Set(), src: new Map() };
      r.ch.add(l.ch);
      r.src.set(fxLabel(l.src), l.src);
      by.set(l.mid, r);
    }
    const rows = [...by.values()].sort((a, b) => Math.max(...[...b.ch].map(chWeight)) - Math.max(...[...a.ch].map(chWeight)) || byName(itemOf(a.mid), itemOf(b.mid)));
    const x = itemOf(k);
    return rows.length ? `<div class="fxrow ihead">${iconBtn(k)}<span>${esc(x.t ? x.ab : x.name)}</span></div>${rows
      .map((r) => `<div class="irow">${midChip(r.mid)}<span class="chipline">${[...r.ch].map((c) => fxChip(["emits", c])).join("")}</span>
        <span class="ifrom">from</span><span class="chipline">${[...r.src.values()].map(fxChip).join("")}</span></div>`).join("")}` : "";
  }).join("");
  return fold("two:" + id, "Indirect synergies", groups);
}

/* ---------- art + chips (all game art goes through these) ---------- */
const img = (src, alt, cls = "") => (src ? `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" width="96" height="96">` : "");
const famIcon = (f) => img(FAM[f]?.icon, FAM[f]?.name);
const poolLabel = (r) =>
  r.pool === "dude" ? DUDE[r.dude]?.name : r.pool === "family" ? FAM[r.fam]?.full : H.pools[r.pool]?.name;
const poolIcon = (r) =>
  r.pool === "dude" ? img(DUDE[r.dude]?.icon, DUDE[r.dude]?.name) : r.pool === "family" ? famIcon(r.fam) : img(H.pools[r.pool]?.icon, r.pool);

const dudeChip = (t) => (DUDE[t] ? `<button class="chiplink" data-open="dude:${t}">${img(DUDE[t].icon, DUDE[t].name)}${esc(DUDE[t].name)}</button>` : "");
const famChip = (f) => (FAM[f] ? `<button class="chiplink" data-open="family:${f}">${famIcon(f)}${esc(FAM[f].name)}</button>` : "");
// an effect on a linked channel opens it; one nothing else gives / uses (Toughness ...) is a plain grey chip.
// Order: granting (Gives, Triggers), then receiving (Scales, On, Boosts), then no interaction
const fxChip = (f) => (fxLive(f) ? `<button class="chiplink kw fx-${receives(f) ? "reacts" : f[0]}" data-open="ch:${encodeURIComponent(chOf(f[1]))}">${esc(fxLabel(f))}</button>`
  : `<span class="chiplink kw fx-none">${esc(fxLabel(f))}</span>`);
const GRANTS = new Set(["gives", "emits"]);
const receives = (f) => !GRANTS.has(f[0]) || (!CH[f[1]] && !H.via[f[1]] && H.cvia[f[1]]);
const fxSide = (f) => (!fxLive(f) ? 2 : receives(f) ? 1 : 0);
const fxAll = (x) => x.fx.map((f, i) => [f, i]).sort((a, b) => fxSide(a[0]) - fxSide(b[0]) || a[1] - b[1]).map(([f]) => f);
const fxChips = (x) => fxAll(x).map(fxChip).join("");
const fxLine = (x) => (x.fx.length ? `<div class="chipline">${fxChips(x)}</div>` : "");
const roleBadge = (d) =>
  FEATURES.roles ? d.roles.map((r) => `<span class="badge role-${r.replace(/ /g, "")}">${esc(r)}</span>`).join("") : "";
const fnTag = (x, n) => (FEATURES.roles && x.fn ? `<span class="tag fn fn-${x.fn[0]}">${esc(fnText(x))}${n ? `<b>×${n}</b>` : ""}</span>` : "");

// fams: show the Families the Dude / relic belongs to (synergy lists)
const famsOf = (x) => (x.t ? x.fam : x.fam ? [x.fam] : []);
function mini(x, sub, fams) {
  const key = keyOf(x);
  const tail = fams && famsOf(x).length ? `<span class="fams">${famsOf(x).map(famIcon).join("")}</span>` : "";
  return `<button class="mini" data-open="${key}">${img(x.icon, x.name)}<span>${esc(x.name)}${sub ? `<small>${sub}</small>` : ""}</span>${tail}</button>`;
}

const FMT = { percent: "%", cash: "$", seconds: "s", number: "" };
// game formatting (hmd_loctext_fill): percent = value x 100, cash = $value, seconds / number = the value
const num = (v) => String(Math.round(v * 100) / 100);
const fmtVal = (v, f) => (f === "percent" ? num(v * 100) + "%" : f === "cash" ? "$" + num(v) : num(v));
// gk: whose glossary a tapped keyword opens (keyOf, "trait:<id>" or "g:<term>"), as the game's popup for that thing
function renderSegs(seg, gk) {
  const tap = FEATURES.glossary && gk && glList(gk).length;
  return seg
    .map(([kind, a, b, c]) => {
      if (kind === "t") return esc(a);
      if (kind === "k") return tap ? `<button class="k" data-gl="${gk}" data-kw="${esc(a)}">${esc(b)}</button>` : `<span class="k solo">${esc(b)}</span>`;
      if (kind === "d") return `<span class="d" data-open="dude:${a}">${esc(b)}</span>`;
      if (kind === "u") return `<span class="u">${esc(a)}</span>`;
      if (kind === "v")
        return c != null ? `<b class="n">${fmtVal(c, b)}</b>` : `<span class="v">${esc(a.replace(/_/g, " "))}${FMT[b] ? " " + FMT[b] : ""}</span>`;
      return "";
    })
    .join("");
}
/* ---------- glossary popup: the game's Dudex entries for a thing (extract tools/glossary_map.py) ----------
   The game lists, per Dude ability / relic / trinket / trait / stat / term, the entries its popup shows (code, not
   text); a tapped keyword opens that list, its own entry first when the names match. A Dude id = his ability. */
function glList(gk) {
  const [k, id] = gk.split(":");
  return (k === "g" ? H.gloss[id]?.[2] : k === "trait" ? TRAIT[id]?.gl : itemOf(gk)?.gl) || [];
}
const glTitle = (gk) => { const [k, id] = gk.split(":"); return k === "g" ? H.gloss[id]?.[0] : k === "trait" ? TRAIT[id]?.name : itemOf(gk)?.name; };
function glEntry(id, on) {
  const g = H.gloss[id], d = DUDE[id];
  const head = g ? `<div class="gname">${esc(g[0])}</div>`
    : `<button class="gname" data-open="dude:${id}">${img(d.icon, d.name)}${esc(d.ab || d.name)}</button>`;
  return `<div class="gent${on ? " on" : ""}">${head}<div>${g ? renderSegs(g[1], g[2].length ? "g:" + id : null) : renderSegs(d.seg, keyOf(d))}</div></div>`;
}
const glStack = [];
function renderGloss() {
  let el = $("#gloss");
  if (!glStack.length) return el?.remove();
  if (!el) {
    el = document.createElement("div");
    el.id = "gloss";
    document.body.append(el);
  }
  const { gk, kw } = glStack[glStack.length - 1];
  const ids = glList(gk).filter((id) => H.gloss[id] || DUDE[id]);
  const hit = ids.find((id) => H.gloss[id]?.[0] === kw || DUDE[id]?.ab === kw);
  el.innerHTML = `<div class="gbox" role="dialog" aria-modal="true"><div class="ghead">${glStack.length > 1 ? `<button class="gback" data-glback>‹</button>` : ""}
    <span>${esc(glTitle(gk))}</span><button class="gx" data-glclose aria-label="Close">×</button></div>
    <div class="gbody">${[hit, ...ids.filter((id) => id !== hit)].filter(Boolean).map((id) => glEntry(id, id === hit)).join("")}</div></div>`;
}
const closeGloss = () => { glStack.length = 0; renderGloss(); };

const section = (title, body) => (body ? `<h3>${esc(title)}</h3>${body}` : "");
// a Dude's base stats or an Enemy's stats, [name, text] in the game's own format
// a stat table; with max (a Dude's page) each row carries a bar: its share of that stat's largest value among all Dudes
const statTable = (stats, max) => (stats.length ? `<table class="stats">${stats.map(([n, v]) => `<tr><td>${esc(n)}</td>${max ? `<td class="sbar">${bar(parseFloat(v) || 0, max[n])}</td>` : ""}<td class="num">${esc(v)}</td></tr>`).join("")}</table>` : "");
const DUDE_STAT_MAX = {};
for (const d of H.dudes) for (const [n, v] of d.stats) DUDE_STAT_MAX[n] = Math.max(DUDE_STAT_MAX[n] || 0, parseFloat(v) || 0);
const grid = (items) => (items.length ? `<div class="grid">${items.join("")}</div>` : "");

/* ---------- tabs ---------- */
const TABS = [
  { id: "families", name: "Families" },
  { id: "search", name: "Search" },
  { id: "enemies", name: "Enemies" },
  ...(FEATURES.synergy ? [{ id: "synergy", name: "Synergies" }] : []),
  ...(FEATURES.draft ? [{ id: "draft", name: "Draft" }] : []),
];
const state = { tab: "families", q: "", kind: null, fam: null, role: null, pool: null };
const scrollMemo = {};

function renderTabs() {
  $("#tabs").innerHTML = TABS.map(
    (t) => `<button class="tab" role="tab" data-tab="${t.id}" aria-selected="${t.id === state.tab}">${t.name}</button>`
  ).join("");
}

function filterChips(kind, options, current) {
  return `<div class="chips">${options
    .map(([val, label, icon]) => `<button class="fchip" data-filter="${kind}" data-val="${esc(val)}" aria-pressed="${current === val}">${icon || ""}${esc(label)}</button>`)
    .join("")}</div>`;
}

function renderControls() {
  const famOpts = H.families.map((f) => [f.id, f.name, famIcon(f.id)]);
  if (state.tab === "draft") return void ($("#controls").innerHTML = "");
  let html = `<input id="q" class="search" type="search" placeholder="Search" value="${esc(state.q)}" autocomplete="off">`;
  if (state.tab === "search") {
    html += filterChips("kind", [["dude", "Dudes"], ["relic", "Relics"], ["trinket", "Trinkets"], ["food", "Food"]], state.kind);
    if (!(state.kind in HELD)) html += filterChips("fam", famOpts, state.fam);
    if (state.kind === "dude" && FEATURES.roles) html += filterChips("role", ROLES.map((r) => [r, r]), state.role);
    if (state.kind === "relic")
      html += filterChips("pool", [["dude", "Dude"], ["family", "Family"], ["universal", "Universal"], ["promoter", "Promoter"]], state.pool);
  }
  $("#controls").innerHTML = html;
}

const match = (q, ...fields) => !q || fields.some((f) => (f || "").toLowerCase().includes(q));
const segText = (seg) => seg.map((s) => (s[0] === "v" ? (s[3] != null ? fmtVal(s[3], s[2]) : s[1]) : s[s.length - 1] || "")).join("");

function renderList() {
  const q = state.q.trim().toLowerCase();
  let rows = [];
  if (state.tab === "draft") {
    // keep each pane's own scroll across re-renders (rule A-no-scroll-reset)
    const panes = (el) => (el.querySelectorAll ? [...el.querySelectorAll(".dpane")] : []);
    const keep = panes($("#list")).map((p) => p.scrollTop);
    $("#list").innerHTML = renderDraft();
    panes($("#list")).forEach((p, i) => { p.scrollTop = keep[i] || 0; });
    return;
  }
  if (state.tab === "search") {
    const kind = (k) => !state.kind || state.kind === k;
    const ds = !kind("dude") ? [] : dudesSorted
      .filter((d) => (!state.fam || d.fam.includes(state.fam)) && (!state.role || hasRole(d, state.role)))
      .filter((d) => match(q, d.name, d.ab, segText(d.seg)));
    const rs = !kind("relic") ? [] : relicsSorted
      .filter((r) => (!state.fam || r.fam === state.fam) && (!state.pool || r.pool === state.pool))
      .filter((r) => match(q, r.name, segText(r.seg), poolLabel(r)));
    const held = (k, xs) => (!kind(k) || (state.fam && state.kind !== k) ? [] : xs.filter((t) => match(q, t.name, segText(t.seg), poolLabel(t))));
    rows = [...ds, ...rs, ...held("trinket", trinketsSorted), ...held("food", foodSorted)].map((x) => itemRow(x));
  } else if (state.tab === "enemies") {
    rows = enemiesSorted
      .filter((e) => match(q, e.name, ...e.traits.map((t) => TRAIT[t]?.name)))
      .map((e) => `<button class="row" data-open="enemy:${e.id}">${img(e.icon, e.name, "ic")}<span class="main"><span class="name">${esc(e.name)}</span>
        <span class="sub">${esc(enemyWhen(e))}</span></span><span class="tail tr">${e.traits.map((t) => img(TRAIT[t]?.icon, TRAIT[t]?.name, "ti")).join("")}</span></button>`);
  } else if (state.tab === "families") {
    const cards = H.families
      .filter((f) => match(q, f.name, f.desc, ...membersOf(f.id).map((d) => d.name)))
      .map(
        (f) => `<button class="famcard" data-open="family:${f.id}"><span class="head">${img(f.icon, f.name)}<span>${esc(f.name)}</span></span>
        ${effectList(f.id, 3, false)}</button>`
      );
    // the Trinket Stash after the Families: every Trinket, bound to one Dude Type per run
    const stash = H.pools.trinket;
    if (match(q, "Trinket Stash", ...trinketsSorted.map((t) => t.name)))
      cards.push(`<button class="famcard" data-open="stash:all"><span class="head">${img(stash.icon, "Trinket Stash")}<span>Trinket Stash</span></span>
        ${effectBars(itemEffects(trinketsSorted, 3), false)}</button>`);
    if (match(q, "Food Dude", ...foodSorted.map((m) => m.name)))
      cards.push(`<button class="famcard" data-open="meals:all"><span class="head">${img(H.pools.food.icon, "Food Dude")}<span>Food Dude</span></span>
        ${effectBars(itemEffects(foodSorted, 3), false)}</button>`);
    $("#list").innerHTML = cards.length ? `<div class="famgrid">${cards.join("")}</div>` : `<div class="empty">No matches</div>`;
    return;
  } else {
    // channels (each joins two or more units, build_data.py), rarest first
    const shown = H.chans.filter((c) => match(q, c.id));
    rows = shown
      .sort((a, b) => b.r - a.r || a.id.localeCompare(b.id))
      .map((c) => `<button class="row" data-open="ch:${encodeURIComponent(c.id)}"><span class="main"><span class="name">${esc(c.id)}</span></span></button>`);
  }
  $("#list").innerHTML = rows.join("") || `<div class="empty">No matches</div>`;
}

// one list row for a Dude or a relic; attr = what a tap does (open its page by default)
function itemRow(x, attr) {
  const a = attr || `data-open="${keyOf(x)}"`;
  return x.t
    ? `<button class="row" ${a}>${img(x.icon, x.name, "ic")}<span class="main"><span class="name">${esc(x.name)}</span>
        <span class="sub">${esc(x.ab || "")}${FEATURES.roles && x.fn ? " · " + esc(fnText(x)) : ""}</span></span>
        <span class="tail">${roleBadge(x)}${x.fam.map(famIcon).join("")}</span></button>`
    : `<button class="row" ${a}>${img(x.icon, x.name, "ic")}<span class="main"><span class="name">${esc(x.name)}</span>
        <span class="sub">${esc(poolLabel(x) || "")}</span></span><span class="tail">${poolIcon(x)}</span></button>`;
}

/* ---------- draft: up to 3 offers (as the game presents them) scored against the saved build ---------- */
const BY_KIND = { dude: DUDE, relic: RELIC, trinket: TRINKET, food: FOOD, foodstat: FOODSTAT };
const keyOf = (x) => (x.t ? "dude:" + x.t : ["trinket", "food", "foodstat"].includes(x.pool) ? x.pool + ":" + x.id : "relic:" + x.id);
const itemOf = (key) => {
  const [k, id] = key.split(":");
  return (BY_KIND[k] || RELIC)[id];
};
const SLOTS = 3;
const DRAFT_KEY = "hmd.draft";
const draft = (() => {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) { /* no saved draft */ }
  const ok = (k) => typeof k === "string" && !!itemOf(k);
  return {
    build: Array.isArray(d?.build) ? d.build.filter(ok) : [],
    slots: Array.from({ length: SLOTS }, (_, i) => (ok(d?.slots?.[i]) ? d.slots[i] : null)),
    view: d?.view === "team" ? "team" : "offers",   // Offers: score offers against the build; Team: the build itself
    // Trinket Stash: Dude Type -> the trinket bound to it (one each, no duplicates)
    wield: Object.fromEntries(Object.entries(d?.wield || {}).filter(([t, id]) => DUDE[t] && TRINKET[id])),
    // Food Dude: Dude Type -> {id: meal, sec: its extra stat}; slotSec = the extra stat of a meal offered in slot i
    food: Object.fromEntries(Object.entries(d?.food || {}).filter(([t, v]) => DUDE[t] && FOOD[v?.id])
      .map(([t, v]) => [t, { id: v.id, sec: FOODSTAT[v.sec] ? v.sec : null }])),
    slotSec: Array.from({ length: SLOTS }, (_, i) => (FOODSTAT[d?.slotSec?.[i]] ? d.slotSec[i] : null)),
    dice: Number.isInteger(d?.dice) && d.dice > 0 ? d.dice : 0,   // Pocket Dice the player holds
  };
})();
const saveDraft = () => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* storage off */ }
};

// held items: what a Dude Type holds for the run, one of each kind. A trinket is never on two Dudes; a meal can be
const HELD = {
  trinket: { items: () => trinketsSorted, unique: true, map: () => draft.wield, get: (t) => draft.wield[t] },
  food: { items: () => foodSorted, unique: false, map: () => draft.food, get: (t) => draft.food[t]?.id },
};
const isHeld = (k) => /^(trinket|food|foodstat):/.test(k);
const boundTo = (kind, id) => Object.keys(HELD[kind].map()).find((t) => HELD[kind].get(t) === id);
// a Dude's held effects: his trinket, his meal and its extra stat
const heldKeys = (d) => [...(draft.wield[d.t] ? ["trinket:" + draft.wield[d.t]] : []),
  ...(draft.food[d.t] ? ["food:" + draft.food[d.t].id, ...(draft.food[d.t].sec ? ["foodstat:" + draft.food[d.t].sec] : [])] : [])];
// a pair joining a held effect with a Dude's own effect (wield) holds only when that Dude holds it
function pairOk(l, a, b) {
  if (!l.wield) return true;
  const hk = isHeld(a) ? a : b;
  const u = unitOf(itemOf(hk === a ? b : a));
  return u.startsWith("dude:") && heldKeys(DUDE[u.slice(5)]).includes(hk);
}
function bind(kind, t, id, sec) {
  if (kind === "trinket") {
    for (const k of Object.keys(draft.wield)) if (draft.wield[k] === id) delete draft.wield[k];
    draft.wield[t] = id;
  } else draft.food[t] = { id, sec: sec !== undefined ? sec : draft.food[t]?.sec || null };
}
const unbind = (kind, t) => delete HELD[kind].map()[t];
const buildFams = (team) => [...new Set(team.flatMap((d) => d.fam))].filter((f) => f !== "global" && FAM[f]);
// Draft weighting (script flag; tools/weight_preview.js compares the modes on simulated drafts; user pick 2026-11-24:
// grow, seen 25, rare 2: a build's overlaps should gain value as its focus forms, the Venn centre; rare 2 keeps that
// focus off generic stats, which have the most overlaps. Was log, seen 25 on 2026-11-23). "flat": a row scores each channel's rarity once, however many pairs it holds (2026-11-18). "linear" /
// "log" (gradual: log2(1 + w)) / "sqrt" (inflates pool odds, undoes dilution) / "grow" (w^1.5: each overlap on a
// channel adds more than the last; an untaken relic alone counts below its odds): each synergy pair weighs by
// how sure its two effects are to be in the build: taken (a Dude's ability, a picked relic, a held item, the offer
// itself) = 1, a relic still in the pool = seen / pool size; a row's channel scores rarity x f(its pair weights), so
// a channel the build has invested in grows. Pool = universal + each Family with a member + each drafted Dude's
// relics, drawn uniformly (decoded 2026-11-25, extract docs/offer_draws.md: array_get_random over eligible relics): a Dude offer that grows it dilutes the odds
// of the build's own pool relics, scored as a minus.
// Options (user 2026-11-25, compared with tools/weight_preview.js; A and B switched on by the user the same day): exp = the grow
// curve's power; dedupe2 (A) drops a two-step pair whose middle effect already pairs directly with the same consumer on
// that channel; growOn "build" (B) grows a channel only with the build's own effects on it (w x M^(exp-1), M = the
// summed weights of the distinct build effects in the channel), the offer's effects adding linearly; "pairs" = all pairs
const WEIGHT = { mode: "grow", seen: 25, rare: 2, exp: 1.5, dedupe2: true, growOn: "build" };   // rare: exponent on channel rarity
const MAG = { flat: (w) => (w > 0 ? 1 : 0), linear: (w) => w, sqrt: Math.sqrt, log: (w) => Math.log2(1 + w), grow: (w) => w ** WEIGHT.exp };
const poolSize = (types, fams) => relicsOfSource("universal").length + fams.reduce((a, f) => a + relicsOfFamilyPool(f).length, 0)
  + types.reduce((a, t) => a + relicsOfDude(t).length, 0);
const poolOdds = (n) => Math.min(1, WEIGHT.seen / n);
// Role fill (user 2026-11-25): a Dude offer of a new type, while the team has fewer than act1 types (Act 1 brings
// five: new types on rounds 1, 3, 6, 9, 17), scores w x the share of the missing roles it fills x urgency (missing
// roles / type picks left). Roles: each Dude's Effect role (extract data/effect_roles.json: the user's audit ruling,
// else mapped from the game's DudeType.roles); his primary fills a role, his secondary half; a role needs 1
// (w 40, user ask 2026-11-25: tools/weight_preview.js, Act 1 teams with all four roles 17% -> 54%; the ceiling with
// three random Dudes per offer is 57%, synergy unchanged)
// Staged (user 2026-11-26: role fill weighed too high early, crowding out shared mechanics): stage = the role weight
// per pick, indexed by Dude types already held (1 = the 2nd Dude); picks 2-3 let synergy set the build's focus, picks
// 4-5 make sure every role has at least a secondary: a late pick scores both needs, the role covered at all (a
// secondary is enough) and the role filled by a primary. stage null = the flat w x urgency rule above. 0/3/3/40/100
// (tools/weight_preview.js, 300 drafts): role fill overrules synergy on the 2nd / 3rd Dude 14% / 9% (was 35% / 33%),
// Act 1 teams with every role covered 54% (was 62%); late weights past 20/40 change little (the three offered Dudes cap it)
const ROLE = { w: 40, act1: 5, roles: ["Tank", "DPS", "Healer", "Support"], stage: [0, 3, 3, 40, 100], late: 3 };
const roleNeed = (types, full = 1) => ROLE.roles.reduce((a, r) => a + (full - Math.min(full, types.reduce((s, t) => {
  const er = DUDE[t]?.er || [];
  return s + (er[0] === r ? 1 : er[1] === r ? 0.5 : 0);
}, 0))) / full, 0);
function roleFill(x, types) {
  if (!x.t || !x.er || types.includes(x.t) || types.length >= ROLE.act1) return 0;
  const after = [...types, x.t];
  if (!ROLE.stage) {
    const need = roleNeed(types);
    return ROLE.w * (need - roleNeed(after)) * (need / (ROLE.act1 - types.length));
  }
  const gain = roleNeed(types) - roleNeed(after) + (types.length >= ROLE.late ? roleNeed(types, 0.5) - roleNeed(after, 0.5) : 0);
  return (ROLE.stage[types.length] || 0) * gain;
}
// Reroll (user 2026-11-25): Pocket Dice reroll Flyers (new Dude types) and Trinket Stashes (and relic stashes, boss
// modifiers, the Merchant; those are left to cash or skipped, user). For an offer of three Dudes or three trinkets the
// Draft scores everything a reroll could bring (new Dude types / unbound trinkets, each equally likely: decoded,
// extract docs/offer_draws.md; a Flyer the player hasn't discovered yet weighs 3 in the game, not modelled). It judges
// a reroll on what it typically brings, not the average (user: one outlier, Necrodude at 200+, lifted the average
// past what a reroll gives): the median best of a fresh three, and shows the chance that it beats the best offered.
// Reroll when the typical best beats the best offered by more than a die saved is worth: at each remaining offer
// (5 Flyers in Act 1, 5 Trinket Stashes), the mean gain of a typical reroll over a typical offer (scored on today's
// build); the dice-th largest of those, 0 with a die to spare
const DICE = { flyers: 5, stashes: 5 };
// best of 3 drawn without replacement from scores: [[value, probability]] (the i-th lowest is best with C(i, 2) / C(n, 3))
function best3(scores) {
  const s = scores.slice().sort((a, b) => a - b), n = s.length;
  if (n <= 3) return n ? [[s[n - 1], 1]] : [];
  const all = (n * (n - 1) * (n - 2)) / 6;
  return s.map((v, i) => [v, (i * (i - 1)) / 2 / all]);
}
// the median of a [[value, probability]] list sorted by value; the chance it holds a value above x
const distMedian = (d) => { let c = 0; for (const [v, p] of d) if ((c += p) >= 0.5) return v; return d.length ? d[d.length - 1][0] : 0; };
const distAbove = (d, x) => d.reduce((a, [v, p]) => a + (v > x ? p : 0), 0);
const dieValue = (d) => { const m = distMedian(d); return d.reduce((a, [v, p]) => a + p * Math.max(0, m - v), 0); };
let rrMemo = [null, null];   // [state key, advice]: scoring every possible offer is too slow to repeat on each render
function rerollAdvice() {
  const memo = JSON.stringify([draft.build, draft.slots, draft.wield, draft.dice]);
  if (rrMemo[0] !== memo) rrMemo = [memo, rerollCalc()];
  return rrMemo[1];
}
function rerollCalc() {
  const ks = draft.slots.filter(Boolean);
  const kind = ks.length && ks.every((k) => k.startsWith("dude:")) ? "dude" : ks.length && ks.every((k) => k.startsWith("trinket:")) ? "trinket" : null;
  const types = [...new Set(draft.build.filter((k) => k.startsWith("dude:")))].map((k) => k.slice(5));
  if (!kind || (kind === "dude" && types.length >= DICE.flyers)) return null;
  const dist = (kd) => best3((kd === "dude" ? dudesSorted.filter((d) => !d.sum && !types.includes(d.t))
    : trinketsSorted.filter((x) => !boundTo("trinket", x.id))).map((x) => overlap(x, draft.build).score));
  const here = dist(kind);
  const med = distMedian(here), cur = Math.max(...ks.map((k) => overlap(itemOf(k), draft.build).score));
  // a die kept: what it's worth at the remaining offers (this one not counted)
  const flyers = DICE.flyers - types.length - (kind === "dude" ? 1 : 0);
  const stashes = DICE.stashes - Object.keys(draft.wield).length - (kind === "trinket" ? 1 : 0);
  const vd = flyers > 0 ? dieValue(kind === "dude" ? here : dist("dude")) : 0;
  const vt = stashes > 0 ? dieValue(kind === "trinket" ? here : dist("trinket")) : 0;
  const later = [...Array(Math.max(0, flyers)).fill(vd), ...Array(Math.max(0, stashes)).fill(vt)].sort((a, b) => b - a);
  const keep = draft.dice <= later.length ? later[draft.dice - 1] || 0 : 0;
  return { med, cur, better: distAbove(here, cur), gain: med - cur, keep, go: draft.dice > 0 && med - cur > keep };
}
// what an offer shares with the build:game Family, its relic pool, names / owned relics, synergy edges
function overlap(x, build, sec) {
  const items = build.map(itemOf);
  const dudes = items.filter((b) => b.t);
  const out = { fam: [], links: [], secs: [], score: 0 };
  const famCount = (f) => dudes.filter((b) => b.fam.includes(f)).length;
  if (x.t) {
    for (const f of x.fam) if (f !== "global" && famCount(f)) out.fam.push([f, famCount(f)]);
    for (const b of items) if (b.id && b.dude === x.t && !out.links.includes(b)) out.links.push(b);
  } else if (x.pool === "dude") {
    if (DUDE[x.dude] && dudes.includes(DUDE[x.dude])) out.links.push(DUDE[x.dude]);
  } else if (x.pool === "family" && famCount(x.fam)) out.fam.push([x.fam, famCount(x.fam)]);
  const k = keyOf(x);
  for (const e of H.refs) {
    const other = e.a === k ? e.b : e.b === k ? e.a : null;
    if (other && build.includes(other) && !out.links.includes(itemOf(other))) out.links.push(itemOf(other));
  }
  // synergy pairs, each scored once under its receiver: the consumer (the side that scales with / reacts to the
  // channel). A Family / Universal / Promoter relic can't receive, so it scores where it contributes (either side)
  const mine = unitOf(x);
  const team = [...new Set(dudes)];
  const fams = buildFams(team);
  // the offer's effects (a Dude: his ability and all his relics); the build's, each under the row it scores in:
  // its Dude (his ability and all his relics) or its Family (relics of a Family the build has a member of, or picked)
  const newFx = x.t ? effectsOfUnit(mine) : x.pool === "food" ? [k, ...(sec ? ["foodstat:" + sec] : [])] : [k];
  const owner = new Map();
  for (const d of team) if ("dude:" + d.t !== mine) for (const e of [...effectsOfUnit("dude:" + d.t), ...heldKeys(d)]) owner.set(e, d);
  for (const r of [...fams.flatMap(relicsOfFamilyPool), ...items.filter((b) => b.id && b.pool !== "dude")])
    if (!newFx.includes(keyOf(r))) owner.set(keyOf(r), groupOf(r));
  // sections: the offer (what it receives), each build Dude (what he receives from the offer), each Family the
  // offer brings in (vs the build's Dudes and Families only), each build Family (what it takes from the offer)
  // pair weights (WEIGHT): the pool before the offer (n0) and after it (n1: a new Dude type adds his relics, a new
  // Family its pool); a relic not taken weighs its odds in the pool it is scored in
  const mag = MAG[WEIGHT.mode] || MAG.flat;
  const have = new Set(build);
  const newFams = x.t ? x.fam.filter((f) => f !== "global" && FAM[f] && !fams.includes(f)) : [];
  const types = team.map((d) => d.t);
  const n0 = poolSize(types, fams);
  const n1 = x.t && !types.includes(x.t) ? poolSize([...types, x.t], [...fams, ...newFams]) : n0;
  const av = (e, n) => (have.has(e) || e === k || !e.startsWith("relic:") ? 1 : poolOdds(n));
  const pw = (a, b, n = n1) => av(a, n) * av(b, n);
  const self = new Map(), dudeRows = new Map(), famRows = new Map();
  const receives = mine.startsWith("dude:");   // a Dude, or one of his relics
  const offered = x.pool in HELD;              // a held-item offer: each free Dude's row = giving it to him (one each)
  const taken = (t) => offered && HELD[x.pool].get(t);
  // a two-step pair's middle effect must be in the build or the offer, and weighs its own odds
  const hasMid = (m) => owner.has(m) || newFx.includes(m);
  // a gated facet weighs the odds its gates are open: per gate, the summed weights of the build's effects that open
  // it (the offer's too, unless scoring the build without it), capped at 1; several gates in one sentence multiply
  const gate = (e, gs = [], n, off) => gs.reduce((a, g) => a * Math.min(1, (GATE[e]?.[g] || [])
    .filter((x) => x !== e && (owner.has(x) || (off && newFx.includes(x)))).reduce((t, x) => t + av(x, n), 0)), 1);
  const lw = (l, a, n = n1, off = true) => pw(a, l.o, n) * (l.two ? av(l.mid, n) : 1) * gate(a, l.g, n, off) * gate(l.o, l.og, n, off);
  for (const s of newFx)
    for (const l of pairsOf(s, hasMid)) {
      const h = owner.get(l.o);
      if (!h || (!offered && !pairOk(l, s, l.o)) || (h.t && taken(h.t))) continue;
      const w = lw(l, s), c = chKey(l);
      if (receives && !l.give) putPair(self, x, c, s, l.label, l.o, l.olabel, w, av(l.o, n1), l.o);
      // a trinket offer only meets drafted Dudes: a Family / Global relic reaches every Dude ("All Dudes gain",
      // "When a Dude ..."; its Family only decides who can be offered it), so it counts in each free Dude's row
      else if (offered && !h.t) for (const d of team.filter((d) => !taken(d.t))) putPair(dudeRows, d, c, l.o, l.olabel, s, l.label, w, av(l.o, n1), l.o);
      else putPair(h.t ? dudeRows : famRows, h, c, l.o, l.olabel, s, l.label, w, av(l.o, n1), l.o);
    }
  out.secs.push({ rows: scoreRows(self, mag, WEIGHT.rare) }, { rows: scoreRows(dudeRows, mag, WEIGHT.rare) });
  for (const f of newFams) {
    const rows = new Map();
    for (const r of relicsOfFamilyPool(f))
      for (const l of pairsOf("relic:" + r.id, hasMid)) {
        const h = owner.get(l.o);
        if (h && h !== FAM[f] && pairOk(l, "relic:" + r.id, l.o)) putPair(rows, h, chKey(l), l.o, l.olabel, "relic:" + r.id, l.label, lw(l, "relic:" + r.id), av(l.o, n1), l.o);
      }
    out.secs.push({ head: FAM[f], rows: scoreRows(rows, mag, WEIGHT.rare) });
  }
  out.secs.push({ rows: scoreRows(famRows, mag, WEIGHT.rare) });
  for (const sec of out.secs) sec.score = sec.rows.reduce((a, r) => a + r.score, 0);
  // a held item goes to one Dude: it scores its best Dude, not all of them
  if (offered) out.secs[1].score = out.secs[1].rows.length ? out.secs[1].rows[0].score : 0;
  // dilution: what the build's own pairs lose when the pool grows from n0 to n1 (each pair once, under its receiver)
  out.dilute = 0;
  if (n1 > n0 && WEIGHT.mode !== "flat") {
    const at = (n) => {
      const rows = new Map();
      for (const [e, h] of owner)
        for (const l of pairsOf(e, (m) => owner.has(m))) {
          const o = owner.get(l.o);
          if (!l.give && o && o !== h && pairOk(l, e, l.o)) putPair(rows, h, chKey(l), e, l.label, l.o, l.olabel, lw(l, e, n, false), av(l.o, n), l.o);
        }
      return scoreRows(rows, mag, WEIGHT.rare).reduce((a, r) => a + r.score, 0);
    };
    out.dilute = Math.round((at(n1) - at(n0)) * 10) / 10;
  }
  // rounded to the shown precision, so offers showing the same score tie (float sums differ by order)
  out.role = Math.round(roleFill(x, types) * 10) / 10;
  const total = out.secs.reduce((a, sec) => a + sec.score, 0) + out.dilute + out.role + 3 * out.fam.reduce((s, f) => s + f[1], 0) + 3 * out.links.length;
  out.score = Math.round(total * 10) / 10;
  // shown apart: what each Family the offer brings in adds (its relics), and the offer's own fit (the rest);
  // the recommendation still ranks by the combined score
  out.newFams = out.secs.filter((sec) => sec.head).map((sec) => ({ f: sec.head, score: Math.round(sec.score * 10) / 10, rows: sec.rows }));
  out.own = Math.round((total - out.dilute - out.role - out.newFams.reduce((a, n) => a + n.score, 0)) * 10) / 10;
  return out;
}

// pair rows: row key -> {x: its Dude / Family / offer, ch: channel -> {theirs: the row's effects, mine: the other
// side's}, effect key -> facet labels}; a row scores the weight of each distinct channel it holds
const addTo = (m, k, v) => (m.get(k) || m.set(k, new Set()).get(k)).add(v);
const headKey = (h) => (h.t ? "dude:" + h.t : FAM[h.id] === h || h.src ? "family:" + h.id : keyOf(h));
// bk / bw: the pair's build-side effect and its weight (the build's investment in the channel, WEIGHT.growOn "build")
function putPair(rows, h, ch, own, ownLabel, other, otherLabel, w = 1, bw, bk) {
  const hk = headKey(h);
  const row = rows.get(hk) || rows.set(hk, { x: h, ch: new Map() }).get(hk);
  const c = row.ch.get(ch) || row.ch.set(ch, { theirs: new Map(), mine: new Map(), w: 0, b: new Map() }).get(ch);
  addTo(c.theirs, own, ownLabel);
  addTo(c.mine, other, otherLabel);
  c.w += w;
  if (bk) c.b.set(bk, bw);
}
// a channel's magnitude: mag(summed pair weights); WEIGHT.growOn "build" grows it only with the build's own effects
const magOf = (v, mag) => (mag === MAG.grow && WEIGHT.growOn === "build" && v.b?.size
  ? v.w * [...v.b.values()].reduce((a, x) => a + x, 0) ** (WEIGHT.exp - 1) : mag(v.w));
// a row's score: each channel's rarity x its magnitude (WEIGHT.mode; the Team view stays flat); a two-step channel x HALF
const scoreRows = (rows, mag = MAG.flat, rare = 1) => [...rows.values()]
  .map((r) => ({ ...r, score: [...r.ch].reduce((a, [c, v]) => a + chWeight(chBase(c)) ** rare * (c === chBase(c) ? 1 : HALF) * magOf(v, mag), 0) }))
  .sort((a, b) => b.score - a.score || byName(a.x, b.x));
// Team view: pairs between the source effects and the target effects (ok(key)), one row per owner: a Dude (his
// ability and relics) or the group of a Family / Universal / Promoter relic
function holders(src, ok) {
  const rows = new Map();
  for (const s of src)
    for (const l of pairsOf(s, (m) => ok(m) || src.includes(m))) {
      if (!ok(l.o) || !pairOk(l, s, l.o)) continue;
      const t = itemOf(l.o);
      const tu = unitOf(t);
      putPair(rows, tu.startsWith("dude:") ? DUDE[tu.slice(5)] : groupOf(t) || t, chKey(l), l.o, l.olabel, s, l.label);
    }
  return scoreRows(rows);
}
const num1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const iconBtn = (k) => { const b = itemOf(k); return `<button class="vi" data-open="${k}" title="${esc(b.name)}">${img(b.icon, b.name)}</button>`; };
// one side of a pair: each ability / relic (icon, tap to open) beside what it does, items doing the same grouped
function pairSide(m) {
  const by = new Map();   // facet labels -> effect keys
  for (const [k, v] of m) addTo(by, [...v].join(" / "), k);
  return `<span class="side">${[...by].map(([lab, ks]) => `<span class="fx">${[...ks].map(iconBtn).join("")}<small>${esc(lab)}</small></span>`).join("")}</span>`;
}
// per row: its name and score, then one line per channel: its effects ↔ the other side's
const holderRows = (rows) => rows.map((r) => `<div class="hold"><button class="hhead" data-open="${headKey(r.x)}">${img(r.x.icon, r.x.name)}<span>${esc(r.x.name)}</span><b>${num1(r.score)}</b></button>
    ${[...r.ch].sort((a, b) => chRank(b[0]) - chRank(a[0])).map(([, c]) => `<div class="pair">${pairSide(c.theirs)}<i>↔</i>${pairSide(c.mine)}</div>`).join("")}</div>`).join("");
// an offer's sections in order (a Family the offer brings in is shown apart, under its own bar)
const secHtml = (sec) => holderRows(sec.rows);

// a meal's extra stat: one chip per stat (its value as the extra stat), the chosen one pressed
// once one is chosen only it shows; tapping it clears the choice and brings the rest back
const statChips = (attr, who, cur) => `<div class="chips wsec">${H.foodstats.filter((st) => !cur || cur === st.id).map((st) => `<button class="fchip" data-${attr}="${who}|${st.id}"
  aria-pressed="${cur === st.id}">${esc(st.name)} ${esc(segText(st.seg.filter((g) => g[0] === "v")))}</button>`).join("")}</div>`;

// Take for a Dude / relic offer; a trinket / meal offer is given to one Dude instead: a button per Dude in the build
// who doesn't hold one yet, the best fit first (highlighted)
function giveOrTake(i, x, o) {
  if (!(x.pool in HELD)) return `<button class="take" data-take="${i}">Take</button>`;
  const free = [...new Set(draft.build.filter((k) => k.startsWith("dude:")))].map(itemOf).filter((d) => !HELD[x.pool].get(d.t));
  const score = (d) => o.secs[1].rows.find((r) => r.x === d)?.score || 0;
  const top = Math.max(0, ...free.map(score));
  return free.length ? `<div class="give">${free.sort((a, b) => score(b) - score(a) || byName(a, b)).map((d) => `<button class="take${top && score(d) === top ? "" : " alt"}"
    data-give="${i}|${d.t}">${img(d.icon, d.name)}<span>${esc(d.name)}</span></button>`).join("")}</div>` : "";
}

function slotHtml(i, best, maxes) {
  const key = draft.slots[i];
  if (!key) return "";
  const x = itemOf(key);
  const o = overlap(x, draft.build, draft.slotSec[i]);
  const label = x.t ? x.fam.map(famIcon).join("") : poolIcon(x);
  const text = (x.ab ? `<div class="ab">${esc(x.ab)}${fnTag(x)}</div>` : "") + renderSegs(x.seg, keyOf(x));
  const ov = [
    ...o.fam.map(([f, n]) => `<button class="chiplink" data-open="family:${f}">${famIcon(f)}${esc(FAM[f].name)} ×${n}</button>`),
    ...o.links.map((b) => `<button class="chiplink" data-open="${keyOf(b)}">${img(b.icon, b.name)}${esc(b.name)}</button>`),
  ];
  return `<div class="slot${o.score === best ? " best" : ""}">
    <div class="shead"><button class="rhead" data-open="${key}">${img(x.icon, x.name)}<span>${esc(x.name)}</span>${x.t ? "" : fnTag(x)}</button>
      <span class="slabel">${label}</span><button class="x" data-unslot="${i}" aria-label="Clear">×</button></div>
    <div class="rdesc">${text}</div>${x.pool === "food" ? statChips("fsec", i, draft.slotSec[i]) : ""}
    ${draft.build.length ? `<div class="ovl"><span>Overlap</span>${bar(o.own, maxes.own)}<b>${num1(o.own)}</b></div>${ov.length ? `<div class="chipline">${ov.join("")}</div>` : ""}${o.secs.filter((sec) => !sec.head).map(secHtml).join("")}
      ${o.newFams.map((n) => `<div class="ovl nfam"><button class="chiplink" data-open="family:${n.f.id}">${famIcon(n.f.id)}${esc(n.f.name)}</button>${bar(n.score, maxes.fam)}<b>${num1(n.score)}</b></div>${holderRows(n.rows)}`).join("")}
      ${o.dilute ? `<div class="ovl nfam"><span>Pool dilution</span><span></span><b>${num1(o.dilute)}</b></div>` : ""}
      ${o.role ? `<div class="ovl nfam"><span>Fills ${esc(x.er.filter(Boolean).join(" / "))}</span><span></span><b>${num1(o.role)}</b></div>` : ""}
      ${o.newFams.length || o.dilute || o.role ? `<div class="ovl total"><span>Total</span>${bar(o.score, maxes.total)}<b>${num1(o.score)}</b></div>` : ""}` : ""}
    ${giveOrTake(i, x, o)}</div>`;
}

// Team view: a Dude's own effects (his ability, his held items, his picked relics); a picked Family / Universal /
// Promoter relic is its group's, never credited to a Dude (as in the offers' Family rows)
function ownOf(d, counts) {
  return ["dude:" + d.t, ...heldKeys(d), ...Object.keys(counts).filter((k) => k.startsWith("relic:") && itemOf(k).dude === d.t)];
}
const groupPicks = (counts) => Object.keys(counts).filter((k) => k.startsWith("relic:") && itemOf(k).pool !== "dude");
// under a Dude or a group: what each of its effects does, then its edges to the rest of the build (the other Dudes'
// own effects, each picked group relic in its group's row)
// Team view folds (closed by default; the ones opened stay open across re-renders): under each Dude / group, one
// "Effects" fold holds its effect list and every edge row, so only the headers and relic picks (what's collected) show
const fxOpen = new Set();
const fold = (id, label, body) => (body ? `<details class="fxlist" data-fxlist="${id}"${fxOpen.has(id) ? " open" : ""}><summary>${label}</summary>${body}</details>` : "");
function teamHtml(id, mine, team, counts, stats = []) {
  const theirs = new Set([...team.flatMap((o) => ownOf(o, counts)), ...groupPicks(counts)].filter((k) => !mine.includes(k)));
  const fx = mine.filter((k) => itemOf(k).fx.length)
    .map((k) => `<div class="fxrow">${iconBtn(k)}<span class="chipline">${fxChips(itemOf(k))}</span></div>`).join("");
  const edges = holders(mine, (k) => theirs.has(k));
  const body = fx + holderRows(edges);
  const html = fold(id + "|stats", "Base stats", statTable(stats)) + fold(id, "Effects", body);
  return html ? `<div class="tview">${html}</div>` : "";
}

function renderDraft() {
  // Offers / Team: a full-width bar over both panes, stuck under the page header
  const view = `<div class="dview">${[["offers", "Offers"], ["team", "Team"]]
    .map(([v, n]) => `<button data-dview="${v}" aria-pressed="${draft.view === v}">${n}</button>`).join("")}</div>`;
  const team = draft.view === "team";
  const ovs = team ? [] : draft.slots.map((k, i) => (k ? overlap(itemOf(k), draft.build, draft.slotSec[i]) : null));
  const scores = ovs.map((o) => (o ? o.score : -1));
  // one scale per bar kind (own fit, a new Family's gain, the total), each its largest among the offers
  const max = Math.max(0, ...scores);
  const maxes = { own: Math.max(0, ...ovs.map((o) => (o ? o.own : 0))),
    fam: Math.max(0, ...ovs.flatMap((o) => (o ? o.newFams.map((n) => n.score) : []))), total: max };

  const best = max > 0 && draft.slots.filter(Boolean).length > 1 ? max : null;   // every offer tied for the most overlap
  const counts = {};
  for (const k of draft.build) counts[k] = (counts[k] || 0) + 1;
  const tile = (k) =>
    `<div class="btile">${mini(itemOf(k), counts[k] > 1 ? "×" + counts[k] : "")}<button class="x" data-unbuild="${k}" aria-label="Remove">×</button></div>`;
  // each Dude, then each Family the build has a member of, then Global, with all their relics as icons: faded until picked,
  // a picked relic joins the build (and the Build effects); every other drafted relic after as a tile
  const keys = Object.keys(counts);
  const dudeKeys = keys.filter((k) => k.startsWith("dude:"));
  const fams = buildFams(dudeKeys.map(itemOf));
  const strays = [...new Set(keys.map(itemOf).filter((x) => x.pool === "family" && FAM[x.fam] && !fams.includes(x.fam)).map((x) => x.fam))];
  const relicPicks = (rs, extra = "") => `<div class="rpicks">${rs.map((r) => `<button class="rpick${counts["relic:" + r.id] ? " on" : ""}" data-toggle="relic:${r.id}" title="${esc(r.name)}"
    aria-pressed="${!!counts["relic:" + r.id]}">${img(r.icon, r.name)}</button>`).join("")}${extra}</div>`;
  // a Dude's held items (trinket, meal given from an offer) sit lit after his relics; tap one to take it back
  const heldPicks = (t) => Object.keys(HELD).map((kind) => {
    const b = HELD[kind].get(t) && itemOf(kind + ":" + HELD[kind].get(t));
    const sec = kind === "food" && b && draft.food[t].sec ? FOODSTAT[draft.food[t].sec] : null;
    const title = b ? b.name + (sec ? " + " + statVal(sec) + " " + sec.name : "") : "";
    return b ? `<button class="rpick on" data-hbind="${kind}|${t}|${b.id}" title="${esc(title)}" aria-pressed="true">${img(b.icon, b.name)}</button>` : "";
  }).join("");
  const groups = [
    ...dudeKeys.map((dk) => `<div class="bgroup">${tile(dk)}${relicPicks(relicsOfDude(dk.slice(5)), heldPicks(dk.slice(5)))}${team
      ? teamHtml(dk, ownOf(itemOf(dk), counts), dudeKeys.map(itemOf).filter((o) => "dude:" + o.t !== dk), counts, itemOf(dk).stats) : ""}</div>`),
    // a Family no drafted Dude is in, reached by a relic taken on its own (the Scavenger event): only its taken relics
    ...[...fams, ...strays].map((f) => `<div class="bgroup"><div class="fhead">${famIcon(f)}<span>${esc(FAM[f].name)}</span></div>${relicPicks(fams.includes(f)
      ? relicsOfFamilyPool(f) : relicsOfFamilyPool(f).filter((r) => counts["relic:" + r.id]))}${team
      ? teamHtml("family:" + f, groupPicks(counts).filter((k) => itemOf(k).fam === f), dudeKeys.map(itemOf), counts) : ""}</div>`),
    // last: Global, its Universal then Promoter relics, picked as they're collected
    ...(keys.length ? [`<div class="bgroup"><div class="fhead">${famIcon("global")}<span>${esc(FAM.global.name)}</span></div>${SOURCES.map((p) => relicPicks(relicsOfSource(p))).join("")}${team
      ? teamHtml("global", groupPicks(counts).filter((k) => SOURCE[itemOf(k).pool]), dudeKeys.map(itemOf), counts) : ""}</div>`] : []),
  ];
  const picked = (k) => { const x = itemOf(k); return x.pool === "dude" ? counts["dude:" + x.dude] : SOURCE[x.pool] || fams.includes(x.fam) || strays.includes(x.fam); };
  const loose = keys.filter((k) => k.startsWith("relic:") && !picked(k));
  const tiles = [...groups, ...(loose.length ? [`<div class="grid">${loose.map(tile).join("")}</div>`] : [])];
  const items = [...draft.build.map(itemOf), ...dudeKeys.flatMap((dk) => heldKeys(itemOf(dk))).map(itemOf)];
  // two panes (side by side on a wide or sideways screen, each scrolling on its own): offers, then the build
  // one box adds the next offer, pinned at the top of the offers pane (no scrolling down to an empty slot)
  const free = draft.slots.indexOf(null);
  const adder = free < 0 ? "" : `<div class="adder"><div class="arow">${draft.slots.filter(Boolean).map((k) => img(itemOf(k).icon, itemOf(k).name, "aic")).join("")}
    <input id="adder" class="search" type="search" enterkeyhint="go" placeholder="Offer ${free + 1}: Dude, relic, trinket or food" autocomplete="off"></div>
    <div class="picks" id="picks"></div></div>`;
  // Pocket Dice: the count, and for a Flyer / Trinket Stash offer whether to spend one (rerollAdvice)
  const rr = team ? null : rerollAdvice();
  const dice = team ? "" : `<div class="dice"><span>Pocket Dice</span><button data-dice="-1" aria-label="One less">−</button><b>${draft.dice}</b><button data-dice="1" aria-label="One more">+</button>${rr && draft.dice
    ? `<span class="rr${rr.go ? " go" : ""}">${rr.go ? "Reroll" : "Keep"} <small>${Math.round(rr.better * 100)}% better · ${num1(rr.med)} vs ${num1(rr.cur)}</small></span>${rr.go ? `<button class="take" data-reroll="1">Reroll</button>` : ""}` : ""}</div>`;
  return `${view}<div class="draft${team ? " team" : ""}"><div class="dpane">${team ? "" : `<h3>Offers</h3>${adder}${dice}<div class="slots">${draft.slots.map((_, i) => slotHtml(i, best, maxes)).join("")}</div>`}</div>
    <div class="dpane"><h3>Build</h3>${tiles.length
      ? `<div class="bgroups">${tiles.join("")}</div>${team ? fold("build", "Build effects", effectBars(itemEffects(items, 8), true)) : section("Build effects", effectBars(itemEffects(items, 8), true))}
        <button class="clear" data-clearbuild="1">Clear build</button>`
      : `<div class="empty">Take an offer to start a build</div>`}</div></div>`;
}

function pickResults(q) {
  q = q.trim().toLowerCase();
  if (!q) return "";
  const free = trinketsSorted.filter((x) => !boundTo("trinket", x.id));   // a bound trinket can't be drafted again
  const hits = [...dudesSorted, ...relicsSorted, ...free, ...foodSorted]
    .filter((x) => match(q, x.name) && !draft.slots.includes(keyOf(x)))
    // names that start with what's typed first, then a word in them, then anywhere (fewer letters to reach a pick)
    .map((x, i) => { const n = x.name.toLowerCase(); return [n.startsWith(q) ? 0 : n.includes(" " + q) ? 1 : 2, i, x]; })
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 12).map((h) => h[2]);
  return hits.map((x) => itemRow(x, `data-pick="${keyOf(x)}"`)).join("") || `<div class="empty">No matches</div>`;
}

function offer(key) {
  const i = draft.slots.indexOf(null);
  draft.slots[i < 0 ? SLOTS - 1 : i] = key;
}

/* ---------- detail views ---------- */
// full relic container: header (opens the relic), its effect text and its synergy tags
function relicCard(r) {
  return `<div class="rcard"><button class="rhead" data-open="${keyOf(r)}">${img(r.icon, r.name)}<span>${r.pr ? `<b class="rank">#${r.pr}</b>` : ""}${esc(r.name)}</span>${fnTag(r)}</button>
    <div class="rdesc">${renderSegs(r.seg, keyOf(r))}</div>${FEATURES.synergy ? fxLine(r) : ""}</div>`;
}

// draft action in the detail sheet's header bar (Dude and relic pages)
const offerBtn = (key) =>
  !FEATURES.draft ? "" : draft.slots.includes(key)
    ? `<button class="offer" disabled>In draft</button>`
    : `<button class="offer" data-offer="${key}">+ Add to Draft</button>`;
const relicCards = (rs) => (rs.length ? `<div class="rcards">${rs.map(relicCard).join("")}</div>` : "");

function dudeView(t) {
  const d = DUDE[t];
  if (!d) return null;
  const key = "dude:" + t;
  // Effect functions: every Function / Focus of his ability + relics together, one row per Function: its name once,
  // then each Focus; ×n = how many of his effects (ability + relics) carry that Function / Focus
  const kit = [d, ...relicsOfDude(t)].filter((x) => x.fn);
  const fnN = (x) => kit.filter((y) => fnText(y) === fnText(x)).length;
  const fns = [...new Map(kit.map((x) => [fnText(x), x])).values()].sort((a, b) => fnRank(a) - fnRank(b));
  const fnRows = [...new Set(fns.map((x) => x.fn[0]))]
    .map((f) => `<div class="tags fn-${f}"><span class="fnhead">${esc(f)}:</span>${fns.filter((x) => x.fn[0] === f)
      .map((x) => `<span class="tag fn fn-${f}">${esc(x.fn[1] || f)}<b>×${fnN(x)}</b></span>`).join("")}</div>`)
    .join("");
  const roleRow = (FEATURES.roles && d.roles.length ? `<div class="meta"><span class="lbl">Role:</span>${roleBadge(d)}</div>` : "")
    + (FEATURES.roles && d.er ? `<div class="meta"><span class="lbl">Effect role:</span>${esc(d.er.filter(Boolean).join(" · "))}</div>` : "");
  // his relics in the audit's priority order (rank pr), unranked ones A-Z after
  const relics = relicsOfDude(t).sort((a, b) => (a.pr || 1e9) - (b.pr || 1e9));
  const family = d.fam.map((f) => `<div class="meta">${famChip(f)}</div>${grid(membersOf(f).filter((x) => x.t !== t).map((x) => mini(x)))}`).join("");
  const out = refsFrom(key).map((e) => e.b.split(":")[1]).filter((x) => DUDE[x]).map((x) => mini(DUDE[x]));
  const inbound = refsTo(key)
    .map((e) => e.a.split(":"))
    .map(([k, id]) => (k === "dude" ? DUDE[id] : RELIC[id]))
    .filter((x) => x && !(x.id && x.dude === t))
    .map((x) => mini(x, x.id ? esc(poolLabel(x)) : ""));
  const syn = FEATURES.synergy;
  return `<div class="hero dhero">${img(d.icon, d.name)}<div><div class="hname"><h2>${esc(d.name)}</h2>${d.fam.map(famChip).join("")}</div>${roleRow}</div></div>
    ${statTable(d.stats, DUDE_STAT_MAX)}
    ${FEATURES.roles ? section("Effect functions", fnRows ? `<div class="role">${fnRows}</div>` : "") : ""}
    ${syn ? section("Effect edges", edgeBars(t)) : ""}
    ${section("Intrinsic effect", d.ab || d.seg.length ? `<div class="desc">${d.ab ? `<div class="ab">${esc(d.ab)}${fnTag(d)}</div>` : ""}${renderSegs(d.seg, keyOf(d))}${syn ? fxLine(d) : ""}</div>` : "")}
    ${section("Relics", relicCards(relics))}
    ${section("Top trinkets", grid((d.picks?.tr || []).map((id, i) => mini(TRINKET[id], "#" + (i + 1)))))}
    ${section("Top food", grid((d.picks?.fd || []).map((id, i) => mini(FOOD[id], "#" + (i + 1)))))}
    ${syn ? section("Synergy Dudes", grid(partners(key, "dude", 12).map(partnerMini))) : ""}
    ${syn ? section("Synergy relics", grid(partners(key, "relic", 8).map(partnerMini))) : ""}
    ${syn ? twoStep(key, effectsOfUnit(key)) : ""}
    ${section("Family", family)}
    ${section("Names", grid(out))}
    ${section("Named by", grid(inbound))}`;
}

function relicView(id) {
  const r = RELIC[id];
  if (!r) return null;
  const key = "relic:" + id;
  const pool = r.pool === "dude" ? dudeChip(r.dude) + famChip(r.fam) : r.pool === "family" ? famChip(r.fam) : `<span class="badge">${esc(poolLabel(r))}</span>${famChip(r.fam)}`;
  const refs = refsFrom(key).map((e) => e.b.split(":")[1]).filter((x) => DUDE[x] && x !== r.dude).map((x) => mini(DUDE[x]));
  // this relic's own effect links (not his owner's whole kit)
  const linked = (H.links[key] || []).filter(([u]) => unitItem(u)).map(([u, score, chs]) => partnerMini({ u, score, chs }));
  const syn = FEATURES.synergy;
  return `<div class="hero">${img(r.icon, r.name)}<div><h2>${esc(r.name)}${fnTag(r)}</h2><div class="meta">${pool}</div></div></div>
    <div class="desc">${renderSegs(r.seg, keyOf(r))}${syn ? fxLine(r) : ""}</div>
    ${syn ? section("Synergies", grid(linked)) : ""}
    ${syn ? twoStep(key, [key]) : ""}
    ${section("Names", grid(refs))}`;
}

function familyView(f) {
  const fam = FAM[f];
  if (!fam) return null;
  const members = membersOf(f);
  const perDude = members
    .filter((d) => relicsOfDude(d.t).length)
    .map((d) => `<h3>${esc(d.name)}</h3>${grid(relicsOfDude(d.t).map((r) => mini(r)))}`)
    .join("");
  return `<div class="hero">${img(fam.icon, fam.name)}<div><h2>${esc(fam.full)}</h2></div></div>
    ${fam.desc ? `<p class="prose">${esc(fam.desc)}</p>` : ""}
    ${section("Common effects", effectList(f, 8, true))}
    ${section("Dudes", grid(members.map((d) => mini(d, FEATURES.roles ? esc([d.roles.join(", "), fnText(d)].filter(Boolean).join(" · ")) : ""))))}
    ${f === "global" ? SOURCES.map((p) => section(SOURCE[p].name + " relics", relicCards(relicsOfSource(p)))).join("") +
      section("Trinkets", relicCards(trinketsSorted)) + section("Food", relicCards(foodSorted))
      : section("Family relics", relicCards(relicsOfFamilyPool(f)))}
    ${perDude}`;
}

// a channel: the effects that give / trigger it and the effects that scale with / react to it
function chView(c) {
  const ch = CH[c];
  if (!ch) return null;
  const side = (keys) => {
    const xs = keys.map(itemOf).filter(Boolean).sort(byName);
    return grid(xs.map((x) => mini(x, x.t ? "" : esc(poolLabel(x) || ""), true)));
  };
  return `<div class="hero"><div><h2>${esc(c)}</h2></div></div>
    ${section(ch.stat ? "Gives" : "Triggers", side(ch.prov))}
    ${section(ch.stat ? "Scales with it" : "Reacts to it", side(ch.use))}`;
}

// held picks the other way round: the Dudes whose top 4 (picks.tr / picks.fd) hold this trinket / meal, one row per placement
const pickedBy = (k, id) => [0, 1, 2, 3].map((i) => [i, dudesSorted.filter((d) => d.picks?.[k][i] === id)]).filter(([, ds]) => ds.length)
  .map(([i, ds]) => `<div class="meta"><span class="lbl">#${i + 1}</span></div>${grid(ds.map((d) => mini(d)))}`).join("");

// a Trinket: its effect and the units it links to (a Wielder effect meets the Dude it is bound to)
function trinketView(id) {
  const t = TRINKET[id];
  if (!t) return null;
  const linked = (H.links["trinket:" + id] || []).filter(([u]) => unitItem(u)).map(([u, score, chs]) => partnerMini({ u, score, chs }));
  return `<div class="hero">${img(t.icon, t.name)}<div><h2>${esc(t.name)}</h2><div class="meta"><button class="chiplink" data-open="stash:all">${poolIcon(t)}Trinket Stash</button></div></div></div>
    <div class="desc">${renderSegs(t.seg, keyOf(t))}${FEATURES.synergy ? fxLine(t) : ""}</div>
    ${section("Recommended on", pickedBy("tr", id))}
    ${FEATURES.synergy ? section("Synergies", grid(linked)) + twoStep("trinket:" + id, ["trinket:" + id]) : ""}`;
}
// the Trinket Stash: every Trinket
function stashView() {
  const stash = H.pools.trinket;
  return `<div class="hero">${img(stash.icon, "Trinket Stash")}<div><h2>Trinket Stash</h2></div></div>
    ${section("Common effects", effectBars(itemEffects(trinketsSorted, 8), true))}
    ${section("Trinkets", relicCards(trinketsSorted))}`;
}

// a meal: its main stat, its synergy partners; the extra stat is rolled with the offer (Food Dude page)
function foodView(id) {
  const m = FOOD[id];
  if (!m) return null;
  const linked = (H.links["food:" + id] || []).filter(([u]) => unitItem(u)).map(([u, score, chs]) => partnerMini({ u, score, chs }));
  return `<div class="hero">${img(m.icon, m.name)}<div><h2>${esc(m.name)}</h2><div class="meta"><button class="chiplink" data-open="meals:all">${poolIcon(m)}Food Dude</button></div></div></div>
    <div class="desc">${renderSegs(m.seg)}${FEATURES.synergy ? fxLine(m) : ""}</div>
    ${section("Recommended on", pickedBy("fd", id))}
    ${FEATURES.synergy ? section("Synergies", grid(linked)) + twoStep("food:" + id, ["food:" + id]) : ""}`;
}
// the Food Dude: every stat (as a meal's main stat, as the extra stat), then every meal
const statVal = (x) => segText(x.seg.filter((g) => g[0] === "v"));
function mealsView() {
  const rows = H.foodstats.map((st) => {
    const m = H.food.find((f) => f.stat === st.id);
    return `<tr><td>${esc(st.name)}</td><td>${m ? `<button class="chiplink" data-open="food:${m.id}">${img(m.icon, m.name)}${esc(m.name)}</button>` : ""}</td>
      <td class="num">${m ? esc(statVal(m)) : ""}</td><td class="num">${esc(statVal(st))}</td></tr>`;
  }).join("");
  return `<div class="hero">${img(H.pools.food.icon, "Food Dude")}<div><h2>Food Dude</h2></div></div>
    <h3>Stats</h3><table class="stats"><tr><th>Stat</th><th>Meal</th><th class="num">Main</th><th class="num">Extra</th></tr>${rows}</table>
    ${section("Meals", relicCards(foodSorted))}`;
}

// an Enemy: when it shows up, its stats and traits, and the boss fights that field it
const tierText = (t) => (t.length === 3 ? "" : "Tier " + (t.length === 1 ? t[0] : t[0] + "–" + t[t.length - 1]));
const enemyWhen = (e) => [e.from > 1 ? "From round " + e.from : "From the start", e.to ? "until round " + e.to : "", tierText(e.tiers)].filter(Boolean).join(" · ");
const enemyChip = (id) => (ENEMY[id] ? `<button class="chiplink" data-open="enemy:${id}">${img(ENEMY[id].icon, ENEMY[id].name)}${esc(ENEMY[id].name)}</button>` : esc(id));
const traitCard = (id) => {
  const t = TRAIT[id];
  return t ? `<div class="rcard"><button class="rhead" data-open="trait:${id}">${img(t.icon, t.name)}<span>${esc(t.name)}</span></button>
    <div class="rdesc">${renderSegs(t.seg, "trait:" + id)}</div></div>` : "";
};
function enemyView(id) {
  const e = ENEMY[id];
  if (!e) return null;
  const when = [e.from > 1 ? "From round " + e.from : "From the start", e.fromc !== e.from ? "Challenge: round " + e.fromc : "",
    e.to ? "Last round " + e.to : "", tierText(e.tiers), e.fly ? "Flying" : ""].filter(Boolean);
  const bosses = e.bosses.map(([wk, tiers, list]) => `<div class="boss"><span class="bwk">Round ${wk}${tierText(tiers) ? "<br>" + tierText(tiers) : ""}</span>
    <span class="bparts">${list.map(([t, n]) => `<span class="bpart">${n ? n + "×" : ""}${enemyChip(t)}</span>`).join("")}</span></div>`).join("");
  return `<div class="hero">${img(e.icon, e.name)}<div><h2>${esc(e.name)}</h2><div class="meta">${when.map((w) => `<span class="tag">${esc(w)}</span>`).join("")}</div></div></div>
    ${statTable(e.stats)}
    ${section("Traits", e.traits.length ? `<div class="rcards">${e.traits.map(traitCard).join("")}</div>` : "")}
    ${section("Boss fights", bosses)}`;
}
// a Trait: its effect and every enemy that has it
function traitView(id) {
  const t = TRAIT[id];
  if (!t) return null;
  const who = enemiesSorted.filter((e) => e.traits.includes(id));
  return `<div class="hero">${img(t.icon, t.name)}<div><h2>${esc(t.name)}</h2></div></div>
    <div class="desc">${renderSegs(t.seg, "trait:" + id)}</div>
    ${section("Enemies", grid(who.map((e) => `<button class="mini" data-open="enemy:${e.id}">${img(e.icon, e.name)}<span>${esc(e.name)}<small>${esc(enemyWhen(e))}</small></span></button>`)))}`;
}

const VIEWS = { enemy: enemyView, trait: traitView, dude: dudeView, relic: relicView, trinket: trinketView, stash: stashView, food: foodView, meals: mealsView,
  foodstat: () => mealsView(), family: familyView, ch: chView };

/* ---------- routing: #tab or #kind:id (overlay) ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^(dude|relic|trinket|stash|food|meals|foodstat|family|ch|enemy|trait):(.+)$/);
  if (m) {
    const html = VIEWS[m[1]](m[2]);
    if (html) {
      $("#detail").innerHTML = html;
      $("#headact").innerHTML = ["dude", "relic", "trinket", "food"].includes(m[1]) ? offerBtn(m[1] + ":" + m[2]) : "";
      $("#overlay").classList.remove("hidden");
      $("#overlay").setAttribute("aria-hidden", "false");
      // a page reached by Back returns to where it was left (open() stores it on its history entry); a new one starts at the top
      $(".sheet").scrollTop = history.state?.sheetY || 0;
      document.body.style.overflow = "hidden";
      return;
    }
  }
  closeOverlay();
  const tab = TABS.find((t) => t.id === h);
  if (tab && tab.id !== state.tab) switchTab(tab.id);
}

function closeOverlay() {
  $("#overlay").classList.add("hidden");
  $("#overlay").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

let depth = 0;
function open(key) {
  depth++;
  if (!$("#overlay").classList.contains("hidden")) history.replaceState({ sheetY: $(".sheet").scrollTop }, "");
  location.hash = encodeURIComponent(key).replace(/%3A/i, ":");
}

function switchTab(id) {
  scrollMemo[state.tab] = window.scrollY;
  state.tab = id;
  state.q = "";
  state.kind = state.fam = state.role = state.pool = null;
  renderTabs();
  renderControls();
  renderList();
  window.scrollTo(0, scrollMemo[id] || 0);
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const gl = e.target.closest("[data-gl]");
  if (gl) {
    if (!gl.closest("#gloss")) glStack.length = 0;
    glStack.push({ gk: gl.dataset.gl, kw: gl.dataset.kw });
    renderGloss();
    return;
  }
  if (e.target.closest("[data-glback]")) {
    glStack.pop();
    renderGloss();
    return;
  }
  if (glStack.length) {
    // outside the box or ×: close; a link inside (a Dude) closes it and opens the page
    const inside = e.target.closest(".gbox");
    if (!inside || e.target.closest("[data-glclose]")) return closeGloss();
    if (!e.target.closest("[data-open]")) return;
    closeGloss();
  }
  const tab = e.target.closest("[data-tab]");
  if (tab) {
    history.replaceState(null, "", "#" + tab.dataset.tab);
    switchTab(tab.dataset.tab);
    return;
  }
  const f = e.target.closest("[data-filter]");
  if (f) {
    const k = f.dataset.filter;
    state[k] = state[k] === f.dataset.val ? null : f.dataset.val;
    const y = window.scrollY;
    renderControls();
    renderList();
    window.scrollTo(0, y);
    return;
  }
  const dr = e.target.closest("[data-pick],[data-take],[data-unslot],[data-unbuild],[data-clearbuild],[data-offer],[data-toggle],[data-dview],[data-hbind],[data-fsec],[data-give],[data-dice],[data-reroll]");
  if (dr) {
    const ds = dr.dataset;
    if (ds.pick) offer(ds.pick);
    else if (ds.take || ds.give) {
      // Take: the offer joins the build; Give: a trinket / meal offer goes to the chosen Dude, who then drops out as
      // a candidate for the next ones (one of each per Dude)
      const [i, t] = (ds.give || ds.take).split("|");
      const key = draft.slots[+i];
      const [kind, id] = key.split(":");
      if (HELD[kind]) {
        if (t && !HELD[kind].get(t) && !(HELD[kind].unique && boundTo(kind, id))) bind(kind, t, id, draft.slotSec[+i]);
      } else draft.build.push(key);
      draft.slots.fill(null);
      draft.slotSec.fill(null);
    } else if (ds.unslot) {
      draft.slots[+ds.unslot] = null;
      draft.slotSec[+ds.unslot] = null;
    }
    else if (ds.unbuild) {
      draft.build.splice(draft.build.indexOf(ds.unbuild), 1);
      if (!draft.build.includes(ds.unbuild)) for (const kind in HELD) unbind(kind, ds.unbuild.slice(5));
    } else if (ds.clearbuild) {
      draft.build.length = 0;
      draft.wield = {};
      draft.food = {};
    }
    else if (ds.hbind) {
      const [kind, t, id] = ds.hbind.split("|");
      if (HELD[kind].get(t) === id) unbind(kind, t);
    } else if (ds.fsec) {
      const [i, st] = ds.fsec.split("|");
      draft.slotSec[+i] = draft.slotSec[+i] === st ? null : st;
    }
    else if (ds.dview) draft.view = ds.dview;
    else if (ds.dice) draft.dice = Math.max(0, draft.dice + +ds.dice);
    else if (ds.reroll) {
      // a die spent: the three offers leave, the rerolled ones are entered next
      draft.dice = Math.max(0, draft.dice - 1);
      draft.slots.fill(null);
      draft.slotSec.fill(null);
    }
    else if (ds.toggle) {
      // a picked relic leaves the build entirely (every copy), an unpicked one joins it
      if (draft.build.includes(ds.toggle)) draft.build = draft.build.filter((k) => k !== ds.toggle);
      else draft.build.push(ds.toggle);
    }
    else if (ds.offer) {
      offer(ds.offer);
      dr.textContent = "In draft";
      dr.disabled = true;
    }
    saveDraft();
    if (state.tab === "draft") {
      const y = window.scrollY;
      const typing = !!ds.pick;
      renderList();
      window.scrollTo(0, y);
      // keep typing: the keyboard stays up for the next offer while a slot is free
      if (typing) $("#adder")?.focus({ preventScroll: true });
    }
    return;
  }
  const o = e.target.closest("[data-open]");
  if (o) {
    open(decodeURIComponent(o.dataset.open));
    return;
  }
  if (e.target.id === "back" || e.target.id === "overlay") {
    if (depth > 0) {
      depth--;
      history.back();
    } else {
      history.replaceState(null, "", "#" + state.tab);
      closeOverlay();
    }
  }
});

document.addEventListener("toggle", (e) => {
  const id = e.target.dataset?.fxlist;
  if (id) e.target.open ? fxOpen.add(id) : fxOpen.delete(id);
}, true);

// Draft offer box: a tapped hit must not take focus from the box (the keyboard would drop); Enter takes the first hit;
// while it has focus on a short screen (a phone keyboard up) it fills the visible area above the keyboard (.kb)
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".adder [data-pick]")) e.preventDefault();
});
document.addEventListener("keydown", (e) => {
  if (e.target.id !== "adder") return;
  if (e.key === "Enter") {
    e.preventDefault();
    $("#picks [data-pick]")?.click();
  } else if (e.key === "Escape") e.target.blur();
});
function fitKeyboard() {
  const vv = window.visualViewport;
  const h = vv ? vv.height : innerHeight;
  const root = document.documentElement;
  root.style.setProperty("--vvh", h + "px");
  root.style.setProperty("--vvt", (vv ? vv.offsetTop : 0) + "px");
  root.classList.toggle("kb", document.activeElement?.id === "adder" && h < 520);
}
// the page header's height, for what sticks under it (the Draft's Offers / Team bar)
if (typeof ResizeObserver !== "undefined") new ResizeObserver(([e]) => document.documentElement.style.setProperty("--toph", e.target.offsetHeight + "px")).observe($(".top"));
window.visualViewport?.addEventListener("resize", fitKeyboard);
window.visualViewport?.addEventListener("scroll", fitKeyboard);
document.addEventListener("focusin", fitKeyboard);
document.addEventListener("focusout", () => setTimeout(fitKeyboard));

document.addEventListener("input", (e) => {
  if (e.target.id === "adder") {
    $("#picks").innerHTML = pickResults(e.target.value);
    return;
  }
  if (e.target.id !== "q") return;
  state.q = e.target.value;
  renderList();
});

addEventListener("hashchange", () => { closeGloss(); route(); });
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && glStack.length) closeGloss();
  else if (e.key === "Escape" && !$("#overlay").classList.contains("hidden")) $("#back").click();
});

renderTabs();
renderControls();
renderList();
route();
