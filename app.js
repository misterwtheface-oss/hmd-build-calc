"use strict";
/* How Many Dudes? Codex — data: window.HMD (tools/build_data.py). Mobile first. */

const FEATURES = { roles: true, synergy: true, draft: true };

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
const chWeight = (c) => CH[c]?.r || 0;
const SYN = {};
for (const [a, b, score, chs] of H.syn) {
  (SYN[a] = SYN[a] || []).push({ u: b, score, chs });
  (SYN[b] = SYN[b] || []).push({ u: a, score, chs });
}
const unitItem = (u) => itemOf(u);
const FACET = { gives: "Gives", scales: "Scales", emits: "Triggers", reacts: "On", boosts: "Boosts" };
// channels an effect touches that link to another unit (shown as chips; the facet verb says how)
const fxShown = (x) => x.fx.filter(([, c]) => CH[c]);
// effect-level pairs (build_data.py): effect key -> [{o: other effect, ch, label: this side's facet, olabel: the other's,
// give: this side provides the channel, so the other side (its consumer) receives it; wield: a trinket link that
// holds only when the trinket is bound to that Dude}]
const PAIR = {};
{
  const { keys, names, fac, p } = H.pairs;
  for (const [a, b, c, v, pf, cf, w] of p) {
    const give = `${FACET[fac[pf]]} ${names[v]}`, use = `${FACET[fac[cf]]} ${names[c]}`, wield = !!w;
    (PAIR[keys[a]] = PAIR[keys[a]] || []).push({ o: keys[b], ch: names[c], label: give, olabel: use, give: true, wield });
    (PAIR[keys[b]] = PAIR[keys[b]] || []).push({ o: keys[a], ch: names[c], label: use, olabel: give, give: false, wield });
  }
}
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
  return Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
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
// a Dude's effect edges: each facet (Gives / Scales / Triggers / On / Boosts + channel) of his ability + relics,
// n = how many of those effects carry it
function dudeEdges(t) {
  const count = new Map();
  for (const x of [DUDE[t], ...relicsOfDude(t)])
    for (const f of new Map(fxShown(x).map((f) => [fxLabel(f), f])).values()) {
      const e = count.get(fxLabel(f)) || [fxLabel(f), 0, f[1]];
      e[1]++;
      count.set(e[0], e);
    }
  return [...count.values()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// partner units of a unit (Dudes or standalone relics), strongest first, each with the channels that join them
const partners = (u, kind, limit) =>
  (SYN[u] || []).filter((p) => p.u.startsWith(kind + ":")).slice(0, limit);
const partnerMini = (p) => mini(unitItem(p.u), p.chs.slice(0, 3).map(esc).join(" · "), true);

/* ---------- art + chips (all game art goes through these) ---------- */
const img = (src, alt, cls = "") => (src ? `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" width="96" height="96">` : "");
const famIcon = (f) => img(FAM[f]?.icon, FAM[f]?.name);
const poolLabel = (r) =>
  r.pool === "dude" ? DUDE[r.dude]?.name : r.pool === "family" ? FAM[r.fam]?.full : H.pools[r.pool]?.name;
const poolIcon = (r) =>
  r.pool === "dude" ? img(DUDE[r.dude]?.icon, DUDE[r.dude]?.name) : r.pool === "family" ? famIcon(r.fam) : img(H.pools[r.pool]?.icon, r.pool);

const dudeChip = (t) => (DUDE[t] ? `<button class="chiplink" data-open="dude:${t}">${img(DUDE[t].icon, DUDE[t].name)}${esc(DUDE[t].name)}</button>` : "");
const famChip = (f) => (FAM[f] ? `<button class="chiplink" data-open="family:${f}">${famIcon(f)}${esc(FAM[f].name)}</button>` : "");
const fxChip = (f) => `<button class="chiplink kw fx-${f[0]}" data-open="ch:${encodeURIComponent(f[1])}">${esc(fxLabel(f))}</button>`;
const fxLine = (x) => (fxShown(x).length ? `<div class="chipline">${fxShown(x).map(fxChip).join("")}</div>` : "");
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
function renderSegs(seg) {
  return seg
    .map(([kind, a, b, c]) => {
      if (kind === "t") return esc(a);
      if (kind === "k") return `<span class="k solo">${esc(b)}</span>`;
      if (kind === "d") return `<span class="d" data-open="dude:${a}">${esc(b)}</span>`;
      if (kind === "u") return `<span class="u">${esc(a)}</span>`;
      if (kind === "v")
        return c != null ? `<b class="n">${fmtVal(c, b)}</b>` : `<span class="v">${esc(a.replace(/_/g, " "))}${FMT[b] ? " " + FMT[b] : ""}</span>`;
      return "";
    })
    .join("");
}
const section = (title, body) => (body ? `<h3>${esc(title)}</h3>${body}` : "");
const grid = (items) => (items.length ? `<div class="grid">${items.join("")}</div>` : "");

/* ---------- tabs ---------- */
const TABS = [
  { id: "families", name: "Families" },
  { id: "search", name: "Search" },
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
    hpick: null,   // "kind|dude type" whose held-item picker is open
  };
})();
const saveDraft = () => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, hpick: null })); } catch (e) { /* storage off */ }
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
  const self = new Map(), dudeRows = new Map(), famRows = new Map();
  const receives = mine.startsWith("dude:");   // a Dude, or one of his relics
  const offered = x.pool in HELD;              // a held-item offer: each free Dude's row = giving it to him (one each)
  const taken = (t) => offered && HELD[x.pool].get(t);
  for (const s of newFx)
    for (const l of PAIR[s] || []) {
      const h = owner.get(l.o);
      if (!h || (!offered && !pairOk(l, s, l.o)) || (h.t && taken(h.t))) continue;
      if (receives && !l.give) putPair(self, x, l.ch, s, l.label, l.o, l.olabel);
      // a trinket offer only meets drafted Dudes: a Family / Global relic counts in the row of each Dude it applies to
      else if (offered && !h.t) for (const d of team.filter((d) => !taken(d.t) && appliesTo(itemOf(l.o), d))) putPair(dudeRows, d, l.ch, l.o, l.olabel, s, l.label);
      else putPair(h.t ? dudeRows : famRows, h, l.ch, l.o, l.olabel, s, l.label);
    }
  out.secs.push({ rows: scoreRows(self) }, { rows: scoreRows(dudeRows) });
  for (const f of x.t ? x.fam.filter((f) => f !== "global" && !fams.includes(f)) : []) {
    const rows = new Map();
    for (const r of relicsOfFamilyPool(f))
      for (const l of PAIR["relic:" + r.id] || []) {
        const h = owner.get(l.o);
        if (h && h !== FAM[f] && pairOk(l, "relic:" + r.id, l.o)) putPair(rows, h, l.ch, l.o, l.olabel, "relic:" + r.id, l.label);
      }
    out.secs.push({ head: FAM[f], rows: scoreRows(rows) });
  }
  out.secs.push({ rows: scoreRows(famRows) });
  for (const sec of out.secs) sec.score = sec.rows.reduce((a, r) => a + r.score, 0);
  // a held item goes to one Dude: it scores its best Dude, not all of them
  if (offered) out.secs[1].score = out.secs[1].rows.length ? out.secs[1].rows[0].score : 0;
  // rounded to the shown precision, so offers showing the same score tie (float sums differ by order)
  const total = out.secs.reduce((a, sec) => a + sec.score, 0) + 3 * out.fam.reduce((s, f) => s + f[1], 0) + 3 * out.links.length;
  out.score = Math.round(total * 10) / 10;
  return out;
}

// pair rows: row key -> {x: its Dude / Family / offer, ch: channel -> {theirs: the row's effects, mine: the other
// side's}, effect key -> facet labels}; a row scores the weight of each distinct channel it holds
const addTo = (m, k, v) => (m.get(k) || m.set(k, new Set()).get(k)).add(v);
const headKey = (h) => (h.t ? "dude:" + h.t : FAM[h.id] === h || h.src ? "family:" + h.id : keyOf(h));
function putPair(rows, h, ch, own, ownLabel, other, otherLabel) {
  const hk = headKey(h);
  const row = rows.get(hk) || rows.set(hk, { x: h, ch: new Map() }).get(hk);
  const c = row.ch.get(ch) || row.ch.set(ch, { theirs: new Map(), mine: new Map() }).get(ch);
  addTo(c.theirs, own, ownLabel);
  addTo(c.mine, other, otherLabel);
}
const scoreRows = (rows) => [...rows.values()]
  .map((r) => ({ ...r, score: [...r.ch.keys()].reduce((a, c) => a + chWeight(c), 0) }))
  .sort((a, b) => b.score - a.score || byName(a.x, b.x));
// Team view: pairs between the source effects and the target effects (ok(key)), grouped by Dude. A Dude counts
// all his relics; a Family / universal / Promoter relic counts for every Dude of the team it applies to
const appliesTo = (r, d) => r.fam === "global" || d.fam.includes(r.fam);
function holders(src, ok, team) {
  const rows = new Map();
  for (const s of src)
    for (const l of PAIR[s] || []) {
      if (!ok(l.o) || !pairOk(l, s, l.o)) continue;
      const t = itemOf(l.o);
      const tu = unitOf(t);
      const owners = tu.startsWith("dude:") ? [DUDE[tu.slice(5)]] : team.filter((d) => appliesTo(t, d));
      for (const h of owners.length ? owners : [t]) putPair(rows, h, l.ch, l.o, l.olabel, s, l.label);
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
    ${[...r.ch].sort((a, b) => chWeight(b[0]) - chWeight(a[0])).map(([, c]) => `<div class="pair">${pairSide(c.theirs)}<i>↔</i>${pairSide(c.mine)}</div>`).join("")}</div>`).join("");
// an offer's sections in order; a Family the offer brings in heads its own rows
const secHtml = (sec) => (!sec.head ? holderRows(sec.rows) : !sec.rows.length ? "" : `<div class="hold"><button class="hhead" data-open="family:${sec.head.id}">${img(sec.head.icon, sec.head.name)}<span>${esc(sec.head.name)}</span><b>${num1(sec.score)}</b></button>
    ${holderRows(sec.rows)}</div>`);

// a meal's extra stat: one chip per stat (its value as the extra stat), the chosen one pressed
const statChips = (attr, who, cur) => `<div class="chips wsec">${H.foodstats.map((st) => `<button class="fchip" data-${attr}="${who}|${st.id}"
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

function slotHtml(i, best, max) {
  const key = draft.slots[i];
  if (!key)
    return `<div class="slot empty"><input class="search" type="search" data-slot="${i}" placeholder="Offer ${i + 1}: Dude, relic, trinket or food" autocomplete="off">
      <div class="picks" id="picks-${i}"></div></div>`;
  const x = itemOf(key);
  const o = overlap(x, draft.build, draft.slotSec[i]);
  const label = x.t ? x.fam.map(famIcon).join("") : poolIcon(x);
  const text = (x.ab ? `<div class="ab">${esc(x.ab)}${fnTag(x)}</div>` : "") + renderSegs(x.seg);
  const ov = [
    ...o.fam.map(([f, n]) => `<button class="chiplink" data-open="family:${f}">${famIcon(f)}${esc(FAM[f].name)} ×${n}</button>`),
    ...o.links.map((b) => `<button class="chiplink" data-open="${keyOf(b)}">${img(b.icon, b.name)}${esc(b.name)}</button>`),
  ];
  return `<div class="slot${o.score === best ? " best" : ""}">
    <div class="shead"><button class="rhead" data-open="${key}">${img(x.icon, x.name)}<span>${esc(x.name)}</span>${x.t ? "" : fnTag(x)}</button>
      <span class="slabel">${label}</span><button class="x" data-unslot="${i}" aria-label="Clear">×</button></div>
    <div class="rdesc">${text}</div>${x.pool === "food" ? statChips("fsec", i, draft.slotSec[i]) : ""}
    ${draft.build.length ? `<div class="ovl"><span>Overlap</span>${bar(o.score, max)}<b>${num1(o.score)}</b></div>${ov.length ? `<div class="chipline">${ov.join("")}</div>` : ""}${o.secs.map(secHtml).join("")}` : ""}
    ${giveOrTake(i, x, o)}</div>`;
}

// a Dude's active effects in the build: his ability, his bound trinket, his picked relics, and every picked Family /
// universal / Promoter relic that applies to him
function activeOf(d, counts) {
  return ["dude:" + d.t, ...heldKeys(d), ...Object.keys(counts).filter((k) => {
    const r = k.startsWith("relic:") && itemOf(k);
    return r && (r.pool === "dude" ? r.dude === d.t : appliesTo(r, d));
  })];
}
// Team view, under a Dude: what each active effect does, then his edges to the rest of the team (their active effects)
function teamHtml(d, team, counts) {
  const mine = activeOf(d, counts);
  const others = team.filter((o) => o !== d);
  const theirs = new Set(others.flatMap((o) => activeOf(o, counts)).filter((k) => !mine.includes(k)));
  const fx = mine.filter((k) => fxShown(itemOf(k)).length)
    .map((k) => `<div class="fxrow">${iconBtn(k)}<span class="chipline">${fxShown(itemOf(k)).map(fxChip).join("")}</span></div>`).join("");
  return `<div class="tview">${fx}${holderRows(holders(mine, (k) => theirs.has(k), others))}</div>`;
}

function renderDraft() {
  const view = `<div class="chips dview">${[["offers", "Offers"], ["team", "Team"]]
    .map(([v, n]) => `<button class="fchip" data-dview="${v}" aria-pressed="${draft.view === v}">${n}</button>`).join("")}</div>`;
  const team = draft.view === "team";
  const ovs = team ? [] : draft.slots.map((k, i) => (k ? overlap(itemOf(k), draft.build, draft.slotSec[i]) : null));
  const scores = ovs.map((o) => (o ? o.score : -1));
  const max = Math.max(0, ...scores);

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
  const relicPicks = (rs) => `<div class="rpicks">${rs.map((r) => `<button class="rpick${counts["relic:" + r.id] ? " on" : ""}" data-toggle="relic:${r.id}" title="${esc(r.name)}"
    aria-pressed="${!!counts["relic:" + r.id]}">${img(r.icon, r.name)}</button>`).join("")}</div>`;
  // each Dude's held items (trinket, meal): the held one (or the kind's icon, faded); tap to open the picker, tap an
  // item to give it to him, tap it again to take it back. A meal also shows its extra stat
  const heldSlot = (t, kind) => {
    const cur = HELD[kind].get(t), b = cur && itemOf(kind + ":" + cur), on = draft.hpick === kind + "|" + t;
    const opts = HELD[kind].items().filter((x) => !HELD[kind].unique || !boundTo(kind, x.id) || cur === x.id);   // no duplicates
    const pick = on ? `<div class="rpicks">${opts.map((x) => `<button class="rpick${cur === x.id ? " on" : ""}" data-hbind="${kind}|${t}|${x.id}"
      title="${esc(x.name)}" aria-pressed="${cur === x.id}">${img(x.icon, x.name)}</button>`).join("")}</div>` : "";
    return `<div class="wield"><button class="rpick${b ? " on" : ""}" data-hpick="${kind}|${t}" title="${esc(b ? b.name : H.pools[kind].name)}"
      aria-expanded="${on}">${b ? img(b.icon, b.name) : img(H.pools[kind].icon, H.pools[kind].name)}</button>${b
      ? `<button class="wname" data-open="${kind}:${b.id}">${esc(b.name)}</button>` : ""}</div>${pick}${kind === "food" && b ? statChips("hsec", t, draft.food[t].sec) : ""}`;
  };
  const wslot = (t) => Object.keys(HELD).map((kind) => heldSlot(t, kind)).join("");
  const groups = [
    ...dudeKeys.map((dk) => `<div class="bgroup">${tile(dk)}${wslot(dk.slice(5))}${relicPicks(relicsOfDude(dk.slice(5)))}${team
      ? teamHtml(itemOf(dk), dudeKeys.map(itemOf), counts) : ""}</div>`),
    ...fams.map((f) => `<div class="bgroup"><div class="fhead">${famIcon(f)}<span>${esc(FAM[f].name)}</span></div>${relicPicks(relicsOfFamilyPool(f))}</div>`),
    // last: Global, its Universal then Promoter relics, picked as they're collected
    ...(keys.length ? [`<div class="bgroup"><div class="fhead">${famIcon("global")}<span>${esc(FAM.global.name)}</span></div>${SOURCES.map((p) => relicPicks(relicsOfSource(p))).join("")}</div>`] : []),
  ];
  const picked = (k) => { const x = itemOf(k); return x.pool === "dude" ? counts["dude:" + x.dude] : SOURCE[x.pool] || fams.includes(x.fam); };
  const loose = keys.filter((k) => k.startsWith("relic:") && !picked(k));
  const tiles = [...groups, ...(loose.length ? [`<div class="grid">${loose.map(tile).join("")}</div>`] : [])];
  const items = [...draft.build.map(itemOf), ...dudeKeys.flatMap((dk) => heldKeys(itemOf(dk))).map(itemOf)];
  // two panes (side by side on a wide or sideways screen, each scrolling on its own): offers, then the build
  return `<div class="draft${team ? " team" : ""}"><div class="dpane">${view}${team ? "" : `<h3>Offers</h3><div class="slots">${draft.slots.map((_, i) => slotHtml(i, best, max)).join("")}</div>`}</div>
    <div class="dpane"><h3>Build</h3>${tiles.length
      ? `<div class="bgroups">${tiles.join("")}</div>${section("Build effects", effectBars(itemEffects(items, 8), true))}
        <button class="clear" data-clearbuild="1">Clear build</button>`
      : `<div class="empty">Take an offer to start a build</div>`}</div></div>`;
}

function pickResults(i, q) {
  q = q.trim().toLowerCase();
  if (!q) return "";
  const free = trinketsSorted.filter((x) => !boundTo("trinket", x.id));   // a bound trinket can't be drafted again
  const hits = [...dudesSorted, ...relicsSorted, ...free, ...foodSorted].filter((x) => match(q, x.name)).slice(0, 8);
  return hits.map((x) => itemRow(x, `data-pick="${i}|${keyOf(x)}"`)).join("") || `<div class="empty">No matches</div>`;
}

function offer(key) {
  const i = draft.slots.indexOf(null);
  draft.slots[i < 0 ? SLOTS - 1 : i] = key;
}

/* ---------- detail views ---------- */
// full relic container: header (opens the relic), its effect text and its synergy tags
function relicCard(r) {
  return `<div class="rcard"><button class="rhead" data-open="${keyOf(r)}">${img(r.icon, r.name)}<span>${esc(r.name)}</span>${fnTag(r)}</button>
    <div class="rdesc">${renderSegs(r.seg)}</div>${FEATURES.synergy ? fxLine(r) : ""}</div>`;
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
  // Role (game) badges alone; below, every Function / Focus of his ability + relics together, one row per Function
  // ×n = how many of his effects (ability + relics) carry that Function / Focus
  const kit = [d, ...relicsOfDude(t)].filter((x) => x.fn);
  const fnN = (x) => kit.filter((y) => fnText(y) === fnText(x)).length;
  const fns = [...new Map(kit.map((x) => [fnText(x), x])).values()].sort((a, b) => fnRank(a) - fnRank(b));
  const fnRows = [...new Set(fns.map((x) => x.fn[0]))]
    .map((f) => `<div class="tags">${fns.filter((x) => x.fn[0] === f).map((x) => fnTag(x, fnN(x))).join("")}</div>`)
    .join("");
  const role = FEATURES.roles && (d.roles.length || fns.length)
    ? `<div class="role">${d.roles.length ? `<div class="meta">${roleBadge(d)}</div>` : ""}${fnRows}</div>`
    : "";
  const famRelics = d.fam.map((f) => famChip(f)).join("");
  const mates = d.fam.flatMap((f) => membersOf(f).filter((x) => x.t !== t).map((x) => mini(x)));
  const out = refsFrom(key).map((e) => e.b.split(":")[1]).filter((x) => DUDE[x]).map((x) => mini(DUDE[x]));
  const inbound = refsTo(key)
    .map((e) => e.a.split(":"))
    .map(([k, id]) => (k === "dude" ? DUDE[id] : RELIC[id]))
    .filter((x) => x && !(x.id && x.dude === t))
    .map((x) => mini(x, x.id ? esc(poolLabel(x)) : ""));
  const syn = FEATURES.synergy;
  return `<div class="hero">${img(d.icon, d.name)}<div><h2>${esc(d.name)}</h2><div class="meta">${d.fam.map(famChip).join("")}</div></div></div>
    ${role}
    ${d.ab || d.seg.length ? `<div class="desc">${d.ab ? `<div class="ab">${esc(d.ab)}${fnTag(d)}</div>` : ""}${renderSegs(d.seg)}${syn ? fxLine(d) : ""}</div>` : ""}
    ${syn ? section("Effect edges", dudeEdges(t).length ? effectBars(dudeEdges(t), true) : "") : ""}
    ${syn ? section("Synergy Dudes", grid(partners(key, "dude", 12).map(partnerMini))) : ""}
    ${syn ? section("Synergy relics", grid(partners(key, "relic", 8).map(partnerMini))) : ""}
    ${section("Relics", relicCards(relicsOfDude(t)))}
    ${section("Family relics", famRelics ? `<div class="chipline">${famRelics}</div>` : "")}
    ${section("Family", grid(mates))}
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
    <div class="desc">${renderSegs(r.seg)}${syn ? fxLine(r) : ""}</div>
    ${syn ? section("Synergies", grid(linked)) : ""}
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

// a Trinket: its effect and the units it links to (a Wielder effect meets the Dude it is bound to)
function trinketView(id) {
  const t = TRINKET[id];
  if (!t) return null;
  const linked = (H.links["trinket:" + id] || []).filter(([u]) => unitItem(u)).map(([u, score, chs]) => partnerMini({ u, score, chs }));
  return `<div class="hero">${img(t.icon, t.name)}<div><h2>${esc(t.name)}</h2><div class="meta"><button class="chiplink" data-open="stash:all">${poolIcon(t)}Trinket Stash</button></div></div></div>
    <div class="desc">${renderSegs(t.seg)}${FEATURES.synergy ? fxLine(t) : ""}</div>
    ${FEATURES.synergy ? section("Synergies", grid(linked)) : ""}`;
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
    ${FEATURES.synergy ? section("Synergies", grid(linked)) : ""}`;
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

const VIEWS = { dude: dudeView, relic: relicView, trinket: trinketView, stash: stashView, food: foodView, meals: mealsView,
  foodstat: () => mealsView(), family: familyView, ch: chView };

/* ---------- routing: #tab or #kind:id (overlay) ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^(dude|relic|trinket|stash|food|meals|foodstat|family|ch):(.+)$/);
  if (m) {
    const html = VIEWS[m[1]](m[2]);
    if (html) {
      $("#detail").innerHTML = html;
      $("#headact").innerHTML = ["dude", "relic", "trinket", "food"].includes(m[1]) ? offerBtn(m[1] + ":" + m[2]) : "";
      $("#overlay").classList.remove("hidden");
      $("#overlay").setAttribute("aria-hidden", "false");
      $(".sheet").scrollTop = 0;
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
  const dr = e.target.closest("[data-pick],[data-take],[data-unslot],[data-unbuild],[data-clearbuild],[data-offer],[data-toggle],[data-dview],[data-hpick],[data-hbind],[data-hsec],[data-fsec],[data-give]");
  if (dr) {
    const ds = dr.dataset;
    if (ds.pick) {
      const [i, key] = ds.pick.split("|");
      draft.slots[+i] = key;
    } else if (ds.take || ds.give) {
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
    else if (ds.hpick) draft.hpick = draft.hpick === ds.hpick ? null : ds.hpick;
    else if (ds.hbind) {
      const [kind, t, id] = ds.hbind.split("|");
      if (HELD[kind].get(t) === id) unbind(kind, t);
      else bind(kind, t, id);
      draft.hpick = null;
    } else if (ds.hsec) {
      const [t, st] = ds.hsec.split("|");
      if (draft.food[t]) draft.food[t].sec = draft.food[t].sec === st ? null : st;
    } else if (ds.fsec) {
      const [i, st] = ds.fsec.split("|");
      draft.slotSec[+i] = draft.slotSec[+i] === st ? null : st;
    }
    else if (ds.dview) draft.view = ds.dview;
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
      renderList();
      window.scrollTo(0, y);
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

document.addEventListener("input", (e) => {
  if (e.target.dataset.slot != null) {
    $("#picks-" + e.target.dataset.slot).innerHTML = pickResults(+e.target.dataset.slot, e.target.value);
    return;
  }
  if (e.target.id !== "q") return;
  state.q = e.target.value;
  renderList();
});

addEventListener("hashchange", route);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#overlay").classList.contains("hidden")) $("#back").click();
});

renderTabs();
renderControls();
renderList();
route();
