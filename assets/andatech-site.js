/*
 * Andatech homepage behaviour.
 *
 * Hand-authored for the theme: no bundler, no dependencies. The prototype used
 * the `motion` package; here the same transitions are driven by CSS and this
 * file only toggles classes, so it drops straight into assets/.
 *
 * Every class is `at-` prefixed to match andatech-site.css.
 * Loaded with defer; guards on every lookup so it no-ops on pages without a
 * header or a stepper.
 */
(function () {
  "use strict";

  // This file is referenced by several modular Shopify sections. Browsers run
  // every matching <script> tag, which used to attach multiple burger handlers
  // and could toggle the drawer open and closed in one tap. Initialise once,
  // while keeping each section independently usable in the Theme Editor.
  if (window.__atSiteInitialised) return;
  window.__atSiteInitialised = true;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) document.documentElement.classList.add("at-no-motion");


  /* ══════════════════════════════════════════════
     3. SCROLL REVEAL
     ══════════════════════════════════════════════ */
  if (!reduced) {
    var rise = [].slice.call(document.querySelectorAll("[data-at-rise]"));
    if (rise.length) {
      document.documentElement.classList.add("at-js-reveal");

      rise.forEach(function (el) {
        var sibs = el.parentElement
          ? [].slice.call(el.parentElement.querySelectorAll(":scope > [data-at-rise]"))
          : [el];
        el._i = Math.max(0, sibs.indexOf(el));
      });

      var io = null;
      var show = function (el) {
        if (el._shown) return;
        el._shown = true;
        if (io) io.unobserve(el);
        el.style.transitionDelay = Math.min(el._i, 6) * 0.07 + "s";
        el.classList.add("at-is-in");
      };

      io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) show(e.target);
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0 }
      );
      rise.forEach(function (el) {
        io.observe(el);
      });

      // Belt and braces: anything already in view on load reveals immediately.
      var sync = function () {
        var vh = window.innerHeight;
        rise.forEach(function (el) {
          if (!el._shown && el.getBoundingClientRect().top < vh * 0.95) show(el);
        });
      };
      window.addEventListener("load", sync);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
      sync();
    }
  }


})();
