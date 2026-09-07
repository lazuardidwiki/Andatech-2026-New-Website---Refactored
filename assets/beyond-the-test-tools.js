(function(){
  'use strict';

  // ===== Wizard data =====
  var STEPS = [
    { key: 'industry', label: 'Industry', options: ['Mining', 'Construction', 'Transport', 'Manufacturing', 'Healthcare', 'Other'] },
    { key: 'employees', label: 'Number of Employees', options: ['Under 20', '20\u2013100', '100\u2013500', '500+'] },
    { key: 'risk', label: 'Safety Risk Level', options: ['Low', 'Moderate', 'High', 'Safety-Critical'] },
    { key: 'objectives', label: 'Testing Objectives', options: ['Deterrence', 'Post-Incident', 'Pre-Employment', 'Ongoing Monitoring'] }
  ];

  var MATRIX = {
    'Low|Deterrence': { title: 'Light-Touch Deterrence Policy', body: 'At a low risk level, a clearly communicated policy with occasional reasonable-cause testing is usually enough to deter risky behaviour without overburdening your team.' },
    'Low|Post-Incident': { title: 'Post-Incident Testing Protocol', body: 'With low overall risk, a simple, documented post-incident testing step \u2014 triggered only after a safety event \u2014 keeps things proportionate.' },
    'Low|Pre-Employment': { title: 'Pre-Employment Screening Only', body: 'For lower-risk workplaces, pre-employment screening alone is often sufficient to set expectations from day one.' },
    'Low|Ongoing Monitoring': { title: 'Light Ongoing Monitoring', body: 'A low-frequency, policy-led monitoring approach fits low-risk environments without adding unnecessary overhead.' },
    'Moderate|Deterrence': { title: 'Policy-First With Periodic Testing', body: 'At a moderate risk level, a documented policy backed by periodic reasonable-cause testing is a proportionate deterrent.' },
    'Moderate|Post-Incident': { title: 'Structured Post-Incident Response', body: 'Moderate risk warrants a structured post-incident testing procedure with clear escalation and support pathways.' },
    'Moderate|Pre-Employment': { title: 'Pre-Employment + Periodic Reviews', body: 'Combine pre-employment screening with periodic policy reviews to keep pace with a moderate-risk environment.' },
    'Moderate|Ongoing Monitoring': { title: 'Scheduled Ongoing Monitoring', body: 'A scheduled monitoring cadence \u2014 quarterly or biannual \u2014 suits moderate-risk operations without the intensity of random testing.' },
    'High|Deterrence': { title: 'Random Testing Program', body: 'At a high risk level, a random testing program is typically the most effective deterrent, backed by clear consequences in policy.' },
    'High|Post-Incident': { title: 'Structured Program With Post-Incident Testing', body: 'High-risk environments benefit from mandatory post-incident testing paired with a clear, defensible investigation process.' },
    'High|Pre-Employment': { title: 'Rigorous Pre-Employment + Random Testing', body: 'Pair thorough pre-employment screening with an ongoing random testing program to manage high risk from day one onward.' },
    'High|Ongoing Monitoring': { title: 'Frequent Ongoing Monitoring', body: 'High risk calls for frequent, unannounced monitoring alongside supervisor training to reinforce standards day to day.' },
    'Safety-Critical|Deterrence': { title: 'Zero-Tolerance Deterrence Program', body: 'In safety-critical settings, a zero-tolerance policy with visible, frequent random testing sends the clearest deterrent signal.' },
    'Safety-Critical|Post-Incident': { title: 'Mandatory Post-Incident Protocol', body: 'Safety-critical operations should treat post-incident testing as mandatory, with rapid turnaround and strict chain of custody.' },
    'Safety-Critical|Pre-Employment': { title: 'Comprehensive Pre-Employment Screening', body: 'For safety-critical roles, comprehensive pre-employment screening \u2014 including confirmation testing \u2014 is essential before day one.' },
    'Safety-Critical|Ongoing Monitoring': { title: 'Continuous Monitoring Program', body: 'Safety-critical environments typically need continuous, high-frequency monitoring integrated into daily safety routines.' }
  };

  var ICONS = {
    industry: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></svg>',
    risk: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a1.5 1.5 0 001.3 2.25h17.76a1.5 1.5 0 001.3-2.25L13.7 3.86a1.5 1.5 0 00-2.6 0z"/></svg>',
    objectives: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>'
  };

  var ARROW_RIGHT = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l7 8-7 8"/></svg>';
  var DOC_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>';

  // ===== Related resources (from schema blocks) =====
  var resources = [];
  var dataEl = document.getElementById('btt-tools-resources-data');
  if (dataEl){
    try { resources = JSON.parse(dataEl.textContent) || []; } catch(e){ resources = []; }
  }

  function getRelatedResources(answers){
    if (!answers.risk) return [];
    var highRisk = (answers.risk === 'High' || answers.risk === 'Safety-Critical');
    var wanted = [];
    if (answers.objectives === 'Post-Incident') wanted.push('post_incident');
    if (answers.objectives === 'Pre-Employment') wanted.push('pre_employment');
    wanted.push(highRisk ? 'high_risk' : 'low_risk');
    wanted.push('general');

    var picked = [];
    var used = {};
    wanted.forEach(function(tag){
      if (picked.length >= 2) return;
      resources.forEach(function(r){
        if (picked.length >= 2) return;
        if (r.tag === tag && !used[r.title]){
          picked.push(r);
          used[r.title] = true;
        }
      });
    });
    if (!picked.length && resources.length) picked = resources.slice(0, 2);
    return picked;
  }

  function getRecommendation(answers){
    var base = MATRIX[answers.risk + '|' + answers.objectives] || {
      title: 'Tailored Testing Approach',
      body: 'Based on your answers, a combined approach balancing policy, screening and monitoring fits your workplace.'
    };
    var context = '';
    if (answers.industry && answers.employees){
      var industryPhrase = answers.industry === 'Other' ? 'your operation' : 'a ' + answers.industry.toLowerCase() + ' operation';
      context = ' This fits ' + industryPhrase + ' with ' + answers.employees + ' employees.';
    }
    return { title: base.title, body: base.body + context };
  }

  // ===== Scroll reveal — slide from sides, both in and out =====
  var leftCol = document.querySelector('.btt-tools__left');
  var cardWrapCol = document.querySelector('.btt-tools__card-wrap');
  var toolsSection = document.getElementById('tools');

  if (toolsSection && 'IntersectionObserver' in window){
    var revealObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          if (leftCol) leftCol.classList.add('is-visible');
          if (cardWrapCol) cardWrapCol.classList.add('is-visible');
        } else {
          if (leftCol) leftCol.classList.remove('is-visible');
          if (cardWrapCol) cardWrapCol.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.15 });
    revealObs.observe(toolsSection);
  } else {
    if (leftCol) leftCol.classList.add('is-visible');
    if (cardWrapCol) cardWrapCol.classList.add('is-visible');
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ===== Panel 1 preview: cycle the selected industry name (reuses the real
  // wizard's industry options — see STEPS[0] — instead of a separate list) =====
  var toolsCycleEl = document.getElementById('btt-tools-cycle-industry');
  if (toolsCycleEl && !reduceMotion){
    var toolsIndustryList = STEPS[0].options;
    var toolsIndustryIdx = 0;
    var toolsCycleTimer = null;

    function cycleToolsIndustry(){
      toolsIndustryIdx = (toolsIndustryIdx + 1) % toolsIndustryList.length;
      toolsCycleEl.classList.add('is-swapping');
      setTimeout(function(){
        toolsCycleEl.textContent = toolsIndustryList[toolsIndustryIdx];
        toolsCycleEl.classList.remove('is-swapping');
      }, 300);
    }

    if (toolsSection && 'IntersectionObserver' in window){
      var toolsCycleObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting){
            if (!toolsCycleTimer) toolsCycleTimer = setInterval(cycleToolsIndustry, 2400);
          } else {
            clearInterval(toolsCycleTimer);
            toolsCycleTimer = null;
          }
        });
      }, { threshold: 0.2 });
      toolsCycleObserver.observe(toolsSection);
    } else {
      toolsCycleTimer = setInterval(cycleToolsIndustry, 2400);
    }
  }

  // ===== Card: static tilt stays via CSS (rotateX(4deg) rotateY(±4deg), handles
  // the reversed layout too). Mousemove wobble removed — card no longer tracks
  // cursor for rotation. Glare DOES still track the cursor position. =====
  var previewCard = document.getElementById('btt-tools-card');
  var cardGlare = previewCard ? previewCard.querySelector('.btt-tools__card-glare') : null;
  var hasHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (previewCard && cardGlare && hasHover){
    previewCard.addEventListener('mousemove', function(e){
      var rect = previewCard.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      previewCard.style.setProperty('--gx', (x / rect.width * 100) + '%');
      previewCard.style.setProperty('--gy', (y / rect.height * 100) + '%');
    });
  }

  // ===== Modal state =====
  var modal = document.getElementById('btt-tools-modal');
  var backdrop = document.getElementById('btt-tools-backdrop');
  var closeBtn = document.getElementById('btt-tools-close');
  var openBtn = document.getElementById('btt-tools-open');
  var progressBar = document.getElementById('btt-tools-progress');
  var stepLabelEl = document.getElementById('btt-tools-step-label');
  var qTextEl = document.getElementById('btt-tools-q-text');
  var optsEl = document.getElementById('btt-tools-opts');
  var backBtn = document.getElementById('btt-tools-back');
  var scrollHintEl = document.getElementById('btt-tools-scroll-hint');

  // Same reparenting fix as the coming-soon modal below — this is the quiz
  // result modal, and it has the identical position:fixed containing-block
  // issue (it's the one visible "stuck" in the page in the reported bug).
  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
  var scrollHintPanel = document.querySelector('.btt-tools__modal-panel');

  function updateScrollHint(){
    if (!scrollHintEl || !scrollHintPanel) return;
    var needsScroll = scrollHintPanel.scrollHeight > scrollHintPanel.clientHeight + 4;
    var atBottom = scrollHintPanel.scrollTop + scrollHintPanel.clientHeight >= scrollHintPanel.scrollHeight - 4;
    scrollHintEl.classList.toggle('is-hidden', !needsScroll || atBottom);
  }

  var questionScreen = document.getElementById('btt-tools-question-screen');
  var resultScreen = document.getElementById('btt-tools-result-screen');
  var restartBtn = document.getElementById('btt-tools-restart');

  var resultTitleEl = document.getElementById('btt-tools-result-title');
  var resultBodyEl = document.getElementById('btt-tools-result-body');
  var metaEl = document.getElementById('btt-tools-meta');
  var resourcesEl = document.getElementById('btt-tools-resources');

  var stepIdx = 0;
  var answers = {};

  // Force-hide the shared site nav while the Quick Test modal is open, instead
  // of relying on it happening to auto-hide from scroll inside the modal
  // (which is what made Assessment look "correct" — its modal content is
  // taller, so scrolling inside it incidentally triggered the nav's own
  // scroll-based hide). Tools' modal content is shorter, so that never
  // reliably fired. This makes the hide deterministic regardless of content
  // length or scroll behavior.
  var siteNav = document.querySelector('.btt-nav');

  function openModal(){
    if (!modal) return;
    stepIdx = 0; answers = {};
    showStep(0);
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
    document.body.classList.add('btt-modal-open');
    if (siteNav) siteNav.classList.add('btt-nav--hidden');
  }
  function closeModal(){
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('btt-modal-open');
    if (siteNav) siteNav.classList.remove('btt-nav--hidden');
  }

  function showStep(idx){
    if (!questionScreen || !resultScreen) return;
    questionScreen.style.display = '';
    resultScreen.style.display = 'none';

    var step = STEPS[idx];
    var pct = (idx / STEPS.length) * 100;
    if (progressBar) progressBar.style.width = pct + '%';
    if (stepLabelEl) stepLabelEl.textContent = 'Step ' + (idx + 1) + ' of ' + STEPS.length;
    if (qTextEl) qTextEl.textContent = step.label;
    if (backBtn) backBtn.hidden = (idx === 0);
    setTimeout(updateScrollHint, 30);

    if (optsEl){
      optsEl.innerHTML = '';
      step.options.forEach(function(label){
        var btn = document.createElement('button');
        btn.className = 'btt-tools__modal-opt';
        btn.innerHTML = '<span>' + label + '</span>'
          + '<span class="btt-tools__modal-opt-arrow">' + ARROW_RIGHT + '</span>';
        btn.addEventListener('click', function(){ selectOption(step.key, label); });
        optsEl.appendChild(btn);
      });
    }
  }

  function selectOption(key, value){
    answers[key] = value;
    var next = stepIdx + 1;
    if (next < STEPS.length){
      questionScreen.setAttribute('data-transitioning', 'true');
      setTimeout(function(){
        stepIdx = next;
        showStep(stepIdx);
        questionScreen.removeAttribute('data-transitioning');
      }, 220);
    } else {
      showResult();
    }
  }

  function goBack(){
    if (stepIdx === 0) return;
    stepIdx -= 1;
    delete answers[STEPS[stepIdx].key];
    showStep(stepIdx);
  }

  function showResult(){
    if (!questionScreen || !resultScreen) return;
    questionScreen.style.display = 'none';
    resultScreen.style.display = '';
    setTimeout(updateScrollHint, 30);
    if (progressBar) progressBar.style.width = '100%';
    if (stepLabelEl) stepLabelEl.textContent = 'Your Result';

    var rec = getRecommendation(answers);
    if (resultTitleEl) resultTitleEl.textContent = rec.title;
    if (resultBodyEl) resultBodyEl.textContent = rec.body;

    if (metaEl){
      metaEl.innerHTML = '';
      var metaData = [
        { icon: ICONS.industry, text: answers.industry },
        { icon: ICONS.risk, text: answers.risk + ' risk' },
        { icon: ICONS.objectives, text: answers.objectives }
      ];
      metaData.forEach(function(m){
        var div = document.createElement('div');
        div.className = 'btt-tools__meta-item';
        div.innerHTML = m.icon + '<span>' + m.text + '</span>';
        metaEl.appendChild(div);
      });
    }

    if (resourcesEl){
      resourcesEl.innerHTML = '';
      getRelatedResources(answers).forEach(function(r){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btt-tools__resource';
        btn.innerHTML = '<span class="btt-tools__resource-icon">' + DOC_ICON + '</span>'
          + '<span class="btt-tools__resource-title">' + r.title + '</span>'
          + '<span class="btt-tools__resource-arrow">' + ARROW_RIGHT + '</span>';
        btn.addEventListener('click', function(){
          if (r.url){
            // Ready — reuse the Resource Library's gated-download flow
            // (same HubSpot form) rather than duplicating it here.
            if (window.BTTResourceGate && window.BTTResourceGate.open){
              window.BTTResourceGate.open(r.url, r.title);
            } else {
              window.open(r.url, '_blank');
            }
          } else {
            openSoonModal(r.title);
          }
        });
        resourcesEl.appendChild(btn);
      });
    }
  }

  // ===== Coming-soon modal — shown for related resources with no link yet =====
  var soonModal = document.getElementById('btt-tools-soon-modal');
  var soonBackdrop = document.getElementById('btt-tools-soon-backdrop');
  var soonClose = document.getElementById('btt-tools-soon-close');

  // Reparent to <body> — even though this markup sits outside the <section>
  // tag in the liquid source, Shopify still wraps the whole section's
  // rendered output (including this modal) in one shopify-section div. If
  // ANY ancestor anywhere up that chain ends up with a transform/filter/
  // will-change (this section's own scroll-reveal animations, or another
  // section's), position:fixed stops anchoring to the viewport and instead
  // anchors to that ancestor — the modal then visually "drags" with scroll
  // instead of staying put. Moving it to a body-level sibling sidesteps the
  // containing-block issue entirely, regardless of what else is on the page.
  if (soonModal && soonModal.parentElement !== document.body) {
    document.body.appendChild(soonModal);
  }

  function openSoonModal(){
    if (!soonModal) return;
    soonModal.classList.add('is-open');
    soonModal.removeAttribute('aria-hidden');
    document.body.classList.add('btt-modal-open');
  }
  function closeSoonModal(){
    if (!soonModal) return;
    soonModal.classList.remove('is-open');
    soonModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('btt-modal-open');
  }
  if (soonBackdrop) soonBackdrop.addEventListener('click', closeSoonModal);
  if (soonClose) soonClose.addEventListener('click', closeSoonModal);
  var soonBrowseLink = document.getElementById('btt-tools-soon-browse');
  if (soonBrowseLink) soonBrowseLink.addEventListener('click', function(){
    closeSoonModal();
    closeModal();
  });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeSoonModal(); });

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (backBtn) backBtn.addEventListener('click', goBack);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeModal(); });

  if (restartBtn) restartBtn.addEventListener('click', function(){
    stepIdx = 0; answers = {};
    showStep(0);
  });

  // ===== Sync swipe dots with preview panels horizontal scroll (mobile) =====
  var panelsEl = document.querySelector('.btt-tools__panels');
  var swipeDots = Array.from(document.querySelectorAll('.btt-tools__swipe-dot'));
  if (panelsEl && swipeDots.length){
    panelsEl.addEventListener('scroll', function(){
      var firstPanel = panelsEl.querySelector('.btt-tools__panel');
      if (!firstPanel) return;
      var panelW = firstPanel.offsetWidth + 12;
      var idx = Math.round(panelsEl.scrollLeft / panelW);
      swipeDots.forEach(function(d, i){
        if (i === idx) d.classList.add('is-active');
        else d.classList.remove('is-active');
      });
    }, { passive: true });
  }

  // ===== Modal scroll hint (mobile) — shows a bouncing down-arrow when the
  // modal content is taller than the visible area, hides once scrolled near
  // the bottom or when there's nothing to scroll (e.g. desktop, short content). =====
  if (scrollHintEl && scrollHintPanel){
    scrollHintPanel.addEventListener('scroll', updateScrollHint, { passive: true });
    if ('ResizeObserver' in window){
      new ResizeObserver(updateScrollHint).observe(scrollHintPanel);
    }
    if (openBtn) openBtn.addEventListener('click', function(){ setTimeout(updateScrollHint, 50); });
    updateScrollHint();
  }

})();