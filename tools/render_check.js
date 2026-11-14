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
vm.runInContext(app + "\n;globalThis.__app = { VIEWS, TABS, state, H, renderControls, renderList, draft, pickResults, overlap, keyOf };", ctx);
const { VIEWS, TABS, state, H, renderControls, renderList, draft, pickResults, overlap, keyOf } = ctx.__app;

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
    ["dude", "relic"].forEach((k) => combos.push({ kind: k }));
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
const all = [...H.dudes.filter((d) => d.name), ...H.relics].map(keyOf);
state.tab = "draft";
for (const build of [[], ["dude:basketball", "dude:basketball", "relic:r_jump_shoes", "dude:coach", "relic:ancient_sword"]]) {
  draft.build.splice(0, draft.build.length, ...build);
  for (let i = 0; i < all.length; i += 3) {
    draft.slots.splice(0, 3, all[i] || null, all[i + 1] || null, all[i + 2] || null);
    tryRender(`draft ${build.length} ${all[i]}`, () => { renderList(); return els["#list"].innerHTML; });
  }
}
draft.slots.splice(0, 3, null, null, null);
tryRender("draft empty slots", () => { renderList(); return els["#list"].innerHTML + pickResults(0, "dude"); });
if (!overlap(H.relics.find((r) => r.id === "r_jump_shoes"), ["dude:basketball"]).links.length) problems.push("draft: Jump Shoes not linked to Basketball Dude");
for (const d of H.dudes) tryRender(`dude ${d.t}`, () => VIEWS.dude(d.t));
for (const r of H.relics) tryRender(`relic ${r.id}`, () => VIEWS.relic(r.id));
for (const f of H.families) tryRender(`family ${f.id}`, () => VIEWS.family(f.id));
for (const c of H.chans) tryRender(`ch ${c.id}`, () => VIEWS.ch(c.id));

if (problems.length) {
  console.log(problems.slice(0, 40).join("\n"));
  console.log(`render_check: ${problems.length} problems in ${n} renders`);
  process.exit(1);
}
console.log(`render_check: ${n} renders, 0 problems`);
