document.addEventListener('DOMContentLoaded', function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var hasHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(reduceMotion || !hasHover) return;

  document.querySelectorAll('[data-kby-edu-card]').forEach(function(card){
    var sp = card.querySelector('.kby-edu-card__spotlight');
    if(!sp) return;
    card.addEventListener('mousemove', function(e){
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--sx', (x / r.width * 100) + '%');
      card.style.setProperty('--sy', (y / r.height * 100) + '%');
    });
  });
});
