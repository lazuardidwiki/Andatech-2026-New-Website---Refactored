(function(){
  'use strict';

  // Signals that the intro is over.
  //
  // Two consumers:
  //   - landing.css gates the hero widget's rotating border glow on the
  //     `btt-preloaded` class, so the ring does not spin behind the overlay.
  //   - landing.js listens for the `btt:preloaded` event to start the hero
  //     gauge count-up, for the same reason.
  //
  // The class is set as well as the event fired, so a listener that attaches
  // after this has already run can still detect it synchronously rather than
  // waiting for an event that will never come again.
  function markPreloaded(){
    if (document.body.classList.contains('btt-preloaded')) return;
    document.body.classList.add('btt-preloaded');
    document.dispatchEvent(new CustomEvent('btt:preloaded'));
  }

  var pre = document.getElementById('btt-preloader');
  // No preloader on the page means there is nothing to wait for — release the
  // animation immediately rather than leaving it permanently frozen.
  if (!pre){ markPreloaded(); return; }
  var pctEl = document.getElementById('btt-preloader-pct');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  document.body.classList.add('btt-preloading');

  var pct = 0;        // real target percentage
  var displayed = 0;   // smoothed number actually shown
  var done = false;
  var trickleTimer = null;
  var rafId = null;

  // Trickle upward while waiting, asymptotically approaching ~92% — the
  // number keeps moving so the screen doesn't look stuck, but it never
  // claims "done" before window.load actually fires.
  function trickle(){
    if (pct < 92){
      var remaining = 92 - pct;
      pct += remaining * 0.045 + 0.15;
    }
    trickleTimer = setTimeout(trickle, 120);
  }

  // Smoothly animates the displayed number toward the real target instead
  // of jumping in visible steps.
  function renderLoop(){
    displayed += (pct - displayed) * 0.18;
    if (Math.abs(pct - displayed) < 0.1) displayed = pct;
    if (pctEl) pctEl.textContent = Math.round(displayed) + '%';
    if (displayed < 100){
      rafId = requestAnimationFrame(renderLoop);
    }
  }

  if (reduceMotion){
    if (pctEl) pctEl.textContent = 'Loading…';
  } else {
    trickle();
    renderLoop();
  }

  function finish(){
    if (done) return;
    done = true;
    clearTimeout(trickleTimer);
    pct = 100;
    if (pctEl && reduceMotion) pctEl.textContent = '100%';

    var reveal = function(){
      pre.classList.add('is-hidden');
      document.body.classList.remove('btt-preloading');
      markPreloaded();
      setTimeout(function(){
        if (pre.parentNode) pre.parentNode.removeChild(pre);
        if (rafId) cancelAnimationFrame(rafId);
      }, 400);
    };

    // Give the number a brief beat to visually land on 100% before fading out.
    setTimeout(reveal, reduceMotion ? 0 : 100);
  }

  // Gate on DOMContentLoaded rather than window's full `load` event. `load`
  // waits for every last asset on the page — including the hero's autoplay
  // background video, which has its own poster image as an instant fallback
  // and does not need to finish downloading before the page is usable. That
  // made the preloader sit far longer than the page actually needed.
  // DOMContentLoaded fires once the DOM is parsed and ready, which is what
  // this overlay is actually meant to bridge.
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', finish, { once: true });
  } else {
    // Deferred scripts run after parsing but before DOMContentLoaded fires,
    // so in practice this branch is rare — but guards against a script that
    // ends up executing after the event has already passed.
    finish();
  }
  // Safety net — never trap a visitor behind the preloader indefinitely if
  // something stalls before DOMContentLoaded can fire.
  setTimeout(finish, 4000);

})();