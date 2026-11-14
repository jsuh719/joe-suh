/* ==========================================================================
   main.js — content, the guided tour, and the router.
   Reads window.RESUME (resume.js) and drives window.World (world.js).
   ========================================================================== */
(function () {
  'use strict';

  var R = window.RESUME, World = window.World;
  if (!R) { document.body.innerHTML = '<p style="padding:2rem">resume.js failed to load.</p>'; return; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  if (reduced) root.classList.add('rm');

  /* ======================================================================
     1. RICH TEXT
     ====================================================================== */
  var LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

  /* Writes a bullet into a node, turning [text](url) into a real link.
     Uses text nodes rather than innerHTML, so content can never inject
     markup no matter what gets typed into resume.js. */
  function appendRich(node, str) {
    var last = 0, m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(str)) !== null) {
      if (m.index > last) node.appendChild(document.createTextNode(str.slice(last, m.index)));
      var a = el('a', null, m[1]);
      a.href = m[2]; a.rel = 'noopener'; a.target = '_blank';
      node.appendChild(a);
      last = LINK_RE.lastIndex;
    }
    if (last < str.length) node.appendChild(document.createTextNode(str.slice(last)));
  }

  function textNodes(node) {
    var out = [], w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }

  /* The numbers are the story — pick them out with a highlighter. */
  var FIG_RE = /(\$\d[\d,.]*[MKB]?\+?|\d[\d,.]*%\+?|\b(?:six|seven|eight|nine)[- ]figures?\b|\btop \d+%)/gi;
  function highlight(node) {
    textNodes(node).forEach(function (tn) {
      var s = tn.nodeValue, last = 0, m, frag = null;
      FIG_RE.lastIndex = 0;
      while ((m = FIG_RE.exec(s)) !== null) {
        frag = frag || document.createDocumentFragment();
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        frag.appendChild(el('mark', 'hl', m[0]));
        last = FIG_RE.lastIndex;
      }
      if (!frag) return;
      if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      tn.parentNode.replaceChild(frag, tn);
    });
  }

  /* Every word becomes its own object so it can flip up out of the ground. */
  function splitWords(node, start) {
    var i = start || 0;
    textNodes(node).forEach(function (tn) {
      var parts = tn.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        var w = el('span', 'w', p);
        w.style.setProperty('--i', Math.min(i++, 48));
        frag.appendChild(w);
      });
      tn.parentNode.replaceChild(frag, tn);
    });
    return i;
  }

  /* ======================================================================
     2. PLAIN RESUME
     ====================================================================== */
  function bullets(list) {
    var ul = el('ul', 'r-bullets');
    list.forEach(function (b) { var li = el('li'); appendRich(li, b); ul.appendChild(li); });
    return ul;
  }

  function groups(list) {
    var wrap = el('div', 'r-groups');
    list.forEach(function (g) {
      var box = el('div', 'r-group');
      box.appendChild(el('p', 'r-group__name', g.name));
      var row = el('div', 'r-group__items');
      g.items.forEach(function (i) { row.appendChild(el('span', 'r-tag', i)); });
      box.appendChild(row);
      wrap.appendChild(box);
    });
    return wrap;
  }

  function categoryBody(c) {
    var frag = document.createDocumentFragment();
    if (c.groups) frag.appendChild(groups(c.groups));
    if (c.bullets) frag.appendChild(bullets(c.bullets));
    if (c.roles) c.roles.forEach(function (role) {
      var box = el('div', 'r-role'), top = el('div', 'r-role__top');
      top.appendChild(el('h4', 'r-role__title', role.title));
      if (role.dates) top.appendChild(el('span', 'r-role__dates', role.dates));
      box.appendChild(top);
      if (role.bullets) box.appendChild(bullets(role.bullets));
      frag.appendChild(box);
    });
    return frag;
  }

  function renderPlain() {
    $('#r-name').textContent = R.name;
    $('#r-headline').textContent = R.headline;
    $('#r-location').textContent = R.location;
    $('#r-summary').textContent = R.summary;
    var links = $('#r-links');
    R.links.forEach(function (l) { var a = el('a', null, l.label); a.href = l.href; a.rel = 'me noopener'; links.appendChild(a); });

    var body = $('#r-body'), current = null, section = null;
    R.categories.forEach(function (c) {
      if (c.section !== current) {
        current = c.section;
        section = el('section', 'r-section');
        section.appendChild(el('h2', 'r-section__head', c.section));
        body.appendChild(section);
      }
      var entry = el('article', 'r-entry'), top = el('div', 'r-entry__top');
      top.appendChild(el('h3', 'r-entry__title', c.title));
      if (c.dates) top.appendChild(el('span', 'r-entry__dates', c.dates));
      entry.appendChild(top);
      if (c.subtitle) entry.appendChild(el('p', 'r-entry__sub', c.subtitle));
      entry.appendChild(categoryBody(c));
      section.appendChild(entry);
    });
  }

  /* ======================================================================
     3. HERO + ARRIVAL
     ====================================================================== */
  function fillHero() {
    var h = R.hero || {};
    var greet = $('#hero-greeting');
    greet.textContent = h.greeting || R.name;
    splitWords(greet);

    var text = (h.intro || '')
      .replace(/\{\{\s*JOB TITLE\s*\}\}/g, R.currentTitle || '')
      .replace(/\{\{\s*COMPANY(?: TITLE)?\s*\}\}/g, R.currentCompany || '');
    var intro = $('#hero-intro'), rest = text;
    [R.currentTitle, R.currentCompany].filter(Boolean).forEach(function (m) {
      var i = rest.indexOf(m);
      if (i < 0) return;
      intro.appendChild(document.createTextNode(rest.slice(0, i)));
      intro.appendChild(el('strong', null, m));
      rest = rest.slice(i + m.length);
    });
    intro.appendChild(document.createTextNode(rest));

    var out = $('#outro-links');
    R.links.forEach(function (l) {
      var a = el('a', 'btn btn--link', l.label);
      a.href = l.href; a.rel = 'me noopener';
      out.appendChild(a);
    });
    splitWords($('#arrival-line'));
  }

  /* ======================================================================
     4. THE TOUR
        The resume is laid out along a road. Every line is a sign standing
        at its own distance; scroll is how far you've driven. The Jeep slows
        at each sign so you can read it, then picks up speed between stops.
     ====================================================================== */
  var TOUR = {
    HERO: 0.75,     // screens of scroll to pull away from the trailhead
    BEAT: 0.45,     // screens of scroll per sign
    GAP: 0.75,      // extra screens of open road before each stop
    ARRIVE: 1.0,    // the last stretch down to the sand
    HOLD: 0.45,     // parked at the beach
    READ: 10,       // how far ahead a sign is when it's at reading size
    SPACING: 26,    // distance between signs within a stop
    STOP_GAP: 92,   // open road between stops
    ESCORT: 10      // how far ahead your dinosaur guide walks
  };

  /* Each stop has a guide. Order follows resume.js. */
  var GUIDES = {
    'scale-ai':   { img: 'trex',  accent: '#7ee06a', deep: '#1f6b2c', say: 'Rawr!' },
    'scenera':    { img: 'trike', accent: '#5fe0c8', deep: '#14635a', say: 'Hi there!' },
    'army':       { img: 'stego', accent: '#e2dc68', deep: '#6b6a1c', say: 'Hooah!' },
    'west-point': { img: 'ptero', accent: '#ffb35c', deep: '#8a4210', say: 'Skreee!', fly: true },
    'surfer':     { img: 'surf',  accent: '#c9a4ff', deep: '#4e2d86', say: 'Surf’s up!', surf: true }
  };

  var stops = [], beats = [], zEnd = 0, zPark = 0, tStart = 0, tEnd = 1;

  function buildTour() {
    var tour = $('#journey');
    tour.textContent = '';
    var z = 18;

    R.categories.forEach(function (c) {
      var guide = GUIDES[c.slug];
      if (!guide) return;
      var idx = stops.length;
      var side = idx % 2 === 0 ? 1 : -1;      // which side of the road the words stand on
      z += idx === 0 ? 52 : TOUR.STOP_GAP;

      var sec = el('section', 'stop');
      sec.id = 'stop-' + c.slug;
      sec.style.setProperty('--accent', guide.accent);
      sec.style.setProperty('--deep', guide.deep);

      var stop = { idx: idx, c: c, guide: guide, side: side, z0: z, beats: [], node: sec, phase: 0, hop: 0, bubble: 0 };
      var img = new Image(); img.src = './dino/' + guide.img + '.png'; stop.img = img;

      /* the signpost: who and when */
      var tb = el('div', 'bb bb--title' + (c.title.length > 22 ? ' bb--long' : ''));
      var body = el('div', 'bb__body');
      var eb = el('p', 'bb__eyebrow');
      eb.appendChild(el('span', 'bb__num', String(idx + 1).padStart(2, '0')));
      eb.appendChild(document.createTextNode(c.section));
      body.appendChild(eb);
      var h2 = el('h2', 'bb__title', c.title);
      h2.id = 'stop-title-' + c.slug;
      sec.setAttribute('aria-labelledby', h2.id);
      body.appendChild(h2);
      var meta = [c.dates, c.subtitle].filter(Boolean).join('  ·  ');
      if (meta) body.appendChild(el('p', 'bb__meta', meta));
      tb.appendChild(body);
      sec.appendChild(tb);
      stop.beats.push(beats.length);
      beats.push({ el: tb, z: z, stop: stop, title: true });

      /* the signs: one line of the resume each */
      var items = [];
      if (c.roles) c.roles.forEach(function (role) {
        var bl = role.bullets || [];
        if (!bl.length) items.push({ kicker: role.title, dates: role.dates, text: '' });
        bl.forEach(function (b, i) { items.push({ kicker: role.title, dates: i === 0 ? role.dates : '', text: b, first: i === 0 }); });
      });
      (c.bullets || []).forEach(function (b) { items.push({ kicker: '', text: b }); });

      var ul = el('ul', 'stop__list');
      items.forEach(function (it, i) {
        z += TOUR.SPACING;
        var li = el('li', 'bb bb--item');
        var b = el('div', 'bb__body');
        var k = el(it.first || !it.kicker ? 'h3' : 'p', 'bb__kicker');
        if (it.kicker) {
          k.appendChild(el('span', 'bb__role', it.kicker));
          if (it.dates) k.appendChild(el('span', 'bb__dates', it.dates));
        } else {
          k.appendChild(el('span', 'bb__role', c.chip || c.title));
        }
        k.appendChild(el('span', 'bb__count', (i + 1) + ' / ' + items.length));
        b.appendChild(k);
        if (it.text) {
          var p = el('p', 'bb__text');
          appendRich(p, it.text);
          highlight(p);
          b.appendChild(p);
        }
        li.appendChild(b);
        ul.appendChild(li);
        stop.beats.push(beats.length);
        beats.push({ el: li, z: z, stop: stop });
      });
      sec.appendChild(ul);
      stop.z1 = z;
      stops.push(stop);
      tour.appendChild(sec);
    });

    beats.forEach(function (b) {
      var n = 0;
      $$('.bb__title, .bb__text, .bb__meta', b.el).forEach(function (t) { n = splitWords(t, n); });
      b.el.dataset.side = b.stop.side;
    });

    zEnd = z + 110;
    zPark = zEnd - 13;
    var s3 = stops[Math.max(0, stops.length - 2)];
    tStart = s3 ? s3.z0 - 60 : zEnd * 0.6;
    tEnd = zEnd - 30;

    // the surfer runs on ahead into the sea
    var last = stops[stops.length - 1];
    if (last && last.guide.surf) last.toSea = true;
  }

  /* ── the trail map ── */
  function buildTrailMap() {
    var list = $('#trailmap-list');
    stops.forEach(function (s) {
      var li = el('li'), b = el('button', 'tm');
      b.type = 'button';
      b.style.setProperty('--accent', s.guide.accent);
      var im = el('img'); im.src = './dino/' + s.guide.img + '.png'; im.alt = '';
      b.appendChild(el('span', 'tm__dot')).appendChild(im);
      b.appendChild(el('span', 'tm__label', s.c.chip || s.c.title));
      b.addEventListener('click', function () { goScroll(beats[s.beats[0]].s); });
      s.tm = b;
      li.appendChild(b); list.appendChild(li);
    });
    var li = el('li'), b = el('button', 'tm tm--beach');
    b.type = 'button';
    b.style.setProperty('--accent', '#ffc07c');
    b.appendChild(el('span', 'tm__dot')).appendChild(el('span', 'tm__sun'));
    b.appendChild(el('span', 'tm__label', 'The beach'));
    b.addEventListener('click', function () { goScroll(timeline.total); });
    li.appendChild(b); list.appendChild(li);
    beachTm = b;
  }
  var beachTm = null;

  /* ======================================================================
     5. TIMELINE — scroll position → distance down the road
     ====================================================================== */
  var timeline = { segs: [], total: 1, vh: 1, sArrive: 0 };

  function buildTimeline() {
    var vh = layout.H, segs = [], s = 0, z = 0;
    function add(len, zTo, kind) { segs.push({ s0: s, s1: s + len, z0: z, z1: zTo, kind: kind }); s += len; z = zTo; }
    add(TOUR.HERO * vh, 16, 'roll');
    beats.forEach(function (b) {
      add((TOUR.BEAT + (b.title ? TOUR.GAP : 0)) * vh, b.z - TOUR.READ, 'tour');
      b.s = s;
    });
    timeline.sArrive = s;
    add(TOUR.ARRIVE * vh, zPark, 'tour');
    add(TOUR.HOLD * vh, zPark, 'hold');
    timeline.segs = segs;
    timeline.total = s;
    timeline.vh = vh;
    $('#track').style.height = Math.round(s + window.innerHeight) + 'px';
  }

  /* Mostly an ease-in-out, so the Jeep slows at each sign — but never fully
     stops, so scrolling always feels like it's moving you. */
  function ease(t) { var e = t * t * t * (t * (t * 6 - 15) + 10); return t * 0.22 + e * 0.78; }

  function camAt(sc) {
    var segs = timeline.segs;
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (sc <= g.s1 || i === segs.length - 1) {
        var t = clamp((sc - g.s0) / (g.s1 - g.s0), 0, 1);
        var e = g.kind === 'roll' ? t * t * 0.6 + t * 0.4 : g.kind === 'hold' ? 0 : ease(t);
        return g.z0 + (g.z1 - g.z0) * e;
      }
    }
    return 0;
  }

  /* ======================================================================
     6. LAYOUT — where words and guides stand, per screen shape
     ====================================================================== */
  var layout = { W: 1, H: 1, narrow: false, textX: 0, textY: 0, dinoX: 0, dinoH: 3.2 };

  function computeLayout() {
    var W = window.innerWidth, H = layout.H;
    layout.W = W;
    layout.narrow = W / H < 0.9 || W < 640;
    var F = World.F, HZ = World.HZ, CH = World.CH, k = TOUR.READ / F;
    if (layout.narrow) {
      layout.textX = 0;
      layout.textY = CH - (H * 0.29 - HZ) * k;
      layout.dinoX = (W * 0.27) * k;
      layout.dinoH = 2.5;
    } else {
      layout.textX = (W * 0.065) * k;
      layout.textY = CH - (H * 0.33 - HZ) * k;
      layout.dinoX = (W * 0.25) * k;
      layout.dinoH = 3.3;
    }
    root.style.setProperty('--vw-px', W + 'px');
  }

  /* ======================================================================
     7. THE DRIVE
     ====================================================================== */
  var park = $('#view-park'), jeep = $('#jeep'), hero = $('#hero'), arrival = $('#arrival');
  var topbar = $('#topbar'), trailmap = $('#trailmap');
  var worldCanvas = $('#world'), fxCanvas = $('#fx');
  var herd = $$('.hero-dino').map(function (n) { return { node: n, lag: parseFloat(n.dataset.lag) || 0 }; });

  var cam = 0, camPrev = 0, speed = 0, speedPrev = 0, time = 0, last = 0, brakeT = 0, running = false;

  function dinoState(s) {
    var lead = TOUR.ESCORT;
    var z = clamp(cam + lead, s.z0, s.z1);
    var moving = cam + lead > s.z0 && cam + lead < s.z1;
    if (s.toSea && cam + lead > s.z1) {
      z = Math.min(cam + lead + (cam + lead - s.z1) * 1.4, zEnd + 26);
      moving = z < zEnd + 26;
    }
    if (moving) s.phase += Math.abs(cam - camPrev) * 0.9;
    var g = s.guide, h = layout.dinoH * (g.fly ? 0.85 : 1);
    var x = -s.side * layout.dinoX;
    var walk = moving ? Math.abs(Math.sin(s.phase)) : 0;
    var y = walk * 0.22;
    var rot = moving ? Math.sin(s.phase) * 0.06 : Math.sin(time * 1.4 + s.idx) * 0.015;
    if (g.fly) { y = 2.1 + Math.sin(time * 1.5 + s.idx) * 0.3; rot = Math.sin(time * 1.1) * 0.08; }
    if (s.toSea && z > zEnd) { x = x * 0.5; y = -0.35 + Math.sin(time * 1.8) * 0.18; rot = Math.sin(time * 1.3) * 0.1; }
    if (s.hop > 0) { y += Math.sin((1 - s.hop) * Math.PI) * h * 0.25; s.hop = Math.max(0, s.hop - 1 / 50); }
    if (s.bubble > 0) s.bubble = Math.max(0, s.bubble - 1 / 140);
    var squash = moving && !g.fly ? (1 - walk) * 0.04 : Math.sin(time * 2 + s.idx) * 0.012;
    return { k: s.idx, z: z, x: x, y: y, h: h, img: s.img, flip: x > 0, rot: rot, squash: squash, fly: g.fly, bubble: s.bubble, say: g.say };
  }

  function placeBeats() {
    var READ = TOUR.READ;
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i], dz = b.z - cam, e = b.el;
      if (dz > READ * 5.4 || dz < READ * 0.38) {
        if (b.vis) { e.style.opacity = '0'; e.classList.remove('in', 'live'); b.vis = false; }
        continue;
      }
      b.vis = true;
      var side = layout.narrow ? 0 : b.stop.side;
      var p = World.project(b.z, side * layout.textX, layout.textY);
      var sc = READ / dz;
      var fadeIn = sstep((READ * 5.4 - dz) / (READ * 2.8));
      var fadeOut = sstep((dz - READ * 0.42) / (READ * 0.4));
      var op = fadeIn * fadeOut;
      var rot = side * clamp((dz - READ) / READ, -1.2, 2.5) * -14;
      e.style.transform = 'translate3d(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px,0) perspective(1400px) rotateY(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      e.style.opacity = op.toFixed(3);
      var inRange = dz < READ * 2.1 && dz > READ * 0.5;
      if (inRange !== e.classList.contains('in')) e.classList.toggle('in', inRange);
      var live = op > 0.6 && sc > 0.7 && sc < 1.5;
      if (live !== e.classList.contains('live')) e.classList.toggle('live', live);
    }
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now; time += dt;

    var sc = window.scrollY;
    var target = camAt(sc);
    cam = reduced ? target : cam + (target - cam) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(target - cam) < 0.002) cam = target;
    var v = (cam - camPrev) / dt;
    speed += (v - speed) * (1 - Math.exp(-dt * 6));

    var t = sstep((cam - tStart) / (tEnd - tStart));
    var dyn = stops.map(dinoState);
    camPrev = cam;

    var out = World.render({ camZ: cam, t: t, time: time, speed: speed, dyn: dyn });
    if (out) {
      root.style.setProperty('--scrim', out.scrim.map(function (x) { return x | 0; }).join(' '));
      root.style.setProperty('--scrim-a', out.scrimA.toFixed(3));
    }
    placeBeats();

    /* hero + arrival + chrome */
    var vh = layout.H;
    var h = clamp(sc / (vh * 0.5), 0, 1);
    park.style.setProperty('--h', h.toFixed(4));
    herd.forEach(function (m) {
      var span = 1 - m.lag;
      m.node.style.setProperty('--hh', clamp(span > 0 ? (h - m.lag) / span : 1, 0, 1).toFixed(4));
    });
    hero.classList.toggle('gone', h > 0.6);
    var a = clamp((sc - timeline.sArrive - TOUR.ARRIVE * vh * 0.35) / (TOUR.ARRIVE * vh * 0.55), 0, 1);
    park.style.setProperty('--a', a.toFixed(4));
    if ((a > 0.5) !== arrival.classList.contains('live')) arrival.classList.toggle('live', a > 0.5);
    if ((a > 0.3) !== arrival.classList.contains('in')) arrival.classList.toggle('in', a > 0.3);
    var ui = clamp((h - 0.5) * 2, 0, 1) * (1 - a * 0.6);
    park.style.setProperty('--ui', ui.toFixed(3));
    topbar.classList.toggle('live', ui > 0.5);

    /* trail map */
    var prog = clamp(cam / zPark, 0, 1);
    trailmap.style.setProperty('--prog', prog.toFixed(4));
    var cur = -1;
    stops.forEach(function (s, i) { if (cam >= s.z0 - TOUR.READ * 3) cur = i; });
    if (a > 0.3) cur = stops.length;
    stops.forEach(function (s, i) {
      s.tm.classList.toggle('is-current', i === cur);
      s.tm.classList.toggle('is-passed', i < cur);
    });
    beachTm.classList.toggle('is-current', cur === stops.length);

    /* the Jeep */
    var vn = clamp(speed / 45, 0, 1.4);
    var acc = (speed - speedPrev) / dt; speedPrev = speed;
    if (acc < -22 && speed > 1.5) brakeT = 0.45;
    if (a > 0.05 && a < 0.95) brakeT = 0.2;
    brakeT = Math.max(0, brakeT - dt);
    jeep.classList.toggle('braking', brakeT > 0);
    var bounce = (Math.sin(time * 23) * 0.6 + Math.sin(time * 37 + 1) * 0.4) * (0.6 + vn * 3.2);
    var curve = World.curvature(cam);
    var steer = clamp(-curve * 140, -6, 6);
    jeep.style.setProperty('--bounce', bounce.toFixed(2) + 'px');
    jeep.style.setProperty('--roll', (Math.sin(time * 11) * vn * 0.9 + steer * 0.25).toFixed(2) + 'deg');
    jeep.style.setProperty('--steer', (steer * 2.4).toFixed(1) + 'px');

    /* dust and air */
    var jr = jeepBox;
    World.fx({
      dt: dt, time: time, speed: Math.max(0, speed), t: t, sand: World.sandAt(cam + 3),
      wheels: [[jr.x + jr.w * 0.18, jr.y + jr.h * 0.92], [jr.x + jr.w * 0.82, jr.y + jr.h * 0.92]],
      exhaust: [jr.x + jr.w * 0.25, jr.y + jr.h * 0.86]
    });
  }

  var jeepBox = { x: 0, y: 0, w: 0, h: 0 };
  function measureJeep() {
    var r = jeep.getBoundingClientRect();
    jeepBox = { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  /* ── click a guide and they say hello ── */
  function hitAt(x, y) {
    var hs = World.hits();
    for (var i = hs.length - 1; i >= 0; i--) {
      var h = hs[i];
      if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return stops[h.k];
    }
    return null;
  }
  worldCanvas.addEventListener('pointermove', function (e) {
    worldCanvas.style.cursor = hitAt(e.clientX, e.clientY) ? 'pointer' : '';
  });
  worldCanvas.addEventListener('click', function (e) {
    var s = hitAt(e.clientX, e.clientY);
    if (s) { s.hop = 1; s.bubble = 1; }
  });

  /* ======================================================================
     8. SIZING
     ====================================================================== */
  var lastW = 0, lastH = 0;
  function resize(force) {
    var W = window.innerWidth;
    var H = Math.max(window.innerHeight, document.documentElement.clientHeight);
    // ignore the mobile URL bar sliding in and out
    if (!force && W === lastW && Math.abs(H - lastH) < 140) return;
    var frac = timeline.total > 1 ? window.scrollY / timeline.total : 0;
    lastW = W; lastH = H;
    layout.H = H;
    var dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 1.75);
    World.resize(W, H, dpr);
    computeLayout();
    buildTimeline();
    measureJeep();
    if (frac > 0 && !force) window.scrollTo(0, frac * timeline.total);
    if (reduced) World.render({ camZ: 30, t: 0.15, time: 0, speed: 0, dyn: [] });
  }

  function goScroll(y) {
    window.scrollTo({ top: Math.round(y), behavior: reduced ? 'auto' : 'smooth' });
  }

  /* ======================================================================
     9. ROUTER
     ====================================================================== */
  var views = { park: park, plain: $('#view-plain') };
  var wasPlain = null;

  function route() {
    var plain = location.hash.replace(/^#/, '') === '/resume';
    views.plain.hidden = !plain;
    views.park.hidden = plain;
    root.classList.toggle('is-plain', plain);
    document.title = plain ? R.name + ' — Resume' : R.name + ' — Suh-rassic Park';
    if (wasPlain !== null && wasPlain !== plain) window.scrollTo(0, 0);
    wasPlain = plain;
    if (!plain && !reduced) {
      resize(true);
      if (!running) { running = true; last = 0; requestAnimationFrame(frame); }
    } else {
      running = false;
      if (!plain) resize(true);
    }
  }

  /* ======================================================================
     10. GO
     ====================================================================== */
  renderPlain();
  fillHero();
  buildTour();
  World.init(worldCanvas, reduced ? null : fxCanvas, { zEnd: zEnd, density: window.innerWidth < 700 ? 0.65 : 1 });
  buildTrailMap();

  $('#btn-park').addEventListener('click', function () { if (beats[0]) goScroll(beats[0].s); });
  $('#hero-cue').addEventListener('click', function () { if (beats[0]) goScroll(beats[0].s); });
  $('#btn-again').addEventListener('click', function () { goScroll(0); });
  $('#brand').addEventListener('click', function (e) { e.preventDefault(); goScroll(0); });

  /* Keyboard users tab through the signs; bring each one into view. */
  beats.forEach(function (b) {
    b.el.addEventListener('focusin', function () { if (!reduced) window.scrollTo(0, b.s); });
  });
  hero.addEventListener('focusin', function () { if (!reduced && window.scrollY > 10) window.scrollTo(0, 0); });
  arrival.addEventListener('focusin', function () { if (!reduced) window.scrollTo(0, timeline.total); });

  window.addEventListener('resize', function () { resize(false); });
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', function () { last = 0; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measureJeep(); });

  route();
  requestAnimationFrame(function () { root.classList.add('ready'); });

  /* for poking at from the console: SuhTour.go(3) drives to the 4th sign */
  window.SuhTour = {
    signs: function () { return beats.map(function (b) { return Math.round(b.s); }); },
    go: function (i) { window.scrollTo(0, i < 0 ? timeline.total : beats[i].s); }
  };
})();
