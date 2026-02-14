// DX SERVICES v50 - source unique services_devisexpress974.json (catégories + A→Z)
// Remplit automatiquement les <select> suivants si présents :
// - #typeService (demande.html)
// - #service (offreur-register.html / offreur-compte.html)
// - #serviceFilter (mur-demandes.html / offreurs.html)
(function(){
  function $(id){ return document.getElementById(id); }
  function normalize(s){ return String(s||"").toLowerCase().trim(); }

  function clearSelect(sel, keepFirst){
    if(!sel) return;
    var first = null;
    if(keepFirst && sel.options && sel.options.length){
      first = sel.options[0].cloneNode(true);
    }
    while(sel.firstChild) sel.removeChild(sel.firstChild);
    if(first) sel.appendChild(first);
  }

  function safeFetchJson(url){
    return fetch(url, { cache: "no-store" }).then(function(res){
      if(!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function loadServices(){
    // chemins possibles selon pages
    var urls = [
      "./assets/data/services_devisexpress974.json",
      "./services_devisexpress974.json",
      "/assets/data/services_devisexpress974.json",
      "/services_devisexpress974.json"
    ];
    var p = Promise.reject(new Error("no url"));
    for(var i=0;i<urls.length;i++){
      (function(u){
        p = p.catch(function(){ return safeFetchJson(u); });
      })(urls[i]);
    }
    return p;
  }

  function buildCatsFromServices(list){
    // list = [ {service_id, category, label} ... ]
    var map = {};
    var order = [];
    (Array.isArray(list) ? list : []).forEach(function(x){
      if(!x) return;
      var cat = String(x.category || "Autres").trim() || "Autres";
      var label = String(x.label || x.name || x.title || "").trim();
      if(!label) return;

      // Harmonisation "Autre" (déclenche l'input 'autreService' côté demande)
      var isAutre = normalize(label).indexOf("autre") === 0;
      var opt = { value: isAutre ? "Autre" : label, text: isAutre ? "Autre (préciser)" : label };

      if(!map[cat]){
        map[cat] = [];
        order.push(cat);
      }
      map[cat].push(opt);
    });

    // tri catégories alpha, mais "Autres" en dernier
    order.sort(function(a,b){
      var na = normalize(a), nb = normalize(b);
      if(na === "autres") return 1;
      if(nb === "autres") return -1;
      return a.localeCompare(b,'fr',{sensitivity:'base'});
    });

    var cats = [];
    order.forEach(function(cat){
      var items = map[cat] || [];
      // unique par value+text
      items.sort(function(a,b){ return String(a.text).localeCompare(String(b.text),'fr',{sensitivity:'base'}); });
      var uniq = [];
      var seen = {};
      items.forEach(function(it){
        var key = it.value + "||" + it.text;
        if(seen[key]) return;
        seen[key] = true;
        uniq.push(it);
      });

      // "Autre (préciser)" toujours tout en bas
      var autreIdx = -1;
      for(var ai=0; ai<uniq.length; ai++){
        if(uniq[ai] && uniq[ai].value === "Autre"){ autreIdx = ai; break; }
      }
      if(autreIdx >= 0){
        var autre = uniq.splice(autreIdx,1)[0];
        uniq.push(autre);
      }

      if(uniq.length) cats.push({ label: cat, items: uniq });
    });

    // s'assurer que l'option "Autre" existe tout à la fin
    var hasAutre = cats.some(function(c){
      return (c.items || []).some(function(it){ return it && it.value === "Autre"; });
    });
    if(!hasAutre){
      cats.push({ label: "Autres", items: [{ value: "Autre", text: "Autre (préciser)" }] });
    }
    return cats;
  }

  function fillSelect(sel, cats){
    if(!sel) return;
    // On garde l'option 0 si elle existe (placeholder)
    var keepFirst = (sel.options && sel.options.length && normalize(sel.options[0].value) === "");
    clearSelect(sel, keepFirst);

    for(var i=0;i<cats.length;i++){
      var og = document.createElement("optgroup");
      og.label = cats[i].label;
      var items = cats[i].items || [];
      for(var j=0;j<items.length;j++){
        var it = items[j];
        var opt = document.createElement("option");
        opt.value = it.value;
        opt.textContent = it.text;
        og.appendChild(opt);
      }
      sel.appendChild(og);
    }
  }

  function preselectFromUrl(){
    try{
      var sp = new URLSearchParams(location.search);
      var wanted = (sp.get("service") || sp.get("metier") || "").trim();
      if(!wanted) return;
      var ids = ["typeService","service","serviceFilter"];
      for(var i=0;i<ids.length;i++){
        var sel = $(ids[i]);
        if(!sel) continue;
        sel.value = wanted;
        try{ sel.dispatchEvent(new Event("change",{bubbles:true})); }catch(e){}
      }
    }catch(e){}
  }

  document.addEventListener("DOMContentLoaded", function(){
    loadServices().then(function(list){
      var cats = buildCatsFromServices(list);

      fillSelect($("typeService"), cats);
      fillSelect($("service"), cats);
      fillSelect($("serviceFilter"), cats);

      preselectFromUrl();

      // Si un composant "recherche dans select" existe, on l'active
      if(window.DXSearchSelect && typeof window.DXSearchSelect.enhance === "function"){
        var a = $("typeService"), b = $("service"), c = $("serviceFilter");
        if(a) window.DXSearchSelect.enhance(a, { placeholder: "Rechercher un métier…" });
        if(b) window.DXSearchSelect.enhance(b, { placeholder: "Rechercher un métier…" });
        if(c) window.DXSearchSelect.enhance(c, { placeholder: "Rechercher un métier…" });
        if(a && window.DXSearchSelect.refresh) window.DXSearchSelect.refresh(a);
        if(b && window.DXSearchSelect.refresh) window.DXSearchSelect.refresh(b);
        if(c && window.DXSearchSelect.refresh) window.DXSearchSelect.refresh(c);
      }
    }).catch(function(err){
      console.error("[DX] Services introuvables / invalides:", err);
    });
  });
})();