/* ══════════════════════════════════════════════════════════════════════
   ANDATECH — ROI CALCULATOR SCRIPT
   ══════════════════════════════════════════════════════════════════════

   Scope: the ROI calculator (Module 7) + the ROI overlay (Module 8).
   Extracted from andatech-site.js lines 987–1174 on 2026-09-05 as part of
   the andatech-home split refactor.

   Loaded ONCE per section that uses it. Self-guarding: both blocks query
   [data-at-roi-calc] / [data-at-roi-modal], which return empty NodeLists
   on pages without those markers. Safe no-op there.

   Only outer-scope dependency in the original monolith was `reduced`
   (prefers-reduced-motion check). Re-declared here so the file is
   fully standalone.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ══════════════════════════════════════════════
     7. ROI CALCULATOR  — wireframe screen 10

     The model is deliberately transparent: every driver is a line item the
     customer can see, and every rate comes from the section settings so
     Andatech supplies its own figures rather than inheriting numbers invented
     here. Recalculates live on input; the Calculate button just re-triggers
     the reveal for people who expect to press something.
     ══════════════════════════════════════════════ */
  [].slice.call(document.querySelectorAll("[data-at-roi]")).forEach(function (root) {
    var amountEl = root.querySelector("[data-at-roi-amount]");
    var shareEl  = root.querySelector("[data-at-roi-share]");
    var resultEl = root.querySelector("[data-at-roi-result]");
    if (!amountEl || !resultEl) return;

    var num = function (name, fallback) {
      var v = parseFloat(root.getAttribute("data-at-roi-" + name));
      return isFinite(v) ? v : fallback;
    };

    /* Rates, all overridable from the theme customiser. */
    var RATE = {
      calibration: num("rate-calibration", 0),
      adminHours:  num("admin-hours", 0),
      hourly:      num("hourly-rate", 0),
      downtimeDays:num("downtime-days", 0),
      dayCost:     num("downtime-day-cost", 0),
      training:    num("training-cost", 0),
      trainedPct:  num("trained-pct", 0) / 100,
      replacement: num("replacement-cost", 0),
      auditHours:  num("audit-hours", 0),
      programPerDevice: num("program-cost-per-device", 0)
    };

    var field = function (n) { return root.querySelector('[data-at-roi-input="' + n + '"]'); };
    var val = function (n) {
      var el = field(n);
      if (!el) return 0;
      var v = parseFloat(el.value);
      return isFinite(v) && v > 0 ? v : 0;
    };

    var money = function (n) {
      return "$" + Math.round(n).toLocaleString("en-AU");
    };

    function compute() {
      var devices   = val("devices");
      var employees = val("employees");
      var perYear   = val("frequency") || 1;
      var spend     = val("spend");

      var drivers = {
        calibration: devices * perYear * RATE.calibration,
        admin:       devices * RATE.adminHours * RATE.hourly,
        downtime:    devices * RATE.downtimeDays * RATE.dayCost,
        training:    Math.round(employees * RATE.trainedPct) * RATE.training,
        replacement: devices * RATE.replacement,
        audit:       RATE.auditHours * RATE.hourly
      };

      var gross = 0;
      for (var k in drivers) if (drivers.hasOwnProperty(k)) gross += drivers[k];

      /* Net of what the managed program itself costs, when that rate is set. */
      var net = gross - devices * RATE.programPerDevice;
      if (net < 0) net = 0;

      return { drivers: drivers, gross: gross, net: net, spend: spend };
    }

    /* Count-up. Short, eased, and skipped entirely under reduced motion. */
    var raf = null, shown = 0;
    function render(target) {
      if (raf) cancelAnimationFrame(raf);
      if (reduced) { shown = target; amountEl.textContent = money(target); return; }
      var from = shown, delta = target - from, t0 = null, dur = 520;
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        shown = from + delta * eased;
        amountEl.textContent = money(shown);
        if (p < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }

    function update() {
      var r = compute();
      render(r.net);

      Object.keys(r.drivers).forEach(function (k) {
        var cell = root.querySelector('[data-at-roi-driver="' + k + '"]');
        if (cell) cell.textContent = money(r.drivers[k]);
      });

      if (shareEl) {
        if (r.spend > 0 && r.net > 0) {
          shareEl.textContent =
            Math.round((r.net / r.spend) * 100) + "% of your current annual spend";
          shareEl.hidden = false;
        } else {
          shareEl.hidden = true;
        }
      }
      resultEl.setAttribute("data-at-roi-state", r.net > 0 ? "ready" : "idle");
    }

    [].slice.call(root.querySelectorAll("[data-at-roi-input]")).forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });

    update();

    /* Replay the count-up whenever the overlay opens, so the number lands
       rather than sitting there pre-computed. */
    root.addEventListener("at:roi-open", function () { shown = 0; update(); });
  });

  /* ══════════════════════════════════════════════
     8. ROI OVERLAY

     Moved to <body> on load. It must not stay inside the section wrapper:
     that wrapper carries the 0.9 zoom, and a position:fixed child of a zoomed
     box has its inset scaled too — `inset: 0` would cover 90% of the viewport
     and leave a strip down two edges.
     ══════════════════════════════════════════════ */
  [].slice.call(document.querySelectorAll("[data-at-roi-modal]")).forEach(function (modal) {
    if (modal.parentNode !== document.body) document.body.appendChild(modal);

    var opener = document.querySelector('[data-at-roi-open="' + modal.id + '"]');
    var closers = [].slice.call(modal.querySelectorAll("[data-at-roi-close]"));
    var lastFocus = null;

    function open(e) {
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      modal.hidden = false;
      /* Forced reflow, not requestAnimationFrame. Two reasons: it gives the
         transition a from-state synchronously, and rAF does not fire at all
         while the tab is backgrounded — which would leave the overlay
         permanently invisible with the page scroll-locked behind it. */
      void modal.offsetHeight;
      modal.classList.add("at-is-on");
      document.body.style.overflow = "hidden";
      modal.dispatchEvent(new CustomEvent("at:roi-open"));
      /* Focus after the class is on: while it is still visibility:hidden the
         overlay is out of the tab order and .focus() silently does nothing,
         stranding the keyboard on the page behind. */
      void modal.offsetHeight;
      var first = modal.querySelector("[data-at-roi-close]");
      if (first) first.focus();
    }

    function close() {
      modal.classList.remove("at-is-on");
      document.body.style.overflow = "";
      var done = function () { modal.hidden = true; };
      if (reduced) done();
      else setTimeout(done, 300);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (opener) opener.addEventListener("click", open);
    closers.forEach(function (b) { b.addEventListener("click", close); });

    /* Backdrop click, but not a click that started inside the panel. */
    modal.addEventListener("mousedown", function (e) {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("at-is-on")) close();
    });

    /* Keep tabbing inside the dialog while it is open. */
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = [].slice.call(modal.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

})();
