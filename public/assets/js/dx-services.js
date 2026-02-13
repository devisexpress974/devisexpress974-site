// DX SERVICES v40 - source unique lexique-metiers.json (catégories + A→Z)
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

  function buildOptionsFromLexique(lex){
    // lex = { categories:[ {label, jobs:[{label}]} ] }
    var categories = (lex && lex.categories) ? lex.categories : [];
    var outCats = [];
    for(var i=0;i<categories.length;i++){
      var c = categories[i] || {};
      var catLabel = c.label || "Autres";
      var jobs = c.jobs || [];
      var labels = [];
      for(var j=0;j<jobs.length;j++){
        var jl = (jobs[j] && jobs[j].label) ? String(jobs[j].label).trim() : "";
        if(!jl) continue;
        labels.push(jl);
      }
      // tri alpha + unique
      labels.sort(function(a,b){ return a.localeCompare(b,'fr',{sensitivity:'base'}); });
      var uniq = [];
      for(var k=0;k<labels.length;k++){
        if(!k || labels[k] !== labels[k-1]) uniq.push(labels[k]);
      }
      if(uniq.length){
        outCats.push({ label: catLabel, items: uniq });
      }
    }
    // tri catégories alpha
    outCats.sort(function(a,b){ return a.label.localeCompare(b.label,'fr',{sensitivity:'base'}); });
    return outCats;
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
        var opt = document.createElement("option");
        opt.value = items[j];
        opt.textContent = items[j];
        og.appendChild(opt);
      }
      sel.appendChild(og);
    }
  }

  function safeFetchJson(url){
    return fetch(url, { cache: "no-store" }).then(function(res){
      if(!res.ok) throw new Error("HTTP "+res.status);
      return res.json();
    });
  }

  function loadLexique(){
    // chemins possibles selon pages
    var urls = [
      "./assets/data/lexique-metiers.json",
      "./lexique-metiers.json",
      "/assets/data/lexique-metiers.json",
      "/lexique-metiers.json"
    ];
    var p = Promise.reject(new Error("no url"));
    for(var i=0;i<urls.length;i++){
      (function(u){
        p = p.catch(function(){ return safeFetchJson(u); });
      })(urls[i]);
    }
    return p;
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
    loadLexique().then(function(lex){
      var cats = buildOptionsFromLexique(lex);
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
      console.error("[DX] Lexique métiers introuvable / invalide:", err);
    });
  });
})();
