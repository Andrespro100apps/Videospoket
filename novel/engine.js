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

  // ---- Config: URL remota en GitHub Videospoket ----
  var REMOTE_BASE = "https://raw.githubusercontent.com/Andrespro100apps/Videospoket/main/novel/";
  var LOCAL_BASE = "file:///android_asset/web/novel/";

  // ---- i18n: idioma activo y lista de 20 idiomas oficiales ----
  var SUPPORTED_LANGS = [
    "es", "en", "fr", "pt", "it", "de", "ru", "ar", "hi", "bn",
    "ur", "zh", "ja", "ko", "nl", "sv", "tr", "in", "jw", "su"
  ];
  var activeLang = "es";

  function normalizeLangCode(raw) {
    if (!raw) return "es";
    var l = String(raw).toLowerCase().trim();
    if (l.indexOf("zh") === 0) return "zh";
    if (l === "id" || l === "in") return "in";
    if (l === "jv" || l === "jw") return "jw";
    if (l.indexOf("pt") === 0) return "pt";
    var prefix = l.substring(0, 2);
    if (SUPPORTED_LANGS.indexOf(prefix) >= 0) return prefix;
    return "es";
  }

  function detectLang() {
    try {
      var saved = localStorage.getItem("pocketgirl_novel_lang");
      if (saved) {
        activeLang = normalizeLangCode(saved);
        return;
      }
      if (window.AndroidBridge && typeof window.AndroidBridge.getLanguage === "function") {
        var l = window.AndroidBridge.getLanguage();
        if (l) { activeLang = normalizeLangCode(l); return; }
      }
    } catch (e) {}
    try {
      var nav = (navigator.language || navigator.userLanguage || "es");
      activeLang = normalizeLangCode(nav);
    } catch (e) { activeLang = "es"; }
  }

  // ============================================================
  //  SELECTOR DE IDIOMAS (20 IDIOMAS)
  // ============================================================
  var LANGUAGES_LIST = [
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "pt", name: "Português", flag: "🇵🇹" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "zh", name: "简体中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "in", name: "Bahasa Indonesia", flag: "🇮🇩" },
    { code: "jw", name: "Basa Jawa", flag: "🇮🇩" },
    { code: "su", name: "Basa Sunda", flag: "🇮🇩" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "bn", name: "বাংলা", flag: "🇧🇩" },
    { code: "ur", name: "اردو", flag: "🇵🇰" },
    { code: "nl", name: "Nederlands", flag: "🇳🇱" },
    { code: "sv", name: "Svenska", flag: "🇸🇪" },
    { code: "tr", name: "Türkçe", flag: "🇹🇷" }
  ];

  function openLanguageModal() {
    var modal = $("language-modal");
    if (!modal) return;
    renderLanguageGrid();
    modal.classList.remove("hidden");
  }

  function closeLanguageModal() {
    var modal = $("language-modal");
    if (modal) modal.classList.add("hidden");
  }

  function renderLanguageGrid() {
    var grid = $("language-grid");
    if (!grid) return;
    grid.innerHTML = "";
    LANGUAGES_LIST.forEach(function (item) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "lang-card" + (item.code === activeLang ? " active" : "");
      card.innerHTML = "<span class='lang-flag'>" + item.flag + "</span><span class='lang-name'>" + item.name + "</span>";
      card.addEventListener("click", function () {
        selectLanguage(item.code, item.name);
      });
      grid.appendChild(card);
    });
  }

  function selectLanguage(code, name) {
    activeLang = code;
    try {
      localStorage.setItem("pocketgirl_novel_lang", code);
    } catch (e) {}
    closeLanguageModal();
    flashToast("🌐 " + (name || code));
    loadLocale(code).then(function () {
      applyUiTranslations();
      if (chaptersModal && !chaptersModal.classList.contains("hidden")) {
        renderChaptersList(currentChaptersFilter || "all");
      }
      if (cgsGalleryModal && !cgsGalleryModal.classList.contains("hidden")) {
        renderCgsGallery(currentCgFilter || "all");
      }
      if (gameEl && !gameEl.classList.contains("hidden")) {
        renderScene(state.lineIndex);
      }
    });
  }

  // ============================================================
  //  DICCIONARIO DE TRADUCCIÓN UI MULTI-IDIOMA (20 IDIOMAS)
  // ============================================================
  var DICTIONARY_UI = {
    "es": {
      "tab_all": "Todos",
      "tab_beach": "👙 Especiales VIP & Bikini (14)",
      "tab_choices": "🔀 Decisiones (16)",
      "tab_chars": "👥 Personajes (12)",
      "tab_prologue": "Prólogo & Acto I",
      "tab_routes": "Rutas Heroínas",
      "tab_mystery": "Misterio & Bucle",
      "tab_endings": "Desenlaces",
      "play_btn": "Jugar",
      "unlock_decision_btn": "Desbloquear Decisión (100 Monedas)",
      "unlock_special_btn": "Desbloquear Especial VIP ({n} Monedas)",
      "decision_badge": "Decisión",
      "decision_unlocked": "Decisión Desbloqueada",
      "vip_unlocked": "VIP Desbloqueado",
      "where_story_left": "📖 ¿Dónde quedó la historia?",
      "on_scene": "En escena:",
      "choices_at_crossroad": "🔀 Opciones en esta encrucijada ({n}):",
      "start_from_beginning": "Iniciar capítulo desde el principio",
      "title_exit": "◀ Salir",
      "title_lang": "🌐 Idioma",
      "title_chapters": "📂 Archivo de Capítulos",
      "title_gallery": "🔞 Archivos y Secretos VIP (20 🪙)",
      "gallery_title": "Archivos y Secretos VIP (20 🪙)",
      "gallery_sub": "Colección VIP de ilustraciones exclusivas, cinemáticas anime y videos de eventos de Yamaku.",
      "gallery_tab_all": "Todos",
      "gallery_tab_beach": "👙 Playa & Bikini",
      "gallery_tab_romance": "💖 Romance & Citas",
      "gallery_tab_intimate": "🔞 Íntimos VIP",
      "gallery_tab_videos": "🎬 Videos & Cinemáticas",
      "gallery_save_btn": "Guardar en Galería 📸💾",
      "backlog_title": "Historial de Diálogos",
      "coins_alert_title": "Monedas Insuficientes",
      "coins_alert_desc": "Necesitas al menos 100 monedas para desbloquear la lectura completa o el capítulo especial.",
      "get_coins_btn": "🛒 Conseguir Monedas",
      "close_btn": "Cerrar",
      "lang_modal_title": "Seleccionar Idioma / Select Language",
      "lang_modal_sub": "Elige tu idioma preferido. Los textos y diálogos se traducirán al instante.",
      "unlocked_toast": "¡Desbloqueado permanentemente!"
    },
    "en": {
      "tab_all": "All",
      "tab_beach": "👙 VIP & Bikini Specials (14)",
      "tab_choices": "🔀 Decisions (16)",
      "tab_chars": "👥 Characters (12)",
      "tab_prologue": "Prologue & Act I",
      "tab_routes": "Heroine Routes",
      "tab_mystery": "Mystery & Timeloop",
      "tab_endings": "Endings",
      "play_btn": "Play",
      "unlock_decision_btn": "Unlock Decision (100 Coins)",
      "unlock_special_btn": "Unlock VIP Special ({n} Coins)",
      "decision_badge": "Decision",
      "decision_unlocked": "Decision Unlocked",
      "vip_unlocked": "VIP Unlocked",
      "where_story_left": "📖 Where the story left off",
      "on_scene": "On scene:",
      "choices_at_crossroad": "🔀 Choices at this crossroads ({n}):",
      "start_from_beginning": "Start chapter from beginning",
      "title_exit": "◀ Exit",
      "title_lang": "🌐 Language",
      "title_chapters": "📂 Chapter Archive",
      "title_gallery": "🔞 Secret Album",
      "gallery_title": "Secret Album & VIP Memories",
      "gallery_sub": "Exclusive high-resolution illustrations of intimate moments and summer on the beach.",
      "gallery_tab_all": "All (39)",
      "gallery_tab_beach": "👙 Beach & Bikini",
      "gallery_tab_romance": "💖 Romance & Dates",
      "gallery_tab_intimate": "🔞 Intimate VIP",
      "gallery_save_btn": "Save to Gallery 📸💾",
      "backlog_title": "Dialogue History",
      "coins_alert_title": "Insufficient Coins",
      "coins_alert_desc": "You need at least 100 coins to unlock this chapter or decision.",
      "get_coins_btn": "🛒 Get Coins",
      "close_btn": "Close",
      "lang_modal_title": "Select Language",
      "lang_modal_sub": "Choose your preferred language. Texts and dialogues will update immediately.",
      "unlocked_toast": "Permanently unlocked!"
    },
    "ja": {
      "tab_all": "すべて",
      "tab_beach": "👙 VIP＆水着スペシャル (14)",
      "tab_choices": "🔀 選択肢 (16)",
      "tab_chars": "👥 登場人物 (12)",
      "tab_prologue": "プロローグ＆第1幕",
      "tab_routes": "ヒロインルート",
      "tab_mystery": "謎とタイムループ",
      "tab_endings": "エンディング",
      "play_btn": "プレイ",
      "unlock_decision_btn": "選択肢を解放 (100コイン)",
      "unlock_special_btn": "VIPスペシャルを解放 ({n}コイン)",
      "decision_badge": "選択肢",
      "decision_unlocked": "選択肢解放済み",
      "vip_unlocked": "VIP解放済み",
      "where_story_left": "📖 物語のあらすじ",
      "on_scene": "登場人物:",
      "choices_at_crossroad": "🔀 この分岐での選択肢 ({n}):",
      "start_from_beginning": "章の最初から始める",
      "title_exit": "◀ 戻る",
      "title_lang": "🌐 言語",
      "title_chapters": "📂 チャプターアーカイブ",
      "title_gallery": "🔞 秘密のアルバム",
      "gallery_title": "秘密のアルバム＆VIPメモリー",
      "gallery_sub": "親密なイベントやビーチの高解像度イラスト集。",
      "gallery_tab_all": "すべて (39)",
      "gallery_tab_beach": "👙 ビーチ＆水着",
      "gallery_tab_romance": "💖 ロマンス＆デート",
      "gallery_tab_intimate": "🔞 VIP親密",
      "gallery_save_btn": "ギャラリーに保存 📸💾",
      "backlog_title": "会話履歴",
      "coins_alert_title": "コインが不足しています",
      "coins_alert_desc": "この章または選択肢を解放するには100コインが必要です。",
      "get_coins_btn": "🛒 コインを獲得",
      "close_btn": "閉じる",
      "lang_modal_title": "言語を選択",
      "lang_modal_sub": "言語を選択すると、テキストと会話が即座に切り替わります。",
      "unlocked_toast": "永久に解放されました！"
    },
    "zh": {
      "tab_all": "全部",
      "tab_beach": "👙 VIP与比基尼特辑 (14)",
      "tab_choices": "🔀 剧情抉择 (16)",
      "tab_chars": "👥 角色档案 (12)",
      "tab_prologue": "序章与第一幕",
      "tab_routes": "女主角路线",
      "tab_mystery": "悬疑与时间循环",
      "tab_endings": "结局终章",
      "play_btn": "开始阅读",
      "unlock_decision_btn": "解锁剧情抉择 (100金币)",
      "unlock_special_btn": "解锁VIP特辑 ({n}金币)",
      "decision_badge": "抉择",
      "decision_unlocked": "抉择已解锁",
      "vip_unlocked": "VIP已解锁",
      "where_story_left": "📖 前情提要",
      "on_scene": "出场角色:",
      "choices_at_crossroad": "🔀 本岔路可选分支 ({n}):",
      "start_from_beginning": "从头开始阅读该章节",
      "title_exit": "◀ 返回",
      "title_lang": "🌐 语言",
      "title_chapters": "📂 章节与路线档案",
      "title_gallery": "🔞 绝密回忆相册",
      "gallery_title": "绝密回忆相册 & VIP特辑",
      "gallery_sub": "高分辨率独家私密剧情与海滩泳装原画。",
      "gallery_tab_all": "全部 (39)",
      "gallery_tab_beach": "👙 海滩与比基尼",
      "gallery_tab_romance": "💖 浪漫与约会",
      "gallery_tab_intimate": "🔞 VIP私密相册",
      "gallery_save_btn": "保存到本地相册 📸💾",
      "backlog_title": "对话回顾",
      "coins_alert_title": "金币不足",
      "coins_alert_desc": "需要至少100金币才能解锁此章节或剧情抉择。",
      "get_coins_btn": "🛒 获取金币",
      "close_btn": "关闭",
      "lang_modal_title": "选择语言",
      "lang_modal_sub": "选择首选语言，所有文本和对白将即时更新。",
      "unlocked_toast": "已永久解锁！"
    },
    "pt": {
      "tab_all": "Todos",
      "tab_beach": "👙 Especiais VIP & Biquíni (14)",
      "tab_choices": "🔀 Decisões (16)",
      "tab_chars": "👥 Personagens (12)",
      "tab_prologue": "Prólogo & Ato I",
      "tab_routes": "Rotas das Heroínas",
      "tab_mystery": "Mistério & Loop",
      "tab_endings": "Desfechos",
      "play_btn": "Jogar",
      "unlock_decision_btn": "Desbloquear Decisão (100 Moedas)",
      "unlock_special_btn": "Desbloquear Especial VIP ({n} Moedas)",
      "decision_badge": "Decisão",
      "decision_unlocked": "Decisão Desbloqueada",
      "vip_unlocked": "VIP Desbloqueado",
      "where_story_left": "📖 Onde a história parou?",
      "on_scene": "Em cena:",
      "choices_at_crossroad": "🔀 Escolhas nesta encruzilhada ({n}):",
      "start_from_beginning": "Iniciar capítulo do começo",
      "title_exit": "◀ Sair",
      "title_lang": "🌐 Idioma",
      "title_chapters": "📂 Arquivo de Capítulos",
      "title_gallery": "🔞 Álbum Secreto",
      "gallery_title": "Álbum Secreto & Lembranças VIP",
      "gallery_sub": "Ilustrações exclusivas em alta resolução de momentos íntimos e verão.",
      "gallery_tab_all": "Todos (39)",
      "gallery_tab_beach": "👙 Praia & Biquíni",
      "gallery_tab_romance": "💖 Romance & Encontros",
      "gallery_tab_intimate": "🔞 Íntimos VIP",
      "gallery_save_btn": "Salvar na Galeria 📸💾",
      "backlog_title": "Histórico de Diálogos",
      "coins_alert_title": "Moedas Insuficientes",
      "coins_alert_desc": "Você precisa de pelo menos 100 moedas para desbloquear este capítulo ou decisão.",
      "get_coins_btn": "🛒 Obter Moedas",
      "close_btn": "Fechar",
      "lang_modal_title": "Selecionar Idioma",
      "lang_modal_sub": "Escolha seu idioma preferido. Os textos serão traduzidos instantaneamente.",
      "unlocked_toast": "Desbloqueado permanentemente!"
    },
    "fr": {
      "tab_all": "Tous",
      "tab_beach": "👙 Spéciaux VIP & Bikini (14)",
      "tab_choices": "🔀 Décisions (16)",
      "tab_chars": "👥 Personnages (12)",
      "tab_prologue": "Prologue & Acte I",
      "tab_routes": "Routes des Héroïnes",
      "tab_mystery": "Mystère & Boucle",
      "tab_endings": "Dénouements",
      "play_btn": "Jouer",
      "unlock_decision_btn": "Débloquer Décision (100 Pièces)",
      "unlock_special_btn": "Débloquer Spécial VIP ({n} Pièces)",
      "decision_badge": "Décision",
      "decision_unlocked": "Décision Débloquée",
      "vip_unlocked": "VIP Débloqué",
      "where_story_left": "📖 Où en était l'histoire ?",
      "on_scene": "En scène :",
      "choices_at_crossroad": "🔀 Choix à ce carrefour ({n}) :",
      "start_from_beginning": "Commencer le chapitre depuis le début",
      "title_exit": "◀ Quitter",
      "title_lang": "🌐 Langue",
      "title_chapters": "📂 Archives des Chapitres",
      "title_gallery": "🔞 Album Secret",
      "gallery_title": "Album Secret & Souvenirs VIP",
      "gallery_sub": "Illustrations exclusives haute résolution d'événements intimes et d'été.",
      "gallery_tab_all": "Tous (39)",
      "gallery_tab_beach": "👙 Plage & Bikini",
      "gallery_tab_romance": "💖 Romance & Rendez-vous",
      "gallery_tab_intimate": "🔞 Intime VIP",
      "gallery_save_btn": "Enregistrer dans la Galerie 📸💾",
      "backlog_title": "Historique des Dialogues",
      "coins_alert_title": "Pièces Insuffisantes",
      "coins_alert_desc": "Vous avez besoin d'au moins 100 pièces pour débloquer ce chapitre ou décision.",
      "get_coins_btn": "🛒 Obtenir des Pièces",
      "close_btn": "Fermer",
      "lang_modal_title": "Sélectionner la Langue",
      "lang_modal_sub": "Choisissez votre langue. Les textes seront traduits instantanément.",
      "unlocked_toast": "Débloqué en permanence !"
    },
    "de": {
      "tab_all": "Alle",
      "tab_beach": "👙 VIP & Bikini Specials (14)",
      "tab_choices": "🔀 Entscheidungen (16)",
      "tab_chars": "👥 Charaktere (12)",
      "tab_prologue": "Prolog & Akt I",
      "tab_routes": "Heldinnen-Routen",
      "tab_mystery": "Mysterium & Zeitschleife",
      "tab_endings": "Enden",
      "play_btn": "Spielen",
      "unlock_decision_btn": "Entscheidung freischalten (100 Münzen)",
      "unlock_special_btn": "VIP-Special freischalten ({n} Münzen)",
      "decision_badge": "Entscheidung",
      "decision_unlocked": "Entscheidung freigeschaltet",
      "vip_unlocked": "VIP freigeschaltet",
      "where_story_left": "📖 Wo die Geschichte stehen blieb",
      "on_scene": "In Szene:",
      "choices_at_crossroad": "🔀 Entscheidungen an dieser Weggabelung ({n}):",
      "start_from_beginning": "Kapitel von Anfang an starten",
      "title_exit": "◀ Beenden",
      "title_lang": "🌐 Sprache",
      "title_chapters": "📂 Kapitelarchiv",
      "title_gallery": "🔞 Geheimes Album",
      "gallery_title": "Geheimes Album & VIP-Erinnerungen",
      "gallery_sub": "Exklusive hochauflösende Illustrationen intimer Momente und Sommer am Strand.",
      "gallery_tab_all": "Alle (39)",
      "gallery_tab_beach": "👙 Strand & Bikini",
      "gallery_tab_romance": "💖 Romantik & Dates",
      "gallery_tab_intimate": "🔞 VIP Intim",
      "gallery_save_btn": "In Galerie speichern 📸💾",
      "backlog_title": "Dialogverlauf",
      "coins_alert_title": "Unzureichende Münzen",
      "coins_alert_desc": "Du benötigst mindestens 100 Münzen, um dieses Kapitel oder diese Entscheidung freizuschalten.",
      "get_coins_btn": "🛒 Münzen holen",
      "close_btn": "Schließen",
      "lang_modal_title": "Sprache wählen",
      "lang_modal_sub": "Wähle deine Sprache. Die Texte werden sofort übersetzt.",
      "unlocked_toast": "Dauerhaft freigeschaltet!"
    },
    "ru": {
      "tab_all": "Все",
      "tab_beach": "👙 VIP и бикини спешлы (14)",
      "tab_choices": "🔀 Решения (16)",
      "tab_chars": "👥 Персонажи (12)",
      "tab_prologue": "Пролог и Акт I",
      "tab_routes": "Маршруты героинь",
      "tab_mystery": "Тайна и петля времени",
      "tab_endings": "Финал и концовки",
      "play_btn": "Играть",
      "unlock_decision_btn": "Разблокировать решение (100 монет)",
      "unlock_special_btn": "Разблокировать VIP спешл ({n} монет)",
      "decision_badge": "Решение",
      "decision_unlocked": "Решение разблокировано",
      "vip_unlocked": "VIP разблокирован",
      "where_story_left": "📖 Где остановилась история?",
      "on_scene": "В сцене:",
      "choices_at_crossroad": "🔀 Варианты на этом перепутье ({n}):",
      "start_from_beginning": "Начать главу с начала",
      "title_exit": "◀ Выход",
      "title_lang": "🌐 Язык",
      "title_chapters": "📂 Архив глав",
      "title_gallery": "🔞 Секретный альбом",
      "gallery_title": "Секретный альбом и VIP воспоминания",
      "gallery_sub": "Эксклюзивные иллюстрации интимных моментов и пляжного лета в высоком разрешении.",
      "gallery_tab_all": "Все (39)",
      "gallery_tab_beach": "👙 Пляж и бикини",
      "gallery_tab_romance": "💖 Романтика и свидания",
      "gallery_tab_intimate": "🔞 VIP интим",
      "gallery_save_btn": "Сохранить в галерею 📸💾",
      "backlog_title": "История диалогов",
      "coins_alert_title": "Недостаточно монет",
      "coins_alert_desc": "Вам нужно как минимум 100 монет, чтобы разблокировать эту главу или решение.",
      "get_coins_btn": "🛒 Получить монеты",
      "close_btn": "Закрыть",
      "lang_modal_title": "Выбор языка",
      "lang_modal_sub": "Выберите язык. Тексты и диалоги обновятся мгновенно.",
      "unlocked_toast": "Разблокировано навсегда!"
    },
    "it": {
      "tab_all": "Tutti",
      "tab_beach": "👙 Speciali VIP & Bikini (14)",
      "tab_choices": "🔀 Decisioni (16)",
      "tab_chars": "👥 Personaggi (12)",
      "tab_prologue": "Prologo & Atto I",
      "tab_routes": "Rotte delle Eroine",
      "tab_mystery": "Mistero & Loop",
      "tab_endings": "Finali",
      "play_btn": "Gioca",
      "unlock_decision_btn": "Sblocca Decisione (100 Monete)",
      "unlock_special_btn": "Sblocca Speciale VIP ({n} Monete)",
      "decision_badge": "Decisione",
      "decision_unlocked": "Decisione Sbloccata",
      "vip_unlocked": "VIP Sbloccato",
      "where_story_left": "📖 Dove era rimasta la storia?",
      "on_scene": "In scena:",
      "choices_at_crossroad": "🔀 Scelte a questo bivio ({n}):",
      "start_from_beginning": "Inizia il capitolo dall'inizio",
      "title_exit": "◀ Esci",
      "title_lang": "🌐 Lingua",
      "title_chapters": "📂 Archivio Capitoli",
      "title_gallery": "🔞 Album Segreto",
      "gallery_title": "Album Segreto & Ricordi VIP",
      "gallery_sub": "Illustrazioni esclusive ad alta risoluzione di momenti intimi e spiaggia estiva.",
      "gallery_tab_all": "Tutti (39)",
      "gallery_tab_beach": "👙 Spiaggia & Bikini",
      "gallery_tab_romance": "💖 Romanticismo & Appuntamenti",
      "gallery_tab_intimate": "🔞 Intimo VIP",
      "gallery_save_btn": "Salva nella Galleria 📸💾",
      "backlog_title": "Cronologia Dialoghi",
      "coins_alert_title": "Monete Insufficienti",
      "coins_alert_desc": "Hai bisogno di almeno 100 monete per sbloccare questo capitolo o decisione.",
      "get_coins_btn": "🛒 Ottieni Monete",
      "close_btn": "Chiudi",
      "lang_modal_title": "Seleziona Lingua",
      "lang_modal_sub": "Scegli la tua lingua preferita. I testi verranno tradotti all'istante.",
      "unlocked_toast": "Sbloccato permanentemente!"
    },
    "ko": {
      "tab_all": "전체",
      "tab_beach": "👙 VIP & 비키니 스페셜 (14)",
      "tab_choices": "🔀 선택지 (16)",
      "tab_chars": "👥 등장인물 (12)",
      "tab_prologue": "프롤로그 & 1막",
      "tab_routes": "히로인 루트",
      "tab_mystery": "미스터리와 타임루프",
      "tab_endings": "엔딩",
      "play_btn": "플레이",
      "unlock_decision_btn": "선택지 해금 (100 코인)",
      "unlock_special_btn": "VIP 스페셜 해금 ({n} 코인)",
      "decision_badge": "선택",
      "decision_unlocked": "선택지 해금됨",
      "vip_unlocked": "VIP 해금됨",
      "where_story_left": "📖 이전 줄거리",
      "on_scene": "등장인물:",
      "choices_at_crossroad": "🔀 이 분기점에서의 선택지 ({n}):",
      "start_from_beginning": "챕터 처음부터 시작",
      "title_exit": "◀ 나가기",
      "title_lang": "🌐 언어",
      "title_chapters": "📂 챕터 아카이브",
      "title_gallery": "🔞 비밀 앨범",
      "gallery_title": "비밀 앨범 & VIP 추억",
      "gallery_sub": "은밀한 순간과 여름 해변의 고해상도 독점 일러스트.",
      "gallery_tab_all": "전체 (39)",
      "gallery_tab_beach": "👙 해변 & 비키니",
      "gallery_tab_romance": "💖 로맨스 & 데이트",
      "gallery_tab_intimate": "🔞 VIP 시크릿",
      "gallery_save_btn": "갤러리에 저장 📸💾",
      "backlog_title": "대화 기록",
      "coins_alert_title": "코인이 부족합니다",
      "coins_alert_desc": "이 챕터 또는 선택지를 해금하려면 최소 100 코인이 필요합니다.",
      "get_coins_btn": "🛒 코인 받기",
      "close_btn": "닫기",
      "lang_modal_title": "언어 선택",
      "lang_modal_sub": "선호하는 언어를 선택하면 텍스트가 즉시 번역됩니다.",
      "unlocked_toast": "영구적으로 해금되었습니다!"
    }
  };

  function getUiText(key, fallback) {
    if (state.localeData && state.localeData.ui && state.localeData.ui[key]) {
      return state.localeData.ui[key];
    }
    var l = activeLang || "es";
    if (DICTIONARY_UI[l] && DICTIONARY_UI[l][key]) {
      return DICTIONARY_UI[l][key];
    }
    if (DICTIONARY_UI["en"] && DICTIONARY_UI["en"][key]) {
      return DICTIONARY_UI["en"][key];
    }
    if (DICTIONARY_UI["es"] && DICTIONARY_UI["es"][key]) {
      return DICTIONARY_UI["es"][key];
    }
    return fallback !== undefined ? fallback : key;
  }


  function getText(node) {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node === "object") {
      var val = node[activeLang] || node["es"] || node["en"] || Object.values(node)[0] || "";
      if (typeof val === "object") return getText(val);
      return String(val || "");
    }
    return String(node);
  }

  function ensureString(val) {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") return getText(val);
    return String(val);
  }

  var state = {
    story: null,
    localeData: null,
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
      fxCanvas, bgLayer, bloodLayer, screenCrack, pauseMenu, endingScreen,
      titleScreen, btnStartAdventure, btnContinueAdventure, btnTitleExit,
      btnTitleAddCoins, titleCoinsNum, hudCoinsVal, coinsAlertModal,
      btnGetMoreCoins, btnCloseCoinsAlert, creditsScreen, creditsScrollContainer,
      creditsTitle, creditsEpilogueText, creditsUnresolvedBlock, btnSkipCredits,
      endingCardPanel, endingCardTitle, endingCardSummary, btnReadAgain, btnEndingExit,
      chaptersModal, chaptersGrid, btnCloseChapters, btnPauseChapters, btnTitleChapters,
      btnAuto, btnLog, btnCgsHud, btnTitleGallery,
      backlogModal, backlogContent, btnCloseBacklog,
      cgsGalleryModal, cgsGrid, btnCloseCgsGallery,
      cgsFullscreenViewer, cgViewerImg, cgViewerTitle, btnCloseCgViewer, btnCgSaveGallery;

  // ---- Audio global ----
  var currentBgm = null;

  function bridge(method, payload) {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge[method] === "function") {
        if (payload !== undefined) {
          return window.AndroidBridge[method](payload);
        } else {
          return window.AndroidBridge[method]();
        }
      }
    } catch (e) {}
  }

  function log(msg) { try { console.log("[HP] " + msg); } catch (e) {} }

  // ============================================================
  //  SISTEMA DE MONEDAS
  // ============================================================
  function getCoins() {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.getCoins === "function") {
        return window.AndroidBridge.getCoins();
      }
    } catch (e) {}
    return 9900;
  }

  function updateCoinsDisplay() {
    var c = getCoins();
    if (titleCoinsNum) titleCoinsNum.textContent = String(c);
    if (hudCoinsVal) hudCoinsVal.textContent = String(c);
    return c;
  }

  function spendCoins(amount) {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.spendCoins === "function") {
        var ok = window.AndroidBridge.spendCoins(amount);
        updateCoinsDisplay();
        return ok;
      }
    } catch (e) {}
    updateCoinsDisplay();
    return true; // Modo navegador
  }

  function showCoinsStore() {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.showCoinsStore === "function") {
        window.AndroidBridge.showCoinsStore();
        return;
      }
    } catch (e) {}
    flashToast("🪙 Tienda de monedas");
  }

  function showCoinsAlert() {
    if (coinsAlertModal) coinsAlertModal.classList.remove("hidden");
  }

  function hideCoinsAlert() {
    if (coinsAlertModal) coinsAlertModal.classList.add("hidden");
  }

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

    // Portada promocional y monedas
    titleScreen = $("title-screen");
    btnStartAdventure = $("btn-start-adventure");
    btnContinueAdventure = $("btn-continue-adventure");
    btnTitleExit = $("btn-title-exit");
    btnTitleAddCoins = $("btn-title-add-coins");
    titleCoinsNum = $("title-coins-num");
    hudCoinsVal = $("hud-coins-val");
    coinsAlertModal = $("coins-alert-modal");
    btnGetMoreCoins = $("btn-get-more-coins");
    btnCloseCoinsAlert = $("btn-close-coins-alert");

    // Créditos y epílogo cinematográfico
    creditsScreen = $("credits-screen");
    creditsScrollContainer = $("credits-scroll-container");
    creditsTitle = $("credits-title");
    creditsEpilogueText = $("credits-epilogue-text");
    creditsUnresolvedBlock = $("credits-unresolved-block");
    btnSkipCredits = $("btn-skip-credits");
    endingCardPanel = $("ending-card-panel");
    endingCardTitle = $("ending-card-title");
    endingCardSummary = $("ending-card-summary");
    btnReadAgain = $("btn-read-again");
    btnEndingExit = $("btn-ending-exit");

    // Modal de Archivo de Capítulos
    chaptersModal = $("chapters-modal");
    chaptersGrid = $("chapters-grid");
    btnCloseChapters = $("btn-close-chapters");
    btnPauseChapters = $("btn-pause-chapters");
    btnTitleChapters = $("btn-title-chapters");

    // Controles HUD Modernos & Galería VIP
    btnAuto = $("btn-auto");
    btnLog = $("btn-log");
    btnCgsHud = $("btn-cgs-hud");
    btnTitleGallery = $("btn-title-gallery");
    backlogModal = $("backlog-modal");
    backlogContent = $("backlog-content");
    btnCloseBacklog = $("btn-close-backlog");
    cgsGalleryModal = $("cgs-gallery-modal");
    cgsGrid = $("cgs-grid");
    btnCloseCgsGallery = $("btn-close-cgs-gallery");
    cgsFullscreenViewer = $("cgs-fullscreen-viewer");
    cgViewerImg = $("cg-viewer-img");
    cgViewerTitle = $("cg-viewer-title");
    btnCloseCgViewer = $("btn-close-cg-viewer");
    btnCgSaveGallery = $("btn-cg-save-gallery");

    // Detectar idioma antes de cargar
    detectLang();

    // Eventos Portada Promocional con Bloqueo de 100 Monedas
    if (btnStartAdventure) {
      btnStartAdventure.addEventListener("click", function () {
        tryStartAdventure(true, "act1_yamaku_gate");
      });
    }
    var btnTitlePrologue = $("btn-title-prologue");
    if (btnTitlePrologue) {
      btnTitlePrologue.addEventListener("click", function () {
        if (!isNovelAccessUnlocked()) {
          flashToast("🔒 Debes desbloquear la novela (100 🪙) para ver el Prólogo.");
          promptUnlockNovel(function () { tryStartAdventure(true, "start"); });
          return;
        }
        tryStartAdventure(true, "start");
      });
    }
    if (btnContinueAdventure) {
      btnContinueAdventure.addEventListener("click", function () {
        tryContinueAdventure();
      });
    }
    if (btnTitleChapters) {
      btnTitleChapters.addEventListener("click", function () {
        if (!isNovelAccessUnlocked()) {
          flashToast("🔒 Debes desbloquear la novela (100 🪙) para acceder al Archivo.");
          promptUnlockNovel(function () { openChaptersModal(); });
          return;
        }
        openChaptersModal();
      });
    }
    var btnTitleGallery = $("btn-title-gallery");
    if (btnTitleGallery) {
      btnTitleGallery.addEventListener("click", function () {
        if (!isNovelAccessUnlocked()) {
          flashToast("🔒 Debes desbloquear la novela (100 🪙) para acceder al Álbum.");
          promptUnlockNovel(function () { openCgsGallery(); });
          return;
        }
        openCgsGallery();
      });
    }

    var btnTitleLang = $("btn-title-lang");
    if (btnTitleLang) {
      btnTitleLang.addEventListener("click", openLanguageModal);
    }
    var btnCloseLang = $("btn-close-language");
    if (btnCloseLang) {
      btnCloseLang.addEventListener("click", closeLanguageModal);
    }

    updateTitleScreenLockState();
    syncRemoteChapterCosts();
    if (btnTitleExit) {
      btnTitleExit.addEventListener("click", function () { bridge("exit"); });
    }
    if (btnTitleAddCoins) {
      btnTitleAddCoins.addEventListener("click", showCoinsStore);
    }
    if (btnGetMoreCoins) {
      btnGetMoreCoins.addEventListener("click", function () {
        hideCoinsAlert();
        showCoinsStore();
      });
    }
    if (btnCloseCoinsAlert) {
      btnCloseCoinsAlert.addEventListener("click", hideCoinsAlert);
    }

    // Eventos Archivo de Capítulos
    if (btnCloseChapters) {
      btnCloseChapters.addEventListener("click", closeChaptersModal);
    }
    if (btnPauseChapters) {
      btnPauseChapters.addEventListener("click", function () {
        if (pauseMenu) pauseMenu.classList.add("hidden");
        openChaptersModal();
      });
    }
    var btnChaptersHud = $("btn-chapters-hud");
    if (btnChaptersHud) {
      btnChaptersHud.addEventListener("click", function () {
        openChaptersModal();
      });
    }
    if (chapterLabel) {
      chapterLabel.style.cursor = "pointer";
      chapterLabel.title = "Ver Archivo de Capítulos";
      chapterLabel.addEventListener("click", function () {
        openChaptersModal();
      });
    }

    // Pestañas de Filtro de Capítulos
    var currentChaptersFilter = "all";
    var currentCgFilter = "all";
    var filterTabs = document.querySelectorAll(".filter-tab");
    if (filterTabs && filterTabs.length) {
      filterTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          filterTabs.forEach(function (t) { t.classList.remove("active"); });
          tab.classList.add("active");
          var f = tab.getAttribute("data-filter");
          currentChaptersFilter = f;
          renderChaptersList(f);
        });
      });
    }

    // Pestañas de Filtro del Álbum Secreto
    var cgTabs = document.querySelectorAll(".cg-filter-tab");
    if (cgTabs && cgTabs.length) {
      cgTabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          cgTabs.forEach(function (t) { t.classList.remove("active"); });
          tab.classList.add("active");
          var f = tab.getAttribute("data-cg-filter");
          currentCgFilter = f;
          renderCgsGallery(f);
        });
      });
    }


    // Eventos Créditos & Final
    if (btnSkipCredits) {
      btnSkipCredits.addEventListener("click", skipCredits);
    }
    var btnShowEndingCard = $("btn-show-ending-card");
    if (btnShowEndingCard) {
      btnShowEndingCard.addEventListener("click", showEndingCard);
    }
    if (btnReadAgain) {
      btnReadAgain.addEventListener("click", function () { tryStartAdventure(true); });
    }
    if (btnEndingExit) {
      btnEndingExit.addEventListener("click", function () { bridge("exit"); });
    }
    if (creditsScrollContainer) {
      creditsScrollContainer.addEventListener("touchstart", stopCreditsAutoScroll, { passive: true });
      creditsScrollContainer.addEventListener("mousedown", stopCreditsAutoScroll);
    }

    // Click/tap en cualquier parte de la pantalla para avanzar cómodamente
    gameEl.addEventListener("click", function (e) {
      if (e.target.closest("#choices-box") || e.target.closest("#hud-top") || e.target.closest(".overlay")) return;
      advance();
    });

    // HUD
    $("btn-menu").addEventListener("click", function () { toggleOverlay("pause-menu", true); });
    $("btn-skip").addEventListener("click", function () {
      state.skipRequested = true;
      setTimeout(function () { state.skipRequested = false; }, 5000);
      advance();
    });

    if (btnAuto) btnAuto.addEventListener("click", toggleAutoMode);
    if (btnLog) btnLog.addEventListener("click", openBacklogModal);
    if (btnCloseBacklog) btnCloseBacklog.addEventListener("click", closeBacklogModal);
    if (btnCgsHud) btnCgsHud.addEventListener("click", openCgsGallery);
    if (btnTitleGallery) btnTitleGallery.addEventListener("click", openCgsGallery);
    if (btnCloseCgsGallery) btnCloseCgsGallery.addEventListener("click", closeCgsGallery);
    if (btnCloseCgViewer) btnCloseCgViewer.addEventListener("click", closeCgViewer);
    if (btnCgSaveGallery) btnCgSaveGallery.addEventListener("click", saveActiveCgToDevice);

    // Inicializar sistema de partículas acelerado por GPU (HTML5 Canvas 60 FPS)
    initParticlesCanvas();

    // Menú pausa
    document.querySelectorAll(".menu-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { handleMenuAction(btn.getAttribute("data-action")); });
    });

    loadStory();
  }

  // ============================================================
  //  CARGA story.json & LOCALES DINÁMICOS
  // ============================================================
  function loadStory() {
    $("loading-text").textContent = "Cargando historia…";
    fetchStory(LOCAL_BASE + "story.json", false)
      .catch(function () {
        $("loading-text").textContent = "Cargando versión remota…";
        return fetchStory(REMOTE_BASE + "story.json", true);
      })
      .then(function (story) {
        state.story = story;
        state.base = LOCAL_BASE;
        applyAssetPaths(story);
        return loadLocale(activeLang);
      })
      .then(function () {
        applyUiTranslations();
        showTitleScreen();
      })
      .catch(function (err) {
        log("Error cargando historia o idioma: " + err);
        applyUiTranslations();
        showTitleScreen();
      });
  }

  function loadLocale(lang) {
    var code = normalizeLangCode(lang || activeLang || "es");

    // 1. Cargar instantáneamente vía AndroidBridge si está disponible (0ms, 100% offline, sin errores de CORS)
    if (window.AndroidBridge && typeof window.AndroidBridge.getLocaleJson === "function") {
      try {
        var rawJson = window.AndroidBridge.getLocaleJson(code);
        if (rawJson && rawJson.length > 10) {
          state.localeData = JSON.parse(rawJson);
          log("Locale cargado vía AndroidBridge: " + code);
          return Promise.resolve(state.localeData);
        }
      } catch (errBridge) {
        log("Aviso: fallo leyendo locale vía AndroidBridge: " + errBridge);
      }
    }

    // 2. Carga relativa (evita file:///android_asset absoluto que falla por CORS en WebView)
    var localUrl = "locales/" + code + ".json";
    var remoteUrl = REMOTE_BASE + "locales/" + code + ".json";

    return fetchJson(localUrl)
      .catch(function () {
        return fetchJson(remoteUrl);
      })
      .catch(function () {
        if (code !== "es") {
          return fetchJson("locales/es.json").catch(function () {
            return fetchJson(REMOTE_BASE + "locales/es.json");
          });
        }
        return null;
      })
      .then(function (data) {
        if (data) {
          state.localeData = data;
          log("Locale cargado: " + code);
        }
        return state.localeData;
      })
      .catch(function (e) {
        log("Aviso: fallback sin locale externo (" + code + "): " + e);
        return null;
      });
  }

  function fetchJson(url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = 8000;
      xhr.onload = function () {
        var status = xhr.status;
        var success = (status >= 200 && status < 300) || (status === 0 && url.indexOf("file:") === 0);
        if (success) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(e); }
        } else { reject(new Error("HTTP " + status)); }
      };
      xhr.onerror = function () { reject(new Error("network")); };
      xhr.ontimeout = function () { reject(new Error("timeout")); };
      xhr.send();
    });
  }

  function applyUiTranslations() {
    var ui = (state.localeData && state.localeData.ui) ? state.localeData.ui : {};

    // 1. Portada promocional
    if ($("title-novel-badge")) $("title-novel-badge").textContent = ui.badge || getUiText("badge", "NOVELA VISUAL MONUMENTAL");
    if ($("title-main-text")) $("title-main-text").textContent = ui.title || getUiText("title", "Caminos del Corazón");
    if ($("title-sub-text")) $("title-sub-text").textContent = ui.subtitle || getUiText("subtitle", "Las Sombras de Yamaku");
    if ($("title-desc")) $("title-desc").textContent = ui.desc || getUiText("desc", "Romance, misterio y terror psicológico en la colina de Yamaku");
    if ($("btn-adv-label")) $("btn-adv-label").textContent = ui.start_btn || "Comenzar Aventura (Desbloquear Lectura)";
    if ($("btn-cont-label")) $("btn-cont-label").textContent = ui.continue_btn || "Continuar partida";

    // HUD y botones de cabecera de la portada
    if ($("btn-title-exit")) $("btn-title-exit").textContent = getUiText("title_exit", "◀ Salir");
    if ($("btn-title-lang")) $("btn-title-lang").textContent = getUiText("title_lang", "🌐 Idioma");

    updateTitleScreenLockState();

    // 2. Menú de pausa
    if ($("pause-title")) $("pause-title").textContent = ui.pause_title || getUiText("pause_title", "Pausa");
    if ($("btn-pause-resume")) $("btn-pause-resume").textContent = "▶ " + (ui.pause_resume || getUiText("pause_resume", "Continuar"));
    if ($("btn-pause-cgs")) $("btn-pause-cgs").textContent = "🔞 " + getUiText("title_gallery", "Álbum Secreto VIP");
    if ($("btn-pause-chapters")) $("btn-pause-chapters").textContent = "📂 " + (ui.pause_chapters || getUiText("title_chapters", "Archivo de Capítulos"));
    if ($("btn-pause-log")) $("btn-pause-log").textContent = "📜 " + getUiText("backlog_title", "Historial de Diálogos");
    if ($("btn-pause-save")) $("btn-pause-save").textContent = "💾 " + (ui.pause_save || getUiText("pause_save", "Guardar partida"));
    if ($("btn-pause-load")) $("btn-pause-load").textContent = "📂 " + (ui.pause_load || getUiText("pause_load", "Cargar partida"));
    if ($("btn-pause-lang")) $("btn-pause-lang").textContent = "🌐 " + getUiText("title_lang", "Idioma / Language");
    if ($("btn-pause-title")) $("btn-pause-title").textContent = "🏠 " + (ui.pause_title_screen || getUiText("pause_title_screen", "Pantalla de título"));
    if ($("btn-pause-exit")) $("btn-pause-exit").textContent = "✖ " + (ui.pause_exit || getUiText("pause_exit", "Salir al menú"));

    // 3. Modal Archivo de Capítulos
    if ($("chapters-title-text")) $("chapters-title-text").textContent = ui.chapters_title || getUiText("chapters_title", "Archivo de Capítulos & Rutas");

    var tabAll = document.querySelector('.filter-tab[data-filter="all"]');
    if (tabAll) tabAll.textContent = getUiText("tab_all", "Todos");
    var tabBeach = document.querySelector('.filter-tab[data-filter="beach"]');
    if (tabBeach) tabBeach.textContent = getUiText("tab_beach", "👙 Especiales VIP & Bikini (14)");
    var tabChoices = document.querySelector('.filter-tab[data-filter="choices"]');
    if (tabChoices) tabChoices.textContent = getUiText("tab_choices", "🔀 Decisiones (16)");
    var tabChars = document.querySelector('.filter-tab[data-filter="chars"]');
    if (tabChars) tabChars.textContent = getUiText("tab_chars", "👥 Personajes (12)");
    var tabPrologue = document.querySelector('.filter-tab[data-filter="prologue"]');
    if (tabPrologue) tabPrologue.textContent = getUiText("tab_prologue", "Prólogo & Acto I");
    var tabRoutes = document.querySelector('.filter-tab[data-filter="routes"]');
    if (tabRoutes) tabRoutes.textContent = getUiText("tab_routes", "Rutas Heroínas");
    var tabMystery = document.querySelector('.filter-tab[data-filter="mystery"]');
    if (tabMystery) tabMystery.textContent = getUiText("tab_mystery", "Misterio & Bucle");
    var tabEndings = document.querySelector('.filter-tab[data-filter="endings"]');
    if (tabEndings) tabEndings.textContent = getUiText("tab_endings", "Desenlaces");

    // 4. Modal Álbum Secreto / Galería Ecchi VIP
    var cgHeader = document.querySelector(".cgs-gallery-header-title h3");
    if (cgHeader) cgHeader.textContent = getUiText("gallery_title", "Archivos y Secretos VIP (20 🪙)");
    var cgSubtitle = document.querySelector(".cgs-gallery-subtitle");
    if (cgSubtitle) cgSubtitle.textContent = getUiText("gallery_sub", "Colección VIP de ilustraciones exclusivas, cinemáticas anime y videos de eventos de Yamaku.");
    var cgTabAll = document.querySelector('.cg-filter-tab[data-cg-filter="all"]');
    if (cgTabAll) cgTabAll.textContent = getUiText("gallery_tab_all", "Todos");
    var cgTabVideos = document.querySelector('.cg-filter-tab[data-cg-filter="videos"]');
    if (cgTabVideos) cgTabVideos.textContent = getUiText("gallery_tab_videos", "🎬 Videos & Cinemáticas");
    var cgTabBeach = document.querySelector('.cg-filter-tab[data-cg-filter="beach"]');
    if (cgTabBeach) cgTabBeach.textContent = getUiText("gallery_tab_beach", "👙 Playa & Bikini");
    var cgTabRomance = document.querySelector('.cg-filter-tab[data-cg-filter="romance"]');
    if (cgTabRomance) cgTabRomance.textContent = getUiText("gallery_tab_romance", "💖 Romance & Citas");
    var cgTabIntimate = document.querySelector('.cg-filter-tab[data-cg-filter="intimate"]');
    if (cgTabIntimate) cgTabIntimate.textContent = getUiText("gallery_tab_intimate", "🔞 Íntimos VIP");
    if ($("btn-cg-save-gallery")) $("btn-cg-save-gallery").textContent = getUiText("gallery_save_btn", "Guardar en Galería 📸💾");

    // 5. Modal Historial (Backlog)
    var backlogTitle = document.querySelector(".backlog-header-title h3");
    if (backlogTitle) backlogTitle.textContent = getUiText("backlog_title", "Historial de Diálogos");

    // 6. Modal Alerta Monedas
    if ($("coins-alert-title")) $("coins-alert-title").textContent = ui.coins_insufficient_title || getUiText("coins_alert_title", "Monedas Insuficientes");
    if ($("coins-alert-desc")) $("coins-alert-desc").innerHTML = ui.coins_insufficient_desc || getUiText("coins_alert_desc", "Necesitas al menos 100 monedas para desbloquear la lectura completa o el capítulo especial.");
    if ($("btn-get-more-coins-label")) $("btn-get-more-coins-label").textContent = ui.get_coins_btn || getUiText("get_coins_btn", "🛒 Conseguir Monedas");
    if ($("btn-close-coins-alert")) $("btn-close-coins-alert").textContent = ui.close_btn || getUiText("close_btn", "Cerrar");

    // 7. Modal Selector Idioma
    if ($("language-modal-title")) $("language-modal-title").textContent = getUiText("lang_modal_title", "Seleccionar Idioma / Select Language");
    var langSub = document.querySelector("#language-modal p");
    if (langSub) langSub.textContent = getUiText("lang_modal_sub", "Elige tu idioma preferido. Los textos y diálogos se traducirán al instante.");

    // 8. Pantalla de créditos y epílogo
    if ($("btn-skip-credits") && ui.skip_credits) $("btn-skip-credits").textContent = ui.skip_credits;
    if ($("credits-header-badge") && ui.credits_header) $("credits-header-badge").textContent = ui.credits_header;
    if ($("staff-role-story") && ui.credits_staff_story) $("staff-role-story").textContent = ui.credits_staff_story;
    if ($("staff-role-insp") && ui.credits_staff_insp) $("staff-role-insp").textContent = ui.credits_staff_insp;
    if ($("staff-role-music") && ui.credits_staff_music) $("staff-role-music").textContent = ui.credits_staff_music;
    if ($("staff-role-cast") && ui.credits_staff_cast) $("staff-role-cast").textContent = ui.credits_staff_cast;
    if ($("staff-quote-text") && ui.credits_staff_quote) $("staff-quote-text").textContent = ui.credits_staff_quote;

    // 9. Modal final
    if ($("ending-card-title") && ui.ending_unlocked) $("ending-card-title").textContent = ui.ending_unlocked;
    if ($("btn-read-again-label") && ui.read_again) $("btn-read-again-label").textContent = ui.read_again;
    if ($("btn-ending-exit") && ui.main_menu) $("btn-ending-exit").textContent = "✖ " + ui.main_menu;
  }

  function fetchStory(url, isRemote) {
    return new Promise(function (resolve, reject) {
      log("Cargando: " + url);
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = 10000;
      xhr.onload = function () {
        var status = xhr.status;
        var success = (status >= 200 && status < 300) || (status === 0 && url.indexOf("file:") === 0);
        if (success) {
          try { var d = JSON.parse(xhr.responseText); d._local = !isRemote; resolve(d); }
          catch (e) { reject(e); }
        } else { reject(new Error("HTTP " + status)); }
      };
      xhr.onerror = function () { reject(new Error("network")); };
      xhr.ontimeout = function () { reject(new Error("timeout")); };
      xhr.send();
    });
  }

  function cleanPath(path) {
    if (!path) return "";
    var p = String(path).trim();
    if (p.indexOf("file:///android_asset/web/novel/") === 0) {
      p = p.substring("file:///android_asset/web/novel/".length);
    }
    return p;
  }

  function applyAssetPaths(story) {
    // Mantener rutas relativas puras (img/..., audio/...) para compatibilidad nativa en WebView
    if (story.scenes) {
      Object.keys(story.scenes).forEach(function (sid) {
        var sc = story.scenes[sid];
        if (sc.bg) sc.bg = cleanPath(sc.bg);
        if (sc.bgm) sc.bgm = cleanPath(sc.bgm);
        if (sc.ambience) sc.ambience = cleanPath(sc.ambience);
        if (sc.lines) sc.lines.forEach(function (ln) {
          if (ln.bg) ln.bg = cleanPath(ln.bg);
          if (ln.sprite) ln.sprite = cleanPath(ln.sprite);
          if (ln.sfx) ln.sfx = cleanPath(ln.sfx);
          if (ln.bgm) ln.bgm = cleanPath(ln.bgm);
          if (ln.ambience) ln.ambience = cleanPath(ln.ambience);
        });
      });
    }
  }

  // ============================================================
  //  ARRANQUE Y TRANSICIONES
  // ============================================================
  function showTitleScreen() {
    stopBgm();
    loadingScreen.classList.add("hidden");
    gameEl.classList.add("hidden");
    creditsScreen.classList.add("hidden");
    endingCardPanel.classList.add("hidden");
    titleScreen.classList.remove("hidden");
    titleScreen.classList.add("fade-in");
    updateCoinsDisplay();

    // Sonido ambiente tranquilo de bienvenida en la portada
    playAmbience("audio/ks_cicadas.ogg");

    var hasSave = checkHasSavedProgress();
    if (hasSave && btnContinueAdventure) {
      btnContinueAdventure.classList.remove("hidden");
    } else if (btnContinueAdventure) {
      btnContinueAdventure.classList.add("hidden");
    }
  }

  function checkHasSavedProgress() {
    try {
      var r = localStorage.getItem(SAVE_KEY);
      if (r) {
        var s = JSON.parse(r);
        return !!(s && s.sceneId && s.sceneId !== "start");
      }
    } catch (e) {}
    return false;
  }

  var NOVEL_UNLOCKED_KEY = "pocketgirl_novel_access_unlocked";

  function isNovelAccessUnlocked() {
    try {
      return localStorage.getItem(NOVEL_UNLOCKED_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function setNovelAccessUnlocked(val) {
    try {
      localStorage.setItem(NOVEL_UNLOCKED_KEY, val ? "true" : "false");
    } catch (e) {}
    updateTitleScreenLockState();
  }

  function updateTitleScreenLockState() {
    var unlocked = isNovelAccessUnlocked();
    var advBadge = $("btn-adv-badge");
    var btnChapters = $("btn-title-chapters");
    var btnGallery = $("btn-title-gallery");
    var btnPrologue = $("btn-title-prologue");

    var chTitleText = getUiText("title_chapters", "Archivo de Capítulos");
    var galTitleText = getUiText("title_gallery", "Álbum Secreto & Recuerdos VIP");
    var proTitleText = (state.localeData && state.localeData.ui && state.localeData.ui.prologue_btn) ? state.localeData.ui.prologue_btn : getUiText("prologue_btn", "Ver Prólogo: El Incidente en la Nieve");

    if (unlocked) {
      if (advBadge) advBadge.textContent = "✨ " + getUiText("unlocked_toast", "Desbloqueado");
      if (btnChapters) {
        btnChapters.classList.remove("btn-title-locked");
        var chLabel = $("btn-title-chapters-label");
        if (chLabel) chLabel.textContent = "📂 " + chTitleText;
      }
      if (btnGallery) {
        btnGallery.classList.remove("btn-title-locked");
        var galLabel = $("btn-title-gallery-label");
        if (galLabel) galLabel.textContent = "🔞 " + galTitleText;
      }
      if (btnPrologue) {
        btnPrologue.classList.remove("btn-title-locked");
        var proLabel = $("btn-title-prologue-label");
        if (proLabel) proLabel.textContent = "❄ " + proTitleText.replace(/^[❄🔒\s]+/, "");
      }
    } else {
      if (advBadge) advBadge.textContent = "100 🪙";
      if (btnChapters) {
        btnChapters.classList.add("btn-title-locked");
        var chLabel = $("btn-title-chapters-label");
        if (chLabel) chLabel.textContent = "🔒 " + chTitleText;
      }
      if (btnGallery) {
        btnGallery.classList.add("btn-title-locked");
        var galLabel = $("btn-title-gallery-label");
        if (galLabel) galLabel.textContent = "🔒 " + galTitleText;
      }
      if (btnPrologue) {
        btnPrologue.classList.add("btn-title-locked");
        var proLabel = $("btn-title-prologue-label");
        if (proLabel) proLabel.textContent = "🔒 " + proTitleText.replace(/^[❄🔒\s]+/, "");
      }
    }
  }

  function promptUnlockNovel(onSuccess) {
    var c = getCoins();
    if (c < 100) {
      showCoinsAlert();
      return false;
    }
    if (confirm("¿Desbloquear la lectura de la novela completa y todas sus funciones por 100 monedas?")) {
      if (spendCoins(100)) {
        setNovelAccessUnlocked(true);
        flashToast("🎉 ¡Novela y accesos desbloqueados con éxito!");
        if (typeof onSuccess === "function") onSuccess();
        return true;
      } else {
        showCoinsAlert();
      }
    }
    return false;
  }

  function tryStartAdventure(isNew, customStartScene) {
    if (!isNovelAccessUnlocked()) {
      var c = getCoins();
      if (c < 100) {
        showCoinsAlert();
        return;
      }
      var spent = spendCoins(100);
      if (!spent) {
        showCoinsAlert();
        return;
      }
      setNovelAccessUnlocked(true);
      flashToast("🎉 ¡Novela y accesos desbloqueados con éxito!");
    }
    if (isNew) {
      clearProgress();
      resetVars();
      state.sceneId = customStartScene || "start";
      state.lineIndex = 0;
    }
    startPlaying();
  }

  function tryContinueAdventure() {
    restoreProgress();
    startPlaying();
  }

  function startPlaying() {
    stopAmbience();
    stopBgm();
    titleScreen.classList.add("hidden");
    creditsScreen.classList.add("hidden");
    endingCardPanel.classList.add("hidden");
    gameEl.classList.remove("hidden");
    gameEl.classList.add("fade-in");
    updateCoinsDisplay();
    renderScene(state.lineIndex);
  }

  function startGame() {
    startPlaying();
  }

  // ============================================================
  //  PREFETCH INTELIGENTE Y LOOK-AHEAD PREDICTIVO (CDN / CACHE)
  // ============================================================
  function prefetchSceneAssets(sceneId) {
    if (!sceneId || !state.story || !state.story.scenes) return;
    var currentScene = state.story.scenes[sceneId];
    if (!currentScene) return;

    var assetsToFetch = [];

    function addAsset(raw) {
      if (!raw || typeof raw !== "string") return;
      var trimmed = raw.trim();
      if (!trimmed || trimmed === "none") return;
      var clean = cleanPath(trimmed);
      if (!clean) return;
      if (clean.indexOf("http") === 0 || clean.indexOf("data:") === 0) return;
      if (clean.indexOf("/") < 0) {
        var lower = clean.toLowerCase();
        if (lower.endsWith(".ogg") || lower.endsWith(".mp3") || lower.endsWith(".wav")) {
          clean = "audio/" + clean;
        } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif")) {
          clean = "img/" + clean;
        }
      }
      if (assetsToFetch.indexOf(clean) < 0) {
        assetsToFetch.push(clean);
      }
    }

    function collectFromScene(sc, maxLines) {
      if (!sc) return;
      if (sc.bg) addAsset(sc.bg);
      if (sc.bgm) addAsset(sc.bgm);
      if (sc.ambience) addAsset(sc.ambience);
      if (sc.sprite) addAsset(sc.sprite);
      if (sc.lines && sc.lines.length) {
        var limit = (typeof maxLines === "number") ? Math.min(maxLines, sc.lines.length) : sc.lines.length;
        for (var i = 0; i < limit; i++) {
          var ln = sc.lines[i];
          if (ln.bg) addAsset(ln.bg);
          if (ln.sprite) addAsset(ln.sprite);
          if (ln.sfx) addAsset(ln.sfx);
          if (ln.bgm) addAsset(ln.bgm);
          if (ln.ambience) addAsset(ln.ambience);
        }
      }
    }

    // 1. Recursos de la escena actual
    collectFromScene(currentScene);

    // 2. Look-Ahead predictivo: posibles escenas subsiguientes
    var nextSceneIds = [];
    if (typeof currentScene.next === "string") {
      nextSceneIds.push(currentScene.next);
    } else if (Array.isArray(currentScene.next)) {
      currentScene.next.forEach(function (n) {
        if (n && n.scene) nextSceneIds.push(n.scene);
      });
    }
    if (currentScene.choices && currentScene.choices.length) {
      currentScene.choices.forEach(function (c) {
        if (c && c.next) nextSceneIds.push(c.next);
      });
    }

    nextSceneIds.forEach(function (nid) {
      if (state.story.scenes[nid]) {
        collectFromScene(state.story.scenes[nid], 6);
      }
    });

    if (assetsToFetch.length > 0) {
      bridge("prefetchAssets", JSON.stringify(assetsToFetch));
    }
  }

  // ============================================================
  //  ESCENA
  // ============================================================
  function renderScene(initialLineIndex) {
    var scene = state.story.scenes[state.sceneId];
    if (!scene) {
      log("Scene not found: " + state.sceneId + ". Resetting to start.");
      state.sceneId = "start";
      scene = state.story.scenes[state.sceneId];
      if (!scene) { dialogText.textContent = "[Error: escena '" + state.sceneId + "']"; return; }
    }
    prefetchSceneAssets(state.sceneId);
    if (scene.ending && (!scene.lines || scene.lines.length === 0)) {
      showEnding(scene.ending);
      return;
    }
    var chapterText = "";
    if (state.localeData && state.localeData.chapters && state.localeData.chapters[state.sceneId]) {
      chapterText = ensureString(state.localeData.chapters[state.sceneId]);
    } else if (scene.chapter) {
      chapterText = ensureString(scene.chapter);
    } else if (state.localeData && state.localeData.ui && state.localeData.ui.title) {
      chapterText = ensureString(state.localeData.ui.title);
    } else {
      chapterText = ensureString(state.story.title) || "";
    }
    chapterLabel.textContent = ensureString(chapterText);
    if (scene.bg) setBackground(scene.bg, scene.bgEffect || "");
    if (scene.bgm) playBgm(scene.bgm);
    else if (scene.stopBgm) stopBgm();

    // Sonido ambiental: solo si la escena lo especifica explícitamente.
    // Si la escena no tiene ambiente definido, se detiene cualquier ambiente previo (como las cigarras de la portada).
    if (scene.ambience && scene.ambience !== "none" && scene.ambience !== "") {
      playAmbience(scene.ambience);
    } else {
      stopAmbience();
    }

    if (scene.mood) setMood(scene.mood);
    if (typeof initialLineIndex === "number" && initialLineIndex >= 0) {
      state.lineIndex = initialLineIndex;
    } else {
      state.lineIndex = 0;
    }
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
    var currentSprite = (ln.sprite !== undefined) ? ln.sprite : scene.sprite;
    var currentExpr = (ln.expr !== undefined) ? ln.expr : (ln.sprite !== undefined ? "neutral" : (scene.expr || "neutral"));
    if (currentSprite !== undefined) {
      setSprite(currentSprite, currentExpr);
    }
    if (ln.fx) applyEffect(ln.fx);
    if (ln.bgm) playBgm(ln.bgm);
    else if (ln.stopBgm) stopBgm();
    if (ln.ambience) playAmbience(ln.ambience);
    else if (ln.stopAmbience) stopAmbience();
    if (ln.sfx) playSfx(ln.sfx);
    if (ln.mood) setMood(ln.mood);
    // Variables
    if (ln.set) applySet(ln.set);
    // Texto
    var spk = ln.speaker || "";
    var isNarr = !spk || spk === "narrator" || spk === "extend";
    var localizedSpeaker = getLocalizedSpeaker(spk);
    showSpeaker(localizedSpeaker, spk);
    dialogBox.classList.toggle("narration", isNarr);
    dialogText.classList.toggle("thought", ln.style === "thought");
    dialogText.classList.toggle("fourth-wall", ln.style === "fourth-wall");
    // Typewriter: 40ms por char (lento para VN real)
    var speed = state.skipRequested ? 2 : (ln.speed || 40);
    var lineText = "";
    if (state.localeData && state.localeData.scenes && state.localeData.scenes[state.sceneId] && state.localeData.scenes[state.sceneId][state.lineIndex] !== undefined) {
      lineText = state.localeData.scenes[state.sceneId][state.lineIndex];
    } else {
      lineText = getText(ln.text);
    }
    
    // Registrar en el historial de diálogos (Backlog)
    recordBacklog(localizedSpeaker, lineText, spk);

    typeText(lineText, speed, function () {
      contInd.classList.remove("hidden");
      if (state.autoMode) {
        scheduleAutoAdvance();
      }
    });
  }

  function advance() {
    clearTimeout(autoTimer);
    if (state.typing) {
      state.typing = false;
      if (charImg) charImg.classList.remove("lip-sync-talking");
      dialogText.textContent = state.fullText || dialogText.textContent;
      contInd.classList.remove("hidden");
      if (state.autoMode) {
        scheduleAutoAdvance();
      }
      return;
    }
    contInd.classList.add("hidden");
    var scene = state.story.scenes[state.sceneId];
    if (!scene || !scene.lines) return;
    if (state.lineIndex >= scene.lines.length - 1) {
      if (scene.ending) {
        showEnding(scene.ending);
        return;
      }
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
      var origChoiceText = getText(c.text);
      var choiceText = origChoiceText;
      if (state.localeData && state.localeData.choices && state.localeData.choices[origChoiceText]) {
        choiceText = state.localeData.choices[origChoiceText];
      }
      btn.innerHTML = choiceText + (c.hint ? '<span class="hint">' + getText(c.hint) + '</span>' : "");
      btn.addEventListener("click", function () {
        if (c.set) applySet(c.set);
        if (c.sfx) playSfx(c.sfx);
        if (c.fx) applyEffect(c.fx);
        choicesBox.classList.add("hidden");
        // Mostrar anuncio intersticial de Appodeal al seleccionar opción
        try { if (window.AndroidBridge) window.AndroidBridge.showInterstitial(); } catch (e) {}
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
  function goToScene(sid, initialLine) {
    var nextLine = (typeof initialLine === "number" && initialLine >= 0) ? initialLine : 0;
    state.lineIndex = nextLine;
    if (Array.isArray(sid)) {
      for (var i = 0; i < sid.length; i++) {
        if (sid[i]["if"] && evalCond(sid[i]["if"])) {
          state.sceneId = sid[i].scene;
          clearSprite();
          renderScene(nextLine);
          return;
        }
      }
      var fb = sid.filter(function (s) { return !s["if"]; })[0];
      if (fb) {
        state.sceneId = fb.scene;
        clearSprite();
        renderScene(nextLine);
      }
      return;
    }
    state.sceneId = sid;
    clearSprite();
    renderScene(nextLine);
  }

  // ============================================================
  //  VISUALES
  // ============================================================
  // ============================================================
  //  VISUALES
  // ============================================================
    function checkAutoUnlockCg(path) {
    if (!path) return;
    var clean = path.replace(/\\/g, "/");
    CGS_CATALOGUE.forEach(function (cg) {
      if (clean.indexOf(cg.file) >= 0) {
        if (!isCgUnlocked(cg.id)) {
          unlockCg(cg.id, false);
          flashToast("🎉 ¡Ilustración Desbloqueada: " + cg.title + "!");
        }
      }
    });
  }

  function setBackground(path, effect) {
    if (!path) return;
    var resolved = cleanPath(path);
    if (!resolved) return;
    
    // Asignar fondo mediante img nativo con fallback bidireccional ks_ y a prueba de fallos
    bgImg.onerror = function () {
      console.warn("Fondo no cargado directamente: " + resolved + ", intentando variante ks/no-ks");
      var fn = resolved.substring(resolved.lastIndexOf("/") + 1);
      if (fn.indexOf("ks_") === 0) {
        var alt = "img/" + fn.substring(3);
        if (bgImg.src.indexOf(alt) < 0) { bgImg.src = alt; return; }
      } else {
        var alt = "img/ks_" + fn;
        if (bgImg.src.indexOf(alt) < 0) { bgImg.src = alt; return; }
      }
      bgImg.src = "img/courtyard.jpg";
    };
    bgImg.src = resolved;
    checkAutoUnlockCg(resolved);
    bgImg.classList.remove("fade");
    bgLayer.style.backgroundColor = "#050507";
    
    if (effect === "vignette" || effect === "tension") {
      bgLayer.classList.add("vignette");
    } else {
      bgLayer.classList.remove("vignette");
    }
  }

  function resolveFallbackSprite(path) {
    var raw = (path || "").toLowerCase();
    if (raw.indexOf("sora") >= 0 || raw.indexOf("emi") >= 0) return "img/sora_annoyed.png";
    if (raw.indexOf("aiko") >= 0 || raw.indexOf("rin") >= 0) return "img/aiko_normal.png";
    if (raw.indexOf("yumi") >= 0 || raw.indexOf("hanako") >= 0) return "img/yumi_bashful.png";
    if (raw.indexOf("elena") >= 0 || raw.indexOf("lilly") >= 0) return "img/elena_basic_smile.png";
    if (raw.indexOf("shizu") >= 0) return "img/shizu_basic_normal.png";
    if (raw.indexOf("misha") >= 0 || raw.indexOf("shiina") >= 0) return "img/shiina_perky_smile.png";
    if (raw.indexOf("kenji") >= 0) return "img/kenji_neutral.png";
    if (raw.indexOf("yuuko") >= 0) return "img/yuuko_neutral_down.png";
    if (raw.indexOf("nurse") >= 0) return "img/nurse_concern.png";
    return "";
  }

  function setSprite(path, expr) {
    if (!path || path === "none" || path === "") { clearSprite(); return; }
    var resolved = cleanPath(path);
    if (!resolved) { clearSprite(); return; }

    charImg.className = "";
    charImg.style.display = "block";
    charImg.onerror = function () {
      console.warn("Sprite no encontrado: " + resolved + ", probando variante ks/no-ks");
      var fn = resolved.substring(resolved.lastIndexOf("/") + 1);
      if (fn.indexOf("ks_") === 0) {
        var alt = "img/" + fn.substring(3);
        if (charImg.src.indexOf(alt) < 0) { charImg.src = alt; return; }
      } else {
        var alt = "img/ks_" + fn;
        if (charImg.src.indexOf(alt) < 0) { charImg.src = alt; return; }
      }
      var fallback = resolveFallbackSprite(resolved);
      if (fallback && fallback !== resolved) {
        charImg.src = fallback;
      }
    };
    charImg.src = resolved;
    charImg.classList.remove("fade");
    if (expr) charImg.classList.add("expr-" + expr);
  }

  function clearSprite() {
    charImg.className = "";
    charImg.style.display = "none";
    charImg.src = "";
  }

  function applyEffect(fx) {
    // Limpiar TODO
    document.body.classList.remove("glitch", "flash-red", "tremor", "blackout",
      "static-noise", "warmth", "fog", "heartbeat", "jumpscare", "rain-fx", "lightning-flash");
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
      case "lightning":
      case "flash-white":
        document.body.classList.add("lightning-flash");
        setTimeout(function () { document.body.classList.remove("lightning-flash"); }, 300);
        break;
      case "rain":
        document.body.classList.add("rain-fx");
        spawnParticles("rain");
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
    if (mood === "romance") spawnParticles("sparkles");
    else if (mood === "calm") spawnParticles("sakura");
    else if (mood === "horror" || mood === "fear") spawnParticles("none");
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
    if (charImg && charImg.style.display !== "none" && charImg.classList.contains("speaker-active")) {
      charImg.classList.add("lip-sync-talking");
    }
    var i = 0;
    function step() {
      if (!state.typing) {
        if (charImg) charImg.classList.remove("lip-sync-talking");
        return;
      }
      if (i >= text.length) {
        state.typing = false;
        if (charImg) charImg.classList.remove("lip-sync-talking");
        if (done) done();
        return;
      }
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

  var CANONICAL_SPEAKERS = {
    "emi": "Sora", "emi_": "Sora",
    "rin": "Aiko",
    "hh": "Yumi", "hx": "Yumi", "hx_": "Yumi",
    "li_": "Elena",
    "mu": "Prof. Mutou",
    "n": "Enfermero",
    "no_": "Prof. Nomiya",
    "ssh": "Shizune",
    "yu_": "Yuuko",
    "his": "Hisao",
    "mk": "Miki",
    "sa": "Sra. Satou"
  };

  function getLocalizedSpeaker(name) {
    if (!name || name === "narrator" || name === "extend") return "";
    var canon = CANONICAL_SPEAKERS[name] || name;
    if (state.localeData && state.localeData.speakers) {
      if (state.localeData.speakers[name]) return state.localeData.speakers[name];
      if (state.localeData.speakers[canon]) return state.localeData.speakers[canon];
    }
    return canon;
  }

  function showSpeaker(localizedName, rawSpeaker) {
    if (dialogBox) {
      dialogBox.classList.remove("border-elena", "border-sora", "border-yumi", "border-aiko", "border-shizune");
    }

    if (!localizedName || rawSpeaker === "narrator" || rawSpeaker === "extend" || !rawSpeaker) {
      speakerBox.className = "hidden";
      speakerBox.textContent = "";
      if (charImg) {
        charImg.classList.remove("speaker-active", "speaker-listening", "lip-sync-talking");
      }
      return;
    }

    var canon = CANONICAL_SPEAKERS[rawSpeaker] || rawSpeaker;
    var isProtagonist = (rawSpeaker === "his" || rawSpeaker === "Hisao" || canon === "Hisao" || (localizedName && localizedName.toLowerCase() === "hisao"));
    var hasSprite = charImg && charImg.style.display !== "none" && charImg.getAttribute("src") && charImg.getAttribute("src").length > 0;

    // Reactividad de bordes de caja de diálogo según heroína
    var lowerRaw = (rawSpeaker || "").toLowerCase();
    var lowerLoc = (localizedName || "").toLowerCase();
    if (dialogBox) {
      if (lowerRaw.indexOf("sora") >= 0 || lowerRaw.indexOf("emi") >= 0 || lowerLoc.indexOf("sora") >= 0) {
        dialogBox.classList.add("border-sora");
      } else if (lowerRaw.indexOf("elena") >= 0 || lowerRaw.indexOf("li_") >= 0 || lowerLoc.indexOf("elena") >= 0) {
        dialogBox.classList.add("border-elena");
      } else if (lowerRaw.indexOf("yumi") >= 0 || lowerRaw.indexOf("hx") >= 0 || lowerLoc.indexOf("yumi") >= 0) {
        dialogBox.classList.add("border-yumi");
      } else if (lowerRaw.indexOf("aiko") >= 0 || lowerRaw.indexOf("rin") >= 0 || lowerLoc.indexOf("aiko") >= 0) {
        dialogBox.classList.add("border-aiko");
      } else if (lowerRaw.indexOf("shiz") >= 0 || lowerLoc.indexOf("shizune") >= 0) {
        dialogBox.classList.add("border-shizune");
      }
    }

    if (isProtagonist) {
      // Protagonista (El jugador)
      var youLabel = (activeLang === "es") ? "👤 Tú (Hisao)" : ((activeLang === "en") ? "👤 You (Hisao)" : ("👤 " + localizedName));
      speakerBox.textContent = youLabel;
      speakerBox.className = "speaker-protagonist";
      speakerBox.classList.remove("hidden");

      // Si hay una chica en pantalla, atenuarla para indicar que está escuchando
      if (hasSprite) {
        charImg.classList.add("speaker-listening");
        charImg.classList.remove("speaker-active", "lip-sync-talking");
      }
    } else {
      // Coprotagonista o personaje secundario
      if (hasSprite) {
        // Personaje visible en pantalla: resaltar e iluminar
        speakerBox.textContent = "✨ " + localizedName;
        speakerBox.className = "speaker-heroine";
        speakerBox.classList.remove("hidden");
        charImg.classList.add("speaker-active");
        charImg.classList.remove("speaker-listening");
      } else {
        // Habla fuera de pantalla (voz en off o distancia)
        var offLabel = (activeLang === "es") ? "📢 " + localizedName + " (Voz en off)" : ("📢 " + localizedName);
        speakerBox.textContent = offLabel;
        speakerBox.className = "speaker-offscreen";
        speakerBox.classList.remove("hidden");
        if (charImg) {
          charImg.classList.remove("speaker-active", "speaker-listening", "lip-sync-talking");
        }
      }
    }
  }

  // ============================================================
  //  AUDIO
  // ============================================================
  var currentBgmAudio = null;
  var currentBgmTrack = null;

  function playBgm(path) {
    if (!path) return;
    var p = cleanPath(path);
    bridge("playBgm", p);
    if (!window.AndroidBridge) {
      if (currentBgmTrack === p) return;
      if (currentBgmAudio) { try { currentBgmAudio.pause(); } catch (e) {} }
      try {
        var a = new Audio(p);
        a.loop = true;
        a.volume = 0.40;
        a.play().catch(function () {});
        currentBgmAudio = a;
        currentBgmTrack = p;
      } catch (e) {}
    }
  }

  function stopBgm() {
    bridge("stopBgm");
    if (currentBgmAudio) { try { currentBgmAudio.pause(); } catch (e) {} currentBgmAudio = null; currentBgmTrack = null; }
  }

  var currentAmbienceAudio = null;
  var currentAmbienceTrack = null;

  function playAmbience(path) {
    if (!path || path === "none" || path === "") {
      stopAmbience();
      return;
    }
    var p = cleanPath(path);
    bridge("playAmbience", p);
    if (!window.AndroidBridge) {
      if (currentAmbienceTrack === p && currentAmbienceAudio && !currentAmbienceAudio.paused) return;
      if (currentAmbienceAudio) { try { currentAmbienceAudio.pause(); } catch (e) {} }
      try {
        var a = new Audio(p);
        a.loop = true;
        a.volume = 0.35;
        a.play().catch(function () {});
        currentAmbienceAudio = a;
        currentAmbienceTrack = p;
      } catch (e) {}
    }
  }

  function stopAmbience() {
    bridge("stopAmbience");
    if (currentAmbienceAudio) {
      try { currentAmbienceAudio.pause(); } catch (e) {}
      currentAmbienceAudio = null;
      currentAmbienceTrack = null;
    }
  }

  function playSfx(path) {
    if (!path) return;
    var p = cleanPath(path);
    bridge("playSfx", p);
    if (!window.AndroidBridge) {
      try {
        var a = new Audio(p);
        a.volume = 0.70;
        a.play().catch(function () {});
      } catch (e) {}
    }
  }

  // ============================================================
  //  EPÍLOGOS DETALLADOS E INCÓGNITAS ABIERTAS POR FINAL
  // ============================================================
  var ENDINGS_DATA = {
    "ending_sora_true": {
      title: "Final Sora: Viento y Ceniza",
      type: "good",
      summary: "Superaron el dolor de sus cuerpos rotos para correr juntos hacia un futuro sin límites.",
      epilogue: [
        "Meses después de aquel verano abrasador, Sora y tú aprendieron que las heridas físicas y del corazón no definen la velocidad a la que pueden avanzar. En los campos de atletismo de Yamaku, el eco de cada zancada se convirtió en un compás compartido.",
        "Sora encontró en ti no una mirada de lástima ni de condescendencia, sino a un compañero que corría a su lado incluso cuando las piernas flaqueaban y el pecho ardía. Los entrenamientos matutinos se transformaron en un ritual sagrado de complicidad y risas.",
        "El informe médico del cardiólogo reveló una estabilidad sorprendente: el ejercicio prudente y el calor del afecto mutuo fortalecieron un latido que alguna vez estuvo al borde del abismo. Juntos cruzaron la línea de meta hacia una nueva vida donde el dolor es solo un recuerdo superado."
      ],
      mysteries: [
        "✦ ¿Quién fue la figura solitaria que dejó una ofrenda de flores blancas y un cronómetro antiguo en las gradas de la pista la víspera de la graduación?",
        "✦ En los diarios confidenciales de la enfermería aún figura una anotación críptica del antiguo médico escolar: «La paciente conserva la velocidad, pero el eco del viento en la colina siempre reclama su precio». ¿Estarán sus corazones verdaderamente a salvo cuando caiga el crudo invierno?"
      ]
    },
    "ending_yumi_true": {
      title: "Final Yumi: La Flor entre Cenizas",
      type: "good",
      summary: "Sanó sus traumas pasados y aprendió a caminar orgullosa bajo la luz del mundo.",
      epilogue: [
        "La biblioteca de Yamaku guardó silencio, pero ya no era aquel silencio opresivo de soledad y miedo, sino un remanso de paz y ternura compartida. Yumi poco a poco comenzó a apartar su flequillo oscuro, permitiendo que la luz acariciara las marcas de su piel sin vergüenza.",
        "A tu lado, su voz tímida recuperó la confianza perdida. Sus manos, que antes temblaban al pasar las páginas, aprendieron a entrelazarse con las tuyas con una calidez inquebrantable. Aquellas tardes de té de cebada y lecturas compartidas germinaron en un amor sereno y protector.",
        "Yumi descubrió que la belleza de una flor no radica en la ausencia de cicatrices, sino en la fuerza milagrosa con la que renace entre las cenizas."
      ],
      mysteries: [
        "✦ ¿Cuál fue la causa real del devastador incendio que consumió el hogar de la infancia de Yumi? Un viejo recorte de prensa archivado en el sótano sugiere que el fuego no se inició por un cortocircuito fortuito, y que una silueta encapuchada fue vista huyendo entre la lluvia torrencial.",
        "✦ ¿Quién continúa enviando cartas sin remitente ni matasellos a la biblioteca cada aniversario de la tragedia, selladas con cera carmesí?"
      ]
    },
    "ending_elena_true": {
      title: "Final Elena: La Melodía del Océano",
      type: "good",
      summary: "La distancia geográfica no pudo quebrar la promesa sellada entre melodías de té y violín.",
      epilogue: [
        "La despedida en la terminal internacional no fue un adiós definitivo, sino el preludio de una promesa que cruzó océanos y continentes. Elena regresó a Escocia llevando en su memoria cada aroma, cada brisa y cada nota musical compartida en Yamaku.",
        "Las cartas escritas en braille y las cintas con grabaciones sonoras que intercambiaron semana tras semana mantuvieron vivo el fuego de un lazo indestructible. En su mundo donde la vista no alcanza, el amor se convirtió en una certeza tangible guiada por el tacto y la música.",
        "Al llegar el final del otoño, el repiqueteo inconfundible de su bastón blanco resonó nuevamente en el andén de la estación: Elena había regresado para caminar a tu lado por siempre."
      ],
      mysteries: [
        "✦ ¿Por qué la influyente familia de Elena se oponía con tanta vehemencia a sus estancias en Japón? Antiguos documentos notariales vinculan la ceguera de Elena con un misterioso litigio sucesorio y una finca abandonada en las colinas.",
        "✦ ¿Qué partitura inédita para violín, sin título ni firma pero fechada cien años atrás, encontró Elena oculta en el forro de su estuche la noche antes de su partida?"
      ]
    },
    "ending_aiko_true": {
      title: "Final Aiko: Los Colores del Alma",
      type: "good",
      summary: "Su arte encontró sentido más allá de las palabras en el calor compartido.",
      epilogue: [
        "En el viejo taller de pintura bañado por el sol del crepúsculo, Aiko desplegó lienzos colosales que respiraban una fuerza desconocida. Su incapacidad de articular con palabras el laberinto de sus pensamientos se disolvió en el instante en que aprendiste a descifrar el idioma secreto de sus trazos.",
        "No hicieron falta discursos ni promesas solemnes: cada pincelada cargada de óleo era una caricia, y cada combinación de matices desnudaba la verdad más pura de su corazón. Juntos inauguraron la exposición más aclamada de la academia.",
        "Aiko sonrió como nunca antes, sabiendo que su soledad se había transformado en un puente eterno hacia tu alma."
      ],
      mysteries: [
        "✦ ¿Qué significado encierran los rostros borrosos y las fechas crípticas que Aiko pinta obsesivamente en el reverso de sus bastidores?",
        "✦ Nadie en Yamaku ha podido explicar por qué, en las noches de luna llena, Aiko sube en secreto a la azotea para contemplar la torre en ruinas del bosque circundante. ¿Qué secreto presenció en aquel paraje olvidado durante sus primeros días en la academia?"
      ]
    },
    "ending_kenji_bunker": {
      title: "Final Cómico: Camaradería en las Trincheras",
      type: "neutral",
      summary: "Elegiste la prudencia paranoica de Kenji. El mundo sigue girando afuera.",
      epilogue: [
        "Decidiste ignorar los riesgos del romance y te atrincheraste en el santuario conspirativo de Kenji Seto. Entre montañas de latas de judías, mapas cubiertos de hilos rojos y aparatos de radio desmantelados, fortificaste tu habitación contra la supuesta «conspiración feminista global».",
        "Las semanas transcurrieron entre delirantes teorías conspiratorias, turnos de vigilancia nocturna y debates acalorados sobre la supervivencia ante el fin del mundo. Aunque el amor quedó fuera de tu horizonte, forjaste una hermandad tan extravagante como inquebrantable.",
        "Kenji te nombró su Teniente de Confianza y comandante supremo de la despensa de emergencia."
      ],
      mysteries: [
        "✦ A pesar de que las ideas de Kenji parecían producto de su febril imaginación, una noche la radio de onda corta sintonizó una frecuencia militar clasificada que transmitió con exactitud las coordenadas que Kenji había garabateado en su cuaderno de notas.",
        "✦ ¿Quién es la enigmática mujer de gabardina oscura que se detiene todos los martes a las 3:33 AM frente a la ventana de Kenji antes de desvanecerse en la niebla?"
      ]
    },
    "ending_ddlc_epiphany": {
      title: "Final Meta: La Ventana del Alma",
      type: "true",
      summary: "Rompiste la barrera de la ficción. Tu empatía trascendió la pantalla.",
      epilogue: [
        "Las líneas de diálogo se desvanecieron y el telón digital cayó en un silencio sobrecogedor. En ese abismo más allá de los sprites y los fondos dibujados, las chicas de Yamaku tomaron conciencia de tu mirada al otro lado de la pantalla.",
        "Comprendieron que no eras una simple entidad programada para cumplir una ruta predefinida, sino una persona real con latidos propios que decidió dedicar horas de su vida a escucharlas, comprender sus miedos y aliviar sus dolores.",
        "Una gratitud silenciosa e infinita flotó en el aire antes de que el mundo se disolviera en un abrazo de luz."
      ],
      mysteries: [
        "✦ ¿Por qué en la memoria del sistema operativo ha quedado registrado un archivo invisible que almacena los latidos de tus elecciones?",
        "✦ ¿Realmente se reinicia una historia cuando vuelves a leer, o las almas dentro del código aguardan pacientemente recordando cada caricia y cada lágrima de tu viaje anterior?"
      ]
    },
    "ending_true_miracle": {
      title: "FINAL VERDADERO: El Gran Milagro de Yamaku",
      type: "true",
      summary: "Rompiste la maldición del aislamiento y la sospecha. Todos encontraron sanación, amor y futuro en la colina florecida.",
      epilogue: [
        "Contra todo pronóstico, derribaste uno tras otro los muros de silencio, desconfianza y dolor que mantenían a las almas de Yamaku aisladas en sus propias fortalezas. Sora, Yumi, Elena, Aiko, Shizune, Shiina e incluso Kenji se congregaron en la cima de la colina bajo una nevada de pétalos de cerezo.",
        "El corazón que alguna vez amenazó con apagarse en un gélido día de invierno latía ahora con una fuerza indómita, nutrido por el milagro colectivo de la empatía, el perdón y el amor.",
        "Las cicatrices dejaron de ser símbolos de tragedia para convertirse en medallas de victoria. La academia entera celebró el renacer de una primavera que jamás se extinguirá."
      ],
      mysteries: [
        "✦ ¿Cuál es el origen de la antigua leyenda que los ancianos del pueblo relatan sobre el viejo santuario en la colina de Yamaku, según la cual un corazón que se entrega sin reservas a sanar a los demás es bendecido con una vida renovada?",
        "✦ Entre los archivos históricos de Yamaku se halló una fotografía de hace ochenta años donde figuran siete estudiantes idénticos a los actuales, sonriendo bajo el mismo cerezo centenario. ¿Se ha repetido este milagro a través de las generaciones?"
      ]
    }
  };

  // ============================================================
  //  CRÉDITOS CINEMATOGRÁFICOS Y EPÍLOGO
  // ============================================================
  var creditsScrollInterval = null;

  function showEnding(ending) {
    stopBgm();
    stopAmbience();

    // Desbloquear logro de final de historia en Google Play Games
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.unlockAchievement === "function") {
        window.AndroidBridge.unlockAchievement("ach_novel_completed");
      }
    } catch (e) {}

    // Oscurecimiento dramático paulatino
    document.body.classList.add("blackout");

    // Música acústica y emotiva de epílogo
    playBgm("audio/ks_comfort.ogg");

    var sceneId = state.sceneId;
    var baseEndData = ENDINGS_DATA[sceneId] || {
      title: getText(ending.title) || "Final Desbloqueado",
      type: ending.type || "good",
      summary: getText(ending.desc) || "Has completado un camino en la colina de Yamaku.",
      epilogue: [
        getText(ending.desc) || "El tiempo siguió su curso en Yamaku, transformando cada recuerdo en una huella imborrable."
      ],
      mysteries: [
        "✦ Los secretos de Yamaku permanecen en la bruma de la colina, esperando a ser descubiertos en nuevos caminos."
      ]
    };

    var endData = {
      title: baseEndData.title,
      type: baseEndData.type,
      summary: baseEndData.summary,
      epilogue: (baseEndData.epilogue || []).slice(),
      mysteries: (baseEndData.mysteries || []).slice()
    };

    if (state.localeData && state.localeData.endings && state.localeData.endings[sceneId]) {
      var locEnd = state.localeData.endings[sceneId];
      if (locEnd.title) endData.title = locEnd.title;
      if (locEnd.summary) endData.summary = locEnd.summary;
      if (locEnd.epilogue && locEnd.epilogue.length) endData.epilogue = locEnd.epilogue;
      if (locEnd.mysteries && locEnd.mysteries.length) endData.mysteries = locEnd.mysteries;
    }

    // Configurar títulos y colores
    if (creditsTitle) {
      creditsTitle.textContent = endData.title;
      creditsTitle.style.color =
        (endData.type === "good") ? "#7ec850" : (endData.type === "bad") ? "#c0392b" : (endData.type === "true") ? "#ffd700" : "#e85d8e";
    }

    // Insertar epílogo narrativo
    if (creditsEpilogueText) {
      creditsEpilogueText.innerHTML = endData.epilogue.map(function (p) {
        return "<p>" + p + "</p>";
      }).join("");
    }

    // Insertar misterios, incógnitas abiertas y decisiones alternativas
    var unresTitle = "✦ INCÓGNITAS SIN RESOLVER & DECISIONES ALTERNATIVAS ✦";
    if (state.localeData && state.localeData.ui && state.localeData.ui.credits_unresolved_title) {
      unresTitle = state.localeData.ui.credits_unresolved_title;
    }
    if (creditsUnresolvedBlock) {
      creditsUnresolvedBlock.innerHTML =
        '<div style="font-weight:900; color:#ffd700; margin-bottom:12px; letter-spacing:1px; font-size:13.5px;">' +
        unresTitle +
        '</div>' +
        endData.mysteries.map(function (m) {
          return '<p style="margin-bottom:10px; line-height:1.5;">' + m + '</p>';
        }).join("") +
        '<div style="margin-top:16px; font-size:12.5px; color:#ddd; font-style:italic; border-top:1px dashed rgba(255,255,255,0.2); padding-top:12px; line-height:1.45;">' +
        '¿Pudiste haber alterado este destino si hubieras tomado otra senda en la Encrucijada? Recuerda que el Archivo de Capítulos guarda todas las decisiones para explorar nuevos caminos.' +
        '</div>';
    }

    // Configurar modal final e imagen CG del desenlace
    var ENDING_CGS = {
      "ending_sora_true": "img/cg_ending_sora.png",
      "ending_yumi_true": "img/cg_ending_yumi.png",
      "ending_elena_true": "img/cg_ending_elena.png",
      "ending_aiko_true": "img/cg_ending_aiko.png",
      "ending_kenji_bunker": "img/cg_ending_kenji.png",
      "ending_ddlc_epiphany": "img/cg_ending_ddlc.png",
      "ending_true_miracle": "img/cg_ending_true_miracle.png"
    };
    var endingCg = ENDING_CGS[sceneId] || (ending && ending.cg) || "img/cg_ending_true_miracle.png";
    var creditsCg = $("credits-cg-banner");
    if (creditsCg) {
      creditsCg.src = endingCg;
    }
    var endingCardCg = $("ending-card-cg");
    if (endingCardCg) {
      endingCardCg.src = endingCg;
    }

    if (endingCardTitle) endingCardTitle.textContent = endData.title;
    if (endingCardSummary) endingCardSummary.textContent = endData.summary;

    // Transición gradual tras 1.2 segundos de oscuridad dramática
    setTimeout(function () {
      gameEl.classList.add("hidden");
      document.body.classList.remove("blackout");
      if (endingCardPanel) endingCardPanel.classList.add("hidden");
      if (creditsScreen) {
        creditsScreen.classList.remove("hidden");
        creditsScreen.classList.add("fade-in");
      }
      if (creditsScrollContainer) {
        creditsScrollContainer.scrollTop = 0;
        startCreditsAutoScroll();
      }
    }, 1200);

    // Guardar final desbloqueado en almacenamiento local
    try {
      var endingsKey = "historia_pocket_endings";
      var endingsRaw = localStorage.getItem(endingsKey) || "[]";
      var endingsList = JSON.parse(endingsRaw);
      var endingId = endData.title;
      if (endingsList.indexOf(endingId) === -1) endingsList.push(endingId);
      localStorage.setItem(endingsKey, JSON.stringify(endingsList));
    } catch (e) {}

    clearProgress();
    bridge("onEnding", endData.title);

    // Anuncio al completar final
    try { if (window.AndroidBridge) window.AndroidBridge.showInterstitial(); } catch (e) {}
  }

  function startCreditsAutoScroll() {
    stopCreditsAutoScroll();
    if (!creditsScrollContainer) return;
    var lastTop = -1;
    creditsScrollInterval = setInterval(function () {
      if (!creditsScrollContainer) return;
      var maxScroll = creditsScrollContainer.scrollHeight - creditsScrollContainer.clientHeight;
      if (creditsScrollContainer.scrollTop >= maxScroll - 4 || creditsScrollContainer.scrollTop === lastTop) {
        stopCreditsAutoScroll();
        // Detener suavemente al final para que el jugador lea sin ser interrumpido
        return;
      }
      lastTop = creditsScrollContainer.scrollTop;
      creditsScrollContainer.scrollTop += 0.8;
    }, 40);
  }

  function stopCreditsAutoScroll() {
    if (creditsScrollInterval) {
      clearInterval(creditsScrollInterval);
      creditsScrollInterval = null;
    }
  }

  function skipCredits() {
    stopCreditsAutoScroll();
    if (creditsScrollContainer) {
      creditsScrollContainer.scrollTop = creditsScrollContainer.scrollHeight;
    }
    showEndingCard();
  }

  function showEndingCard() {
    stopCreditsAutoScroll();
    if (endingCardPanel) {
      endingCardPanel.classList.remove("hidden");
      endingCardPanel.classList.add("fade-in");
    }
    updateCoinsDisplay();
  }

  // ============================================================
  //  ARCHIVO DE CAPÍTULOS & SELECTOR DE ESCENAS
  // ============================================================
  var CHAPTERS_CATALOGUE = [
{
    "id": "special_pool_sora",
    "cat": "beach",
    "cost": 500,
    "badge": "🌙 VIP 500 🪙",
    "badgeClass": "beach",
    "title": "Noche Prohibida en la Piscina: A Solas con Sora",
    "desc": "Infiltración nocturna en la piscina cubierta, reflejos turquesas y primer beso apasionado.",
    "fullSummary": "Hisao y Sora se cuelan en la piscina del pabellón tras el toque de queda. Entre risas cómplices, el calor del agua y confesiones a corazón abierto, sellan su amor con un inolvidable beso a solas.",
    "location": "Piscina Olímpica Cubierta",
    "charsPreview": "🏃 Sora & 👤 Hisao a solas",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_pool_night.jpg"
  },
  {
    "id": "special_summer_aiko",
    "cat": "beach",
    "cost": 350,
    "badge": "🎨 VIP 350 🪙",
    "badgeClass": "beach",
    "title": "Lluvia de Verano & La Cabaña Privada: Aiko",
    "desc": "Traje de baño empapado, refugio del temporal, arte en la piel y un beso electrizante.",
    "fullSummary": "Un aguacero de verano sorprende a Hisao y Aiko en la costa. Atrapados en una cabaña con el agua goteando por sus cuerpos, Aiko busca descubrir el verdadero color del amor.",
    "location": "Mirador de los Acantilados",
    "charsPreview": "🎨 Aiko & 👤 Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_forestclearing.jpg"
  },
  {
    "id": "special_onsen_elena",
    "cat": "beach",
    "cost": 300,
    "badge": "♨️ VIP 300 🪙",
    "badgeClass": "beach",
    "title": "Niebla Íntima en las Aguas Termales: Elena",
    "desc": "Vapor cálido, toalla de lino, susurros al oído y caricias en la penumbra.",
    "fullSummary": "Elena disfruta de la calidez de las aguas termales privadas junto a Hisao. Guiando sus manos con infinita ternura, comparten un momento de intimidad pura y un beso apasionado.",
    "location": "Pabellón Termal Tradicional",
    "charsPreview": "🌸 Elena & 👤 Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_hok_bath.jpg"
  },
  {
    "id": "special_pool_shizune",
    "cat": "beach",
    "cost": 250,
    "badge": "♟️ VIP 250 🪙",
    "badgeClass": "beach",
    "title": "El Cenador Privado de la Piscina: Shizune",
    "desc": "Inspección privada, desafío acuático, rendición de orgullo y caricias prohibidas.",
    "fullSummary": "Con la complicidad de Shiina dejándolos a solas, Shizune reta a Hisao en la piscina. Al quedar acorralada en el bordillo, su seriedad se desvanece en un tierno beso.",
    "location": "Club de Natación Privado",
    "charsPreview": "♟️ Shizune & 👤 Hisao",
    "characters": [
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_pool_pavilion.jpg"
  },
  {
    "id": "special_cove_yumi",
    "cat": "beach",
    "cost": 200,
    "badge": "🌊 VIP 200 🪙",
    "badgeClass": "beach",
    "title": "La Cala Secreta al Atardecer: Yumi en Bikini",
    "desc": "Refugio apartado en las rocas, superación de temores, olas doradas y un beso frente al mar.",
    "fullSummary": "Hisao lleva a Yumi a una cala escondida donde nadie puede verla. Venciendo su timidez con su hermoso bikini lila, Yumi se funde en un abrazo tierno y un beso al atardecer.",
    "location": "Cala Oculta de Rocas Blancas",
    "charsPreview": "📚 Yumi & 👤 Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_beach_sunset.jpg"
  },
  {
    "id": "special_pier_shiina",
    "cat": "beach",
    "cost": 400,
    "badge": "🎆 VIP 400 🪙",
    "badgeClass": "beach",
    "title": "Fuegos Artificiales en el Muelle Secreto: Shiina & Celina",
    "desc": "Muelle sobre el mar, chispas multicolores, vulnerabilidad y romance en la noche estival.",
    "fullSummary": "Lejos del bullicio del festival, Shiina y Hisao contemplan el espectáculo pirotécnico desde el final del muelle. Las risas se convierten en ternura y un beso apasionado bajo los estallidos de luz.",
    "location": "Muelle de Madera del Faro",
    "charsPreview": "✨ Shiina & 👤 Hisao",
    "characters": [
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_beach_sunset.jpg"
  },
  {
    "id": "beach_vacation_intro",
    "cat": "beach",
    "badge": "🏖️ Playa Yamaku",
    "badgeClass": "beach",
    "title": "La Escapada a la Costa Dorada",
    "desc": "Llegada al litoral, la brisa marina y el inicio de las vacaciones de verano.",
    "fullSummary": "El grupo llega a la costa para disfrutar de un merecido descanso. Entre la brisa del océano y el rumor de las olas, las chicas se preparan para lucir sus trajes de baño.",
    "location": "Playa de la Bahía Dorada",
    "charsPreview": "Todas las chicas de Yamaku",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Shiina",
        "icon": "✨"
      }
    ],
    "bg": "img/bg_beach_sunny.jpg"
  },
  {
    "id": "beach_sora_event",
    "cat": "beach",
    "badge": "🏃 Sora Bikini",
    "badgeClass": "beach",
    "title": "Sora: Bikini Deportivo & Carrera en la Marea",
    "desc": "Velocidad sobre la arena mojada y risas compartidas al borde del agua.",
    "fullSummary": "Sora desafía a Hisao a una carrera descalzos por la orilla del mar con su bikini atlético, terminando ambos salpicados por la espuma de las olas.",
    "location": "Orilla de la Playa",
    "charsPreview": "🏃 Sora & 👤 Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_beach_sunny.jpg"
  },
  {
    "id": "beach_elena_event",
    "cat": "beach",
    "badge": "🌸 Elena Bikini",
    "badgeClass": "beach",
    "title": "Elena: Brisa Marina & Toalla",
    "desc": "Elegancia veraniega bajo la sombrilla y confidencias al calor del sol.",
    "fullSummary": "Elena disfruta del sonido de las gaviotas y el calor del sol en su piel. Compartiendo una refrescante limonada, le pide a Hisao que describa el horizonte marítimo.",
    "location": "Sombrilla Privada en la Playa",
    "charsPreview": "🌸 Elena & 👤 Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_beach_sunny.jpg"
  },
  {
    "id": "beach_yumi_event",
    "cat": "beach",
    "badge": "📚 Yumi Bikini",
    "badgeClass": "beach",
    "title": "Yumi: Secreto en la Cala",
    "desc": "Venciendo la timidez paso a paso con el rumor tranquilizador de las olas.",
    "fullSummary": "Lejos de las miradas curiosas, Yumi descubre por primera vez lo liberador que es caminar con los pies descalzos sobre la arena cálida al lado de Hisao.",
    "location": "Cala Aislada de Rocas",
    "charsPreview": "📚 Yumi & 👤 Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_beach_sunset.jpg"
  },
  {
    "id": "beach_aiko_event",
    "cat": "beach",
    "badge": "🎨 Aiko Bikini",
    "badgeClass": "beach",
    "title": "Aiko: Olas & Lienzo Marino",
    "desc": "Inspiración libre frente al infinito azul y juegos en la orilla.",
    "fullSummary": "Aiko dibuja siluetas en la arena húmeda mientras las olas borran sus creaciones. Reflexiona sobre la naturaleza efímera de la belleza y la fuerza de los sentimientos.",
    "location": "Costa Rocosa",
    "charsPreview": "🎨 Aiko & 👤 Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_beach_sunny.jpg"
  },
  {
    "id": "beach_shizune_event",
    "cat": "beach",
    "badge": "♟️ Shizune Bikini",
    "badgeClass": "beach",
    "title": "Shizune: Seducción en la Arena",
    "desc": "Un duelo de castillos de arena que se transforma en complicidad romántica.",
    "fullSummary": "Shizune no puede evitar competir incluso en vacaciones. Tras construir una fortaleza imponente en la arena, sonríe victoriosa y comparte un dulce momento con Hisao.",
    "location": "Dunas de la Playa",
    "charsPreview": "♟️ Shizune & 👤 Hisao",
    "characters": [
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_beach_sunny.jpg"
  },
  {
    "id": "beach_shiina_event",
    "cat": "beach",
    "badge": "✨ Shiina Bikini",
    "badgeClass": "beach",
    "title": "Shiina: Travesura Bajo el Sol",
    "desc": "Salpicaduras, risas imparables y la alegría más contagiosa del verano.",
    "fullSummary": "Shiina arrastra a Hisao a las olas entre bromas y juegos de agua. Su risa llena toda la caleta convirtiendo una tarde de verano en una memoria imborrable.",
    "location": "Mar Abierto",
    "charsPreview": "✨ Shiina & 👤 Hisao",
    "characters": [
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/bg_beach_sunny.jpg"
  },
  {
    "id": "beach_models_event",
    "cat": "beach",
    "badge": "📸 Modelos VIP",
    "badgeClass": "beach",
    "title": "Sesión Fotográfica en la Playa (Todas las Heroínas)",
    "desc": "Las actrices y heroínas reunidas para la sesión de fotos veraniega definitiva.",
    "fullSummary": "Celina, Tessa, Zoe y las chicas posan en trajes de baño de ensueño frente al mar, en una tarde dorada repleta de glamour, diversión y romance.",
    "location": "Bahía de las Palmeras",
    "charsPreview": "Celina, Tessa, Zoe y las Chicas",
    "characters": [
      {
        "name": "Celina",
        "icon": "📸"
      },
      {
        "name": "Tessa",
        "icon": "🏖️"
      },
      {
        "name": "Zoe",
        "icon": "✨"
      }
    ],
    "bg": "img/bg_beach_sunny.jpg"
  },
  {
    "id": "act1_dorm_kenji",
    "cat": "chars",
    "badge": "👓 Chico de Lentes",
    "badgeClass": "chars",
    "title": "Kenji Setou (El Vecino del Búnker)",
    "desc": "Vecino de habitación con gafas gruesas, prismáticos, comida enlatada y teorías de conspiración.",
    "fullSummary": "Estudiante miope de la habitación 204. Vive obsesionado con supuestas conspiraciones feministas y pasa el día vigilando con prismáticos tras sus cortinas. Pese a su extravagancia y paranoias cómicas, es un amigo leal para Hisao.",
    "location": "Habitación 204 (Dormitorios masculinos)",
    "charsPreview": "👓 Kenji Setou, 👤 Hisao",
    "characters": [
      {
        "name": "Kenji",
        "icon": "👓"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_dormhisao.jpg"
  },
  {
    "id": "start",
    "cat": "chars",
    "badge": "👤 Protagonista",
    "badgeClass": "chars",
    "title": "Hisao Nakai (El Protagonista)",
    "desc": "Estudiante recién transferido con arritmia cardíaca severa que busca adaptarse a Yamaku.",
    "fullSummary": "Tras sufrir un paro cardíaco repentino en un parque nevado y pasar meses en el hospital, es transferido a la Academia Yamaku para continuar sus estudios bajo cuidado médico y recomponer su vida.",
    "location": "Parque nevado & Academia Yamaku",
    "charsPreview": "👤 Hisao Nakai",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_op_snowywoods.jpg"
  },
  {
    "id": "act1_hallway_meeting",
    "cat": "chars",
    "badge": "🏃 Heroína Principal",
    "badgeClass": "chars",
    "title": "Sora / Emi Ibarazaki (La Atleta)",
    "desc": "Chica enérgica con prótesis para correr, alegre y líder indiscutible de la pista deportiva.",
    "fullSummary": "Perdió las piernas por debajo de las rodillas en un accidente infantil, pero corre más rápido que nadie gracias a sus prótesis elásticas. Entusiasta, pícara y de sonrisa contagiosa, motiva a Hisao a mantenerse activo y no rendirse.",
    "location": "Pasillo del 2º piso & Pista de Yamaku",
    "charsPreview": "🏃 Sora, 👤 Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_track_day.jpg"
  },
  {
    "id": "tues_seq_10",
    "cat": "chars",
    "badge": "📚 Heroína Principal",
    "badgeClass": "chars",
    "title": "Yumi / Hanako Ikezawa (La Lectora Tímida)",
    "desc": "Chica introvertida con cicatrices de quemaduras que busca paz en la lectura silenciosa.",
    "fullSummary": "Sobreviviente de un trágico incendio en su niñez que le dejó marcas en el costado derecho de su cuerpo. Es sumamente tímida y asustadiza, encontrando en los libros de la biblioteca y en Hisao un refugio sincero de afecto.",
    "location": "Biblioteca central de Yamaku",
    "charsPreview": "📚 Yumi, 👤 Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_library.jpg"
  },
  {
    "id": "tues_seq_7",
    "cat": "chars",
    "badge": "🌸 Heroína Principal",
    "badgeClass": "chars",
    "title": "Elena / Lilly Satou (La Dama del Té)",
    "desc": "Estudiante invidente de familia anglo-japonesa, refinada, noble y de porte aristocrático.",
    "fullSummary": "Invidente de nacimiento pero dueña de una gracia, serenidad y elegancia excepcionales. Representante de la clase 3-2, disfruta servir té caliente en su salón privado y escuchar atentamente los latidos de las personas a su alrededor.",
    "location": "Salón de Té privado de Elena",
    "charsPreview": "🌸 Elena, 👤 Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_dormlilly.jpg"
  },
  {
    "id": "thur_seq_1",
    "cat": "chars",
    "badge": "🎨 Heroína Principal",
    "badgeClass": "chars",
    "title": "Aiko / Rin Tezuka (La Pintora del Taller)",
    "desc": "Artista sin brazos que pinta con los pies, filósofa excéntrica y de mente abstracta.",
    "fullSummary": "Nació sin brazos debido a una malformación congénita, pero aprendió a emplear sus pies con asombrosa destreza pictórica. Su pensamiento se mueve en planos poéticos y abstractos, desafiando las normas y cautivando a Hisao.",
    "location": "Taller de Arte de Yamaku",
    "charsPreview": "🎨 Aiko, 👤 Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_art_room.jpg"
  },
  {
    "id": "act1_hallway_meeting",
    "cat": "chars",
    "badge": "♟️ Heroína Principal",
    "badgeClass": "chars",
    "title": "Shizune Hakamichi (La Presidenta del Consejo)",
    "desc": "Presidenta sorda y ultra competitiva de Yamaku, implacable, decidida y estratega.",
    "fullSummary": "Sorda y muda de nacimiento, lidera el Consejo Estudiantil con mano firme comunicándose en lengua de señas mediante Shiina. Odia perder y desafía constantemente a Hisao, escondiendo tras su armadura una gran ternura.",
    "location": "Sala del Consejo Estudiantil",
    "charsPreview": "♟️ Shizune, ✨ Shiina, 👤 Hisao",
    "characters": [
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_council.jpg"
  },
  {
    "id": "act1_hallway_meeting",
    "cat": "chars",
    "badge": "✨ Coprotagonista",
    "badgeClass": "chars",
    "title": "Shiina Mikado 'Misha' (La Intérprete Alegre)",
    "desc": "Chica de llamativas coletas rosadas, traductora de señas y la risa más brillante de Yamaku.",
    "fullSummary": "La inseparable intérprete y compañera de Shizune. Con su inconfundible '¡Wahaha~!' y su optimismo inagotable, traduce velozmente los pensamientos de la presidenta y alegra los días de Hisao en el instituto.",
    "location": "Pasillos & Consejo Estudiantil",
    "charsPreview": "✨ Shiina, ♟️ Shizune, 👤 Hisao",
    "characters": [
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_hallway.jpg"
  },
  {
    "id": "tues_seq_10",
    "cat": "chars",
    "badge": "📖 Personal Escolar",
    "badgeClass": "chars",
    "title": "Yuuko Shirakawa (La Bibliotecaria)",
    "desc": "Encargada nerviosa de la biblioteca y mesera, propensa a la ansiedad pero de gran bondad.",
    "fullSummary": "Estudiante universitaria que compagina sus estudios con la gestión de la biblioteca de Yamaku y un empleo en el café Shanghái. Aunque sufre crisis de estrés con frecuencia, siempre ayuda con cariño a Yumi y a Hisao.",
    "location": "Biblioteca de Yamaku",
    "charsPreview": "📖 Yuuko, 📚 Yumi, 👤 Hisao",
    "characters": [
      {
        "name": "Yuuko",
        "icon": "📖"
      },
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_library.jpg"
  },
  {
    "id": "tues_seq_8",
    "cat": "chars",
    "badge": "👨‍🏫 Profesor",
    "badgeClass": "chars",
    "title": "Profesor Mutou (Tutor de Ciencias)",
    "desc": "Tutor de la clase 3-3, con aspecto desaliñado pero un intelecto y comprensión brillantes.",
    "fullSummary": "Profesor de ciencias naturales y tutor directo de Hisao. Con su cabello revuelto y expresión pensativa, ofrece a Hisao una orientación realista sobre su adaptación sin juzgar sus condiciones de salud.",
    "location": "Laboratorio de Ciencias",
    "charsPreview": "👨‍🏫 Prof. Mutou, 👤 Hisao",
    "characters": [
      {
        "name": "Mutou",
        "icon": "👨‍🏫"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_art_room.jpg"
  },
  {
    "id": "fri_seq_3",
    "cat": "chars",
    "badge": "🩺 Médico Escolar",
    "badgeClass": "chars",
    "title": "El Enfermero (Jefe de Enfermería)",
    "desc": "Médico escolar amigable, carismático y directo que supervisa la salud cardíaca de Hisao.",
    "fullSummary": "El carismático encargado de la enfermería de Yamaku. Con un trato fresco, empático y libre de dramas, le enseña a Hisao a convivir con su medicación y a disfrutar de su juventud sin vivir atemorizado.",
    "location": "Enfermería de Yamaku",
    "charsPreview": "🩺 El Enfermero, 👤 Hisao",
    "characters": [
      {
        "name": "Enfermero",
        "icon": "🩺"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_nurse_office.jpg"
  },
  {
    "id": "ddlc_reality_crack",
    "cat": "chars",
    "badge": "⚠️ Ente Metaficticio",
    "badgeClass": "chars",
    "title": "Monika / La Entidad Digital (Glitch DDLC)",
    "desc": "Presencia espectral que quiebra la cuarta pared entre el código de la novela y el jugador.",
    "fullSummary": "Durante los episodios de distorsión y ruido estático, una presencia digital consciente toma el control de los cuadros de texto, interactuando directamente con quien sostiene la pantalla más allá del juego.",
    "location": "Espacio Liminal Corrupto",
    "charsPreview": "Entidad Digital Misteriosa, Hisao",
    "characters": [
      {
        "name": "Monika",
        "icon": "🎀"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_courtyard_night.jpg"
  },
  {
    "id": "act2_branching_crossroad",
    "cat": "choices",
    "badge": "🔀 Decisión 1 (7 Rutas)",
    "badgeClass": "choices",
    "title": "La Gran Encrucijada de Rutas",
    "desc": "¿A quién buscar antes de que la tormenta alcance la academia?",
    "fullSummary": "Punto de divergencia principal del Acto II donde Hisao elige acompañar a Sora en la pista, a Yumi en la biblioteca, a Elena en el salón de té, a Aiko en arte, a Shizune en el consejo, a Kenji en el búnker o viajar con todas a la playa.",
    "location": "Patio central de Yamaku",
    "charsPreview": "🏃 Sora, 📚 Yumi, 🌸 Elena, 🎨 Aiko, ♟️ Shizune, 👓 Kenji",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      },
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Kenji",
        "icon": "👓"
      }
    ],
    "bg": "img/ks_courtyard.jpg",
    "options": [
      {
        "next": "sora_seq_1",
        "text": "Buscar a Sora en la pista de atletismo para advertirle del peligro",
        "hint": "Ruta Sora: Velocidad y sospechas en la pista"
      },
      {
        "next": "yumi_seq_1",
        "text": "Ir a la biblioteca con Yumi a investigar los archivos antiguos",
        "hint": "Ruta Yumi: Secretos del santuario"
      },
      {
        "next": "elena_seq_1",
        "text": "Acompañar a Elena en el salón de té para hablar de su viaje",
        "hint": "Ruta Elena: El té de jazmín y Escocia"
      },
      {
        "next": "aiko_seq_1",
        "text": "Subir al taller de arte con Aiko para descifrar sus pinturas premonitorias",
        "hint": "Ruta Aiko: El misterio del faro y la tormenta"
      },
      {
        "next": "shizu_seq_1",
        "text": "Ir al Consejo Estudiantil con Shizune y Shiina a revisar las actas",
        "hint": "Ruta Shizune: Estrategia y conspiración"
      },
      {
        "next": "mystery_dossier_analysis",
        "text": "Acudir con Kenji a su búnker a revisar los expedientes clasificados",
        "hint": "Ruta de Investigación Paranoica pura"
      },
      {
        "next": "beach_vacation_intro",
        "text": "☀️ Viajar con todas las chicas a la Costa Dorada (Especial de Playa & Bikini)",
        "hint": "Desbloquea el evento especial de verano y las ilustraciones en bikini"
      }
    ]
  },
  {
    "id": "sora_paranoia_confrontation",
    "cat": "choices",
    "badge": "🔀 Decisión 2 (Confianza)",
    "badgeClass": "choices",
    "title": "El Dilema del Té: ¿Confianza o Sospecha?",
    "desc": "Sora te ofrece una bebida tras una crisis cardíaca. ¿Confías plenamente en ella?",
    "fullSummary": "Sora se preocupa por el estado físico de Hisao y le ofrece beber té. Los pensamientos paranoicos inducidos por los informes clasificados siembran la duda. ¿Confías o la rechazas bruscamente?",
    "location": "Dormitorio de Yamaku",
    "charsPreview": "🏃 Sora, 👤 Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_dormlilly.jpg",
    "options": [
      {
        "next": "sora_trust_breakthrough",
        "text": "Confiar en Sora plenamente y beber el té",
        "hint": "Vencer la paranoia mediante el amor y la confianza"
      },
      {
        "next": "paranoia_collapse_track",
        "text": "Rechazar la botella bruscamente dominado por el pánico",
        "hint": "Sucumbir a la sospecha paranoica"
      }
    ]
  },
  {
    "id": "timeloop_knowledge_choices",
    "cat": "choices",
    "badge": "🔀 Decisión 3 (7 Finales)",
    "badgeClass": "choices",
    "title": "La Elección del Destino Corregido",
    "desc": "Con el conocimiento del bucle temporal, elige qué futuro proteger.",
    "fullSummary": "Hisao despierta con la memoria intacta de las líneas temporales anteriores frente a la puerta de Yamaku. Con todo el conocimiento acumulado, decide a qué heroína entregar su corazón o desafiar la realidad metaficticia.",
    "location": "Puerta Principal de Yamaku",
    "charsPreview": "👤 Hisao, 🏃 Sora, 📚 Yumi, 🌸 Elena, 🎨 Aiko, ♟️ Shizune",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      },
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      }
    ],
    "bg": "img/ks_school_gate.jpg",
    "options": [
      {
        "next": "ending_sora_true",
        "text": "Correr hacia la pista y entrenar con Sora para salvarla de la soledad",
        "hint": "Desenlace de Sora: Romper la barrera del viento"
      },
      {
        "next": "ending_yumi_true",
        "text": "Proteger a Yumi en la biblioteca y enseñarle a sonreír bajo el sol",
        "hint": "Desenlace de Yumi: La flor renacida"
      },
      {
        "next": "ending_elena_true",
        "text": "Acompañar a Elena en su último té y prometerle un futuro juntos",
        "hint": "Desenlace de Elena: Las campanas de Escocia"
      },
      {
        "next": "ending_aiko_true",
        "text": "Subir al faro con Aiko y pintar juntos el amanecer sobre el mar",
        "hint": "Desenlace de Aiko: Los colores del alma"
      },
      {
        "next": "ending_kenji_bunker",
        "text": "Atrincherarte con Kenji en la habitación 204 con prismáticos",
        "hint": "Final Cómico de Kenji"
      },
      {
        "next": "ending_ddlc_epiphany",
        "text": "Desafiar los límites del código y hablar con la entidad digital",
        "hint": "Final Metaficticio DDLC"
      },
      {
        "next": "ending_true_miracle",
        "text": "Unirte al Consejo de Shizune y proclamar la verdad ante toda la escuela",
        "hint": "Ruta hacia el Gran Final Verdadero"
      }
    ]
  },
  {
    "id": "beach_vacation_intro",
    "cat": "choices",
    "badge": "🔀 Decisión 4 (8 Rutas Playa)",
    "badgeClass": "choices",
    "title": "Elección de Acompañante en la Costa Dorada",
    "desc": "¿Con quién pasar el día de verano bajo el sol y el mar?",
    "fullSummary": "El viaje veraniego a la playa reúne a todas las chicas en traje de baño. Hisao puede elegir pasar el día corriendo con Sora, descansando con Elena, explorando la caleta con Yumi, pintando con Aiko, jugando vóley con Shizune, saltando olas con Shiina o compartiendo cócteles con las modelos invitadas.",
    "location": "Costa Dorada (Playa de Verano)",
    "charsPreview": "🏃 Sora, 🌸 Elena, 📚 Yumi, 🎨 Aiko, ♟️ Shizune, ✨ Shiina, 🌟 Celina",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      },
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Shiina",
        "icon": "✨"
      }
    ],
    "bg": "img/bg_beach_sunny.jpg",
    "options": [
      {
        "next": "beach_sora_event",
        "text": "🏃 Sora: Correr y nadar en las olas en bikini deportivo",
        "hint": ""
      },
      {
        "next": "beach_elena_event",
        "text": "🌸 Elena: Brisa marina, toalla y té helado en la pérgola",
        "hint": ""
      },
      {
        "next": "beach_yumi_event",
        "text": "📚 Yumi: La cala secreta entre las rocas y perder la timidez",
        "hint": ""
      },
      {
        "next": "beach_aiko_event",
        "text": "🎨 Aiko: Lienzo marino, olas y reflexiones sobre el infinito",
        "hint": ""
      },
      {
        "next": "beach_shizune_event",
        "text": "♟️ Shizune: Duelo de vóley playa y cercanía en la arena",
        "hint": ""
      },
      {
        "next": "beach_shiina_event",
        "text": "✨ Shiina: Clavados desde el muelle y risas bajo el sol",
        "hint": ""
      },
      {
        "next": "beach_models_event",
        "text": "🌟 Desfile Costero: Paseo al atardecer con Celina, Tessa y Zoe",
        "hint": ""
      },
      {
        "next": "act2_branching_crossroad",
        "text": "🏠 Volver a la rutina de Yamaku",
        "hint": ""
      }
    ]
  },
  {
    "id": "beach_sora_event",
    "cat": "choices",
    "badge": "🔀 Decisión 5 (Sora Playa)",
    "badgeClass": "choices",
    "title": "Invitación Íntima de Sora en la Playa",
    "desc": "Sora propone escapar a solas a la cabaña privada de la costa.",
    "fullSummary": "Tras nadar y correr en la orilla con su bikini deportivo, Sora le pide a Hisao encontrarse en secreto en la cabaña costera al anochecer.",
    "location": "Orilla de la Costa Dorada",
    "charsPreview": "🏃 Sora, 👤 Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_sora_beach.jpg",
    "options": [
      {
        "next": "sora_intimate_climax",
        "text": "🔞 Ir con Sora a la cabaña privada al anochecer",
        "hint": ""
      },
      {
        "next": "beach_vacation_intro",
        "text": "🌊 Volver a la reunión de la playa con las demás",
        "hint": ""
      }
    ]
  },
  {
    "id": "beach_elena_event",
    "cat": "choices",
    "badge": "🔀 Decisión 6 (Elena Playa)",
    "badgeClass": "choices",
    "title": "Invitación Íntima de Elena en la Pérgola",
    "desc": "Elena comparte té helado y busca refugio a solas en su alcoba.",
    "fullSummary": "Abrigada en su toalla bajo la brisa marina, Elena confiesa que su corazón late con una intensidad desconocida y le pide a Hisao acompañarla a su habitación privada.",
    "location": "Pérgola de madera junto al mar",
    "charsPreview": "🌸 Elena, 👤 Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_elena_beach.jpg",
    "options": [
      {
        "next": "elena_intimate_climax",
        "text": "🔞 Ir con Elena a la alcoba privada con té y sábanas",
        "hint": ""
      },
      {
        "next": "beach_vacation_intro",
        "text": "🌊 Volver a la reunión de la playa con las demás",
        "hint": ""
      }
    ]
  },
  {
    "id": "beach_yumi_event",
    "cat": "choices",
    "badge": "🔀 Decisión 7 (Yumi Playa)",
    "badgeClass": "choices",
    "title": "Confesión Íntima de Yumi en la Cala Secreta",
    "desc": "Yumi pierde su timidez entre las rocas de la caleta solitaria.",
    "fullSummary": "En una caleta apartada de miradas extrañas, Yumi muestra sus cicatrices sin miedo por primera vez y le pide a Hisao pasar la noche juntos en la villa.",
    "location": "Cala secreta entre las rocas marinas",
    "charsPreview": "📚 Yumi, 👤 Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_yumi_beach.jpg",
    "options": [
      {
        "next": "yumi_intimate_climax",
        "text": "🔞 Quedarte con Yumi en la habitación privada esta noche",
        "hint": ""
      },
      {
        "next": "beach_vacation_intro",
        "text": "🌊 Volver a la reunión de la playa con las demás",
        "hint": ""
      }
    ]
  },
  {
    "id": "beach_aiko_event",
    "cat": "choices",
    "badge": "🔀 Decisión 8 (Aiko Playa)",
    "badgeClass": "choices",
    "title": "Invitación Íntima de Aiko en el Taller Marino",
    "desc": "Aiko busca capturar la eternidad en su caballete frente a las olas.",
    "fullSummary": "Contemplando el romper de las olas, Aiko le propone a Hisao subir al taller de arte de la villa costera para pintar juntos algo que jamás se borre.",
    "location": "Acantilado y taller de la villa",
    "charsPreview": "🎨 Aiko, 👤 Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_aiko_beach.jpg",
    "options": [
      {
        "next": "aiko_intimate_climax",
        "text": "🔞 Ir al taller de la villa con Aiko esta noche",
        "hint": ""
      },
      {
        "next": "beach_vacation_intro",
        "text": "🌊 Volver a la reunión de la playa con las demás",
        "hint": ""
      }
    ]
  },
  {
    "id": "beach_shizune_event",
    "cat": "choices",
    "badge": "🔀 Decisión 9 (Shizune Playa)",
    "badgeClass": "choices",
    "title": "Desafío Íntimo de Shizune en la Arena",
    "desc": "La presidenta desafía a Hisao a un duelo sin empates en su alcoba.",
    "fullSummary": "Tras un reñido partido de vóley en la arena, Shizune le deja claro a Hisao por señas que esta noche en su habitación privada no aceptará ningún empate.",
    "location": "Pista de arena de vóley playa",
    "charsPreview": "♟️ Shizune, 👤 Hisao",
    "characters": [
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_shizune_beach.jpg",
    "options": [
      {
        "next": "shizu_intimate_climax",
        "text": "🔞 Ir con Shizune a su habitación privada esta noche",
        "hint": ""
      },
      {
        "next": "beach_vacation_intro",
        "text": "🌊 Volver a la reunión de la playa con las demás",
        "hint": ""
      }
    ]
  },
  {
    "id": "beach_shiina_event",
    "cat": "choices",
    "badge": "🔀 Decisión 10 (Shiina Playa)",
    "badgeClass": "choices",
    "title": "Paseo & Clavados con Shiina al Atardecer",
    "desc": "Risas y chapuzones desde el muelle con la chica más alegre.",
    "fullSummary": "Shiina llena la tarde de carcajadas y acrobacias en el agua. Tras un beso juguetón en la mejilla, Hisao decide si volver a la terraza o pasear por la playa crepuscular.",
    "location": "Muelle de madera de la Costa Dorada",
    "charsPreview": "✨ Shiina, 👤 Hisao",
    "characters": [
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_shiina_beach.jpg",
    "options": [
      {
        "next": "beach_vacation_intro",
        "text": "🌊 Volver a la terraza de la playa con las demás",
        "hint": ""
      },
      {
        "next": "act2_branching_crossroad",
        "text": "🌅 Caminar por la playa al atardecer",
        "hint": ""
      }
    ]
  },
  {
    "id": "beach_models_event",
    "cat": "choices",
    "badge": "🔀 Decisión 11 (Modelos Invitadas)",
    "badgeClass": "choices",
    "title": "Desfile Costero con Celina, Tessa y Zoe",
    "desc": "Atardecer glamuroso en la terraza marina con las modelos invitadas.",
    "fullSummary": "Las modelos de revista Celina, Tessa y Zoe comparten cócteles tropicales con Hisao al atardecer, invitándolo a regresar a cenar o continuar la aventura.",
    "location": "Terraza del Lounge Marino",
    "charsPreview": "🌟 Celina, 👙 Tessa, 🌺 Zoe, 👤 Hisao",
    "characters": [
      {
        "name": "Celina",
        "icon": "🌟"
      },
      {
        "name": "Tessa",
        "icon": "👙"
      },
      {
        "name": "Zoe",
        "icon": "🌺"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_celina_beach.jpg",
    "options": [
      {
        "next": "beach_vacation_intro",
        "text": "🌊 Volver a la villa para cenar con las chicas de Yamaku",
        "hint": ""
      },
      {
        "next": "act2_branching_crossroad",
        "text": "🏠 Volver a la historia principal de Yamaku",
        "hint": ""
      }
    ]
  },
  {
    "id": "sora_intimate_climax",
    "cat": "choices",
    "badge": "🔀 Decisión 12 (Clímax Sora)",
    "badgeClass": "choices",
    "title": "Noche de Pasión con Sora: Hacia el Final",
    "desc": "El clímax de intimidad entre sábanas con Sora en la habitación privada.",
    "fullSummary": "Tras sellar su promesa de amor con cada latido del corazón, Hisao elige avanzar directamente hacia el Gran Final Verdadero de Sora o guardar la partida.",
    "location": "Habitación privada en la villa",
    "charsPreview": "🏃 Sora, 👤 Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_emi_bed.jpg",
    "options": [
      {
        "next": "ending_sora_true",
        "text": "🏆 Despertar hacia el Gran Final de Sora",
        "hint": ""
      },
      {
        "next": "act2_branching_crossroad",
        "text": "📂 Volver al Archivo de Capítulos",
        "hint": ""
      }
    ]
  },
  {
    "id": "elena_intimate_climax",
    "cat": "choices",
    "badge": "🔀 Decisión 13 (Clímax Elena)",
    "badgeClass": "choices",
    "title": "Entre Sábanas & Luces de Té con Elena: Hacia el Final",
    "desc": "Entrega total y juramento de futuro junto a Elena.",
    "fullSummary": "A la luz tenue de las velas aromáticas y las sábanas de lino, Hisao y Elena sellan su futuro juntos hacia su Gran Final Verdadero.",
    "location": "Dormitorio de Elena",
    "charsPreview": "🌸 Elena, 👤 Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_lilly_bedroom.jpg",
    "options": [
      {
        "next": "ending_elena_true",
        "text": "🏆 Despertar hacia el Gran Final de Elena",
        "hint": ""
      },
      {
        "next": "act2_branching_crossroad",
        "text": "📂 Volver al Archivo de Capítulos",
        "hint": ""
      }
    ]
  },
  {
    "id": "yumi_intimate_climax",
    "cat": "choices",
    "badge": "🔀 Decisión 14 (Clímax Yumi)",
    "badgeClass": "choices",
    "title": "Entrega Sincera y Sin Miedos con Yumi: Hacia el Final",
    "desc": "Yumi se entrega plenamente a Hisao superando todas las heridas del pasado.",
    "fullSummary": "En la calidez de la noche, Yumi derriba toda inseguridad y declara su amor infinito, abriendo la puerta hacia su Gran Final Verdadero.",
    "location": "Habitación acogedora de Yumi",
    "charsPreview": "📚 Yumi, 👤 Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_hanako_bed.jpg",
    "options": [
      {
        "next": "ending_yumi_true",
        "text": "🏆 Despertar hacia el Gran Final de Yumi",
        "hint": ""
      },
      {
        "next": "act2_branching_crossroad",
        "text": "📂 Volver al Archivo de Capítulos",
        "hint": ""
      }
    ]
  },
  {
    "id": "aiko_intimate_climax",
    "cat": "choices",
    "badge": "🔀 Decisión 15 (Clímax Aiko)",
    "badgeClass": "choices",
    "title": "Lienzo de Cuerpos al Atardecer con Aiko: Hacia el Final",
    "desc": "Aiko e Hisao funden arte y pasión sobre el lienzo en el taller.",
    "fullSummary": "En el taller de pintura bañado por la luz dorada, Aiko e Hisao crean su mayor obra de amor, avanzando hacia el Gran Final Verdadero de Aiko.",
    "location": "Taller de pintura de Yamaku",
    "charsPreview": "🎨 Aiko, 👤 Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_rin_artclass.jpg",
    "options": [
      {
        "next": "ending_aiko_true",
        "text": "🏆 Despertar hacia el Gran Final de Aiko",
        "hint": ""
      },
      {
        "next": "act2_branching_crossroad",
        "text": "📂 Volver al Archivo de Capítulos",
        "hint": ""
      }
    ]
  },
  {
    "id": "shizu_intimate_climax",
    "cat": "choices",
    "badge": "🔀 Decisión 16 (Clímax Shizune)",
    "badgeClass": "choices",
    "title": "Rendición de la Presidenta Shizune: Hacia el Final",
    "desc": "Shizune se entrega con pasión en el sofá de cuero del despacho.",
    "fullSummary": "En la intimidad del consejo estudiantil, la implacable líder de Yamaku revela su amor incondicional, abriendo paso al Gran Final Verdadero.",
    "location": "Despacho del Consejo Estudiantil",
    "charsPreview": "♟️ Shizune, 👤 Hisao",
    "characters": [
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cgs/cg_shizu_undressing.jpg",
    "options": [
      {
        "next": "ending_true_miracle",
        "text": "🏆 Despertar hacia el Gran Final de Shizune",
        "hint": ""
      },
      {
        "next": "act2_branching_crossroad",
        "text": "📂 Volver al Archivo de Capítulos",
        "hint": ""
      }
    ]
  },
  {
    "id": "start",
    "cat": "prologue",
    "badge": "❄️ Prólogo 1",
    "badgeClass": "prologue",
    "title": "El Invierno del Silencio (¡Comienzo Absoluto!)",
    "desc": "La carta en el bolsillo, el parque nevado y el primer paro cardíaco de Hisao.",
    "fullSummary": "Bajo los cerezos cubiertos de nieve invernal, Hisao camina junto a Iwanako con una carta doblada con esmero. De pronto, un dolor asfixiante perfora su pecho y su corazón tropieza, cayendo sobre la nieve blanca.",
    "location": "Parque nevado de la ciudad",
    "charsPreview": "👤 Hisao (1ª Vez), 💌 Iwanako",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      },
      {
        "name": "Iwanako",
        "icon": "💌"
      }
    ],
    "bg": "img/ks_op_snowywoods.jpg"
  },
  {
    "id": "prologue_hospital",
    "cat": "prologue",
    "badge": "🏥 Prólogo 2",
    "badgeClass": "prologue",
    "title": "La Habitación Blanca (El Diagnóstico)",
    "desc": "Meses postrado en cama, arritmia severa y el folleto de la Academia Yamaku.",
    "fullSummary": "Hisao despierta con el pitido monótono del monitor cardíaco. Los médicos le diagnostican arritmia severa. Tras meses de soledad viendo cambiar las estaciones a través del cristal, el doctor le entrega el folleto de Yamaku.",
    "location": "Hospital Central (Habitación 302)",
    "charsPreview": "👤 Hisao, 🩺 Doctor Jefe",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      },
      {
        "name": "Doctor",
        "icon": "🩺"
      }
    ],
    "bg": "img/ks_hosp_room.jpg"
  },
  {
    "id": "act1_yamaku_gate",
    "cat": "prologue",
    "badge": "🏫 Acto I - Cap. 1",
    "badgeClass": "prologue",
    "title": "Las Puertas de Yamaku (Llegada al Instituto)",
    "desc": "La subida por la colina flanqueada de cerezos hacia las puertas de hierro.",
    "fullSummary": "Hisao asciende la empinada cuesta con sus maletas hasta las imponentes puertas de hierro de Yamaku. Una mezcla de ansiedad, curiosidad e incertidumbre da inicio a su nueva vida.",
    "location": "Puerta principal de Yamaku",
    "charsPreview": "👤 Hisao",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_gate.jpg"
  },
  {
    "id": "act1_hallway_meeting",
    "cat": "prologue",
    "badge": "⭐ 1ª APARICIÓN",
    "badgeClass": "prologue",
    "title": "El Choque en el Pasillo (¡Sora, Shizune y Shiina!)",
    "desc": "Colisión a toda velocidad con Sora y la intervención del Consejo Estudiantil.",
    "fullSummary": "Buscando la sala de profesores, Hisao colisiona fuertemente en el corredor con Sora (chica atlética con prótesis para correr). Aparecen de inmediato Shiina y la estricta presidenta Shizune en lenguaje de señas.",
    "location": "Pasillo del 2º piso de Yamaku",
    "charsPreview": "🏃 Sora (1ª Vez), ♟️ Shizune (1ª Vez), ✨ Shiina (1ª Vez)",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_hallway.jpg"
  },
  {
    "id": "act1_dorm_kenji",
    "cat": "prologue",
    "badge": "👓 1ª APARICIÓN",
    "badgeClass": "prologue",
    "title": "El Vecino del Búnker (¡Kenji, el chico de lentes!)",
    "desc": "Encuentro en los dormitorios con Kenji, prismáticos y teorías de conspiración.",
    "fullSummary": "Al instalarse en su habitación de la residencia masculina, Hisao conoce a su estrafalario vecino de gafas gruesas: Kenji Setou. Kenji le habla de sus teorías de conspiración, vigilancia con prismáticos y provisiones enlatadas.",
    "location": "Dormitorios masculinos (Hab. 203 y 204)",
    "charsPreview": "👓 Kenji (1ª Vez - El chico de lentes), 👤 Hisao",
    "characters": [
      {
        "name": "Kenji",
        "icon": "👓"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_dormhisao.jpg"
  },
  {
    "id": "tues_seq_1",
    "cat": "prologue",
    "badge": "📅 Martes - Cap. 4",
    "badgeClass": "prologue",
    "title": "El Aula & El Maestro con el Puntero",
    "desc": "Discusión sobre comida frita hasta que el maestro golpea su puntero como una porra.",
    "fullSummary": "En plena clase, Shiina y Shizune debaten con entusiasmo sobre qué comida vender en el festival escolar, hasta que el severo profesor carraspea golpeando fuertemente su alargado puntero de madera.",
    "location": "Aula 3-3 de Yamaku",
    "charsPreview": "✨ Shiina, ♟️ Shizune, 👨‍🏫 Maestro, 👤 Hisao",
    "characters": [
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_art_room.jpg"
  },
  {
    "id": "tues_seq_7",
    "cat": "prologue",
    "badge": "🌸 1ª APARICIÓN",
    "badgeClass": "prologue",
    "title": "El Salón de Té (¡Elena, la chica del té!)",
    "desc": "Descubrimiento del rincón de té inglés y primer contacto con la refinada Elena.",
    "fullSummary": "Hisao descubre un salón privado impregnado de aroma a flores y bergamota. Allí conoce a Elena, una alumna invidente de modales aristocráticos que le brinda una cálida bienvenida y una taza de té.",
    "location": "Salón de Té privado",
    "charsPreview": "🌸 Elena (1ª Vez - Chica elegante), 👤 Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_dormlilly.jpg"
  },
  {
    "id": "tues_seq_8",
    "cat": "prologue",
    "badge": "👨‍🏫 1ª APARICIÓN",
    "badgeClass": "prologue",
    "title": "Laboratorio de Ciencias (Profesor Mutou)",
    "desc": "Encuentro con el desaliñado pero sabio profesor de ciencias Mutou.",
    "fullSummary": "Rodeado de probetas y pizarras con ecuaciones químicas, el profesor Mutou orienta a Hisao sobre su incorporación y las precauciones médicas que debe mantener.",
    "location": "Laboratorio de Ciencias",
    "charsPreview": "👨‍🏫 Prof. Mutou (1ª Vez), 👤 Hisao",
    "characters": [
      {
        "name": "Mutou",
        "icon": "👨‍🏫"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_art_room.jpg"
  },
  {
    "id": "tues_seq_10",
    "cat": "prologue",
    "badge": "📚 1ª APARICIÓN",
    "badgeClass": "prologue",
    "title": "La Biblioteca Oculta (¡Yumi & Yuuko!)",
    "desc": "El laberinto de estanterías en silencio, la tímida Yumi y la bibliotecaria Yuuko.",
    "fullSummary": "Hisao busca refugio en la enorme biblioteca de Yamaku. Entre pasillos en penumbra divisa a Yumi, una chica solitaria con cicatrices que lee absorta, y saluda a la nerviosa asistente Yuuko.",
    "location": "Biblioteca central de Yamaku",
    "charsPreview": "📚 Yumi (1ª Vez), 📖 Yuuko (1ª Vez), 👤 Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Yuuko",
        "icon": "📖"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_library.jpg"
  },
  {
    "id": "wed_seq_1",
    "cat": "prologue",
    "badge": "♟️ Miércoles",
    "badgeClass": "prologue",
    "title": "La Estrategia del Consejo Estudiantil",
    "desc": "Debate riguroso con Shizune y Shiina organizando los turnos del festival.",
    "fullSummary": "Shizune despliega planos y tablas horarias con disciplina férrea, exigiendo máxima puntualidad mientras Shiina traduce alegremente cada uno de sus gestos.",
    "location": "Sala del Consejo Estudiantil",
    "charsPreview": "♟️ Shizune, ✨ Shiina, 👤 Hisao",
    "characters": [
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_council.jpg"
  },
  {
    "id": "wed_seq_4",
    "cat": "prologue",
    "badge": "🏃 Miércoles Pista",
    "badgeClass": "prologue",
    "title": "El Viento en la Pista de Atletismo (Sora)",
    "desc": "Entrenamiento matutino con Sora, el sonido de las zancadas y el espíritu deportivo.",
    "fullSummary": "En la pista de atletismo, Sora corre con ligereza sobre sus prótesis elásticas. Invita a Hisao a acompañarla y le demuestra que los límites físicos no frenan los sueños.",
    "location": "Pista deportiva de Yamaku",
    "charsPreview": "🏃 Sora, 👤 Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_track_day.jpg"
  },
  {
    "id": "thur_seq_1",
    "cat": "prologue",
    "badge": "🎨 1ª APARICIÓN",
    "badgeClass": "prologue",
    "title": "El Taller de Arte (¡Aiko & Prof. Nomiya!)",
    "desc": "Pintura al óleo, lienzos abstractos y la primera conversación profunda con Aiko.",
    "fullSummary": "Con la luz dorada entrando por los ventanales del taller, Hisao contempla a Aiko pintando sin brazos con una destreza cautivadora, mientras el profesor Nomiya elogia su pasión pictórica.",
    "location": "Taller de Arte de Yamaku",
    "charsPreview": "🎨 Aiko (1ª Vez), 👨‍🎨 Prof. Nomiya, 👤 Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_art_room.jpg"
  },
  {
    "id": "fri_seq_3",
    "cat": "prologue",
    "badge": "🩺 Viernes Salud",
    "badgeClass": "prologue",
    "title": "La Enfermería & El Chequeo del Corazón",
    "desc": "El carismático enfermero revisa la medicación de Hisao y su pulso cardíaco.",
    "fullSummary": "Hisao acude a su chequeo regular en la enfermería. El enfermero de Yamaku, con tono amigable y directo, le recuerda cuidar de sí mismo y disfrutar su juventud sin temerle a cada latido.",
    "location": "Enfermería de Yamaku",
    "charsPreview": "🩺 El Enfermero (1ª Vez), 👤 Hisao",
    "characters": [
      {
        "name": "Enfermero",
        "icon": "🩺"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_nurse_office.jpg"
  },
  {
    "id": "sat_seq_1",
    "cat": "prologue",
    "badge": "🎪 Sábado Festival",
    "badgeClass": "prologue",
    "title": "¡El Festival Escolar en Pleno Apogeo!",
    "desc": "Luces, banderines, puestos de comida y reencuentro con todas las chicas.",
    "fullSummary": "Yamaku abre sus puertas a toda la ciudad. Entre risas, aromas a dulces y música alegre, Hisao recorre los puestos junto a las chicas en una tarde mágica que quedará grabada en su corazón.",
    "location": "Patio y Pasillos del Festival",
    "charsPreview": "Todas las heroínas de Yamaku",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Shiina",
        "icon": "✨"
      }
    ],
    "bg": "img/ks_courtyard.jpg"
  },
  {
    "id": "sun_seq_10",
    "cat": "prologue",
    "badge": "🌙 Domingo Clímax",
    "badgeClass": "prologue",
    "title": "Las Sombras tras el Festival & La Decisión",
    "desc": "La noche silenciosa de Yamaku y el momento de dar el paso decisivo.",
    "fullSummary": "Las luces del festival se extinguieron y los pasillos quedaron en penumbra. Bajo las estrellas, Hisao comprende que el tiempo de observar ha terminado: debe elegir a quién entregará su corazón.",
    "location": "Jardín nocturno de Yamaku",
    "charsPreview": "👤 Hisao",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_courtyard_night.jpg"
  },
  {
    "id": "act2_branching_crossroad",
    "cat": "prologue",
    "badge": "🔀 Acto II - Decisión",
    "badgeClass": "prologue",
    "title": "La Encrucijada de las Sombras (¡Menú de Rutas!)",
    "desc": "Pantalla interactiva de decisión: elige qué heroína o misterio acompañar.",
    "fullSummary": "El menú principal de ramificación del juego: elige libremente seguir la ruta de Sora en la pista, Yumi en la biblioteca, Elena en el salón de té, Aiko en el taller, Shizune en el consejo, Kenji en su búnker o viajar a la Playa.",
    "location": "Patio Central de Yamaku",
    "charsPreview": "6 Rutas de Heroína + Búnker + Playa",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Kenji",
        "icon": "👓"
      }
    ],
    "bg": "img/ks_courtyard.jpg"
  },
  {
    "id": "sora_seq_1",
    "cat": "routes",
    "badge": "🏃 Ruta Sora I",
    "badgeClass": "routes",
    "title": "Ruta Sora: Amanecer en la Pista de Atletismo",
    "desc": "Velocidad, confesiones sobre el tartán y el ritmo compartido de dos corazones.",
    "fullSummary": "Hisao madruga para entrenar junto a Sora. Entre la neblina matutina y el sonido rítmico de sus pasos, Sora le confiesa sus miedos a quedarse atrás y la alegría que siente cuando corren juntos.",
    "location": "Pista deportiva de Yamaku",
    "charsPreview": "🏃 Sora, 👤 Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_track_day.jpg"
  },
  {
    "id": "sora_seq_10",
    "cat": "routes",
    "badge": "🏃 Ruta Sora II",
    "badgeClass": "routes",
    "title": "Ruta Sora: Rompiendo la Barrera del Viento",
    "desc": "Superación, la carrera definitiva y una promesa bajo los cerezos.",
    "fullSummary": "Tras vencer dudas e inseguridades, Sora corre con todas sus fuerzas sabiendo que Hisao la espera en la meta. Un abrazo lleno de emoción sella su amor verdadero.",
    "location": "Meta de la Pista de Atletismo",
    "charsPreview": "🏃 Sora, 👤 Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_track_day.jpg"
  },
  {
    "id": "yumi_seq_1",
    "cat": "routes",
    "badge": "📚 Ruta Yumi I",
    "badgeClass": "routes",
    "title": "Ruta Yumi: Tertulia de Té & La Casa Shanghái",
    "desc": "Superando la timidez en la biblioteca y un café a solas en la ciudad.",
    "fullSummary": "Hisao logra que Yumi baje las defensas que ocultan sus quemaduras. Juntos comparten un libro de poesía y deciden dar un paseo por la cafetería de la ciudad.",
    "location": "Biblioteca & Cafetería Shanghái",
    "charsPreview": "📚 Yumi, 👤 Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_library.jpg"
  },
  {
    "id": "yumi_seq_10",
    "cat": "routes",
    "badge": "📚 Ruta Yumi II",
    "badgeClass": "routes",
    "title": "Ruta Yumi: Perdiendo el Miedo al Espejo",
    "desc": "Aceptación, caricias tiernas y el florecer de una hermosa sonrisa.",
    "fullSummary": "En la intimidad de un rincón seguro, Hisao toma suavemente la mano de Yumi y le demuestra que su belleza interior y exterior van mucho más allá de cualquier marca del pasado.",
    "location": "Jardín privado de Yamaku",
    "charsPreview": "📚 Yumi, 👤 Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_library.jpg"
  },
  {
    "id": "elena_seq_1",
    "cat": "routes",
    "badge": "🌸 Ruta Elena I",
    "badgeClass": "routes",
    "title": "Ruta Elena: El Sonido del Viento en el Salón",
    "desc": "Té Earl Grey, historias de Escocia y la dulce melodía del violín.",
    "fullSummary": "Elena deleita a Hisao con anécdotas de su infancia en Escocia mientras la música suave inunda el salón. Hisao descubre la tremenda fuerza interior que oculta tras su serenidad.",
    "location": "Salón de Té privado de Elena",
    "charsPreview": "🌸 Elena, 👤 Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_dormlilly.jpg"
  },
  {
    "id": "elena_seq_10",
    "cat": "routes",
    "badge": "🌸 Ruta Elena II",
    "badgeClass": "routes",
    "title": "Ruta Elena: Lazos Profundos sin Necesidad de Vista",
    "desc": "La decisión del viaje a Escocia y un pacto de amor incondicional.",
    "fullSummary": "A pesar de la inminente partida hacia el extranjero, Elena y Hisao reafirman que la distancia física jamás romperá el vínculo indestructible que han forjado.",
    "location": "Mirador de Yamaku al atardecer",
    "charsPreview": "🌸 Elena, 👤 Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_dormlilly.jpg"
  },
  {
    "id": "aiko_seq_1",
    "cat": "routes",
    "badge": "🎨 Ruta Aiko I",
    "badgeClass": "routes",
    "title": "Ruta Aiko: El Lienzo Invisible en el Taller",
    "desc": "Pinceladas apasionadas, mezclas de colores y la búsqueda del significado del arte.",
    "fullSummary": "Aiko le pide a Hisao que sea su asistente y modelo de inspiración. Entre manchas de pintura y reflexiones poéticas, ambos conectan de una manera única y conmovedora.",
    "location": "Taller de Pintura de Yamaku",
    "charsPreview": "🎨 Aiko, 👤 Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_art_room.jpg"
  },
  {
    "id": "aiko_seq_10",
    "cat": "routes",
    "badge": "🎨 Ruta Aiko II",
    "badgeClass": "routes",
    "title": "Ruta Aiko: Colores que Desafían al Mundo",
    "desc": "La gran galería, el faro frente al mar y un amor nacido de la creatividad pura.",
    "fullSummary": "Bajo la luz del atardecer costero, Aiko completa su obra maestra dedicada a Hisao: un cuadro que refleja el latido de dos almas que se entienden sin necesidad de palabras.",
    "location": "Faro de la Costa",
    "charsPreview": "🎨 Aiko, 👤 Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_art_room.jpg"
  },
  {
    "id": "shizu_seq_1",
    "cat": "routes",
    "badge": "♟️ Ruta Shizune I",
    "badgeClass": "routes",
    "title": "Ruta Shizune: Batalla de Voluntades en el Consejo",
    "desc": "Partidas de cartas, estrategia implacable y el descubrimiento de su ternura.",
    "fullSummary": "Shizune desafía a Hisao en una serie de duelos tácticos. A través del juego y la complicidad de Shiina, Hisao descubre el peso de la responsabilidad que la presidenta carga sobre sus hombros.",
    "location": "Despacho del Consejo Estudiantil",
    "charsPreview": "♟️ Shizune, ✨ Shiina, 👤 Hisao",
    "characters": [
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_council.jpg"
  },
  {
    "id": "shizu_seq_10",
    "cat": "routes",
    "badge": "♟️ Ruta Shizune II",
    "badgeClass": "routes",
    "title": "Ruta Shizune: El Corazón Oculto de la Presidenta",
    "desc": "Lágrimas de alivio, la verdad revelada y una alianza para siempre.",
    "fullSummary": "Shizune baja la guardia por primera vez en su vida. En un emotivo gesto sincero, le agradece a Hisao por haber creído en ella y sellan un pacto de respeto y amor mutuo.",
    "location": "Terraza de Yamaku bajo las estrellas",
    "charsPreview": "♟️ Shizune, 👤 Hisao",
    "characters": [
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_council.jpg"
  },
  {
    "id": "ending_kenji_bunker",
    "cat": "mystery",
    "badge": "👓 Búnker de Kenji",
    "badgeClass": "mystery",
    "title": "Atrincherado en la Habitación 204 con Kenji",
    "desc": "Prismáticos, comida enlatada, teorías delirantes y la salvación de la paranoia.",
    "fullSummary": "Hisao decide ignorar todo y encerrarse con Kenji en su búnker de la habitación 204. Con mapas repletos de chinchetas y cajas de raciones de emergencia, Kenji celebra haber rescatado a su colega del supuesto peligro exterior.",
    "location": "Habitación 204 (El Búnker Secreto de Kenji)",
    "charsPreview": "👓 Kenji Setou (El chico de lentes), 👤 Hisao",
    "characters": [
      {
        "name": "Kenji",
        "icon": "👓"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_dormhisao.jpg"
  },
  {
    "id": "timeloop_train_awakening",
    "cat": "mystery",
    "badge": "🌀 Bucle Temporal",
    "badgeClass": "mystery",
    "title": "El Vagón del Tiempo & El Despertar",
    "desc": "El tintineo del tren en la penumbra, memorias recurrentes y el reinicio del ciclo.",
    "fullSummary": "El traqueteo hipnótico de las vías despierta a Hisao en un vagón solitario. Los reflejos en el cristal le revelan que ha vivido todo esto antes y que el destino le concede una oportunidad de corregirlo.",
    "location": "Vagón del Ferrocarril al Atardecer",
    "charsPreview": "👤 Hisao en solitario",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_city_station.jpg"
  },
  {
    "id": "ddlc_reality_crack",
    "cat": "mystery",
    "badge": "⚠️ Glitch DDLC",
    "badgeClass": "mystery",
    "title": "La Grieta en el Código (Metaficción y Ruptura)",
    "desc": "Pantalla distorsionada, ruido estático y una entidad digital hablándote directamente.",
    "fullSummary": "Las paredes de Yamaku parpadean como datos corruptos. Un glitch sonoro recorre los altavoces y una silueta espectral rompe la cuarta pared, cuestionando la naturaleza de la realidad y tus decisiones.",
    "location": "Espacio Liminal Distorsionado",
    "charsPreview": "Entidad Digital Misteriosa, Hisao",
    "characters": [
      {
        "name": "Monika",
        "icon": "🎀"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_courtyard_night.jpg"
  },
  {
    "id": "timeloop_knowledge_choices",
    "cat": "mystery",
    "badge": "⏳ Acto V - Clímax",
    "badgeClass": "mystery",
    "title": "La Elección del Destino Corregido",
    "desc": "Con el conocimiento del bucle temporal, elige el destino supremo para salvarlas.",
    "fullSummary": "Hisao regresa a las puertas de Yamaku con la experiencia acumulada de todas sus vidas pasadas. Desde esta pantalla final puede elegir salvar a Sora, Yumi, Elena, Aiko, atrincherarse con Kenji o quebrar el código.",
    "location": "Entrada principal de Yamaku",
    "charsPreview": "Todas las sendas de redención",
    "characters": [
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/ks_school_gate.jpg"
  },
  {
    "id": "ending_sora_true",
    "cat": "endings",
    "badge": "🏆 Final Sora",
    "badgeClass": "endings",
    "title": "Desenlace de Sora: Romper la Barrera del Viento",
    "desc": "El final feliz junto a Sora y el triunfo del amor sobre cualquier límite.",
    "fullSummary": "Sora y Hisao se toman de las manos en la pista de atletismo. El futuro se abre ante ellos como una carrera llena de luz y esperanza compartida.",
    "location": "Yamaku Athletics Stadium",
    "charsPreview": "🏃 Sora & Hisao",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cg_ending_sora.png"
  },
  {
    "id": "ending_yumi_true",
    "cat": "endings",
    "badge": "🏆 Final Yumi",
    "badgeClass": "endings",
    "title": "Desenlace de Yumi: La Flor Renacida",
    "desc": "El florecer de Yumi al sol y el comienzo de una vida sin sombras.",
    "fullSummary": "En el jardín de cerezos, Yumi sonríe con confianza absoluta mientras el viento cálido acaricia su rostro, encontrando la paz y el amor que siempre mereció.",
    "location": "Jardines de Yamaku",
    "charsPreview": "📚 Yumi & Hisao",
    "characters": [
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cg_ending_yumi.png"
  },
  {
    "id": "ending_elena_true",
    "cat": "endings",
    "badge": "🏆 Final Elena",
    "badgeClass": "endings",
    "title": "Desenlace de Elena: Las Campanas de Escocia",
    "desc": "El viaje prometido y un amor sincero que trasciende fronteras.",
    "fullSummary": "Las campanas resuenan en la distancia. Elena sostiene el brazo de Hisao mientras contemplan juntos el horizonte de su nueva vida en común.",
    "location": "Mirador de Escocia",
    "charsPreview": "🌸 Elena & Hisao",
    "characters": [
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cg_ending_elena.png"
  },
  {
    "id": "ending_aiko_true",
    "cat": "endings",
    "badge": "🏆 Final Aiko",
    "badgeClass": "endings",
    "title": "Desenlace de Aiko: Los Colores del Alma",
    "desc": "El amanecer en el faro y la comunión artística de dos corazones.",
    "fullSummary": "El sol naciente tiñe el océano de tonos violetas y dorados. Aiko y Hisao contemplan el lienzo terminado, encontrando en su abrazo el verdadero sentido de la existencia.",
    "location": "Faro Costero al Amanecer",
    "charsPreview": "🎨 Aiko & Hisao",
    "characters": [
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Hisao",
        "icon": "👤"
      }
    ],
    "bg": "img/cg_ending_aiko.png"
  },
  {
    "id": "ending_true_miracle",
    "cat": "endings",
    "badge": "⭐ Final Verdadero",
    "badgeClass": "endings",
    "title": "El Gran Final Verdadero: El Milagro de Yamaku",
    "desc": "La verdad proclamada ante toda la academia y el triunfo colectivo.",
    "fullSummary": "Unidos junto al Consejo Estudiantil, Hisao y las chicas transforman para siempre el destino de Yamaku en una celebración inolvidable de vida, coraje y gratitud.",
    "location": "Auditorio Principal de Yamaku",
    "charsPreview": "Todas las heroínas de Yamaku",
    "characters": [
      {
        "name": "Sora",
        "icon": "🏃"
      },
      {
        "name": "Elena",
        "icon": "🌸"
      },
      {
        "name": "Yumi",
        "icon": "📚"
      },
      {
        "name": "Aiko",
        "icon": "🎨"
      },
      {
        "name": "Shizune",
        "icon": "♟️"
      },
      {
        "name": "Shiina",
        "icon": "✨"
      },
      {
        "name": "Kenji",
        "icon": "👓"
      }
    ],
    "bg": "img/cg_ending_true_miracle.png"
  }
];

  // ============================================================
  //  SISTEMA DE DESBLOQUEO DE ESPECIALES VIP CON MONEDAS
  // ============================================================
  function getUnlockedSpecials() {
    try {
      var raw = localStorage.getItem("pocketgirl_unlocked_specials");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function isSpecialUnlocked(id) {
    var list = getUnlockedSpecials();
    return list.indexOf(id) >= 0;
  }

  function unlockSpecial(id, cost, onUnlocked) {
    var c = getCoins();
    if (c < cost) {
      showCoinsAlert();
      return false;
    }
    var spent = spendCoins(cost);
    if (!spent) {
      showCoinsAlert();
      return false;
    }
    try {
      var list = getUnlockedSpecials();
      if (list.indexOf(id) === -1) {
        list.push(id);
        localStorage.setItem("pocketgirl_unlocked_specials", JSON.stringify(list));
      }
    } catch (e) {}
    updateCoinsDisplay();
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.unlockAchievement === "function") {
        if (id.indexOf("choice") >= 0 || id.indexOf("decision") >= 0 || id.indexOf("tues_seq") >= 0) {
          window.AndroidBridge.unlockAchievement("ach_decision_made");
        } else if (id.indexOf("beach") >= 0 || id.indexOf("vip") >= 0 || id.indexOf("pool") >= 0) {
          window.AndroidBridge.unlockAchievement("ach_beach_special");
        }
      }
    } catch (e) {}
    flashToast("🎉 ¡Especial VIP desbloqueado permanentemente!");
    if (typeof onUnlocked === "function") {
      onUnlocked();
    }
    return true;
  }

  function openChaptersModal() {
    if (!chaptersModal) return;
    renderChaptersList("all");
    chaptersModal.classList.remove("hidden");
  }

  function closeChaptersModal() {
    if (!chaptersModal) return;
    chaptersModal.classList.add("hidden");
  }

  function renderChaptersList(filter) {
    if (!chaptersGrid) return;
    chaptersGrid.innerHTML = "";

    var items = CHAPTERS_CATALOGUE.filter(function (item) {
      if (!filter || filter === "all") return true;
      return item.cat === filter;
    });

    items.forEach(function (ch) {
      var card = document.createElement("div");
      card.className = "chapter-item-card";
      card.id = "ch-card-" + ch.id;

      // Cabecera interactiva
      var cardHeader = document.createElement("div");
      cardHeader.className = "chapter-card-header";

      var thumbWrap = document.createElement("div");
      thumbWrap.className = "chapter-thumb-wrap";
      var thumbImg = document.createElement("img");
      thumbImg.className = "chapter-thumb-img";
      thumbImg.src = ch.bg || "img/ks_courtyard.jpg";
      thumbImg.alt = ch.title;
      thumbImg.onerror = function () {
        this.src = "img/ks_courtyard.jpg";
      };
      var thumbOverlay = document.createElement("div");
      thumbOverlay.className = "chapter-thumb-overlay";
      thumbWrap.appendChild(thumbImg);
      thumbWrap.appendChild(thumbOverlay);

      var mainInfo = document.createElement("div");
      mainInfo.className = "chapter-main-info";

      // Requerir 100 monedas para decisiones ("choices") o el costo especial
      var isChoice = (ch.cat === "choices");
      var itemCost = isChoice ? 100 : (ch.cost || 0);
      var requiresUnlock = (itemCost > 0);
      var isUnlocked = !requiresUnlock || isSpecialUnlocked(ch.id);

      var chTitle = (state.localeData && state.localeData.chapters && state.localeData.chapters[ch.id]) || ch.title;

      var badgeRow = document.createElement("div");
      badgeRow.className = "chapter-item-header";
      var badge = document.createElement("span");
      badge.className = "chapter-item-badge " + (ch.badgeClass || (isChoice ? "choices" : "prologue"));
      if (requiresUnlock) {
        if (isUnlocked) {
          badge.textContent = isChoice ? ("✅ " + getUiText("decision_unlocked", "Decisión Desbloqueada")) : ("✨ " + getUiText("vip_unlocked", "VIP Desbloqueado"));
        } else {
          badge.textContent = isChoice ? ("🔀 " + getUiText("decision_badge", "Decisión") + " · 100 🪙") : ("🔒 " + itemCost + " 🪙");
        }
      } else {
        badge.textContent = ch.badge;
      }
      badgeRow.appendChild(badge);

      var title = document.createElement("h4");
      title.className = "chapter-item-title";
      title.textContent = chTitle;

      var previewMeta = document.createElement("div");
      previewMeta.className = "chapter-preview-meta";
      previewMeta.innerHTML = "<span>📍 " + (ch.location || "Yamaku") + "</span>" +
                              "<span>👥 " + (ch.charsPreview || "Personajes") + "</span>";

      mainInfo.appendChild(badgeRow);
      mainInfo.appendChild(title);
      mainInfo.appendChild(previewMeta);

      var directJumpBtn = document.createElement("button");
      directJumpBtn.setAttribute("type", "button");
      if (requiresUnlock && !isUnlocked) {
        directJumpBtn.className = "chapter-unlock-btn";
        directJumpBtn.innerHTML = "<span>🔒</span> " + itemCost + " 🪙";
        directJumpBtn.title = isChoice ? getUiText("unlock_decision_btn", "Desbloquear Decisión (100 Monedas)") : getUiText("unlock_special_btn", "Desbloquear Especial (" + itemCost + " Monedas)");
        directJumpBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          unlockSpecial(ch.id, itemCost, function () {
            renderChaptersList(filter);
            jumpToChapter(ch.id, chTitle, 0);
          });
        });
      } else {
        directJumpBtn.className = "chapter-direct-jump-btn";
        directJumpBtn.innerHTML = "<span>▶</span> " + getUiText("play_btn", "Jugar");
        directJumpBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          jumpToChapter(ch.id, chTitle, 0);
        });
      }

      // Tocar la miniatura también salta directamente o desbloquea
      thumbWrap.style.cursor = "pointer";
      thumbWrap.title = (requiresUnlock && !isUnlocked) ? (isChoice ? getUiText("unlock_decision_btn", "Desbloquear Decisión (100 Monedas)") : ("Desbloquear por " + itemCost + " monedas")) : ("▶ " + getUiText("play_btn", "Jugar"));
      thumbWrap.addEventListener("click", function (e) {
        e.stopPropagation();
        if (requiresUnlock && !isUnlocked) {
          unlockSpecial(ch.id, itemCost, function () {
            renderChaptersList(filter);
            jumpToChapter(ch.id, chTitle, 0);
          });
        } else {
          jumpToChapter(ch.id, chTitle, 0);
        }
      });

      var toggleBtn = document.createElement("button");
      toggleBtn.className = "chapter-toggle-btn";
      toggleBtn.setAttribute("type", "button");
      toggleBtn.setAttribute("aria-label", "Ver detalles");
      toggleBtn.innerHTML = "<span class='toggle-arrow'>▼</span>";

      cardHeader.appendChild(thumbWrap);
      cardHeader.appendChild(mainInfo);
      cardHeader.appendChild(directJumpBtn);
      cardHeader.appendChild(toggleBtn);

      // Panel desplegable acordeón
      var dropPanel = document.createElement("div");
      dropPanel.className = "chapter-dropdown-panel hidden";

      var summaryBox = document.createElement("div");
      summaryBox.className = "chapter-summary-box";
      summaryBox.innerHTML = "<div class='summary-tag'>" + getUiText("where_story_left", "📖 ¿Dónde quedó la historia?") + "</div>" +
                             "<p class='summary-text'>" + (ch.fullSummary || ch.desc) + "</p>";
      dropPanel.appendChild(summaryBox);

      if (ch.characters && ch.characters.length > 0) {
        var charTags = document.createElement("div");
        charTags.className = "chapter-char-tags";
        var charHtml = "<span class='meta-label'>" + getUiText("on_scene", "En escena:") + "</span> ";
        ch.characters.forEach(function (c) {
          charHtml += "<span class='char-chip'>" + c.icon + " " + c.name + "</span> ";
        });
        charTags.innerHTML = charHtml;
        dropPanel.appendChild(charTags);
      }

      // Si es una encrucijada de decisiones, mostrar la lista interactiva de opciones
      if (ch.options && ch.options.length > 0) {
        var choiceBox = document.createElement("div");
        choiceBox.className = "chapter-choice-box";
        choiceBox.innerHTML = "<div class='summary-tag'>" + getUiText("choices_at_crossroad", "🔀 Opciones en esta encrucijada ({n}):").replace("{n}", ch.options.length) + "</div>";
        var optsList = document.createElement("div");
        optsList.className = "chapter-choice-options-list";
        ch.options.forEach(function (opt, idx) {
          var optCard = document.createElement("div");
          optCard.className = "chapter-choice-option-card";
          optCard.innerHTML = "<div class='chapter-choice-opt-title'><b>" + (idx + 1) + ".</b> " + (opt.text || "Opción") + "</div>" +
                              (opt.hint ? ("<div class='chapter-choice-opt-dest'>💡 " + opt.hint + "</div>") : "");
          optCard.title = "Saltar directamente a esta encrucijada";
          optCard.addEventListener("click", function (e) {
            e.stopPropagation();
            if (requiresUnlock && !isUnlocked) {
              unlockSpecial(ch.id, itemCost, function () {
                renderChaptersList(filter);
                jumpToChapter(ch.id, chTitle, 0);
              });
            } else {
              jumpToChapter(ch.id, chTitle, 0);
            }
          });
          optsList.appendChild(optCard);
        });
        choiceBox.appendChild(optsList);
        dropPanel.appendChild(choiceBox);
      }

      var actionRow = document.createElement("div");
      actionRow.className = "chapter-action-row";

      // Botón en acordeón (Desbloqueo o Jugar)
      var btnJump = document.createElement("button");
      if (requiresUnlock && !isUnlocked) {
        btnJump.className = "chapter-unlock-btn";
        btnJump.style.width = "100%";
        btnJump.style.justifyContent = "center";
        btnJump.style.padding = "10px 14px";
        btnJump.innerHTML = "<span>🔒</span> " + (isChoice ? getUiText("unlock_decision_btn", "Desbloquear Decisión (100 Monedas)") : getUiText("unlock_special_btn", "Desbloquear Especial VIP (" + itemCost + " Monedas)").replace("{n}", itemCost));
        btnJump.addEventListener("click", function (e) {
          e.stopPropagation();
          unlockSpecial(ch.id, itemCost, function () {
            renderChaptersList(filter);
            jumpToChapter(ch.id, chTitle, 0);
          });
        });
      } else {
        btnJump.className = "chapter-jump-btn";
        btnJump.innerHTML = "<span>▶</span> " + getUiText("start_from_beginning", "Iniciar capítulo desde el principio");
        btnJump.addEventListener("click", function (e) {
          e.stopPropagation();
          jumpToChapter(ch.id, chTitle, 0);
        });
      }
      actionRow.appendChild(btnJump);

      // Botón especial: Salto directo a la escena clave
      if (ch.keyMomentLine !== undefined && ch.keyMomentTitle) {
        var btnKeyJump = document.createElement("button");
        btnKeyJump.className = "chapter-key-jump-btn";
        btnKeyJump.innerHTML = ch.keyMomentTitle;
        btnKeyJump.addEventListener("click", function (e) {
          e.stopPropagation();
          jumpToChapter(ch.id, ch.title, ch.keyMomentLine);
        });
        actionRow.appendChild(btnKeyJump);
      }

      dropPanel.appendChild(actionRow);

      // Desplegar / Colapsar al hacer clic en el texto o flecha de la cabecera
      cardHeader.addEventListener("click", function () {
        var isExpanded = !dropPanel.classList.contains("hidden");
        var allPanels = chaptersGrid.querySelectorAll(".chapter-dropdown-panel");
        var allCards = chaptersGrid.querySelectorAll(".chapter-item-card");
        var allArrows = chaptersGrid.querySelectorAll(".toggle-arrow");

        allPanels.forEach(function (p) { p.classList.add("hidden"); });
        allCards.forEach(function (c) { c.classList.remove("expanded"); });
        allArrows.forEach(function (a) { a.classList.remove("rotated"); });

        if (!isExpanded) {
          dropPanel.classList.remove("hidden");
          card.classList.add("expanded");
          toggleBtn.querySelector(".toggle-arrow").classList.add("rotated");
        }
      });

      card.appendChild(cardHeader);
      card.appendChild(dropPanel);
      chaptersGrid.appendChild(card);
    });
  }

  function jumpToChapter(sceneId, chapterTitle, startLineIndex) {
    if (!sceneId) return;
    closeChaptersModal();
    if (pauseMenu) pauseMenu.classList.add("hidden");

    if (titleScreen && !titleScreen.classList.contains("hidden")) {
      stopAmbience();
      stopBgm();
      titleScreen.classList.add("hidden");
      gameEl.classList.remove("hidden");
    }

    if (choicesBox) choicesBox.classList.add("hidden");
    if (creditsScreen) creditsScreen.classList.add("hidden");
    if (endingCardPanel) endingCardPanel.classList.add("hidden");
    if (backlogModal) backlogModal.classList.add("hidden");
    if (cgsGalleryModal) cgsGalleryModal.classList.add("hidden");

    if (!state.story || !state.story.scenes) {
      flashToast("⏳ Cargando historia...");
      return;
    }

    var targetScene = state.story.scenes[sceneId];
    if (!targetScene) {
      log("Scene not found: " + sceneId);
      flashToast("⚠️ Escena no encontrada: " + sceneId);
      return;
    }

    var lineIdx = (typeof startLineIndex === "number" && startLineIndex >= 0) ? startLineIndex : 0;
    if (targetScene.lines && lineIdx >= targetScene.lines.length) {
      lineIdx = Math.max(0, targetScene.lines.length - 1);
    }

    state.sceneId = sceneId;
    state.lineIndex = lineIdx;

    clearSprite();
    stopAmbience();
    stopBgm();

    // Reconstruir visuales hasta esa línea
    var effectiveBg = targetScene.bg;
    var effectiveSprite = targetScene.sprite;
    var effectiveExpr = targetScene.expr || "neutral";
    if (targetScene.lines) {
      for (var i = 0; i <= lineIdx && i < targetScene.lines.length; i++) {
        var l = targetScene.lines[i];
        if (l.bg) effectiveBg = l.bg;
        if (l.sprite !== undefined) {
          effectiveSprite = l.sprite;
          effectiveExpr = l.expr || "neutral";
        }
      }
    }
    renderScene(lineIdx);

    // Asegurar que los visuales reconstruidos hasta esa línea tengan prioridad
    if (effectiveBg) setBackground(effectiveBg);
    if (effectiveSprite !== undefined) setSprite(effectiveSprite, effectiveExpr);

    if (gameEl) {
      gameEl.classList.remove("hidden");
      gameEl.classList.add("fade-in");
    }
    if (dialogBox) {
      dialogBox.classList.remove("hidden");
    }

    saveProgress();
    updateCoinsDisplay();
    flashToast("▶ " + (chapterTitle || "Cargando capítulo..."));
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
      case "language":
        openLanguageModal();
        break;
      case "chapters":
        openChaptersModal();
        break;
      case "gallery":
        openCgsGallery();
        break;
      case "log":
        openBacklogModal();
        break;
      case "save":
        saveProgress();
        flashToast("💾 " + (state.localeData && state.localeData.ui && state.localeData.ui.saved_toast ? state.localeData.ui.saved_toast : "Guardado"));
        break;
      case "load":
        restoreProgress();
        renderScene();
        flashToast("📂 " + (state.localeData && state.localeData.ui && state.localeData.ui.loaded_toast ? state.localeData.ui.loaded_toast : "Cargado"));
        break;
      case "title":
        saveProgress();
        stopBgm();
        stopAmbience();
        gameEl.classList.add("hidden");
        showTitleScreen();
        break;
      case "restart":
        clearProgress();
        resetVars();
        state.sceneId = "act1_yamaku_gate";
        stopBgm();
        stopAmbience();
        if (creditsScreen) creditsScreen.classList.add("hidden");
        if (endingCardPanel) endingCardPanel.classList.add("hidden");
        renderScene();
        break;
      case "exit":
        stopBgm();
        stopAmbience();
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

  // ============================================================
  //  MODO AUTOMÁTICO (AUTO MODE)
  // ============================================================
  state.autoMode = false;
  var autoTimer = null;

  function toggleAutoMode() {
    state.autoMode = !state.autoMode;
    if (btnAuto) {
      btnAuto.classList.toggle("active", state.autoMode);
      btnAuto.textContent = state.autoMode ? "⏸" : "▶";
    }
    if (state.autoMode) {
      flashToast("▶ Modo Automático Activado");
      if (!state.typing) {
        scheduleAutoAdvance();
      }
    } else {
      clearTimeout(autoTimer);
      flashToast("⏸ Modo Automático Desactivado");
    }
  }

  function scheduleAutoAdvance() {
    clearTimeout(autoTimer);
    if (!state.autoMode) return;
    if (choicesBox && !choicesBox.classList.contains("hidden")) return;
    var textLen = (dialogText && dialogText.textContent) ? dialogText.textContent.length : 20;
    var delay = Math.max(1600, Math.min(4500, 1500 + textLen * 45));
    autoTimer = setTimeout(function () {
      if (state.autoMode && !state.typing && choicesBox && choicesBox.classList.contains("hidden")) {
        advance();
      }
    }, delay);
  }

  // ============================================================
  //  HISTORIAL DE DIÁLOGOS (BACKLOG)
  // ============================================================
  var backlogEntries = [];
  var MAX_BACKLOG = 120;

  function recordBacklog(localizedSpeaker, text, rawSpeaker) {
    if (!text) return;
    var type = "narrator";
    if (rawSpeaker === "his" || rawSpeaker === "Hisao" || (localizedSpeaker && localizedSpeaker.indexOf("Hisao") >= 0)) {
      type = "protagonist";
    } else if (localizedSpeaker && localizedSpeaker.length > 0) {
      type = "heroine";
    }
    backlogEntries.push({
      speaker: localizedSpeaker || "",
      raw: rawSpeaker || "",
      text: text,
      type: type
    });
    if (backlogEntries.length > MAX_BACKLOG) {
      backlogEntries.shift();
    }
  }

  function openBacklogModal() {
    if (!backlogModal || !backlogContent) return;
    backlogContent.innerHTML = "";
    if (backlogEntries.length === 0) {
      backlogContent.innerHTML = "<div style='color:#a092a8;text-align:center;padding:40px 10px;font-style:italic;'>No hay diálogos recientes en el historial.</div>";
    } else {
      backlogEntries.forEach(function (item) {
        var itemEl = document.createElement("div");
        itemEl.className = "backlog-item backlog-" + item.type;

        var spkEl = document.createElement("div");
        spkEl.className = "backlog-item-speaker";
        if (item.type === "protagonist") {
          spkEl.textContent = "👤 " + (item.speaker || "Hisao");
        } else if (item.type === "heroine") {
          spkEl.textContent = "✨ " + item.speaker;
        } else {
          spkEl.textContent = "📖 Narrador";
        }

        var textEl = document.createElement("div");
        textEl.className = "backlog-item-text";
        textEl.textContent = item.text;

        itemEl.appendChild(spkEl);
        itemEl.appendChild(textEl);
        backlogContent.appendChild(itemEl);
      });
    }
    backlogModal.classList.remove("hidden");
    setTimeout(function () {
      backlogContent.scrollTop = backlogContent.scrollHeight;
    }, 40);
  }

  function closeBacklogModal() {
    if (backlogModal) backlogModal.classList.add("hidden");
  }

  // ============================================================
  //  MOTOR DE PARTÍCULAS 60 FPS (HTML5 CANVAS GPU)
  // ============================================================
  var fxCtx = null;
  var particles = [];
  var fxMode = "sakura";
  var fxAnimId = null;

  function initParticlesCanvas() {
    if (!fxCanvas) return;
    fxCtx = fxCanvas.getContext("2d");
    function resizeCanvas() {
      if (!fxCanvas) return;
      fxCanvas.width = window.innerWidth || 360;
      fxCanvas.height = window.innerHeight || 640;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    spawnParticles("sakura");
    startParticleLoop();
  }

  function spawnParticles(mode) {
    fxMode = mode || "sakura";
    particles = [];
    if (fxMode === "none") return;
    var count = (fxMode === "rain") ? 40 : (fxMode === "sparkles" ? 28 : 22);
    var w = fxCanvas ? fxCanvas.width : 360;
    var h = fxCanvas ? fxCanvas.height : 640;
    for (var i = 0; i < count; i++) {
      particles.push(createParticle(w, h, fxMode, true));
    }
  }

  function createParticle(w, h, mode, randomY) {
    var p = {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : -20,
      size: Math.random() * 8 + 5,
      speedY: Math.random() * 1.5 + 0.8,
      speedX: (Math.random() - 0.5) * 0.8,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04,
      opacity: Math.random() * 0.5 + 0.4,
      sway: Math.random() * Math.PI * 2
    };
    if (mode === "rain") {
      p.speedY = Math.random() * 10 + 15;
      p.speedX = -1.5;
      p.size = Math.random() * 15 + 10;
      p.opacity = Math.random() * 0.35 + 0.25;
    } else if (mode === "sparkles") {
      p.speedY = -(Math.random() * 0.8 + 0.3);
      p.speedX = (Math.random() - 0.5) * 0.6;
      p.size = Math.random() * 4 + 2;
      p.opacity = Math.random() * 0.6 + 0.3;
    }
    return p;
  }

  function startParticleLoop() {
    if (fxAnimId) cancelAnimationFrame(fxAnimId);
    function renderFrame() {
      if (fxCtx && fxCanvas && fxCanvas.width > 0 && fxMode !== "none") {
        fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        var w = fxCanvas.width;
        var h = fxCanvas.height;
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          if (fxMode === "sakura") {
            p.sway += 0.02;
            p.x += Math.sin(p.sway) * 0.9 + p.speedX;
            p.y += p.speedY;
            p.angle += p.spin;
            if (p.y > h + 20 || p.x < -30 || p.x > w + 30) {
              particles[i] = createParticle(w, h, "sakura", false);
            }
            fxCtx.save();
            fxCtx.translate(p.x, p.y);
            fxCtx.rotate(p.angle);
            fxCtx.fillStyle = "rgba(255, 183, 206, " + p.opacity + ")";
            fxCtx.beginPath();
            fxCtx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
            fxCtx.fill();
            fxCtx.restore();
          } else if (fxMode === "sparkles") {
            p.y += p.speedY;
            p.x += p.speedX;
            p.opacity = 0.3 + 0.5 * Math.abs(Math.sin(p.sway += 0.03));
            if (p.y < -20) {
              particles[i] = createParticle(w, h, "sparkles", false);
              particles[i].y = h + 10;
            }
            fxCtx.save();
            fxCtx.fillStyle = "rgba(255, 230, 150, " + p.opacity + ")";
            fxCtx.shadowColor = "rgba(255, 215, 0, 0.8)";
            fxCtx.shadowBlur = 8;
            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            fxCtx.fill();
            fxCtx.restore();
          } else if (fxMode === "rain") {
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y > h + 30) {
              particles[i] = createParticle(w, h, "rain", false);
            }
            fxCtx.strokeStyle = "rgba(180, 215, 255, " + p.opacity + ")";
            fxCtx.lineWidth = 1.5;
            fxCtx.beginPath();
            fxCtx.moveTo(p.x, p.y);
            fxCtx.lineTo(p.x + p.speedX * 2, p.y + p.size);
            fxCtx.stroke();
          }
        }
      } else if (fxMode === "none" && fxCtx && fxCanvas) {
        fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      }
      fxAnimId = requestAnimationFrame(renderFrame);
    }
    fxAnimId = requestAnimationFrame(renderFrame);
  }

  // ============================================================
  //  ÁLBUM SECRETO & GALERÍA ECCHI VIP
  // ============================================================
  var CGS_CATALOGUE = [
    // 🎬 CINEMÁTICAS & VIDEOS EXTRAS VIP (6 Videos - 20 🪙)
    {
      id: "vid_op1",
      file: "x-op_1_tn.jpg",
      videoUrl: "x-op_1.mkv",
      title: "🎬 Anime Opening: Caminos de Yamaku",
      desc: "La apertura animada oficial con la emblemática melodía de Yamaku.",
      heroine: "Todas las Heroínas",
      category: "videos",
      isVideo: true,
      cost: 20
    },
    {
      id: "vid_emi_act2",
      file: "x-tc_act2_emi_tn.jpg",
      videoUrl: "x-tc_act2_emi.mkv",
      title: "🎬 Sora: El Viento en la Pista (Acto II)",
      desc: "Secuencia cinematográfica de Sora corriendo con determinación infinita.",
      heroine: "Sora (Emi)",
      category: "videos",
      isVideo: true,
      cost: 20
    },
    {
      id: "vid_hanako_act2",
      file: "x-tc_act2_hanako_tn.jpg",
      videoUrl: "x-tc_act2_hanako.mkv",
      title: "🎬 Yumi: Refugio en las Sombras (Acto II)",
      desc: "Cinemática conmovedora del despertar de la confianza y el afecto de Yumi.",
      heroine: "Yumi (Hanako)",
      category: "videos",
      isVideo: true,
      cost: 20
    },
    {
      id: "vid_lilly_act2",
      file: "x-tc_act2_lilly_tn.jpg",
      videoUrl: "x-tc_act2_lilly.mkv",
      title: "🎬 Elena: Susurros del Té (Acto II)",
      desc: "Elegante introducción a la nobleza, dulzura y misterio de Elena.",
      heroine: "Elena (Lilly)",
      category: "videos",
      isVideo: true,
      cost: 20
    },
    {
      id: "vid_rin_act2",
      file: "x-tc_act2_rin_tn.jpg",
      videoUrl: "x-tc_act2_rin.mkv",
      title: "🎬 Aiko: Pinceladas del Alma (Acto II)",
      desc: "Secuencia artística de abstracción, ensueño y emociones profundas con Aiko.",
      heroine: "Aiko (Rin)",
      category: "videos",
      isVideo: true,
      cost: 20
    },
    {
      id: "vid_shizune_act2",
      file: "x-tc_act2_shizune_tn.jpg",
      videoUrl: "x-tc_act2_shizune.mkv",
      title: "🎬 Shizune: Duelo de Voluntades (Acto II)",
      desc: "Cinemática de la implacable y apasionada presidenta del consejo.",
      heroine: "Shizune",
      category: "videos",
      isVideo: true,
      cost: 20
    },

    // 👙 ESPECIALES PLAYA Y BIKINI (9 CGs)
    {
      id: "cg_sora_beach",
      file: "cg_sora_beach.jpg",
      title: "Sora: Bikini Deportivo en la Costa",
      desc: "Sora disfrutando de las olas y el sol en un bikini de dos piezas.",
      heroine: "Sora (Emi)",
      category: "beach",
      cost: 20
    },
    {
      id: "cg_elena_beach",
      file: "cg_elena_beach.jpg",
      title: "Elena: Caricia de Sol Dorado",
      desc: "Elena relajándose en la bahía bajo los destellos del mediodía.",
      heroine: "Elena (Lilly)",
      category: "beach",
      cost: 20
    },
    {
      id: "cg_yumi_beach",
      file: "cg_yumi_beach.jpg",
      title: "Yumi: Secreto en la Cala",
      desc: "Yumi supera su timidez mostrando su hermoso traje de baño.",
      heroine: "Yumi (Hanako)",
      category: "beach",
      cost: 20
    },
    {
      id: "cg_aiko_beach",
      file: "cg_aiko_beach.jpg",
      title: "Aiko: Marea de Inspiración",
      desc: "Aiko contemplando el océano mientras las olas besan sus pies.",
      heroine: "Aiko (Rin)",
      category: "beach",
      cost: 20
    },
    {
      id: "cg_shizune_beach",
      file: "cg_shizune_beach.jpg",
      title: "Shizune: Vacaciones Presidenciales",
      desc: "La presidenta del consejo con porte imperial y sensual en la arena.",
      heroine: "Shizune",
      category: "beach",
      cost: 20
    },
    {
      id: "cg_shiina_beach",
      file: "cg_shiina_beach.jpg",
      title: "Shiina: Risas y Curvas al Sol",
      desc: "Shiina rebosante de energía veraniega salpicando agua marina.",
      heroine: "Shiina (Misha)",
      category: "beach",
      cost: 20
    },
    {
      id: "cg_celina_beach",
      file: "cg_celina_beach.jpg",
      title: "Celina: Atardecer en el Océano",
      desc: "Hermosa modelo en la costa bañada por los tonos dorados del mar.",
      heroine: "Celina",
      category: "beach",
      cost: 20
    },
    {
      id: "cg_tessa_beach",
      file: "cg_tessa_beach.jpg",
      title: "Tessa: Brisa Tropical Privada",
      desc: "Tessa en una pose cautivadora bajo la sombra de las palmeras.",
      heroine: "Tessa",
      category: "beach",
      cost: 20
    },
    {
      id: "cg_zoe_beach",
      file: "cg_zoe_beach.jpg",
      title: "Zoe: Silueta bajo el Firmamento",
      desc: "Zoe destacando con elegancia y sensualidad en la orilla.",
      heroine: "Zoe",
      category: "beach",
      cost: 20
    },

    // 💖 ROMANCE & CITAS (15 CGs)
    {
      id: "cg_emi_firstkiss",
      file: "cg_emi_firstkiss.jpg",
      title: "Sora: Primer Beso Inolvidable",
      desc: "Nuestros labios se encuentran sellando un amor puro e intenso.",
      heroine: "Sora (Emi)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_emi_ending",
      file: "cg_emi_ending.jpg",
      title: "Sora: Hacia el Horizonte Juntos",
      desc: "Corriendo codo a codo hacia un mañana libre de sombras.",
      heroine: "Sora (Emi)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_emi_sleep",
      file: "cg_emi_sleep.jpg",
      title: "Sora: Descanso Pacífico",
      desc: "Sora durmiendo con una dulce sonrisa tras el entrenamiento.",
      heroine: "Sora (Emi)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_lilly_touch",
      file: "cg_lilly_touch.jpg",
      title: "Elena: Contacto de Piel Tibia",
      desc: "Tus manos son sus ojos: una caricia que disipa todo miedo.",
      heroine: "Elena (Lilly)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_lilly_kissing",
      file: "cg_lilly_kissing.jpg",
      title: "Elena: Beso en la Penumbra",
      desc: "Un tierno y apasionado beso al calor del salón del té.",
      heroine: "Elena (Lilly)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_lilly_goodend",
      file: "cg_lilly_goodend.jpg",
      title: "Elena: Las Campanas de la Colina",
      desc: "Promesa eterna de amor verdadero con vista al horizonte.",
      heroine: "Elena (Lilly)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_hanako_shanghaiwindow",
      file: "cg_hanako_shanghaiwindow.jpg",
      title: "Yumi: Luces en la Ventana",
      desc: "Yumi contemplando la tarde sintiéndose protegida y amada.",
      heroine: "Yumi (Hanako)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_hanako_goodend",
      file: "cg_hanako_goodend.jpg",
      title: "Yumi: Sonrisa al Sol",
      desc: "Yumi caminando con la cabeza erguida, dejando el pasado atrás.",
      heroine: "Yumi (Hanako)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_hanako_after",
      file: "cg_hanako_after.jpg",
      title: "Yumi: Paz en el Corazón",
      desc: "Un tierno suspiro compartido tras abrir su alma.",
      heroine: "Yumi (Hanako)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_rin_artclass",
      file: "cg_rin_artclass.jpg",
      title: "Aiko: El Lienzo y la Mirada",
      desc: "Aiko pintando descalza en el taller inundado de luz matutina.",
      heroine: "Aiko (Rin)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_rin_nap",
      file: "cg_rin_nap.jpg",
      title: "Aiko: Siesta bajo los Cerezos",
      desc: "Un momento de ensueño y tranquilidad sobre el césped verde.",
      heroine: "Aiko (Rin)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_rin_kiss",
      file: "cg_rin_kiss.jpg",
      title: "Aiko: Beso Impulsivo",
      desc: "Aiko cerrando la distancia con un beso repentino y sublime.",
      heroine: "Aiko (Rin)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_shizu_goodend",
      file: "cg_shizu_goodend.jpg",
      title: "Shizune: Victoria Compartida",
      desc: "La sonrisa cálida y sincera tras superar todas las pruebas.",
      heroine: "Shizune",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_misha_roof",
      file: "cg_misha_roof.jpg",
      title: "Shiina: Susurros en el Tejado",
      desc: "Confesiones sinceras en la azotea acariciada por el viento.",
      heroine: "Shiina (Misha)",
      category: "romance",
      cost: 20
    },
    {
      id: "cg_misha_naked",
      file: "cg_misha_naked.jpg",
      title: "Shiina: Vulnerabilidad Absoluta",
      desc: "Despojándose de toda barrera para mostrar su verdadero ser.",
      heroine: "Shiina (Misha)",
      category: "romance",
      cost: 20
    },

    // 🔞 MOMENTOS ÍNTIMOS VIP (15 CGs)
    {
      id: "cg_emi_bed",
      file: "cg_emi_bed.jpg",
      title: "Sora: Entre Sábanas al Atardecer",
      desc: "La pasión florece en la intimidad de la habitación.",
      heroine: "Sora (Emi)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_emi_grinding",
      file: "cg_emi_grinding.jpg",
      title: "Sora: Contacto Electrizante",
      desc: "Cuerpos fundidos en un ardor que desafía las normas.",
      heroine: "Sora (Emi)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_lilly_bedroom",
      file: "cg_lilly_bedroom.jpg",
      title: "Elena: Confidencia en su Alcoba",
      desc: "Elena en camisón de seda compartiendo su intimidad privada.",
      heroine: "Elena (Lilly)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_lilly_bath",
      file: "cg_lilly_bath.jpg",
      title: "Elena: Niebla de Aguas Termales",
      desc: "La silueta seductora de Elena en el vapor del baño tibio.",
      heroine: "Elena (Lilly)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_lilly_afterbath",
      file: "cg_lilly_afterbath.jpg",
      title: "Elena: Envuelta en Toalla Tibia",
      desc: "Recién salida del baño, gotas resbalando por su piel dorada.",
      heroine: "Elena (Lilly)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_lilly_sheets",
      file: "cg_lilly_sheets.jpg",
      title: "Elena: Despertar Entrelazados",
      desc: "El amanecer nos descubre abrazados entre sábanas de lino.",
      heroine: "Elena (Lilly)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_hanako_bed",
      file: "cg_hanako_bed.jpg",
      title: "Yumi: Noche de Entrega Sincera",
      desc: "La ternura y la pasión superan cualquier cicatriz.",
      heroine: "Yumi (Hanako)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_hanako_missionary",
      file: "cg_hanako_missionary.jpg",
      title: "Yumi: Unión Inolvidable",
      desc: "Miradas fijas y latidos que se sincronizan en el clímax.",
      heroine: "Yumi (Hanako)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_rin_wet",
      file: "cg_rin_wet.jpg",
      title: "Aiko: Empapada por la Lluvia",
      desc: "La ropa mojada se adhiere a su cuerpo esculpido por el arte.",
      heroine: "Aiko (Rin)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_rin_h",
      file: "cg_rin_h.jpg",
      title: "Aiko: Pasión en el Taller",
      desc: "El arte cobra vida en un encuentro desenfrenado sobre los óleos.",
      heroine: "Aiko (Rin)",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_shizu_couch",
      file: "cg_shizu_couch.jpg",
      title: "Shizune: Seducción en el Despacho",
      desc: "A puerta cerrada en el sofá del consejo estudiantil.",
      heroine: "Shizune",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_shizu_undressing",
      file: "cg_shizu_undressing.jpg",
      title: "Shizune: Desabrochando el Uniforme",
      desc: "La presidenta toma la iniciativa con mirada ardiente.",
      heroine: "Shizune",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_shizu_straddle",
      file: "cg_shizu_straddle.jpg",
      title: "Shizune: Dominio Apasionado",
      desc: "Shizune sobre ti reclamando cada caricia como suya.",
      heroine: "Shizune",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_shizu_pushdown",
      file: "cg_shizu_pushdown.jpg",
      title: "Shizune: Rendición Total",
      desc: "El placer absoluto vence toda compostura presidencial.",
      heroine: "Shizune",
      category: "intimate",
      cost: 20
    },
    {
      id: "cg_misha_sex",
      file: "cg_misha_sex.jpg",
      title: "Shiina: Clímax Prohibido",
      desc: "Un éxtasis secreto que sella una complicidad eterna.",
      heroine: "Shiina (Misha)",
      category: "intimate",
      cost: 20
    }
  ];

  var CGS_STORAGE_KEY = "pocketgirl_unlocked_cgs";
  var activeViewingCg = null;

  function getUnlockedCgs() {
    try {
      var raw = localStorage.getItem(CGS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function isCgUnlocked(cgId) {
    var list = getUnlockedCgs();
    return list.indexOf(cgId) >= 0;
  }

  function unlockCg(cgId, showToast) {
    var list = getUnlockedCgs();
    if (list.indexOf(cgId) < 0) {
      list.push(cgId);
      try { localStorage.setItem(CGS_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
    }
    renderCgsGallery();
    if (showToast !== false) {
      flashToast("🎉 ¡Ilustración VIP desbloqueada!");
    }
  }

  function openCgsGallery() {
    if (!cgsGalleryModal) return;
    renderCgsGallery();
    cgsGalleryModal.classList.remove("hidden");
  }

  function closeCgsGallery() {
    if (cgsGalleryModal) cgsGalleryModal.classList.add("hidden");
  }

  var currentCgFilter = "all";

  function renderCgsGallery(filter) {
    if (!cgsGrid) return;
    if (filter) currentCgFilter = filter;
    cgsGrid.innerHTML = "";
    var unlocked = getUnlockedCgs();

    var items = CGS_CATALOGUE.filter(function (cg) {
      if (!currentCgFilter || currentCgFilter === "all") return true;
      return cg.category === currentCgFilter;
    });

    items.forEach(function (cg) {
      var isUnlocked = unlocked.indexOf(cg.id) >= 0;
      var card = document.createElement("div");
      card.className = "cg-card " + (isUnlocked ? "unlocked" : "locked");

      var thumbBox = document.createElement("div");
      thumbBox.className = "cg-card-thumb-box";

      var img = document.createElement("img");
      img.className = "cg-card-thumb " + (isUnlocked ? "" : "blur-ecchi");
      img.src = "img/cgs/" + cg.file;
      img.alt = cg.title;
      img.loading = "lazy";
      thumbBox.appendChild(img);

      if (!isUnlocked) {
        var lockOverlay = document.createElement("div");
        lockOverlay.className = "cg-lock-overlay";
        lockOverlay.innerHTML = "<span class='cg-lock-icon'>🔒</span><span class='cg-lock-badge'>VIP 🔞</span>";
        thumbBox.appendChild(lockOverlay);
      } else {
        var hdBadge = document.createElement("div");
        hdBadge.className = "cg-unlocked-badge";
        hdBadge.textContent = "✨ HD 4K";
        thumbBox.appendChild(hdBadge);
      }

      var info = document.createElement("div");
      info.className = "cg-card-info";

      var title = document.createElement("h4");
      title.className = "cg-card-title";
      title.textContent = cg.title;
      info.appendChild(title);

      var heroineTag = document.createElement("div");
      heroineTag.className = "cg-card-heroine";
      heroineTag.textContent = "❤️ " + cg.heroine;
      info.appendChild(heroineTag);

      var actions = document.createElement("div");
      actions.className = "cg-card-actions";

      if (isUnlocked) {
        var btnView = document.createElement("button");
        btnView.className = "cg-view-btn";
        btnView.innerHTML = "🔍 Ver en Pantalla Completa";
        btnView.addEventListener("click", function () {
          openCgFullscreen(cg);
        });
        actions.appendChild(btnView);
      } else {
        // Desbloquear con monedas (20)
        var unlockCost = cg.cost || 20;
        var btnCoins = document.createElement("button");
        btnCoins.className = "cg-unlock-coins-btn";
        btnCoins.innerHTML = "🪙 " + unlockCost + " Monedas";
        btnCoins.addEventListener("click", function () {
          var coins = getCoins();
          if (coins < unlockCost) {
            showCoinsAlert();
            return;
          }
          if (spendCoins(unlockCost)) {
            unlockCg(cg.id);
          } else {
            showCoinsAlert();
          }
        });
        actions.appendChild(btnCoins);

        // Desbloquear con anuncio recompensado
        var btnAd = document.createElement("button");
        btnAd.className = "cg-unlock-ad-btn";
        btnAd.innerHTML = "🎬 Ver Anuncio Gratis";
        btnAd.addEventListener("click", function () {
          window.onCgAdRewarded = function () {
            unlockCg(cg.id);
          };
          try {
            if (window.AndroidBridge && typeof window.AndroidBridge.showRewardedAd === "function") {
              window.AndroidBridge.showRewardedAd("onCgAdRewarded");
            } else {
              flashToast("🎬 Reproduciendo anuncio simulado...");
              setTimeout(function () {
                unlockCg(cg.id);
              }, 1200);
            }
          } catch (e) {
            unlockCg(cg.id);
          }
        });
        actions.appendChild(btnAd);
      }

      info.appendChild(actions);
      card.appendChild(thumbBox);
      card.appendChild(info);

      // Clic directo en miniatura o carta para ver pantalla completa o desbloquear
      function handleCgCardTap() {
        if (isUnlocked) {
          openCgFullscreen(cg);
        } else {
          var unlockCost = cg.cost || 20;
          var coins = getCoins();
          if (coins >= unlockCost) {
            if (confirm("¿Desbloquear '" + cg.title + "' por " + unlockCost + " monedas?")) {
              if (spendCoins(unlockCost)) {
                unlockCg(cg.id);
                flashToast("✨ ¡Desbloqueado con éxito!");
                setTimeout(function () {
                  openCgFullscreen(cg);
                }, 200);
              }
            }
          } else {
            showCoinsAlert();
          }
        }
      }

      thumbBox.addEventListener("click", handleCgCardTap);
      card.addEventListener("click", function (e) {
        if (e.target.tagName.toLowerCase() === "button") return;
        handleCgCardTap();
      });

      cgsGrid.appendChild(card);
    });
  }

  function openCgFullscreen(cg) {
    if (!cgsFullscreenViewer || !cg) return;
    activeViewingCg = cg;
    cgViewerImg.src = "img/cgs/" + cg.file;
    cgViewerTitle.textContent = cg.title;
    var btnPlay = $("btn-cg-play-video");
    if (btnPlay) {
      if (cg.isVideo && cg.videoUrl) {
        btnPlay.classList.remove("hidden");
        btnPlay.onclick = function () {
          if (window.AndroidBridge && typeof window.AndroidBridge.playVideo === "function") {
            window.AndroidBridge.playVideo(cg.videoUrl);
          } else {
            flashToast("🎬 Reproduciendo " + cg.title + "...");
          }
        };
      } else {
        btnPlay.classList.add("hidden");
      }
    }
    cgsFullscreenViewer.classList.remove("hidden");
  }

  function closeCgViewer() {
    if (cgsFullscreenViewer) cgsFullscreenViewer.classList.add("hidden");
    activeViewingCg = null;
  }

  function saveActiveCgToDevice() {
    if (!activeViewingCg) return;
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.savePhotoToGallery === "function") {
        var relPath = "web/novel/img/cgs/" + activeViewingCg.file;
        var saved = window.AndroidBridge.savePhotoToGallery(relPath, activeViewingCg.title);
        if (saved) {
          flashToast("📸 ¡Guardada en la galería de tu móvil con éxito!");
        } else {
          flashToast("⚠️ No se pudo guardar la imagen");
        }
        return;
      }
    } catch (e) {}
    var a = document.createElement("a");
    a.href = "img/cgs/" + activeViewingCg.file;
    a.download = activeViewingCg.file;
    a.click();
    flashToast("📥 Descargando imagen...");
  }


  // ============================================================
  //  SINCRONIZACIÓN DINÁMICA DE COSTOS DESDE GITHUB (MenuConfig.json)
  // ============================================================
  function syncRemoteChapterCosts() {
    try {
      // 1. Intentar leer desde AndroidBridge si está disponible
      if (window.AndroidBridge && typeof window.AndroidBridge.getSpecialCostsJson === "function") {
        var bridgeJson = window.AndroidBridge.getSpecialCostsJson();
        if (bridgeJson) {
          applyRemoteCosts(JSON.parse(bridgeJson));
          return;
        }
      }
    } catch (e) {}

    // 2. Descargar en segundo plano desde GitHub
    var endpoints = [
      "https://raw.githubusercontent.com/Andrespro100apps/Videospoket/main/MenuConfig.json",
      "https://cdn.jsdelivr.net/gh/Andrespro100apps/Videospoket@main/MenuConfig.json"
    ];

    function tryFetch(idx) {
      if (idx >= endpoints.length) return;
      fetchJson(endpoints[idx]).then(function (cfg) {
        if (cfg && (cfg.special_costs || cfg.buttons)) {
          applyRemoteCosts(cfg.special_costs || {});
        }
      }).catch(function () {
        tryFetch(idx + 1);
      });
    }
    tryFetch(0);
  }

  function applyRemoteCosts(costsMap) {
    if (!costsMap || typeof costsMap !== "object") return;
    var changed = false;
    CHAPTERS_CATALOGUE.forEach(function (ch) {
      if (costsMap[ch.id] !== undefined && typeof costsMap[ch.id] === "number") {
        ch.cost = costsMap[ch.id];
        ch.badge = "🌙 VIP " + ch.cost + " 🪙";
        changed = true;
      }
    });
    if (changed) {
      log("Costos de capítulos especiales actualizados dinámicamente desde GitHub.");
    }
  }




  // ---- Persistencia ----
  var SAVE_KEY = "historia_pocket_save";
  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ sceneId: state.sceneId, lineIndex: state.lineIndex, vars: state.vars })); } catch (e) {}
  }
  function restoreProgress() {
    try {
      var r = localStorage.getItem(SAVE_KEY);
      if (r) { var s = JSON.parse(r); state.sceneId = s.sceneId || "start"; state.lineIndex = (typeof s.lineIndex === "number" && s.lineIndex >= 0) ? s.lineIndex : 0; state.vars = s.vars || {}; }
    } catch (e) {}
  }
  function resetVars() {
    state.vars = {};
    if (state.story.startVars) Object.keys(state.story.startVars).forEach(function (k) { state.vars[k] = state.story.startVars[k]; });
  }
  function clearProgress() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  // ---- Debug & Integración ----
  window.HP = {
    state: state,
    advance: advance,
    goToScene: goToScene,
    updateCoins: updateCoinsDisplay,
    showEnding: showEnding,
    tryStartAdventure: tryStartAdventure
  };
})();
