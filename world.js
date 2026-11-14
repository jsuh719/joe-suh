/* ==========================================================================
   world.js — the painted world you drive through.

   A pseudo-3D road renderer on a 2D canvas: the ground is drawn back to front
   in thin slices, and every tree, fern and dinosaur is a flat sprite stood up
   at its own depth. Painting far-to-near gives correct overlap for free, and
   veils of fog laid down between depth bands give the air its thickness.

   The art is drawn here in code, in the same flat outlined style as the
   dinosaurs, so nothing needs to be downloaded except the dinosaurs.

   Exposes window.World. Knows nothing about the resume.
   ========================================================================== */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, a) {
    var s = (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0);
    return a == null ? 'rgb(' + s + ')' : 'rgba(' + s + ',' + a + ')';
  }

  /* ── time of day: misty jungle → golden edge of the forest → beach sunset ── */
  var PAL = [
    { // jungle
      skyTop: '#0f4146', skyMid: '#4f9c86', skyLow: '#d9efc6', sun: '#fffbe3', glow: '#f3f8cf', cloud: '#e8f4df',
      ridgeFar: '#93c7ab', ridgeMid: '#5f9e7f', ridgeNear: '#2e6e50', fog: '#b4dbc0',
      grassA: '#3d7f44', grassB: '#37773f', dirtA: '#9c7751', dirtB: '#936f4a', rut: '#76563a',
      sandA: '#e9d09a', sandB: '#e2c68d', waterA: '#2f9fb7', waterB: '#2a93ab', scrim: '#06231a'
    },
    { // golden
      skyTop: '#1b5877', skyMid: '#83c3b0', skyLow: '#ffe5a3', sun: '#fff4c8', glow: '#ffe7a0', cloud: '#fff1d4',
      ridgeFar: '#bfd2a7', ridgeMid: '#7da985', ridgeNear: '#3f7b5a', fog: '#ece3b1',
      grassA: '#689a44', grassB: '#61923f', dirtA: '#b88c5a', dirtB: '#ad8352', rut: '#8b6742',
      sandA: '#f1d59c', sandB: '#e9ca8f', waterA: '#36aac1', waterB: '#2f9db5', scrim: '#14321f'
    },
    { // sunset
      skyTop: '#2b2a72', skyMid: '#e0707e', skyLow: '#ffc678', sun: '#fff4cc', glow: '#ffb468', cloud: '#ffcaa4',
      ridgeFar: '#e08e8a', ridgeMid: '#a65f7e', ridgeNear: '#5f4574', fog: '#f8b48e',
      grassA: '#97a547', grassB: '#8e9c43', dirtA: '#d49c63', dirtB: '#c9915a', rut: '#a06d45',
      sandA: '#f3c690', sandB: '#ebbb86', waterA: '#4471a3', waterB: '#3c6597', scrim: '#2a1838'
    }
  ].map(function (p) { var o = {}; for (var k in p) o[k] = hex(p[k]); return o; });

  function palette(t) {
    var a, b, u;
    if (t < 0.5) { a = PAL[0]; b = PAL[1]; u = t / 0.5; } else { a = PAL[1]; b = PAL[2]; u = (t - 0.5) / 0.5; }
    var o = {};
    for (var k in a) o[k] = mix(a[k], b[k], sstep(u));
    return o;
  }

  /* ======================================================================
     SPRITES — flat, outlined, cel-shaded, to match the dinosaurs
     ====================================================================== */
  var OL = '#163626';

  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* Fills the union of a set of ellipses [x, y, rx, ry?] grown by `grow`. */
  function blobPath(g, cs, grow, dx, dy, k) {
    g.beginPath();
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i], rx = c[2] * (k || 1) + grow, ry = (c[3] || c[2]) * (k || 1) + grow;
      var x = c[0] + (dx || 0) * c[2], y = c[1] + (dy || 0) * (c[3] || c[2]);
      g.moveTo(x + rx, y);
      g.ellipse(x, y, rx, ry, 0, 0, TAU);
    }
  }

  /* A cel-shaded clump: outline, shadow, body, highlight. */
  function clump(g, cs, cols, lw) {
    g.fillStyle = OL; blobPath(g, cs, lw); g.fill();
    g.fillStyle = cols[0]; blobPath(g, cs, 0); g.fill();
    g.save();
    blobPath(g, cs, 0); g.clip();
    g.fillStyle = cols[1]; blobPath(g, cs, 0, -0.12, -0.2, 0.9); g.fill();
    g.fillStyle = cols[2]; blobPath(g, cs, 0, -0.3, -0.44, 0.42); g.fill();
    g.restore();
  }

  /* A tapered leaf along a quadratic spine — palm fronds, ferns, big leaves. */
  function frond(g, x, y, ang, len, wid, cols, cuts, droop) {
    var cx = Math.cos(ang), sy = Math.sin(ang);
    var tx = x + cx * len, ty = y + sy * len + (droop == null ? len * 0.38 * Math.abs(cx) : droop);
    var qx = x + cx * len * 0.55, qy = y + sy * len * 0.55 - len * 0.22;
    var N = 20, L = [], Rr = [], P = [];
    for (var i = 0; i <= N; i++) {
      var t = i / N, it = 1 - t;
      var px = it * it * x + 2 * it * t * qx + t * t * tx;
      var py = it * it * y + 2 * it * t * qy + t * t * ty;
      var dx = 2 * it * (qx - x) + 2 * t * (tx - qx), dy = 2 * it * (qy - y) + 2 * t * (ty - qy);
      var dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
      var w = wid * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04)), 0.75) * (1 - t * 0.25);
      L.push([px + nx * w, py + ny * w]); Rr.push([px - nx * w, py - ny * w]); P.push([px, py, nx, ny, w]);
    }
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for (i = 1; i <= N; i++) g.lineTo(L[i][0], L[i][1]);
    for (i = N; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]);
    g.closePath();
    g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = OL; g.stroke();
    g.fillStyle = cols[0]; g.fill();
    // lit half
    g.beginPath(); g.moveTo(P[0][0], P[0][1]);
    for (i = 1; i <= N; i++) g.lineTo(L[i][0], L[i][1]);
    for (i = N; i >= 0; i--) g.lineTo(P[i][0], P[i][1]);
    g.fillStyle = cols[1]; g.fill();
    // midrib
    g.beginPath(); g.moveTo(P[0][0], P[0][1]);
    for (i = 1; i <= N; i++) g.lineTo(P[i][0], P[i][1]);
    g.lineWidth = 3; g.strokeStyle = cols[2]; g.stroke();
    // notches between leaflets
    if (cuts) {
      g.lineWidth = 3; g.strokeStyle = OL; g.lineCap = 'round';
      for (var k = 1; k <= cuts; k++) {
        var q = P[Math.round(k / (cuts + 1) * N)];
        g.beginPath();
        g.moveTo(q[0] + q[2] * q[4] * 0.35, q[1] + q[3] * q[4] * 0.35); g.lineTo(q[0] + q[2] * q[4] * 1.08, q[1] + q[3] * q[4] * 1.08);
        g.moveTo(q[0] - q[2] * q[4] * 0.35, q[1] - q[3] * q[4] * 0.35); g.lineTo(q[0] - q[2] * q[4] * 1.08, q[1] - q[3] * q[4] * 1.08);
        g.stroke();
      }
    }
  }

  var LEAF = [
    ['#2c6d3b', '#3f8f48', '#72c463'],
    ['#2e7136', '#4b9b40', '#8ad35d'],
    ['#226a4e', '#2f8a64', '#5ebf8f'],
    ['#2a5f37', '#3a7e44', '#63ad5a']
  ];

  function sprite(c, ax, ay) { return { c: c, w: c.width, h: c.height, ax: ax == null ? 0.5 : ax, ay: ay == null ? 0.985 : ay }; }

  function flipped(s) {
    var c = cv(s.w, s.h), g = c.getContext('2d');
    g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.c, 0, 0);
    return sprite(c, 1 - s.ax, s.ay);
  }

  function makeTree(r) {
    var w = 540, h = 660, c = cv(w, h), g = c.getContext('2d');
    var cx = w / 2, cy = 230, lean = (r() - 0.5) * 50, cols = LEAF[(r() * 3) | 0];
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(cx - 30, h - 6);
    g.quadraticCurveTo(cx - 16 + lean * 0.4, (h + cy) / 2, cx - 13 + lean, cy + 40);
    g.lineTo(cx + 13 + lean, cy + 40);
    g.quadraticCurveTo(cx + 18 + lean * 0.4, (h + cy) / 2, cx + 32, h - 6);
    g.closePath();
    g.fillStyle = '#7a5434'; g.fill(); g.lineWidth = 8; g.strokeStyle = OL; g.stroke();
    g.beginPath(); g.moveTo(cx + 6, h - 10); g.quadraticCurveTo(cx + 10 + lean * 0.4, (h + cy) / 2, cx + 6 + lean, cy + 60);
    g.lineWidth = 6; g.strokeStyle = '#9a6e45'; g.stroke();
    var cs = [[cx + lean, cy, 112, 96]];
    var n = 7 + ((r() * 3) | 0);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI * 1.05 + (i / (n - 1)) * Math.PI * 1.1 + (r() - 0.5) * 0.3;
      var d = 92 + r() * 36, rr = 56 + r() * 30;
      cs.push([cx + lean + Math.cos(a) * d * 1.18, cy + Math.sin(a) * d * 0.72 + 34, rr, rr * 0.86]);
    }
    clump(g, cs, cols, 8);
    return sprite(c);
  }

  function makePalm(r) {
    var w = 640, h = 780, c = cv(w, h), g = c.getContext('2d');
    var bx = w / 2 + (r() - 0.5) * 40, by = h - 6;
    var lean = (r() < 0.5 ? -1 : 1) * (50 + r() * 70);
    var tx = w / 2 + lean, ty = 230, qx = w / 2 + lean * 0.08, qy = 500;
    g.lineCap = 'round';
    function trunk(col, lw) { g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(qx, qy, tx, ty); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); }
    trunk(OL, 46); trunk('#a97c4b', 34);
    g.lineWidth = 4; g.strokeStyle = '#7d5a35';
    for (var t = 0.06; t < 0.96; t += 0.075) {
      var it = 1 - t;
      var px = it * it * bx + 2 * it * t * qx + t * t * tx, py = it * it * by + 2 * it * t * qy + t * t * ty;
      g.beginPath(); g.moveTo(px - 15, py); g.quadraticCurveTo(px, py + 8, px + 15, py); g.stroke();
    }
    var cols = ['#2f7a3c', '#4ea24f', '#245f30'];
    var n = 8;
    for (var i = 0; i < n; i++) {
      var ang = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * 4.6 + (r() - 0.5) * 0.2;
      frond(g, tx, ty, ang, 190 + r() * 70, 34, cols, 6);
    }
    g.fillStyle = '#6b4526'; g.strokeStyle = OL; g.lineWidth = 5;
    [[-14, 16], [12, 20], [0, 30]].forEach(function (o) {
      g.beginPath(); g.arc(tx + o[0], ty + o[1], 14, 0, TAU); g.fill(); g.stroke();
    });
    return sprite(c);
  }

  function makeFern(r, light) {
    var w = 420, h = 300, c = cv(w, h), g = c.getContext('2d');
    var cols = light ? ['#3f9448', '#6cc25f', '#2c6b37'] : ['#2f7a44', '#4fa357', '#245d34'];
    var n = 9;
    for (var i = 0; i < n; i++) {
      var ang = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * 2.9 + (r() - 0.5) * 0.15;
      frond(g, w / 2, h - 12, ang, 130 + r() * 50, 22, cols, 8, null);
    }
    return sprite(c);
  }

  function makeBush(r, flowers) {
    var w = 380, h = 230, c = cv(w, h), g = c.getContext('2d');
    var cs = [], n = 6;
    for (var i = 0; i < n; i++) {
      var rr = 46 + r() * 30;
      cs.push([60 + (i / (n - 1)) * (w - 120) + (r() - 0.5) * 20, h - rr * 0.8 - 8 - Math.sin(i / (n - 1) * Math.PI) * 40, rr, rr * 0.9]);
    }
    clump(g, cs, LEAF[(r() * 4) | 0], 7);
    if (flowers) {
      var fc = flowers === 1 ? ['#ff7aa8', '#ffd1e0'] : ['#ffd35c', '#fff3c4'];
      for (i = 0; i < 9; i++) {
        var fx = 60 + r() * (w - 120), fy = 50 + r() * (h - 110);
        g.fillStyle = OL; g.beginPath(); g.arc(fx, fy, 13, 0, TAU); g.fill();
        g.fillStyle = fc[0]; g.beginPath(); g.arc(fx, fy, 9.5, 0, TAU); g.fill();
        g.fillStyle = fc[1]; g.beginPath(); g.arc(fx - 2, fy - 2, 3.5, 0, TAU); g.fill();
      }
    }
    return sprite(c);
  }

  function makeAraucaria(r) {
    var w = 520, h = 980, c = cv(w, h), g = c.getContext('2d');
    var cx = w / 2;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, h - 6); g.quadraticCurveTo(cx + (r() - 0.5) * 30, h * 0.5, cx, 160);
    g.strokeStyle = OL; g.lineWidth = 30; g.stroke(); g.strokeStyle = '#6c4a2e'; g.lineWidth = 20; g.stroke();
    var tiers = [[150, 220], [240, 190], [325, 140], [400, 86]];
    for (var k = tiers.length - 1; k >= 0; k--) {
      var ty = tiers[k][0], tw = tiers[k][1];
      g.strokeStyle = OL; g.lineWidth = 9;
      g.beginPath(); g.moveTo(cx, ty + 30); g.lineTo(cx - tw * 0.8, ty + 10); g.moveTo(cx, ty + 30); g.lineTo(cx + tw * 0.8, ty + 10); g.stroke();
      var cs = [];
      for (var i = 0; i < 6; i++) cs.push([cx - tw + (i / 5) * tw * 2, ty + Math.abs(i - 2.5) * 5, 44 + r() * 14, 26 + r() * 6]);
      clump(g, cs, ['#1f5a3a', '#2d7449', '#4f9d63'], 7);
    }
    return sprite(c);
  }

  function makeTuft(r, beach) {
    var w = 160, h = 100, c = cv(w, h), g = c.getContext('2d');
    var col = beach ? ['#b6b061', '#d8cf7d'] : ['#4c9a49', '#7cc865'];
    g.lineJoin = 'round';
    for (var i = 0; i < 8; i++) {
      var x = 30 + (i / 7) * 100 + (r() - 0.5) * 10, lean = (r() - 0.5) * 50, hh = 50 + r() * 42;
      g.beginPath(); g.moveTo(x - 8, h - 4); g.quadraticCurveTo(x + lean * 0.3, h - hh * 0.6, x + lean, h - hh); g.quadraticCurveTo(x + lean * 0.2, h - hh * 0.5, x + 8, h - 4); g.closePath();
      g.fillStyle = col[i % 2]; g.fill(); g.strokeStyle = OL; g.lineWidth = 3.5; g.stroke();
    }
    return sprite(c);
  }

  function makeRock(r) {
    var w = 240, h = 150, c = cv(w, h), g = c.getContext('2d');
    var pts = [], n = 11;
    for (var i = 0; i < n; i++) {
      var a = Math.PI + (i / (n - 1)) * Math.PI;
      var rr = 1 + (r() - 0.5) * 0.25;
      pts.push([w / 2 + Math.cos(a) * 100 * rr, h - 8 + Math.sin(a) * 120 * rr * 0.95]);
    }
    g.beginPath(); g.moveTo(pts[0][0], h - 6);
    pts.forEach(function (p) { g.lineTo(p[0], Math.min(p[1], h - 6)); });
    g.closePath();
    g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = OL; g.stroke();
    g.fillStyle = '#7f8e85'; g.fill();
    g.save(); g.clip();
    g.fillStyle = '#9fae9f'; g.beginPath(); g.ellipse(w / 2 - 26, h * 0.42, 62, 34, -0.3, 0, TAU); g.fill();
    g.fillStyle = '#5b9a52'; g.beginPath(); g.ellipse(w / 2 + 10, 20, 90, 22, 0, 0, TAU); g.fill();
    g.restore();
    return sprite(c);
  }

  function makeShell(r, star) {
    var w = 120, h = 80, c = cv(w, h), g = c.getContext('2d');
    g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = OL;
    if (star) {
      var cx = 60, cy = 46, R1 = 34, R0 = 13, rot = r() * TAU;
      g.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = rot + i * Math.PI / 5, rr = i % 2 ? R0 : R1;
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.62);
      }
      g.closePath(); g.fillStyle = r() < 0.5 ? '#ff8a5c' : '#ffb347'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (i = 0; i < 5; i++) { a = rot + i * Math.PI * 0.4; g.beginPath(); g.arc(cx + Math.cos(a) * 16, cy + Math.sin(a) * 10, 2.5, 0, TAU); g.fill(); }
    } else {
      g.beginPath(); g.moveTo(30, 70); g.quadraticCurveTo(60, -4, 90, 70); g.closePath();
      g.fillStyle = r() < 0.5 ? '#ffe2d0' : '#f9c6d3'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(60, 66); g.lineTo(60, 26); g.moveTo(48, 66); g.lineTo(54, 30); g.moveTo(72, 66); g.lineTo(66, 30);
      g.lineWidth = 2.5; g.stroke();
    }
    return sprite(c);
  }

  function variants(make, n, seed, a, b) {
    var r = rng(seed), out = [];
    for (var i = 0; i < n; i++) { var s = make(r, a, b); out.push(s, flipped(s)); }
    return out;
  }

  var S = null;
  function buildSprites() {
    S = {
      tree: variants(makeTree, 4, 11),
      palm: variants(makePalm, 4, 23),
      fern: variants(makeFern, 2, 31).concat(variants(makeFern, 2, 37, true)),
      bush: variants(makeBush, 2, 41),
      flower: variants(makeBush, 1, 43, 1).concat(variants(makeBush, 1, 47, 2)),
      arau: variants(makeAraucaria, 2, 53),
      tuft: variants(makeTuft, 3, 61),
      btuft: variants(makeTuft, 2, 67, true),
      rock: variants(makeRock, 2, 71),
      shell: variants(makeShell, 2, 73).concat(variants(makeShell, 3, 79, true))
    };
  }

  /* ======================================================================
     THE ROAD
     ====================================================================== */
  var cfg = { zEnd: 1000, density: 1 };
  var objs = [];
  var DRAW = 230, CH = 1.5, SEG = 2.5, RW = 2.4;

  function amp(z) { return sstep((z + 10) / 90) * (1 - sstep((z - (cfg.zEnd - 300)) / 200)); }
  function roadX(z) { return amp(z) * (13 * Math.sin(z / 97) + 5 * Math.sin(z / 41 + 1.3)); }
  function slope(z) { return (roadX(z + 0.5) - roadX(z - 0.5)); }
  function sandAt(z) { return sstep((z - (cfg.zEnd - 170)) / 90); }
  function palmAt(z) { return sstep((z - (cfg.zEnd - 330)) / 160); }
  function roadW(z) { return RW * (1 - sstep((z - (cfg.zEnd - 45)) / 32)); }

  function pick(r, list) { return list[(r() * list.length) | 0]; }

  function populate() {
    var r = rng(1234), out = [], zEnd = cfg.zEnd, d = cfg.density;
    function add(z, x, kind, h) { out.push({ z: z, x: x, sp: pick(r, S[kind]), h: h }); }
    [-1, 1].forEach(function (side) {
      var z;
      // roadside cover: grass, small ferns, flowers — dense, sells speed
      for (z = 3; z < zEnd + 4; z += (0.9 + r() * 1.3) / d) {
        var b = palmAt(z), sd = sandAt(z), q = r(), x = side * (RW + 0.5 + r() * 1.8);
        if (z > zEnd - 6) continue;
        if (sd > 0.5) { if (q < 0.3) add(z, x, 'btuft', 0.7 + r() * 0.4); else if (q < 0.36) add(z, x, 'rock', 0.6 + r() * 0.5); else if (q < 0.6) add(z, side * (0.4 + r() * 6), 'shell', 0.3 + r() * 0.15); }
        else if (q < 0.5) add(z, x, 'tuft', 0.6 + r() * 0.35);
        else if (q < 0.68) add(z, x, 'fern', 1.4 + r() * 0.8);
        else if (q < 0.82 - b * 0.3) add(z, x, 'flower', 0.9 + r() * 0.5);
        else if (q < 0.9) add(z, x, 'bush', 0.9 + r() * 0.6);
      }
      // the first row of the forest
      for (z = 6; z < zEnd - 8; z += (2.6 + r() * 3.4) / d) {
        b = palmAt(z); sd = sandAt(z); q = r(); x = side * (4.8 + r() * 4.5);
        if (sd > 0.6) { if (q < 0.55) add(z, side * (6 + r() * 8), 'palm', 10 + r() * 4); else if (q < 0.7) add(z, x, 'rock', 0.9 + r() * 0.8); continue; }
        if (q < b * 0.75) add(z, x, 'palm', 10 + r() * 4);
        else if (q < 0.42) add(z, x, 'tree', 9 + r() * 4);
        else if (q < 0.62) add(z, x, 'fern', 3.4 + r() * 1.6);
        else if (q < 0.8) add(z, x, r() < 0.4 ? 'flower' : 'bush', 1.8 + r() * 0.9);
        else if (q < 0.88) add(z, x, 'arau', 15 + r() * 6);
        else add(z, x, 'rock', 1 + r() * 0.8);
      }
      // the wall of the jungle behind
      for (z = 4; z < zEnd + 30; z += (1.7 + r() * 2.2) / d) {
        b = palmAt(z); sd = sandAt(z); q = r(); x = side * (10 + r() * 18);
        if (z > zEnd - 20 && Math.abs(x) < 18) continue;
        if (sd > 0.7) { if (q < 0.4) add(z, side * (12 + r() * 20), 'palm', 11 + r() * 4); continue; }
        if (q < b * 0.8) add(z, x, 'palm', 11 + r() * 4);
        else if (q < 0.62) add(z, x, 'tree', 10 + r() * 5);
        else if (q < 0.84) add(z, x, 'arau', 16 + r() * 7);
        else add(z, x, 'fern', 4 + r() * 2);
      }
    });
    out.sort(function (a, b) { return a.z - b.z; });
    objs = out;
  }

  /* ======================================================================
     CANVAS + CAMERA
     ====================================================================== */
  var cvs, g, fxc, fg, W = 1, H = 1, DPR = 1, F = 1, HZ = 1;
  var cam = { z: 0, x: 0, sl: 0 };
  var canopy = null;

  function proj(z, x, y) {
    var dz = z - cam.z; if (dz < 0.05) dz = 0.05;
    var s = F / dz;
    var lx = roadX(z) + x - cam.x - cam.sl * (z - cam.z);
    return [W / 2 + lx * s, HZ + (CH - (y || 0)) * s, s];
  }

  function buildCanopy() {
    var cw = Math.ceil(W * 1.3), ch = Math.ceil(H * 0.38);
    var c = cv(Math.ceil(cw * DPR), Math.ceil(ch * DPR)), q = c.getContext('2d');
    q.scale(DPR, DPR);
    var r = rng(99), cs = [];
    for (var x = -40; x < cw + 60; x += 34 + r() * 46) cs.push([x, -10 + r() * 40, 46 + r() * 50, 34 + r() * 30]);
    // hanging vines
    q.lineCap = 'round';
    for (var i = 0; i < 16; i++) {
      var vx = r() * cw, vl = ch * (0.35 + r() * 0.6);
      q.strokeStyle = '#0c2a1b'; q.lineWidth = 4;
      q.beginPath(); q.moveTo(vx, 0); q.bezierCurveTo(vx + 20, vl * 0.4, vx - 20, vl * 0.7, vx + 6, vl); q.stroke();
      for (var t = 0.25; t < 1; t += 0.16) {
        var lx = vx + Math.sin(t * 9) * 8, ly = vl * t;
        frond(q, lx, ly, Math.PI / 2 + (r() - 0.5) * 1.6, 16 + r() * 10, 6, ['#0f3322', '#185038', '#0b2418'], 0, 4);
      }
    }
    // dangling leaves
    for (i = 0; i < 26; i++) {
      frond(q, r() * cw, 10 + r() * 40, Math.PI / 2 + (r() - 0.5) * 1.4, 50 + r() * 90, 16 + r() * 10, ['#0e3121', '#17503a', '#0a2016'], 4, 10);
    }
    clump(q, cs, ['#0b2618', '#123a26', '#1d5638'], 5);
    canopy = { c: c, w: cw, h: ch };
  }

  function glowSprite() {
    var c = cv(64, 64), q = c.getContext('2d');
    var gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
    return c;
  }
  var GLOW = null;

  /* ── background: sky, sun, clouds, ridges, volcano ── */
  function ridgeH(kind, u) {
    u = u - Math.floor(u);
    var p = u * TAU;
    if (kind === 0) {
      var v = 0.5 + 0.22 * Math.sin(p * 3 + 1) + 0.14 * Math.sin(p * 7 + 2) + 0.07 * Math.sin(p * 13);
      var dv = Math.abs(u - 0.3) / 0.075;
      if (dv < 1) v += 1.15 * Math.pow(1 - dv, 1.25);
      return Math.min(v, 1.62);
    }
    if (kind === 1) return 0.55 + 0.22 * Math.sin(p * 5 + 0.4) + 0.12 * Math.sin(p * 11 + 1.7) + 0.06 * Math.sin(p * 23);
    return 0.62 + 0.3 * Math.abs(Math.sin(p * 31)) + 0.18 * Math.abs(Math.sin(p * 53 + 1)) + 0.1 * Math.sin(p * 7);
  }

  function drawRidge(kind, off, span, hgt, col, alpha) {
    if (alpha <= 0.01) return;
    g.globalAlpha = alpha; g.fillStyle = rgb(col);
    g.beginPath(); g.moveTo(0, HZ + 2);
    for (var x = 0; x <= W + 6; x += 6) g.lineTo(x, HZ - ridgeH(kind, off + (x / W) * span) * hgt);
    g.lineTo(W, HZ + 2); g.closePath(); g.fill();
    g.globalAlpha = 1;
  }

  var CLOUDS = [[0.05, 0.22, 1.1, 1], [0.33, 0.12, 0.8, 0.6], [0.58, 0.3, 1.3, 1.4], [0.82, 0.18, 0.9, 0.8], [1.08, 0.26, 1, 1.1], [1.25, 0.1, 0.7, 0.5]];
  function drawCloud(x, y, s, col, a) {
    g.fillStyle = rgb(col, a);
    g.beginPath();
    var k = [[0, 0, 46], [42, -14, 38], [82, 2, 34], [-38, 6, 30], [118, 10, 22]];
    for (var i = 0; i < k.length; i++) { g.moveTo(x + k[i][0] * s + k[i][2] * s, y + k[i][1] * s); g.arc(x + k[i][0] * s, y + k[i][1] * s, k[i][2] * s, 0, TAU); }
    g.fill();
    if (g.roundRect) { g.beginPath(); g.roundRect(x - 52 * s, y + 4 * s, 186 * s, 28 * s, 14 * s); g.fill(); }
  }

  /* ======================================================================
     RENDER
     ====================================================================== */
  var hits = [];

  function drawSprite(o) {
    var p = proj(o.z, o.x, 0), s = p[2], hp = o.h * s;
    if (hp < 1.5) return;
    var sp = o.sp, wp = hp * sp.w / sp.h, x0 = p[0] - wp * sp.ax;
    if (x0 > W || x0 + wp < 0) return;
    var y0 = p[1] - hp * sp.ay;
    if (y0 > H) return;
    g.drawImage(sp.c, x0, y0, wp, hp);
  }

  function drawDino(d) {
    var base = proj(d.z, d.x, 0), s = base[2];
    var hp = d.h * s;
    if (hp < 2 || !d.img || !d.img.complete) return;
    // shadow on the ground
    g.fillStyle = 'rgba(8,24,16,' + (d.fly ? 0.16 : 0.32) + ')';
    g.beginPath(); g.ellipse(base[0], base[1], hp * (d.fly ? 0.25 : 0.36), hp * 0.07, 0, 0, TAU); g.fill();
    var p = proj(d.z, d.x, d.y);
    g.save();
    g.translate(p[0], p[1]);
    g.rotate(d.rot || 0);
    g.scale(d.flip ? -1 : 1, 1);
    g.scale(1 + (d.squash || 0), 1 - (d.squash || 0));
    g.drawImage(d.img, -hp / 2, -hp * 0.97, hp, hp);
    g.restore();
    hits.push({ k: d.k, x0: p[0] - hp * 0.4, x1: p[0] + hp * 0.4, y0: p[1] - hp * 0.9, y1: p[1] });
    if (d.bubble > 0.01) {
      var fs = clamp(hp * 0.14, 13, 26);
      g.font = '800 ' + fs + 'px "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif';
      var tw = g.measureText(d.say).width, bw = tw + fs * 1.4, bh = fs * 2;
      var bx = p[0] - bw / 2 + (d.flip ? -hp * 0.12 : hp * 0.12), by = p[1] - hp * 1.02 - bh - 6 - (1 - d.bubble) * 10;
      g.globalAlpha = sstep(d.bubble * 3);
      g.fillStyle = '#fffaf0'; g.strokeStyle = OL; g.lineWidth = 3;
      g.beginPath();
      if (g.roundRect) g.roundRect(bx, by, bw, bh, bh / 2); else g.rect(bx, by, bw, bh);
      g.moveTo(p[0] - 6, by + bh); g.lineTo(p[0], by + bh + 10); g.lineTo(p[0] + 8, by + bh);
      g.fill(); g.stroke();
      g.fillStyle = OL; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(d.say, bx + bw / 2, by + bh / 2 + 1);
      g.globalAlpha = 1;
    }
  }

  function render(st) {
    if (!g) return;
    var t = st.t, time = st.time, P = palette(t);
    cam.z = st.camZ; cam.x = roadX(cam.z); cam.sl = slope(cam.z);
    var heading = Math.atan(cam.sl);
    var oceanT = sstep((cam.z + DRAW * 0.9 - cfg.zEnd) / 140);
    hits = [];

    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.globalCompositeOperation = 'source-over';

    // sky
    var sky = g.createLinearGradient(0, 0, 0, HZ);
    sky.addColorStop(0, rgb(P.skyTop)); sky.addColorStop(0.55, rgb(P.skyMid)); sky.addColorStop(1, rgb(P.skyLow));
    g.fillStyle = sky; g.fillRect(0, 0, W, HZ + 2);

    // sun
    var sunX = W * (0.5 + 0.16 * (1 - t)) - heading * F * 0.9;
    var sunY = lerp(HZ - H * 0.34, HZ - H * 0.07, sstep(t));
    var sunR = lerp(H * 0.05, H * 0.085, t);
    var gl = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 6);
    gl.addColorStop(0, rgb(P.glow, 0.85)); gl.addColorStop(0.3, rgb(P.glow, 0.28)); gl.addColorStop(1, rgb(P.glow, 0));
    g.fillStyle = gl; g.fillRect(0, 0, W, HZ + 2);
    g.fillStyle = rgb(P.sun, 0.55 + t * 0.45); g.beginPath(); g.arc(sunX, sunY, sunR, 0, TAU); g.fill();

    // clouds
    for (var i = 0; i < CLOUDS.length; i++) {
      var cl = CLOUDS[i];
      var u = cl[0] + time * 0.004 * cl[3] - heading * 0.25;
      u = ((u % 1.5) + 1.5) % 1.5 - 0.2;
      drawCloud(u * W, HZ * cl[1] + 30, cl[2] * Math.max(0.7, W / 1400), P.cloud, 0.85);
    }

    // birds over the sea
    if (t > 0.5) {
      g.strokeStyle = rgb(P.ridgeNear, (t - 0.5) * 1.6); g.lineWidth = 2.2; g.lineCap = 'round';
      for (i = 0; i < 6; i++) {
        var bx = ((i * 0.17 + time * 0.012) % 1.2 - 0.1) * W, by = HZ * (0.3 + 0.08 * Math.sin(i * 3.1 + time * 0.4)), fl = Math.sin(time * 6 + i) * 4, bs = 7 + (i % 3) * 2;
        g.beginPath(); g.moveTo(bx - bs, by - fl); g.quadraticCurveTo(bx - bs * 0.4, by - 3, bx, by); g.quadraticCurveTo(bx + bs * 0.4, by - 3, bx + bs, by - fl); g.stroke();
      }
    }

    // ridges (+ volcano with smoke)
    var farOff = 0.02 - heading * 0.18, farSpan = 0.62, farH = H * 0.1 * (1 - oceanT * 0.45);
    drawRidge(0, farOff, farSpan, farH, P.ridgeFar, 1);
    var vu = 0.3 - farOff; vu = vu - Math.floor(vu);
    var vx = (vu / farSpan) * W, vy = HZ - 1.6 * farH;
    if (vx > -80 && vx < W + 80) {
      for (i = 0; i < 7; i++) {
        var ph = ((time * 0.07 + i / 7) % 1);
        g.fillStyle = rgb(mix(P.cloud, P.ridgeFar, 0.4), 0.5 * (1 - ph));
        g.beginPath(); g.arc(vx + ph * 40 + Math.sin(ph * 6 + i) * 6, vy - ph * H * 0.12, 8 + ph * 26, 0, TAU); g.fill();
      }
    }
    drawRidge(1, 0.4 - heading * 0.3, 0.9, H * 0.06, P.ridgeMid, 1 - oceanT);
    drawRidge(2, 0.7 - heading * 0.45 + cam.z * 0.00004, 1.6, H * 0.034, P.ridgeNear, 1 - oceanT);

    // the ground beyond the draw distance
    var farY = proj(cam.z + DRAW, 0, 0)[1];
    g.fillStyle = rgb(cam.z + DRAW > cfg.zEnd ? P.waterA : mix(P.grassB, P.fog, 0.5));
    g.fillRect(0, HZ, W, farY - HZ + 1);

    // the road and everything on it, far to near
    var fogs = [190, 140, 102, 74, 52, 34], fi = 0, fogA = 0.13 - 0.05 * t;
    while (fi < fogs.length && fogs[fi] >= DRAW) fi++;
    var zFar = cam.z + DRAW;
    var lo = 0, hi = objs.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (objs[mid].z < zFar) lo = mid + 1; else hi = mid; }
    var oi = lo - 1;
    /* guides sort a little nearer than they stand, so the roadside
       ferns frame them rather than bury them */
    var dyn = (st.dyn || []).map(function (d) { d.zs = d.z - 3; return d; }).sort(function (a, b) { return b.zs - a.zs; }), di = 0;
    while (di < dyn.length && dyn[di].zs >= zFar) di++;

    var sFar = Math.floor(zFar / SEG), sNear = Math.floor((cam.z + 0.9) / SEG);
    var zEnd = cfg.zEnd;
    for (var si = sFar; si >= sNear; si--) {
      var z1 = si * SEG, z2 = z1 + SEG;
      while (fi < fogs.length && z2 - cam.z <= fogs[fi]) {
        g.fillStyle = rgb(P.fog, fogA); g.fillRect(0, 0, W, H); fi++;
      }
      var za = Math.max(z1, cam.z + 0.9), zb = Math.min(z2, zFar);
      if (zb > za) {
        var pa = proj(za, 0, 0), pb = proj(zb, 0, 0);
        var ya = Math.min(pa[1], H + 2), yb = pb[1];
        if (yb < H) {
          var stripe = (Math.floor(z1 / 7.5) & 1);
          if (z1 >= zEnd) {
            // the sea
            var wv = ((z1 - zEnd) + time * 3.2) % 15;
            var wc = (Math.floor((z1 - time * 1.5) / 5) & 1) ? P.waterA : P.waterB;
            if (z1 < zEnd + SEG) wc = [255, 250, 240];
            else if (wv < 1.2) wc = mix(wc, [240, 250, 255], 0.55 * (1 - (z1 - zEnd) / 150));
            g.fillStyle = rgb(wc); g.fillRect(0, yb, W, ya - yb + 1);
          } else {
            var sd = sandAt(z1);
            var gc = mix(stripe ? P.grassA : P.grassB, stripe ? P.sandA : P.sandB, sd);
            if (z1 > zEnd - 4) gc = mix(gc, P.dirtB, 0.35);   // wet sand
            g.fillStyle = rgb(gc); g.fillRect(0, yb, W, ya - yb + 1);
            var rwa = roadW(za), rwb = roadW(zb);
            if (rwb > 0.02) {
              var dc = mix((Math.floor(z1 / 5) & 1) ? P.dirtA : P.dirtB, P.sandA, sd * 0.6);
              trap(pa[0], ya, rwa * pa[2], pb[0], yb, rwb * pb[2], dc);
              var rc = mix(P.rut, P.sandB, sd * 0.5);
              trapOff(pa, pb, ya, yb, rwa, rwb, -0.52, 0.17, rc);
              trapOff(pa, pb, ya, yb, rwa, rwb, 0.52, 0.17, rc);
              if (sd < 0.85) trapOff(pa, pb, ya, yb, rwa, rwb, 0, 0.13, mix(stripe ? P.grassA : P.grassB, dc, 0.35 + sd * 0.6));
            }
          }
        }
      }
      while (oi >= 0 && objs[oi].z >= z1) { drawSprite(objs[oi]); oi--; }
      while (di < dyn.length && dyn[di].zs >= z1) { drawDino(dyn[di]); di++; }
    }
    while (oi >= 0 && objs[oi].z > cam.z + 0.35) { drawSprite(objs[oi]); oi--; }
    while (di < dyn.length && dyn[di].z > cam.z + 0.35) { drawDino(dyn[di]); di++; }

    // sun glitter on the water
    if (oceanT > 0.02) {
      var shoreY = proj(Math.max(zEnd, cam.z + 1), 0, 0)[1];
      g.strokeStyle = 'rgba(255,240,200,' + (0.75 * oceanT) + ')'; g.lineCap = 'round';
      var gr = rng(Math.floor(time * 6));
      for (i = 0; i < 46; i++) {
        var q = gr(), yy = lerp(HZ + 1, shoreY, q * q), spread = (yy - HZ) * 2.4 + 6;
        var xx = sunX + (gr() - 0.5) * spread;
        g.lineWidth = 1 + q * 2.5;
        g.beginPath(); g.moveTo(xx - 3 - q * 10, yy); g.lineTo(xx + 3 + q * 10, yy); g.stroke();
      }
    }

    // light through the canopy
    var jung = 1 - sstep(t * 1.6);
    if (jung > 0.02) {
      g.globalCompositeOperation = 'screen';
      for (i = 0; i < 5; i++) {
        var sx = W * (0.08 + i * 0.22) + Math.sin(time * 0.3 + i) * 14 - heading * F * 0.3;
        var a = (0.07 + 0.04 * Math.sin(time * 0.7 + i * 2)) * jung;
        var lg = g.createLinearGradient(0, 0, 0, H * 0.85);
        lg.addColorStop(0, 'rgba(255,250,210,' + a + ')'); lg.addColorStop(1, 'rgba(255,250,210,0)');
        g.fillStyle = lg;
        g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + W * 0.07, 0); g.lineTo(sx + W * 0.2, H * 0.85); g.lineTo(sx + W * 0.06, H * 0.85); g.closePath(); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }

    // the canopy overhead, drawing back as you leave the forest
    var cOut = sstep(t * 1.35);
    if (canopy && cOut < 0.99) {
      var cy = -cOut * canopy.h * 1.05;
      g.drawImage(canopy.c, -W * 0.15 + Math.sin(time * 0.45) * 10 - heading * 40, cy, canopy.w, canopy.h);
    }

    // golden hour grade
    if (t > 0.02) {
      g.globalCompositeOperation = 'soft-light';
      g.fillStyle = 'rgba(255,150,80,' + (0.5 * sstep(t)) + ')';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }

    return { scrim: P.scrim, scrimA: 0.68 - 0.36 * sstep(t), sunX: sunX };
  }

  function trap(ax, ay, aw, bx, by, bw, col) {
    g.fillStyle = rgb(col);
    g.beginPath(); g.moveTo(ax - aw, ay); g.lineTo(ax + aw, ay); g.lineTo(bx + bw, by); g.lineTo(bx - bw, by); g.closePath(); g.fill();
  }
  function trapOff(pa, pb, ya, yb, rwa, rwb, off, wid, col) {
    trap(pa[0] + off * rwa * pa[2], ya, wid * rwa * pa[2], pb[0] + off * rwb * pb[2], yb, wid * rwb * pb[2], col);
  }

  /* ======================================================================
     FX — the layer in front of the Jeep: dust, motes, falling leaves
     ====================================================================== */
  var motes = [], dust = [], leaves = [], dustAcc = 0, puffT = 0;

  function seedFx() {
    var r = rng(5);
    motes = [];
    for (var i = 0; i < 54; i++) motes.push({ x: (r() - 0.5) * 2.4, y: (r() - 0.62) * 1.6, z: 0.15 + r() * 1.6, p: null, k: r() });
    leaves = [];
    for (i = 0; i < 7; i++) leaves.push({ x: r() * W, y: r() * H, vx: 0, vy: 30 + r() * 30, rot: r() * TAU, vr: (r() - 0.5) * 3, s: 0.7 + r() * 0.6, k: r() });
  }

  function fx(st) {
    if (!fg) return;
    var dt = st.dt, time = st.time, v = st.speed, t = st.t;
    fg.setTransform(DPR, 0, 0, DPR, 0, 0);
    fg.clearRect(0, 0, W, H);

    // motes: fireflies in the jungle, sea-spray sparkles at the beach — they
    // stream past the camera, and streak when you're moving fast
    var mc = t < 0.5 ? mix([214, 255, 140], [255, 228, 150], t * 2) : mix([255, 228, 150], [255, 214, 190], (t - 0.5) * 2);
    fg.globalCompositeOperation = 'lighter';
    fg.lineCap = 'round';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.z -= v * dt * 0.016 + dt * 0.012;
      m.x += Math.sin(time * 0.8 + m.k * 20) * dt * 0.02;
      m.y += Math.cos(time * 0.6 + m.k * 13) * dt * 0.012;
      if (m.z < 0.12) { m.z = 1.6 + m.k * 0.4; m.p = null; }
      var sx = W / 2 + (m.x / m.z) * W * 0.32, sy = HZ + (m.y / m.z) * H * 0.42;
      var a = clamp((1.6 - m.z) * 1.3, 0, 1) * clamp((m.z - 0.12) * 6, 0, 1) * (0.55 + 0.45 * Math.sin(time * 3 + m.k * 30));
      var sz = clamp(2.2 / m.z, 1, 18);
      if (m.p && v > 6) {
        fg.strokeStyle = rgb(mc, a * 0.55); fg.lineWidth = sz * 0.5;
        fg.beginPath(); fg.moveTo(m.p[0], m.p[1]); fg.lineTo(sx, sy); fg.stroke();
      }
      fg.globalAlpha = a;
      fg.drawImage(GLOW, sx - sz * 2, sy - sz * 2, sz * 4, sz * 4);
      fg.globalAlpha = 1;
      m.p = [sx, sy];
    }
    fg.globalCompositeOperation = 'source-over';

    // falling leaves while under the canopy
    var jung = 1 - sstep(t * 1.6);
    if (jung > 0.02) {
      for (i = 0; i < leaves.length; i++) {
        var L = leaves[i];
        L.y += (L.vy + v * 2) * dt; L.x += (Math.sin(time + L.k * 9) * 30 + (L.x - W / 2) * v * 0.012) * dt;
        L.rot += L.vr * dt;
        if (L.y > H + 40 || L.x < -60 || L.x > W + 60) { L.y = -30; L.x = Math.random() * W; }
        fg.save(); fg.globalAlpha = jung * 0.9; fg.translate(L.x, L.y); fg.rotate(L.rot); fg.scale(L.s, L.s * Math.cos(time * 2 + L.k * 7));
        fg.fillStyle = L.k > 0.5 ? '#6cc160' : '#d9c35a'; fg.strokeStyle = OL; fg.lineWidth = 1.5;
        fg.beginPath(); fg.moveTo(-9, 0); fg.quadraticCurveTo(0, -7, 9, 0); fg.quadraticCurveTo(0, 7, -9, 0); fg.fill(); fg.stroke();
        fg.restore();
      }
    }

    // dust from the tyres
    var dc = mix([170, 136, 96], [236, 206, 158], st.sand || 0);
    if (st.wheels && v > 1.5) {
      dustAcc += v * dt * 0.7;
      while (dustAcc > 1) {
        dustAcc -= 1;
        for (var w = 0; w < st.wheels.length; w++) {
          var wh = st.wheels[w], dir = w === 0 ? -1 : 1;
          dust.push({ x: wh[0] + (Math.random() - 0.5) * 12, y: wh[1], vx: dir * (20 + Math.random() * 70), vy: -(10 + Math.random() * 40), r: 6 + Math.random() * 8, life: 0, max: 0.7 + Math.random() * 0.6 });
        }
      }
    }
    if (st.exhaust) {
      puffT -= dt;
      if (puffT < 0) { puffT = 0.35 + Math.random() * 0.3; dust.push({ x: st.exhaust[0], y: st.exhaust[1], vx: -20 - Math.random() * 20, vy: 10, r: 4, life: 0, max: 1.1, ex: 1 }); }
    }
    for (i = dust.length - 1; i >= 0; i--) {
      var d = dust[i];
      d.life += dt;
      if (d.life > d.max) { dust.splice(i, 1); continue; }
      d.x += d.vx * dt; d.y += d.vy * dt + (d.ex ? 0 : 30 * dt); d.vx *= 0.97; d.vy *= 0.96; d.r += dt * 28;
      var al = (1 - d.life / d.max) * (d.ex ? 0.18 : 0.32);
      fg.fillStyle = d.ex ? 'rgba(220,226,220,' + al + ')' : rgb(dc, al);
      fg.beginPath(); fg.arc(d.x, d.y, d.r, 0, TAU); fg.fill();
    }
    if (dust.length > 260) dust.splice(0, dust.length - 260);
  }

  /* ======================================================================
     PUBLIC
     ====================================================================== */
  window.World = {
    init: function (canvas, fxCanvas, opts) {
      cvs = canvas; g = canvas.getContext('2d');
      if (fxCanvas) { fxc = fxCanvas; fg = fxCanvas.getContext('2d'); }
      cfg.zEnd = opts.zEnd; cfg.density = opts.density || 1;
      if (!S) buildSprites();
      GLOW = glowSprite();
      populate();
    },
    resize: function (w, h, dpr) {
      W = w; H = h; DPR = dpr;
      var narrow = w / h < 0.9;
      F = Math.min(h * 0.95, w * (narrow ? 1.45 : 1.3));
      HZ = h * (narrow ? 0.5 : 0.45);
      [cvs, fxc].forEach(function (c) {
        if (!c) return;
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      });
      buildCanopy();
      seedFx();
    },
    render: render,
    fx: fx,
    project: function (z, x, y) { return proj(z, x, y); },
    hits: function () { return hits; },
    curvature: function (z) { return slope(z + 6) - slope(z); },
    get F() { return F; }, get HZ() { return HZ; }, get CH() { return CH; },
    get W() { return W; }, get H() { return H; },
    sandAt: function (z) { return sandAt(z); }
  };
})();
