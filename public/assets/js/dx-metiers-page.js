// dx-metiers-page.js
(function(){
  const DATA_URL = "./assets/data/dx-metiers-v1.json";
  const azNav = document.getElementById("azNav");
  const azList = document.getElementById("azList");
  const q = document.getElementById("q");
  const hint = document.getElementById("hint");

  function norm(s){ return (s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,""); }

  function buildLink(label){
    const a = document.createElement("a");
    a.href = "./mur-demandes.html?service=" + encodeURIComponent(label);
    a.className = "dxBtn dxBtnGhost";
    a.style.padding = "8px 10px";
    a.textContent = label;
    return a;
  }

  function buildRow(label){
    const row = document.createElement("div");
    row.className = "card";
    row.style.padding = "10px 12px";
    row.style.margin = "0 0 10px";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";

    const left = document.createElement("div");
    left.style.fontWeight = "800";
    left.textContent = label;

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";
    const a1 = document.createElement("a");
    a1.href = "./mur-demandes.html?service=" + encodeURIComponent(label);
    a1.className = "dxBtn dxBtnPrimary";
    a1.textContent = "Voir les demandes";
    const a2 = document.createElement("a");
    a2.href = "./offreurs.html?service=" + encodeURIComponent(label);
    a2.className = "dxBtn dxBtnGhost";
    a2.textContent = "Voir les offreurs";
    right.appendChild(a1); right.appendChild(a2);

    row.appendChild(left); row.appendChild(right);
    return row;
  }

  function render(all){
    // build A-Z groups
    const groups = {};
    all.forEach(label=>{
      const first = (label[0]||"#").toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      (groups[key] ||= []).push(label);
    });
    const letters = Object.keys(groups).sort((a,b)=>a.localeCompare(b,'fr'));
    azNav.innerHTML = "";
    letters.forEach(L=>{
      const a=document.createElement("a");
      a.href="#az-"+L;
      a.className="dxBtn dxBtnGhost";
      a.style.padding="6px 10px";
      a.textContent=L;
      azNav.appendChild(a);
    });

    azList.innerHTML = "";
    letters.forEach(L=>{
      const section=document.createElement("section");
      section.id="az-"+L;
      section.style.margin="0 0 18px";
      const h2=document.createElement("h2");
      h2.textContent=L;
      h2.style.margin="0 0 8px";
      section.appendChild(h2);

      const wrap=document.createElement("div");
      wrap.style.display="flex";
      wrap.style.flexDirection="column";
      wrap.style.gap="8px";

      groups[L].sort((a,b)=>a.localeCompare(b,'fr')).forEach(label=>{
        wrap.appendChild(buildRow(label));
      });
      section.appendChild(wrap);
      azList.appendChild(section);
    });
  }

  async function load(){
    const res = await fetch(DATA_URL, { cache:"no-store" });
    const data = await res.json();
    const labels=[];
    (data.categories||[]).forEach(c=>{
      (c.jobs||[]).forEach(j=>labels.push(j.label));
    });
    render(labels);

    // Search (type-ahead) using labels + synonyms
    const index=[];
    (data.categories||[]).forEach(c=>{
      (c.jobs||[]).forEach(j=>{
        index.push({ label:j.label, keys:[j.label, ...(j.synonyms||[])] });
      });
    });

    q.addEventListener("input", ()=>{
      const term = norm(q.value.trim());
      hint.textContent="";
      // filter list quickly (max 12)
      if(!term){ return; }
      const hits = index.filter(it=>it.keys.some(k=>norm(k).includes(term))).slice(0,12);
      if(!hits.length){ hint.textContent="Aucun résultat."; return; }
      hint.innerHTML="";
      const box=document.createElement("div");
      box.style.display="flex";
      box.style.flexWrap="wrap";
      box.style.gap="8px";
      hits.forEach(h=>box.appendChild(buildLink(h.label)));
      hint.appendChild(box);
    });
  }

  load().catch(err=>{
    azList.innerHTML = '<div class="card" style="padding:12px 14px;">Impossible de charger la liste des métiers.</div>';
    console.error(err);
  });
})();