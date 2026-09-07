(function(){
  'use strict';

  var isMobile = function(){ return window.innerWidth <= 1024; };

  // ===== Scroll entry/exit =====
  var inner = document.querySelector('.btt-industries__inner');
  var section = document.getElementById('industries');
  if (inner && section && 'IntersectionObserver' in window){
    var entryObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          // Scrolled into view — fade/slide in
          inner.classList.remove('is-exiting');
          inner.classList.add('is-visible');
        } else if (e.boundingClientRect.top < 0){
          // Scrolled past below the viewport — fade/slide out upward
          inner.classList.remove('is-visible');
          inner.classList.add('is-exiting');
        } else {
          // Below the viewport, not yet reached (or scrolled back up past it) — reset to hidden
          inner.classList.remove('is-visible');
          inner.classList.remove('is-exiting');
        }
      });
    }, { threshold: 0.12 });
    entryObs.observe(section);
  } else if (inner) {
    inner.classList.add('is-visible');
  }

  // ===== Deck =====
  var deck = document.getElementById('btt-deck');
  if (!deck) return;
  var cards = Array.from(deck.querySelectorAll('.btt-industries__deck-card'));
  var dotsWrap = document.getElementById('btt-deck-dots');
  var dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.btt-industries__dot')) : [];
  var total = cards.length;
  var busy = false;
  var stackOrder = cards.map(function(_, i){ return i; });

  // Desktop stack: 40px right + 40px up per level
  var horzStep = 40;
  var vertStep = 40;
  var scaleStep = 0.02;
  var maxVisible = 3;

  function getDesktopStyle(pos){
    var vis = pos < maxVisible;
    return {
      transform: 'translate(' + (pos * horzStep) + 'px, ' + (-pos * vertStep) + 'px) scale(' + (1 - pos * scaleStep) + ')',
      zIndex: total - pos,
      opacity: vis ? 1 : 0,
      boxShadow: pos === 0 ? '0 16px 48px rgba(17,24,32,.22)' : pos === 1 ? '0 8px 24px rgba(17,24,32,.12)' : '0 4px 10px rgba(17,24,32,.07)',
      pointerEvents: pos === 0 ? 'auto' : 'none'
    };
  }

  function applyDesktop(anim){
    stackOrder.forEach(function(ci, pos){
      var card = cards[ci];
      var s = getDesktopStyle(pos);
      card.style.transition = anim ? 'transform .55s cubic-bezier(.23,1,.32,1), opacity .4s ease, box-shadow .4s ease' : 'none';
      card.style.transform = s.transform;
      card.style.zIndex = s.zIndex;
      card.style.opacity = s.opacity;
      card.style.boxShadow = s.boxShadow;
      card.style.pointerEvents = s.pointerEvents;
      card.style.position = 'absolute';
      card.style.display = '';
      card.classList.remove('is-mobile-active');
      if (dots[ci]){
        if (pos === 0) dots[ci].classList.add('is-active');
        else dots[ci].classList.remove('is-active');
      }
    });
  }

  // Mobile: native CSS scroll-snap, JS just clears inline styles
  function initMobile(){
    cards.forEach(function(card){
      card.style.cssText = '';
      card.classList.remove('is-mobile-active');
    });
    dots.forEach(function(d){ d.classList.remove('is-active'); });
    if (dots[0]) dots[0].classList.add('is-active');
    // Sync dot highlight with scroll position
    deck.addEventListener('scroll', function(){
      var cardW = cards[0] ? cards[0].offsetWidth + 12 : deck.offsetWidth;
      var idx = Math.round(deck.scrollLeft / cardW);
      dots.forEach(function(d, i){
        if (i === idx) d.classList.add('is-active');
        else d.classList.remove('is-active');
      });
    }, { passive: true });
  }

  function swapNext(){
    if (busy || isMobile()) return;
    busy = true;
    var frontIdx = stackOrder[0];
    var frontCard = cards[frontIdx];
    frontCard.style.transition = 'transform .45s cubic-bezier(.23,1,.32,1), opacity .3s ease';
    frontCard.style.transform = 'translateY(40px) scale(.94)';
    frontCard.style.opacity = '0';
    frontCard.style.zIndex = total + 1;
    frontCard.style.pointerEvents = 'none';
    setTimeout(function(){
      stackOrder.push(stackOrder.shift());
      var backCard = cards[stackOrder[total - 1]];
      var bs = getDesktopStyle(total - 1);
      backCard.style.transition = 'none';
      backCard.style.transform = bs.transform;
      backCard.style.opacity = '0';
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        applyDesktop(true);
        setTimeout(function(){ busy = false; }, 600);
      }); });
    }, 420);
  }

  function init(){
    if (isMobile()) initMobile(); else applyDesktop(false);
  }
  init();
  window.addEventListener('resize', init);

  // Dots
  dots.forEach(function(dot, i){
    dot.addEventListener('click', function(){
      if (isMobile()){
        var cardW = cards[0] ? cards[0].offsetWidth + 12 : deck.offsetWidth;
        deck.scrollTo({ left: i * cardW, behavior: 'smooth' });
      } else {
        var pos = stackOrder.indexOf(i);
        if (pos <= 0) return;
        (function step(n){ if (n <= 0) return; swapNext(); setTimeout(function(){ step(n-1); }, 620); })(pos);
      }
    });
  });

  // ===== Drag / swipe gesture — desktop card stack =====
  // Since there are no visible arrows, dragging the front card left or right
  // (past a small threshold) advances to the next card, mirroring the tap/click
  // interaction but with a natural, physical "flick the card away" feel.
  var dragState = null;
  var wasDragging = false;

  function getFrontCard(){ return cards[stackOrder[0]]; }

  function advanceWithExit(exitTransform){
    busy = true;
    setTimeout(function(){
      stackOrder.push(stackOrder.shift());
      var backCard = cards[stackOrder[total - 1]];
      var bs = getDesktopStyle(total - 1);
      backCard.style.transition = 'none';
      backCard.style.transform = bs.transform;
      backCard.style.opacity = '0';
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        applyDesktop(true);
        setTimeout(function(){ busy = false; startTimer(); }, 600);
      }); });
    }, exitTransform ? 320 : 420);
  }

  function dragStart(x, y){
    if (isMobile() || busy) return;
    wasDragging = false;
    var card = getFrontCard();
    dragState = { startX: x, startY: y, dx: 0, card: card };
    card.style.transition = 'none';
    deck.style.cursor = 'grabbing';
    stopTimer();
  }
  function dragMove(x){
    if (!dragState) return;
    var dx = x - dragState.startX;
    dragState.dx = dx;
    if (Math.abs(dx) > 5) wasDragging = true;
    var rot = dx / 18;
    dragState.card.style.transform = 'translate(' + dx + 'px, ' + (-Math.abs(dx) * 0.04) + 'px) rotate(' + rot + 'deg)';
  }
  function dragEnd(){
    if (!dragState) return;
    var dx = dragState.dx;
    var card = dragState.card;
    var threshold = 90;
    deck.style.cursor = 'grab';

    if (Math.abs(dx) > threshold){
      var dir = dx > 0 ? 1 : -1;
      card.style.transition = 'transform .4s cubic-bezier(.23,1,.32,1), opacity .3s ease';
      card.style.transform = 'translate(' + (dir * 500) + 'px, -40px) rotate(' + (dir * 22) + 'deg)';
      card.style.opacity = '0';
      card.style.zIndex = total + 1;
      card.style.pointerEvents = 'none';
      advanceWithExit(true);
    } else {
      card.style.transition = 'transform .3s cubic-bezier(.23,1,.32,1)';
      card.style.transform = getDesktopStyle(0).transform;
      startTimer();
    }
    dragState = null;
  }

  deck.addEventListener('mousedown', function(e){
    if (isMobile()) return;
    dragStart(e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', function(e){
    if (!dragState) return;
    dragMove(e.clientX);
  });
  window.addEventListener('mouseup', function(){
    if (dragState) dragEnd();
  });

  deck.addEventListener('touchstart', function(e){
    if (isMobile()) return;
    var t = e.touches[0];
    dragStart(t.clientX, t.clientY);
  }, { passive: true });
  deck.addEventListener('touchmove', function(e){
    if (!dragState) return;
    var t = e.touches[0];
    dragMove(t.clientX);
  }, { passive: true });
  deck.addEventListener('touchend', function(){
    if (dragState) dragEnd();
  });

  if (!isMobile()) deck.style.cursor = 'grab';

  // ===== Two-finger trackpad horizontal swipe =====
  // Trackpad swipes arrive as 'wheel' events with deltaX (not touch events —
  // trackpads aren't touchscreens). Only acts when the gesture is clearly
  // horizontal (|deltaX| > |deltaY|); vertical-dominant wheel events are left
  // completely untouched so normal page scrolling is never intercepted.
  var wheelAccum = 0;
  var wheelCooldown = false;
  var wheelResetTimer = null;

  deck.addEventListener('wheel', function(e){
    if (isMobile() || busy) return;
    var adx = Math.abs(e.deltaX);
    var ady = Math.abs(e.deltaY);
    if (adx <= ady) return; // vertical-dominant — let the page scroll normally

    e.preventDefault();
    if (wheelCooldown) return;

    wheelAccum += e.deltaX;
    clearTimeout(wheelResetTimer);
    wheelResetTimer = setTimeout(function(){ wheelAccum = 0; }, 150);

    var threshold = 60;
    if (Math.abs(wheelAccum) > threshold){
      wheelCooldown = true;
      wheelAccum = 0;
      stopTimer();
      swapNext();
      setTimeout(function(){ wheelCooldown = false; startTimer(); }, 700);
    }
  }, { passive: false });

  // Click front card — desktop (skipped if the click followed a real drag)
  deck.addEventListener('click', function(){
    if (isMobile()) return;
    if (wasDragging){ wasDragging = false; return; }
    swapNext();
  });

  // Deck link buttons should navigate, not trigger the card-advance click handler above
  deck.querySelectorAll('[data-deck-link]').forEach(function(link){
    link.addEventListener('click', function(e){ e.stopPropagation(); });
  });

  // Mobile: button is hidden (see CSS), whole card navigates on tap instead.
  // Desktop keeps its existing click-to-advance-the-stack behavior untouched.
  cards.forEach(function(card){
    var url = card.dataset.link;
    if (!url || url === '#') return;
    card.addEventListener('click', function(){
      if (!isMobile()) return;
      window.location.href = url;
    });
  });

  // Auto-rotate every 6s, pause on hover
  var deckWrap = document.getElementById('btt-deck-wrap');
  var timer = null; var paused = false;
  function startTimer(){ if (!timer) timer = setInterval(function(){ if (!paused && !isMobile()) swapNext(); }, 6000); }
  function stopTimer(){ clearInterval(timer); timer = null; }
  
  if (deckWrap){
    deckWrap.addEventListener('mouseenter', function(){ paused = true; });
    deckWrap.addEventListener('mouseleave', function(){ paused = false; });
  }

  // Only run the auto-rotate timer while the section is actually on screen —
  // otherwise it keeps firing every 6s for the entire time the page is open,
  // mutating several deck cards' transform/opacity/shadow each time. If that
  // happens to land mid-scroll (anywhere on the page, since it's untied to
  // scroll position), it causes an intermittent stutter unrelated to whatever
  // section the user is actually looking at.
  if (section && 'IntersectionObserver' in window){
    var timerObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) startTimer();
        else stopTimer();
      });
    }, { threshold: 0 });
    timerObs.observe(section);
  } else {
    startTimer();
  }

  // ===== Desktop modal =====
  var modal = document.getElementById('btt-modal');
  var backdrop = document.getElementById('btt-modal-backdrop');
  var modalClose = document.getElementById('btt-modal-close');
  var expandBtn = document.getElementById('btt-expand-btn');

  function openModal(){
    if (!modal) return;
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
    document.body.classList.add('btt-modal-open');
    stopTimer();
    setTimeout(initCardEffects, 350);
  }
  function closeModal(){
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('btt-modal-open');
    startTimer();
  }
  if (expandBtn) expandBtn.addEventListener('click', function(){
    if (isMobile()) openMobileModal(); else openModal();
  });
  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape'){ closeModal(); closeMobileModal(); }
  });

  // ===== Mobile modal =====
  var mobileModal = document.getElementById('btt-mobile-modal');
  var mobileClose = document.getElementById('btt-mobile-modal-close');
  var expandBtnM = document.getElementById('btt-expand-btn-mobile');

  function openMobileModal(){
    if (!mobileModal) return;
    mobileModal.classList.add('is-open');
    mobileModal.removeAttribute('aria-hidden');
    document.body.classList.add('btt-modal-open');
  }
  function closeMobileModal(){
    if (!mobileModal) return;
    mobileModal.classList.remove('is-open');
    mobileModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('btt-modal-open');
  }
  if (expandBtnM) expandBtnM.addEventListener('click', openMobileModal);
  if (mobileClose) mobileClose.addEventListener('click', closeMobileModal);

  // ===== Spotlight + tilt on modal grid cards =====
  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var hasHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  function initCardEffects(){
    if (reduceMotion || !hasHover) return;
    document.querySelectorAll('.btt-industries__card[data-tilt]').forEach(function(card){
      if (card._init) return;
      card._init = true;
      var sp = card.querySelector('.btt-industries__card-spotlight');
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        if (sp){ card.style.setProperty('--sx', (x/r.width*100)+'%'); card.style.setProperty('--sy', (y/r.height*100)+'%'); }
        var rY = ((x-r.width/2)/(r.width/2))*7;
        var rX = -((y-r.height/2)/(r.height/2))*7;
        card.classList.add('is-tilting');
        card.style.transform = 'rotateX('+rX+'deg) rotateY('+rY+'deg) scale(1.02)';
      });
      card.addEventListener('mouseleave', function(){
        card.classList.remove('is-tilting');
        card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
      });
    });
  }

})();