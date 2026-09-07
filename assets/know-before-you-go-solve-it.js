document.addEventListener('DOMContentLoaded', function(){
  var items = document.querySelectorAll('[data-kby-solve-item]');
  if(!items.length) return;

  // ===== Accordion — JS-measured max-height, single-open =====
  function setPanelHeight(item, open){
    var panel = item.querySelector('[data-kby-panel]');
    if(open){
      panel.style.maxHeight = panel.scrollHeight + 'px';
    } else {
      panel.style.maxHeight = '0px';
    }
  }

  items.forEach(function(item){
    var row = item.querySelector('.kby-solve__row');
    if(item.classList.contains('is-active')) setPanelHeight(item, true);

    row.addEventListener('click', function(){
      var wasActive = item.classList.contains('is-active');
      items.forEach(function(i){
        i.classList.remove('is-active');
        i.querySelector('.kby-solve__row').setAttribute('aria-expanded', 'false');
        setPanelHeight(i, false);
      });
      if(!wasActive){
        item.classList.add('is-active');
        row.setAttribute('aria-expanded', 'true');
        setPanelHeight(item, true);
      }
    });
  });

  // Recalculate open panel's height on resize (image reflow, font load, etc.)
  window.addEventListener('resize', function(){
    items.forEach(function(item){
      if(item.classList.contains('is-active')) setPanelHeight(item, true);
    });
  });

  // ===== Hover marquee — ported from React Bits' FlowingMenu =====
  // Skipped on touch/coarse pointers entirely (matches the CSS media guard)
  // so this cost is never paid on devices that can't hover anyway.
  var hasHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(!hasHover || reduceMotion || typeof gsap === 'undefined') return;

  function distSq(x, y, x2, y2){
    var dx = x - x2, dy = y - y2;
    return dx * dx + dy * dy;
  }
  function closestEdge(mouseX, mouseY, width, height){
    var topDist = distSq(mouseX, mouseY, width / 2, 0);
    var bottomDist = distSq(mouseX, mouseY, width / 2, height);
    return topDist < bottomDist ? 'top' : 'bottom';
  }

  var activeMarquees = [];

  items.forEach(function(item){
    var row = item.querySelector('.kby-solve__row');
    var marquee = item.querySelector('[data-kby-marquee]');
    var inner = item.querySelector('[data-kby-marquee-inner]');
    if(!row || !marquee || !inner) return;

    // Continuous horizontal loop — runs constantly, independent of hover,
    // same as the source component. 10 repeated parts is comfortably wider
    // than any row on this page, so no resize-based repetition recalc is
    // needed the way the original React version does it.
    var part = inner.querySelector('.kby-solve__marquee-part');
    if(part){
      var partWidth = part.offsetWidth;
      if(partWidth > 0){
        gsap.to(inner, { x: -partWidth, duration: 15, ease: 'none', repeat: -1 });
      }
    }

    var tl;
    var entry = { marquee: marquee, isOpen: false };
    activeMarquees.push(entry);

    row.addEventListener('mouseenter', function(ev){
      if(item.classList.contains('is-active')) return;
      var rect = row.getBoundingClientRect();
      var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      var edge = closestEdge(x, y, rect.width, rect.height);
      if(tl) tl.kill();
      entry.isOpen = true;
      tl = gsap.timeline({ defaults: { duration: 0.6, ease: 'expo' } })
        .set(marquee, { y: edge === 'top' ? '-101%' : '101%' }, 0)
        .to(marquee, { y: '0%' }, 0);
    });

    row.addEventListener('mouseleave', function(ev){
      if(!entry.isOpen) return;
      var rect = row.getBoundingClientRect();
      var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      var edge = closestEdge(x, y, rect.width, rect.height);
      if(tl) tl.kill();
      entry.isOpen = false;
      tl = gsap.timeline({ defaults: { duration: 0.6, ease: 'expo' } })
        .to(marquee, { y: edge === 'top' ? '-101%' : '101%' }, 0);
    });
  });

  // Scrolling moves rows out from under the cursor without firing
  // mouseleave (that event only fires on actual pointer movement, not on
  // content moving underneath a stationary pointer) — which is exactly
  // what left a marquee visibly stuck open while scrolling. Force every
  // open marquee closed the moment a scroll starts, rather than trying to
  // track pointer-vs-content position during scroll.
  var scrollResetTicking = false;
  window.addEventListener('scroll', function(){
    if(scrollResetTicking) return;
    scrollResetTicking = true;
    requestAnimationFrame(function(){
      scrollResetTicking = false;
      activeMarquees.forEach(function(entry){
        if(entry.isOpen){
          entry.isOpen = false;
          gsap.to(entry.marquee, { y: '101%', duration: 0.3, ease: 'power2.out' });
        }
      });
    });
  }, { passive: true });
});