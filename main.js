/* ==========================================================================
   main.js — router, renderer, and the jungle's proximity engine.
   Reads window.RESUME (see resume.js). No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var R = window.RESUME;
  if (!R) { document.body.innerHTML = '<p style="padding:2rem">resume.js failed to load.</p>'; return; }

  var bySlug = {};
  R.categories.forEach(function (c) { bySlug[c.slug] = c; });

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse  = window.matchMedia('(hover: none)');

  /* ======================================================================
     1. PLAIN RESUME
     ====================================================================== */
  function bullets(list) {
    var ul = el('ul', 'r-bullets');
    list.forEach(function (b) { ul.appendChild(el('li', null, b)); });
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

  /* Renders one category's content. Handles whichever of
     groups / roles / bullets happen to be present. */
  function categoryBody(c) {
    var frag = document.createDocumentFragment();
    if (c.groups)  frag.appendChild(groups(c.groups));
    if (c.bullets) frag.appendChild(bullets(c.bullets));
    if (c.roles) {
      c.roles.forEach(function (role) {
        var box = el('div', 'r-role');
        var top = el('div', 'r-role__top');
        top.appendChild(el('h4', 'r-role__title', role.title));
        if (role.dates) top.appendChild(el('span', 'r-role__dates', role.dates));
        box.appendChild(top);
        if (role.bullets) box.appendChild(bullets(role.bullets));
        frag.appendChild(box);
      });
    }
    return frag;
  }

  function renderPlain() {
    $('#r-name').textContent     = R.name;
    $('#r-headline').textContent = R.headline;
    $('#r-location').textContent = R.location;
    $('#r-summary').textContent  = R.summary;

    var links = $('#r-links');
    R.links.forEach(function (l) {
      var a = el('a', null, l.label);
      a.href = l.href;
      a.rel = 'me noopener';
      links.appendChild(a);
    });

    var body = $('#r-body'), currentSection = null, section = null;

    R.categories.forEach(function (c) {
      if (c.section !== currentSection) {
        currentSection = c.section;
        section = el('section', 'r-section');
        section.appendChild(el('h2', 'r-section__head', c.section));
        body.appendChild(section);
      }

      var entry = el('article', 'r-entry');
      var top   = el('div', 'r-entry__top');
      top.appendChild(el('h3', 'r-entry__title', c.title));
      if (c.dates) top.appendChild(el('span', 'r-entry__dates', c.dates));
      entry.appendChild(top);
      if (c.subtitle) entry.appendChild(el('p', 'r-entry__sub', c.subtitle));
      entry.appendChild(categoryBody(c));
      section.appendChild(entry);
    });
  }

  /* ======================================================================
     2. CLEARING
     ====================================================================== */
  function renderClearing(slug) {
    var c = bySlug[slug];
    var box = $('#clearing-body');
    box.textContent = '';

    box.appendChild(el('p', 'clearing__creature', 'You found ' + c.creature));

    var top = el('div', 'r-entry__top');
    top.appendChild(el('h1', 'r-entry__title', c.title));
    if (c.dates) top.appendChild(el('span', 'r-entry__dates', c.dates));
    box.appendChild(top);
    if (c.subtitle) box.appendChild(el('p', 'r-entry__sub', c.subtitle));
    if (c.blurb)    box.appendChild(el('p', 'clearing__blurb', c.blurb));
    box.appendChild(categoryBody(c));

    if (c.showLinks) {
      var row = el('div', 'clearing__links');
      R.links.forEach(function (l) {
        var a = el('a', 'btn', l.label);
        a.href = l.href; a.rel = 'me noopener';
        row.appendChild(a);
      });
      box.appendChild(row);
    }

    var nav = $('#clearing-nav');
    nav.textContent = '';
    nav.appendChild(el('p', 'clearing__nav-label', 'Other clearings'));
    R.categories.forEach(function (o) {
      var a = el('a', null, o.chip);
      a.href = '#/jungle/' + o.slug;
      if (o.slug === slug) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
  }

  /* ======================================================================
     3. THE JUNGLE — proximity peek
     ====================================================================== */
  var stage       = $('#stage');
  var stageScroll = $('#stage-scroll');
  var hots = [];

  Array.prototype.forEach.call(document.querySelectorAll('.hot'), function (node) {
    node.style.setProperty('--dx', (node.dataset.dx || 40) + 'px');
    node.style.setProperty('--dy', (node.dataset.dy || -12) + 'px');
    node.style.setProperty('--dr', (node.dataset.dr || -4) + 'deg');
    hots.push({
      slug: node.dataset.slug,
      node: node,
      hit: node.querySelector('.hot__hit'),
      cx: 0, cy: 0,
      cur: 0, target: 0,
      pinned: false
    });
  });

  function measure() {
    hots.forEach(function (h) {
      var r = h.hit.getBoundingClientRect();
      h.cx = r.left + r.width / 2;
      h.cy = r.top + r.height / 2;
    });
  }

  var pointer = { x: -9999, y: -9999, active: false };
  var running = false;

  function smoothstep(t) { return t * t * (3 - 2 * t); }

  function computeTargets() {
    var outer = Math.min(window.innerWidth, window.innerHeight) * 0.30;
    var inner = outer * 0.28;
    hots.forEach(function (h) {
      if (h.pinned) { h.target = 1; return; }
      if (!pointer.active) { h.target = 0; return; }
      var d = Math.hypot(h.cx - pointer.x, h.cy - pointer.y);
      var t = (outer - d) / (outer - inner);
      h.target = smoothstep(Math.max(0, Math.min(1, t)));
    });
  }

  /* Eased over time as well as over distance — a dino leans out and settles
     back rather than snapping. This is the whole feel of the thing. */
  function tick() {
    var moving = false;
    hots.forEach(function (h) {
      var d = h.target - h.cur;
      if (Math.abs(d) > 0.001) { h.cur += d * 0.16; moving = true; }
      else if (h.cur !== h.target) { h.cur = h.target; }
      h.node.style.setProperty('--p', h.cur.toFixed(4));
    });
    if (moving) { requestAnimationFrame(tick); } else { running = false; }
  }

  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

  function onPointer(e) {
    if (e.pointerType === 'touch') return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    computeTargets(); kick();
  }

  if (!reduced.matches && !coarse.matches) {
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    stageScroll.addEventListener('scroll', function () { measure(); computeTargets(); kick(); }, { passive: true });
    window.addEventListener('blur', function () { pointer.active = false; computeTargets(); kick(); });
  }
  window.addEventListener('resize', function () { measure(); computeTargets(); kick(); });

  /* Keyboard: focusing a hotspot pins it fully out, so a keyboard user gets
     the same reveal a mouse user gets — not a degraded version. */
  hots.forEach(function (h) {
    h.node.addEventListener('focus', function () { h.pinned = true; computeTargets(); kick(); });
    h.node.addEventListener('blur',  function () { h.pinned = false; computeTargets(); kick(); });
    h.node.addEventListener('click', function () { travelTo(h.slug); });
    h.node.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        travelTo(h.slug);
      }
    });
  });

  /* ======================================================================
     4. THE CAMERA — dolly in, dolly out
     ====================================================================== */
  var DIVE_MS = 620;
  var lastSlug = null;

  /* Default camera origin, so landing straight on a clearing URL and then
     going back still dollies out from somewhere sensible. */
  stage.style.setProperty('--fx', '50%');
  stage.style.setProperty('--fy', '50%');

  function setFocus(slug) {
    var h = hots.filter(function (x) { return x.slug === slug; })[0];
    if (!h) return;
    var r = h.hit.getBoundingClientRect();
    var s = stage.getBoundingClientRect();
    stage.style.setProperty('--fx', ((r.left + r.width / 2 - s.left) / s.width * 100).toFixed(2) + '%');
    stage.style.setProperty('--fy', ((r.top + r.height / 2 - s.top) / s.height * 100).toFixed(2) + '%');
  }

  function travelTo(slug) {
    lastSlug = slug;
    if (reduced.matches) { location.hash = '/jungle/' + slug; return; }
    setFocus(slug);
    stage.classList.add('is-diving');
    setTimeout(function () { location.hash = '/jungle/' + slug; }, DIVE_MS);
  }

  /* Jump instantly to the zoomed state, then release it — the camera pulls
     back out of the clearing and into the jungle. */
  function dollyOut() {
    if (reduced.matches) return;
    stage.classList.add('is-warp', 'is-diving');
    void stage.offsetWidth;
    stage.classList.remove('is-warp');
    void stage.offsetWidth;
    stage.classList.remove('is-diving');
  }

  /* ======================================================================
     5. ROUTER
     ====================================================================== */
  var views = {
    plain:    $('#view-plain'),
    jungle:   $('#view-jungle'),
    clearing: $('#view-clearing')
  };
  var prev = null;

  function parse() {
    var h = location.hash.replace(/^#/, '');
    if (!h || h === '/') return { view: 'plain' };
    if (h === '/jungle') return { view: 'jungle' };
    var m = h.match(/^\/jungle\/(.+)$/);
    if (m && bySlug[m[1]]) return { view: 'clearing', slug: m[1] };
    return { view: 'plain' };
  }

  function route() {
    var r = parse();

    views.plain.hidden    = r.view !== 'plain';
    views.jungle.hidden   = r.view !== 'jungle';
    views.clearing.hidden = r.view !== 'clearing';

    document.documentElement.style.overflow = (r.view === 'jungle') ? 'hidden' : '';

    if (r.view === 'plain') {
      document.title = R.name + ' — Resume';
      stage.classList.remove('is-diving', 'is-warp');
    }

    if (r.view === 'jungle') {
      document.title = R.name + ' — the jungle';
      measure();
      if (prev === 'clearing') { dollyOut(); }
      else { stage.classList.remove('is-diving', 'is-warp'); }
      // Centre the scene on phones, where it is wider than the screen.
      if (prev !== 'clearing') {
        stageScroll.scrollLeft = (stageScroll.scrollWidth - stageScroll.clientWidth) / 2;
      }
      if (prev === 'clearing' && lastSlug) {
        var h = hots.filter(function (x) { return x.slug === lastSlug; })[0];
        if (h) h.node.focus({ preventScroll: true });
      }
      pointer.active = false;
      computeTargets(); kick();
    }

    if (r.view === 'clearing') {
      lastSlug = r.slug;
      renderClearing(r.slug);
      document.title = bySlug[r.slug].title + ' — ' + R.name;
      window.scrollTo(0, 0);
      stage.classList.remove('is-diving', 'is-warp');
      $('#clearing-body').focus({ preventScroll: true });
    }

    prev = r.view;
  }

  /* ======================================================================
     6. GO
     ====================================================================== */
  renderPlain();
  $('#btn-print').addEventListener('click', function () { window.print(); });

  if (coarse.matches) {
    $('#hud-hint').textContent = 'Seven of them are hiding in here. Swipe to look around, tap one.';
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('load', measure);
  route();
})();
