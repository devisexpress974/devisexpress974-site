(async function(){
  const target = document.getElementById("dx-header-slot");
  if(!target) return;

  try{
    const res = await fetch("partials/header.html", { cache: "no-cache" });
    if(!res.ok) throw new Error("header fetch failed");
    target.innerHTML = await res.text();
    if (typeof window.__dxInitHeader === "function") window.__dxInitHeader();
  }catch(e){
    console.warn("DX header injection error:", e);
  }
})();
