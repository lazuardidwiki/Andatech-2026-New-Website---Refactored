(function(){
  'use strict';

  var gallery = document.getElementById('btt-res-gallery');
  if (!gallery) return;

  var items = Array.from(gallery.querySelectorAll('.btt-res__gallery-item'));
  var dotsWrap = document.getElementById('btt-res-dots');
  var dots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.btt-res__dot')) : [];
  var prevBtn = document.getElementById('btt-res-prev');
  var nextBtn = document.getElementById('btt-res-next');
  var isMobile = function(){ return window.innerWidth <= 640; };

  // ===== Dots sync on scroll =====
  function getItemWidth(){
    if (!items.length) return 0;
    // getBoundingClientRect gives accurate width including gap
    if (items.length > 1){
      var r1 = items[0].getBoundingClientRect();
      var r2 = items[1].getBoundingClientRect();
      return r2.left - r1.left;
    }
    return items[0].getBoundingClientRect().width + 20;
  }

  function updateDots(){
    if (!items.length || !dots.length) return;
    var itemW = getItemWidth();
    if (itemW <= 0) return;
    var idx = Math.round(gallery.scrollLeft / itemW);
    idx = Math.max(0, Math.min(idx, dots.length - 1));
    dots.forEach(function(d, i){
      if (i === idx) d.classList.add('is-active');
      else d.classList.remove('is-active');
    });
  }

  gallery.addEventListener('scroll', updateDots, { passive:true });
  // Initial dot state after layout settles
  setTimeout(updateDots, 150);
  window.addEventListener('resize', function(){ setTimeout(updateDots, 100); });

  // Dot clicks — scroll to that card
  dots.forEach(function(dot, i){
    dot.addEventListener('click', function(){
      var itemW = getItemWidth();
      gallery.scrollTo({ left: i * itemW, behavior:'smooth' });
    });
  });

  // Nav arrows — scroll one card at a time
  function scrollPage(dir){
    var itemW = getItemWidth();
    gallery.scrollBy({ left: dir * itemW, behavior:'smooth' });
  }
  if (prevBtn) prevBtn.addEventListener('click', function(){ scrollPage(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function(){ scrollPage(1); });

  // ===== Drag to scroll (desktop) =====
  var isDragging = false;
  var startX = 0;
  var scrollLeft = 0;

  gallery.addEventListener('mousedown', function(e){
    isDragging = true;
    startX = e.pageX - gallery.offsetLeft;
    scrollLeft = gallery.scrollLeft;
    gallery.style.userSelect = 'none';
  });
  document.addEventListener('mouseup', function(){
    isDragging = false;
    gallery.style.userSelect = '';
  });
  gallery.addEventListener('mousemove', function(e){
    if (!isDragging) return;
    e.preventDefault();
    var x = e.pageX - gallery.offsetLeft;
    var walk = (x - startX) * 1.5;
    gallery.scrollLeft = scrollLeft - walk;
  });

  // ===== Modal =====
  var modal = document.getElementById('btt-res-modal');
  var modalBackdrop = document.getElementById('btt-res-modal-backdrop');
  var modalClose = document.getElementById('btt-res-modal-close');
  var viewAllBtn = document.getElementById('btt-res-view-all');

  function openModal(){
    if (!modal) return;
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
    document.body.classList.add('btt-modal-open');
    setTimeout(initModalCards, 350);
  }
  function closeModal(){
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('btt-modal-open');
  }

  if (viewAllBtn) viewAllBtn.addEventListener('click', openModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeModal(); });

  // ===== Tilt + spotlight on gallery cards =====
  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var hasHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  function initCards(selector){
    if (reduceMotion || !hasHover) return;
    document.querySelectorAll(selector).forEach(function(card){
      if (card._init) return;
      card._init = true;
      var sp = card.querySelector('.btt-res__card-spotlight');
      if (!sp) return;

      // Spotlight still tracks the cursor. Tilt/wobble removed — no inline
      // transform is set anymore, so the CSS hover lift (translateY(-6px))
      // now applies cleanly instead of being overridden.
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--sx', (x/r.width*100)+'%');
        card.style.setProperty('--sy', (y/r.height*100)+'%');
      });
    });
  }

  function initModalCards(){
    initCards('.btt-res__modal-card');
  }

  // ===== Header reveal =====
  var headerLeft = document.querySelector('.btt-res__header-left');
  var viewAll = document.querySelector('.btt-res__view-all');
  var headerEls = [headerLeft, viewAll].filter(Boolean);

  if (headerEls.length && 'IntersectionObserver' in window){
    var headerObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          e.target.classList.remove('is-exiting');
          e.target.classList.add('is-visible');
        } else {
          if (e.boundingClientRect.top < 0){
            e.target.classList.add('is-exiting');
          } else {
            e.target.classList.remove('is-visible');
            e.target.classList.remove('is-exiting');
          }
        }
      });
    }, { threshold: 0.2 });
    headerEls.forEach(function(el){ headerObs.observe(el); });
  } else {
    headerEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  // ===== Staggered scroll reveal + exit =====
  var galleryItems = Array.from(document.querySelectorAll('.btt-res__gallery-item'));
  var isMobileScreen = window.matchMedia('(max-width: 640px)').matches;

  // MOBILE FIX: Bypass scroll reveal trigger on mobile screens so horizontal carousel items remain 100% visible
  if (galleryItems.length && 'IntersectionObserver' in window && !isMobileScreen){
    var revealObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          e.target.classList.remove('is-exiting');
          e.target.classList.add('is-visible');
        } else {
          if (e.boundingClientRect.top < 0){
            e.target.classList.add('is-exiting');
          } else {
            e.target.classList.remove('is-visible');
            e.target.classList.remove('is-exiting');
          }
        }
      });
    }, { threshold: 0.1 });
    galleryItems.forEach(function(item){ revealObs.observe(item); });
  } else {
    galleryItems.forEach(function(item){ item.classList.add('is-visible'); });
  }

  // Init gallery cards immediately
  initCards('.btt-res__card');

  // =====================================================
  // Gated download — collects name/email/jobtitle/company/
  // industry/consent, submits to HubSpot Forms API, then
  // opens the actual download URL on success.
  // =====================================================
  var gateModal = document.getElementById('btt-res-gate-modal');

  // Reparent to <body> so this modal's position:fixed always anchors to the
  // viewport, and so its stacking order relative to other reparented modals
  // (e.g. Tools' quiz result modal) is consistent regardless of where this
  // section happens to sit in the page. Its z-index (700) is intentionally
  // higher than other modals (600) since it can be opened on top of them
  // (e.g. clicking a related-resource link from inside the Tools quiz result).
  if (gateModal && gateModal.parentElement !== document.body) {
    document.body.appendChild(gateModal);
  }
  var gateBackdrop = document.getElementById('btt-res-gate-backdrop');
  var gateClose = document.getElementById('btt-res-gate-close');
  var gateForm = document.getElementById('btt-res-gate-form');
  var gateTitleEl = document.getElementById('btt-res-gate-resource-title');
  var gateError = document.getElementById('btt-res-gate-error');
  var gateSubmitBtn = document.getElementById('btt-res-gate-submit');
  var gateSubmitLabel = gateSubmitBtn ? gateSubmitBtn.querySelector('.btt-res__gate-submit-label') : null;
  var pendingDownloadUrl = null;

  var gateScrollHintEl = document.getElementById('btt-res-gate-scroll-hint');
  var gateScrollPanel = document.querySelector('.btt-res__gate-panel');
  function updateGateScrollHint(){
    if (!gateScrollHintEl || !gateScrollPanel) return;
    var needsScroll = gateScrollPanel.scrollHeight > gateScrollPanel.clientHeight + 4;
    var atBottom = gateScrollPanel.scrollTop + gateScrollPanel.clientHeight >= gateScrollPanel.scrollHeight - 4;
    gateScrollHintEl.classList.toggle('is-hidden', !needsScroll || atBottom);
  }

  function openGateModal(url, title){
    if (!gateModal) return;
    pendingDownloadUrl = url;
    if (gateTitleEl) gateTitleEl.textContent = title || 'this resource';
    if (gateError) gateError.hidden = true;
    gateModal.classList.add('is-open');
    gateModal.removeAttribute('aria-hidden');
    document.body.classList.add('btt-modal-open');
    setTimeout(updateGateScrollHint, 50);
    updateGateSubmitState();
  }

  // Exposed so other sections on the same page (e.g. Tools' quiz results)
  // can reuse this exact gated-download flow instead of duplicating it.
  window.BTTResourceGate = { open: openGateModal };

  // ===== Keep the submit button disabled until every field is filled and
  // the consent checkbox is checked — the button itself communicates
  // whether the form is ready, rather than only erroring after a click. =====
  var gateFirstnameInput = document.getElementById('btt-res-gate-firstname');
  var gateLastnameInput = document.getElementById('btt-res-gate-lastname');
  var gateEmailInput = document.getElementById('btt-res-gate-email');
  var gateJobtitleInput = document.getElementById('btt-res-gate-jobtitle');
  var gateCompanyInput = document.getElementById('btt-res-gate-company');
  var gateIndustrySelect = document.getElementById('btt-res-gate-industry');
  var gateConsentCheckbox = document.getElementById('btt-res-gate-consent');

  function updateGateSubmitState(){
    if (!gateSubmitBtn) return;
    var allFilled = gateFirstnameInput && gateFirstnameInput.value.trim()
      && gateLastnameInput && gateLastnameInput.value.trim()
      && gateEmailInput && gateEmailInput.value.trim()
      && gateJobtitleInput && gateJobtitleInput.value.trim()
      && gateCompanyInput && gateCompanyInput.value.trim()
      && gateIndustrySelect && gateIndustrySelect.value
      && gateConsentCheckbox && gateConsentCheckbox.checked;
    gateSubmitBtn.disabled = !allFilled;
  }

  [gateFirstnameInput, gateLastnameInput, gateEmailInput, gateJobtitleInput, gateCompanyInput].forEach(function(input){
    if (input) input.addEventListener('input', updateGateSubmitState);
  });
  if (gateIndustrySelect) gateIndustrySelect.addEventListener('change', updateGateSubmitState);
  if (gateConsentCheckbox) gateConsentCheckbox.addEventListener('change', updateGateSubmitState);
  function closeGateModal(){
    if (!gateModal) return;
    gateModal.classList.remove('is-open');
    gateModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('btt-modal-open');
  }

  document.querySelectorAll('[data-gate-trigger]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var url = btn.getAttribute('data-download-url');
      var title = btn.getAttribute('data-download-title');
      if (!url) return;
      openGateModal(url, title);
    });
  });

  if (gateBackdrop) gateBackdrop.addEventListener('click', closeGateModal);
  if (gateClose) gateClose.addEventListener('click', closeGateModal);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeGateModal(); });

  if (gateForm){
    gateForm.addEventListener('submit', function(e){
      e.preventDefault();
      if (gateError) gateError.hidden = true;

      var config = window.BTT_RES_HUBSPOT || {};
      if (!config.portalId || !config.formGuid){
        if (gateError){
          gateError.textContent = 'This download form isn\u2019t configured yet \u2014 add the HubSpot Portal ID and Form GUID in the section settings.';
          gateError.hidden = false;
        }
        return;
      }

      var firstname = document.getElementById('btt-res-gate-firstname').value.trim();
      var lastname = document.getElementById('btt-res-gate-lastname').value.trim();
      var email = document.getElementById('btt-res-gate-email').value.trim();
      var jobtitle = document.getElementById('btt-res-gate-jobtitle').value.trim();
      var company = document.getElementById('btt-res-gate-company').value.trim();
      var industry = document.getElementById('btt-res-gate-industry').value;
      var consent = document.getElementById('btt-res-gate-consent').checked;

      if (!firstname || !lastname || !email || !jobtitle || !company || !industry || !consent){
        if (gateError){
          gateError.textContent = 'Please fill in every field and accept the consent checkbox.';
          gateError.hidden = false;
        }
        return;
      }

      if (gateSubmitBtn) gateSubmitBtn.disabled = true;
      if (gateSubmitLabel) gateSubmitLabel.textContent = 'Submitting\u2026';

      // 'firstname', 'lastname', 'email', 'jobtitle', 'company', 'industry'
      // and 'marketing_consent' all match the internal field names Jenny
      // confirmed for this HubSpot form (Form 1 / Resource Library).
      var payload = {
        fields: [
          { name: 'firstname', value: firstname },
          { name: 'lastname', value: lastname },
          { name: 'email', value: email },
          { name: 'jobtitle', value: jobtitle },
          { name: 'company', value: company },
          { name: 'industry', value: industry },
          { name: 'marketing_consent', value: consent }
        ],
        context: {
          pageUri: window.location.href,
          pageName: document.title
        }
      };

      fetch('https://api.hsforms.com/submissions/v3/integration/submit/' + config.portalId + '/' + config.formGuid, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(res){
        if (!res.ok) throw new Error('HubSpot submission failed: ' + res.status);
        return res.json();
      })
      .then(function(){
        closeGateModal();
        gateForm.reset();
        updateGateSubmitState();
        if (pendingDownloadUrl){
          window.open(pendingDownloadUrl, '_blank');
        }
      })
      .catch(function(err){
        console.error(err);
        if (gateError){
          gateError.textContent = 'Something went wrong submitting your details. Please try again.';
          gateError.hidden = false;
        }
      })
      .finally(function(){
        if (gateSubmitBtn) gateSubmitBtn.disabled = false;
        if (gateSubmitLabel) gateSubmitLabel.textContent = 'Get Download';
      });
    });
  }

  if (gateScrollHintEl && gateScrollPanel){
    gateScrollPanel.addEventListener('scroll', updateGateScrollHint, { passive: true });
    if ('ResizeObserver' in window){
      new ResizeObserver(updateGateScrollHint).observe(gateScrollPanel);
    }
    updateGateScrollHint();
  }

})();