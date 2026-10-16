// Still Life physics. Shared by the game page and the level generator (gen.js), so it must give the
// exact same result everywhere: fixed 240 Hz steps, and only +, -, *, /, sqrt and floor (which are
// exact in every browser). Math.sin/cos can differ slightly between browsers, so there's our own sine.
(function(root){
"use strict";
const W = 360, H = 560, HZ = 240, DT = 1 / HZ;
const G = 980, R = 9, LEAF_R = 5, WALL_R = 6, THORN_R = 4.5;
const SPOUT_Y = 40, RIM_Y = 470, POT_HW = 31, POT_D = 46, FLOOR_Y = RIM_Y + POT_D + 8;
const E = 0.32, MU = 0.0035, VMAX = 1100;
const STILL_V = 10, STILL_T = 1.5 * HZ, MAX_FALL = 14 * HZ;
const PI = 3.141592653589793, TAU = 6.283185307179586, HALF = 1.5707963267948966;

function dsin(x){
  x = x - TAU * Math.floor(x / TAU + 0.5);          // to [-pi, pi]
  if(x > HALF) x = PI - x; else if(x < -HALF) x = -PI - x;   // to [-pi/2, pi/2]
  const x2 = x * x;
  return x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110 * (1 - x2 / 156))))));
}
function dcos(x){ return dsin(x + HALF); }

// A moving leaf's segment [x1, y1, x2, y2] at time t (seconds)
function moverSeg(m, t){
  let cx = m.x, cy = m.y, a = m.a0 || 0;
  switch(m.t){
    case "spin":  a = m.a0 + m.w * t; break;
    case "rock":  a = m.a0 + m.A * dsin(m.w * t + m.p); break;
    case "slide": { const s = dsin(m.w * t + m.p); cx += m.dx * s; cy += m.dy * s; break; }
    case "swing": { a = HALF + m.A * dsin(m.w * t + m.p); cx = m.x + m.L / 2 * dcos(a); cy = m.y + m.L / 2 * dsin(a); break; }
    case "orbit": { const q = m.w * t + m.p; cx += m.R * dcos(q); cy += m.R * dsin(q); break; }
  }
  const hx = m.L / 2 * dcos(a), hy = m.L / 2 * dsin(a);
  return [cx - hx, cy - hy, cx + hx, cy + hy];
}

function potSegs(px){
  const l = px - POT_HW, r = px + POT_HW, b = RIM_Y + POT_D;
  return [[l - 5, RIM_Y, l + 3, b], [r + 5, RIM_Y, r - 3, b], [l + 3, b, r - 3, b]];
}

// A fresh attempt at a level. n = snaps allowed.
function run(L, n){
  return {L, n: n == null ? L.n : n, tick: 0, rel: -1, x: L.sp, y: SPOUT_Y, vx: 0, vy: 0,
    frozen: [], snaps: 0, status: "compose", reason: "", still: 0, log: [], ev: [],
    statics: L.wl.map(s => ({s, r: WALL_R})).concat(potSegs(L.pot).map(s => ({s, r: WALL_R, pot: true})))};
}
function snap(st){
  if((st.status !== "compose" && st.status !== "fall") || st.snaps >= st.n) return false;
  const t = st.tick * DT;
  for(const m of st.L.mv) st.frozen.push({s: moverSeg(m, t), r: LEAF_R, born: st.tick});
  st.snaps++; st.log.push([st.tick, "s"]); st.ev.push({k: "snap"});
  return true;
}
function release(st){
  if(st.status !== "compose") return false;
  st.status = "fall"; st.rel = st.tick; st.log.push([st.tick, "r"]); st.ev.push({k: "drop"});
  return true;
}
function collide(st, s, rr){
  const x1 = s[0], y1 = s[1], dx = s[2] - x1, dy = s[3] - y1, l2 = dx * dx + dy * dy;
  let u = l2 > 0 ? ((st.x - x1) * dx + (st.y - y1) * dy) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const px = x1 + u * dx, py = y1 + u * dy, rad = R + rr;
  let nx = st.x - px, ny = st.y - py;
  const d2 = nx * nx + ny * ny;
  if(d2 >= rad * rad) return 0;
  const d = Math.sqrt(d2);
  if(d < 1e-6){ nx = 0; ny = -1; } else { nx /= d; ny /= d; }
  st.x = px + nx * rad; st.y = py + ny * rad;
  const vn = st.vx * nx + st.vy * ny;
  if(vn < 0){
    st.vx -= (1 + E) * vn * nx; st.vy -= (1 + E) * vn * ny;
    const tx = -ny, ty = nx, vt = st.vx * tx + st.vy * ty, f = vt * MU;
    st.vx -= f * tx; st.vy -= f * ty;
    return -vn;
  }
  return 0.001;
}
function near(st, s, rr){
  const x1 = s[0], y1 = s[1], dx = s[2] - x1, dy = s[3] - y1, l2 = dx * dx + dy * dy;
  let u = l2 > 0 ? ((st.x - x1) * dx + (st.y - y1) * dy) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const nx = st.x - (x1 + u * dx), ny = st.y - (y1 + u * dy), rad = R + rr;
  return nx * nx + ny * ny < rad * rad;
}
function end(st, status, reason){ st.status = status; st.reason = reason; st.ev.push({k: status, reason}); }

function step(st){
  st.tick++;
  if(st.status !== "fall") return;
  st.vy += G * DT;
  const sp2 = st.vx * st.vx + st.vy * st.vy;
  if(sp2 > VMAX * VMAX){ const k = VMAX / Math.sqrt(sp2); st.vx *= k; st.vy *= k; }
  st.x += st.vx * DT; st.y += st.vy * DT;
  let hit = 0;
  for(const o of st.statics){ const h = collide(st, o.s, o.r); if(h > hit) hit = h; }
  for(const o of st.frozen){ const h = collide(st, o.s, o.r); if(h > hit) hit = h; }
  if(st.x < R){ st.x = R; if(st.vx < 0){ hit = Math.max(hit, -st.vx); st.vx = -st.vx * E; } }
  if(st.x > W - R){ st.x = W - R; if(st.vx > 0){ hit = Math.max(hit, st.vx); st.vx = -st.vx * E; } }
  if(hit > 70) st.ev.push({k: "bounce", v: hit});
  for(const s of st.L.th) if(near(st, s, THORN_R)) return end(st, "lost", "thorn");
  const px = st.L.pot;
  if(st.x > px - POT_HW + 2 && st.x < px + POT_HW - 2 && st.y > RIM_Y + 10) return end(st, "won", "");
  if(st.y + R >= FLOOR_Y) return end(st, "lost", "splash");
  const v2 = st.vx * st.vx + st.vy * st.vy;
  st.still = v2 < STILL_V * STILL_V ? st.still + 1 : 0;
  if(st.still > STILL_T) return end(st, "lost", "stuck");
  if(st.tick - st.rel > MAX_FALL) return end(st, "lost", "stuck");
}

// Play a list of actions [[tick, "s"|"r"], ...] to the end. Returns the final state.
function play(L, actions, n, limit){
  const st = run(L, n);
  const acts = actions.slice().sort((a, b)=>a[0] - b[0] || (a[1] === "s" ? -1 : 1));
  let i = 0;
  const cap = limit || 60 * HZ;
  for(;;){
    while(i < acts.length && acts[i][0] === st.tick){ if(acts[i][1] === "s") snap(st); else release(st); i++; }
    if(st.status === "won" || st.status === "lost") break;
    if(st.status === "compose" && i >= acts.length) break;
    if(st.tick > cap) break;
    st.ev.length = 0;
    step(st);
  }
  return st;
}

const api = {W, H, HZ, DT, R, LEAF_R, WALL_R, THORN_R, SPOUT_Y, RIM_Y, POT_HW, POT_D, FLOOR_Y,
  dsin, dcos, moverSeg, potSegs, run, snap, release, step, play};
if(typeof module !== "undefined" && module.exports) module.exports = api; else root.StillSim = api;
})(typeof window !== "undefined" ? window : this);
