(function () {
  "use strict";
  const data = JSON.parse(document.getElementById("ccpc-data").textContent);
  const $ = id => document.getElementById(id);
  const map = $("mexico-map");
  const states = [...map.querySelectorAll(".state")];
  const selectionOutline = document.createElementNS("http://www.w3.org/2000/svg", "g");
  selectionOutline.setAttribute("class", "simple-selection-outline");
  selectionOutline.setAttribute("aria-hidden", "true");
  selectionOutline.setAttribute("pointer-events", "none");
  map.append(selectionOutline);
  const selected = new Set();
  const number = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ageNames = ["18–19", "20–24", "25–29", "30–39", "40–49", "50–59", "60–69", "70+"];
  const clean = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const counts = () => ({ ln: 0, sv: 0, nv: 0, ns: 0 });
  const participation = item => item.ln ? item.sv / item.ln * 100 : null;
  const pct = value => value === null ? "Sin dato" : `${decimal.format(value)}%`;
  const checked = name => [...document.querySelectorAll(`input[name="simple-${name}"]:checked`)].map(input => Number(input.value));
  const rowsByState = new Map();
  for (const row of data.rows) {
    const state = row[1];
    if (!rowsByState.has(state)) rowsByState.set(state, []);
    rowsByState.get(state).push(row);
  }
  let story = "participation";
  let currentMetrics = new Map();
  let activeTip = null;
  const storyCopy = {
    participation: ["¿Qué significa participar?", "La participación indica qué parte de la lista nominal tiene una marca de voto. La lista nominal es el conjunto de registros usados como base para esta comparación."],
    age: ["La edad cambia la historia", "Los grupos de 18–19 y 20–29 años permiten observar si la participación baja después de la primera edad con derecho a votar. No se sigue a las mismas personas a través del tiempo."],
    election: ["Cada elección tiene su contexto", "Una elección presidencial también elige a quien encabezará el gobierno federal. Una intermedia ocurre entre presidenciales. Aquí puedes comparar sus resultados, sin atribuir la diferencia a una sola causa."],
    inclusion: ["Hay distintas formas de participar", "Los archivos de Voto Anticipado y Prisión Preventiva registran modalidades distintas de la votación ordinaria. No se suman a la lista nominal del mapa ni permiten calcular una tasa de participación."]
  };

  function filters() {
    let min = Number($("simple-age-min").value);
    let max = Number($("simple-age-max").value);
    if (min > max) [min, max] = [max, min];
    $("simple-min-label").textContent = ageNames[min];
    $("simple-max-label").textContent = ageNames[max];
    $("simple-age-description").textContent = min === max ? `${ageNames[min]} años` : `De ${ageNames[min]} a ${ageNames[max]} años`;
    document.querySelector(".simple-range").style.setProperty("--range-start", `${min / 7 * 100}%`);
    document.querySelector(".simple-range").style.setProperty("--range-end", `${max / 7 * 100}%`);
    return { min, max, sexes: checked("sex"), zones: checked("zone"), years: checked("year") };
  }

  function sum(state, f, sex = null, zone = null, ages = null, years = null) {
    const result = counts();
    const sexSet = new Set(sex === null ? f.sexes : [sex]);
    const zoneSet = new Set(zone === null ? f.zones : [zone]);
    const yearSet = new Set(years || f.years);
    for (const row of rowsByState.get(state) || []) {
      if (!yearSet.has(row[0]) || !sexSet.has(row[3]) || !zoneSet.has(row[2]) || row[4] < f.min || row[4] > f.max) continue;
      if (ages && !ages.includes(row[4])) continue;
      result.ln += row[5]; result.sv += row[6]; result.nv += row[7]; result.ns += row[8];
    }
    return result;
  }

  function updateMap(f) {
    currentMetrics = new Map(states.map(group => {
      const code = Number(group.dataset.edocve);
      return [code, sum(code, f)];
    }));
    for (const group of states) {
      const code = Number(group.dataset.edocve);
      const item = currentMetrics.get(code);
      const value = participation(item);
      const lightness = value === null ? 84 : 88 - Math.max(0, Math.min(100, value)) * .55;
      group.style.setProperty("--state-fill", value === null ? "#b8c3c0" : `hsl(176 39% ${lightness}%)`);
      group.setAttribute("aria-pressed", String(selected.has(code)));
      group.setAttribute("aria-label", `${data.states[code]}. Participación: ${pct(value)}. ${selected.has(code) ? "Seleccionado" : "Seleccionar estado"}.`);
    }
    selectionOutline.replaceChildren(...states.filter(group => selected.has(Number(group.dataset.edocve))).flatMap(group => [...group.querySelectorAll("path")].map(source => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", source.getAttribute("d"));
      path.setAttribute("fill-rule", source.getAttribute("fill-rule") || "nonzero");
      return path;
    })));
    $("simple-map-hint").hidden = selected.size > 0;
    $("simple-selection-count").textContent = selected.size ? `${selected.size} ${selected.size === 1 ? "estado elegido" : "estados elegidos"}` : "Todo México";
  }

  function tableRows(f) {
    const locations = selected.size ? [...selected].sort((a, b) => a - b) : [0];
    const splitSex = f.sexes.length > 1 && f.sexes.length < 3;
    const splitZone = f.zones.length > 1 && f.zones.length < 3;
    const sexes = splitSex ? f.sexes : [null];
    const zones = splitZone ? f.zones : [null];
    return locations.flatMap(state => sexes.flatMap(sex => zones.map(zone => {
      const label = [state ? data.states[state] : "Todo México", sex === null ? null : data.sexes[sex], zone === null ? null : data.sections[zone]].filter(Boolean).join(" · ");
      return { label, counts: sum(state, f, sex, zone) };
    })));
  }

  function updateTable(f) {
    const rows = tableRows(f);
    $("simple-comparison-body").innerHTML = rows.map(row => `<tr data-small="${row.counts.ln > 0 && row.counts.ln < 100}"><th scope="row">${clean(row.label)}</th><td>${number.format(row.counts.sv)}</td><td>${number.format(row.counts.ln)}</td><td>${pct(participation(row.counts))}</td></tr>`).join("");
    const years = f.years.length === 1 ? String(f.years[0]) : `${f.years.length} elecciones`;
    $("simple-comparison-scope").textContent = `${years} · ${$("simple-age-description").textContent} · ${selected.size ? "estados elegidos" : "total nacional"}`;
    $("simple-table-note").textContent = `${f.years.length > 1 ? "Al elegir varios años se suman registros de elecciones distintas; no son personas únicas. " : ""}* Base menor de 100 registros: interpreta el porcentaje con cautela. “Sin dato” significa que no hay base para calcularlo.`;
  }

  function updateStory(f) {
    $("simple-story-panel").setAttribute("aria-labelledby", `simple-tab-${story}`);
    const [title, general] = storyCopy[story];
    $("simple-story-title").textContent = title;
    $("simple-story-general").textContent = general;
    const location = selected.size === 1 ? data.states[[...selected][0]] : selected.size ? `${selected.size} estados` : "México";
    const chosen = selected.size ? [...selected] : [0];
    const combined = counts();
    for (const state of chosen) {
      const item = sum(state, f);
      for (const key of ["ln", "sv", "nv", "ns"]) combined[key] += item[key];
    }
    let fact = pct(participation(combined));
    let dynamic = `En ${location}, ${number.format(combined.sv)} de ${number.format(combined.ln)} registros tienen marca de voto con los filtros elegidos. ${number.format(combined.ns)} registros no especifican si votaron.`;
    if (story === "age") {
      const youngFilter = { ...f, min: 0, max: 7 };
      const first = counts(), young = counts();
      for (const state of chosen) {
        for (const [target, ages] of [[first, [0]], [young, [1, 2]]]) {
          const item = sum(state, youngFilter, null, null, ages);
          for (const key of ["ln", "sv", "nv", "ns"]) target[key] += item[key];
        }
      }
      const a = participation(first), b = participation(young);
      fact = a === null || b === null ? "Sin comparación" : `${decimal.format(Math.abs(a - b))} puntos ${a >= b ? "menos" : "más"} en 20–29`;
      dynamic = `En ${location}, votó ${pct(a)} del grupo de 18–19 y ${pct(b)} del grupo de 20–29. Esta historia conserva los filtros de sexo, zona y año, y compara las edades indicadas.`;
    } else if (story === "election") {
      const presidential = counts(), intermediate = counts();
      for (const state of chosen) {
        for (const [target, years] of [[presidential, [2012, 2018, 2024]], [intermediate, [2009, 2015, 2021]]]) {
          const item = sum(state, f, null, null, null, years.filter(year => f.years.includes(year)));
          for (const key of ["ln", "sv", "nv", "ns"]) target[key] += item[key];
        }
      }
      fact = `${pct(participation(presidential))} frente a ${pct(participation(intermediate))}`;
      dynamic = `En ${location}, la participación en los años presidenciales elegidos fue ${pct(participation(presidential))}; en los intermedios elegidos fue ${pct(participation(intermediate))}. Selecciona al menos un año de cada tipo para compararlos.`;
    } else if (story === "inclusion") {
      const special = [0, 0];
      const statesSet = new Set(chosen);
      for (const row of data.special) {
        if ((selected.size && !statesSet.has(row[0])) || !f.sexes.includes(row[1])) continue;
        special[row[2]] += row[3];
      }
      const nonbinary = counts();
      for (const state of chosen) {
        const item = sum(state, f, 2, null, null, [2024]);
        for (const key of ["ln", "sv", "nv", "ns"]) nonbinary[key] += item[key];
      }
      fact = `Anticipado: ${number.format(special[0])} · Prisión Preventiva: ${number.format(special[1])}`;
      dynamic = `${location}: estos son registros de 2024, separados de la votación ordinaria. El filtro de sexo sí se aplica; edad, zona y año no existen en esos archivos. En el cubo ordinario de 2024, “No binario” registra ${number.format(nonbinary.ln)} en lista nominal y ${number.format(nonbinary.sv)} con marca de voto bajo la edad y zona elegidas.${nonbinary.ln > 0 && nonbinary.ln < 100 ? " Es una base pequeña." : ""}`;
    }
    $("simple-story-fact").textContent = fact;
    $("simple-story-dynamic").textContent = dynamic;
  }

  function render() {
    const f = filters();
    updateMap(f);
    updateTable(f);
    updateStory(f);
    $("simple-filter-note").textContent = !f.years.length || !f.sexes.length || !f.zones.length ? "Elige al menos una opción de sexo, zona y año para ver resultados." : f.sexes.includes(2) && !f.years.includes(2024) ? "La categoría No binario solo tiene registros en 2024; los demás grupos siguen visibles." : "Puedes marcar varios grupos y estados para compararlos.";
    $("live-status").textContent = `${selected.size ? `${selected.size} estados elegidos` : "Todo México"}. ${$("simple-comparison-scope").textContent}.`;
  }

  function toggleState(code) {
    if (selected.has(code)) selected.delete(code);
    else selected.add(code);
    hideTip();
    render();
  }

  function showTip(group, event) {
    const code = Number(group.dataset.edocve);
    const item = currentMetrics.get(code);
    if (!item) return;
    activeTip = group;
    $("tooltip").innerHTML = `<strong>${clean(data.states[code])}</strong><p><b>${pct(participation(item))}</b> de la lista nominal tiene marca de voto.</p><small>Sí votó: ${number.format(item.sv)} de ${number.format(item.ln)} registros.<br>No votó: ${number.format(item.nv)} · Sin especificar: ${number.format(item.ns)}${item.ln > 0 && item.ln < 100 ? "<br>Base pequeña: menos de 100 registros" : ""}</small>`;
    $("tooltip").hidden = false;
    const rect = group.getBoundingClientRect();
    const x = event?.clientX ?? rect.left + rect.width / 2;
    const y = event?.clientY ?? rect.top + rect.height / 2;
    const tip = $("tooltip").getBoundingClientRect();
    $("tooltip").style.left = `${Math.max(8, Math.min(innerWidth - tip.width - 8, x + 14))}px`;
    $("tooltip").style.top = `${Math.max(8, Math.min(innerHeight - tip.height - 8, y + 14))}px`;
  }

  function hideTip() { $("tooltip").hidden = true; activeTip = null; }
  map.addEventListener("click", event => { const group = event.target.closest(".state"); if (group) toggleState(Number(group.dataset.edocve)); });
  map.addEventListener("keydown", event => { const group = event.target.closest(".state"); if (group && ["Enter", " "].includes(event.key)) { event.preventDefault(); toggleState(Number(group.dataset.edocve)); } });
  map.addEventListener("pointerover", event => { const group = event.target.closest(".state"); if (group && group !== activeTip) showTip(group, event); });
  map.addEventListener("pointermove", event => { const group = event.target.closest(".state"); if (group) showTip(group, event); });
  map.addEventListener("pointerleave", hideTip);
  map.addEventListener("focusin", event => { const group = event.target.closest(".state"); if (group) showTip(group); });
  map.addEventListener("focusout", hideTip);
  $("simple-select-all").addEventListener("click", () => { states.forEach(group => selected.add(Number(group.dataset.edocve))); render(); });
  $("simple-clear").addEventListener("click", () => { selected.clear(); render(); });
  $("simple-reset-filters").addEventListener("click", () => {
    document.querySelectorAll(".simple-filters input").forEach(input => {
      if (input.type === "checkbox") input.checked = input.defaultChecked;
      else input.value = input.defaultValue;
    });
    hideTip();
    render();
  });
  $("simple-age-min").addEventListener("input", () => { if (Number($("simple-age-min").value) > Number($("simple-age-max").value)) $("simple-age-max").value = $("simple-age-min").value; });
  $("simple-age-max").addEventListener("input", () => { if (Number($("simple-age-max").value) < Number($("simple-age-min").value)) $("simple-age-min").value = $("simple-age-max").value; });
  document.querySelector(".simple-range").addEventListener("click", event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const value = Math.max(0, Math.min(7, Math.round((event.clientX - rect.left) / rect.width * 7)));
    const min = $("simple-age-min"), max = $("simple-age-max");
    const target = Math.abs(value - Number(min.value)) <= Math.abs(value - Number(max.value)) ? min : max;
    target.value = value;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
  document.querySelectorAll(".simple-filters input").forEach(input => input.addEventListener("input", render));
  function selectStory(next, focus = false) {
    story = next.dataset.story;
    document.querySelectorAll("[data-story]").forEach(tab => {
      tab.setAttribute("aria-selected", String(tab === next));
      tab.tabIndex = tab === next ? 0 : -1;
    });
    if (focus) next.focus();
    render();
  }
  document.querySelectorAll("[data-story]").forEach(button => button.addEventListener("click", () => selectStory(button)));
  document.querySelector(".simple-tabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll("[data-story]")];
    const index = tabs.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    selectStory(tabs[next], true);
  });
  document.addEventListener("civic:request-story", event => {
    const next = ({ participation: "participation", age: "age", election: "election", gender: "inclusion" })[event.detail?.mode] || "participation";
    selectStory(document.querySelector(`[data-story="${next}"]`));
  });
  document.addEventListener("scroll", hideTip, { passive: true });
  render();
  const engine = new CCPC.DataEngine(data);
  const criteria = { state: 0, year: 2024, sex: "all", section: "all", age: "all" };
  const age = engine.ageDrop(criteria), election = engine.electionGap(criteria), gender = engine.genderGap(criteria), special = engine.special(0), nonbinary = engine.sum({ ...criteria, sex: 2 });
  document.dispatchEvent(new CustomEvent("civic:card-facts", { detail: {
    first: { title: "El primer voto", text: "A los 18 y 19 años comienza una nueva forma de participar. Los datos muestran cómo cambia la participación después de esa edad.", value: `18–19: ${pct(age.firstRate)}\n20–29: ${pct(age.youngRate)}`, caution: "Son grupos de edad distintos; no se sigue a las mismas personas." },
    election: { title: "La intermedia", text: "Las elecciones intermedias ocurren entre elecciones presidenciales. Compara ambas para descubrir la diferencia.", value: `Presidencial: ${pct(CCPC.rate(election.presidential))}\nIntermedia: ${pct(CCPC.rate(election.intermediate))}`, caution: "Se suman los conteos de tres elecciones de cada tipo antes de calcular la tasa." },
    women: { title: "La votante", text: "En 2024, las mujeres registraron mayor participación que los hombres. La diferencia cambia entre zonas.", value: `Mujeres: ${pct(CCPC.rate(gender.women))}\nHombres: ${pct(CCPC.rate(gender.men))}`, caution: "Son tasas calculadas con sus respectivas listas nominales." },
    inclusion: { title: "Otras formas de estar", text: "La participación también se estudia fuera de las casillas ordinarias. Cada universo se conserva por separado.", value: `Anticipado: ${number.format(special[0].count)}\nPrisión Preventiva: ${number.format(special[1].count)}`, caution: `No binario: LN ${number.format(nonbinary.ln)}, SV ${number.format(nonbinary.sv)} en 2024, universo ordinario. Las modalidades cuentan registros, sin tasas.` }
  } }));
})();
