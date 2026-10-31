(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const lifecycle = new AbortController();
  const signal = lifecycle.signal;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 650px)");
  const dialog = $("object-dialog");
  const surface = $("focus-surface");
  const stage = $("table-stage");
  const zoomLimit = Number(getComputedStyle(stage).getPropertyValue("--zoom-limit"));
  const dimmer = document.createElement("div");
  dimmer.className = "focus-dimmer";
  dimmer.setAttribute("aria-hidden", "true");
  document.body.append(dimmer);
  const cards = {
    first: { title: "El primer voto", number: "18", image: "18-el-primer-voto.jpg", mode: "age", panel: "age" },
    election: { title: "La intermedia", number: "22", image: "22-la-intermedia.jpg", mode: "election", panel: "history" },
    women: { title: "La votante", number: "61", image: "61-la-votante.jpg", mode: "gender", panel: "territory" },
    inclusion: { title: "La inclusión", number: "24", image: "24-la-inclusion.jpg", mode: "gender", panel: "inclusion" }
  };
  const keys = Object.keys(cards);
  let facts = {};
  let currentCard = "first";
  let source = null;
  let motion = null;
  let shadeMotion = null;
  let closing = false;
  let frame = 0;
  let sceneVisible = true;
  let scrollOverflow = "";
  let afterClose = null;
  let pirinolaViewer = null;
  let pirinolaLoading = null;
  let baleroViewer = null;
  let baleroLoading = null;
  let dadosViewer = null;
  let dadosLoading = null;
  let baleroTimer = 0;
  let notebookTimer = 0;
  const gameContent = CivicGames.createContent(JSON.parse($("ccpc-data").textContent));
  const baleroDeck = CivicGames.createDeck(gameContent.balero);
  const dadosRoller = CivicGames.createDadosRoller(gameContent.dados);
  const pirinolaDecks = Object.fromEntries(Object.entries(gameContent.pirinola).map(([type, items]) => [type, CivicGames.createDeck(items)]));
  let baleroQuestion = null;
  let baleroAnswered = false;
  let pirinolaQuestion = null;

  function resolveDifficultyKey(raw) {
    const clean = String(raw || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (clean === "FACIL") return "FÁCIL";
    if (clean === "DIFICIL") return "DIFÍCIL";
    return pirinolaDecks[raw] ? raw : "MEDIO";
  }

  function renderAnswers(container, question, attribute) {
    const deck = CivicGames.createDeck(question.options);
    container.replaceChildren(...question.options.map(() => {
      const option = deck.next();
      const button = document.createElement("button");
      button.type = "button";
      button.dataset[attribute] = option.id;
      button.textContent = option.text;
      button.setAttribute("aria-pressed", "false");
      return button;
    }));
  }

  function showPirinolaContent(rawDifficulty) {
    const difficulty = resolveDifficultyKey(rawDifficulty);
    const item = pirinolaDecks[difficulty].next();
    pirinolaQuestion = item;
    $("pirinola-result").dataset.item = item.id;
    $("pirinola-result").dataset.difficulty = difficulty;
    $("pirinola-result-type").textContent = difficulty;
    $("pirinola-result-title").textContent = item.prompt;
    $("pirinola-result-text").textContent = "Elige una respuesta para contrastarla con los datos.";
    $("pirinola-scope").textContent = `${item.scope}. ${item.source}`;
    $("pirinola-question").hidden = false;
    $("pirinola-question").disabled = false;
    $("pirinola-feedback").hidden = true;
    renderAnswers($("pirinola-answers"), item, "pirinolaAnswer");
    $("pirinola-result").hidden = false;
    $("pirinola-spin").textContent = "Volver a girar";
    $("pirinola-spin").disabled = false;
  }

  function showDadosStories(result) {
    const friendly = value => String(value)
      .replace(/\bLN\s*<\s*100\b/g, "menos de 100 personas registradas")
      .replace(/\bLN\b/g, "lista de personas registradas")
      .replace(/\bSV\b/g, "personas con marca de voto")
      .replace(/\bNV\b/g, "personas sin marca de voto")
      .replace(/\bNS\b/g, "registros sin dato de participación")
      .replace(/\bpp\b/g, "puntos porcentuales")
      .replace(/\bCCPC\b/g, "conteos del INE")
      .replace(/\bSEXO\b/g, "sexo")
      .replace(/\bdenominador\b/gi, "total usado como base")
      .replace(/\bcortes transversales\b/gi, "elecciones observadas por separado")
      .replace(/\bbrecha\b/gi, "diferencia")
      .replace(/\btasas\b/gi, "porcentajes de participación")
      .replace(/\btasa\b/gi, "porcentaje de participación")
      .replace(/universo ordinario/gi, "datos de las elecciones habituales")
      .replace(/registros persona-elección/gi, "registros de cada persona en cada elección");
    const wordA = result.wordA || (Number(result.faceA) % 2 === 1 ? "MITO" : "VERDAD");
    const wordB = result.wordB || (Number(result.faceB) % 2 === 1 ? "MITO" : "VERDAD");
    const stories = dadosRoller.draw(wordA, wordB);
    $("dados-result").dataset.combo = `${wordA}+${wordB}`;
    $("dados-result").dataset.wordA = wordA;
    $("dados-result").dataset.wordB = wordB;
    $("dados-result").dataset.items = `${stories[0].id},${stories[1].id}`;
    $("dados-summary").textContent = `Dado 1: ${wordA} · Dado 2: ${wordB}`;
    $("dados-stories").replaceChildren(...stories.map((story, index) => {
      const dieWord = index === 0 ? wordA : wordB;
      const card = document.createElement("article");
      card.className = "dados-story";
      card.dataset.die = String(index + 1);
      card.dataset.type = dieWord;
      card.dataset.item = story.id;
      const tag = document.createElement("span");
      tag.className = "dados-story-tag";
      tag.textContent = `Dado ${index + 1} · ${dieWord}`;
      const title = document.createElement("strong");
      title.className = "dados-story-title";
      title.textContent = friendly(story.title);
      const text = document.createElement("p");
      text.className = "dados-story-text";
      text.textContent = dieWord === "MITO" ? `Lo que muestran los datos: ${friendly(story.explanation)}` : friendly(story.explanation);
      const meta = document.createElement("p");
      meta.className = "dados-story-meta";
      meta.textContent = `${friendly(story.scope)}. Fuente: INE · conteos de participación ciudadana, 2009–2024.`;
      card.append(tag, title, text, meta);
      return card;
    }));
    $("dados-result").hidden = false;
    $("dados-roll").textContent = "Volver a lanzar";
    $("dados-roll").disabled = false;
  }

  function loadPirinola() {
    if (pirinolaLoading) return pirinolaLoading;
    pirinolaLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/modelos-3d/pirinola/pirinola-3d.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se cargó la pirinola 3D"));
      document.head.append(script);
    }).then(() => {
      if (!window.Pirinola3D) throw new Error("El visor de la pirinola no está disponible");
      return window.Pirinola3D;
    });
    return pirinolaLoading;
  }

  async function preparePirinola() {
    if (pirinolaViewer) return pirinolaViewer;
    try {
      const api = await loadPirinola();
      if (pirinolaViewer) return pirinolaViewer;
      if ((!sceneVisible && !(dialog.open && dialog.dataset.object === "pirinola")) || !$("pirinola-canvas").isConnected) return null;
      pirinolaViewer = api.createViewer($("pirinola-canvas"), {
        autoRotate: false,
        tiltDeg: 13,
        resting: !(dialog.open && dialog.dataset.object === "pirinola"),
        onSettle(face) {
          if (dialog.open && dialog.dataset.object === "pirinola" && !closing) showPirinolaContent(face.word);
        },
        onDragSpin() {
          if (dialog.open && dialog.dataset.object === "pirinola" && !closing && !$("pirinola-spin").disabled) $("pirinola-spin").click();
        }
      });
      return pirinolaViewer;
    } catch {
      $("pirinola-error").hidden = false;
      $("pirinola-spin").disabled = true;
      return null;
    }
  }

  function syncPirinola() {
    if (!sceneVisible && !(dialog.open && dialog.dataset.object === "pirinola")) {
      if (pirinolaViewer) pirinolaViewer.setPaused(true);
      return;
    }
    if (pirinolaViewer) pirinolaViewer.setPaused(false);
    else preparePirinola();
  }

  function loadDados() {
    if (dadosLoading) return dadosLoading;
    dadosLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/modelos-3d/dados/dados-3d.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se cargaron los dados 3D"));
      document.head.append(script);
    }).then(() => {
      if (!window.Dados3D) throw new Error("El visor de dados no está disponible");
      return window.Dados3D;
    });
    return dadosLoading;
  }

  async function prepareDados() {
    if (dadosViewer) return dadosViewer;
    try {
      const api = await loadDados();
      if (dadosViewer) return dadosViewer;
      if ((!sceneVisible && !(dialog.open && dialog.dataset.object === "dados")) || signal.aborted || !$("dados-canvas").isConnected) return null;
      dadosViewer = api.createViewer($("dados-canvas"), {
        autoRotate: false,
        pose: dialog.open && dialog.dataset.object === "dados" ? "dynamic" : "table",
        cameraScale: dialog.open && dialog.dataset.object === "dados" ? 1.2 : 1,
        faceA: 5,
        faceB: 6,
        onRollResult(result) {
          if (!dialog.open || dialog.dataset.object !== "dados" || closing) return;
          showDadosStories(result);
        }
      });
      $("dados-loading").hidden = true;
      $("dados-canvas-mount").setAttribute("aria-busy", "false");
      $("dados-roll").disabled = false;
      syncDados();
      return dadosViewer;
    } catch {
      $("dados-loading").hidden = true;
      $("dados-canvas-mount").setAttribute("aria-busy", "false");
      $("dados-roll").disabled = true;
      $("dados-error").hidden = false;
      return null;
    }
  }

  function syncDados() {
    const visible = !document.hidden && (dialog.open ? dialog.dataset.object === "dados" : sceneVisible);
    if (dadosViewer) dadosViewer.setPaused(!visible);
    else if (visible) prepareDados();
  }

  function loadBalero() {
    if (baleroLoading) return baleroLoading;
    baleroLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/modelos-3d/balero/balero-3d.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se cargó el balero 3D"));
      document.head.append(script);
    }).then(() => {
      if (!window.Balero3D) throw new Error("El visor del balero no está disponible");
      return window.Balero3D;
    });
    return baleroLoading;
  }

  async function prepareBalero() {
    if (baleroViewer) return baleroViewer;
    try {
      const api = await loadBalero();
      if (baleroViewer) return baleroViewer;
      if ((!sceneVisible && !(dialog.open && dialog.dataset.object === "balero")) || !$("balero-canvas").isConnected) return null;
      baleroViewer = api.createViewer($("balero-canvas"), {
        autoRotate: false,
        pose: "open",
        restingScale: 1.3,
        resting: !(dialog.open && dialog.dataset.object === "balero"),
        onTrickComplete(success) {
          if (!dialog.open || dialog.dataset.object !== "balero" || !baleroAnswered) return;
          const correct = baleroQuestion.options.find(option => option.id === baleroQuestion.correct).text;
          $("balero-result").textContent = `${success ? "¡Correcto! El balero entró." : `El balero pasó de largo. Respuesta: ${correct}.`} ${baleroQuestion.explanation}`;
          $("balero-result").dataset.success = String(success);
          $("balero-result").hidden = false;
          $("balero-retry").hidden = false;
        }
      });
      $("balero-loading").hidden = true;
      if (dialog.open && dialog.dataset.object === "balero") $("balero-question").disabled = false;
      return baleroViewer;
    } catch {
      $("balero-loading").hidden = true;
      $("balero-error").hidden = false;
      return null;
    }
  }

  function syncBalero() {
    if ((!sceneVisible && !(dialog.open && dialog.dataset.object === "balero")) || (dialog.open && dialog.dataset.object !== "balero")) {
      if (baleroViewer) baleroViewer.setPaused(true);
      return;
    }
    if (baleroViewer) baleroViewer.setPaused(false);
    else prepareBalero();
  }

  function resetBaleroQuestion() {
    clearTimeout(baleroTimer);
    baleroTimer = 0;
    baleroQuestion = baleroDeck.next();
    baleroAnswered = false;
    $("balero-question").dataset.item = baleroQuestion.id;
    $("balero-question").querySelector("legend").textContent = baleroQuestion.prompt;
    renderAnswers($("balero-answers"), baleroQuestion, "baleroAnswer");
    $("balero-scope").textContent = `${baleroQuestion.scope}. ${baleroQuestion.source}`;
    $("balero-question").disabled = !baleroViewer;
    $("balero-result").hidden = true;
    $("balero-retry").hidden = true;
    if (baleroViewer) baleroViewer.setPose("open", true);
  }

  function updateDesk() {
    frame = 0;
    if (!sceneVisible || dialog.open) return;
    const distance = $("mesa").offsetHeight - document.querySelector(".scene-viewport").offsetHeight;
    const progress = Math.max(0, Math.min(1, -$("mesa").getBoundingClientRect().top / Math.max(1, distance)));
    const zoom = reduced.matches ? (progress > .5 ? zoomLimit : 1) : 1 + (zoomLimit - 1) * progress;
    stage.style.setProperty("--desk-scale", zoom.toFixed(4));
    stage.style.willChange = progress > 0 && progress < 1 && !reduced.matches ? "transform" : "auto";
    $("mesa").dataset.progress = progress.toFixed(3);
  }

  function scheduleDesk() {
    if (!frame && sceneVisible && !dialog.open) frame = requestAnimationFrame(updateDesk);
  }

  function originTransform() {
    const from = source.getBoundingClientRect();
    const to = surface.getBoundingClientRect();
    const scale = Math.max(.05, Math.min(from.width / to.width, from.height / to.height));
    const x = from.left + from.width / 2 - to.left - to.width / 2;
    const y = from.top + from.height / 2 - to.top - to.height / 2;
    return `translate(${x}px,${y}px) scale(${scale})`;
  }

  function notebookOriginTransform() {
    const from = source.getBoundingClientRect();
    const to = surface.getBoundingClientRect();
    const x = from.left + from.width / 2 - to.left - to.width / 2;
    const y = from.top + from.height / 2 - to.top - to.height / 2;
    return `translate(${x}px,${y}px) scale(.96)`;
  }

  function openNotebook() {
    if (dialog.open || notebookTimer) return;
    const button = $("notebook-opener");
    button.classList.add("is-opening");
    notebookTimer = setTimeout(() => {
      notebookTimer = 0;
      if (dialog.open) { button.classList.remove("is-opening"); return; }
      openObject("notebook", button);
    }, reduced.matches ? 0 : 560);
  }

  function finishClose() {
    if (!closing) return;
    if (motion) motion.cancel();
    motion = null;
    if (shadeMotion) shadeMotion.cancel();
    shadeMotion = null;
    dimmer.style.opacity = "0";
    surface.style.opacity = "1";
    if (dialog.dataset.object === "dados") {
      $("dados-opener").append($("dados-canvas"));
      $("dados-canvas").tabIndex = -1;
      $("dados-canvas").setAttribute("aria-hidden", "true");
      $("dados-canvas").removeAttribute("aria-label");
      if (dadosViewer) {
        dadosViewer.setPose("table", true);
        dadosViewer.setCameraScale(1);
        dadosViewer.resetCamera();
      }
    }
    if (dialog.dataset.object === "balero") {
      clearTimeout(baleroTimer);
      $("balero-opener").prepend($("balero-canvas"));
      $("balero-canvas").tabIndex = -1;
      $("balero-canvas").setAttribute("aria-hidden", "true");
      $("balero-canvas").removeAttribute("aria-label");
      if (baleroViewer) {
        baleroViewer.setPose("open", true);
        baleroViewer.setResting(true);
      }
    }
    if (dialog.dataset.object === "pirinola") {
      $("pirinola-opener").prepend($("pirinola-canvas"));
      $("pirinola-canvas").tabIndex = -1;
      $("pirinola-canvas").setAttribute("aria-hidden", "true");
      $("pirinola-canvas").removeAttribute("aria-label");
      if (pirinolaViewer) pirinolaViewer.setResting(true);
    }
    dialog.close();
    if (dialog.dataset.object === "loteria") document.dispatchEvent(new CustomEvent("civic:loteria-close"));
    document.documentElement.style.overflow = scrollOverflow;
    document.body.classList.remove("object-returning");
    source.style.visibility = "";
    if (dialog.dataset.object === "notebook") source.classList.remove("is-opening");
    source.focus({ preventScroll: true });
    source = null;
    closing = false;
    dialog.dataset.animating = "false";
    scheduleDesk();
    syncPirinola();
    syncBalero();
    syncDados();
    const callback = afterClose;
    afterClose = null;
    if (callback) callback();
  }

  function closeObject(callback = null) {
    if (!dialog.open || closing) return;
    afterClose = typeof callback === "function" ? callback : null;
    closing = true;
    document.body.classList.add("object-returning");
    $("tooltip").hidden = true;
    if (reduced.matches) { finishClose(); return; }
    if (shadeMotion) shadeMotion.cancel();
    shadeMotion = dimmer.animate([{ opacity: getComputedStyle(dimmer).opacity }, { opacity: 0 }], { duration: 240, fill: "both", easing: "cubic-bezier(.22,1,.36,1)" });
    if (motion && motion.playState === "running") {
      motion.onfinish = finishClose;
      motion.reverse();
    } else {
      if (motion) motion.cancel();
      motion = surface.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: dialog.dataset.object === "notebook" ? notebookOriginTransform() : ["pirinola", "balero", "dados"].includes(dialog.dataset.object) ? "translate(0,16px) scale(.96)" : originTransform(), opacity: .5 }], { duration: 280, fill: "both", easing: "cubic-bezier(.22,1,.36,1)" });
      motion.onfinish = finishClose;
    }
  }

  function showCard(key) {
    currentCard = key;
    const card = cards[key];
    const fact = facts[key] || {};
    $("card-title").textContent = card.title;
    $("card-front-image").src = `assets/imgs/loteria/${card.image}`;
    $("card-front-image").alt = `Carta ${card.number}, ${card.title}`;
    $("card-back-label").textContent = `${card.number} / ${card.title}`;
    $("card-back-title").textContent = fact.title || card.title;
    $("card-back-text").textContent = fact.text || "Una historia de la participación en México.";
    $("card-fact").textContent = fact.value || "";
    $("card-caution").textContent = fact.caution || "";
    $("flip-card").classList.remove("is-flipped");
    $("flip-card").setAttribute("aria-pressed", "false");
    $("flip-card").setAttribute("aria-label", `Dar la vuelta a ${card.title}`);
    $("flip-card").querySelector(".card-front").setAttribute("aria-hidden", "false");
    $("flip-card").querySelector(".card-back").setAttribute("aria-hidden", "true");
    $("flip-card-control").textContent = "Dar la vuelta";
    $("card-instruction").textContent = "Toca la carta para descubrir su historia.";
    $("card-reading").textContent = "";
  }

  function openObject(kind, origin, key = "first") {
    if (dialog.open) return;
    source = origin;
    closing = false;
    surface.classList.toggle("is-card", kind === "card");
    surface.classList.toggle("is-pirinola", kind === "pirinola");
    surface.classList.toggle("is-balero", kind === "balero");
    surface.classList.toggle("is-dados", kind === "dados");
    surface.classList.toggle("is-notebook", kind === "notebook");
    surface.classList.toggle("is-loteria", kind === "loteria");
    $("map-focus").hidden = kind !== "map";
    $("card-focus").hidden = kind !== "card";
    $("pirinola-focus").hidden = kind !== "pirinola";
    $("balero-focus").hidden = kind !== "balero";
    $("dados-focus").hidden = kind !== "dados";
    $("notebook-focus").hidden = kind !== "notebook";
    $("loteria-focus").hidden = kind !== "loteria";
    if (kind === "dados") {
      $("dados-canvas-mount").append($("dados-canvas"));
      $("dados-canvas").tabIndex = 0;
      $("dados-canvas").removeAttribute("aria-hidden");
      $("dados-canvas").setAttribute("aria-label", "Dados 3D. Arrastra o usa las flechas para cambiar el ángulo.");
      $("dados-result").hidden = true;
      $("dados-roll").textContent = "Lanzar dados";
      $("dados-roll").disabled = !dadosViewer;
      if (dadosViewer) {
        dadosViewer.setPose("dynamic", true);
        dadosViewer.setCameraScale(1.2);
        dadosViewer.resetCamera();
      }
    }
    if (kind === "balero") {
      $("balero-canvas-mount").append($("balero-canvas"));
      $("balero-canvas").tabIndex = 0;
      $("balero-canvas").removeAttribute("aria-hidden");
      $("balero-canvas").setAttribute("aria-label", "Balero 3D. Arrastra para verlo desde otro ángulo.");
      resetBaleroQuestion();
      if (baleroViewer) baleroViewer.setResting(false);
    }
    if (kind === "pirinola") {
      $("pirinola-canvas-mount").append($("pirinola-canvas"));
      $("pirinola-canvas").tabIndex = 0;
      $("pirinola-canvas").removeAttribute("aria-hidden");
      $("pirinola-canvas").setAttribute("aria-label", "Pirinola 3D. Usa flecha izquierda o derecha para rotarla.");
      pirinolaQuestion = null;
      $("pirinola-result").hidden = true;
      $("pirinola-spin").textContent = "Girar pirinola";
      $("pirinola-spin").disabled = false;
      if (pirinolaViewer) pirinolaViewer.setResting(false);
    }
    dialog.dataset.object = kind;
    dialog.dataset.animating = String(!reduced.matches);
    dialog.setAttribute("aria-labelledby", kind === "map" ? "object-title" : kind === "card" ? "card-title" : kind === "pirinola" ? "pirinola-title" : kind === "balero" ? "balero-title" : kind === "dados" ? "dados-title" : kind === "loteria" ? "loteria-title" : "notebook-title");
    if (kind === "card") showCard(key);
    scrollOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
    const start = kind === "notebook" ? notebookOriginTransform() : originTransform();
    source.style.visibility = "hidden";
    $("close-object").focus({ preventScroll: true });
    dimmer.style.opacity = ".58";
    if (!reduced.matches) {
      shadeMotion = dimmer.animate([{ opacity: 0 }, { opacity: .58 }], { duration: 280, fill: "both", easing: "cubic-bezier(.22,1,.36,1)" });
      motion = surface.animate([{ transform: ["pirinola", "balero", "dados"].includes(kind) ? "translate(0,16px) scale(.96)" : start, opacity: .55 }, { transform: "translate(0,0) scale(1)", opacity: 1 }], { duration: kind === "dados" ? 280 : 340, fill: "both", easing: "cubic-bezier(.22,1,.36,1)" });
      motion.onfinish = () => { if (!closing && motion) { motion.cancel(); motion = null; dialog.dataset.animating = "false"; } };
    }
    syncDados();
    if (kind === "map") document.dispatchEvent(new CustomEvent("civic:map-open"));
    if (kind === "loteria") document.dispatchEvent(new CustomEvent("civic:loteria-open"));
    if (kind === "pirinola") preparePirinola();
    if (kind === "balero") { syncBalero(); prepareBalero(); }
  }

  function flipCard() {
    const flipped = $("flip-card").classList.toggle("is-flipped");
    $("flip-card").setAttribute("aria-pressed", String(flipped));
    $("flip-card").setAttribute("aria-label", flipped ? "Ver ilustración de la carta" : `Dar la vuelta a ${cards[currentCard].title}`);
    $("flip-card").querySelector(".card-front").setAttribute("aria-hidden", String(flipped));
    $("flip-card").querySelector(".card-back").setAttribute("aria-hidden", String(!flipped));
    $("flip-card-control").textContent = flipped ? "Ver ilustración" : "Dar la vuelta";
    $("card-instruction").textContent = flipped ? "Datos nacionales. Cada carta abre una pregunta." : "Toca la carta para descubrir su historia.";
    const fact = facts[currentCard];
    $("card-reading").textContent = flipped && fact ? `${fact.title}. ${fact.text} ${fact.value}. ${fact.caution}` : "";
  }

  $("notebook-opener").addEventListener("click", openNotebook, { signal });
  $("notebook-to-map").addEventListener("click", () => closeObject(() => openObject("map", $("map-opener"))), { signal });
  $("dados-opener").addEventListener("click", () => openObject("dados", $("dados-opener")), { signal });
  $("dados-roll").addEventListener("click", () => {
    if (!dadosViewer || $("dados-roll").disabled || closing) return;
    $("dados-roll").disabled = true;
    $("dados-roll").textContent = "Lanzando…";
    $("dados-result").hidden = true;
    dadosViewer.resetCamera();
    dadosViewer.rollDice(undefined, undefined, reduced.matches);
  }, { signal });
  $("dados-canvas").addEventListener("keydown", event => {
    if (!dadosViewer || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    dadosViewer.rotateBy(event.key === "ArrowLeft" ? -15 : 15);
  }, { signal });
  $("balero-opener").addEventListener("click", () => openObject("balero", $("balero-opener")), { signal });
  $("balero-question").addEventListener("click", event => {
    const button = event.target.closest("[data-balero-answer]");
    if (!button) return;
    if (!baleroViewer || $("balero-question").disabled) return;
    const success = button.dataset.baleroAnswer === baleroQuestion.correct;
    baleroAnswered = true;
    button.setAttribute("aria-pressed", "true");
    $("balero-question").disabled = true;
    baleroViewer.setPose("showcase", reduced.matches);
    baleroTimer = setTimeout(() => {
      if (!dialog.open || dialog.dataset.object !== "balero") return;
      if (success) baleroViewer.playCapirucho(reduced.matches);
      else baleroViewer.playMiss(reduced.matches);
      baleroTimer = 0;
    }, reduced.matches ? 0 : 530);
  }, { signal });
  $("balero-retry").addEventListener("click", resetBaleroQuestion, { signal });
  $("pirinola-opener").addEventListener("click", () => openObject("pirinola", $("pirinola-opener")), { signal });
  $("pirinola-question").addEventListener("click", event => {
    const button = event.target.closest("[data-pirinola-answer]");
    if (!button || !pirinolaQuestion || $("pirinola-question").disabled) return;
    const success = button.dataset.pirinolaAnswer === pirinolaQuestion.correct;
    $("pirinola-question").disabled = true;
    button.setAttribute("aria-pressed", "true");
    $("pirinola-answers").querySelectorAll("button").forEach(option => {
      option.dataset.result = option.dataset.pirinolaAnswer === pirinolaQuestion.correct ? "correct" : "incorrect";
    });
    $("pirinola-feedback").textContent = pirinolaQuestion.explanation;
    $("pirinola-feedback").dataset.success = String(success);
    $("pirinola-feedback").hidden = false;
  }, { signal });
  $("pirinola-spin").addEventListener("click", () => {
    if ($("pirinola-spin").disabled || closing) return;
    $("pirinola-result").hidden = true;
    $("pirinola-spin").disabled = true;
    if (pirinolaViewer) {
      pirinolaViewer.spin(undefined, reduced.matches);
      return;
    }
    preparePirinola().then(viewer => {
      if (!viewer || !dialog.open || dialog.dataset.object !== "pirinola" || closing) return;
      viewer.spin(undefined, reduced.matches);
    });
  }, { signal });
  $("pirinola-canvas").addEventListener("keydown", event => {
    if (!pirinolaViewer || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    pirinolaViewer.rotateBy(event.key === "ArrowLeft" ? -60 : 60);
  }, { signal });
  $("map-opener").addEventListener("click", () => openObject("map", $("map-opener")), { signal });
  $("loteria-opener").addEventListener("click", () => openObject("loteria", $("loteria-opener")), { signal });
  document.querySelectorAll("[data-card]").forEach(button => button.addEventListener("click", () => openObject("card", button, button.dataset.card), { signal }));
  $("close-object").addEventListener("click", () => closeObject(), { signal });
  dialog.addEventListener("cancel", event => { event.preventDefault(); closeObject(); }, { signal });
  dialog.addEventListener("keydown", event => { if (event.key === "Escape" && !$("tooltip").hidden) event.preventDefault(); }, { signal, capture: true });
  dialog.addEventListener("click", event => { if (event.target === dialog) closeObject(); }, { signal });
  $("flip-card").addEventListener("click", flipCard, { signal });
  $("flip-card-control").addEventListener("click", flipCard, { signal });
  for (const [id, delta] of [["previous-card", -1], ["next-card", 1]]) {
    $(id).addEventListener("click", () => {
      source.style.visibility = "";
      const key = keys[(keys.indexOf(currentCard) + delta + keys.length) % keys.length];
      source = document.querySelector(`[data-card="${key}"]`);
      source.style.visibility = "hidden";
      showCard(key);
    }, { signal });
  }
  $("card-to-map").addEventListener("click", () => {
    const card = cards[currentCard];
    closeObject(() => {
      openObject("map", $("map-opener"));
      document.dispatchEvent(new CustomEvent("civic:request-story", { detail: { mode: card.mode, panel: card.panel } }));
    });
  }, { signal });
  document.addEventListener("civic:card-facts", event => { facts = event.detail; if (dialog.open && dialog.dataset.object === "card") showCard(currentCard); }, { signal });
  window.addEventListener("scroll", scheduleDesk, { passive: true, signal });
  window.addEventListener("resize", scheduleDesk, { passive: true, signal });
  reduced.addEventListener("change", () => {
    if (motion) {
      if (closing) finishClose();
      else { motion.cancel(); motion = null; dialog.dataset.animating = "false"; }
    }
    scheduleDesk();
  }, { signal });
  const observer = new IntersectionObserver(entries => { sceneVisible = entries[0].isIntersecting; if (sceneVisible) scheduleDesk(); syncPirinola(); syncBalero(); syncDados(); }, { threshold: 0 });
  observer.observe($("mesa"));
  document.addEventListener("visibilitychange", syncDados, { signal });
  window.addEventListener("pagehide", event => {
    if (event.persisted) return;
    lifecycle.abort();
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    if (motion) motion.cancel();
    if (shadeMotion) shadeMotion.cancel();
    if (pirinolaViewer) pirinolaViewer.destroy();
    clearTimeout(baleroTimer);
    clearTimeout(notebookTimer);
    if (baleroViewer) baleroViewer.destroy();
    if (dadosViewer) dadosViewer.destroy();
    dimmer.remove();
  }, { once: true });
  updateDesk();
  syncPirinola();
  syncBalero();
  syncDados();
})();
