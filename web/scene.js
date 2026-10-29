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
    first: { title: "El primer voto", number: "18", image: "el-primer-voto.jpg", mode: "age", panel: "age" },
    election: { title: "La intermedia", number: "22", image: "la-intermedia.jpg", mode: "election", panel: "history" },
    women: { title: "La votante", number: "61", image: "la-votante.jpg", mode: "gender", panel: "territory" },
    inclusion: { title: "La inclusión", number: "24", image: "la-inclusion.jpg", mode: "gender", panel: "inclusion" }
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

  function finishClose() {
    if (!closing) return;
    if (motion) motion.cancel();
    motion = null;
    if (shadeMotion) shadeMotion.cancel();
    shadeMotion = null;
    dimmer.style.opacity = "0";
    surface.style.opacity = "1";
    dialog.close();
    document.documentElement.style.overflow = scrollOverflow;
    document.body.classList.remove("object-returning");
    source.style.visibility = "";
    source.focus({ preventScroll: true });
    source = null;
    closing = false;
    dialog.dataset.animating = "false";
    scheduleDesk();
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
      motion = surface.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: originTransform(), opacity: .5 }], { duration: 280, fill: "both", easing: "cubic-bezier(.22,1,.36,1)" });
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
    $("map-focus").hidden = kind !== "map";
    $("card-focus").hidden = kind !== "card";
    dialog.dataset.object = kind;
    dialog.dataset.animating = String(!reduced.matches);
    if (kind === "map") $("map-controls").open = !mobile.matches;
    dialog.setAttribute("aria-labelledby", kind === "map" ? "object-title" : "card-title");
    if (kind === "card") showCard(key);
    scrollOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
    const start = originTransform();
    source.style.visibility = "hidden";
    $("close-object").focus({ preventScroll: true });
    dimmer.style.opacity = ".58";
    if (!reduced.matches) {
      shadeMotion = dimmer.animate([{ opacity: 0 }, { opacity: .58 }], { duration: 280, fill: "both", easing: "cubic-bezier(.22,1,.36,1)" });
      motion = surface.animate([{ transform: start, opacity: .55 }, { transform: "translate(0,0) scale(1)", opacity: 1 }], { duration: 340, fill: "both", easing: "cubic-bezier(.22,1,.36,1)" });
      motion.onfinish = () => { if (!closing && motion) { motion.cancel(); motion = null; dialog.dataset.animating = "false"; } };
    }
    if (kind === "map") document.dispatchEvent(new CustomEvent("civic:map-open"));
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

  $("map-opener").addEventListener("click", () => openObject("map", $("map-opener")), { signal });
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
  mobile.addEventListener("change", () => { if (!mobile.matches) $("map-controls").open = true; }, { signal });
  reduced.addEventListener("change", () => {
    if (motion) {
      if (closing) finishClose();
      else { motion.cancel(); motion = null; dialog.dataset.animating = "false"; }
    }
    scheduleDesk();
  }, { signal });
  const observer = new IntersectionObserver(entries => { sceneVisible = entries[0].isIntersecting; if (sceneVisible) scheduleDesk(); }, { threshold: 0 });
  observer.observe($("mesa"));
  window.addEventListener("pagehide", event => {
    if (event.persisted) return;
    lifecycle.abort();
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    if (motion) motion.cancel();
    if (shadeMotion) shadeMotion.cancel();
    dimmer.remove();
  }, { once: true });
  updateDesk();
})();
