(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const base = "assets/imgs/loteria/";
  let game = null;
  let flipped = false;
  let machineTimers = new Set();
  const bean = base + "frijol.png";

  function clearTimers() {
    for (const timer of machineTimers) clearTimeout(timer);
    machineTimers.clear();
  }

  function updateScores() {
    $("loteria-player-score").textContent = `${game.playerMarks.size}/${game.size ** 2}`;
    $("loteria-machine-score").textContent = `${game.machineMarks.size}/${game.size ** 2}`;
    $("loteria-remaining").textContent = `${game.remaining} cartas por salir`;
  }

  function finish() {
    if (!game.winner) return;
    clearTimers();
    const status = $("loteria-status");
    status.dataset.winner = game.winner;
    status.replaceChildren();
    const headline = document.createElement("strong");
    headline.textContent = game.winner === "player" ? "¡LOTERÍA!" : "Ganó la máquina";
    const detail = document.createElement("span");
    detail.textContent = game.winner === "player" ? "Llenaste tu tablero. ¡Bien jugado!" : "Completó su tablero. Puedes jugar otra partida.";
    status.append(headline, detail);
    $("loteria-call").disabled = true;
    $("loteria-restart").hidden = false;
  }

  function renderBoard(side) {
    const panel = $(side === "player" ? "loteria-player-board" : "loteria-machine-board");
    const board = game[side];
    const marks = side === "player" ? game.playerMarks : game.machineMarks;
    panel.style.setProperty("--board-size", game.size);
    panel.replaceChildren(...board.map(card => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "loteria-cell";
      button.dataset.card = card.id;
      button.setAttribute("aria-label", `${card.title}${marks.has(card.id) ? ", marcado" : ""}`);
      button.setAttribute("aria-pressed", String(marks.has(card.id)));
      button.disabled = side === "machine" || !!game.winner;
      const picture = document.createElement("img");
      picture.src = base + card.image;
      picture.alt = "";
      picture.width = 896;
      picture.height = 1200;
      picture.loading = "lazy";
      button.append(picture);
      if (marks.has(card.id)) {
        const marker = document.createElement("img");
        marker.className = "loteria-bean";
        marker.src = bean;
        marker.alt = "";
        marker.width = 80;
        marker.height = 80;
        button.append(marker);
      }
      return button;
    }));
    updateScores();
  }

  function markCell(side, id) {
    const panel = $(side === "player" ? "loteria-player-board" : "loteria-machine-board");
    const cell = panel.querySelector(`[data-card="${id}"]`);
    if (!cell) return;
    cell.setAttribute("aria-pressed", "true");
    cell.setAttribute("aria-label", `${CivicLoteria.cards.find(card => card.id === id).title}, marcado`);
    const marker = document.createElement("img");
    marker.className = "loteria-bean";
    marker.src = bean;
    marker.alt = "";
    marker.width = 80;
    marker.height = 80;
    cell.append(marker);
    updateScores();
  }

  function draw() {
    delete $("loteria-status").dataset.winner;
    const card = game.draw();
    if (!card) {
      $("loteria-status").textContent = "Ya salieron las 18 cartas. Marca las que tengas pendientes.";
      $("loteria-call").disabled = true;
      return;
    }
    flipped = false;
    $("loteria-call").classList.remove("is-flipped");
    $("loteria-call").setAttribute("aria-label", `Voltear ${card.title}`);
    $("loteria-call-image").src = base + card.image;
    $("loteria-call-image").alt = `Carta ${card.id}, ${card.title}`;
    $("loteria-call-title").textContent = card.title;
    $("loteria-call-text").textContent = card.description;
    $("loteria-status").textContent = `${card.title}. Toca la carta para leerla.`;
    updateScores();
    if (game.opponent && game.machine.some(item => item.id === card.id)) {
      const timer = setTimeout(() => {
        machineTimers.delete(timer);
        if (!game || !game.mark(card.id, "machine")) return;
        markCell("machine", card.id);
        finish();
      }, 1000 + Math.floor(Math.random() * 2001));
      machineTimers.add(timer);
    }
  }

  $("loteria-start").addEventListener("click", () => {
    clearTimers();
    const size = Number(document.querySelector('input[name="loteria-size"]:checked').value);
    const opponent = document.querySelector('input[name="loteria-opponent"]:checked').value === "machine";
    game = CivicLoteria.createGame({ size, opponent });
    delete $("loteria-status").dataset.winner;
    $("loteria-setup").hidden = true;
    $("loteria-play").hidden = false;
    $("loteria-machine-panel").hidden = !opponent;
    $("loteria-restart").hidden = false;
    $("loteria-call").disabled = false;
    renderBoard("player");
    if (opponent) renderBoard("machine");
    draw();
  });

  $("loteria-restart").addEventListener("click", () => {
    clearTimers();
    game = null;
    delete $("loteria-status").dataset.winner;
    $("loteria-setup").hidden = false;
    $("loteria-play").hidden = true;
    $("loteria-restart").hidden = true;
  });

  $("loteria-call").addEventListener("click", () => {
    if (!game || game.winner) return;
    if (!flipped) {
      flipped = true;
      $("loteria-call").classList.add("is-flipped");
      $("loteria-call").setAttribute("aria-label", "Siguiente carta");
      $("loteria-status").textContent = `${game.current.title}. ${game.current.description} Toca de nuevo para seguir.`;
    } else draw();
  });

  $("loteria-player-board").addEventListener("click", event => {
    const cell = event.target.closest(".loteria-cell");
    if (!cell || !game || game.winner) return;
    if (!game.mark(cell.dataset.card)) return;
    markCell("player", cell.dataset.card);
    finish();
  });

  document.addEventListener("civic:loteria-close", clearTimers);
  document.addEventListener("civic:loteria-open", () => {
    if (game && game.opponent && !game.winner) {
      for (const card of game.machine) {
        if (game.called.has(card.id) && !game.machineMarks.has(card.id)) {
          const timer = setTimeout(() => {
            machineTimers.delete(timer);
            if (game && game.mark(card.id, "machine")) { markCell("machine", card.id); finish(); }
          }, 1000 + Math.floor(Math.random() * 2001));
          machineTimers.add(timer);
        }
      }
    }
  });
  window.addEventListener("pagehide", clearTimers);
})();
