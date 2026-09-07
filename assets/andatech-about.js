(function () {
  'use strict';

  function initTimeline(section) {
    if (!section || section.dataset.atAboutInit === 'true') return;
    section.dataset.atAboutInit = 'true';

    var timeline = section.querySelector('[data-at-about-timeline]');
    var items = Array.prototype.slice.call(section.querySelectorAll('[data-at-about-milestone]'));
    if (!timeline || !items.length) return;

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (item) { item.classList.add('is-active'); });
      timeline.style.setProperty('--timeline-progress', '1');
      return;
    }

    section.classList.add('at-about-motion');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('is-active');
      });
    }, { rootMargin: '-18% 0px -34% 0px', threshold: 0.08 });
    items.forEach(function (item) { observer.observe(item); });

    var ticking = false;
    function updateProgress() {
      var rect = timeline.getBoundingClientRect();
      var start = window.innerHeight * .62;
      var distance = rect.height + start;
      var progress = Math.max(0, Math.min(1, (start - rect.top) / distance));
      timeline.style.setProperty('--timeline-progress', progress.toFixed(4));
      ticking = false;
    }
    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateProgress);
      }
    }
    updateProgress();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
  }

  function init(root) {
    (root || document).querySelectorAll('[data-at-about-story]').forEach(initTimeline);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
  else init(document);
  document.addEventListener('shopify:section:load', function (event) { init(event.target); });
}());
