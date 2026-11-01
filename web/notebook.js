(function (root) {
  "use strict";
  const $ = id => document.getElementById(id);
  const definitions = [
    { id: "guide", name: "Mesa abierta", image: "Cuaderno abierto", shape: "rombo", color: "#a32c39", symbol: "⌑", condition: "Abrir la guía." },
    { id: "state_first", name: "Primer estado", image: "Mapa con una entidad marcada", shape: "hexágono", color: "#1d7787", symbol: "◇", condition: "Elegir un estado en el mapa." },
    { id: "state_all", name: "Los 32", image: "Silueta de México con 32 puntos", shape: "estrella", color: "#b98b32", symbol: "✦", condition: "Explorar las 32 entidades." },
    { id: "years_all", name: "Seis momentos", image: "Seis hojas de calendario", shape: "cuadro", color: "#ad6745", symbol: "▦", condition: "Consultar los seis años." },
    { id: "card_flip", name: "Carta curiosa", image: "Carta de lotería volteada", shape: "rombo", color: "#aa6038", symbol: "↺", condition: "Voltear una carta suelta." },
    { id: "loteria_win", name: "¡Lotería cívica!", image: "Cartón lleno de frijoles", shape: "escudo", color: "#a32c39", symbol: "✹", condition: "Completar tu tablero." },
    { id: "machine_win", name: "Le gané a la máquina", image: "Frijol sobre un tablero rival", shape: "estrella", color: "#438363", symbol: "✦", condition: "Vencer a la máquina." },
    { id: "atlas_end", name: "Atlas completo", image: "Libro abierto con mapa", shape: "hexágono", color: "#1d5870", symbol: "▤", condition: "Llegar al último capítulo." },
    { id: "balero_first", name: "Buen tiro", image: "Balero ensartado", shape: "círculo", color: "#438363", symbol: "◎", condition: "Acertar una pregunta del balero." },
    { id: "balero_all", name: "Maestría del balero", image: "Balero con ocho estrellas", shape: "estrella", color: "#b98b32", symbol: "✦", condition: "Acertar sus ocho preguntas distintas." },
    { id: "pirinola_first", name: "Giro acertado", image: "Pirinola sobre una respuesta", shape: "rombo", color: "#704f8a", symbol: "✧", condition: "Acertar una pregunta de la pirinola." },
    { id: "pirinola_all", name: "Tres niveles", image: "Pirinola con tres franjas", shape: "hexágono", color: "#704f8a", symbol: "⋈", condition: "Acertar sus 24 preguntas distintas." },
    { id: "dice_first", name: "Dos historias", image: "Dos dados de mito y verdad", shape: "cuadro", color: "#ad6745", symbol: "⚄", condition: "Lanzar los dados una vez." },
    { id: "dice_all", name: "Cuatro combinaciones", image: "Dados con cuatro caras combinadas", shape: "escudo", color: "#1d7787", symbol: "⚁", condition: "Ver las cuatro combinaciones de mito y verdad." },
    { id: "master", name: "Mente cívica", image: "Laurel alrededor de un libro", shape: "estrella", color: "#b98b32", symbol: "✦", condition: "Acertar las 32 preguntas de balero y pirinola." },
    { id: "credential_download", name: "Identidad cívica", image: "Credencial ilustrativa con estrella", shape: "escudo", color: "#1d5870", symbol: "▣", condition: "Descargar tu credencial de ejemplo." }
  ];
  const storageKey = "ine-civic-achievements-v1";
  const fields = ["earned", "states", "years", "balero", "pirinola", "dice"];
  let stored = {};
  try { stored = JSON.parse(root.localStorage.getItem(storageKey) || "{}"); } catch { stored = {}; }
  const progress = Object.fromEntries(fields.map(field => [field, Array.isArray(stored[field]) ? [...new Set(stored[field])] : []]));
  const left = document.querySelector(".notebook-paper-left");
  const right = document.querySelector(".notebook-paper-right");
  const guideLeft = left.innerHTML;
  const guideRight = right.innerHTML;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = matchMedia("(max-width: 650px)");
  const guideSteps = [...left.querySelectorAll("ol li")].map(item => item.outerHTML);
  const guideTerms = [...right.querySelectorAll("dt")].map(term => term.outerHTML + term.nextElementSibling.outerHTML);
  const guidePage = (start, end) => `<h2>Guía de la mesa</h2><ol start="${start + 1}">${guideSteps.slice(start, end).join("")}</ol>`;
  const glossaryPage = (start, end) => `<h3>${start ? "Más palabras para entender" : "Palabras para entender los datos"}</h3><dl>${guideTerms.slice(start, end).join("")}</dl>`;
  const mobilePages = [
    { spread: 0, side: "left", content: guidePage(0, 2) },
    { spread: 0, side: "left", content: guidePage(2, 3) },
    { spread: 0, side: "left", content: guidePage(3, 4) },
    { spread: 0, side: "left", content: guidePage(4, 6) },
    { spread: 0, side: "right", content: glossaryPage(0, 3) },
    { spread: 0, side: "right", content: glossaryPage(3, 6) },
    { spread: 1, side: "left", title: "Logros de exploración", items: [0, 2] },
    { spread: 1, side: "left", title: "Logros de exploración", items: [2, 4] },
    { spread: 1, side: "right", title: "Logros de juego", items: [4, 6] },
    { spread: 1, side: "right", title: "Logros de juego", items: [6, 8] },
    { spread: 2, side: "left", title: "Logros de preguntas", items: [8, 10] },
    { spread: 2, side: "left", title: "Logros de preguntas", items: [10, 12] },
    { spread: 2, side: "right", title: "Logros de curiosidad", items: [12, 14] },
    { spread: 2, side: "right", title: "Logros de curiosidad", items: [14, 16] },
    { spread: 3, side: "left", method: [0, 2] },
    { spread: 3, side: "left", method: [2, 4] },
    { spread: 3, side: "right", method: [0, 3] },
    { spread: 3, side: "right", method: [3, 5] },
    { spread: 4, side: "left" },
    { spread: 4, side: "right" }
  ];
  let spread = 0;
  let pageIndex = 0;
  let turning = false;

  function save() {
    try { root.localStorage.setItem(storageKey, JSON.stringify(progress)); } catch {}
    document.dispatchEvent(new CustomEvent("civic:achievements-updated"));
  }

  function award(id) {
    if (!definitions.some(item => item.id === id) || progress.earned.includes(id)) return false;
    progress.earned.push(id);
    save();
    document.dispatchEvent(new CustomEvent("civic:achievement", { detail: { id } }));
    return true;
  }

  function record(type, value) {
    const field = { state: "states", year: "years", balero: "balero", pirinola: "pirinola", dice: "dice" }[type];
    if (!field || value === undefined || value === null || progress[field].includes(value)) return;
    progress[field].push(value);
    save();
    if (type === "state") { award("state_first"); if (progress.states.length === 32) award("state_all"); }
    if (type === "year" && progress.years.length === 6) award("years_all");
    if (type === "balero") { award("balero_first"); if (progress.balero.length === 8) award("balero_all"); }
    if (type === "pirinola") { award("pirinola_first"); if (progress.pirinola.length === 24) award("pirinola_all"); }
    if (type === "dice") { award("dice_first"); if (progress.dice.length === 4) award("dice_all"); }
    if (progress.balero.length === 8 && progress.pirinola.length === 24) award("master");
  }

  function achievementPage(container, title, items) {
    container.replaceChildren();
    const kicker = document.createElement("p");
    kicker.className = "notebook-kicker";
    kicker.textContent = `${progress.earned.length} de ${definitions.length} conseguidos`;
    const heading = document.createElement("h3");
    heading.textContent = title;
    const lead = document.createElement("p");
    lead.className = "notebook-lead";
    lead.textContent = "Tus logros se guardan solo en este navegador.";
    const grid = document.createElement("div");
    grid.className = "notebook-achievements";
    for (const item of items) {
      const card = document.createElement("article");
      card.className = "notebook-achievement";
      card.dataset.earned = String(progress.earned.includes(item.id));
      const badge = document.createElement("span");
      badge.className = "notebook-badge";
      badge.dataset.shape = item.shape;
      badge.style.setProperty("--badge-color", item.color);
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = item.symbol;
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      const condition = document.createElement("small");
      const art = document.createElement("em");
      name.textContent = item.name;
      condition.textContent = item.condition;
      art.textContent = `${item.shape} · ${item.image}`;
      copy.append(name, condition, art);
      card.append(badge, copy);
      grid.append(card);
    }
    container.append(kicker, heading, lead, grid);
  }

  function renderSpread(index) {
    spread = index;
    if (index === 0) {
      left.innerHTML = guideLeft;
      right.innerHTML = guideRight;
    } else if (index === 1) {
      achievementPage(left, "Logros de exploración", definitions.slice(0, 4));
      achievementPage(right, "Logros de juego", definitions.slice(4, 8));
    } else if (index === 2) {
      achievementPage(left, "Logros de preguntas", definitions.slice(8, 12));
      achievementPage(right, "Logros de curiosidad", definitions.slice(12, 16));
    } else if (index === 3) {
      left.innerHTML = '<div class="notebook-method"><p class="notebook-kicker">Metodología · origen</p><h2>De dónde vienen</h2><p>El INE publicó los Conteos Censales de Participación Ciudadana de 2009, 2012, 2015, 2018, 2021 y 2024.</p><p>Cada elección ordinaria tiene un archivo por entidad: 32 estados × 6 elecciones = 192 archivos. La clave EDOCVE conecta sus datos con el mapa.</p><p>Voto Anticipado y Prisión Preventiva de 2024 vienen de dos archivos separados. No se mezclan con el universo ordinario para calcular porcentajes.</p><p>Las elecciones son fotografías de años distintos. No seguimos a las mismas personas a través del tiempo.</p></div>';
      right.innerHTML = '<div class="notebook-method"><p class="notebook-kicker">Metodología · cálculo</p><h3>Cómo se calcula</h3><p>Primero se suman los registros del grupo elegido; después se divide. No se promedian porcentajes.</p><span class="notebook-equation">Participación = SV ÷ LN × 100</span><span class="notebook-equation">Abstención = NV ÷ LN × 100</span><p>NS significa que no se especificó si votó. Se conserva separado de “no votó”. Si la lista nominal del grupo tiene menos de 100 registros, lee la tasa con cautela.</p><p>Los archivos especiales se presentan como conteos porque no tienen aquí una base comparable para calcular una tasa.</p></div>';
    } else {
      left.innerHTML = '<div class="notebook-team"><p class="notebook-kicker">Camaradas de la Nación</p><span class="notebook-team-mark" aria-hidden="true">SE</span><h2>Sandra Erika<br>Sánchez Fragozo</h2><p>Integrante de Camaradas de la Nación.</p></div>';
      right.innerHTML = '<div class="notebook-team"><p class="notebook-kicker">Camaradas de la Nación</p><span class="notebook-team-mark" aria-hidden="true">SS</span><h3>Saraí<br>Sánchez Fragozo</h3><p>Integrante de Camaradas de la Nación.</p></div>';
    }
    left.scrollTop = 0;
    right.scrollTop = 0;
    $("notebook-previous").hidden = index === 0;
    $("notebook-next").hidden = index === 4;
    $("notebook-page-status").textContent = `Páginas ${index * 2 + 1} y ${index * 2 + 2} de 10`;
  }

  function renderNotebook(index) {
    if (!mobile.matches) {
      left.hidden = false;
      right.hidden = false;
      renderSpread(index);
      return;
    }
    pageIndex = index;
    const page = mobilePages[index];
    renderSpread(page.spread);
    if (page.content) (page.side === "left" ? left : right).innerHTML = page.content;
    if (page.items) achievementPage(page.side === "left" ? left : right, page.title, definitions.slice(...page.items));
    if (page.method) {
      const method = (page.side === "left" ? left : right).querySelector(".notebook-method");
      const children = [...method.children];
      method.replaceChildren(...children.slice(0, 2), ...children.slice(page.method[0] + 2, page.method[1] + 2));
    }
    left.hidden = page.side !== "left";
    right.hidden = page.side !== "right";
    $("notebook-previous").hidden = index === 0;
    $("notebook-next").hidden = index === mobilePages.length - 1;
    $("notebook-previous").setAttribute("aria-label", "Página anterior");
    $("notebook-next").setAttribute("aria-label", "Página siguiente");
    $("notebook-page-status").textContent = `Página ${index + 1} de ${mobilePages.length}`;
  }

  async function turn(delta) {
    const isMobile = mobile.matches;
    const target = (isMobile ? pageIndex : spread) + delta;
    const last = isMobile ? mobilePages.length - 1 : 4;
    if (turning || target < 0 || target > last) return;
    turning = true;
    const outgoing = isMobile ? left.hidden ? right : left : delta > 0 ? right : left;
    if (!reduced.matches) {
      try { await outgoing.animate([{ transform: "rotateY(0deg)", opacity: 1 }, { transform: `rotateY(${delta > 0 ? -20 : 20}deg)`, opacity: .35 }], { duration: 210, easing: "cubic-bezier(.22,1,.36,1)" }).finished; } catch {}
    }
    renderNotebook(target);
    const incoming = isMobile ? left.hidden ? right : left : delta > 0 ? left : right;
    if (!reduced.matches) {
      try { await incoming.animate([{ transform: `rotateY(${delta > 0 ? 18 : -18}deg)`, opacity: .35 }, { transform: "rotateY(0deg)", opacity: 1 }], { duration: 230, easing: "cubic-bezier(.22,1,.36,1)" }).finished; } catch {}
    }
    turning = false;
    $(delta > 0 && target === last ? "notebook-previous" : delta < 0 && target === 0 ? "notebook-next" : delta > 0 ? "notebook-next" : "notebook-previous").focus({ preventScroll: true });
  }

  root.CivicAchievements = { definitions, award, record, progress: () => structuredClone(progress) };
  $("notebook-next").addEventListener("click", () => turn(1));
  $("notebook-previous").addEventListener("click", () => turn(-1));
  document.addEventListener("civic:notebook-open", () => { renderNotebook(0); award("guide"); });
  document.addEventListener("civic:achievements-updated", () => { if (spread === 1 || spread === 2) renderNotebook(mobile.matches ? pageIndex : spread); });
  mobile.addEventListener("change", () => {
    if (!$("notebook-focus").hidden) renderNotebook(mobile.matches ? [0, 6, 10, 14, 18][spread] : spread);
  });
  document.addEventListener("civic:map-open", () => {
    for (const input of document.querySelectorAll('input[name="simple-year"]:checked')) record("year", Number(input.value));
  });
  document.addEventListener("click", event => {
    const state = event.target.closest("#mexico-map .state[data-edocve]");
    if (state) record("state", Number(state.dataset.edocve));
  });
  document.addEventListener("change", event => {
    if (event.target.matches('input[name="simple-year"]:checked, #atlas-year')) record("year", Number(event.target.value));
  });
})(window);
