/* DevisExpress974 — DX Header (v32)
   - Active tab highlighting
   - Dropdown "Plus" (desktop)
   - Hamburger menu (mobile)
*/
(function () {
  function getCurrentFile() {
    var p = window.location.pathname || '';
    // Remove trailing slash
    if (p.endsWith('/')) return 'index.html';
    var last = p.split('/').filter(Boolean).pop();
    return last || 'index.html';
  }

  function matchesFile(matchAttr, file) {
    if (!matchAttr) return false;
    var parts = matchAttr.split(',').map(function (s) { return (s || '').trim(); }).filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === file) return true;
      if (parts[i] === '/' && file === 'index.html') return true;
    }
    return false;
  }

  function clearActive(root) {
    root.querySelectorAll('.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
  }

  function setActive(root) {
    var file = getCurrentFile();

    // Main tabs + dropdown toggle + dropdown items + mobile links
    var all = root.querySelectorAll('[data-match]');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (matchesFile(el.getAttribute('data-match'), file)) {
        el.classList.add('is-active');
      }
    }
  }

  function setupDropdown(root) {
    var dropdown = root.querySelector('[data-dx="dropdown"]');
    if (!dropdown) return;

    var toggle = dropdown.querySelector('[data-dx="dropdownToggle"]');
    var menu = dropdown.querySelector('[data-dx="dropdownMenu"]');
    if (!toggle || !menu) return;

    function close() {
      dropdown.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    function open() {
      dropdown.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
    function isOpen() {
      return dropdown.classList.contains('is-open');
    }

    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen()) close();
      else open();
    });

    // Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target)) close();
    });

    // Close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    // Close when a dropdown link is clicked
    menu.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'A') close();
    });

    // Expose close for burger
    return close;
  }

  function setupBurger(root, closeDropdownFn) {
    var btn = root.querySelector('[data-dx="burger"]');
    var menu = root.querySelector('[data-dx="mobileMenu"]');
    if (!btn || !menu) return;

    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    function open() {
      if (typeof closeDropdownFn === 'function') closeDropdownFn();
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
    function toggle() {
      if (menu.hidden) open();
      else close();
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });

    // Close when a link is clicked
    menu.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'A') close();
    });

    // Click outside closes
    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) close();
    });

    // ESC closes
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    // If resize to desktop, close
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) close();
    });
  }

  window.__dxInitHeader = function () {
    var root = document.querySelector('.dx-header');
    if (!root) return;
    if (root.dataset.dxInited === '1') return;
    root.dataset.dxInited = '1';

    clearActive(root);
    setActive(root);

    var closeDropdownFn = setupDropdown(root);
    setupBurger(root, closeDropdownFn);
  };
})();
