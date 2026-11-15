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
const fxLabel = ([f, c, s]) => `${FACET[f]} ${c}${s === "team" && f === "gives" ? " · team" : s === "enemy" ? " · enemy" : ""}`;

// roles derived from a Dude's ability + relics: [role, sub_role, n, fromAbility]
const ROLES = ["Damage", "Tank", "Support", "Utility"];
function mainRole(d) {
  const sum = {};
  const pool = d.roles.some((r) => r[3]) ? d.roles.filter((r) => r[3]) : d.roles;
  for (const [r, , n] of pool) sum[r] = (sum[r] || 0) + n;
  const top = Object.entries(sum).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const sub = pool.filter((r) => r[0] === top[0]).sort((a, b) => b[2] - a[2])[0][1];
  return { role: top[0], sub };
}
const hasRole = (d, r) => d.roles.some((x) => x[0] === r);

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
const roleBadge = (d) => {
  const m = FEATURES.roles && mainRole(d);
  return m ? `<span class="badge ${esc(m.role)}">${esc(m.role)}</span>` : "";
};

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
        <span class="sub">${esc(x.ab || "")}${FEATURES.roles && mainRole(x) ? " · " + esc(mainRole(x).sub) : ""}</span></span>
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
  };
})();
const saveDraft = () => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* storage off */ }
};

// what an offer shares with the build: game Family, its relic pool, names / owned relics, synergy edges
function overlap(x, build) {
  const items = build.map(itemOf);
  const dudes = items.filter((b) => b.t);
  const out = { fam: [], links: [], ch: [], score: 0, pool: [], poolScore: 0 };
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
  // synergy: the offer's own effect links (a relic) or its unit's edges (a Dude) into the units already in the build
  const mine = unitOf(x);
  const inBuild = new Set(items.map(unitOf));
  inBuild.delete(mine);
  const via = {};   // channel -> build units it connects to
  const lk = x.t ? (SYN[mine] || []).map((p) => [p.u, p.score, p.chs]) : H.links[k] || [];
  for (const [u, , cs] of lk) if (inBuild.has(u)) cs.forEach((c) => (via[c] = via[c] || []).push(u));
  out.ch = Object.keys(via).sort((a, b) => chWeight(b) - chWeight(a));
  out.via = via;
  out.score = out.ch.reduce((s, c) => s + chWeight(c), 0) + 3 * out.fam.reduce((s, f) => s + f[1], 0) + 3 * out.links.length;
  // first Dude of a Family: the Family relics he unlocks, scored against the build plus himself
  if (x.t) {
    const reach = new Set([...inBuild, mine]);
    for (const f of x.fam) {
      if (f === "global" || famCount(f)) continue;
      for (const r of relicsOfFamilyPool(f)) {
        const rv = {};
        for (const [u, , cs] of H.links["relic:" + r.id] || []) if (reach.has(u)) cs.forEach((c) => (rv[c] = rv[c] || []).push(u));
        const sc = Object.keys(rv).reduce((s, c) => s + chWeight(c), 0);
        if (sc) out.pool.push({ r, f, sc, via: rv });
      }
    }
    out.pool.sort((a, b) => b.sc - a.sc);
    out.poolScore = out.pool.reduce((s, p) => s + p.sc, 0);
  }
  return out;
}
const num1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
// one overlap line: what overlaps (chip), [channels,] then the build items it joins (icons, tap to open)
function viaRow(head, units, chs) {
  const icons = [...new Set(units)].map((u) => itemOf(u)).filter(Boolean)
    .map((b) => `<button class="vi" data-open="${keyOf(b)}" title="${esc(b.name)}">${img(b.icon, b.name)}</button>`).join("");
  return `<div class="via">${head}${chs ? `<small>${chs.map(esc).join(" · ")}</small>` : ""}<span class="with">${icons}</span></div>`;
}
const chChip = (c) => `<button class="chiplink kw" data-open="ch:${encodeURIComponent(c)}">${esc(c)}</button>`;

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
  const vias = o.ch.map((c) => viaRow(chChip(c), o.via[c])).join("");
  return `<div class="slot${o.score === best ? " best" : ""}">
    <div class="shead"><button class="rhead" data-open="${key}">${img(x.icon, x.name)}<span>${esc(x.name)}</span></button>
      <span class="slabel">${label}</span><button class="x" data-unslot="${i}" aria-label="Clear">×</button></div>
    <div class="rdesc">${text}</div>
    ${draft.build.length ? `<div class="ovl"><span>Overlap</span>${bar(o.score, max)}<b>${num1(o.score)}</b></div>${ov.length ? `<div class="chipline">${ov.join("")}</div>` : ""}${vias}` : ""}
    ${o.pool.length ? `<div class="ovl"><span>${[...new Set(o.pool.map((p) => p.f))].map(famIcon).join("")}</span>${bar(o.poolScore, poolMax)}<b>${num1(o.poolScore)}</b></div>
      ${o.pool.slice(0, 3).map((p) => viaRow(`<button class="chiplink" data-open="relic:${p.r.id}">${img(p.r.icon, p.r.name)}${esc(p.r.name)}</button>`,
        [...new Set(Object.values(p.via).flat())], Object.keys(p.via).sort((a, b) => chWeight(b) - chWeight(a)))).join("")}` : ""}
    <button class="take" data-take="${i}">Take</button></div>`;
}

function renderDraft() {
  const ovs = draft.slots.map((k) => (k ? overlap(itemOf(k), draft.build) : null));
  const scores = ovs.map((o) => (o ? o.score : -1));
  const max = Math.max(0, ...scores);
  const poolMax = Math.max(0, ...ovs.map((o) => (o ? o.poolScore : 0)));   // second bar: its own scale (A-magnitude-bars)
  const best = max > 0 && draft.slots.filter(Boolean).length > 1 ? max : null;   // every offer tied for the most overlap
  const counts = {};
  for (const k of draft.build) counts[k] = (counts[k] || 0) + 1;
  const tile = (k) =>
    `<div class="btile">${mini(itemOf(k), counts[k] > 1 ? "×" + counts[k] : "")}<button class="x" data-unbuild="${k}" aria-label="Remove">×</button></div>`;
  // each Dude with his own drafted relics nested under him; every other relic after
  const keys = Object.keys(counts);
  const dudeKeys = keys.filter((k) => k.startsWith("dude:"));
  const ownerIn = (k) => { const x = itemOf(k); return x.pool === "dude" && counts["dude:" + x.dude]; };
  const groups = dudeKeys.map((dk) => {
    const own = keys.filter((k) => k.startsWith("relic:") && itemOf(k).dude === dk.slice(5));
    return `<div class="bgroup">${tile(dk)}${own.length ? `<div class="bnest">${own.map(tile).join("")}</div>` : ""}</div>`;
  });
  const loose = keys.filter((k) => k.startsWith("relic:") && !ownerIn(k));
  const tiles = [...groups, ...(loose.length ? [`<div class="grid">${loose.map(tile).join("")}</div>`] : [])];
  const items = draft.build.map(itemOf);
  return `<h3>Offers</h3><div class="slots">${draft.slots.map((_, i) => slotHtml(i, best, max, poolMax)).join("")}</div>
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
  // roles from his ability (solid) and the ones his relics add (+)
  const m = mainRole(d);
  const role = FEATURES.roles && m
    ? `<div class="role"><div class="meta">${roleBadge(d)}<span>${esc(m.sub)}</span></div><div class="tags">${d.roles
      .map(([r, s, , ab]) => `<span class="tag ${esc(r)}${ab ? "" : " plus"}">${ab ? "" : "+ "}${esc(s)}</span>`)
      .join("")}</div></div>`
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
    ${section("Dudes", grid(members.map((d) => mini(d, FEATURES.roles && mainRole(d) ? esc(mainRole(d).role + " · " + mainRole(d).sub) : ""))))}
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
  const dr = e.target.closest("[data-pick],[data-take],[data-unslot],[data-unbuild],[data-clearbuild],[data-offer]");
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
