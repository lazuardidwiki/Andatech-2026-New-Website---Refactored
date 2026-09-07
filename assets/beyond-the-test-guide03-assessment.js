(function(){
  'use strict';

  var modal = document.getElementById('btt-g3-modal');
  if (!modal) return;

  // Reparent to <body>, same reason as every other BTT modal — keeps
  // position:fixed anchored to the viewport regardless of where the
  // Resources section sits in the page, and keeps stacking order sane
  // relative to the other modals.
  if (modal.parentElement !== document.body) document.body.appendChild(modal);

  var backdrop = document.getElementById('btt-g3-backdrop');
  var closeBtn = document.getElementById('btt-g3-close');
  var panel = document.getElementById('btt-g3-panel');

  var screenIntro = document.getElementById('btt-g3-intro');
  var screenQuestion = document.getElementById('btt-g3-question');
  var screenGate = document.getElementById('btt-g3-gate');
  var screenResults = document.getElementById('btt-g3-results');

  var progressWrap = document.getElementById('btt-g3-progress-wrap');
  var progressFill = document.getElementById('btt-g3-progress-fill');
  var progressText = document.getElementById('btt-g3-progress-text');
  var progressPct = document.getElementById('btt-g3-progress-pct');
  var stepIndicator = document.getElementById('btt-g3-step-indicator');

  var qNum = document.getElementById('btt-g3-q-num');
  var qEyebrow = document.getElementById('btt-g3-q-eyebrow');
  var qTitle = document.getElementById('btt-g3-q-title');
  var qSub = document.getElementById('btt-g3-q-sub');
  var optionsWrap = document.getElementById('btt-g3-options');
  var backBtn = document.getElementById('btt-g3-back-btn');
  var nextBtn = document.getElementById('btt-g3-next-btn');

  // Scroll hint — bottom-fixed chevron shown only when the panel is
  // actually scrollable and not already at the bottom. Same pattern as
  // the Assessment/Tools/Resources modals.
  var scrollHintEl = document.getElementById('btt-g3-scroll-hint');
  function updateScrollHint(){
    if (!scrollHintEl || !panel) return;
    var needsScroll = panel.scrollHeight > panel.clientHeight + 4;
    var atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 4;
    scrollHintEl.classList.toggle('is-hidden', !needsScroll || atBottom);
  }
  if (panel){
    panel.addEventListener('scroll', updateScrollHint, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(updateScrollHint).observe(panel);
  }

  // ===== Assessment content — mirrors the signed-off guide content exactly. =====
  var dimensions = [
    {
      key:'governance', title:'Governance', eyebrow:'Section 1 — Governance',
      question:'Who owns workplace testing in your organisation?',
      options:[
        {level:'Reactive', text:'There\u2019s no formal ownership \u2014 decisions are made ad hoc when an incident occurs.'},
        {level:'Developing', text:'A manager is informally responsible, but there\u2019s no documented governance structure.'},
        {level:'Established', text:'A designated owner and documented reporting line exist for the program.'},
        {level:'Leading practice', text:'Governance is embedded \u2014 outcomes are reported to leadership and reviewed against strategy.'}
      ]
    },
    {
      key:'risk', title:'Risk Assessment', eyebrow:'Section 2 — Risk assessment',
      question:'How is workplace risk assessed?',
      options:[
        {level:'Reactive', text:'Safety-sensitive roles haven\u2019t been formally identified.'},
        {level:'Developing', text:'Some safety-sensitive roles are identified, but the assessment isn\u2019t documented.'},
        {level:'Established', text:'A documented risk assessment identifies safety-sensitive roles and informs the program.'},
        {level:'Leading practice', text:'Risk assessment is reviewed regularly and directly shapes policy, training and testing decisions.'}
      ]
    },
    {
      key:'policy', title:'Policy', eyebrow:'Section 3 — Policy',
      question:'What\u2019s the state of your Drug & Alcohol Policy?',
      options:[
        {level:'Reactive', text:'There is no written policy.'},
        {level:'Developing', text:'A policy exists but hasn\u2019t been updated or communicated recently.'},
        {level:'Established', text:'A current, documented policy is in place and communicated to the workforce.'},
        {level:'Leading practice', text:'Policy is reviewed on a set schedule and reflects current legislation and workplace risk.'}
      ]
    },
    {
      key:'consultation', title:'Consultation', eyebrow:'Section 4 — Consultation',
      question:'How has the workforce been consulted?',
      options:[
        {level:'Reactive', text:'Employees were not consulted when testing was introduced.'},
        {level:'Developing', text:'Some informal consultation occurred, but it wasn\u2019t documented.'},
        {level:'Established', text:'Formal consultation took place and is documented.'},
        {level:'Leading practice', text:'Consultation is ongoing, with a standing mechanism for feedback and concerns.'}
      ]
    },
    {
      key:'supervisor', title:'Supervisor Capability', eyebrow:'Section 5 — Supervisor capability',
      question:'How capable are your supervisors of applying the policy?',
      options:[
        {level:'Reactive', text:'Supervisors haven\u2019t been trained on the testing policy or procedures.'},
        {level:'Developing', text:'Some supervisors have informal awareness, but no structured training.'},
        {level:'Established', text:'Supervisors have completed structured training on policy and procedures.'},
        {level:'Leading practice', text:'Supervisor capability is assessed and refreshed on a regular schedule.'}
      ]
    },
    {
      key:'testing', title:'Testing', eyebrow:'Section 6 — Testing',
      question:'How was your testing methodology chosen?',
      options:[
        {level:'Reactive', text:'The testing methodology wasn\u2019t selected against workplace objectives.'},
        {level:'Developing', text:'A testing method is in place, but wasn\u2019t matched to a documented objective.'},
        {level:'Established', text:'The methodology (oral fluid or urine) is matched to workplace risk and objectives.'},
        {level:'Leading practice', text:'Screening and confirmatory testing stages are both defined and applied consistently.'}
      ]
    },
    {
      key:'documentation', title:'Documentation', eyebrow:'Section 7 — Documentation',
      question:'How is chain of custody documented?',
      options:[
        {level:'Reactive', text:'Testing records are informal or inconsistent.'},
        {level:'Developing', text:'Some records are kept, but chain of custody isn\u2019t formally documented.'},
        {level:'Established', text:'Chain of custody procedures are documented and consistently followed.'},
        {level:'Leading practice', text:'Documentation is audited periodically to confirm it would stand up to scrutiny.'}
      ]
    },
    {
      key:'review', title:'Continuous Improvement', eyebrow:'Section 8 — Continuous improvement',
      question:'How often is the program reviewed?',
      options:[
        {level:'Reactive', text:'The program has never been reviewed since it was introduced.'},
        {level:'Developing', text:'The program is reviewed occasionally, but not on a set schedule.'},
        {level:'Established', text:'The program is reviewed on a regular, documented schedule.'},
        {level:'Leading practice', text:'Review outcomes actively shape policy, training and risk assessment updates.'}
      ]
    }
  ];

  var resourceMap = {
    governance:{guide:'Guide 10', title:'Governance Framework'},
    risk:{guide:'Guide 09', title:'Risk Assessment Toolkit'},
    policy:{guide:'Guide 04', title:'Policy Builder'},
    consultation:{guide:'Guide 06', title:'Workforce Consultation Guide'},
    supervisor:{guide:'Guide 05', title:'Supervisor Toolkit'},
    testing:{guide:'Guide 08', title:'Confirmatory Laboratory Testing'},
    documentation:{guide:'Guide 07', title:'Chain of Custody'},
    review:{guide:'Guide 11', title:'Program Review Toolkit'}
  };

  var levels = [
    {name:'Reactive', tier:1, filled:0, color:'#EF4444'},
    {name:'Developing', tier:2, filled:2, color:'#46BEC4'},
    {name:'Established', tier:3, filled:6, color:'#5B6B80'},
    {name:'Leading Practice', tier:4, filled:10, color:'#95C11F'}
  ];

  var current = 0;
  var answers = {};
  var gated = false; // whether the lead form has already been cleared this session

  // ===== Modal open/close =====
  function openModal(){
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
    document.body.classList.add('btt-modal-open');
    resetToIntro();
  }
  function closeModal(){
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('btt-modal-open');
  }
  // Exposed so the Resources section (or any future trigger) can open this
  // without duplicating modal logic.
  window.BTTGuide03Assessment = { open: openModal };

  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  document.querySelectorAll('[data-open-assessment="guide03"]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      openModal();
    });
  });

  function showScreen(el){
    [screenIntro, screenQuestion, screenGate, screenResults].forEach(function(s){
      if (s) s.classList.remove('is-active');
    });
    if (el) el.classList.add('is-active');
    if (panel) panel.scrollTop = 0;
    setTimeout(updateScrollHint, 30);
  }

  function resetToIntro(){
    current = 0;
    answers = {};
    showScreen(screenIntro);
    if (progressWrap) progressWrap.classList.remove('is-shown');
    if (stepIndicator) stepIndicator.textContent = '';
  }

  // ===== Intro → first question =====
  var startBtn = document.getElementById('btt-g3-start-btn');
  if (startBtn) startBtn.addEventListener('click', function(){
    current = 0;
    answers = {};
    if (progressWrap) progressWrap.classList.add('is-shown');
    showScreen(screenQuestion);
    renderQuestion();
  });

  // ===== Question rendering =====
  function renderQuestion(){
    var d = dimensions[current];
    if (qNum) qNum.textContent = current + 1;
    if (qEyebrow) qEyebrow.textContent = d.eyebrow;
    if (qTitle) qTitle.textContent = d.question;
    if (qSub) qSub.textContent = 'Score yourself \u2014 choose the option that best describes ' + d.title.toLowerCase() + ' today.';
    if (stepIndicator) stepIndicator.textContent = 'Step ' + (current + 1) + ' of ' + dimensions.length;

    if (optionsWrap){
      optionsWrap.innerHTML = '';
      d.options.forEach(function(opt, i){
        var el = document.createElement('div');
        el.className = 'btt-g3__option' + (answers[d.key] === i ? ' is-selected' : '');
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        var otext = document.createElement('div');
        otext.className = 'btt-g3__otext';
        var level = document.createElement('div');
        level.className = 'btt-g3__level';
        level.textContent = opt.level;
        var p = document.createElement('p');
        p.textContent = opt.text;
        otext.appendChild(level);
        otext.appendChild(p);
        var radio = document.createElement('div');
        radio.className = 'btt-g3__radio';
        el.appendChild(radio);
        el.appendChild(otext);
        var pick = function(){
          answers[d.key] = i;
          renderQuestion();
        };
        el.addEventListener('click', pick);
        el.addEventListener('keydown', function(e){
          if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); pick(); }
        });
        optionsWrap.appendChild(el);
      });
    }

    if (backBtn) backBtn.disabled = false;
    if (nextBtn){
      nextBtn.disabled = !(d.key in answers);
      nextBtn.textContent = current === dimensions.length - 1 ? 'See my results \u2192' : 'Next \u2192';
    }

    var pct = Math.round((current / dimensions.length) * 100);
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressText) progressText.textContent = 'Section ' + (current + 1) + ' of ' + dimensions.length;
    if (progressPct) progressPct.textContent = pct + '%';

    if (panel) panel.scrollTop = 0;
    setTimeout(updateScrollHint, 30);
  }

  if (backBtn) backBtn.addEventListener('click', function(){
    if (current > 0){
      current--;
      renderQuestion();
    } else {
      resetToIntro();
    }
  });

  if (nextBtn) nextBtn.addEventListener('click', function(){
    if (current < dimensions.length - 1){
      current++;
      renderQuestion();
    } else {
      goToGateOrResults();
    }
  });

  // ===== Gate — lead capture before the score reveals =====
  var gateForm = document.getElementById('btt-g3-gate-form');
  var gateError = document.getElementById('btt-g3-gate-error');
  var gateSubmitBtn = document.getElementById('btt-g3-gate-submit');
  var gateSubmitLabel = gateSubmitBtn ? gateSubmitBtn.querySelector('.btt-g3__gate-submit-label') : null;

  var gateFirstname = document.getElementById('btt-g3-gate-firstname');
  var gateLastname = document.getElementById('btt-g3-gate-lastname');
  var gateEmail = document.getElementById('btt-g3-gate-email');
  var gateJobtitle = document.getElementById('btt-g3-gate-jobtitle');
  var gateCompany = document.getElementById('btt-g3-gate-company');
  var gateIndustry = document.getElementById('btt-g3-gate-industry');
  var gateConsent = document.getElementById('btt-g3-gate-consent');

  function updateGateSubmitState(){
    if (!gateSubmitBtn) return;
    var allFilled = gateFirstname && gateFirstname.value.trim()
      && gateLastname && gateLastname.value.trim()
      && gateEmail && gateEmail.value.trim()
      && gateJobtitle && gateJobtitle.value.trim()
      && gateCompany && gateCompany.value.trim()
      && gateIndustry && gateIndustry.value
      && gateConsent && gateConsent.checked;
    gateSubmitBtn.disabled = !allFilled;
  }
  [gateFirstname, gateLastname, gateEmail, gateJobtitle, gateCompany].forEach(function(input){
    if (input) input.addEventListener('input', updateGateSubmitState);
  });
  if (gateIndustry) gateIndustry.addEventListener('change', updateGateSubmitState);
  if (gateConsent) gateConsent.addEventListener('change', updateGateSubmitState);

  function goToGateOrResults(){
    if (gated){
      showResults();
      return;
    }
    showScreen(screenGate);
    if (stepIndicator) stepIndicator.textContent = 'Almost there';
    if (progressWrap) progressWrap.classList.remove('is-shown');
  }

  if (gateForm) gateForm.addEventListener('submit', function(e){
    e.preventDefault();
    if (gateError) gateError.hidden = true;

    // Reuses the exact same HubSpot form as the Resource Library gated
    // download (window.BTT_RES_HUBSPOT, set in beyond-the-test-resources.liquid)
    // so completed assessments land as leads in the same place, with the
    // same fields Jenny already configured. Falls back to the known
    // portal/form IDs if the Resources section isn't present on the page.
    var config = window.BTT_RES_HUBSPOT || { portalId:'7005767', formGuid:'309fda14-bdc1-4685-bc91-1420c8ab29a0' };
    if (!config.portalId || !config.formGuid){
      if (gateError){
        gateError.textContent = 'This form isn\u2019t configured yet \u2014 add the HubSpot Portal ID and Form GUID in the Resources section settings.';
        gateError.hidden = false;
      }
      return;
    }

    var firstname = gateFirstname.value.trim();
    var lastname = gateLastname.value.trim();
    var email = gateEmail.value.trim();
    var jobtitle = gateJobtitle.value.trim();
    var company = gateCompany.value.trim();
    var industry = gateIndustry.value;
    var consent = gateConsent.checked;

    if (!firstname || !lastname || !email || !jobtitle || !company || !industry || !consent){
      if (gateError){
        gateError.textContent = 'Please fill in every field and accept the consent checkbox.';
        gateError.hidden = false;
      }
      return;
    }

    if (gateSubmitBtn) gateSubmitBtn.disabled = true;
    if (gateSubmitLabel) gateSubmitLabel.textContent = 'Submitting\u2026';

    var payload = {
      fields: [
        { name:'firstname', value:firstname },
        { name:'lastname', value:lastname },
        { name:'email', value:email },
        { name:'jobtitle', value:jobtitle },
        { name:'company', value:company },
        { name:'industry', value:industry },
        { name:'marketing_consent', value:consent }
      ],
      context: {
        pageUri: window.location.href,
        pageName: document.title
      }
    };

    fetch('https://api.hsforms.com/submissions/v3/integration/submit/' + config.portalId + '/' + config.formGuid, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res){
      if (!res.ok) throw new Error('HubSpot submission failed: ' + res.status);
      return res.json();
    })
    .then(function(){
      gated = true;
      showResults();
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
      if (gateSubmitLabel) gateSubmitLabel.textContent = 'Reveal my results';
      updateGateSubmitState();
    });
  });

  // ===== Results =====
  var scoreBig = document.getElementById('btt-g3-score-big');
  var levelChip = document.getElementById('btt-g3-level-chip');
  var ladderEl = document.getElementById('btt-g3-ladder');
  var strengthsList = document.getElementById('btt-g3-strengths');
  var gapsList = document.getElementById('btt-g3-gaps');
  var resourceListEl = document.getElementById('btt-g3-resource-list');

  function showResults(){
    showScreen(screenResults);
    if (stepIndicator) stepIndicator.textContent = 'Results';

    var sum = 0;
    var scored = dimensions.map(function(d){
      var idx = answers[d.key];
      var val = idx + 1; // 1-4
      sum += val;
      return { key:d.key, title:d.title, val:val, level:d.options[idx].level };
    });
    var max = dimensions.length * 4;
    var score100 = Math.round((sum / max) * 100);

    var levelIdx;
    if (score100 <= 25) levelIdx = 0;
    else if (score100 <= 50) levelIdx = 1;
    else if (score100 <= 75) levelIdx = 2;
    else levelIdx = 3;
    var level = levels[levelIdx];

    if (scoreBig) scoreBig.textContent = score100;
    if (levelChip){
      levelChip.textContent = 'Level ' + level.tier + ' \u2014 ' + level.name;
      levelChip.style.background = level.color;
    }

    if (ladderEl){
      ladderEl.innerHTML = '';
      levels.forEach(function(l){
        var row = document.createElement('div');
        row.className = 'btt-g3__ladder-row' + (l.tier === level.tier ? ' is-current' : '');
        var lname = document.createElement('div');
        lname.className = 'btt-g3__lname';
        lname.innerHTML = '<div class="btt-g3__ln">Level ' + l.tier + '</div><div class="btt-g3__lt">' + l.name + '</div>';
        var blocks = document.createElement('div');
        blocks.className = 'btt-g3__blocks';
        for (var i = 0; i < 10; i++){
          var b = document.createElement('div');
          b.className = 'btt-g3__block' + (i < l.filled ? ' is-filled' : '');
          blocks.appendChild(b);
        }
        row.appendChild(lname);
        row.appendChild(blocks);
        if (l.tier === level.tier){
          var tag = document.createElement('div');
          tag.className = 'btt-g3__you-tag';
          tag.textContent = '\u2190 You are here';
          row.appendChild(tag);
        }
        ladderEl.appendChild(row);
      });
    }

    var strengths = scored.filter(function(s){ return s.val === 4; });
    if (!strengths.length) strengths = scored.filter(function(s){ return s.val === 3; });
    var gaps = scored.filter(function(s){ return s.val <= 2; });

    if (strengthsList){
      strengthsList.innerHTML = strengths.length
        ? strengths.map(function(s){ return '<div class="btt-g3__result-item"><span class="btt-g3__mark">\u2713</span>' + s.title + '</div>'; }).join('')
        : '<div class="btt-g3__empty-note">No dimension yet scored at Leading Practice \u2014 that\u2019s your growth area.</div>';
    }
    if (gapsList){
      gapsList.innerHTML = gaps.length
        ? gaps.map(function(s){ return '<div class="btt-g3__result-item"><span class="btt-g3__mark">\u26A0</span>' + s.title + '</div>'; }).join('')
        : '<div class="btt-g3__empty-note">No significant gaps identified \u2014 maintain your current review cycle.</div>';
    }

    var gapKeys = gaps.map(function(g){ return g.key; });
    if (!gapKeys.length){
      var sortedAsc = scored.slice().sort(function(a, b){ return a.val - b.val; });
      gapKeys = sortedAsc.slice(0, 3).map(function(s){ return s.key; });
    }
    gapKeys = gapKeys.slice(0, 4);
    if (resourceListEl){
      resourceListEl.innerHTML = gapKeys.map(function(k){
        var r = resourceMap[k];
        return '<div class="btt-g3__resource-item"><span class="btt-g3__rg">' + r.guide + '</span>' + r.title + '</div>';
      }).join('');
    }
  }

  var retakeBtn = document.getElementById('btt-g3-retake-btn');
  if (retakeBtn) retakeBtn.addEventListener('click', function(){
    resetToIntro();
  });

})();
