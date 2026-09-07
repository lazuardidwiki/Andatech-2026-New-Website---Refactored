/*
 * Andatech homepage behaviour — how-it-works stepper, solutions marquee + accordion,
 * carousel dots, solutions image stack, trust stats counter, proof stats counter.
 *
 * Extracted from andatech-home.js on 2026-09-05 as the final split of the modular
 * refactor. Loaded by every homepage section — each guards its own targets so the
 * modules that don't apply to a given page no-op.
 */
(function () {
  "use strict";

  if (window.__atHomepageInitialised) return;
  window.__atHomepageInitialised = true;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ══════════════════════════════════════════════
     3. HOW-IT-WORKS STEPPER
     ══════════════════════════════════════════════ */
  var steps = [].slice.call(document.querySelectorAll(".at-stepper__step"));
  if (steps.length) {
    var setOpen = function (step) {
      steps.forEach(function (s) {
        var on = s === step;
        s.classList.toggle("at-stepper__step--active", on);
        var row = s.querySelector(".at-stepper__row");
        if (row) row.setAttribute("aria-expanded", String(on));
        var week = s.querySelector(".at-stepper__week");
        if (week) week.hidden = !on;
      });
    };
    steps.forEach(function (s) {
      var row = s.querySelector(".at-stepper__row");
      if (!row) return;
      row.setAttribute(
        "aria-expanded",
        String(s.classList.contains("at-stepper__step--active"))
      );
      row.addEventListener("click", function () {
        setOpen(s);
      });
    });
  }

  /* ══════════════════════════════════════════════
     4. SOLUTIONS — hover marquee
     Slides in from whichever edge the pointer crossed, mirroring the
     FlowingMenu behaviour on the Know Before You Go page.
     ══════════════════════════════════════════════ */
  var rows = [].slice.call(document.querySelectorAll(".at-solutions__trigger"));
  rows.forEach(function (row) {
    var m = row.querySelector(".at-solutions__marquee");
    if (!m) return;

    // Which horizontal edge is the pointer nearest on enter/leave?
    var edge = function (ev) {
      var r = row.getBoundingClientRect();
      var y = ev.clientY - r.top;
      return y < r.height / 2 ? "-101%" : "101%";
    };

    row.addEventListener("mouseenter", function (ev) {
      m.style.transition = "none";
      m.style.setProperty("--at-marquee-y", edge(ev));
      // force a reflow so the parked position is committed before animating
      void m.offsetHeight;
      m.style.transition = "";
      m.style.setProperty("--at-marquee-y", "0%");
    });

    row.addEventListener("mouseleave", function (ev) {
      m.style.setProperty("--at-marquee-y", edge(ev));
    });
  });

  // Scrolling doesn't fire mouseleave, which otherwise leaves a marquee
  // stuck open. Park them all as soon as a scroll begins.
  window.addEventListener("scroll", function () {
    rows.forEach(function (row) {
      var m = row.querySelector(".at-solutions__marquee");
      if (m) m.style.setProperty("--at-marquee-y", "101%");
    });
  }, { passive: true });

  /* Preload the body images of a closed accordion row on hover, so they are
     already in cache by the time the user clicks. Fixes the "opens then waits
     for image" pause caused by lazy-loaded images inside a collapsed <details>. */
  [].slice.call(document.querySelectorAll(".at-solutions__item")).forEach(function (item) {
    var trigger = item.querySelector(".at-solutions__trigger");
    if (!trigger) return;
    var warm = function () {
      [].slice.call(item.querySelectorAll(".at-solutions__stack img, .at-solutions__body-media > img")).forEach(function (img) {
        if (img.dataset.warmed) return;
        img.dataset.warmed = "1";
        var pre = new Image();
        pre.src = img.currentSrc || img.src;
      });
      trigger.removeEventListener("mouseenter", warm);
      trigger.removeEventListener("focusin", warm);
    };
    trigger.addEventListener("mouseenter", warm, { once: false });
    trigger.addEventListener("focusin", warm, { once: false });
  });

  /* ══════════════════════════════════════════════
     5. SOLUTIONS — accordion continuity
     Native <details> changes state immediately. Animate its body height here
     so opening and closing keep the same direct interaction but feel connected.
     ══════════════════════════════════════════════ */
  [].slice.call(document.querySelectorAll(".at-solutions__item")).forEach(function (item) {
    var trigger = item.querySelector(".at-solutions__trigger");
    var body = item.querySelector(".at-solutions__body");
    if (!trigger || !body) return;

    var animation;
    var openTarget = item.open;
    var clearInlineHeight = function () {
      body.style.height = "";
      body.style.overflow = "";
      body.style.opacity = "";
    };

    trigger.addEventListener("click", function (event) {
      event.preventDefault();

      if (animation) animation.cancel();
      var isOpening = !openTarget;
      openTarget = isOpening;

      if (reduced) {
        item.open = isOpening;
        openTarget = isOpening;
        clearInlineHeight();
        return;
      }

      if (isOpening) {
        item.open = true;
        item.classList.add("at-is-open-target");
        item.classList.remove("at-is-close-target");
        body.style.overflow = "hidden";
        body.style.height = "0px";
        body.style.opacity = "0";
        var endHeight = body.scrollHeight;
        animation = body.animate(
          [{ height: "0px", opacity: 0 }, { height: endHeight + "px", opacity: 1 }],
          { duration: 240, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }
        );
        animation.onfinish = function () {
          animation = null;
          openTarget = true;
          item.classList.remove("at-is-open-target");
          clearInlineHeight();
        };
      } else {
        item.classList.add("at-is-close-target");
        item.classList.remove("at-is-open-target");
        var startHeight = body.getBoundingClientRect().height;
        body.style.overflow = "hidden";
        body.style.height = startHeight + "px";
        animation = body.animate(
          [{ height: startHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
          { duration: 180, easing: "cubic-bezier(0.55, 0, 0.68, 0.3)" }
        );
        animation.onfinish = function () {
          animation = null;
          item.open = false;
          openTarget = false;
          item.classList.remove("at-is-close-target");
          clearInlineHeight();
        };
      }
    });
  });


  /* ══════════════════════════════════════════════
     6. CAROUSEL DOTS
     Any [data-at-carousel] + [data-at-dots] pair. Builds a dot per slide,
     highlights on scroll, and scrolls on click.
     ══════════════════════════════════════════════ */
  [].slice.call(document.querySelectorAll("[data-at-carousel]")).forEach(function (track) {
    var dots = document.querySelector('[data-at-dots="' + track.dataset.atCarousel + '"]');
    if (!dots) return;
    var slides = [].slice.call(track.children);
    if (slides.length < 2) { dots.style.display = "none"; return; }

    // CSS scroll-padding keeps touch scrolling inside the visual gutter, but
    // scrollTo() does not apply it automatically. Use the same inset for dot
    // navigation so every card — not only the first — lands like the Industry
    // cards instead of being flush against the track edge.
    var startInset = function () {
      return parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
    };
    var targetFor = function (slide) {
      return Math.max(0, slide.offsetLeft - track.offsetLeft - startInset());
    };

    dots.innerHTML = "";
    slides.forEach(function (slide, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Go to slide " + (i + 1));
      b.addEventListener("click", function () {
        track.scrollTo({ left: targetFor(slide), behavior: "smooth" });
      });
      dots.appendChild(b);
    });

    var mark = function () {
      // nearest slide to the track's left edge wins
      var best = 0, bestD = Infinity;
      slides.forEach(function (slide, i) {
        var d = Math.abs(slide.offsetLeft - track.offsetLeft - startInset() - track.scrollLeft);
        if (d < bestD) { bestD = d; best = i; }
      });
      [].slice.call(dots.children).forEach(function (b, i) {
        b.classList.toggle("at-is-on", i === best);
      });
    };
    track.addEventListener("scroll", mark, { passive: true });
    window.addEventListener("resize", mark);
    mark();
  });

  /* ══════════════════════════════════════════════
     6. SOLUTIONS IMAGE STACK
     Desktop: dots bring an image to the front (and the stack accepts a
     trackpad two-finger swipe). Mobile: the stack is a real scroller, so
     the same dots drive scrollLeft instead.
     ══════════════════════════════════════════════ */
  [].slice.call(document.querySelectorAll(".at-solutions__stack")).forEach(function (stack) {
    var imgs = [].slice.call(stack.querySelectorAll("img"));
    var dots = stack.parentElement.querySelector(".at-solutions__dots");
    if (!dots || imgs.length < 2) { if (dots) dots.style.display = "none"; return; }

    var isRow = function () {
      return getComputedStyle(stack).display === "flex";
    };
    var i = 0;

    var apply = function (n) {
      i = (n + imgs.length) % imgs.length;
      if (isRow()) {
        stack.scrollTo({ left: imgs[i].offsetLeft - stack.offsetLeft, behavior: "smooth" });
      } else {
        stack.setAttribute("data-active", String(i));
      }
      [].slice.call(dots.children).forEach(function (d, n2) {
        d.classList.toggle("at-is-on", n2 === i);
      });
    };

    // rebuild the dots as buttons so they're clickable and focusable
    dots.innerHTML = "";
    imgs.forEach(function (_, n) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show image " + (n + 1));
      b.addEventListener("click", function () { apply(n); });
      dots.appendChild(b);
    });
    dots.classList.add("at-dots");

    // Trackpad two-finger swipe on desktop, where there's nothing to scroll.
    // A trackpad emits a long tail of wheel events per gesture, so accumulate
    // distance and require a deliberate push before advancing — otherwise one
    // gentle flick skips several images.
    var travel = 0, lock = false, decay;
    var THRESHOLD = 70;    // px of horizontal intent before we move
    var COOLDOWN = 350;    // ms of quiet before the next step can fire

    stack.addEventListener("wheel", function (ev) {
      if (isRow()) return;                                     // mobile scrolls natively
      if (Math.abs(ev.deltaX) < Math.abs(ev.deltaY) * 1.5) return; // mostly vertical = page scroll
      ev.preventDefault();
      if (lock) return;

      travel += ev.deltaX;
      clearTimeout(decay);
      decay = setTimeout(function () { travel = 0; }, 200);     // gesture ended

      if (Math.abs(travel) < THRESHOLD) return;
      apply(i + (travel > 0 ? 1 : -1));
      travel = 0;
      lock = true;
      setTimeout(function () { lock = false; }, COOLDOWN);
    }, { passive: false });

    stack.addEventListener("scroll", function () {
      if (!isRow()) return;
      var best = 0, bestD = Infinity;
      imgs.forEach(function (img, n) {
        var d = Math.abs(img.offsetLeft - stack.offsetLeft - stack.scrollLeft);
        if (d < bestD) { bestD = d; best = n; }
      });
      i = best;
      [].slice.call(dots.children).forEach(function (d, n) {
        d.classList.toggle("at-is-on", n === best);
      });
    }, { passive: true });

    apply(0);
  });

  /* Trust stats — flip + count-up, re-fires every enter */
  var trustNums = document.querySelectorAll(".at-trust__number");
  var reducedTrust = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (trustNums.length && !reducedTrust && "IntersectionObserver" in window) {
    var trustEase = function (t) { return 1 - Math.pow(1 - t, 3); };
    var trustCountUp = function (el, target, duration) {
      if (target === 0) { el.textContent = "0"; return; }
      var start = performance.now();
      var step = function (now) {
        var t = Math.min((now - start) / duration, 1);
        el.textContent = String(Math.round(target * trustEase(t)));
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    };
    var trustIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var num = e.target;
        var counter = num.querySelector(".at-trust__count");
        if (e.isIntersecting) {
          if (num._flipped) return;
          num._flipped = true;
          num.classList.add("is-flipped");
          if (counter) {
            var target = parseInt(counter.getAttribute("data-at-count-to"), 10) || 0;
            setTimeout(function () { trustCountUp(counter, target, 900); }, 60);
          }
        } else {
          num._flipped = false;
          num.classList.remove("is-flipped");
          if (counter) counter.textContent = "0";
        }
      });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(trustNums, function (n) { trustIO.observe(n); });
  }


  /* Proof stats — flip-in reveal + count-up */
  var statGroups = document.querySelectorAll(".at-proof__stats");
  var reducedProof = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (statGroups.length && !reducedProof && "IntersectionObserver" in window) {
    var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
    var countUp = function (el, target, duration) {
      if (target === 0) { el.textContent = "0"; return; }
      var start = performance.now();
      var step = function (now) {
        var t = Math.min((now - start) / duration, 1);
        el.textContent = String(Math.round(target * easeOutCubic(t)));
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    };
    var revealStats = function (group) {
      if (group._flipped) return;
      group._flipped = true;
      var nums = group.querySelectorAll(".at-proof__stat-num");
      Array.prototype.forEach.call(nums, function (num, i) {
        num.style.transitionDelay = (i * 110) + "ms";
        num.classList.add("is-in");
        var counter = num.querySelector(".at-proof__stat-count");
        if (counter) {
          var target = parseInt(counter.getAttribute("data-at-count-to"), 10) || 0;
          setTimeout(function () { countUp(counter, target, 1000); }, i * 110 + 120);
        }
      });
    };
    var resetStats = function (group) {
      group._flipped = false;
      var nums = group.querySelectorAll(".at-proof__stat-num");
      Array.prototype.forEach.call(nums, function (num) {
        num.classList.remove("is-in");
        var counter = num.querySelector(".at-proof__stat-count");
        if (counter) counter.textContent = "0";
      });
    };
    var statIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) revealStats(e.target);
        else resetStats(e.target);
      });
    }, { threshold: 0.3 });
    Array.prototype.forEach.call(statGroups, function (g) { statIO.observe(g); });
  }

})();
