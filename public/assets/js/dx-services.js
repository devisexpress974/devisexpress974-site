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
    function splitCat(catRaw){
      catRaw = String(catRaw || "Autres").trim() || "Autres";
      // Catégorie • Sous-catégorie (si présent)
      var parts = catRaw.split("•").map(function(x){ return String(x||"").trim(); }).filter(Boolean);
      var main = parts[0] || "Autres";
      var sub  = parts[1] || "";
      return { main: main, sub: sub, full: sub ? (main + " • " + sub) : main };
    }

    var map = {};   // fullCat -> [ {value,text} ]
    var order = []; // fullCat[]
    var meta = {};  // fullCat -> {main,sub}

    (Array.isArray(list) ? list : []).forEach(function(x){
      if(!x) return;
      var label = String(x.label || x.name || x.title || "").trim();
      if(!label) return;

      var catInfo = splitCat(x.category);
      var fullCat = catInfo.full;
      meta[fullCat] = catInfo;

      // Harmonisation "Autre" (déclenche l'input 'autreService' côté demande)
      var isAutre = normalize(label).indexOf("autre") === 0;
      var opt = { value: isAutre ? "Autre" : label, text: isAutre ? "Autre (préciser)" : label };

      if(!map[fullCat]){
        map[fullCat] = [];
        order.push(fullCat);
      }
      map[fullCat].push(opt);
    });

    // tri catégories alpha (Catégorie puis Sous-catégorie), mais "Autres" en dernier
    order.sort(function(a,b){
      var A = meta[a] || {main:a, sub:""};
      var B = meta[b] || {main:b, sub:""};
      var na = normalize(A.main), nb = normalize(B.main);
      if(na === "autres" && nb !== "autres") return 1;
      if(nb === "autres" && na !== "autres") return -1;
      var c = String(A.main).localeCompare(String(B.main), "fr", { sensitivity:"base" });
      if(c !== 0) return c;
      return String(A.sub||"").localeCompare(String(B.sub||""), "fr", { sensitivity:"base" });
    });

    var cats = [];
    order.forEach(function(fullCat){
      var items = map[fullCat] || [];
      items.sort(function(a,b){
        return String(a.text).localeCompare(String(b.text), "fr", { sensitivity:"base" });
      });

      // "Autre (préciser)" toujours en dernier dans son groupe
      var autre = [];
      var normal = [];
      for(var i=0;i<items.length;i++){
        if(items[i] && items[i].value === "Autre") autre.push(items[i]);
        else normal.push(items[i]);
      }

      // dédoublonnage (value+text)
      var seen = {};
      var uniq = [];
      (normal.concat(autre)).forEach(function(it){
        if(!it) return;
        var key = it.value + "||" + it.text;
        if(seen[key]) return;
        seen[key]=1;
        uniq.push(it);
      });

      if(uniq.length) cats.push({ label: fullCat, items: uniq });
    });

    // s'assurer que l'option "Autre" existe tout à la fin (au cas où)
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