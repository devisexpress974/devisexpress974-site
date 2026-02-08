// video-helper.js — Autoplay + fallback de nom de fichier (video.mp4 / vidéo.mp4)
// Important : sur mobile, l'autoplay peut être bloqué par le navigateur. On garde donc un bouton "Lecture".

(function () {
  function $(id) { return document.getElementById(id); }

  var video = $("heroVideo");
  if (!video) return;

  var playBtn = $("videoPlayBtn");
  var msg = $("videoMsg");

  // Paramètres safe autoplay
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("muted", "true");
  video.setAttribute("autoplay", "true");
  video.setAttribute("preload", "metadata");

  // Candidats (si tu as encore un fichier nommé "vidéo.mp4")
  var candidates = ["video.mp4", encodeURI("vidéo.mp4")];

  function setMsg(text) {
    if (!msg) return;
    msg.textContent = text || "";
    msg.style.display = text ? "block" : "none";
  }

  function showPlay(show) {
    if (!playBtn) return;
    playBtn.style.display = show ? "inline-flex" : "none";
  }

  function forcePlay() {
    var p = video.play();
    if (p && typeof p.then === "function") {
      p.then(function () {
        showPlay(false);
        setMsg("");
      }).catch(function () {
        // Autoplay bloqué → bouton
        showPlay(true);
        setMsg("Lecture automatique bloquée par le navigateur. Appuie sur « Lecture ».");
      });
    }
  }

  // On tente de trouver une source qui existe réellement (HEAD)
  function pickSource(i) {
    if (i >= candidates.length) {
      // Aucune source trouvée
      showPlay(true);
      setMsg("Vidéo introuvable sur le site. Vérifie que le fichier est bien déployé à la racine.");
      return;
    }

    var src = candidates[i];

    fetch(src, { method: "HEAD", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) return pickSource(i + 1);
        var ct = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
        if (ct.includes('text/html')) return pickSource(i + 1);
        // OK → on fixe la source + anti-cache léger
        var bust = (src.indexOf("?") > -1 ? "&" : "?") + "v=" + Date.now();
        video.src = src + bust;
        video.load();
        forcePlay();
      })
      .catch(function () {
        // Si HEAD est bloqué, on tente quand même
        video.src = src + "?v=" + Date.now();
        video.load();
        forcePlay();
      });
  }

  // Bouton manuel
  if (playBtn) {
    playBtn.addEventListener("click", function () {
      showPlay(false);
      setMsg("");
      video.muted = false; // l'utilisateur a cliqué → on peut activer le son si voulu
      forcePlay();
    });
  }

  // Si l'utilisateur lance avec les controls, on cache le bouton
  video.addEventListener("play", function () { showPlay(false); setMsg(""); });

  pickSource(0);
})();
