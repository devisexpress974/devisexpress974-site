// DX Searchable Select (PATCH22) — simple, fast, no dependency
// - Ajoute un champ "Rechercher…" au-dessus d'un <select>
// - Filtre les options en temps réel (accents ignorés)
// - Compatible avec les <select> re-remplis dynamiquement (refresh)
(() => {
  const norm = (s) => (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  function enhance(selectEl, opts = {}) {
    if (!selectEl) return;
    if (selectEl.dataset.dxSearchable === "1") return;

    const placeholder = opts.placeholder || "Rechercher…";

    // wrap + input
    const wrap = document.createElement("div");
    wrap.className = "dxSelectSearchWrap";

    const input = document.createElement("input");
    input.type = "search";
    input.className = "dxSelectSearch";
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.spellcheck = false;

    wrap.appendChild(input);
    selectEl.parentNode.insertBefore(wrap, selectEl);

    const snapshot = () => {
      selectEl._dxAllOptions = Array.from(selectEl.options).map((o) => ({
        value: o.value,
        text: o.textContent || o.innerText || "",
        disabled: !!o.disabled
      }));
    };

    const apply = () => {
      const q = norm(input.value).trim();
      const all = selectEl._dxAllOptions || [];

      const current = selectEl.value;
      const filtered = !q
        ? all
        : all.filter((o) => (o.value === "") || norm(o.text).includes(q) || norm(o.value).includes(q));

      selectEl.innerHTML = "";
      const frag = document.createDocumentFragment();
      for (const o of filtered) {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.text;
        opt.disabled = o.disabled;
        frag.appendChild(opt);
      }
      selectEl.appendChild(frag);

      if (filtered.some((o) => o.value === current)) {
        selectEl.value = current;
      }
    };

    input.addEventListener("input", apply);

    // store hooks
    selectEl.dataset.dxSearchable = "1";
    selectEl._dxSearchInput = input;
    selectEl._dxSearchSnapshot = snapshot;
    selectEl._dxSearchApply = apply;

    snapshot();
  }

  function refresh(selectEl) {
    if (!selectEl) return;
    if (typeof selectEl._dxSearchSnapshot === "function") {
      selectEl._dxSearchSnapshot();
      if (typeof selectEl._dxSearchApply === "function") selectEl._dxSearchApply();
    }
  }

  window.DXSearchSelect = { enhance, refresh };
})();
