(async function(){
  const target = document.getElementById("dx-header-slot");
  if (!target) return;

  try{
    const res = await fetch('./partials/header.html'", { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    target.innerHTML = await res.text();

    // init burger/menu si prÃ©sent dans dx-header.js
    if (typeof window.__dxInitHeader === "function") window.__dxInitHeader();
  }catch(e){
    console.error("DX header inject error:", e);
  }
})();
