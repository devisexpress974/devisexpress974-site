(function () {
  // Compute version from this script tag: dx-include-header.js?v=...
  function getVersion() {
    const s = document.currentScript || Array.from(document.scripts).reverse().find(x => (x.src || '').includes('dx-include-header.js'));
    if (!s || !s.src) return '';
    const m = s.src.match(/[?&]v=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  const ver = getVersion();
  const qs = ver ? ('?v=' + encodeURIComponent(ver)) : '';

  // Support http(s) + local file opening
  const isFile = location.protocol === 'file:';
  const base = isFile ? './' : '/';

  const HEADER_URL = base + 'partials/header.html' + qs;
  const CSS_URL = base + 'assets/css/dx-header.css' + qs;
  const JS_URL = base + 'assets/js/dx-header.js' + qs;

  function normalizeUrl(u) {
    try {
      const url = new URL(u, location.href);
      return url.pathname.replace(/\/+/g, '/');
    } catch {
      return String(u).split('?')[0].split('#')[0];
    }
  }

  function hasAsset(tag, urlBasePath) {
    const want = normalizeUrl(urlBasePath);
    const els = document.getElementsByTagName(tag);
    for (const el of els) {
      const attr = tag === 'link' ? el.getAttribute('href') : el.getAttribute('src');
      if (!attr) continue;
      const got = normalizeUrl(attr);
      if (got === want) return true;
    }
    return false;
  }

  function loadCss(href) {
    const basePath = href.split('?')[0];
    if (hasAsset('link', basePath)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.onload = () => resolve();
      l.onerror = () => reject(new Error('CSS failed: ' + href));
      document.head.appendChild(l);
    });
  }

  function loadJs(src) {
    const basePath = src.split('?')[0];
    if (hasAsset('script', basePath)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('JS failed: ' + src));
      document.head.appendChild(s);
    });
  }

  function ensureSlotAtTop() {
    let slot = document.getElementById('dx-header-slot');
    if (slot) return slot;
    slot = document.createElement('div');
    slot.id = 'dx-header-slot';
    // insert at start of body
    document.body.insertBefore(slot, document.body.firstChild);
    return slot;
  }

  async function inject() {
    try {
      if (!document.body) return;
      const target = ensureSlotAtTop();

      // Ensure CSS + header behavior are ready
      await loadCss(CSS_URL);
      await loadJs(JS_URL);

      const res = await fetch(HEADER_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' on ' + HEADER_URL);
      target.innerHTML = await res.text();

      if (typeof window.__dxInitHeader === 'function') window.__dxInitHeader();
    } catch (e) {
      console.error('DX header inject error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();