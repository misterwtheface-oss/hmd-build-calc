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
const ctx = { window: {}, console, location: { hash: "" }, history: { replaceState() {}, back() {} }, scrollY: 0, scrollTo() {},
  addEventListener() {}, encodeURIComponent, decodeURIComponent,
  document: { querySelector: (s) => els[s] || (els[s] = el()), addEventListener() {}, body: { style: {} } } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(APP, "data.js"), "utf8"), ctx);
const app = fs.readFileSync(path.join(APP, "app.js"), "utf8").replace('"use strict";', "");
vm.runInContext(app + "\n;globalThis.__app = { VIEWS, TABS, state, H, renderControls, renderList };", ctx);
const { VIEWS, TABS, state, H, renderControls, renderList } = ctx.__app;

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
  if (t.id === "dudes" || t.id === "relics") famIds.forEach((f) => combos.push({ fam: f }));
  if (t.id === "dudes") ["Damage", "Tank", "Support", "Utility"].forEach((r) => combos.push({ role: r }));
  if (t.id === "relics") ["dude", "family", "universal", "promoter"].forEach((p) => combos.push({ pool: p }));
  for (const c of combos) {
    Object.assign(state, { tab: t.id, q: "", fam: null, role: null, pool: null }, c);
    tryRender(`list ${t.id} ${JSON.stringify(c)}`, () => { renderControls(); renderList(); return els["#list"].innerHTML + els["#controls"].innerHTML; });
  }
}
for (const d of H.dudes) tryRender(`dude ${d.t}`, () => VIEWS.dude(d.t));
for (const r of H.relics) tryRender(`relic ${r.id}`, () => VIEWS.relic(r.id));
for (const f of H.families) tryRender(`family ${f.id}`, () => VIEWS.family(f.id));
for (const k of H.keywords) tryRender(`kw ${k.id}`, () => VIEWS.kw(k.id));

if (problems.length) {
  console.log(problems.slice(0, 40).join("\n"));
  console.log(`render_check: ${problems.length} problems in ${n} renders`);
  process.exit(1);
}
console.log(`render_check: ${n} renders, 0 problems`);
