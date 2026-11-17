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
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
const dudesSorted = H.dudes.filter((d) => d.name).sort(byName);
const relicsSorted = H.relics.slice().sort(byName);
const relicsOfDude = (t) => relicsSorted.filter((r) => r.dude === t);
const relicsOfFamilyPool = (f) => relicsSorted.filter((r) => r.pool !== "dude" && r.fam === f);
const membersOf = (f) => dudesSorted.filter((d) => d.fam.includes(f));
const refsFrom = (key) => H.refs.filter((e) => e.a === key);
const refsTo = (key) => H.refs.filter((e) => e.b === key);

// Synergy (extract tools/effect_tags.py): every effect carries facets [facet, channel, scope]; an edge joins a unit
// that gives / triggers a channel with a unit that scales with / reacts to it. A unit is a Dude together with his own
// relics, or one Family / universal / Promoter relic. Rare channels (Taunt, Block) weigh more than common ones.
const unitOf = (x) => (x.t ? "dude:" + x.t : x.pool === "dude" ? "dude:" + x.dude : "relic:" + x.id);
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
// effect-level pairs (build_data.py): effect key -> [{o: other effect, ch, label: this side's facet, olabel: the other's}]
const PAIR = {};
{
  const { keys, names, fac, p } = H.pairs;
  for (const [a, b, c, v, pf, cf] of p) {
    const give = `${FACET[fac[pf]]} ${names[v]}`, use = `${FACET[fac[cf]]} ${names[c]}`;
    (PAIR[keys[a]] = PAIR[keys[a]] || []).push({ o: keys[b], ch: names[c], label: give, olabel: use });
    (PAIR[keys[b]] = PAIR[keys[b]] || []).push({ o: keys[a], ch: names[c], label: use, olabel: give });
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
function effectBars(eff, big) {
  const max = eff.length ? eff[0][1] : 0;
  return `<div class="effects${big ? " big" : ""}">${eff
    .map(([k, v]) => `<span class="eff"${big ? ` data-open="ch:${encodeURIComponent(k)}"` : ""}>${esc(k)}${bar(v, max)}</span>`)
    .join("")}</div>`;
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
const fnTag = (x, plus) =>
  FEATURES.roles && x.fn ? `<span class="tag fn-${x.fn[0]}${plus ? " plus" : ""}">${plus ? "+ " : ""}${esc(fnText(x))}</span>` : "";

// fams: show the Families the Dude / relic belongs to (synergy lists)
const famsOf = (x) => (x.t ? x.fam : x.fam ? [x.fam] : []);
function mini(x, sub, fams) {
  const key = x.t ? "dude:" + x.t : "relic:" + x.id;
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
    html += filterChips("kind", [["dude", "Dudes"], ["relic", "Relics"]], state.kind);
    html += filterChips("fam", famOpts, state.fam);
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
  if (state.tab === "draft") return void ($("#list").innerHTML = renderDraft());
  if (state.tab === "search") {
    const ds = state.kind === "relic" ? [] : dudesSorted
      .filter((d) => (!state.fam || d.fam.includes(state.fam)) && (!state.role || hasRole(d, state.role)))
      .filter((d) => match(q, d.name, d.ab, segText(d.seg)));
    const rs = state.kind === "dude" ? [] : relicsSorted
      .filter((r) => (!state.fam || r.fam === state.fam) && (!state.pool || r.pool === state.pool))
      .filter((r) => match(q, r.name, segText(r.seg), poolLabel(r)));
    rows = [...ds, ...rs].map((x) => itemRow(x));
  } else if (state.tab === "families") {
    const cards = H.families
      .filter((f) => match(q, f.name, f.desc, ...membersOf(f.id).map((d) => d.name)))
      .map(
        (f) => `<button class="famcard" data-open="family:${f.id}"><span class="head">${img(f.icon, f.name)}<span>${esc(f.name)}</span></span>
        ${effectList(f.id, 3, false)}</button>`
      );
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
const keyOf = (x) => (x.t ? "dude:" + x.t : "relic:" + x.id);
const itemOf = (key) => {
  const [k, id] = key.split(":");
  return k === "dude" ? DUDE[id] : RELIC[id];
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
  };
})();
const saveDraft = () => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* storage off */ }
};

const buildFams = (team) => [...new Set(team.flatMap((d) => d.fam))].filter((f) => f !== "global" && FAM[f]);
// what an offer shares with the build:game Family, its relic pool, names / owned relics, synergy edges
function overlap(x, build) {
  const items = build.map(itemOf);
  const dudes = items.filter((b) => b.t);
  const out = { fam: [], links: [], ch: [], rows: [], score: 0, poolFams: [], poolRows: [], poolScore: 0 };
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
  // synergy: the offer's effects (a Dude: his ability and all his relics) paired with the build's, per Dude
  const mine = unitOf(x);
  const team = [...new Set(dudes)];
  // the build reaches its Dudes' relics (their units) and the relics of every Family it has a member of
  const inBuild = new Set([...items.map(unitOf), ...buildFams(team).flatMap((f) => relicsOfFamilyPool(f).map(unitOf))]);
  inBuild.delete(mine);
  out.rows = holders(x.t ? effectsOfUnit(mine) : [k], inUnits(inBuild), team);
  out.ch = [...new Set(out.rows.flatMap((r) => [...r.ch.keys()]))];
  out.score = out.ch.reduce((s, c) => s + chWeight(c), 0) + 3 * out.fam.reduce((s, f) => s + f[1], 0) + 3 * out.links.length;
  // first Dude of a Family: the Family relics he unlocks, each scored against the build plus himself
  if (x.t) {
    const reach = new Set([...inBuild, mine]);
    out.poolFams = x.fam.filter((f) => f !== "global" && !famCount(f));
    const pool = out.poolFams.flatMap((f) => relicsOfFamilyPool(f).map((r) => "relic:" + r.id));
    out.poolRows = holders(pool, inUnits(reach), [...team, x]);
    out.poolScore = pool.reduce((s, r) =>
      s + [...new Set((PAIR[r] || []).filter((l) => reach.has(unitOf(itemOf(l.o)))).map((l) => l.ch))].reduce((a, c) => a + chWeight(c), 0), 0);
  }
  return out;
}

// who holds what: pairs between the source effects and the target effects (ok(key)), grouped by Dude. A Dude counts
// all his relics; a Family / universal / Promoter relic counts for every Dude of the team it applies to
const addTo = (m, k, v) => (m.get(k) || m.set(k, new Set()).get(k)).add(v);
const inUnits = (units) => (k) => units.has(unitOf(itemOf(k)));
const appliesTo = (r, d) => r.fam === "global" || d.fam.includes(r.fam);
function holders(src, ok, team) {
  const rows = new Map();   // holder key -> {x, ch: channel -> {theirs, mine: effect key -> facet labels}}
  for (const s of src)
    for (const l of PAIR[s] || []) {
      if (!ok(l.o)) continue;
      const t = itemOf(l.o);
      const tu = unitOf(t);
      const owners = tu.startsWith("dude:") ? [DUDE[tu.slice(5)]] : team.filter((d) => appliesTo(t, d));
      for (const h of owners.length ? owners : [t]) {
        const hk = keyOf(h);
        const row = rows.get(hk) || rows.set(hk, { x: h, ch: new Map() }).get(hk);
        const c = row.ch.get(l.ch) || row.ch.set(l.ch, { theirs: new Map(), mine: new Map() }).get(l.ch);
        addTo(c.theirs, l.o, l.olabel);
        addTo(c.mine, s, l.label);
      }
    }
  return [...rows.values()]
    .map((r) => ({ ...r, score: [...r.ch.keys()].reduce((a, c) => a + chWeight(c), 0) }))
    .sort((a, b) => b.score - a.score || byName(a.x, b.x));
}
const num1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
const iconBtn = (k) => { const b = itemOf(k); return `<button class="vi" data-open="${k}" title="${esc(b.name)}">${img(b.icon, b.name)}</button>`; };
// one side of a pair: each ability / relic (icon, tap to open) beside what it does, items doing the same grouped
function pairSide(m) {
  const by = new Map();   // facet labels -> effect keys
  for (const [k, v] of m) addTo(by, [...v].join(" / "), k);
  return `<span class="side">${[...by].map(([lab, ks]) => `<span class="fx">${[...ks].map(iconBtn).join("")}<small>${esc(lab)}</small></span>`).join("")}</span>`;
}
// per Dude: his name and score, then one line per channel: his effects ↔ the offer's
const holderRows = (rows) => rows.map((r) => `<div class="hold"><button class="hhead" data-open="${keyOf(r.x)}">${img(r.x.icon, r.x.name)}<span>${esc(r.x.name)}</span><b>${num1(r.score)}</b></button>
    ${[...r.ch].sort((a, b) => chWeight(b[0]) - chWeight(a[0])).map(([, c]) => `<div class="pair">${pairSide(c.theirs)}<i>↔</i>${pairSide(c.mine)}</div>`).join("")}</div>`).join("");

function slotHtml(i, best, max, poolMax) {
  const key = draft.slots[i];
  if (!key)
    return `<div class="slot empty"><input class="search" type="search" data-slot="${i}" placeholder="Offer ${i + 1}: Dude or relic" autocomplete="off">
      <div class="picks" id="picks-${i}"></div></div>`;
  const x = itemOf(key);
  const o = overlap(x, draft.build);
  const label = x.t ? x.fam.map(famIcon).join("") : poolIcon(x);
  const text = (x.ab ? `<div class="ab">${esc(x.ab)}</div>` : "") + renderSegs(x.seg);
  const ov = [
    ...o.fam.map(([f, n]) => `<button class="chiplink" data-open="family:${f}">${famIcon(f)}${esc(FAM[f].name)} ×${n}</button>`),
    ...o.links.map((b) => `<button class="chiplink" data-open="${keyOf(b)}">${img(b.icon, b.name)}${esc(b.name)}</button>`),
  ];
  return `<div class="slot${o.score === best ? " best" : ""}">
    <div class="shead"><button class="rhead" data-open="${key}">${img(x.icon, x.name)}<span>${esc(x.name)}</span></button>
      <span class="slabel">${label}</span><button class="x" data-unslot="${i}" aria-label="Clear">×</button></div>
    <div class="rdesc">${text}</div>
    ${draft.build.length ? `<div class="ovl"><span>Overlap</span>${bar(o.score, max)}<b>${num1(o.score)}</b></div>${ov.length ? `<div class="chipline">${ov.join("")}</div>` : ""}${holderRows(o.rows)}` : ""}
    ${o.poolScore ? `<div class="ovl"><span>${o.poolFams.map(famIcon).join("")}</span>${bar(o.poolScore, poolMax)}<b>${num1(o.poolScore)}</b></div>${holderRows(o.poolRows)}` : ""}
    <button class="take" data-take="${i}">Take</button></div>`;
}

// a Dude's active effects in the build: his ability, his picked relics, and every picked Family / universal /
// Promoter relic that applies to him
function activeOf(d, counts) {
  return ["dude:" + d.t, ...Object.keys(counts).filter((k) => {
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
  const ovs = team ? [] : draft.slots.map((k) => (k ? overlap(itemOf(k), draft.build) : null));
  const scores = ovs.map((o) => (o ? o.score : -1));
  const max = Math.max(0, ...scores);
  const poolMax = Math.max(0, ...ovs.map((o) => (o ? o.poolScore : 0)));   // second bar: its own scale (A-magnitude-bars)
  const best = max > 0 && draft.slots.filter(Boolean).length > 1 ? max : null;   // every offer tied for the most overlap
  const counts = {};
  for (const k of draft.build) counts[k] = (counts[k] || 0) + 1;
  const tile = (k) =>
    `<div class="btile">${mini(itemOf(k), counts[k] > 1 ? "×" + counts[k] : "")}<button class="x" data-unbuild="${k}" aria-label="Remove">×</button></div>`;
  // each Dude, then each Family the build has a member of, with all their relics as icons: faded until picked,
  // a picked relic joins the build (and the Build effects); every other drafted relic after as a tile
  const keys = Object.keys(counts);
  const dudeKeys = keys.filter((k) => k.startsWith("dude:"));
  const fams = buildFams(dudeKeys.map(itemOf));
  const relicPicks = (rs) => `<div class="rpicks">${rs.map((r) => `<button class="rpick${counts["relic:" + r.id] ? " on" : ""}" data-toggle="relic:${r.id}" title="${esc(r.name)}"
    aria-pressed="${!!counts["relic:" + r.id]}">${img(r.icon, r.name)}</button>`).join("")}</div>`;
  const groups = [
    ...dudeKeys.map((dk) => `<div class="bgroup">${tile(dk)}${relicPicks(relicsOfDude(dk.slice(5)))}${team
      ? teamHtml(itemOf(dk), dudeKeys.map(itemOf), counts) : ""}</div>`),
    ...fams.map((f) => `<div class="bgroup"><div class="fhead">${famIcon(f)}<span>${esc(FAM[f].name)}</span></div>${relicPicks(relicsOfFamilyPool(f))}</div>`),
  ];
  const picked = (k) => { const x = itemOf(k); return x.pool === "dude" ? counts["dude:" + x.dude] : fams.includes(x.fam); };
  const loose = keys.filter((k) => k.startsWith("relic:") && !picked(k));
  const tiles = [...groups, ...(loose.length ? [`<div class="grid">${loose.map(tile).join("")}</div>`] : [])];
  const items = draft.build.map(itemOf);
  return `${view}${team ? "" : `<h3>Offers</h3><div class="slots">${draft.slots.map((_, i) => slotHtml(i, best, max, poolMax)).join("")}</div>`}
    <h3>Build</h3>${tiles.length
      ? `<div class="bgroups">${tiles.join("")}</div>${section("Build effects", effectBars(itemEffects(items, 8), true))}
        <button class="clear" data-clearbuild="1">Clear build</button>`
      : `<div class="empty">Take an offer to start a build</div>`}`;
}

function pickResults(i, q) {
  q = q.trim().toLowerCase();
  if (!q) return "";
  const hits = [...dudesSorted, ...relicsSorted].filter((x) => match(q, x.name)).slice(0, 8);
  return hits.map((x) => itemRow(x, `data-pick="${i}|${keyOf(x)}"`)).join("") || `<div class="empty">No matches</div>`;
}

function offer(key) {
  const i = draft.slots.indexOf(null);
  draft.slots[i < 0 ? SLOTS - 1 : i] = key;
}

/* ---------- detail views ---------- */
// full relic container: header (opens the relic), its effect text and its synergy tags
function relicCard(r) {
  return `<div class="rcard"><button class="rhead" data-open="relic:${r.id}">${img(r.icon, r.name)}<span>${esc(r.name)}</span></button>
    <div class="rdesc">${renderSegs(r.seg)}</div>${fnTag(r) ? `<div class="tags">${fnTag(r)}</div>` : ""}${FEATURES.synergy ? fxLine(r) : ""}</div>`;
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
  // Role (game) badges; then Function / Focus of his ability (solid) and the other ones his relics add (+)
  // Role badges + his ability's Function in one row; the other Functions his relics add (+) below, by category
  const extra = [...new Map(relicsOfDude(t).filter((r) => r.fn && fnText(r) !== fnText(d)).map((r) => [fnText(r), r])).values()]
    .sort((a, b) => fnRank(a) - fnRank(b));
  const role = FEATURES.roles && (d.roles.length || d.fn || extra.length)
    ? `<div class="role"><div class="meta">${roleBadge(d)}${fnTag(d)}</div>${extra.length ? `<div class="tags">${extra
      .map((r) => fnTag(r, true))
      .join("")}</div>` : ""}</div>`
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
    ${d.ab || d.seg.length ? `<div class="desc">${d.ab ? `<div class="ab">${esc(d.ab)}</div>` : ""}${renderSegs(d.seg)}${syn ? fxLine(d) : ""}</div>` : ""}
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
  return `<div class="hero">${img(r.icon, r.name)}<div><h2>${esc(r.name)}</h2><div class="meta">${pool}</div></div></div>
    ${fnTag(r) ? `<div class="role"><div class="tags">${fnTag(r)}</div></div>` : ""}
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
    ${section("Family relics", relicCards(relicsOfFamilyPool(f)))}
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

const VIEWS = { dude: dudeView, relic: relicView, family: familyView, ch: chView };

/* ---------- routing: #tab or #kind:id (overlay) ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^(dude|relic|family|ch):(.+)$/);
  if (m) {
    const html = VIEWS[m[1]](m[2]);
    if (html) {
      $("#detail").innerHTML = html;
      $("#headact").innerHTML = m[1] === "dude" || m[1] === "relic" ? offerBtn(m[1] + ":" + m[2]) : "";
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
  const dr = e.target.closest("[data-pick],[data-take],[data-unslot],[data-unbuild],[data-clearbuild],[data-offer],[data-toggle],[data-dview]");
  if (dr) {
    const ds = dr.dataset;
    if (ds.pick) {
      const [i, key] = ds.pick.split("|");
      draft.slots[+i] = key;
    } else if (ds.take) {
      draft.build.push(draft.slots[+ds.take]);
      draft.slots.fill(null);
    } else if (ds.unslot) draft.slots[+ds.unslot] = null;
    else if (ds.unbuild) draft.build.splice(draft.build.indexOf(ds.unbuild), 1);
    else if (ds.clearbuild) draft.build.length = 0;
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
