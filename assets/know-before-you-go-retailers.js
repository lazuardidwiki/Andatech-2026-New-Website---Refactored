document.addEventListener('DOMContentLoaded', function(){
  var findBtn = document.getElementById('kby-retail-find');
  var input = document.getElementById('kby-retail-postcode');
  var retailerLinks = document.querySelectorAll('[data-kby-retailer-link]');

  function hasPostcode(){
    return !!(input && input.value.trim());
  }

  if(findBtn){
    findBtn.addEventListener('click', function(){
      if(!hasPostcode()){
        if(input) input.focus();
        return;
      }
      // Distinct from clicking a single logo below (which opens just that
      // retailer) — this opens every configured retailer's locator at once.
      retailerLinks.forEach(function(a){
        if(a.href) window.open(a.href, '_blank', 'noopener');
      });
    });
  }

  // Typing a postcode and pressing Enter previously did nothing — only
  // clicking the button worked. This makes the field behave like an
  // actual search field instead of requiring a mouse click every time.
  if(input){
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){
        e.preventDefault();
        if(findBtn) findBtn.click();
      }
    });
  }

  // Individual logo links previously worked regardless of whether a
  // postcode had been entered, ignoring the input entirely. Intercepting
  // the click here makes them require it too, same as the main button —
  // note this only gates *whether* the link opens, it does not (and can't
  // reliably) pass the typed postcode into the retailer's own site, since
  // none of the four have a confirmed URL parameter for that.
  retailerLinks.forEach(function(link){
    link.addEventListener('click', function(e){
      if(!hasPostcode()){
        e.preventDefault();
        if(input) input.focus();
      }
    });
  });
});