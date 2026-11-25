/*
  weight_preview.js — compare Draft weighting modes (app.js WEIGHT) on simulated drafts before choosing one.
  Each run: a random first Dude, then Dude offers and relic offers alternate (3 options each, from the real pool:
  universal + each Family with a member + each drafted Dude's relics, relics not yet taken); every variant always
  takes its highest-scored option. Same seeds for every variant. Reports what the finished builds look like, plus
  one mid-run snapshot of how each variant ranks every option.
  Usage: node tools/weight_preview.js [runs=200] [> report.md]
*/
const fs = require("fs"), vm = require("vm"), path = require("path");
const APP = path.join(__dirname, "..");
const store = {};
const el = () => ({ innerHTML: "", dataset: {}, classList: { add() {}, remove() {}, contains() { return true; } }, setAttribute() {}, style: {}, closest() { return null; } });
const ctx = { window: {}, console, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } }, location: { hash: "" },
  history: { replaceState() {}, back() {} }, scrollY: 0, scrollTo() {}, addEventListener() {}, encodeURIComponent, decodeURIComponent,
  document: { querySelector: () => el(), addEventListener() {}, body: { style: {} } } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(APP, "data.js"), "utf8"), ctx);
const app = fs.readFileSync(path.join(APP, "app.js"), "utf8").replace('"use strict";', "");
vm.runInContext(app + "\n;globalThis.__app = { H, WEIGHT, ROLE, roleNeed, overlap, itemOf, keyOf, PAIR, GATE, CH, unitOf, relicsOfDude, relicsOfFamilyPool, relicsOfSource, buildFams, DUDE };", ctx);
const A = ctx.__app;

const RUNS = +process.argv[2] || 200, DUDE_OFFERS = 10, RELIC_OFFERS = 14;
const VARIANTS = [
  { name: "Grow w^1.5, rarity ^2, no role fill", mode: "grow", seen: 25, rare: 2, role: 0 },
  { name: "Role fill 5", mode: "grow", seen: 25, rare: 2, role: 5 },
  { name: "Role fill 10", mode: "grow", seen: 25, rare: 2, role: 10 },
  { name: "Role fill 20", mode: "grow", seen: 25, rare: 2, role: 20 },
  { name: "Role fill 40 (live, 2026-11-25)", mode: "grow", seen: 25, rare: 2, role: 40 },
  { name: "Role fill 80", mode: "grow", seen: 25, rare: 2, role: 80 },
  { name: "Role fill 1000 (roles always first)", mode: "grow", seen: 25, rare: 2, role: 1000 },
];
const rng = (seed) => () => ((seed = (seed + 0x6d2b79f5) | 0), (((seed ^ (seed >>> 15)) * (1 | seed)) >>> 0) / 4294967296);
const dudes = A.H.dudes.filter((d) => d.name).map((d) => "dude:" + d.t);
const pick = (r, arr, n) => { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; };
function pool(build) {
  const team = [...new Set(build.filter((k) => k.startsWith("dude:")))].map(A.itemOf);
  const rs = [...A.relicsOfSource("universal"), ...A.buildFams(team).flatMap(A.relicsOfFamilyPool), ...team.flatMap((d) => A.relicsOfDude(d.t))];
  return rs.map((r) => "relic:" + r.id).filter((k) => !build.includes(k));
}
const choose = (build, opts) => opts.map((k) => [k, A.overlap(A.itemOf(k), build).score]).sort((a, b) => b[1] - a[1])[0][0];

function simulate(v, seed, stopAt) {
  Object.assign(A.WEIGHT, { mode: v.mode, seen: v.seen, rare: v.rare ?? 1 }); A.ROLE.w = v.role ?? 10;
  const r = rng(seed);
  const build = [pick(r, dudes, 1)[0]];
  for (let i = 0; i < DUDE_OFFERS + RELIC_OFFERS; i++) {
    if (stopAt !== undefined && i === stopAt) return build;
    const opts = i % 2 === 0 && i / 2 < DUDE_OFFERS ? pick(r, dudes, 3) : pick(r, pool(build), 3);
    if (opts.length) build.push(choose(build, opts));
  }
  return build;
}
// the finished build: synergy pairs among what it actually holds (Dude abilities, picked relics), each once,
// times the copies on each side (a second Mummy Dude fires his ability again)
function measure(build) {
  const have = new Set(build);
  const n = {};
  for (const k of build) n[k] = (n[k] || 0) + 1;
  const team = [...new Set(build.filter((k) => k.startsWith("dude:")))].map(A.itemOf);
  const chMass = {};
  let mass = 0;
  const live = new Set();
  for (const e of have)
    for (const l of A.PAIR[e] || []) {
      if (l.give || !have.has(l.o) || A.unitOf(A.itemOf(e)) === A.unitOf(A.itemOf(l.o))) continue;
      // a gated facet counts only if the build holds something that opens each of its gates
      if (![[e, l.g], [l.o, l.og]].every(([x, gs]) => (gs || []).every((g) => (A.GATE[x]?.[g] || []).some((s) => s !== x && have.has(s))))) continue;
      const w = (A.CH[l.ch]?.r || 0) * n[e] * n[l.o];
      mass += w; chMass[l.ch] = (chMass[l.ch] || 0) + w;
      live.add(e); live.add(l.o);
    }
  const relics = [...have].filter((k) => k.startsWith("relic:"));
  const top = Object.entries(chMass).sort((a, b) => b[1] - a[1]);
  // Act 1 team: the first ROLE.act1 Dude types drafted; roles = how many of the four it fills (a secondary = half)
  const act1 = [...new Set(build.filter((k) => k.startsWith("dude:")).map((k) => k.slice(5)))].slice(0, A.ROLE.act1);
  return { roles: A.ROLE.roles.length - A.roleNeed(act1), allRoles: A.roleNeed(act1) === 0 ? 1 : 0, types: team.length, fams: A.buildFams(team).length, relics: relics.length, mass,
    perPick: mass / build.length, top3: mass ? top.slice(0, 3).reduce((a, c) => a + c[1], 0) / mass : 0,
    dead: relics.length ? relics.filter((k) => !live.has(k)).length / relics.length : 0, topCh: top.slice(0, 3).map((c) => c[0]) };
}
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const f1 = (x) => x.toFixed(1), pct = (x) => Math.round(100 * x) + "%";

const lines = [`# Draft weighting preview (${RUNS} simulated drafts per variant, ${DUDE_OFFERS} Dude + ${RELIC_OFFERS} relic offers, always taking the top score)`, ""];
lines.push("| Variant | Act 1 all 4 roles | Act 1 roles filled | Dude types | Families | Synergy in build | Synergy per pick | Top 3 channels' share | Relics with no partner |", "|---|---|---|---|---|---|---|---|---|");
const results = {};
for (const v of VARIANTS) {
  const ms = [];
  for (let s = 1; s <= RUNS; s++) ms.push(measure(simulate(v, s)));
  results[v.name] = ms;
  lines.push(`| ${v.name} | ${pct(avg(ms.map((m) => m.allRoles)))} | ${f1(avg(ms.map((m) => m.roles)))} | ${f1(avg(ms.map((m) => m.types)))} | ${f1(avg(ms.map((m) => m.fams)))} | ${f1(avg(ms.map((m) => m.mass)))} | ${f1(avg(ms.map((m) => m.perPick)))} | ${pct(avg(ms.map((m) => m.top3)))} | ${pct(avg(ms.map((m) => m.dead)))} |`);
}
// what each variant's builds focus on (most common top channel)
lines.push("", "Most common lead channel of a finished build:", "");
for (const v of VARIANTS) {
  const c = {};
  for (const m of results[v.name]) if (m.topCh[0]) c[m.topCh[0]] = (c[m.topCh[0]] || 0) + 1;
  lines.push(`- ${v.name}: ` + Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k} ${pct(n / RUNS)}`).join(", "));
}
// snapshot: one mid-run build (current weighting, run 1, after 12 offers); every variant ranks every option
const mid = simulate(VARIANTS[0], 1, 12);
const name = (k) => A.itemOf(k).name;
lines.push("", `## Snapshot: one mid-run build`, "", mid.map(name).join(", "), "");
const opts = [...dudes, ...pool(mid)];
for (const v of VARIANTS) {
  Object.assign(A.WEIGHT, { mode: v.mode, seen: v.seen, rare: v.rare ?? 1 }); A.ROLE.w = v.role ?? 10;
  const ranked = opts.map((k) => [k, A.overlap(A.itemOf(k), mid)]).sort((a, b) => b[1].score - a[1].score).slice(0, 8);
  lines.push(`**${v.name}** top 8: ` + ranked.map(([k, o]) => `${name(k)} ${f1(o.score)}${o.dilute ? ` (dilution ${f1(o.dilute)})` : ""}`).join(" · "), "");
}
console.log(lines.join("\n"));
