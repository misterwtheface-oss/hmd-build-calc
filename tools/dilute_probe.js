/*
  dilute_probe.js — how a Dude offer's score splits up (own fit, new Families, role fill, pool dilution), old dilution
  vs WEIGHT.famNet, on the same offers. Simulated runs follow the game's order (rounds_structure: Flyers on rounds 1, 3,
  6, 9, 17, free relics on 2, 8, 11, 13, 18): 5 Dude types, relic offers between; 3 options each, from the real pool;
  the build takes the top option of the mode under test (old, or famNet).
  Per Dude pick: median own fit, new Family score, dilution, total; offers below 0; offers whose three all score <= 0;
  picks that bring a new Family; and, on the same offer, how often the two modes pick a different Dude.
  Usage: [FAMK=<live>] node tools/dilute_probe.js [runs=200] [old|famNet]   (the mode the simulated build follows; default old)
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
vm.runInContext(app + "\n;globalThis.__app = { H, WEIGHT, overlap, itemOf, relicsOfDude, relicsOfFamilyPool, relicsOfSource, buildFams };", ctx);
const A = ctx.__app;

const RUNS = +process.argv[2] || 200, FOLLOW = process.argv[3] === "famNet";
const ORDER = "R D D R D R R D R".split(" ");   // rounds 2-18 (the round 1 Flyer is the first Dude): Flyer / free relic
const rng = (seed) => () => ((seed = (seed + 0x6d2b79f5) | 0), (((seed ^ (seed >>> 15)) * (1 | seed)) >>> 0) / 4294967296);
const dudes = A.H.dudes.filter((d) => d.name && !d.sum).map((d) => "dude:" + d.t);
const pick = (r, arr, n) => { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; };
function pool(build) {
  const team = [...new Set(build.filter((k) => k.startsWith("dude:")))].map(A.itemOf);
  const rs = [...A.relicsOfSource("universal"), ...A.buildFams(team).flatMap(A.relicsOfFamilyPool), ...team.flatMap((d) => A.relicsOfDude(d.t))];
  return rs.map((r) => "relic:" + r.id).filter((k) => !build.includes(k));
}
const FAMK = +process.env.FAMK || A.WEIGHT.famK;   // WEIGHT.famK for the famNet mode (default: live)
const score = (k, build, net) => { A.WEIGHT.famNet = net; A.WEIGHT.famK = FAMK; return A.overlap(A.itemOf(k), build); };
const top = (sc) => sc.reduce((a, b) => (b[1].score > a[1].score ? b : a));
const blank = () => ({ own: [], fam: [], dil: [], tot: [], neg: 0, allNeg: 0, offers: 0, newFam: 0, diff: 0 });
const S = { old: {}, famNet: {} };
const famSc = [];   // famNet: [new Family score, its gross gain (old newFams)] per offered Dude bringing one
for (let seed = 1; seed <= RUNS; seed++) {
  const r = rng(seed), build = [pick(r, dudes, 1)[0]];
  for (const step of ORDER) {
    const types = new Set(build.filter((k) => k.startsWith("dude:")));
    if (step === "R") { const opts = pick(r, pool(build), 3); if (opts.length) build.push(top(opts.map((k) => [k, score(k, build, FOLLOW)]))[0]); continue; }
    const opts = pick(r, dudes.filter((k) => !types.has(k)), 3), n = types.size + 1;
    const picks = {};
    for (const mode of ["old", "famNet"]) {
      const sc = opts.map((k) => [k, score(k, build, mode === "famNet")]), s = (S[mode][n] ||= blank());
      for (const [, o] of sc) {
        s.own.push(o.own); s.fam.push(o.newFams.reduce((a, f) => a + f.score, 0)); s.dil.push(o.dilute); s.tot.push(o.score);
        if (o.score < 0) s.neg++;
        if (mode === "famNet" && o.newFams.length) famSc.push(o.newFams.reduce((a, f) => a + f.score, 0));
      }
      s.offers++;
      if (sc.every(([, o]) => o.score <= 0)) s.allNeg++;
      const t = top(sc);
      picks[mode] = t[0];
      if (t[1].newFams.length) s.newFam++;
    }
    if (picks.old !== picks.famNet) S.famNet[n].diff++;
    build.push(picks[FOLLOW ? "famNet" : "old"]);
  }
}
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const f = (v) => v.toFixed(1).padStart(7), pc = (a, b) => (String(Math.round((100 * a) / b)) + "%").padStart(6);
console.log(`${RUNS} runs, builds follow ${FOLLOW ? "famNet" : "old"}; medians per offered Dude`);
for (const mode of ["old", "famNet"]) {
  console.log(`\n${mode}\nDude#  own     newFam  dilute  total   |  <0   all3<=0  pick new Fam${mode === "famNet" ? "  differs" : ""}`);
  for (const [n, s] of Object.entries(S[mode]))
    console.log(`${n.padEnd(6)}${f(med(s.own))} ${f(med(s.fam))} ${f(med(s.dil))} ${f(med(s.tot))}   |${pc(s.neg, s.tot.length)}${pc(s.allNeg, s.offers)}   ${pc(s.newFam, s.offers)}${mode === "famNet" ? "      " + pc(s.diff, s.offers) : ""}`);
}
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))] || 0; };
console.log(`\nfamNet new-Family score over ${famSc.length} offers: p10 ${q(famSc, 0.1).toFixed(1)}, p25 ${q(famSc, 0.25).toFixed(1)}, median ${q(famSc, 0.5).toFixed(1)}, p75 ${q(famSc, 0.75).toFixed(1)}, p90 ${q(famSc, 0.9).toFixed(1)}; >= 0: ${pc(famSc.filter((v) => v >= 0).length, famSc.length).trim()}`);
