document.addEventListener('DOMContentLoaded', function(){

  // ===== Sliding pill highlight — follows whichever nav link is hovered =====
  var menuPill = document.querySelector('.kby-nav__menu-pill');
  if(menuPill){
    var highlight = document.createElement('div');
    highlight.className = 'kby-nav__menu-highlight';
    menuPill.insertBefore(highlight, menuPill.firstChild);
    var menuLinks = Array.from(menuPill.querySelectorAll('a'));

    function moveHighlight(el){
      var pillRect = menuPill.getBoundingClientRect();
      var elRect = el.getBoundingClientRect();
      highlight.style.width = elRect.width + 'px';
      highlight.style.transform = 'translateX(' + (elRect.left - pillRect.left - 5) + 'px)';
      highlight.classList.add('is-active');
    }
    menuLinks.forEach(function(link){
      link.addEventListener('mouseenter', function(){ moveHighlight(link); });
    });
    menuPill.addEventListener('mouseleave', function(){ highlight.classList.remove('is-active'); });
  }

  // ===== Nav hide-on-scroll-down / show-on-scroll-up =====
  // Ported from Beyond The Test's "Nav Scroll Fix". Uses a document-level
  // capture listener (not just window) because a scroll on some inner
  // scrollable container (a card slider, a modal) can otherwise fail to
  // reach a plain window listener if something stops propagation on the
  // way up — capture fires on the way down, before that can happen.
  var nav = document.querySelector('.kby-nav');
  var navBg = document.querySelector('.kby-nav__bg');
  var fadeDistance = 150;
  var hideThreshold = 80;
  var lastScrollY = 0;
  var lastNavOpacity = -1;
  var lastBlurred = false;
  var navTicking = false;

  function getPageScrollY(){
    return window.pageYOffset || window.scrollY ||
      (document.documentElement && document.documentElement.scrollTop) ||
      (document.body && document.body.scrollTop) || 0;
  }

  function handleNavScroll(){
    navTicking = false;
    var y = getPageScrollY();

    if(navBg){
      // Backdrop fades in over the first 150px of scroll, then stays fully
      // opaque — this was the piece missing before, so the dark/blurred
      // background never became visible at any scroll position, hidden or
      // revealed.
      var op = Math.min(y / fadeDistance, 1);
      if(op !== lastNavOpacity){
        lastNavOpacity = op;
        navBg.style.opacity = op;
      }
      var blurred = y > 0;
      if(blurred !== lastBlurred){
        lastBlurred = blurred;
        navBg.classList.toggle('is-blurred', blurred);
      }
    }

    if(nav){
      var diff = y - lastScrollY;
      if(y <= hideThreshold){
        nav.classList.remove('kby-nav--hidden');
      } else if(diff > 2){
        nav.classList.add('kby-nav--hidden');
      } else if(diff < -2){
        nav.classList.remove('kby-nav--hidden');
      }
    }
    lastScrollY = y;
  }

  function requestNavScrollUpdate(e){
    if(e && e.target && e.target !== document && e.target !== window &&
       e.target !== document.documentElement && e.target !== document.body){
      return;
    }
    if(!navTicking){
      navTicking = true;
      requestAnimationFrame(handleNavScroll);
    }
  }

  lastScrollY = getPageScrollY();
  handleNavScroll();
  window.addEventListener('scroll', requestNavScrollUpdate, { passive:true });
  document.addEventListener('scroll', requestNavScrollUpdate, { capture:true, passive:true });

  // ===== Mobile drawer =====
  var toggle = document.getElementById('kby-menu-toggle');
  var closeBtn = document.getElementById('kby-drawer-close');
  var drawer = document.getElementById('kby-drawer');
  var overlay = document.getElementById('kby-drawer-overlay');
  if(toggle && drawer && overlay){
    function openDrawer(){
      drawer.classList.add('is-active');
      overlay.classList.add('is-active');
      toggle.setAttribute('aria-expanded', 'true');
      if(nav) nav.classList.remove('kby-nav--hidden');
    }
    function closeDrawer(){
      drawer.classList.remove('is-active');
      overlay.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', openDrawer);
    if(closeBtn) closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', closeDrawer);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeDrawer();
    });
  }
});