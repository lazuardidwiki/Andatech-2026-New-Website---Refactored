(function(){
  'use strict';

  function initBTTKnowledge() {
    var section = document.querySelector('.btt-know');
    if (!section) return;

    var header = section.querySelector('.btt-know__header');
    var tabs = Array.from(section.querySelectorAll('.btt-know__tab'));
    var cards = Array.from(section.querySelectorAll('.btt-know__card'));

    // ==========================
    // 2. SCROLL REVEAL (IN & OUT)
    // ==========================
    function observeEl(el, threshold){
      if (!el) return;

      // MOBILE FIX: Bypass scroll-reveal triggers on mobile screens (<= 640px)
      // so horizontal scroll cards stay fully visible without fading or exiting.
      var isMobile = window.matchMedia('(max-width: 640px)').matches;

      if (isMobile || !('IntersectionObserver' in window)){
        el.classList.add('is-visible');
        return;
      }

      el.classList.add('will-animate');
      var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting){
            e.target.classList.remove('is-exiting');
            e.target.classList.add('is-visible');
          } else {
            if (e.boundingClientRect.top < 0) e.target.classList.add('is-exiting');
            else { 
              e.target.classList.remove('is-visible'); 
              e.target.classList.remove('is-exiting'); 
            }
          }
        });
      }, { threshold: threshold || 0.1 });
      obs.observe(el);
    }

    observeEl(header, 0.2);
    cards.forEach(function(card){ observeEl(card, 0.1); });

    // ==========================
    // 3. TAB FILTER (PILL SHAPE)
    // ==========================
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        var filter = tab.getAttribute('data-tab');

        tabs.forEach(function(t){ t.classList.remove('is-active'); });
        tab.classList.add('is-active');

        var visible = [];
        cards.forEach(function(card){
          var cat = card.getAttribute('data-category');
          if (filter === 'all' || cat === filter){
            card.classList.remove('is-hidden');
            visible.push(card);
          } else {
            card.classList.add('is-hidden');
          }
        });

        visible.forEach(function(card, i){
          card.classList.remove(
            'btt-know__card--1','btt-know__card--2',
            'btt-know__card--3','btt-know__card--4'
          );
          card.classList.add('btt-know__card--' + (i + 1));
        });
      });
    });

    // ==========================
    // 4. 3D TILT & SPOTLIGHT EFFECT
    // ==========================
    var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    var hasHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

    if (!reduceMotion && hasHover) {
      cards.forEach(function(card){
        if (card._initTilt) return;
        card._initTilt = true;

        var sp = card.querySelector('.btt-know__card-spotlight');
        if (!sp) return;

        // Spotlight still tracks the cursor. Tilt/wobble removed — no inline
        // transform/transition is set anymore, so the CSS hover state
        // (drop-shadow, arrow shine) applies cleanly on its own.
        card.addEventListener('mousemove', function(e){
          var r = card.getBoundingClientRect();
          var x = e.clientX - r.left;
          var y = e.clientY - r.top;
          card.style.setProperty('--sx', (x / r.width * 100) + '%');
          card.style.setProperty('--sy', (y / r.height * 100) + '%');
        });
      });
    }
  }

  // Execute on load
  initBTTKnowledge();

  // Re-execute on Shopify Theme Editor section load
  document.addEventListener('shopify:section:load', function(event) {
    if (event.target.querySelector('.btt-know')) {
      initBTTKnowledge();
    }
  });

})();