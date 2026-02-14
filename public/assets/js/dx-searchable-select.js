// DX Searchable Select (PATCH46) — simple, fast, no dependency
// - Ajoute un champ "Rechercher…" au-dessus d'un <select>
// - Filtre les options en temps réel (accents ignorés)
// - Préserve les <optgroup> (catégories / sous-catégories)
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
      // Capture structure: options racine + optgroups (pour préserver les catégories)
      const root = [];
      const groups = [];

      Array.from(selectEl.children).forEach((node) => {
        if (!node || !node.tagName) return;
        const tag = node.tagName.toUpperCase();

        if (tag === "OPTION") {
          root.push({
            value: node.value,
            text: node.textContent || node.innerText || "",
            disabled: !!node.disabled
          });
          return;
        }

        if (tag === "OPTGROUP") {
          const g = { label: node.label || "", options: [] };
          Array.from(node.children).forEach((opt) => {
            if (!opt || !opt.tagName) return;
            if (opt.tagName.toUpperCase() !== "OPTION") return;
            g.options.push({
              value: opt.value,
              text: opt.textContent || opt.innerText || "",
              disabled: !!opt.disabled
            });
          });
          groups.push(g);
        }
      });

      // fallback si aucun optgroup (ancien comportement)
      if (!groups.length && !root.length) {
        selectEl._dxAllGroups = { root: [], groups: [] };
        return;
      }
      if (!groups.length) {
        // Tout en root
        selectEl._dxAllGroups = {
          root: Array.from(selectEl.options).map((o) => ({
            value: o.value,
            text: o.textContent || o.innerText || "",
            disabled: !!o.disabled
          })),
          groups: []
        };
        return;
      }

      selectEl._dxAllGroups = { root, groups };
    };

    const apply = () => {
      const q = norm(input.value).trim();
      const data = selectEl._dxAllGroups || { root: [], groups: [] };

      const current = selectEl.value;

      const match = (o) => {
        if (!o) return false;
        if (o.value === "") return true; // placeholder toujours visible
        if (!q) return true;
        return norm(o.text).includes(q) || norm(o.value).includes(q);
      };

      const rootFiltered = (data.root || []).filter(match);

      const groupsFiltered = [];
      (data.groups || []).forEach((g) => {
        const opts = (g.options || []).filter(match);
        if (opts.length) groupsFiltered.push({ label: g.label, options: opts });
      });

      // Rebuild (préserve optgroups)
      selectEl.innerHTML = "";
      const frag = document.createDocumentFragment();

      for (const o of rootFiltered) {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.text;
        opt.disabled = o.disabled;
        frag.appendChild(opt);
      }

      for (const g of groupsFiltered) {
        const og = document.createElement("optgroup");
        og.label = g.label;
        for (const o of g.options) {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.textContent = o.text;
          opt.disabled = o.disabled;
          og.appendChild(opt);
        }
        frag.appendChild(og);
      }

      selectEl.appendChild(frag);

      // Restore selection if still present
      const hasCurrent = Array.from(selectEl.options).some((o) => o.value === current);
      if (hasCurrent) selectEl.value = current;
    };

    input.addEventListener("input", apply);

    // store hooks
    selectEl.dataset.dxSearchable = "1";
    selectEl._dxSearchInput = input;
    selectEl._dxSearchSnapshot = snapshot;
    selectEl._dxSearchApply = apply;

    snapshot();
    // Important : Chrome peut autofill le champ search, donc on applique tout de suite
    apply();
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
