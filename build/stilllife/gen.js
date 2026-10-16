// Still Life level generator. Run: node build/stilllife/gen.js   (writes build/stilllife/levels.js)
// Makes random paintings, then plays each one thousands of times with random snaps to prove it can be
// solved, find the fewest snaps it needs (par), check the timing isn't knife-edge, and rate difficulty.
"use strict";
const S = require("./sim.js");
const fs = require("fs"), path = require("path");
const HZ = S.HZ;

function mulberry(a){ return ()=>{ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const r2 = v=>Math.round(v * 100) / 100;
const PI = Math.PI;

function makeLevel(rng){
  const rr = (a, b)=>a + rng() * (b - a), pick = arr=>arr[Math.floor(rng() * arr.length)], sgn = ()=>rng() < .5 ? -1 : 1;
  const sp = rr(48, 312);
  let pot; do { pot = rr(56, 304); } while(Math.abs(pot - sp) < 90);
  const nMv = rng() < .38 ? 2 : 1;
  const mv = [];
  const bands = nMv === 1 ? [[170, 400]] : [[150, 270], [300, 410]];
  for(let i = 0; i < nMv; i++){
    const t = pick(["spin", "rock", "rock", "slide", "slide", "swing", "orbit"]);
    const [y0, y1] = bands[i];
    const m = {t, x: rr(80, 280), y: rr(y0, y1), L: rr(72, 112)};
    if(t === "spin"){ m.a0 = rr(0, PI); m.w = sgn() * rr(1.6, 2.8); }
    if(t === "rock"){ m.a0 = rr(-.35, .35); m.A = rr(.55, 1.05); m.w = rr(1.8, 3.2); m.p = rr(0, 6.28); }
    if(t === "slide"){ m.a0 = rr(-.55, .55); m.dx = sgn() * rr(45, 110); m.dy = rr(-35, 35); m.w = rr(1.5, 2.8); m.p = rr(0, 6.28); m.x = rr(110, 250); }
    if(t === "swing"){ m.y = rr(y0 - 60, y0 + 40); m.L = rr(85, 120); m.A = rr(.75, 1.25); m.w = rr(2, 3); m.p = rr(0, 6.28); m.x = rr(90, 270); }
    if(t === "orbit"){ m.R = rr(30, 58); m.a0 = rr(-.5, .5); m.w = sgn() * rr(1.5, 2.5); m.p = rr(0, 6.28); m.x = rr(100, 260); }
    for(const k in m) if(typeof m[k] === "number") m[k] = r2(m[k]);
    mv.push(m);
  }
  const seg = (cx, cy, L, a)=>[cx - L / 2 * Math.cos(a), cy - L / 2 * Math.sin(a), cx + L / 2 * Math.cos(a), cy + L / 2 * Math.sin(a)].map(r2);
  const wl = [], th = [];
  const nW = Math.floor(rr(0, 2.6)), nT = Math.floor(rr(0, 2.7));
  for(let i = 0; i < nW; i++) wl.push(seg(rr(40, 320), rr(130, 430), rr(50, 105), rr(-.9, .9)));
  for(let i = 0; i < nT; i++){
    let cx, cy, ok = 0;
    for(let k = 0; k < 20 && !ok; k++){ cx = rr(30, 330); cy = rr(120, 450); ok = !(Math.abs(cx - sp) < 26 && cy < 170) && !(Math.abs(cx - pot) < 60 && cy > 400); }
    if(ok) th.push(seg(cx, cy, rr(40, 85), rr(-1.2, 1.2)));
  }
  return {sp: r2(sp), pot: r2(pot), mv, wl, th};
}

// Random attempt with k snaps
function sample(rng, k){
  const rel = Math.floor(rng() * 3.6 * HZ), acts = [[rel, "r"]];
  for(let i = 0; i < k; i++) acts.push([Math.floor(rng() * (rel + 2.2 * HZ)), "s"]);
  return acts;
}
const wins = (L, acts, n)=>S.play(L, acts, n).status === "won";

// How forgiving is a solution: nudge each action by up to ±0.05 s and see how often it still works
function windowOf(L, acts, n){
  let ok = 0, tot = 0;
  for(let i = 0; i < acts.length; i++) for(const d of [-12, -6, 6, 12]){
    const a = acts.map((x, j)=>j === i ? [Math.max(0, x[0] + d), x[1]] : x.slice());
    tot++; if(wins(L, a, n)) ok++;
  }
  return ok / tot;
}

function rate(L, rng, M){
  if(wins(L, [[0, "r"]], 0)) return null;                 // falls in with no help: too easy
  for(let k = 1; k <= 3; k++){
    let succ = 0, best = null, bestW = -1, tried = 0;
    for(let i = 0; i < M; i++){
      const a = sample(rng, k);
      if(wins(L, a, k)){
        succ++;
        if(tried < 6){ tried++; const w = windowOf(L, a, k); if(w > bestW){ bestW = w; best = a; } }
      }
    }
    if(succ >= 2){
      const p = succ / M;
      if(bestW < .5 || p < .004 || p > .3) return null;
      // Trim the solution to the snaps it really used (drop snaps after the drop already landed)
      const st = S.play(L, best, k);
      const used = st.log;
      const d = r2(-Math.log(p) + (k - 1) * 1.6 + (1 - bestW) * 1.5 + L.th.length * .25 + (L.mv.length - 1) * .4);
      return {par: k, p: r2(p), win: r2(bestW), d, sol: used.map(x=>x[1] + x[0]).join(".")};
    }
  }
  return null;
}

const TARGET = +(process.argv[2] || 520), M = +(process.argv[3] || 260);
const rng = mulberry(20261016);
const pool = [];
let cand = 0;
const t0 = Date.now();
while(pool.length < TARGET){
  cand++;
  const L = makeLevel(rng), r = rate(L, rng, M);
  if(!r) continue;
  Object.assign(L, r);
  pool.push(L);
  if(pool.length % 50 === 0) console.error(`${pool.length} levels from ${cand} candidates, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
pool.sort((a, b)=>a.d - b.d);

// Daily order: No. 1 = Tue Oct 13 2026. Easier early in the week, hardest on Sunday.
const WEEK = {0: .85, 1: .15, 2: .3, 3: .45, 4: .55, 5: .65, 6: .75};   // by weekday, Sunday = 0
const used = new Set(), daily = [], drng = mulberry(777);
for(let i = 0; i < 366 * 2 && i < pool.length; i++){
  const wd = (2 + i) % 7;
  let want = Math.floor((WEEK[wd] + (drng() - .5) * .2) * pool.length);
  want = Math.max(0, Math.min(pool.length - 1, want));
  let j = 0, idx = -1;
  while(idx < 0 && j < pool.length){ for(const c of [want + j, want - j]) if(c >= 0 && c < pool.length && !used.has(c)){ idx = c; break; } j++; }
  if(idx < 0) break;
  used.add(idx); daily.push(idx);
}
const out = "// Generated by gen.js. Every level here was proven solvable by simulation.\n" +
  "window.STILL_LEVELS=" + JSON.stringify(pool.map(({p, win, d, ...l})=>l)) + ";\nwindow.STILL_DAILY=" + JSON.stringify(daily) + ";\n";
fs.writeFileSync(path.join(__dirname, "levels.js"), out);
const by = k=>pool.filter(l=>l.par === k).length;
console.error(`done: ${pool.length} levels (${by(1)} par-1, ${by(2)} par-2, ${by(3)} par-3) from ${cand} candidates in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${daily.length} daily, ${(out.length / 1024).toFixed(0)} KB`);
