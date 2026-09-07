(function () {
  'use strict';

  function initIntegratedModel(root) {
    if (!root || root.dataset.atIntegratedReady === 'true') return;
    root.dataset.atIntegratedReady = 'true';

    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-at-integrated-tab]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-at-integrated-panel]'));
    if (!tabs.length || !panels.length) return;

    function activate(key, focus) {
      tabs.forEach(function (tab) {
        var active = tab.dataset.atIntegratedTab === key;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
      });
      panels.forEach(function (panel) {
        var active = panel.dataset.atIntegratedPanel === key;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { activate(tab.dataset.atIntegratedTab, false); });
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        var direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        var next = (index + direction + tabs.length) % tabs.length;
        activate(tabs[next].dataset.atIntegratedTab, true);
      });
    });
  }

  function initAll(scope) {
    (scope || document).querySelectorAll('[data-at-integrated-model]').forEach(initIntegratedModel);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(document); });
  else initAll(document);

  document.addEventListener('shopify:section:load', function (event) { initAll(event.target); });
})();
