document.addEventListener('DOMContentLoaded', function(){
  var steps = document.querySelectorAll('[data-kby-step]');

  function setStepHeight(step, open){
    var panel = step.querySelector('.kby-step__panel');
    panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
  }

  steps.forEach(function(step){
    var row = step.querySelector('.kby-step__row');
    if(step.classList.contains('is-active')) setStepHeight(step, true);

    row.addEventListener('click', function(){
      var wasActive = step.classList.contains('is-active');
      steps.forEach(function(s){
        s.classList.remove('is-active');
        s.querySelector('.kby-step__row').setAttribute('aria-expanded', 'false');
        setStepHeight(s, false);
      });
      if(!wasActive){
        step.classList.add('is-active');
        row.setAttribute('aria-expanded', 'true');
        setStepHeight(step, true);
      }
    });
  });

  var copyBtn = document.getElementById('kby-copy-code');
  if(copyBtn){
    copyBtn.addEventListener('click', function(){
      navigator.clipboard.writeText(copyBtn.dataset.code).then(function(){
        var original = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        setTimeout(function(){ copyBtn.textContent = original; }, 1500);
      });
    });
  }
});
