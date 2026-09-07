(function () {
  function initLifecycle(section) {
    if (!section || section.dataset.atMpReady === 'true') return;
    section.dataset.atMpReady = 'true';

    var tabs = Array.prototype.slice.call(section.querySelectorAll('[data-at-mp-stage]'));
    var panels = Array.prototype.slice.call(section.querySelectorAll('[data-at-mp-panel]'));

    function selectStage(tab, moveFocus) {
      var target = tab.getAttribute('aria-controls');
      tabs.forEach(function (item) {
        var selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.setAttribute('tabindex', selected ? '0' : '-1');
      });
      panels.forEach(function (panel) {
        var show = panel.id === target;
        panel.hidden = !show;
        if (show) {
          var imgs = panel.querySelectorAll('img[data-src]');
          for (var i = 0; i < imgs.length; i++) {
            if (imgs[i].dataset.srcset) { imgs[i].srcset = imgs[i].dataset.srcset; delete imgs[i].dataset.srcset; }
            imgs[i].src = imgs[i].dataset.src;
            delete imgs[i].dataset.src;
          }
        }
      });
      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { selectStage(tab, false); });
      tab.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === 'Home') next = tabs[0];
        if (event.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        selectStage(next, true);
      });
    });
  }

  function init(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[data-at-mp-lifecycle]').forEach(initLifecycle);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
  else init(document);

  document.addEventListener('shopify:section:load', function (event) { init(event.target); });
})();
