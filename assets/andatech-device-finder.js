/* ══════════════════════════════════════════════════════════════════════
   ANDATECH — DEVICE FINDER SCRIPT
   ══════════════════════════════════════════════════════════════════════

   Scope: the Device Finder overlay only. Extracted from andatech-site.js
   module 9 (lines 1177–1507) on 2026-09-05 as the proof-of-concept for
   the andatech-home split refactor.

   Loaded ONCE from sections/andatech-device-finder.liquid, defer-loaded.
   Self-guarding: the outer querySelectorAll returns an empty NodeList
   on pages without a [data-at-device-modal], so the whole block is a
   no-op there. Safe to include on any page — but there's no reason to,
   because the section already scopes it.

   Only outer-scope dependency in the original monolith was `reduced`
   (prefers-reduced-motion check). Re-declared here so the file is
   fully standalone. No changes to the logic.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  [].slice.call(document.querySelectorAll("[data-at-device-modal]")).forEach(function (modal) {
    if (modal.parentNode !== document.body) document.body.appendChild(modal);

    var configEl = modal.querySelector("[data-at-device-config]");
    var config = {};
    try { config = JSON.parse(configEl ? configEl.textContent : "{}"); }
    catch (err) { config = {}; }

    var QUESTIONS = [
      {
        key: "test", title: "What do you need to test for?", hint: "Choose the closest match.",
        options: [
          { value: "alcohol", label: "Alcohol", note: "Breath testing and alcohol screening" },
          { value: "drugs", label: "Drugs", note: "Oral-fluid or urine screening" },
          { value: "both", label: "Both alcohol and drugs", note: "A coordinated testing setup" },
          { value: "unsure", label: "I’m not sure yet", note: "Keep the recommendation broad" }
        ]
      },
      {
        key: "method", title: "How will testing usually be carried out?", hint: "Think about the person running the test.",
        options: [
          { value: "staff", label: "By a trained staff member", note: "A supervisor or testing officer operates it" },
          { value: "unattended", label: "At an unattended testing station", note: "Workers complete screening themselves" },
          { value: "remote", label: "Across vehicles or remote workers", note: "Testing needs to travel with the team" },
          { value: "kits", label: "With single-use test kits", note: "On-site screening with consumables" },
          { value: "unsure", label: "I’m not sure", note: "Show a flexible starting point" }
        ]
      },
      {
        key: "location", title: "Where will the device be used?", hint: "Choose the setting it needs to suit most often.",
        options: [
          { value: "single", label: "At one workplace", note: "A consistent team or testing location" },
          { value: "multiple", label: "Across multiple workplaces", note: "Several sites, teams or entry points" },
          { value: "field", label: "On the road or in the field", note: "Portable use away from a fixed station" },
          { value: "personal", label: "At home or for personal use", note: "For individual alcohol testing" }
        ]
      },
      {
        key: "priority", title: "What matters most to you?", hint: "Choose up to two. We’ll use these to refine equally suitable options.", multi: true,
        options: [
          { value: "simple", label: "Simple and easy to use" },
          { value: "frequent", label: "Fast, frequent testing" },
          { value: "identity", label: "Identity verification" },
          { value: "reporting", label: "Cloud records and reporting" },
          { value: "portable", label: "Portability" },
          { value: "value", label: "Lower upfront cost" },
          { value: "unsure", label: "Help me decide" }
        ]
      }
    ];
    var VISUALS = {
      portable: '<svg viewBox="0 0 160 160" fill="none"><rect x="49" y="17" width="62" height="126" rx="18" stroke="currentColor" stroke-width="3"/><rect x="60" y="34" width="40" height="32" rx="6" fill="currentColor" opacity=".12"/><path d="M69 88h22M69 101h15" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="80" cy="124" r="6" fill="currentColor"/></svg>',
      fixed: '<svg viewBox="0 0 160 160" fill="none"><rect x="37" y="15" width="86" height="130" rx="10" stroke="currentColor" stroke-width="3"/><rect x="51" y="31" width="58" height="48" rx="6" fill="currentColor" opacity=".12"/><circle cx="80" cy="103" r="12" stroke="currentColor" stroke-width="3"/><path d="M64 129h32" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
      drug: '<svg viewBox="0 0 160 160" fill="none"><rect x="31" y="41" width="98" height="78" rx="13" stroke="currentColor" stroke-width="3"/><circle cx="57" cy="80" r="14" fill="currentColor" opacity=".12"/><path d="M88 69h23M88 82h16M49 104h62" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
      combined: '<svg viewBox="0 0 160 160" fill="none"><rect x="19" y="32" width="54" height="96" rx="14" stroke="currentColor" stroke-width="3"/><rect x="87" y="45" width="54" height="70" rx="10" stroke="currentColor" stroke-width="3"/><path d="M73 65h14M73 95h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="31" y="48" width="30" height="23" rx="5" fill="currentColor" opacity=".12"/><circle cx="46" cy="106" r="6" fill="currentColor"/><path d="M101 76h26M101 89h18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
      personal: '<svg viewBox="0 0 160 160" fill="none"><path d="M55 19h50l9 35-13 88H59L46 54l9-35Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><rect x="61" y="39" width="38" height="29" rx="6" fill="currentColor" opacity=".12"/><path d="M70 91h20M74 105h12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M68 19V9h24v10" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>'
    };

    var intro = modal.querySelector("[data-at-device-intro]");
    var questionView = modal.querySelector("[data-at-device-question]");
    var resultView = modal.querySelector("[data-at-device-result]");
    var progressWrap = modal.querySelector("[data-at-device-progress-wrap]");
    var progress = modal.querySelector("[data-at-device-progress]");
    var stepEl = modal.querySelector("[data-at-device-step]");
    var titleEl = modal.querySelector("[data-at-device-question-title]");
    var hintEl = modal.querySelector("[data-at-device-question-hint]");
    var optionsEl = modal.querySelector("[data-at-device-options]");
    var limitEl = modal.querySelector("[data-at-device-limit]");
    var backBtn = modal.querySelector("[data-at-device-back]");
    var continueBtn = modal.querySelector("[data-at-device-continue]");
    var closeBtn = modal.querySelector("[data-at-device-close]");
    var current = 0;
    var answers = {};
    var lastFocus = null;
    var advanceTimer = null;
    var oldOverflow = "";

    function setView(name) {
      if (intro) intro.hidden = name !== "intro";
      if (questionView) questionView.hidden = name !== "question";
      if (resultView) resultView.hidden = name !== "result";
      if (progressWrap) progressWrap.hidden = name === "intro";
    }

    function reset() {
      clearTimeout(advanceTimer);
      current = 0;
      answers = {};
      setView("intro");
      if (progress) progress.style.width = "0%";
    }

    function open(e) {
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      oldOverflow = document.body.style.overflow;
      reset();
      modal.hidden = false;
      void modal.offsetHeight;
      modal.classList.add("at-is-on");
      document.body.style.overflow = "hidden";
      void modal.offsetHeight;
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      clearTimeout(advanceTimer);
      modal.classList.remove("at-is-on");
      document.body.style.overflow = oldOverflow;
      var done = function () { modal.hidden = true; };
      if (reduced) done(); else setTimeout(done, 300);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function selectedValues(q) {
      var answer = answers[q.key];
      return q.multi ? (answer || []) : (answer ? [answer] : []);
    }

    function renderQuestion(index) {
      current = index;
      var q = QUESTIONS[index];
      setView("question");
      if (progress) progress.style.width = ((index / QUESTIONS.length) * 100) + "%";
      if (stepEl) stepEl.textContent = "Question " + (index + 1) + " of " + QUESTIONS.length;
      if (titleEl) titleEl.textContent = q.title;
      if (hintEl) hintEl.textContent = q.hint;
      if (limitEl) limitEl.hidden = !q.multi;
      if (continueBtn) {
        continueBtn.hidden = !q.multi;
        continueBtn.disabled = q.multi && selectedValues(q).length === 0;
      }
      if (backBtn) backBtn.hidden = false;
      if (!optionsEl) return;

      optionsEl.innerHTML = "";
      var selected = selectedValues(q);
      q.options.forEach(function (opt) {
        var button = document.createElement("button");
        var isSelected = selected.indexOf(opt.value) !== -1;
        button.type = "button";
        button.className = "at-device-option" + (isSelected ? " is-selected" : "");
        button.setAttribute("aria-pressed", isSelected ? "true" : "false");
        button.innerHTML = '<span class="at-device-option__control" aria-hidden="true"></span>'
          + '<span class="at-device-option__copy"><strong>' + opt.label + '</strong>'
          + (opt.note ? '<small>' + opt.note + '</small>' : '') + '</span>'
          + '<svg class="at-device-option__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        button.addEventListener("click", function () {
          if (q.multi) {
            var values = (answers[q.key] || []).slice();
            var at = values.indexOf(opt.value);
            if (at !== -1) values.splice(at, 1);
            else {
              if (opt.value === "unsure") values = ["unsure"];
              else {
                var unsureAt = values.indexOf("unsure");
                if (unsureAt !== -1) values.splice(unsureAt, 1);
                if (values.length < 2) values.push(opt.value);
              }
            }
            answers[q.key] = values;
            renderQuestion(index);
            var same = [].slice.call(optionsEl.querySelectorAll(".at-device-option"))[q.options.indexOf(opt)];
            if (same) same.focus();
          } else {
            answers[q.key] = opt.value;
            [].slice.call(optionsEl.querySelectorAll(".at-device-option")).forEach(function (el) {
              el.classList.toggle("is-selected", el === button);
              el.setAttribute("aria-pressed", el === button ? "true" : "false");
            });
            clearTimeout(advanceTimer);
            advanceTimer = setTimeout(function () { renderQuestion(index + 1); }, reduced ? 0 : 180);
          }
        });
        optionsEl.appendChild(button);
      });
    }

    function add(scores, key, amount) { scores[key] += amount; }
    function rankMatches() {
      var scores = { portable: 0, fixed: 0, drug: 0, combined: 0, personal: 0 };
      var test = answers.test, method = answers.method, location = answers.location;
      var priorities = answers.priority || [];

      if (location === "personal") {
        scores.portable = -80; scores.fixed = -90; scores.drug = -80; scores.combined = -80; scores.personal = -80;
        /* "Personal use" must not erase the required testing type. Personal
           breathalysers only cover alcohol; drug or combined needs keep their
           technically compatible path even when the setting is at home. */
        if (test === "drugs") scores.drug = 120;
        else if (test === "both") scores.combined = 120;
        else scores.personal = 120;
      } else {
        scores.personal = -100;
        /* Compatibility gets a large base score. Operational preferences can
           choose between compatible formats, but never promote an alcohol-only
           device above a stated drug-testing need (or vice versa). */
        if (test === "alcohol") { add(scores, "portable", 80); add(scores, "fixed", 80); scores.combined -= 20; scores.drug -= 100; }
        if (test === "drugs") { add(scores, "drug", 100); add(scores, "combined", 10); scores.portable -= 100; scores.fixed -= 100; }
        if (test === "both") { add(scores, "combined", 100); add(scores, "portable", 5); add(scores, "fixed", 5); add(scores, "drug", 5); }
        if (test === "unsure") { add(scores, "portable", 8); add(scores, "fixed", 5); add(scores, "drug", 5); add(scores, "combined", 8); }

        if (method === "staff") { add(scores, "portable", 24); add(scores, "drug", 8); add(scores, "combined", 8); }
        if (method === "unattended") { add(scores, "fixed", 35); add(scores, "combined", 8); }
        if (method === "remote") { add(scores, "portable", 25); add(scores, "drug", 8); add(scores, "combined", 10); }
        if (method === "kits") { add(scores, "drug", 35); add(scores, "combined", 6); }
        if (method === "unsure") { add(scores, "portable", 6); add(scores, "combined", 4); }

        if (location === "single") { add(scores, "portable", 10); add(scores, "drug", 8); add(scores, "fixed", 6); }
        if (location === "multiple") { add(scores, "fixed", 20); add(scores, "combined", 16); add(scores, "portable", 8); }
        if (location === "field") { add(scores, "portable", 24); add(scores, "drug", 12); add(scores, "combined", 8); }
      }

      priorities.forEach(function (p) {
        if (p === "simple") { add(scores, "portable", 7); add(scores, "drug", 4); add(scores, "personal", 7); }
        if (p === "frequent") { add(scores, "fixed", 18); add(scores, "portable", 6); }
        if (p === "identity") { add(scores, "fixed", 22); add(scores, "combined", 10); }
        if (p === "reporting") { add(scores, "fixed", 17); add(scores, "combined", 17); add(scores, "portable", 5); }
        if (p === "portable") { add(scores, "portable", 22); add(scores, "drug", 8); add(scores, "personal", 10); }
        if (p === "value") { add(scores, "portable", 8); add(scores, "drug", 12); add(scores, "personal", 8); }
      });

      return Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
    }

    function labelFor(key, value) {
      var q = QUESTIONS.filter(function (item) { return item.key === key; })[0];
      if (!q) return value;
      var opt = q.options.filter(function (item) { return item.value === value; })[0];
      return opt ? opt.label : value;
    }

    function setText(selector, value) {
      var el = modal.querySelector(selector);
      if (el) el.textContent = value || "";
    }

    function showResult() {
      var ranked = rankMatches();
      var bestKey = ranked[0], altKey = ranked[1];
      var best = config[bestKey] || {}, alt = config[altKey] || {};
      setView("result");
      if (progress) progress.style.width = "100%";
      setText("[data-at-device-primary-type]", best.type);
      setText("[data-at-device-primary-title]", best.title);
      setText("[data-at-device-primary-desc]", best.description);
      setText("[data-at-device-alt-type]", alt.type);
      setText("[data-at-device-alt-title]", alt.title);
      setText("[data-at-device-alt-desc]", alt.description);

      var primaryLink = modal.querySelector("[data-at-device-primary-link]");
      var altLink = modal.querySelector("[data-at-device-alt-link]");
      if (primaryLink) primaryLink.href = best.url || "#";
      if (altLink) altLink.href = alt.url || "#";
      var visual = modal.querySelector("[data-at-device-primary-visual]");
      if (visual) {
        if (best.image) {
          visual.innerHTML = '<img src="' + best.image + '" alt="' + (best.title || '') + '" loading="lazy">';
          visual.classList.add("at-device-match__visual--has-image");
        } else if (VISUALS[bestKey]) {
          visual.innerHTML = VISUALS[bestKey];
          visual.classList.remove("at-device-match__visual--has-image");
        }
      }
      var altVisual = modal.querySelector("[data-at-device-alt-visual]");
      if (altVisual) {
        if (alt.image) {
          altVisual.innerHTML = '<img src="' + alt.image + '" alt="' + (alt.title || '') + '" loading="lazy">';
          altVisual.hidden = false;
        } else {
          altVisual.innerHTML = "";
          altVisual.hidden = true;
        }
      }

      var reasons = modal.querySelector("[data-at-device-primary-reasons]");
      if (reasons) {
        reasons.innerHTML = "";
        var reasonValues = [labelFor("test", answers.test), labelFor("method", answers.method), labelFor("location", answers.location)];
        reasonValues.forEach(function (reason) {
          var li = document.createElement("li");
          li.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + reason + '</span>';
          reasons.appendChild(li);
        });
      }

      var summary = [labelFor("test", answers.test), labelFor("method", answers.method), labelFor("location", answers.location)];
      (answers.priority || []).forEach(function (p) { summary.push(labelFor("priority", p)); });
      setText("[data-at-device-summary]", summary.join(" · "));
      var heading = modal.querySelector(".at-device-result__title");
      if (heading) heading.focus && heading.setAttribute("tabindex", "-1");
      if (heading) heading.focus();
    }

    [].slice.call(document.querySelectorAll("[data-at-device-open]")).forEach(function (opener) {
      opener.addEventListener("click", open);
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    var startBtn = modal.querySelector("[data-at-device-start]");
    if (startBtn) startBtn.addEventListener("click", function () { renderQuestion(0); });
    if (backBtn) backBtn.addEventListener("click", function () {
      clearTimeout(advanceTimer);
      if (current === 0) setView("intro"); else renderQuestion(current - 1);
    });
    if (continueBtn) continueBtn.addEventListener("click", function () {
      if ((answers.priority || []).length) showResult();
    });
    var restartBtn = modal.querySelector("[data-at-device-restart]");
    if (restartBtn) restartBtn.addEventListener("click", function () { reset(); if (startBtn) startBtn.focus(); });

    modal.addEventListener("mousedown", function (e) { if (e.target === modal) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("at-is-on")) close();
    });
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var focusable = [].slice.call(modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

})();
