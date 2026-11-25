/*
  render_check.js — render every list tab (with every filter) and every detail view headlessly (Node vm, stub DOM)
  against the real data.js. Fails (exit 1) on a thrown error, a literal "undefined"/"null"/"NaN" in the HTML, an
  <img> pointing at a file not in assets/icons, or a detail view that returns nothing.
  Usage: node tools/render_check.js     (run after tools/build_data.py, before committing)
*/
const fs = require("fs"), vm = require("vm"), path = require("path");
const APP = path.join(__dirname, "..");
const el = () => ({ innerHTML: "", dataset: {}, scrollTop: 0, classList: { add() {}, remove() {}, contains() { return true; } },
  setAttribute() {}, style: {}, closest() { return null; } });
const els = {};
const store = {};
const ctx = { window: {}, console, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, location: { hash: "" }, history: { replaceState() {}, back() {} }, scrollY: 0, scrollTo() {},
  addEventListener() {}, encodeURIComponent, decodeURIComponent,
  document: { querySelector: (s) => els[s] || (els[s] = el()), addEventListener() {}, body: { style: {} } } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(APP, "data.js"), "utf8"), ctx);
const app = fs.readFileSync(path.join(APP, "app.js"), "utf8").replace('"use strict";', "");
vm.runInContext(app + "\n;globalThis.__app = { VIEWS, TABS, state, H, renderControls, renderList, draft, pickResults, overlap, keyOf, glList, glStack, renderGloss };", ctx);
const { VIEWS, TABS, state, H, renderControls, renderList, draft, pickResults, overlap, keyOf, glList, glStack, renderGloss } = ctx.__app;

const icons = new Set(fs.readdirSync(path.join(APP, "assets", "icons")));
const problems = [];
let n = 0;
function scan(where, html) {
  n++;
  if (!html) return problems.push(`${where}: empty`);
  for (const m of html.matchAll(/src="assets\/icons\/([^"?]+)/g)) if (!icons.has(m[1])) problems.push(`${where}: missing icon ${m[1]}`);
  const bad = html.replace(/<[^>]*>/g, " ").match(/\b(undefined|null|NaN)\b/);
  if (bad) problems.push(`${where}: "${bad[0]}"`);
}
function tryRender(where, fn) {
  try { scan(where, fn()); } catch (e) { problems.push(`${where}: threw ${e.message}`); }
}

const famIds = H.families.map((f) => f.id);
for (const t of TABS) {
  const combos = [{}];
  if (t.id === "search") {
    ["dude", "relic", "trinket", "food"].forEach((k) => combos.push({ kind: k }));
    famIds.forEach((f) => combos.push({ fam: f }));
    ["Damage", "Tank", "Support", "Utility"].forEach((r) => combos.push({ kind: "dude", role: r }));
    ["dude", "family", "universal", "promoter"].forEach((p) => combos.push({ kind: "relic", pool: p }));
  }
  for (const c of combos) {
    Object.assign(state, { tab: t.id, q: "", kind: null, fam: null, role: null, pool: null }, c);
    tryRender(`list ${t.id} ${JSON.stringify(c)}`, () => { renderControls(); renderList(); return els["#list"].innerHTML + els["#controls"].innerHTML; });
  }
}
// draft: every Dude and relic as an offer, against an empty build and against a mixed build
const all = [...H.dudes.filter((d) => d.name), ...H.relics, ...H.trinkets, ...H.food].map(keyOf);
state.tab = "draft";
for (const build of [[], ["dude:basketball", "dude:basketball", "relic:r_jump_shoes", "dude:coach", "relic:ancient_sword"]]) {
  draft.build.splice(0, draft.build.length, ...build);
  draft.wield = build.length ? { basketball: H.trinkets[0].id, coach: H.trinkets[1].id } : {};
  draft.food = build.length ? { basketball: { id: H.food[0].id, sec: H.foodstats[3].id }, coach: { id: H.food[1].id, sec: null } } : {};
  draft.slotSec = [H.foodstats[0].id, null, H.foodstats[5].id];   // offered meals: one with an extra stat chosen
  for (let i = 0; i < all.length; i += 3) {
    draft.slots.splice(0, 3, all[i] || null, all[i + 1] || null, all[i + 2] || null);
    tryRender(`draft ${build.length} ${all[i]}`, () => { renderList(); return els["#list"].innerHTML; });
  }
}
// Team view: every Dude, three at a time, with all their relics and their Families' relics picked
draft.view = "team";
const named = H.dudes.filter((d) => d.name);
for (let i = 0; i < named.length; i += 3) {
  const ds = named.slice(i, i + 3);
  const rel = H.relics.filter((r) => (r.pool === "dude" ? ds.some((d) => d.t === r.dude) : r.fam === "global" || ds.some((d) => d.fam.includes(r.fam))));
  draft.build.splice(0, draft.build.length, ...ds.map(keyOf), ...rel.map(keyOf));
  draft.wield = Object.fromEntries(ds.map((d, j) => [d.t, H.trinkets[(i + j) % H.trinkets.length].id]));
  draft.food = Object.fromEntries(ds.map((d, j) => [d.t, { id: H.food[(i + j) % H.food.length].id, sec: H.foodstats[(i + j) % H.foodstats.length].id }]));
  tryRender(`team ${ds.map((d) => d.t)}`, () => { renderList(); return els["#list"].innerHTML; });
}
draft.view = "offers";
draft.slots.splice(0, 3, null, null, null);
tryRender("draft empty slots", () => { renderList(); return els["#list"].innerHTML + pickResults("dude"); });
if (!overlap(H.relics.find((r) => r.id === "r_jump_shoes"), ["dude:basketball"]).links.length) problems.push("draft: Jump Shoes not linked to Basketball Dude");
for (const d of H.dudes) tryRender(`dude ${d.t}`, () => VIEWS.dude(d.t));
for (const r of H.relics) tryRender(`relic ${r.id}`, () => VIEWS.relic(r.id));
for (const t of H.trinkets) tryRender(`trinket ${t.id}`, () => VIEWS.trinket(t.id));
tryRender("stash", () => VIEWS.stash("all"));
for (const m of H.food) tryRender(`food ${m.id}`, () => VIEWS.food(m.id));
tryRender("meals", () => VIEWS.meals("all"));
tryRender("foodstat", () => VIEWS.foodstat(H.foodstats[0].id));
for (const f of H.families) tryRender(`family ${f.id}`, () => VIEWS.family(f.id));
for (const c of H.chans) tryRender(`ch ${c.id}`, () => VIEWS.ch(c.id));
for (const e of H.enemies) tryRender(`enemy ${e.id}`, () => VIEWS.enemy(e.id));
for (const t of H.traits) tryRender(`trait ${t.id}`, () => VIEWS.trait(t.id));
// glossary popups: every thing's list and every term with its own list, each entry named (a keyword tap opens it)
const glKeys = [...H.dudes.map(keyOf), ...H.relics.map(keyOf), ...H.trinkets.map(keyOf), ...H.traits.map((t) => "trait:" + t.id),
  ...Object.keys(H.gloss).filter((id) => H.gloss[id][2].length).map((id) => "g:" + id)];
let glOpened = 0;
for (const gk of glKeys) {
  if (!glList(gk).length) continue;
  glOpened++;
  tryRender(`glossary ${gk}`, () => {
    glStack.length = 0;
    glStack.push({ gk, kw: "" });
    renderGloss();
    const html = els["#gloss"].innerHTML;
    const shown = (html.match(/class="gent/g) || []).length;
    if (shown !== glList(gk).length) problems.push(`glossary ${gk}: ${shown} of ${glList(gk).length} entries shown`);
    return html;
  });
}
if (glOpened < 500) problems.push(`glossary: only ${glOpened} popups (expected 500+)`);

if (problems.length) {
  console.log(problems.slice(0, 40).join("\n"));
  console.log(`render_check: ${problems.length} problems in ${n} renders`);
  process.exit(1);
}
console.log(`render_check: ${n} renders, 0 problems`);
