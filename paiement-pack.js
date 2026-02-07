document.addEventListener("DOMContentLoaded", async () => {
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnPaid");
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || params.get("demandeId") || "";
  const txFromUrl = params.get("tx") || params.get("txn_id") || "";
  const nextUrl = "paiement-pack.html" + (location.search || "");

  const token = localStorage.getItem("dx_token") || "";
  if(!token){
    location.href = "offreur-login.html?next=" + encodeURIComponent(nextUrl);
    return;
  }

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text;
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "Activation…";

    if(id){
      const tx = (txFromUrl || window.prompt("Colle l\'ID de transaction PayPal (tx) puis OK :") || "").trim();

      if(!tx){
        btn.disabled = false;
        btn.textContent = old;
        return show("err","Transaction PayPal manquante.");
      }

      const res = await DX_API.post("confirmPayPalPayment", { tx: tx, product: "pack", demandeId: id });

      if(res?.ok){
        show("ok","Paiement confirmé ✅ (Pack)");
        if(id){ setTimeout(()=> location.href="demande-detail.html?id="+encodeURIComponent(id), 450); }
        else { setTimeout(()=> location.href="mur-demandes.html", 450); }
        setTimeout(()=> location.href="demande-detail.html?id="+encodeURIComponent(id), 450);
        return;
      }
      btn.disabled = false; btn.textContent = old;
      return show("err", res?.error || "Pack OK mais déblocage KO");
    }

    show("ok","Paiement confirmé ✅ (Pack)");
        if(id){ setTimeout(()=> location.href="demande-detail.html?id="+encodeURIComponent(id), 450); }
        else { setTimeout(()=> location.href="mur-demandes.html", 450); }
    setTimeout(()=> location.href="mur-demandes.html", 450);
  });
});
