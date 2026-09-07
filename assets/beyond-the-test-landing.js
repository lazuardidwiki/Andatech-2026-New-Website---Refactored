document.addEventListener('DOMContentLoaded', function () {

  // Declared up front: `animateGauge` reads this, and it used to be declared
  // ~60 lines further down, so it was only defined by luck of setTimeout
  // ordering.
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isPhone = window.matchMedia('(max-width: 768px)').matches;

  // Restarting a CSS animation with the classic
  // `classList.remove() -> void el.offsetWidth -> classList.add()` trick
  // forces a synchronous layout flush every time it runs. Both counters
  // below called it from inside a requestAnimationFrame loop, i.e. a forced
  // reflow on every animated frame. The Web Animations API rewinds the same
  // animation without reading layout at all.
  function restartFlip(el){
    el.classList.add('is-flipping');
    if (el.getAnimations){
      var anims = el.getAnimations();
      for (var i = 0; i < anims.length; i++) anims[i].currentTime = 0;
    }
  }

  // Evaluates a CSS-style cubic-bezier timing function. Newton-Raphson on the
  // x-polynomial to invert the parametric curve — the same approach browsers
  // use internally. Mirrors the helper in beyond-the-test-assessment.liquid.
  function cubicBezier(p1x, p1y, p2x, p2y) {
    function coA(a1, a2) { return 1 - 3 * a2 + 3 * a1; }
    function coB(a1, a2) { return 3 * a2 - 6 * a1; }
    function coC(a1)     { return 3 * a1; }
    function calc(t, a1, a2)  { return ((coA(a1, a2) * t + coB(a1, a2)) * t + coC(a1)) * t; }
    function slope(t, a1, a2) { return 3 * coA(a1, a2) * t * t + 2 * coB(a1, a2) * t + coC(a1); }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, p1x, p2x);
        if (s === 0) break;
        t -= (calc(t, p1x, p2x) - x) / s;
      }
      return calc(t, p1y, p2y);
    };
  }
  // Same curve the assessment bar uses, so the two counters on the page are
  // paced identically.
  var easeGauge = cubicBezier(0.33, 0.55, 0.45, 1);

  // Runs `cb` once the preloader overlay has begun to fade. beyond-the-test-
  // preloader.js sets the class and fires the event; the class check covers
  // the case where it already finished before this listener attached.
  function whenPreloaded(cb){
    if (document.body.classList.contains('btt-preloaded')) { cb(); return; }
    var done = false;
    function run(){ if (done) return; done = true; cb(); }
    document.addEventListener('btt:preloaded', run, { once: true });
    // Safety net: if preloader.js fails to load at all, no event ever fires
    // and the gauge would sit at 0% forever. Its own bail-out is 9s.
    setTimeout(run, 10000);
  }

  function whenFontsReady(callback){
    var called = false;
    function run(){ if (called) return; called = true; callback(); }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(run);
      // Don't let a slow font fetch hold up the reveal indefinitely.
      setTimeout(run, 800);
    } else {
      setTimeout(run, 300);
    }
  }

  // ===== Headline animation =====
  function initHeadlineAnimation(){
    var lines = document.querySelectorAll('.js-heading-line');
    var stagger = 120;

    lines.forEach(function(line, i){
      setTimeout(function(){
        line.classList.add('is-in');
      }, i * stagger);
    });

    var revealDuration = (lines.length - 1) * stagger + 700;

    setTimeout(function(){
      lines.forEach(function(line){
        line.classList.add('is-flowing');
      });
    }, revealDuration + 200);

    return revealDuration;
  }

  // ===== Widget card: static perspective stays via CSS (rotateX(4deg) rotateY(-6deg)).
  // Mousemove wobble removed per Keith's revision — card no longer tracks cursor.
  // Border glow (::before) stays CSS-driven, untouched.
  // Hover glare DOES still track cursor position (just the light spot, not rotation). =====
  var tiltCard = document.getElementById('btt-tilt-card');
  if (tiltCard && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    tiltCard.addEventListener('mousemove', function(e){
      var rect = tiltCard.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      tiltCard.style.setProperty('--glare-x', (x / rect.width * 100) + '%');
      tiltCard.style.setProperty('--glare-y', (y / rect.height * 100) + '%');
    });
  }

  // ===== Gauge animation =====
  function animateGauge(){
    var gaugeFill = document.querySelector('.btt-widget__gauge-fill');
    var gaugeValueEl = document.querySelector('.btt-widget__gauge-value');
    var gaugeStatusEl = document.querySelector('.btt-widget__gauge-status');
    if (!gaugeFill || !gaugeValueEl || !gaugeStatusEl) return;

    var target = parseInt(gaugeValueEl.dataset.target || '100', 10);
    var tiers = [
      { max: 25,  label: gaugeStatusEl.dataset.tier1 || 'Early stage' },
      { max: 50,  label: gaugeStatusEl.dataset.tier2 || 'Developing' },
      { max: 75,  label: gaugeStatusEl.dataset.tier3 || 'Progressing well' },
      { max: 100, label: gaugeStatusEl.dataset.tier4 || 'Strong maturity' }
    ];

    function colorForProgress(pct){
      var red=[239,68,68], teal=[70,190,196], green=[149,193,31];
      var c1, c2, t;
      if (pct <= 50){ c1=red; c2=teal; t=pct/50; }
      else { c1=teal; c2=green; t=(pct-50)/50; }
      return 'rgb('+Math.round(c1[0]+(c2[0]-c1[0])*t)+','+Math.round(c1[1]+(c2[1]-c1[1])*t)+','+Math.round(c1[2]+(c2[2]-c1[2])*t)+')';
    }
    function labelForProgress(pct){
      for (var i=0;i<tiers.length;i++) if (pct<=tiers[i].max) return tiers[i].label;
      return tiers[tiers.length-1].label;
    }

    if (reduceMotion){
      gaugeFill.style.setProperty('--score', target);
      gaugeFill.style.stroke = colorForProgress(target);
      gaugeValueEl.textContent = target + '%';
      gaugeStatusEl.textContent = labelForProgress(target);
      return;
    }

    // Was 8000ms, then 2600ms. Now 4000ms with a gentler curve, matching the
    // assessment bar.
    //
    // The old easing was `1 - (1-t)^3`, a strong ease-out that reached 25% in
    // the first 240ms. That flashed the "Early stage" and "Developing" status
    // labels past faster than they could be read, then parked on the final
    // one for the remaining 1.6s. Stretching the duration alone would not
    // have fixed it — the curve front-loads the travel regardless of length.
    // This curve gives roughly 570 / 560 / 690ms to the first three labels.
    var duration = 4000, startTime = null, lastInt = -1, lastLabel = '';
    function step(ts){
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = easeGauge(progress);
      var current = eased * target;
      var currentInt = Math.round(current);
      gaugeFill.style.setProperty('--score', current);

      // `stroke` and the status label were both rewritten on every single
      // frame, each write invalidating style for the element. They only
      // change when the rounded value does.
      if (currentInt !== lastInt){
        lastInt = currentInt;
        gaugeFill.style.stroke = colorForProgress(current);
        gaugeValueEl.textContent = currentInt + '%';
        restartFlip(gaugeValueEl);

        var label = labelForProgress(current);
        if (label !== lastLabel){
          lastLabel = label;
          gaugeStatusEl.textContent = label;
        }
      }
      if (progress < 1){ requestAnimationFrame(step); }
      else {
        gaugeFill.style.setProperty('--score', target);
        gaugeFill.style.stroke = colorForProgress(target);
        gaugeValueEl.textContent = target + '%';
        gaugeStatusEl.textContent = labelForProgress(target);
      }
    }
    requestAnimationFrame(step);
  }

  // ===== Hero load-in sequence =====
  function runHeroSequence(wordsDuration){
    wordsDuration = wordsDuration || 0;
    var seqEls = document.querySelectorAll('.js-seq');
    seqEls.forEach(function(el){
      var order = parseInt(el.dataset.seq || 0, 10);
      setTimeout(function(){ el.classList.add('is-in'); }, wordsDuration + 150 + (order * 120));
    });
    var ctaGroup = document.querySelector('.js-seq-group');
    if (ctaGroup) setTimeout(function(){ ctaGroup.classList.add('is-in'); }, wordsDuration + 350);
    var widget = document.querySelector('.js-seq-widget');
    if (widget) setTimeout(function(){
      widget.classList.add('is-in');
      // The gauge count-up waits for the preloader rather than starting with
      // the rest of the hero sequence. This sequence is driven by
      // document.fonts.ready, which typically resolves well before the
      // preloader's window.load, so the ring used to do most of its travel
      // hidden behind the overlay and was nearly complete by the time anyone
      // could see it.
      whenPreloaded(animateGauge);
    }, wordsDuration + 250);
  }

  whenFontsReady(function(){
    var revealDuration = initHeadlineAnimation();
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        runHeroSequence(revealDuration);
      });
    });
  });

  // ===== Hero parallax — desktop only =====
  var heroInner = document.querySelector('.btt-hero__inner');
  var heroSection = document.querySelector('.btt-hero');
  var parallaxFactor = 0.25;
  var ticking = false;
  // Cache the hero height so the scroll loop never forces a layout read per frame.
  var heroHeight = heroSection ? heroSection.offsetHeight : 0;

  function isDesktopParallax(){ return window.innerWidth > 1024; }
  function resetParallax(){ if (!heroInner) return; heroInner.style.transform=''; heroInner.style.opacity=''; }
  function updateParallax(){
    if (!heroInner || !heroSection || reduceMotion) return;
    if (!isDesktopParallax()){ resetParallax(); ticking=false; return; }
    var scrollY = window.scrollY;
    if (scrollY < heroHeight){
      heroInner.style.transform = 'translateY(' + (-Math.round(scrollY * parallaxFactor)) + 'px)';
      heroInner.style.opacity = Math.max(1 - (scrollY / heroHeight) * 1.2, 0);
    }
    ticking = false;
  }
  function requestParallaxUpdate(){ if (!ticking){ requestAnimationFrame(updateParallax); ticking=true; } }
  if (!reduceMotion){
    window.addEventListener('scroll', requestParallaxUpdate, { passive:true });
    window.addEventListener('resize', function(){
      heroHeight = heroSection ? heroSection.offsetHeight : 0;
      if (!isDesktopParallax()) resetParallax();
    }, { passive:true });
  }

  // ===== Count-up stats =====
  function animateCountUp(el){
    var raw = el.textContent.trim();
    var match = raw.match(/^([\d,]+)(.*)$/);
    if (!match) return;
    var targetNum = parseInt(match[1].replace(/,/g,''), 10);
    var suffix = match[2];
    var duration = 1400, startTime = null, lastInt = -1;
    function step(ts){
      if (!startTime) startTime = ts;
      var progress = Math.min((ts-startTime)/duration, 1);
      var current = Math.floor((1-Math.pow(1-progress,3)) * targetNum);
      if (current !== lastInt){
        el.textContent = current.toLocaleString() + suffix;
        restartFlip(el);
        lastInt = current;
      }
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = targetNum.toLocaleString() + suffix;
    }
    requestAnimationFrame(step);
  }
  var statNumbers = document.querySelectorAll('.btt-stats__number');
  if (statNumbers.length && 'IntersectionObserver' in window){
    var statObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){ animateCountUp(entry.target); statObserver.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    statNumbers.forEach(function(el){ statObserver.observe(el); });
  }

  // ===== Nav menu — smooth sliding hover highlight =====
  var menuPill = document.querySelector('.btt-nav__menu-pill');
  if (menuPill) {
    var menuHighlight = document.createElement('div');
    menuHighlight.className = 'btt-nav__menu-highlight';
    menuPill.insertBefore(menuHighlight, menuPill.firstChild);
    var menuLinks = Array.from(menuPill.querySelectorAll('a'));

    function moveMenuHighlight(el){
      var pillRect = menuPill.getBoundingClientRect();
      var elRect = el.getBoundingClientRect();
      menuHighlight.style.width = elRect.width + 'px';
      menuHighlight.style.transform = 'translateX(' + (elRect.left - pillRect.left - 6) + 'px)';
      menuHighlight.classList.add('is-active');
    }

    menuLinks.forEach(function(link){
      link.addEventListener('mouseenter', function(){ moveMenuHighlight(link); });
    });
    menuPill.addEventListener('mouseleave', function(){ menuHighlight.classList.remove('is-active'); });
  }

  // ===== Nav Scroll Fix (Strict Vertical Only + Ignore Horizontal Card Sliders) =====
  var nav = document.querySelector('.btt-nav');
  var navBg = document.querySelector('.btt-nav__bg');
  var fadeDistance = 150;
  var hideThreshold = 80;
  var lastScrollY = 0;
  var navTicking = false;

  function getPageScrollY() {
    return window.pageYOffset || 
           window.scrollY || 
           (document.documentElement && document.documentElement.scrollTop) || 
           (document.body && document.body.scrollTop) || 0;
  }

  var lastNavOpacity = -1;
  var lastBlurred = null;

  function handleNavScroll() {
    navTicking = false;
    var y = getPageScrollY();

    if (navBg) {
      // Both of these were rewritten on every scroll frame. Past 150px the
      // opacity is pinned at 1 and the class never changes, so the writes
      // were pure style invalidation for the rest of the page.
      var op = Math.min(y / fadeDistance, 1);
      if (op !== lastNavOpacity) {
        lastNavOpacity = op;
        navBg.style.opacity = op;
      }
      var blurred = y > 0;
      if (blurred !== lastBlurred) {
        lastBlurred = blurred;
        navBg.classList.toggle('is-blurred', blurred);
      }
    }

    if (nav) {
      var diff = y - lastScrollY;

      // Berada di paling atas halaman -> Tampilkan Nav
      if (y <= hideThreshold) {
        nav.classList.remove('btt-nav--hidden');
      } 
      // Scroll Down -> Sembunyikan Nav
      else if (diff > 2) { 
        nav.classList.add('btt-nav--hidden');
      } 
      // Scroll Up -> Tampilkan Nav
      else if (diff < -2) { 
        nav.classList.remove('btt-nav--hidden');
      }
    }
    lastScrollY = y;
  }

  function requestNavScrollUpdate(e) {
    // ABAIKAN EVENT SCROLL DARI CARD SLIDER / CONTAINER DALAM HALAMAN
    if (e && e.target && e.target !== document && e.target !== window && e.target !== document.documentElement && e.target !== document.body) {
      return;
    }

    if (!navTicking) {
      navTicking = true;
      requestAnimationFrame(handleNavScroll);
    }
  }

  lastScrollY = getPageScrollY();
  handleNavScroll();

  // BOTH listeners are deliberate — do not remove the second one.
  //
  // I previously dropped the document/capture listener as "redundant" and it
  // broke the nav's hide-on-scroll-down. The capture listener fires on the
  // way DOWN the tree, before the event reaches its target, so it still runs
  // even if something else on the page (theme main.js, a Shopify app) stops
  // propagation on scroll during the bubble phase — which is what a plain
  // window listener depends on. That is almost certainly why the original
  // author called this block "Nav Scroll Fix".
  //
  // The cost is negligible: `requestNavScrollUpdate` rejects inner-scroller
  // events immediately via the target check, and `navTicking` collapses both
  // listeners into a single rAF per frame regardless of how many times they
  // fire.
  window.addEventListener('scroll', requestNavScrollUpdate, { passive: true });
  document.addEventListener('scroll', requestNavScrollUpdate, { passive: true, capture: true });

  // ===== Scroll reveal =====
  var revealEls = document.querySelectorAll('.reveal-left, .reveal-right');
  if (revealEls.length && 'IntersectionObserver' in window){
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){ entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.2 });
    revealEls.forEach(function(el){ observer.observe(el); });
  }

  // ===== Mobile drawer =====
  var menuToggle = document.getElementById('btt-menu-toggle');
  var drawer = document.getElementById('btt-drawer');
  var drawerOverlay = document.getElementById('btt-drawer-overlay');
  function openDrawer(){ drawer.classList.add('active'); drawerOverlay.classList.add('active'); menuToggle.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; if(nav) nav.classList.remove('btt-nav--hidden'); }
  function closeDrawer(){ drawer.classList.remove('active'); drawerOverlay.classList.remove('active'); menuToggle.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
  if (menuToggle && drawer && drawerOverlay){
    menuToggle.addEventListener('click', openDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach(function(link){ link.addEventListener('click', closeDrawer); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeDrawer(); });
  }

  // ===== Cookie preferences — reopens Shopify's native cookie banner modal.
  // Requires the Cookie banner to be enabled in Settings > Customer Privacy;
  // if a third-party consent app (CookieHub, OneTrust, etc.) is used instead,
  // this call needs to be swapped for that app's own reopen method. =====
  document.querySelectorAll('[data-cookie-preferences]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.preventDefault();
      if (window.privacyBanner && typeof window.privacyBanner.showPreferences === 'function'){
        window.privacyBanner.showPreferences();
      } else {
        console.warn('Shopify privacyBanner API not available — cookie banner may not be enabled in Settings > Customer Privacy.');
      }
    });
  });

  // ===== Remove "Shop with AI" =====
  // Scoped to direct children of <body> (childList only, no subtree) — this
  // widget is always injected as a top-level overlay, not nested inside
  // page content. Watching the full subtree would re-fire this callback on
  // every DOM change anywhere on the page (every modal open/close, every
  // Industries deck swap, every Assessment step) for the page's whole
  // lifetime, which is unnecessary overhead.
  function killShopAI(){ var el=document.getElementById('ads-agent-host'); if(el) el.remove(); }
  killShopAI();
  new MutationObserver(killShopAI).observe(document.body, { childList:true });
  window.addEventListener('resize', killShopAI);
  window.addEventListener('orientationchange', killShopAI);

});