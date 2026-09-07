/*
 * Andatech header script — mega menu, header search, cart drawer, smart header.
 *
 * Extracted from andatech-site.js on 2026-09-05 as part of the modular refactor.
 * Loaded ONCE per page via andatech-header.liquid (the header renders on every
 * template). Self-guarding: init runs once even if the header section is placed
 * more than once via the Theme Editor.
 */
(function () {
  "use strict";

  if (window.__atHeaderInitialised) return;
  window.__atHeaderInitialised = true;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ══════════════════════════════════════════════
     1. MEGA MENU
     ══════════════════════════════════════════════ */
  var header = document.querySelector("[data-at-header]");
  var mega = document.querySelector("[data-at-mega]");
  var scrim = document.querySelector("[data-at-scrim]");
  var burger = document.querySelector("[data-at-burger]");

  if (header) {
    var navBtns = [].slice.call(header.querySelectorAll(".at-nav__btn"));
    var panels = mega ? [].slice.call(mega.querySelectorAll(".at-mega__panel")) : [];
    var openKey = null;
    var closeTimer;
    var drawerTimer;

    panels.forEach(function (p) {
      var btn = navBtns.filter(function (b) {
        return b.dataset.menu === p.dataset.panel;
      })[0];
      if (btn) p.setAttribute("data-label", btn.textContent.trim());
    });

    // getBoundingClientRect reports visual px; --at-mega-top is consumed as a CSS
    // length inside the (possibly zoomed) document, so divide the zoom back out.
    //
    // The zoom lives on our .shopify-section wrapper, not on :root — reading it
    // off documentElement would always give 1 and park the panel on top of the
    // header. Walk up instead: getComputedStyle().zoom reports the element's own
    // zoom, so the effective factor is the product along the ancestor chain.
    //
    // currentCSSZoom is spec'd to report 1 for an element with no layout box,
    // and the panel is display:none (the `hidden` attribute) until it opens. So
    // the FIRST hover measured the zoom as 1 and anchored the panel ~10px too
    // high, while every later hover — panel already on screen — measured the
    // real 0.9 and dropped it to the correct spot. That was the small top-edge
    // jump when switching between nav items. Only trust currentCSSZoom while the
    // element actually renders; the ancestor walk stays accurate either way
    // because getComputedStyle resolves zoom on display:none elements too.
    function effectiveZoom(el) {
      if (typeof el.currentCSSZoom === "number" && el.getClientRects().length) {
        return el.currentCSSZoom;
      }
      var z = 1;
      for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
        var v = parseFloat(getComputedStyle(n).zoom);
        if (v && v !== 1) z *= v;
      }
      return z;
    }

    // The smart header tweens translateY over 360ms when it hides and shows, and
    // getBoundingClientRect reports the tweened box. Anchoring the panel to a
    // tween frame parks it at an arbitrary offset that never corrects itself, so
    // subtract the live translateY back out and anchor to the resting edge.
    function headerTranslateY() {
      var t = getComputedStyle(header).transform;
      if (!t || t === "none") return 0;
      try {
        return new DOMMatrixReadOnly(t).f;
      } catch (e) {
        return 0;
      }
    }

    function updateMegaTop() {
      var zoom = effectiveZoom(mega || header);
      var bottom = (header.getBoundingClientRect().bottom - headerTranslateY()) / zoom;
      document.documentElement.style.setProperty("--at-mega-top", bottom + "px");
    }

    function showMega(key) {
      if (!mega) return;
      clearTimeout(closeTimer);
      // Measure BEFORE the same-key early return. Re-entering the panel that is
      // already open used to skip this, so the panel kept a --at-mega-top taken
      // at a different scroll position while moving to a neighbouring item
      // re-measured — the asymmetry that made the panel "sometimes" jump.
      updateMegaTop();
      if (openKey === key) return;
      openKey = key;
      panels.forEach(function (p) {
        p.classList.toggle("at-is-active", p.dataset.panel === key);
      });
      navBtns.forEach(function (b) {
        b.setAttribute("aria-expanded", String(b.dataset.menu === key));
      });
      mega.hidden = false;
      // next frame, so the transition has a start value to animate from
      requestAnimationFrame(function () {
        mega.classList.add("at-is-open");
      });
      if (scrim) scrim.classList.add("at-is-on");
    }

    function hideMega(immediate) {
      if (!mega || !openKey) return;
      openKey = null;
      navBtns.forEach(function (b) {
        b.setAttribute("aria-expanded", "false");
      });
      if (scrim) scrim.classList.remove("at-is-on");
      mega.classList.remove("at-is-open");

      var done = function () {
        if (openKey) return;
        mega.hidden = true;
        panels.forEach(function (p) {
          p.classList.remove("at-is-active");
        });
      };
      if (reduced || immediate) return done();
      window.setTimeout(done, 220);
    }

    var isDesktop = function () {
      return window.matchMedia("(min-width:1280px)").matches;
    };

    navBtns.forEach(function (btn) {
      btn.addEventListener("mouseenter", function () {
        if (isDesktop()) showMega(btn.dataset.menu);
      });
      btn.addEventListener("focus", function () {
        if (isDesktop()) showMega(btn.dataset.menu);
      });
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (openKey === btn.dataset.menu) hideMega();
        else showMega(btn.dataset.menu);
      });
    });

    var drawerOpen = function () {
      return burger && burger.getAttribute("aria-expanded") === "true";
    };

    var mobileNav = mega ? mega.querySelector(".at-mobile-nav") : null;
    var mobileClose = mega ? mega.querySelector("[data-at-mobile-nav-close]") : null;
    var mobileNavRoot = mega ? mega.querySelector("[data-at-mobile-nav-root]") : null;
    var mobileNavPanels = mega ? [].slice.call(mega.querySelectorAll("[data-at-mobile-nav-panel]")) : [];
    var mobileNavTriggers = mega ? [].slice.call(mega.querySelectorAll("[data-at-mobile-nav-open]")) : [];
    var mobileFrameTimer;
    var mobileFrameDuration = reduced ? 0 : 180;
    var megaPortalTimer = null;
    var megaOriginalParent = mega ? mega.parentNode : null;
    var megaOriginalNextSibling = mega ? mega.nextSibling : null;

    /* Keep the tablet navigation surface independent of whichever Shopify
       template opened it. Some templates place the header section in a scaled
       wrapper; a fixed descendant of that wrapper then covers only the scaled
       area. Portalling the drawer to <body> gives every page the same viewport
       coordinate system used by the Heavy Industry template. */
    function mountTabletMenuAtViewport() {
      if (!mega || !window.matchMedia("(min-width: 768px) and (max-width: 1279px)").matches) return;
      window.clearTimeout(megaPortalTimer);
      if (mega.parentNode !== document.body) document.body.appendChild(mega);
    }

    function restoreTabletMenuAfterClose() {
      if (!mega) return;
      window.clearTimeout(megaPortalTimer);
      megaPortalTimer = window.setTimeout(function () {
        if (mega.classList.contains("at-is-open")) return;
        if (!megaOriginalParent || !megaOriginalParent.isConnected || mega.parentNode === megaOriginalParent) return;
        if (megaOriginalNextSibling && megaOriginalNextSibling.parentNode === megaOriginalParent) {
          megaOriginalParent.insertBefore(mega, megaOriginalNextSibling);
        } else {
          megaOriginalParent.appendChild(mega);
        }
      }, 300);
    }

    function enterMobileFrame(frame) {
      if (!frame) return;
      frame.classList.remove("at-mobile-nav__frame-out");
      frame.classList.add("at-mobile-nav__frame-in");
      window.setTimeout(function () {
        frame.classList.remove("at-mobile-nav__frame-in");
      }, reduced ? 0 : 300);
    }

    function resetMobileNav() {
      if (!mobileNav) return;
      window.clearTimeout(mobileFrameTimer);
      mobileNav.classList.remove("at-mobile-nav--sub-open");
      if (mobileNavRoot) {
        mobileNavRoot.hidden = false;
        mobileNavRoot.classList.remove("at-mobile-nav__frame-in", "at-mobile-nav__frame-out");
      }
      mobileNavPanels.forEach(function (panel) {
        panel.hidden = true;
        panel.classList.remove("at-mobile-nav__frame-in", "at-mobile-nav__frame-out");
      });
      mobileNavTriggers.forEach(function (trigger) { trigger.setAttribute("aria-expanded", "false"); });
    }

    function openMobileNavPanel(key) {
      if (!mobileNav) return;
      var panel = mobileNavPanels.filter(function (candidate) {
        return candidate.dataset.atMobileNavPanel === key;
      })[0];
      if (!panel || !mobileNavRoot || mobileNavRoot.hidden) return;
      window.clearTimeout(mobileFrameTimer);
      mobileNav.classList.add("at-mobile-nav--sub-open");
      mobileNavTriggers.forEach(function (trigger) {
        trigger.setAttribute("aria-expanded", String(trigger.dataset.atMobileNavOpen === key));
      });
      mobileNavRoot.classList.add("at-mobile-nav__frame-out");
      mobileFrameTimer = window.setTimeout(function () {
        mobileNavRoot.hidden = true;
        mobileNavRoot.classList.remove("at-mobile-nav__frame-out");
        mobileNavPanels.forEach(function (candidate) { candidate.hidden = candidate !== panel; });
        enterMobileFrame(panel);
        var firstLink = panel.querySelector("a");
        if (firstLink) firstLink.focus();
      }, mobileFrameDuration);
    }

    function returnToMobileNavRoot() {
      if (!mobileNav || !mobileNavRoot || !mobileNav.classList.contains("at-mobile-nav--sub-open")) {
        resetMobileNav();
        return;
      }
      var activePanel = mobileNavPanels.filter(function (panel) { return !panel.hidden; })[0];
      if (!activePanel) {
        resetMobileNav();
        return;
      }
      window.clearTimeout(mobileFrameTimer);
      activePanel.classList.add("at-mobile-nav__frame-out");
      mobileFrameTimer = window.setTimeout(function () {
        activePanel.hidden = true;
        activePanel.classList.remove("at-mobile-nav__frame-out");
        mobileNav.classList.remove("at-mobile-nav--sub-open");
        mobileNavRoot.hidden = false;
        enterMobileFrame(mobileNavRoot);
        mobileNavTriggers.forEach(function (trigger) { trigger.setAttribute("aria-expanded", "false"); });
        var firstTrigger = mobileNavRoot.querySelector("[data-at-mobile-nav-open]");
        if (firstTrigger) firstTrigger.focus();
      }, mobileFrameDuration);
    }

    function setDrawer(open) {
      if (!burger || !mega) return;
      window.clearTimeout(drawerTimer);
      // Tablet navigation uses the utility bar only when it is opened from the
      // true top of the document. Set this before the open-state class so the
      // header never paints at the expanded position for an intermediate frame.
      document.documentElement.classList.toggle(
        "at-mobile-menu-at-page-top",
        open && window.scrollY <= 4
      );
      burger.setAttribute("aria-expanded", String(open));
      if (mobileClose) mobileClose.setAttribute("aria-expanded", "false");
      mega.setAttribute("aria-hidden", String(!open));
      if (open) {
        mountTabletMenuAtViewport();
        updateMegaTop();
        // A desktop panel may have left an active state behind after a resize.
        // The mobile drawer is a separate navigation surface, so reset it first.
        openKey = null;
        panels.forEach(function (p) { p.classList.remove("at-is-active"); });
        resetMobileNav();
        mega.hidden = false;
        // Starting the visual state on the next frame gives the drawer the
        // same gentle entrance as the search overlay.
        requestAnimationFrame(function () {
          mega.classList.add("at-is-open");
          // Start as the familiar hamburger, then smoothly settle into its X
          // state once the menu surface is visible.
          requestAnimationFrame(function () {
            if (mobileClose) mobileClose.setAttribute("aria-expanded", "true");
          });
        });
      } else {
        mega.classList.remove("at-is-open");
        drawerTimer = window.setTimeout(function () { mega.hidden = true; }, reduced ? 0 : 260);
        restoreTabletMenuAfterClose();
      }
      if (scrim) scrim.classList.toggle("at-is-on", open);
      // The mobile navigation is a complete page-level surface. Mark the
      // document as such so floating third-party widgets do not sit above it.
      document.documentElement.classList.toggle("at-mobile-menu-open", open && !isDesktop());
      document.body.style.overflow = open ? "hidden" : "";
      if (!open) resetMobileNav();
    }

    function closeAll() {
      if (drawerOpen()) setDrawer(false);
      hideMega();
    }
    // Exposed so the search overlay can dismiss the mega menu on open — search
    // is the topmost intent and should never render behind a nav panel.
    window.__atCloseNav = closeAll;

    // Only nav triggers and the panel count as "inside" the mega hover zone.
    // Anywhere else in the header — whitespace between labels, logo, search /
    // cart icons — should let the panel close.
    var hoverGroup = navBtns.concat(mega ? [mega] : []);
    hoverGroup.forEach(function (el) {
      el.addEventListener("mouseleave", function () {
        if (isDesktop()) closeTimer = window.setTimeout(hideMega, 180);
      });
      el.addEventListener("mouseenter", function () {
        clearTimeout(closeTimer);
      });
    });

    if (scrim) scrim.addEventListener("click", closeAll);
    if (burger) {
      burger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        setDrawer(!drawerOpen());
      });
    }
    if (mega) {
      mega.addEventListener("click", function (e) {
        var mobileOpen = e.target.closest("[data-at-mobile-nav-open]");
        if (mobileOpen) {
          e.preventDefault();
          openMobileNavPanel(mobileOpen.dataset.atMobileNavOpen);
          return;
        }
        if (e.target.closest("[data-at-mobile-nav-back]")) {
          e.preventDefault();
          returnToMobileNavRoot();
          return;
        }
        if (e.target.closest("[data-at-mobile-nav-close]")) {
          e.preventDefault();
          setDrawer(false);
          burger.focus();
          return;
        }
        if (e.target.closest("a")) closeAll();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
    });
    window.addEventListener("resize", function () {
      if (isDesktop() && drawerOpen()) setDrawer(false);
      if (isDesktop()) hideMega(true);
      updateMegaTop();
    });

    /* Sticky-header state */
    var onScroll = function () {
      header.classList.toggle("at-is-stuck", window.scrollY > 40);
      // The header is sticky under a 56px utility bar, so its bottom edge moves
      // from 144px to 88px over the first 56px of scroll. --at-mega-top was only
      // refreshed on open/resize, which left an open panel floating 56px clear
      // of the header. Cheap enough to keep live: one rect read per frame.
      updateMegaTop();
    };
    // rAF-throttled: onScroll now reads layout, so keep it to one pass per frame.
    var scrollTicking = false;
    window.addEventListener("scroll", function () {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () {
        scrollTicking = false;
        onScroll();
      });
    }, { passive: true });
    onScroll();
  }

  /* ══════════════════════════════════════════════
     2. HEADER SEARCH + CART
     ══════════════════════════════════════════════ */
  var searchOpen = document.querySelector("[data-at-search-open]");
  var searchModal = document.querySelector("[data-at-search]");
  var searchClose = document.querySelector("[data-at-search-close]");
  var searchClear = document.querySelector("[data-at-search-clear]");
  var searchInput = document.querySelector("[data-at-search-input]");
  var searchResults = document.querySelector("[data-at-search-results]");
  var searchQuickLinks = document.querySelector("[data-at-search-quick-links]");
  var searchPlaceholder = searchInput ? searchInput.getAttribute("placeholder") : "";
  var searchLastFocus = null;
  var searchTimer = null;
  var searchRequest = null;
  var searchPortalTimer = null;
  var searchOriginalParent = searchModal ? searchModal.parentNode : null;
  var searchOriginalNextSibling = searchModal ? searchModal.nextSibling : null;

  /* Shopify's tablet header wrapper is rendered at 90% zoom. A fixed search
     surface inside that wrapper briefly paints its close control in scaled
     coordinates before Safari resolves the open-state override. Mounting the
     tablet search surface directly under <body> before revealing it gives the
     overlay and its X one stable viewport coordinate from the first frame. */
  function mountTabletSearchAtViewport() {
    if (!searchModal || !window.matchMedia("(min-width: 768px) and (max-width: 1279px)").matches) return;
    window.clearTimeout(searchPortalTimer);
    if (searchModal.parentNode !== document.body) document.body.appendChild(searchModal);
  }

  function restoreTabletSearchAfterClose() {
    if (!searchModal) return;
    window.clearTimeout(searchPortalTimer);
    searchPortalTimer = window.setTimeout(function () {
      if (searchModal.classList.contains("at-is-on")) return;
      document.documentElement.classList.remove("at-search-open", "at-search-at-page-top");
      if (!searchOriginalParent || !searchOriginalParent.isConnected || searchModal.parentNode === searchOriginalParent) return;
      if (searchOriginalNextSibling && searchOriginalNextSibling.parentNode === searchOriginalParent) {
        searchOriginalParent.insertBefore(searchModal, searchOriginalNextSibling);
      } else {
        searchOriginalParent.appendChild(searchModal);
      }
    }, 280);
  }

  function closeSearch() {
    if (!searchModal) return;
    searchModal.classList.remove("at-is-on");
    document.body.style.overflow = "";
    if (searchRequest) searchRequest.abort();
    if (searchInput) searchInput.value = "";
    if (searchInput) searchInput.setAttribute("placeholder", searchPlaceholder);
    if (searchResults) { searchResults.hidden = true; searchResults.innerHTML = ""; }
    if (searchQuickLinks) searchQuickLinks.hidden = false;
    if (searchClear) searchClear.hidden = true;
    if (searchLastFocus) searchLastFocus.focus();
    restoreTabletSearchAfterClose();
  }

  function iconMarkup(type) {
    return type === "search"
      ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="5.7" stroke="currentColor" stroke-width="1.8"/><path d="m15.2 15.2 3.8 3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function appendHighlightedTitle(link, title, query) {
    var normalizedTitle = title.toLocaleLowerCase();
    var normalizedQuery = query.toLocaleLowerCase();
    var matchAt = normalizedTitle.indexOf(normalizedQuery);
    var label = document.createElement("span");
    if (matchAt === -1) {
      label.textContent = title;
    } else {
      var muted = document.createElement("em");
      muted.textContent = title.slice(0, matchAt + query.length);
      label.appendChild(muted);
      label.appendChild(document.createTextNode(title.slice(matchAt + query.length)));
    }
    link.appendChild(label);
  }

  function appendSuggestionGroup(parent, labelText, items, query, type, useSearchUrl) {
    if (!items.length) return;
    var group = document.createElement("section");
    group.className = "at-search-modal__result-group";
    var label = document.createElement("p");
    label.className = "at-search-modal__result-label";
    label.textContent = labelText;
    group.appendChild(label);
    items.forEach(function (item) {
      var link = document.createElement("a");
      link.className = "at-search-modal__result-link at-search-modal__result-link--" + type;
      link.href = useSearchUrl ? "/search?q=" + encodeURIComponent(item.title) : item.url;
      link.insertAdjacentHTML("beforeend", iconMarkup(type));
      appendHighlightedTitle(link, item.title, query);
      group.appendChild(link);
    });
    parent.appendChild(group);
  }

  function renderSearchResults(resources, query) {
    if (!searchResults) return;
    searchResults.innerHTML = "";
    var linkItems = [].concat(resources.products || [], resources.collections || [], resources.pages || [], resources.articles || []).slice(0, 4);
    var searchItems = [{ title: query }].concat([].concat(resources.products || [], resources.collections || [], resources.pages || [], resources.articles || []).filter(function (item) {
      return item.title.toLocaleLowerCase() !== query.toLocaleLowerCase();
    })).slice(0, 5);
    if (!linkItems.length && searchItems.length === 1) {
      var empty = document.createElement("p");
      empty.className = "at-search-modal__empty";
      empty.textContent = "No matching results yet.";
      searchResults.appendChild(empty);
    } else {
      appendSuggestionGroup(searchResults, "Suggested Links", linkItems, query, "link", false);
      appendSuggestionGroup(searchResults, "Suggested Searches", searchItems, query, "search", true);
    }
    searchResults.hidden = false;
  }

  function fetchSearchResults(query) {
    if (!searchResults) return;
    if (searchRequest) searchRequest.abort();
    searchRequest = window.AbortController ? new AbortController() : null;
    var endpoint = (window.theme && window.theme.routes && window.theme.routes.predictiveSearch) || "/search/suggest";
    var params = new URLSearchParams({
      q: query,
      "resources[type]": "product,collection,page,article",
      "resources[limit]": "6"
    });
    fetch(endpoint + ".json?" + params.toString(), searchRequest ? { signal: searchRequest.signal } : {})
      .then(function (response) { if (!response.ok) throw new Error("Search unavailable"); return response.json(); })
      .then(function (data) { renderSearchResults(data.resources.results, query); })
      .catch(function (error) {
        if (error.name !== "AbortError") {
          searchResults.hidden = true;
        }
      });
  }

  if (searchOpen && searchModal && searchInput) {
    searchOpen.addEventListener("click", function () {
      if (typeof window.__atCloseNav === "function") window.__atCloseNav();
      searchLastFocus = searchOpen;
      // Only preserve the expanded utility bar when search is opened from the
      // actual top of the page. At every other scroll position the compact
      // header remains stable while the tablet overlay is mounted.
      document.documentElement.classList.toggle("at-search-at-page-top", window.scrollY <= 4);
      mountTabletSearchAtViewport();
      document.documentElement.classList.add("at-search-open");
      searchModal.classList.add("at-is-on");
      document.body.style.overflow = "hidden";
      // The first supplied state is deliberately quiet: it opens as a browseable
      // search screen. Safari only opens its keyboard once the visitor taps the field.
      if (window.matchMedia("(max-width: 1279px)").matches) searchInput.setAttribute("placeholder", "Search");
    });
    if (searchClose) searchClose.addEventListener("click", closeSearch);
    if (searchClear) searchClear.addEventListener("click", function () {
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input"));
      searchInput.focus();
    });
    searchModal.addEventListener("click", function (event) {
      if (event.target === searchModal) closeSearch();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && searchModal.classList.contains("at-is-on")) closeSearch();
    });
    searchInput.addEventListener("input", function () {
      var query = searchInput.value.trim();
      window.clearTimeout(searchTimer);
      if (!query) {
        if (searchRequest) searchRequest.abort();
        if (searchResults) { searchResults.hidden = true; searchResults.innerHTML = ""; }
        if (searchQuickLinks) searchQuickLinks.hidden = false;
        if (searchClear) searchClear.hidden = true;
        return;
      }
      if (searchQuickLinks) searchQuickLinks.hidden = true;
      if (searchClear) searchClear.hidden = false;
      searchTimer = window.setTimeout(function () { fetchSearchResults(query); }, 220);
    });
  }

  var cartTrigger = document.querySelector("[data-at-cart]");
  var cartCount = document.querySelector("[data-at-cart-count]");

  function updateCartCount() {
    if (!cartCount) return Promise.resolve();
    var cartUrl = (window.theme && window.theme.routes && window.theme.routes.cart) || "/cart";
    return fetch(cartUrl.replace(/\/$/, "") + ".js", { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Unable to load cart count");
        return response.json();
      })
      .then(function (cart) {
        var itemCount = Math.max(0, Number(cart.item_count) || 0);
        var shouldHide = itemCount === 0;
        // The badge is already server-rendered, so in the common case this
        // request just confirms it. Only write when the value actually differs,
        // otherwise we cause a needless repaint on every page load.
        if (Number(cartCount.textContent.trim()) === itemCount && cartCount.hidden === shouldHide) return;
        cartCount.textContent = itemCount;
        cartCount.hidden = shouldHide;
        if (cartTrigger) {
          cartTrigger.setAttribute("aria-label", itemCount ? "Cart, " + itemCount + " items" : "Cart");
        }
      })
      .catch(function () {
        // Leave the server-rendered value in place. Blanking it here would turn a
        // transient network blip into a visibly wrong (empty) badge.
      });
  }

  // andatech-header.liquid renders the badge server-side; the call below only
  // corrects it when the delivered HTML was a stale snapshot. Enterprise's own
  // updater (product-form.js -> updateCartIcon) targets #cart-icon-bubble, which
  // the stock `header` section rendered and ours does not, so it silently
  // no-ops -- these listeners are what keep the badge live after load.
  updateCartCount();

  // Fires only for a variant that wasn't already in the cart.
  document.addEventListener("on:cart:add", function () {
    window.setTimeout(updateCartCount, 0);
  });

  // Fires instead of on:cart:add when the variant was already in the cart, and
  // for every quantity edit or removal (newQuantity 0). See custom.js docs.
  document.addEventListener("on:line-item:change", function () {
    window.setTimeout(updateCartCount, 0);
  });

  document.addEventListener("dispatch:cart-drawer:refresh", function () {
    window.setTimeout(updateCartCount, 0);
  });

  // Covers bfcache restores and instant.page-prefetched documents, whose HTML
  // is a snapshot from before the cart changed.
  window.addEventListener("pageshow", updateCartCount);

  if (cartTrigger) {
    cartTrigger.addEventListener("click", function (event) {
      var cartDrawer = document.querySelector("cart-drawer");
      if (!cartDrawer || typeof cartDrawer.open !== "function") return;
      event.preventDefault();
      // If the search overlay is open, close it first so it doesn't sit on top
      // of (and visually mask) the cart drawer that's about to slide in.
      if (searchModal && searchModal.classList.contains("at-is-on")) {
        closeSearch();
      }
      if (typeof cartDrawer.refresh === "function") {
        Promise.resolve(cartDrawer.refresh(true)).then(updateCartCount);
      }
      cartDrawer.open(cartTrigger);
    });
  }


  /* Smart header — only react to an intentional change in scroll direction.
     The travel buffer prevents tiny touchpad/iOS momentum changes from making
     the header repeatedly appear and disappear. */
  var smartHeader = document.querySelector(".at-header");
  if (smartHeader && !reduced) {
    var lastHeaderY = Math.max(0, window.scrollY || 0);
    var headerTravel = 0;
    var headerTicking = false;
    var HEADER_TOP_SAFE_ZONE = 96;
    var HEADER_TRAVEL_THRESHOLD = 56;

    var updateSmartHeader = function () {
      var currentY = Math.max(0, window.scrollY || 0);
      var deltaY = currentY - lastHeaderY;

      if (currentY <= HEADER_TOP_SAFE_ZONE) {
        smartHeader.classList.remove("at-header--hidden");
        headerTravel = 0;
      } else if (Math.abs(deltaY) > 1) {
        if ((headerTravel > 0 && deltaY < 0) || (headerTravel < 0 && deltaY > 0)) {
          headerTravel = 0;
        }
        headerTravel += deltaY;

        if (headerTravel >= HEADER_TRAVEL_THRESHOLD) {
          smartHeader.classList.add("at-header--hidden");
          if (window.__atCloseNav) window.__atCloseNav();
          headerTravel = 0;
        } else if (headerTravel <= -HEADER_TRAVEL_THRESHOLD) {
          smartHeader.classList.remove("at-header--hidden");
          headerTravel = 0;
        }
      }

      lastHeaderY = currentY;
      headerTicking = false;
    };

    window.addEventListener("scroll", function () {
      if (headerTicking) return;
      headerTicking = true;
      window.requestAnimationFrame(updateSmartHeader);
    }, { passive: true });
  }

})();
