(function(){
  'use strict';

  // ===== Assessment data (from wireframe source) =====
  var QUESTIONS = [
    {
      q: 'Do you have a written drug and alcohol policy?',
      options: [
        { label: 'Yes', score: 3 },
        { label: 'In progress', score: 1 },
        { label: 'No', score: 0 }
      ]
    },
    {
      q: 'Do you currently conduct any workplace testing?',
      options: [
        { label: 'Yes, regularly', score: 3 },
        { label: 'Yes, occasionally', score: 1 },
        { label: 'No', score: 0 }
      ]
    },
    {
      q: 'Have supervisors been trained to recognise impairment?',
      options: [
        { label: 'Yes', score: 3 },
        { label: 'Not sure', score: 1 },
        { label: 'No', score: 0 }
      ]
    }
  ];

  var MAX_SCORE = QUESTIONS.reduce(function(sum, q){
    return sum + Math.max.apply(null, q.options.map(function(o){ return o.score; }));
  }, 0); // = 9

  var BANDS = [
    {
      min: 0, max: 33,
      title: 'Early Stage',
      body: 'Your workplace program is at the beginning of its compliance journey. Focus on establishing the fundamentals — a written policy and basic supervisor awareness.',
      color: '#EF4444',
      recs: ['Develop a written D&A policy', 'Conduct supervisor awareness training', 'Consult with a compliance expert', 'Download our policy builder']
    },
    {
      min: 34, max: 66,
      title: 'Developing',
      body: 'You have some foundations in place but key gaps remain. Strengthening testing protocols and supervisor training will lift your maturity significantly.',
      color: '#F59E0B',
      recs: ['Review policy maturity', 'Improve supervisor training', 'Implement random testing', 'Download policy builder']
    },
    {
      min: 67, max: 89,
      title: 'Progressing Well',
      body: 'Your program is solid and demonstrates reasonable compliance maturity. Focus on consistency and ensuring your documentation is defensible.',
      color: '#46BEC4',
      recs: ['Strengthen documentation', 'Review chain of custody', 'Consider annual policy refresh', 'Explore accreditation options']
    },
    {
      min: 90, max: 100,
      title: 'Strong Maturity',
      body: 'Your workplace program is comprehensive and well-embedded. Continue to monitor legislative changes and ensure annual policy reviews are conducted.',
      color: '#95C11F',
      recs: ['Maintain annual policy reviews', 'Monitor legislative updates', 'Share learnings across teams', 'Book a compliance health check']
    }
  ];

  function getBand(pct){
    for (var i = 0; i < BANDS.length; i++){
      if (pct >= BANDS[i].min && pct <= BANDS[i].max) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  // ===== Scroll reveal — slide from sides =====
  var leftCol = document.querySelector('.btt-assess__left');
  var rightCol = document.querySelector('.btt-assess__card-wrap');
  var assessSection = document.getElementById('assessment');

  if (assessSection && 'IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          if (leftCol) leftCol.classList.add('is-visible');
          if (rightCol) rightCol.classList.add('is-visible');
        } else {
          if (leftCol) leftCol.classList.remove('is-visible');
          if (rightCol) rightCol.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.15 });
    obs.observe(assessSection);
  } else {
    if (leftCol) leftCol.classList.add('is-visible');
    if (rightCol) rightCol.classList.add('is-visible');
  }

  // ===== Card: static tilt stays via CSS default (rotateX(4deg) rotateY(-4deg)).
  // Mousemove wobble removed — card no longer tracks cursor for rotation.
  // Glare DOES still track the cursor position (just the light spot, not tilt). =====
  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var previewCard = document.getElementById('btt-assess-card');
  var cardGlare = previewCard ? previewCard.querySelector('.btt-assess__card-glare') : null;
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

  // ===== Panel 1 preview: cycle the selected industry name =====
  var cycleEl = document.getElementById('btt-assess-cycle-industry');
  if (cycleEl && !reduceMotion){
    var industryList = ['Mining', 'Aviation', 'Transport', 'Construction', 'Healthcare', 'Manufacture', 'Maritime', 'Education'];
    var industryIdx = 0;
    var cycleTimer = null;

    function cycleIndustry(){
      industryIdx = (industryIdx + 1) % industryList.length;
      cycleEl.classList.add('is-swapping');
      setTimeout(function(){
        cycleEl.textContent = industryList[industryIdx];
        cycleEl.classList.remove('is-swapping');
      }, 300);
    }

    if (assessSection && 'IntersectionObserver' in window){
      var cycleObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting){
            if (!cycleTimer) cycleTimer = setInterval(cycleIndustry, 2400);
          } else {
            clearInterval(cycleTimer);
            cycleTimer = null;
          }
        });
      }, { threshold: 0.2 });
      cycleObserver.observe(assessSection);
    } else {
      cycleTimer = setInterval(cycleIndustry, 2400);
    }
  }

  // ===== Modal state =====
  var modal = document.getElementById('btt-assess-modal');
  var backdrop = document.getElementById('btt-assess-backdrop');
  var closeBtn = document.getElementById('btt-assess-close');
  var openBtn = document.getElementById('btt-assess-open');
  var progressBar = document.getElementById('btt-assess-progress');
  var stepLabel = document.getElementById('btt-assess-step-label');
  var qText = document.getElementById('btt-assess-q-text');
  var optsEl = document.getElementById('btt-assess-opts');
  var questionScreen = document.getElementById('btt-assess-question-screen');
  var resultScreen = document.getElementById('btt-assess-result-screen');
  var restartBtn = document.getElementById('btt-assess-restart');
  var backBtn = document.getElementById('btt-assess-back');
  var scrollHintEl = document.getElementById('btt-assess-scroll-hint');
  var scrollHintPanel = document.querySelector('.btt-assess__modal-panel');

  function updateScrollHint(){
    if (!scrollHintEl || !scrollHintPanel) return;
    var needsScroll = scrollHintPanel.scrollHeight > scrollHintPanel.clientHeight + 4;
    var atBottom = scrollHintPanel.scrollTop + scrollHintPanel.clientHeight >= scrollHintPanel.scrollHeight - 4;
    scrollHintEl.classList.toggle('is-hidden', !needsScroll || atBottom);
  }

  var currentStep = 0;
  var totalScore = 0;
  var answers = [];

  function openModal(){
    if (!modal) return;
    currentStep = 0; totalScore = 0; answers = [];
    showQuestion(0);
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
    document.body.classList.add('btt-modal-open');
  }
  function closeModal(){
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('btt-modal-open');
  }

  function goBack(){
    if (currentStep === 0) return;
    var removed = answers.pop();
    if (removed) totalScore -= removed.score;
    currentStep -= 1;
    showQuestion(currentStep);
  }

  function showQuestion(idx){
    if (!questionScreen || !resultScreen) return;
    currentStep = idx;
    questionScreen.style.display = '';
    resultScreen.style.display = 'none';

    var q = QUESTIONS[idx];
    var pct = ((idx) / QUESTIONS.length) * 100;
    if (progressBar) progressBar.style.width = pct + '%';
    if (stepLabel) stepLabel.textContent = 'Question ' + (idx + 1) + ' of ' + QUESTIONS.length;
    if (qText) qText.textContent = q.q;
    if (backBtn) backBtn.hidden = (idx === 0);
    setTimeout(updateScrollHint, 30);

    if (optsEl){
      optsEl.innerHTML = '';
      q.options.forEach(function(opt){
        var btn = document.createElement('button');
        btn.className = 'btt-assess__modal-opt';
        btn.innerHTML = '<span>' + opt.label + '</span>'
          + '<span class="btt-assess__modal-opt-arrow">'
          + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l7 8-7 8"/></svg>'
          + '</span>';
        btn.addEventListener('click', function(){
          answers.push({ q: idx, label: opt.label, score: opt.score });
          totalScore += opt.score;
          var next = idx + 1;
          if (next < QUESTIONS.length){
            questionScreen.style.opacity = '0';
            questionScreen.style.transform = 'translateX(-20px)';
            questionScreen.style.transition = 'opacity .25s ease, transform .25s ease';
            setTimeout(function(){
              showQuestion(next);
              questionScreen.style.opacity = '1';
              questionScreen.style.transform = 'translateX(0)';
            }, 250);
          } else {
            showResult();
          }
        });
        optsEl.appendChild(btn);
      });
      questionScreen.style.opacity = '1';
      questionScreen.style.transform = 'translateX(0)';
      questionScreen.style.transition = '';
    }
  }

  function showResult(){
    if (!questionScreen || !resultScreen) return;
    questionScreen.style.display = 'none';
    resultScreen.style.display = '';
    setTimeout(updateScrollHint, 30);

    if (progressBar) progressBar.style.width = '100%';
    if (stepLabel) stepLabel.textContent = 'Your Result';

    var pct = Math.round((totalScore / MAX_SCORE) * 100);
    var band = getBand(pct);

    var gaugeFill = document.getElementById('btt-result-gauge');
    var pctEl = document.getElementById('btt-result-pct');
    var titleEl = document.getElementById('btt-result-band-title');
    var bodyEl = document.getElementById('btt-result-band-body');
    var recsEl = document.getElementById('btt-result-recs');

    if (gaugeFill){
      var circumference = 364;
      var offset = circumference - (pct / 100) * circumference;
      gaugeFill.style.stroke = band.color;
      setTimeout(function(){
        gaugeFill.style.strokeDashoffset = offset;
      }, 50);
    }

    if (pctEl){
      var duration = 1400, startTime = null;
      function countUp(ts){
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        pctEl.textContent = Math.round(eased * pct) + '%';
        if (progress < 1) requestAnimationFrame(countUp);
      }
      requestAnimationFrame(countUp);
    }

    if (titleEl) titleEl.textContent = band.title;
    if (bodyEl) bodyEl.textContent = band.body;

    if (recsEl){
      recsEl.innerHTML = '';
      band.recs.forEach(function(rec){
        var div = document.createElement('div');
        div.className = 'btt-assess__result-rec';
        div.innerHTML = '<span class="btt-assess__result-rec-check">'
          + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>'
          + '</span>'
          + rec;
        recsEl.appendChild(div);
      });
    }
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (backBtn) backBtn.addEventListener('click', goBack);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeModal(); });

  if (restartBtn) restartBtn.addEventListener('click', function(){
    currentStep = 0; totalScore = 0; answers = [];
    showQuestion(0);
  });

  // =====================================================
  // Swipe dots — created dynamically if the markup doesn't
  // already include them (mirrors the Tools section pattern),
  // then synced to the panels' horizontal scroll position.
  // =====================================================
  var panelsEl = document.querySelector('.btt-assess__panels');
  var dotsWrap = document.querySelector('.btt-assess__swipe-dots');

  if (panelsEl && !dotsWrap){
    var panelCount = panelsEl.querySelectorAll('.btt-assess__panel').length;
    if (panelCount > 0){
      dotsWrap = document.createElement('div');
      dotsWrap.className = 'btt-assess__swipe-dots';
      for (var i = 0; i < panelCount; i++){
        var dot = document.createElement('span');
        dot.className = 'btt-assess__swipe-dot' + (i === 0 ? ' is-active' : '');
        dotsWrap.appendChild(dot);
      }
      panelsEl.insertAdjacentElement('afterend', dotsWrap);
    }
  }

  var swipeDots = dotsWrap ? Array.from(dotsWrap.querySelectorAll('.btt-assess__swipe-dot')) : [];
  if (panelsEl && swipeDots.length){
    panelsEl.addEventListener('scroll', function(){
      var firstPanel = panelsEl.querySelector('.btt-assess__panel');
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