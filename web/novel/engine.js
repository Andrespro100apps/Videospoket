/* ===========================================================
   Historia Pocket — Motor de novela visual v2.0
   - Carga story.json desde jsDelivr (GitHub) con fallback local
   - Escenas, typewriter lento (40ms), choices, finales múltiples
   - Variables/flags con condiciones
   - Expresiones faciales (clases CSS expr-* )
   - Efectos: glitch, tremor, sangre, blackout, jumpscare, pantalla rota
   - BGM/SFX por escena
   - Ending que permite volver a jugar
   - Guardado/carga en localStorage
   =========================================================== */
(function () {
  "use strict";

  // ---- Config: URL remota. Cambia TU_USUARIO/TU_REPO al subir a GitHub ----
  var REMOTE_BASE = "https://cdn.jsdelivr.net/gh/TU_USUARIO/TU_REPO@main/novel/";
  var LOCAL_BASE = "file:///android_asset/web/novel/";

  var state = {
    story: null,
    sceneId: "start",
    lineIndex: 0,
    vars: {},
    base: LOCAL_BASE,
    typing: false,
    skipRequested: false,
    fullText: ""
  };

  var $ = function (id) { return document.getElementById(id); };
  var gameEl, bgImg, charImg, dialogBox, dialogText, contInd,
      speakerBox, choicesBox, chapterLabel, loadingScreen,
      fxCanvas, bgLayer, bloodLayer, screenCrack, pauseMenu, endingScreen;

  // ---- Audio global ----
  var currentBgm = null;

  function bridge(method, payload) {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge[method] === "function") {
        if (payload !== undefined) {
          window.AndroidBridge[method](payload);
        } else {
          window.AndroidBridge[method]();
        }
      }
    } catch (e) {}
  }

  function log(msg) { try { console.log("[HP] " + msg); } catch (e) {} }

  // ============================================================
  //  ARRANQUE
  // ============================================================
  window.addEventListener("load", init);

  function init() {
    gameEl = $("game");
    bgImg = $("bg-img");
    charImg = $("char-img");
    dialogBox = $("dialog-box");
    dialogText = $("dialog-text");
    contInd = $("continue-indicator");
    speakerBox = $("speaker-box");
    choicesBox = $("choices-box");
    chapterLabel = $("chapter-label");
    loadingScreen = $("loading-screen");
    fxCanvas = $("fx-canvas");
    bgLayer = $("bg-layer");
    bloodLayer = $("blood-layer");
    screenCrack = $("screen-crack");
    pauseMenu = $("pause-menu");
    endingScreen = $("ending-screen");

    // Click/tap para avanzar
    dialogBox.addEventListener("click", advance);
    contInd.addEventListener("click", advance);

    // HUD
    $("btn-menu").addEventListener("click", function () { toggleOverlay("pause-menu", true); });
    $("btn-skip").addEventListener("click", function () {
      state.skipRequested = true;
      setTimeout(function () { state.skipRequested = false; }, 5000);
      advance();
    });

    // Menú pausa
    document.querySelectorAll(".menu-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { handleMenuAction(btn.getAttribute("data-action")); });
    });

    loadStory();
  }

  // ============================================================
  //  CARGA story.json
  // ============================================================
  function loadStory() {
    $("loading-text").textContent = "Cargando historia…";
    fetchStory(REMOTE_BASE + "story.json", true)
      .catch(function () {
        $("loading-text").textContent = "Sin internet, cargando versión local…";
        return fetchStory(LOCAL_BASE + "story.json", false);
      })
      .then(function (story) {
        state.story = story;
        state.base = story._local ? LOCAL_BASE : REMOTE_BASE;
        applyAssetPaths(story);
        restoreProgress();
        startGame();
      })
      .catch(function (err) {
        log("Error cargando: " + err);
        $("loading-text").textContent = "Error al cargar. Toca para reintentar.";
        loadingScreen.addEventListener("click", function () { location.reload(); });
      });
  }

  function fetchStory(url, isRemote) {
    return new Promise(function (resolve, reject) {
      log("Cargando: " + url);
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = 10000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { var d = JSON.parse(xhr.responseText); d._local = !isRemote; resolve(d); }
          catch (e) { reject(e); }
        } else { reject(new Error("HTTP " + xhr.status)); }
      };
      xhr.onerror = function () { reject(new Error("network")); };
      xhr.ontimeout = function () { reject(new Error("timeout")); };
      xhr.send();
    });
  }

  function applyAssetPaths(story) {
    function abs(path) {
      if (!path || path.indexOf("http") === 0 || path.indexOf("file:") === 0) return path;
      return state.base + path;
    }
    if (story.scenes) {
      Object.keys(story.scenes).forEach(function (sid) {
        var sc = story.scenes[sid];
        if (sc.bg) sc.bg = abs(sc.bg);
        if (sc.bgm) sc.bgm = abs(sc.bgm);
        if (sc.lines) sc.lines.forEach(function (ln) {
          if (ln.bg) ln.bg = abs(ln.bg);
          if (ln.sprite) ln.sprite = abs(ln.sprite);
          if (ln.sfx) ln.sfx = abs(ln.sfx);
          if (ln.bgm) ln.bgm = abs(ln.bgm);
        });
      });
    }
  }

  // ============================================================
  //  ARRANQUE
  // ============================================================
  function startGame() {
    loadingScreen.classList.add("hidden");
    gameEl.classList.remove("hidden");
    gameEl.classList.add("fade-in");
    if (state.story.startVars) {
      Object.keys(state.story.startVars).forEach(function (k) {
        if (state.vars[k] === undefined) state.vars[k] = state.story.startVars[k];
      });
    }
    renderScene();
  }

  // ============================================================
  //  ESCENA
  // ============================================================
  function renderScene() {
    var scene = state.story.scenes[state.sceneId];
    if (!scene) { dialogText.textContent = "[Error: escena '" + state.sceneId + "']"; return; }
    if (scene.ending) { showEnding(scene.ending); return; }
    chapterLabel.textContent = scene.chapter || state.story.title || "";
    if (scene.bg) setBackground(scene.bg, scene.bgEffect || "");
    if (scene.bgm) playBgm(scene.bgm);
    if (scene.mood) setMood(scene.mood);
    state.lineIndex = 0;
    playLine();
  }

  function playLine() {
    var scene = state.story.scenes[state.sceneId];
    if (!scene || !scene.lines) return;
    if (state.lineIndex >= scene.lines.length) {
      if (scene.next) { goToScene(scene.next); return; }
      return;
    }
    var ln = scene.lines[state.lineIndex];
    // Condición
    if (ln["if"] && !evalCond(ln["if"])) { state.lineIndex++; playLine(); return; }
    // Visuales
    if (ln.bg) setBackground(ln.bg, ln.bgEffect || "");
    if (ln.sprite !== undefined) setSprite(ln.sprite, ln.expr || "neutral");
    if (ln.fx) applyEffect(ln.fx);
    if (ln.bgm) playBgm(ln.bgm);
    if (ln.sfx) playSfx(ln.sfx);
    if (ln.mood) setMood(ln.mood);
    // Variables
    if (ln.set) applySet(ln.set);
    // Texto
    var spk = ln.speaker || "";
    var isNarr = !spk || spk === "narrator";
    showSpeaker(spk);
    dialogBox.classList.toggle("narration", isNarr);
    dialogText.classList.toggle("thought", ln.style === "thought");
    dialogText.classList.toggle("fourth-wall", ln.style === "fourth-wall");
    // Typewriter: 40ms por char (lento para VN real)
    var speed = state.skipRequested ? 2 : (ln.speed || 40);
    typeText(ln.text, speed, function () {
      contInd.classList.remove("hidden");
    });
  }

  function advance() {
    if (state.typing) {
      state.typing = false;
      dialogText.textContent = state.fullText || dialogText.textContent;
      contInd.classList.remove("hidden");
      return;
    }
    contInd.classList.add("hidden");
    var scene = state.story.scenes[state.sceneId];
    if (!scene || !scene.lines) return;
    if (state.lineIndex >= scene.lines.length - 1) {
      state.lineIndex++;
      saveProgress();
      if (scene.choices && scene.choices.length) { showChoices(scene.choices); }
      else if (scene.next) { goToScene(scene.next); }
      return;
    }
    state.lineIndex++;
    saveProgress();
    playLine();
  }

  // ============================================================
  //  CHOICES
  // ============================================================
  function showChoices(choices) {
    var vis = choices.filter(function (c) { return !c["if"] || evalCond(c["if"]); });
    choicesBox.innerHTML = "";
    vis.forEach(function (c) {
      var btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerHTML = c.text + (c.hint ? '<span class="hint">' + c.hint + '</span>' : "");
      btn.addEventListener("click", function () {
        if (c.set) applySet(c.set);
        if (c.sfx) playSfx(c.sfx);
        if (c.fx) applyEffect(c.fx);
        choicesBox.classList.add("hidden");
        goToScene(c.next);
      });
      choicesBox.appendChild(btn);
    });
    choicesBox.classList.remove("hidden");
  }

  function evalCond(cond) {
    try {
      var keys = Object.keys(state.vars);
      var body = "var " + keys.map(function (k) { return k + "=" + JSON.stringify(state.vars[k]); }).join(",") + "; return (" + cond + ");";
      return new Function(body)();
    } catch (e) { return false; }
  }

  function applySet(obj) {
    if (!obj) return;
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (typeof v === "number") state.vars[k] = (state.vars[k] || 0) + v;
      else state.vars[k] = v;
    });
  }

  // ============================================================
  //  NAVEGACIÓN
  // ============================================================
  function goToScene(sid) {
    if (Array.isArray(sid)) {
      for (var i = 0; i < sid.length; i++) {
        if (sid[i]["if"] && evalCond(sid[i]["if"])) { state.sceneId = sid[i].scene; clearSprite(); renderScene(); return; }
      }
      var fb = sid.filter(function (s) { return !s["if"]; })[0];
      if (fb) { state.sceneId = fb.scene; clearSprite(); renderScene(); }
      return;
    }
    state.sceneId = sid;
    clearSprite();
    renderScene();
  }

  // ============================================================
  //  VISUALES
  // ============================================================
  function setBackground(path, effect) {
    bgImg.classList.add("fade");
    setTimeout(function () {
      bgImg.src = path;
      bgImg.onload = function () { bgImg.classList.remove("fade"); };
      bgImg.onerror = function () { bgImg.src = state.base + "img/venue_home.jpg"; bgImg.classList.remove("fade"); };
      bgLayer.classList.toggle("vignette", effect === "vignette" || effect === "tension");
    }, 350);
  }

  function setSprite(path, expr) {
    // Limpiar clases de expresión previas
    charImg.className = "";
    if (path === null || path === "") { clearSprite(); return; }
    charImg.classList.add("fade");
    setTimeout(function () {
      charImg.src = path;
      charImg.style.display = "block";
      charImg.onload = function () { charImg.classList.remove("fade"); };
      charImg.onerror = function () { charImg.classList.add("fade"); };
      // Aplicar expresión
      if (expr) charImg.classList.add("expr-" + expr);
    }, 150);
  }

  function clearSprite() { charImg.className = ""; charImg.style.display = "none"; charImg.src = ""; }

  function applyEffect(fx) {
    // Limpiar TODO
    document.body.classList.remove("glitch", "flash-red", "tremor", "blackout",
      "static-noise", "warmth", "fog", "heartbeat", "jumpscare");
    charImg.classList.remove("shake", "breath");
    bloodLayer.classList.remove("show");
    dialogText.classList.remove("fourth-wall");
    screenCrack.className = "";
    void document.body.offsetWidth;

    switch (fx) {
      case "glitch": document.body.classList.add("glitch"); break;
      case "flash-red":
        document.body.classList.add("flash-red");
        setTimeout(function () { document.body.classList.remove("flash-red"); }, 400);
        break;
      case "tremor": document.body.classList.add("tremor"); break;
      case "shake": charImg.classList.add("shake"); break;
      case "breath": charImg.classList.add("breath"); break;
      case "vignette": bgLayer.classList.add("vignette"); break;
      case "blood":
        bloodLayer.classList.add("show");
        setTimeout(function () { bloodLayer.classList.remove("show"); }, 3500);
        break;
      case "warmth": document.body.classList.add("warmth"); break;
      case "fog": document.body.classList.add("fog"); break;
      case "heartbeat": document.body.classList.add("heartbeat"); break;
      case "static":
        document.body.classList.add("static-noise");
        setTimeout(function () { document.body.classList.remove("static-noise"); }, 2500);
        break;
      case "blackout":
        document.body.classList.add("blackout");
        setTimeout(function () { document.body.classList.remove("blackout"); }, 2000);
        break;
      case "jumpscare":
        document.body.classList.add("jumpscare");
        setTimeout(function () { document.body.classList.remove("jumpscare"); }, 200);
        break;
      case "screen-crack":
        screenCrack.classList.add("show", "crack-blood");
        bridge("onMood", "horror");
        break;
      case "screen-off":
        screenCrack.classList.add("show", "screen-off");
        break;
      case "none": break;
    }
  }

  function setMood(mood) {
    var vm = { calm: false, tension: true, fear: true, romance: false, horror: true };
    if (vm[mood]) bgLayer.classList.add("vignette");
    else bgLayer.classList.remove("vignette");
    bridge("onMood", mood);
  }

  // ============================================================
  //  TYPEWRITER (lento para VN real)
  // ============================================================
  function typeText(text, msPerChar, done) {
    state.typing = true;
    state.fullText = text || "";
    dialogText.textContent = "";
    contInd.classList.add("hidden");
    var i = 0;
    function step() {
      if (!state.typing) return;
      if (i >= text.length) { state.typing = false; if (done) done(); return; }
      dialogText.textContent += text.charAt(i);
      i++;
      var ch = text.charAt(i - 1);
      var delay = msPerChar;
      if (".!?".indexOf(ch) >= 0) delay += 250;
      else if (",;:".indexOf(ch) >= 0) delay += 120;
      else if ("…—".indexOf(ch) >= 0) delay += 80;
      setTimeout(step, delay);
    }
    step();
  }

  function showSpeaker(name) {
    if (name && name !== "narrator") {
      speakerBox.textContent = name;
      speakerBox.classList.remove("hidden");
    } else { speakerBox.classList.add("hidden"); }
  }

  // ============================================================
  //  AUDIO
  // ============================================================
  function playBgm(path) {
    if (currentBgm === path) return;
    if (currentBgm) { try { currentBgm.pause(); currentBgm.currentTime = 0; } catch (e) {} }
    try {
      var a = new Audio(path);
      a.loop = true;
      a.volume = 0.35;
      a.play().catch(function () {});
      currentBgm = a;
      currentBgm.src = path;
    } catch (e) {}
  }

  function playSfx(path) {
    try {
      var a = new Audio(path);
      a.volume = 0.65;
      a.play().catch(function () {});
    } catch (e) {}
  }

  function stopBgm() {
    if (currentBgm) { try { currentBgm.pause(); currentBgm.currentTime = 0; } catch (e) {} currentBgm = null; }
  }

  // ============================================================
  //  ENDING — PERMITE VOLVER A JUGAR
  // ============================================================
  function showEnding(ending) {
    stopBgm();
    $("ending-title").textContent = ending.title || "Final";
    $("ending-desc").textContent = ending.desc || "";
    var t = ending.type || "neutral";
    $("ending-title").style.color =
      (t === "good") ? "#7ec850" : (t === "bad") ? "#c0392b" : (t === "true") ? "#e85d8e" : "#a39c8e";
    toggleOverlay("ending-screen", true);
    clearProgress();
    bridge("onEnding", ending.title || "");
  }

  // ============================================================
  //  MENÚ / GUARDADO
  // ============================================================
  function toggleOverlay(id, show) {
    $(id).classList.toggle("hidden", !show);
  }

  function handleMenuAction(action) {
    toggleOverlay("pause-menu", false);
    switch (action) {
      case "resume": break;
      case "save":
        saveProgress();
        flashToast("💾 Guardado");
        break;
      case "load":
        restoreProgress();
        renderScene();
        flashToast("📂 Cargado");
        break;
      case "restart":
        clearProgress();
        resetVars();
        state.sceneId = "start";
        stopBgm();
        toggleOverlay("ending-screen", false);
        renderScene();
        break;
      case "exit":
        bridge("exit");
        break;
    }
  }

  function flashToast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);color:#fff;padding:14px 28px;border-radius:10px;z-index:50;font-size:16px;";
    gameEl.appendChild(t);
    setTimeout(function () { t.remove(); }, 1200);
  }

  // ---- Persistencia ----
  var SAVE_KEY = "historia_pocket_save";
  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ sceneId: state.sceneId, lineIndex: state.lineIndex, vars: state.vars })); } catch (e) {}
  }
  function restoreProgress() {
    try {
      var r = localStorage.getItem(SAVE_KEY);
      if (r) { var s = JSON.parse(r); state.sceneId = s.sceneId || "start"; state.lineIndex = 0; state.vars = s.vars || {}; }
    } catch (e) {}
  }
  function resetVars() {
    state.vars = {};
    if (state.story.startVars) Object.keys(state.story.startVars).forEach(function (k) { state.vars[k] = state.story.startVars[k]; });
  }
  function clearProgress() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  // ---- Debug ----
  window.HP = { state: state, advance: advance, goToScene: goToScene };
})();
