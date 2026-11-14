"use strict";
/* How Many Dudes? Codex — data: window.HMD (tools/build_data.py). Mobile first. */

const FEATURES = { roles: true, mechanics: true, draft: true };

const H = window.HMD;
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- indexes ---------- */
const DUDE = Object.fromEntries(H.dudes.map((d) => [d.t, d]));
const RELIC = Object.fromEntries(H.relics.map((r) => [r.id, r]));
const FAM = Object.fromEntries(H.families.map((f) => [f.id, f]));
const KW = Object.fromEntries(H.keywords.map((k) => [k.id, k]));
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
const dudesSorted = H.dudes.filter((d) => d.name).sort(byName);
const relicsSorted = H.relics.slice().sort(byName);
const relicsOfDude = (t) => relicsSorted.filter((r) => r.dude === t);
const relicsOfFamilyPool = (f) => relicsSorted.filter((r) => r.pool !== "dude" && r.fam === f);
const membersOf = (f) => dudesSorted.filter((d) => d.fam.includes(f));
const refsFrom = (key) => H.refs.filter((e) => e.a === key);
const refsTo = (key) => H.refs.filter((e) => e.b === key);

// Synergy keywords: used by at least two separate units. A unit is a Dude together with his own relics, or one
// Family / universal / Promoter relic. A keyword only one unit uses (Burger: Chef + Chef relics) links nothing.
const unitOf = (x) => (x.t ? "dude:" + x.t : x.pool === "dude" ? "dude:" + x.dude : "relic:" + x.id);
const KW_UNITS = {};
for (const x of [...H.dudes, ...H.relics]) for (const k of x.kw) (KW_UNITS[k] = KW_UNITS[k] || new Set()).add(unitOf(x));
const isSynergy = (k) => (KW_UNITS[k]?.size || 0) >= 2;
const synKw = (x) => x.kw.filter(isSynergy);

// keyword rarity weight: shared rare mechanics count more than shared common stats
const KW_DF = {};
for (const x of [...H.dudes, ...H.relics]) for (const k of x.kw) KW_DF[k] = (KW_DF[k] || 0) + 1;
const NDOCS = H.dudes.length + H.relics.length;
const kwWeight = (k) => Math.log(NDOCS / (KW_DF[k] || 1));

// effect types: keywords that name an effect, not a target / rule term
const NON_EFFECT = new Set(["Roster Dude", "Roster", "Team", "Direct Damage", "Cooldown", "HP", "Independent Stacking",
  "Chained Effect", "Primary Target"]);
function itemEffects(items, n) {
  const count = {};
  for (const x of items) for (const k of synKw(x)) if (!NON_EFFECT.has(k)) count[k] = (count[k] || 0) + 1;
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
    .map(([k, v]) => `<span class="eff"${big ? ` data-open="kw:${encodeURIComponent(k)}"` : ""}>${esc(k)}${bar(v, max)}</span>`)
    .join("")}</div>`;
}

function sharedMechanics(kw, pool, selfKey, limit) {
  const mine = new Set(kw.filter(isSynergy));
  const scored = [];
  for (const x of pool) {
    const key = x.t ? "dude:" + x.t : "relic:" + x.id;
    if (key === selfKey) continue;
    const shared = synKw(x).filter((k) => mine.has(k));
    if (!shared.length) continue;
    const score = shared.reduce((s, k) => s + kwWeight(k), 0);
    scored.push({ x, shared: shared.sort((a, b) => kwWeight(b) - kwWeight(a)), score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
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
const kwChip = (k) => `<button class="chiplink kw" data-open="kw:${encodeURIComponent(k)}">${esc(k)}</button>`;
const roleBadge = (d) => (FEATURES.roles && d.role ? `<span class="badge ${esc(d.role.role)}">${esc(d.role.role)}</span>` : "");

function mini(x, sub) {
  const key = x.t ? "dude:" + x.t : "relic:" + x.id;
  return `<button class="mini" data-open="${key}">${img(x.icon, x.name)}<span>${esc(x.name)}${sub ? `<small>${sub}</small>` : ""}</span></button>`;
}

const FMT = { percent: "%", cash: "$", seconds: "s", number: "" };
// game formatting (hmd_loctext_fill): percent = value x 100, cash = $value, seconds / number = the value
const num = (v) => String(Math.round(v * 100) / 100);
const fmtVal = (v, f) => (f === "percent" ? num(v * 100) + "%" : f === "cash" ? "$" + num(v) : num(v));
function renderSegs(seg) {
  return seg
    .map(([kind, a, b, c]) => {
      if (kind === "t") return esc(a);
      if (kind === "k")
        return isSynergy(a) ? `<span class="k" data-open="kw:${encodeURIComponent(a)}">${esc(b)}</span>` : `<span class="k solo">${esc(b)}</span>`;
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
  ...(FEATURES.mechanics ? [{ id: "mechanics", name: "Mechanics" }] : []),
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
    if (state.kind === "dude" && FEATURES.roles) html += filterChips("role", ["Damage", "Tank", "Support", "Utility"].map((r) => [r, r]), state.role);
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
      .filter((d) => (!state.fam || d.fam.includes(state.fam)) && (!state.role || d.role?.role === state.role))
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
    rows = H.keywords
      .filter((k) => isSynergy(k.id) && match(q, k.id))
      .map((k) => `<button class="row" data-open="kw:${encodeURIComponent(k.id)}"><span class="main"><span class="name">${esc(k.id)}</span></span></button>`);
  }
  $("#list").innerHTML = rows.join("") || `<div class="empty">No matches</div>`;
}

// one list row for a Dude or a relic; attr = what a tap does (open its page by default)
function itemRow(x, attr) {
  const a = attr || `data-open="${keyOf(x)}"`;
  return x.t
    ? `<button class="row" ${a}>${img(x.icon, x.name, "ic")}<span class="main"><span class="name">${esc(x.name)}</span>
        <span class="sub">${esc(x.ab || "")}${FEATURES.roles && x.role ? " · " + esc(x.role.sub_role) : ""}</span></span>
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

// what an offer shares with the build: game Family, its relic pool, names / owned relics, synergy mechanics
function overlap(x, build) {
  const items = build.map(itemOf);
  const dudes = items.filter((b) => b.t);
  const out = { fam: [], links: [], kw: [], score: 0 };
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
  const have = new Set(items.flatMap(synKw));
  out.kw = synKw(x).filter((w) => have.has(w)).sort((a, b) => kwWeight(b) - kwWeight(a));
  out.score = out.kw.reduce((s, w) => s + kwWeight(w), 0) + 3 * out.fam.reduce((s, f) => s + f[1], 0) + 3 * out.links.length;
  return out;
}

function slotHtml(i, best, max) {
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
    ...o.kw.map(kwChip),
  ];
  return `<div class="slot${o.score === best ? " best" : ""}">
    <div class="shead"><button class="rhead" data-open="${key}">${img(x.icon, x.name)}<span>${esc(x.name)}</span></button>
      <span class="slabel">${label}</span><button class="x" data-unslot="${i}" aria-label="Clear">×</button></div>
    <div class="rdesc">${text}</div>
    ${draft.build.length ? `<div class="ovl"><span>Overlap</span>${bar(o.score, max)}</div>${ov.length ? `<div class="chipline">${ov.join("")}</div>` : ""}` : ""}
    <button class="take" data-take="${i}">Take</button></div>`;
}

function renderDraft() {
  const scores = draft.slots.map((k) => (k ? overlap(itemOf(k), draft.build).score : -1));
  const max = Math.max(0, ...scores);
  const best = max > 0 && draft.slots.filter(Boolean).length > 1 ? max : null;   // every offer tied for the most overlap
  const counts = {};
  for (const k of draft.build) counts[k] = (counts[k] || 0) + 1;
  const tiles = Object.keys(counts).map(
    (k) => `<div class="btile">${mini(itemOf(k), counts[k] > 1 ? "×" + counts[k] : "")}<button class="x" data-unbuild="${k}" aria-label="Remove">×</button></div>`
  );
  const items = draft.build.map(itemOf);
  return `<h3>Offers</h3><div class="slots">${draft.slots.map((_, i) => slotHtml(i, best, max)).join("")}</div>
    <h3>Build</h3>${tiles.length
      ? `<div class="grid">${tiles.join("")}</div>${section("Build effects", effectBars(itemEffects(items, 8), true))}
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
  const kws = synKw(r);
  return `<div class="rcard"><button class="rhead" data-open="relic:${r.id}">${img(r.icon, r.name)}<span>${esc(r.name)}</span></button>
    <div class="rdesc">${renderSegs(r.seg)}</div>${kws.length ? `<div class="chipline">${kws.map(kwChip).join("")}</div>` : ""}</div>`;
}

const offerBtn = (key) => (FEATURES.draft ? `<button class="offer" data-offer="${key}">+ Draft</button>` : "");
const relicCards = (rs) => (rs.length ? `<div class="rcards">${rs.map(relicCard).join("")}</div>` : "");

function dudeView(t) {
  const d = DUDE[t];
  if (!d) return null;
  const key = "dude:" + t;
  const role = FEATURES.roles && d.role
    ? `<div class="role"><div class="meta">${roleBadge(d)}<span>${esc(d.role.sub_role)}</span></div><div class="tags">${d.role.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join("")}</div></div>`
    : "";
  const famRelics = d.fam.map((f) => famChip(f)).join("");
  const mates = d.fam.flatMap((f) => membersOf(f).filter((x) => x.t !== t).map((x) => mini(x)));
  const out = refsFrom(key).map((e) => e.b.split(":")[1]).filter((x) => DUDE[x]).map((x) => mini(DUDE[x]));
  const inbound = refsTo(key)
    .map((e) => e.a.split(":"))
    .map(([k, id]) => (k === "dude" ? DUDE[id] : RELIC[id]))
    .filter((x) => x && !(x.id && x.dude === t))
    .map((x) => mini(x, x.id ? esc(poolLabel(x)) : ""));
  const shared = FEATURES.mechanics
    ? sharedMechanics(d.kw, H.dudes, key, 8).map((s) => mini(s.x, s.shared.slice(0, 3).map(esc).join(" · ")))
    : [];
  return `<div class="hero">${img(d.icon, d.name)}<div><h2>${esc(d.name)}</h2><div class="meta">${d.fam.map(famChip).join("")}${offerBtn(key)}</div></div></div>
    ${role}
    ${d.ab || d.seg.length ? `<div class="desc">${d.ab ? `<div class="ab">${esc(d.ab)}</div>` : ""}${renderSegs(d.seg)}</div>` : ""}
    ${section("Relics", relicCards(relicsOfDude(t)))}
    ${section("Family relics", famRelics ? `<div class="chipline">${famRelics}</div>` : "")}
    ${section("Family", grid(mates))}
    ${section("Names", grid(out))}
    ${section("Named by", grid(inbound))}
    ${section("Shared mechanics", grid(shared))}`;
}

function relicView(id) {
  const r = RELIC[id];
  if (!r) return null;
  const key = "relic:" + id;
  const pool = r.pool === "dude" ? dudeChip(r.dude) + famChip(r.fam) : r.pool === "family" ? famChip(r.fam) : `<span class="badge">${esc(poolLabel(r))}</span>${famChip(r.fam)}`;
  const refs = refsFrom(key).map((e) => e.b.split(":")[1]).filter((x) => DUDE[x] && x !== r.dude).map((x) => mini(DUDE[x]));
  const kws = synKw(r).length ? `<div class="chipline">${synKw(r).map(kwChip).join("")}</div>` : "";
  const shared = FEATURES.mechanics
    ? sharedMechanics(r.kw, H.dudes, null, 8).map((s) => mini(s.x, s.shared.slice(0, 3).map(esc).join(" · ")))
    : [];
  return `<div class="hero">${img(r.icon, r.name)}<div><h2>${esc(r.name)}</h2><div class="meta">${pool}${offerBtn(key)}</div></div></div>
    <div class="desc">${renderSegs(r.seg)}</div>
    ${section("Names", grid(refs))}
    ${FEATURES.mechanics ? section("Mechanics", kws) : ""}
    ${section("Dudes sharing mechanics", grid(shared))}`;
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
    ${section("Dudes", grid(members.map((d) => mini(d, FEATURES.roles && d.role ? esc(d.role.role + " · " + d.role.sub_role) : ""))))}
    ${section("Family relics", relicCards(relicsOfFamilyPool(f)))}
    ${perDude}`;
}

function kwView(k) {
  if (!KW[k]) return null;
  const ds = dudesSorted.filter((d) => d.kw.includes(k)).map((d) => mini(d));
  const rs = relicsSorted.filter((r) => r.kw.includes(k)).map((r) => mini(r, esc(poolLabel(r) || "")));
  return `<div class="hero"><div><h2>${esc(k)}</h2></div></div>${section("Dudes", grid(ds))}${section("Relics", grid(rs))}`;
}

const VIEWS = { dude: dudeView, relic: relicView, family: familyView, kw: kwView };

/* ---------- routing: #tab or #kind:id (overlay) ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^(dude|relic|family|kw):(.+)$/);
  if (m) {
    const html = VIEWS[m[1]](m[2]);
    if (html) {
      $("#detail").innerHTML = html;
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
      dr.textContent = "Added";
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
