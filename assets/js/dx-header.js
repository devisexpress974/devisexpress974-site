(function () {
  function initHeader() {
    const burger = document.querySelector('[data-dx-burger]');
    const nav = document.querySelector('[data-dx-nav]');
    const html = document.documentElement;

    // ---- Mobile burger ----
    function closeNav() {
      if (!nav || !burger) return;
      nav.classList.remove('isOpen');
      burger.setAttribute('aria-expanded', 'false');
      html.classList.remove('dxNavOpen');
    }

    function openNav() {
      if (!nav || !burger) return;
      nav.classList.add('isOpen');
      burger.setAttribute('aria-expanded', 'true');
      html.classList.add('dxNavOpen');
    }

    function toggleNav(e) {
      if (e) e.preventDefault();
      if (!nav || !burger) return;
      if (nav.classList.contains('isOpen')) closeNav();
      else openNav();
    }

    if (burger && nav) {
      burger.addEventListener('click', toggleNav);

      // click on a link => close
      nav.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a) closeNav();
      });

      // click outside => close
      document.addEventListener('click', (e) => {
        if (!nav.classList.contains('isOpen')) return;
        if (nav.contains(e.target) || burger.contains(e.target)) return;
        closeNav();
      }, true);

      // ESC => close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeNav();
      });

      // resize to desktop => close
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 980) closeNav();
      });
    }

    // ---- Plus dropdown ----
    const moreWrap = document.querySelector('.dx-more');
    const moreBtn = document.querySelector('.dx-more-btn');
    const moreMenu = document.querySelector('.dx-more-menu');

    function closeMore() {
      if (!moreWrap || !moreBtn) return;
      moreWrap.classList.remove('open');
      moreBtn.setAttribute('aria-expanded', 'false');
    }

    function openMore() {
      if (!moreWrap || !moreBtn) return;
      moreWrap.classList.add('open');
      moreBtn.setAttribute('aria-expanded', 'true');
    }

    function toggleMore(e) {
      if (e) e.preventDefault();
      if (!moreWrap || !moreBtn || !moreMenu) return;
      if (moreWrap.classList.contains('open')) closeMore();
      else openMore();
    }

    if (moreBtn && moreMenu && moreWrap) {
      // ARIA
      if (!moreMenu.id) moreMenu.id = 'dxMoreMenu';
      moreBtn.setAttribute('aria-haspopup', 'menu');
      moreBtn.setAttribute('aria-controls', moreMenu.id);
      moreBtn.setAttribute('aria-expanded', 'false');

      moreBtn.addEventListener('click', toggleMore);

      // click on menu link => close
      moreMenu.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a) closeMore();
      });

      // click outside => close
      document.addEventListener('click', (e) => {
        if (!moreWrap.classList.contains('open')) return;
        if (moreWrap.contains(e.target)) return;
        closeMore();
      }, true);

      // ESC => close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMore();
      });
    }

    // ---- Active tab by current page ----
    const pathNow = (function () {
      // pathname like /index.html or /demande.html
      let p = (location.pathname || '').split('?')[0].split('#')[0];
      if (!p || p === '/') return 'index.html';
      // keep last segment only (site is flat)
      p = p.split('/').pop() || 'index.html';
      if (p === '') p = 'index.html';
      return p;
    })();

    const links = document.querySelectorAll('.dx-tab[data-path]');
    links.forEach((a) => {
      const target = (a.getAttribute('data-path') || '').trim();
      const isActive = target === pathNow || (target === 'index.html' && pathNow === '');
      a.classList.toggle('is-active', isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  // expose for dx-include-header.js (after injection)
  window.__dxInitHeader = initHeader;

  // If header is already present (non-injected), init now
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();