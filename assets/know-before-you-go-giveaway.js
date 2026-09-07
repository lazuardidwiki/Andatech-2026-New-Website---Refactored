document.addEventListener('DOMContentLoaded', function(){
  var form = document.getElementById('kby-giveaway-form');
  if(!form) return;

  var statusEl = document.getElementById('kby-giveaway-status');
  var submitBtn = document.getElementById('kby-giveaway-submit');
  var portalId = form.dataset.portalId;
  var formGuid = form.dataset.formGuid;

  form.addEventListener('submit', function(e){
    e.preventDefault();

    if(formGuid === 'TBD-create-in-hubspot'){
      statusEl.textContent = 'Form not connected yet — set the HubSpot form GUID in section settings.';
      statusEl.dataset.state = 'error';
      return;
    }

    var name = form.name.value.trim();
    var email = form.email.value.trim();
    if(!name || !email){
      statusEl.textContent = 'Please fill in your name and email.';
      statusEl.dataset.state = 'error';
      return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = '';
    statusEl.removeAttribute('data-state');

    var fields = [
      { name: 'firstname', value: name },
      { name: 'email', value: email }
    ];
    if(form.occupation.value){
      fields.push({ name: 'occupation', value: form.occupation.value });
    }

    fetch('https://api.hsforms.com/submissions/v3/integration/submit/' + portalId + '/' + formGuid, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: fields,
        context: {
          pageUri: window.location.href,
          pageName: document.title
        }
      })
    })
      .then(function(res){
        if(!res.ok) throw new Error('submit failed');
        statusEl.textContent = 'You\u2019re entered! Watch your inbox for confirmation.';
        statusEl.dataset.state = 'success';
        form.reset();
      })
      .catch(function(){
        statusEl.textContent = 'Something went wrong — please try again.';
        statusEl.dataset.state = 'error';
      })
      .finally(function(){
        submitBtn.disabled = false;
      });
  });
});
