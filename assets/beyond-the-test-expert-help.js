(function(){
  'use strict';

  var section = document.getElementById('expert-help');
  if (!section) return;

  var header = section.querySelector('.btt-expert__header');
  var formWrap = section.querySelector('.btt-expert__form-wrap');
  var panel = section.querySelector('.btt-expert__panel');
  var targets = [header, formWrap, panel].filter(Boolean);

  if (targets.length && 'IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          // Scrolled into view — fade/slide in
          targets.forEach(function(el){
            el.classList.remove('is-exiting');
            el.classList.add('is-visible');
          });
        } else if (e.boundingClientRect.top < 0){
          // Scrolled past above the viewport — fade/slide out upward
          targets.forEach(function(el){
            el.classList.remove('is-visible');
            el.classList.add('is-exiting');
          });
        } else {
          // Below the viewport, not yet reached (or scrolled back up past
          // it) — reset to hidden so it can play the entry animation again
          targets.forEach(function(el){
            el.classList.remove('is-visible');
            el.classList.remove('is-exiting');
          });
        }
      });
    }, { threshold: 0.15 });
    obs.observe(section);
  } else {
    targets.forEach(function(el){ el.classList.add('is-visible'); });
  }

  // ===== HubSpot form submission =====
  var expertForm = document.getElementById('btt-expert-form');
  if (expertForm){
    var fieldsWrap = document.getElementById('btt-expert-fields');
    var successEl = document.getElementById('btt-expert-success');
    var errorEl = document.getElementById('btt-expert-error');
    var errorTextEl = document.getElementById('btt-expert-error-text');
    var submitBtn = expertForm.querySelector('.btt-expert__submit');
    var submitLabelEl = expertForm.querySelector('.btt-expert__submit-label');
    var submitLabelDefault = submitLabelEl ? submitLabelEl.textContent : 'Send My Enquiry';

    expertForm.addEventListener('submit', function(e){
      e.preventDefault();
      if (errorEl) errorEl.hidden = true;

      var portalId = expertForm.dataset.portalId;
      var formGuid = expertForm.dataset.formGuid;
      if (!portalId || !formGuid){
        if (errorEl && errorTextEl){
          errorTextEl.textContent = "This form isn't connected yet — please contact us directly.";
          errorEl.hidden = false;
        }
        return;
      }

      var fields = [];
      Array.prototype.forEach.call(expertForm.elements, function(el){
        if (!el.name || el.type === 'submit' || el.type === 'button') return;
        fields.push({ name: el.name, value: el.value });
      });

      if (submitBtn) submitBtn.disabled = true;
      if (submitLabelEl) submitLabelEl.textContent = 'Sending…';

      fetch('https://api.hsforms.com/submissions/v3/integration/submit/' + portalId + '/' + formGuid, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: fields,
          context: { pageUri: window.location.href, pageName: document.title }
        })
      })
      .then(function(res){
        if (!res.ok) throw new Error('HubSpot submission failed');
        return res.json();
      })
      .then(function(){
        if (fieldsWrap) fieldsWrap.hidden = true;
        if (successEl) successEl.hidden = false;
      })
      .catch(function(){
        if (submitBtn) submitBtn.disabled = false;
        if (submitLabelEl) submitLabelEl.textContent = submitLabelDefault;
        if (errorEl && errorTextEl){
          errorTextEl.textContent = 'Something went wrong — please try again, or email us directly.';
          errorEl.hidden = false;
        }
      });
    });
  }

})();