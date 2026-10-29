(function () {
  "use strict";
  const { DataEngine, rate, smallBase, YEARS, PRESIDENTIAL } = CCPC;
  const data = JSON.parse(document.getElementById("ccpc-data").textContent);
  const engine = new DataEngine(data);
  const $ = id => document.getElementById(id);
  const integer = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = value => integer.format(value);
  const percent = value => value === null ? "Sin tasa" : `${decimal.format(value)}%`;
  const points = value => value === null ? "Sin dato comparable" : `${value > 0 ? "+" : ""}${decimal.format(value)} pp`;
  const html = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const filters = { year: 2024, sex: "all", section: "all", age: "all", state: 0, mode: "participation" };
  const modes = {
    participation: { title: "El pulso de las urnas", description: "¿Qué parte del perfil elegido tiene marca de voto? Explora los estados y compara con el país.", legend: "Participación (%)", limit: 100 },
    age: { title: "El bajón después de los 18", description: "18-19 menos 20-29 años: una brecha positiva indica menor participación en 20-29.", legend: "18-19 menos 20-29 (pp)", limit: 25 },
    election: { title: "Votantes de cada 6 años", description: "Presidencial menos intermedia: compara tres elecciones de cada tipo, sin seguir personas individuales.", legend: "Presidencial menos intermedia (pp)", limit: 30 },
    gender: { title: "Género, territorio e inclusión", description: "Mujeres menos hombres en 2024. En Territorio, explora si la ventaja cambia entre campo y ciudad.", legend: "Mujeres menos hombres (pp)", limit: 20 }
  };
  const themes = {
    participation: { colors: ["2dd4bf", "1d4ed8", "4c1d95"], accent: "#4c1d95", compare: "#0f766e" },
    age: { colors: ["fbbf24", "f97316", "e11d48"], accent: "#c51c3f", compare: "#9a5c00" },
    election: { colors: ["06b6d4", "4f46e5", "c026d3"], accent: "#4f46e5", compare: "#a21caf" },
    gender: { colors: ["34d399", "059669", "065f46"], accent: "#047857", compare: "#7c3aed" }
  };
  const lifecycle = new AbortController();
  const signal = lifecycle.signal;
  let mapMetrics = new Map();
  let mapScale = { min: 0, max: 100 };
  let scheduled = 0;
  let municipalRows = null;
  let activeTip = null;
  let tipLocation = null;
  let selectedPanel = "summary";
  let quizTopic = "zone";
  let quizGuess = null;
  let stackAnimation = null;
  const visibleCharts = new Set();
  const dirtyCharts = new Set(["age", "history"]);
  let chartObserver;

  function name(state = filters.state) {
    return Number(state) ? data.states[state] : "Total Nacional";
  }

  function period() {
    return filters.mode === "election" ? "2009–2024 acumulado" : String(filters.mode === "gender" ? 2024 : filters.year);
  }

  function scope(criteria = engine.effective(filters), includeAge = true) {
    const parts = [criteria.sex === "all" ? "Todos los sexos" : data.sexes[Number(criteria.sex)], criteria.section === "all" ? "Todas las secciones" : data.sections[Number(criteria.section)]];
    if (includeAge) parts.push(criteria.age === "all" ? "Todas las edades" : data.ages[Number(criteria.age)]);
    return parts.join(" · ");
  }

  function interpolate(a, b, amount) {
    const rgb = value => value.match(/[0-9a-f]{2}/gi).map(part => parseInt(part, 16));
    const first = rgb(a), last = rgb(b);
    return `rgb(${first.map((part, index) => Math.round(part + (last[index] - part) * amount)).join(",")})`;
  }

  function color(value) {
    if (value === null) return "#e2e8f0";
    const position = Math.max(0, Math.min(1, (value - mapScale.min) / (mapScale.max - mapScale.min)));
    const colors = themes[filters.mode].colors;
    return position <= .5 ? interpolate(colors[0], colors[1], position * 2) : interpolate(colors[1], colors[2], (position - .5) * 2);
  }

  function metricLabel(value) {
    return filters.mode === "participation" ? percent(value) : points(value);
  }

  function controls() {
    document.body.dataset.theme = filters.mode;
    let allOption = $("filter-year").querySelector('[value="all"]');
    if (!allOption) {
      allOption = new Option("2009–2024 · Seis elecciones", "all");
      $("filter-year").add(allOption);
    }
    allOption.hidden = filters.mode !== "election";
    $("filter-year").disabled = ["election", "gender"].includes(filters.mode);
    $("filter-year").value = filters.mode === "election" ? "all" : String(filters.year);
    $("filter-sex").disabled = filters.mode === "gender";
    $("filter-age").disabled = filters.mode === "age";
    $("filter-sex").value = filters.sex;
    $("filter-section").value = filters.section;
    $("filter-age").value = filters.age;
    $("filter-sex").querySelector('[value="2"]').disabled = filters.year !== 2024 && filters.mode !== "election";
    $("select-state").value = String(filters.state);
    $("national-button").disabled = !filters.state;
    document.querySelectorAll("[data-mode]").forEach(button => {
      const active = button.dataset.mode === filters.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const specifics = {
      participation: "Se aplican los cuatro filtros a los conteos ordinarios.",
      age: "El grupo de edad queda definido por la comparación 18-19 vs. 20-29. Se aplican año, sexo y sección.",
      election: "Se reúnen las seis elecciones; el año no se filtra. Se aplican sexo, sección y edad.",
      gender: "Este modo usa 2024 y compara mujeres con hombres; año y sexo quedan definidos. Se aplican sección y edad."
    };
    $("filter-scope").textContent = specifics[filters.mode];
    $("map-title").textContent = modes[filters.mode].title;
    $("map-description").textContent = modes[filters.mode].description;
    $("period-tag").textContent = filters.mode === "election" ? "2009–2024" : String(filters.year);
    for (const mode of Object.keys(modes)) {
      const metric = engine.metric({ ...filters, mode }, 0);
      $("card-value-" + mode).textContent = metric.value === null ? "Sin dato" : mode === "participation" ? percent(metric.value) : points(metric.value);
      $("card-period-" + mode).textContent = mode === "election" ? "2009–2024" : String(mode === "gender" ? 2024 : filters.year);
      $("card-caption-" + mode).textContent = "Nacional · " + ({ participation: "marca de voto", age: "18-19 menos 20-29", election: "presidencial − intermedia", gender: "mujeres − hombres" })[mode];
    }
  }

  function paintMap() {
    const groups = [...document.querySelectorAll(".state")];
    mapMetrics = new Map(groups.map(group => [Number(group.dataset.edocve), engine.metric(filters, Number(group.dataset.edocve))]));
    const values = [...mapMetrics.values(), engine.metric(filters, 0)].map(metric => metric.value).filter(value => value !== null && Number.isFinite(value));
    if (!values.length) mapScale = filters.mode === "participation" ? { min: 0, max: 100 } : { min: -modes[filters.mode].limit, max: modes[filters.mode].limit };
    else if (filters.mode === "participation") {
      mapScale = { min: Math.floor(Math.min(...values) / 5) * 5, max: Math.ceil(Math.max(...values) / 5) * 5 };
      if (mapScale.min === mapScale.max) mapScale = { min: Math.max(0, mapScale.min - 5), max: Math.min(100, mapScale.max + 5) };
    } else {
      mapScale = { min: Math.min(0, Math.floor(Math.min(...values))), max: Math.max(0, Math.ceil(Math.max(...values))) };
      if (mapScale.min === mapScale.max) mapScale.max = mapScale.min + 1;
    }
    groups.forEach(group => {
      const state = Number(group.dataset.edocve);
      const metric = mapMetrics.get(state);
      group.style.setProperty("--state-fill", color(metric.value));
      group.dataset.small = String(smallBase(metric));
      group.setAttribute("aria-pressed", String(state === filters.state));
      group.setAttribute("aria-label", `${name(state)}. ${modes[filters.mode].legend}: ${metricLabel(metric.value)}. LN: ${number(metric.counts.ln)}. Seleccionar entidad.`);
    });
    $("legend-title").textContent = modes[filters.mode].legend + " · escala del perfil";
    $("legend-gradient").style.background = `linear-gradient(to right,${themes[filters.mode].colors.map(value => "#" + value).join(",")})`;
    $("legend-ticks").innerHTML = Array.from({ length: 5 }, (_, index) => mapScale.min + (mapScale.max - mapScale.min) * index / 4).map(value => `<span>${Number(value.toFixed(2))}${filters.mode === "participation" ? "%" : " pp"}</span>`).join("");
    renderRankings();
  }

  function comparison(a, aLabel, b, bLabel) {
    return `<div class="comparison-values"><div><strong>${percent(rate(a))}</strong><span>${html(aLabel)} · LN ${number(a.ln)}${a.ln > 0 && a.ln < 100 ? " · base pequeña" : ""}</span></div><div><strong>${percent(rate(b))}</strong><span>${html(bLabel)} · LN ${number(b.ln)}${b.ln > 0 && b.ln < 100 ? " · base pequeña" : ""}</span></div></div>`;
  }

  function renderRankings() {
    const values = [...mapMetrics].filter(([, metric]) => metric.value !== null && metric.counts.ln >= 100 && !smallBase(metric));
    const renderList = (target, direction) => {
      const ordered = values.slice().sort((a, b) => direction * (a[1].value - b[1].value) || a[0] - b[0]).slice(0, 3);
      $(target).innerHTML = ordered.length ? ordered.map(([state, metric]) => `<button class="rank-button" type="button" data-rank-state="${state}" aria-label="${html(name(state))}: ${html(metricLabel(metric.value))}. Seleccionar estado."><span>${html(name(state))}</span><strong>${html(metricLabel(metric.value))}</strong></button>`).join("") : '<p class="ranking-empty">Sin bases comparables de LN ≥ 100.</p>';
    };
    renderList("ranking-top", -1);
    renderList("ranking-bottom", 1);
    $("ranking-top-caption").textContent = ({ participation: "Más participación", age: "Mayor caída entre edades", election: "Mayor brecha electoral", gender: "Mayor brecha mujeres − hombres" })[filters.mode];
    $("ranking-bottom-caption").textContent = ({ participation: "Menos participación", age: "Menor caída entre edades", election: "Menor brecha electoral", gender: "Menor brecha mujeres − hombres" })[filters.mode];
  }

  function activatePanel(panel, focus = false) {
    selectedPanel = panel;
    document.querySelectorAll("[data-panel]").forEach(button => {
      const active = button.dataset.panel === panel;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      $("panel-" + button.dataset.panel).hidden = !active;
      if (active && focus) button.focus();
    });
    hideTip();
    if (["age", "history"].includes(panel)) renderChart(panel);
  }

  function updateStack(counts) {
    for (const field of ["sv", "nv", "ns"]) {
      const value = rate(counts, field);
      $("stack-" + field).style.width = `${value ?? 0}%`;
      $("stack-" + field).title = `${field.toUpperCase()}: ${number(counts[field])} · ${percent(value)}`;
    }
    $("participation-stack").parentElement.setAttribute("aria-label", `Lista nominal ${number(counts.ln)}. Sí votó ${percent(rate(counts))}. No votó ${percent(rate(counts, "nv"))}. No especificado ${percent(rate(counts, "ns"))}.`);
    if (stackAnimation) stackAnimation.cancel();
    if (selectedPanel === "summary" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const box = $("participation-stack").getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 0) stackAnimation = $("participation-stack").animate([{ transform: "scaleX(.96)", opacity: .6 }, { transform: "scaleX(1)", opacity: 1 }], { duration: 180, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  }

  function updateImpact(metric) {
    const territory = filters.state ? name() : "México";
    let text;
    if (metric.value === null) text = `${territory}: este perfil no tiene una base comparable. Prueba otra edad, zona o sexo para explorar su historia.`;
    else if (filters.mode === "participation") text = `En ${territory}, ${percent(metric.value)} del perfil elegido tiene marca de voto: ${number(metric.counts.sv)} de ${number(metric.counts.ln)} registros. ¿Cómo cambia la historia al elegir tu edad?`;
    else if (filters.mode === "age") {
      text = `En ${territory}, el grupo de 20-29 participa ${decimal.format(Math.abs(metric.value))} puntos ${metric.value >= 0 ? "menos" : "más"} que el de 18-19.`;
      text += metric.value > 0 ? (metric.recovery ? ` El primer grupo de 30+ que recupera ese nivel es ${metric.recovery}.` : " No se recupera ese nivel en los grupos mayores observados.") : " Bajo estos filtros, no se observa un bajón en 20-29.";
    } else if (filters.mode === "election") text = `${territory}: ${points(metric.value)} separan las presidenciales de las intermedias en este perfil. Tres elecciones por tipo, con sus conteos sumados antes de dividir.`;
    else text = `En ${territory}, las mujeres registran ${decimal.format(Math.abs(metric.value))} puntos ${metric.value >= 0 ? "más" : "menos"} de participación que los hombres en 2024. ¿Qué pasa entre campo y ciudad? Abre Territorio.`;
    $("map-insight").textContent = text;
    $("impact-context").textContent = filters.mode === "participation" ? `${period()} · SV/LN` : `${period()} · puntos porcentuales`;
  }

  function renderQuiz() {
    const criteria = engine.effective(filters);
    const topics = {
      zone: { question: "¿Quién participa más: el campo o la ciudad?", labels: ["Campo · Rural", "Ciudad · Urbana"], queries: [{ section: 2 }, { section: 0 }], note: "Compara Rural y Urbana; sustituye el filtro de zona." },
      gender: { question: "¿Quién participa más: mujeres u hombres?", labels: ["Mujeres", "Hombres"], queries: [{ sex: 1 }, { sex: 0 }], note: "Compara ambos sexos; sustituye el filtro de sexo." },
      age: { question: "¿Quién participa más: 18-19 o 25-29 años?", labels: ["18-19 años", "25-29 años"], queries: [{ age: 0 }, { age: 2 }], note: "Compara esos dos grupos; sustituye el filtro de edad." }
    };
    const topic = topics[quizTopic];
    const counts = topic.queries.map(query => engine.sum({ ...criteria, ...query }));
    const values = counts.map(count => rate(count));
    const missing = values.some(value => value === null);
    $("quiz-question").textContent = `${name()}: ${topic.question}`;
    $("quiz-scope").textContent = `${period()} · ${topic.note}`;
    document.querySelectorAll("[data-quiz]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.quiz === quizTopic)));
    $("quiz-answers").innerHTML = topic.labels.map((label, index) => `<button type="button" data-guess="${index}" aria-pressed="${quizGuess === index}" ${missing ? "disabled" : ""}>${html(label)}</button>`).join("");
    const result = $("quiz-result");
    result.dataset.revealed = String(quizGuess !== null && !missing);
    if (missing) result.innerHTML = '<strong>Esta comparación queda abierta.</strong><p>Falta una lista nominal positiva en uno de los grupos. Cambia el perfil; la ausencia de datos no equivale a participación cero.</p>';
    else if (quizGuess === null) result.innerHTML = '<strong>¿Te sorprende tu estado?</strong><p>Elige una respuesta y descubre la comparación real.</p>';
    else {
      const winner = values[0] === values[1] ? null : values[0] > values[1] ? 0 : 1;
      const headline = winner === null ? "Misma tasa en ambos grupos." : `${quizGuess === winner ? "Lo adivinaste" : "Los datos dicen"}: ${topic.labels[winner]}.`;
      result.innerHTML = `<strong>${html(headline)}</strong>${topic.labels.map((label, index) => `<div class="quiz-fact"><span>${html(label)}</span><strong>${percent(values[index])}</strong></div>`).join("")}<p>LN ${number(counts[0].ln)} frente a ${number(counts[1].ln)}.${counts.some(count => count.ln < 100) ? " LN < 100: base pequeña en al menos un grupo." : " Tasas calculadas con los conteos de cada grupo."}</p>`;
    }
  }

  function story(metric) {
    $("comparison-values").innerHTML = "";
    if (metric.value === null) {
      $("story-title").textContent = "La ausencia de datos también cuenta";
      $("story-text").textContent = "No hay un denominador positivo para todos los grupos de esta comparación. Esto no equivale a una participación de cero. Prueba otra combinación de filtros.";
      return;
    }
    const title = {
      participation: `${percent(metric.value)} con marca de voto`,
      age: metric.value >= 0 ? `${decimal.format(metric.value)} pp menos en 20-29` : `${decimal.format(-metric.value)} pp más en 20-29`,
      election: `${points(metric.value)} entre tipos de elección`,
      gender: `${points(metric.value)}: mujeres menos hombres`
    };
    $("story-title").textContent = title[filters.mode];
    if (filters.mode === "participation") {
      $("story-text").textContent = `En ${name()}, ${number(metric.counts.sv)} de ${number(metric.counts.ln)} registros tienen marca de voto. El ${percent(rate(metric.counts, "ns"))} tiene participación no especificada.`;
    } else if (filters.mode === "age") {
      $("story-text").textContent = metric.recovery ? `El primer grupo de 30 años o más que alcanza la tasa de 18-19 es ${metric.recovery}. Es una comparación entre grupos de edad, sin seguimiento de las mismas personas.` : "Ningún grupo observado de 30 años o más alcanza la tasa de 18-19 bajo estos filtros. La comparación describe grupos de edad, no trayectorias individuales.";
      $("comparison-values").innerHTML = comparison(metric.first, "18-19 años", metric.young, "20-29 años");
    } else if (filters.mode === "election") {
      $("story-text").textContent = "Se suman SV y LN de cada tipo de elección antes de calcular las tasas. Cambian el año y la composición del electorado: esta diferencia no estima un efecto causal.";
      $("comparison-values").innerHTML = comparison(metric.presidential, "Presidenciales", metric.intermediate, "Intermedias");
    } else {
      $("story-text").textContent = "La diferencia usa los conteos de mujeres y hombres en 2024. Abre Territorio o Inclusión para explorar secciones y universos separados.";
      $("comparison-values").innerHTML = comparison(metric.women, "Mujeres", metric.men, "Hombres");
    }
  }

  function updatePanel() {
    const criteria = engine.effective(filters);
    const metric = engine.metric(filters);
    const counts = metric.counts;
    $("panel-title").textContent = name();
    $("panel-scope").textContent = `${period()} · ${scope()}`;
    $("small-base").hidden = !smallBase(metric);
    $("empty-state").hidden = counts.ln > 0;
    $("empty-state").textContent = counts.rows ? "La lista nominal de esta combinación es cero: no se calcula una tasa." : "No hay registros para esta combinación. Cambia uno de los filtros.";
    for (const field of ["ln", "sv", "nv", "ns"]) $("stat-" + field).textContent = number(counts[field]);
    $("stat-ln-note").textContent = filters.mode === "election" ? "Registros persona-elección" : "Base de los porcentajes";
    for (const field of ["sv", "nv", "ns"]) $("stat-" + field + "-rate").textContent = `${percent(rate(counts, field))} de LN`;
    updateStack(counts);
    story(metric);
    $("gender-detail").hidden = filters.mode !== "gender";
    if (filters.mode === "gender") {
      const sections = criteria.section === "all" ? [0, 1, 2] : [Number(criteria.section)];
      $("gender-detail-body").innerHTML = sections.map(section => {
        const item = engine.genderGap({ ...criteria, section });
        return `<div class="gender-row"><span>${html(data.sections[section])}</span><strong>${points(item.value)}</strong></div>`;
      }).join("");
    }
    $("special-counts").innerHTML = engine.special(filters.state, criteria.sex).map(item => `<div><dt>${html(item.name)}</dt><dd>${item.present ? number(item.count) : "—"}</dd></div>`).join("");
    $("special-scope").textContent = `Siempre 2024 · ${criteria.sex === "all" ? "Todos los sexos" : data.sexes[Number(criteria.sex)]}. Sin filtros de edad o sección: esas columnas no existen en los archivos especiales. Sin LN/SV, no hay tasa. “—” indica ausencia de registros en el archivo.`;
    const nb = engine.sum({ state: filters.state, year: 2024, sex: 2, section: criteria.section, age: criteria.age });
    $("nonbinary-summary").innerHTML = `<strong>No binario · conteo ordinario 2024</strong><div class="nb-values">${nb.rows ? `LN ${number(nb.ln)} · SV ${number(nb.sv)} · ${percent(rate(nb))}<br>NV ${number(nb.nv)} · NS ${number(nb.ns)}${nb.ln > 0 && nb.ln < 100 ? "<br>LN &lt; 100: base pequeña" : ""}` : "Sin registros para la edad y sección seleccionadas."}</div><p class="method-note">Se aplican edad y sección; se consulta esta categoría por separado del filtro de sexo.</p>`;
    updateImpact(metric);
    renderQuiz();
    updateBreakdown(criteria);
    $("age-period").textContent = period();
    $("age-scope").textContent = `${filters.state ? name() + " frente al total nacional" : "Total Nacional"} · ${scope(criteria, false)}. Se muestran todas las edades.`;
    $("history-scope").textContent = `${name()} · ${scope(criteria)}. Cada punto corresponde a su propio año.`;
    document.querySelector(".chart-key .key-local").textContent = name();
    document.querySelectorAll(".chart-key .key-national").forEach(key => { key.hidden = !filters.state; });
    for (const chart of ["age", "history"]) {
      dirtyCharts.add(chart);
      if (visibleCharts.has(chart) && !$("panel-" + chart).hidden) renderChart(chart);
    }
    if ($("municipal-detail").open) renderMunicipal();
    $("live-status").textContent = `${name()}. ${modes[filters.mode].title}. ${metricLabel(metric.value)}. ${period()}.`;
  }

  function updateBreakdown(criteria) {
    const sections = criteria.section === "all" ? [0, 1, 2, 3] : [Number(criteria.section)];
    const rows = [];
    for (const section of sections) {
      const counts = [1, 0].map(sex => engine.sum({ ...criteria, section, sex }));
      if (!counts.some(count => count.rows)) continue;
      const gap = CCPC.difference(rate(counts[0]), rate(counts[1]));
      rows.push(`<section class="section-bars" data-section="${section}"><h4>${html(data.sections[section])}<span>M−H ${points(gap)}</span></h4>${counts.map((count, index) => `<div class="gender-bar-row ${index ? "men" : "women"}" data-bar-counts="${html(JSON.stringify(count))}" aria-label="${html(data.sections[section])}, ${index ? "Hombres" : "Mujeres"}: ${percent(rate(count))}. LN ${number(count.ln)}."><span>${index ? "H" : "M"}</span><div class="bar-track"><div class="bar-fill" style="width:${rate(count) ?? 0}%"></div></div><strong>${percent(rate(count))}</strong></div>`).join("")}<p class="bar-denominator">LN mujeres ${number(counts[0].ln)} · hombres ${number(counts[1].ln)}${counts.some(count => count.ln > 0 && count.ln < 100) ? " · Base pequeña" : ""}</p></section>`);
    }
    $("breakdown-body").innerHTML = rows.length ? rows.join("") : '<p class="chart-scope">Sin registros para esta combinación.</p>';
    $("breakdown-scope").textContent = `${name()} · ${period()}. Se comparan mujeres y hombres, sin aplicar el filtro de sexo; se conservan edad y zona.`;
  }

  function chartPoint(counts, value, category, series, extra = "") {
    return html(JSON.stringify({ title: `${series} · ${category}`, value: percent(value), counts, note: extra || (counts.ln < 100 ? "LN < 100: base pequeña" : "SV / LN × 100") }));
  }

  function renderChart(kind) {
    const criteria = engine.effective(filters);
    const isAge = kind === "age";
    const categories = isAge ? data.ages.map((age, index) => index === 0 ? "18–19" : age) : YEARS.map(String);
    const series = state => categories.map((category, index) => {
      const query = isAge ? { ...criteria, state, age: index } : { ...criteria, state, years: [YEARS[index]], year: YEARS[index] };
      const counts = engine.sum(query);
      return { counts, value: rate(counts), category };
    });
    const local = series(filters.state), national = series(0);
    const width = 500, height = 290, left = 33, right = 18, top = 20, bottom = 48;
    const x = index => left + index * (width - left - right) / (categories.length - 1);
    const y = value => top + (100 - value) * (height - top - bottom) / 100;
    const palette = themes[filters.mode];
    const pieces = [`<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="${html(isAge ? "Curva de edad" : "Evolución de la participación")} de ${html(name())}"><defs><linearGradient id="area-${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.accent}" stop-opacity=".24"/><stop offset="1" stop-color="${palette.accent}" stop-opacity=".01"/></linearGradient><linearGradient id="area-national-${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.compare}" stop-opacity=".1"/><stop offset="1" stop-color="${palette.compare}" stop-opacity="0"/></linearGradient></defs>`];
    for (const tick of [0, 25, 50, 75, 100]) pieces.push(`<line x1="${left}" y1="${y(tick)}" x2="${width - right}" y2="${y(tick)}" stroke="#dfe5ef"/><text x="${left - 7}" y="${y(tick) + 4}" text-anchor="end" fill="#475569" font-size="14">${tick}</text>`);
    pieces.push(`<text x="${left - 18}" y="12" fill="#475569" font-size="12">%</text>`);
    function draw(values, nationalLine) {
      let path = "", previous = false;
      values.forEach((point, index) => {
        if (point.value === null) { previous = false; return; }
        path += `${previous ? "L" : "M"}${x(index)},${y(point.value)} `;
        previous = true;
      });
      const segments = [];
      let segment = [];
      for (let index = 0; index < values.length; index += 1) {
        if (values[index].value === null) { if (segment.length) segments.push(segment); segment = []; }
        else segment.push([x(index), y(values[index].value)]);
      }
      if (segment.length) segments.push(segment);
      for (const area of segments.filter(points => points.length > 1)) pieces.push(`<path d="M${area[0][0]},${y(0)} L${area.map(point => point.join(",")).join(" L")} L${area[area.length - 1][0]},${y(0)} Z" fill="url(#area-${nationalLine ? "national-" : ""}${kind})"/>`);
      pieces.push(`<path d="${path}" fill="none" stroke="${nationalLine ? palette.compare : palette.accent}" stroke-width="${nationalLine ? 2 : 3}" ${nationalLine ? 'stroke-dasharray="6 5"' : ""}/>`);
      values.forEach((point, index) => {
        if (point.value === null) return;
        const election = !isAge ? (PRESIDENTIAL.includes(YEARS[index]) ? "Presidencial" : "Intermedia") : "";
        const detail = chartPoint(point.counts, point.value, point.category, nationalLine ? "Total Nacional" : name(), `${election}${point.counts.ln < 100 ? " · LN < 100: base pequeña" : ""}`);
        const attributes = `class="chart-point" data-point="${detail}" tabindex="0" role="img" aria-label="${html((nationalLine ? "Total Nacional" : name()) + ", " + point.category + ": " + percent(point.value) + ", LN " + number(point.counts.ln))}"`;
        const fill = nationalLine ? "#fcfdfe" : !isAge && !PRESIDENTIAL.includes(YEARS[index]) ? palette.compare : palette.accent;
        const highlighted = isAge && !nationalLine && index < 3;
        if (highlighted) pieces.push(`<circle cx="${x(index)}" cy="${y(point.value)}" r="11" fill="${palette.accent}" opacity=".13"/>`);
        if (!isAge && !nationalLine && !PRESIDENTIAL.includes(YEARS[index])) pieces.push(`<rect x="${x(index) - 6}" y="${y(point.value) - 6}" width="12" height="12" rx="1" fill="${fill}" ${attributes}/>`);
        else pieces.push(`<circle cx="${x(index)}" cy="${y(point.value)}" r="${nationalLine ? 4 : highlighted ? 7 : 5}" fill="${fill}" ${nationalLine ? `style="stroke:${palette.compare}"` : ""} ${attributes}/>`);
      });
    }
    if (filters.state) draw(national, true);
    draw(local, false);
    categories.forEach((category, index) => {
      pieces.push(`<text x="${x(index)}" y="${height - bottom + 23}" text-anchor="middle" fill="#475569" font-size="15">${html(category)}</text>`);
      if (!isAge) pieces.push(`<text x="${x(index)}" y="${height - 5}" text-anchor="middle" fill="#475569" font-size="12">${PRESIDENTIAL.includes(YEARS[index]) ? "Pres." : "Inter."}</text>`);
    });
    if (!local.some(point => point.value !== null)) pieces.push('<text x="260" y="135" text-anchor="middle" fill="#66576d" font-size="15">Sin tasas para esta combinación</text>');
    pieces.push("</svg>");
    $(kind + "-chart").innerHTML = pieces.join("");
    dirtyCharts.delete(kind);
  }

  function renderMunicipal() {
    $("municipal-search").disabled = !filters.state;
    if (!filters.state) {
      $("municipal-status").textContent = "Selecciona una entidad para explorar sus municipios.";
      $("municipal-body").innerHTML = "";
      return;
    }
    if (!municipalRows) municipalRows = JSON.parse($("municipal-data").textContent);
    const year = filters.mode === "election" ? 2024 : filters.year;
    const result = new Map();
    for (const row of municipalRows) {
      if (row[0] !== year || row[1] !== filters.state || (filters.section !== "all" && row[4] !== Number(filters.section))) continue;
      const key = `${row[2]}:${row[3]}`;
      const count = result.get(key) || { key: row[2], name: row[3], ln: 0, sv: 0, nv: 0, ns: 0 };
      ["ln", "sv", "nv", "ns"].forEach((field, index) => { count[field] += row[5 + index]; });
      result.set(key, count);
    }
    const search = $("municipal-search").value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
    const values = [...result.values()].filter(row => row.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").includes(search)).sort((a, b) => a.name.localeCompare(b.name, "es"));
    $("municipal-status").textContent = `${name()} · ${year} · ${filters.section === "all" ? "Todas las secciones" : data.sections[Number(filters.section)]}. ${values.length} municipios${values.length > 25 ? "; se muestran los primeros 25, usa la búsqueda para encontrar otro" : ""}. Sin filtro de edad o sexo.${filters.mode === "election" ? " En la comparación histórica se muestra 2024; no se combinan límites municipales entre años." : ""}`;
    $("municipal-body").innerHTML = values.slice(0, 25).map(row => `<tr><td>${html(row.name)}<small>Clave ${row.key}</small></td><td>${number(row.ln)}</td><td>${number(row.sv)}</td><td><div class="municipal-rate"><div class="bar-track"><div class="bar-fill" style="width:${rate(row) ?? 0}%"></div></div><span>${percent(rate(row))}</span></div></td></tr>`).join("") || '<tr><td colspan="4">Sin municipios que coincidan con la búsqueda.</td></tr>';
  }

  function tipData(element) {
    if (element.dataset.point) return JSON.parse(element.dataset.point);
    const state = Number(element.dataset.edocve);
    const metric = mapMetrics.get(state);
    if (!metric) return null;
    let note = `${period()} · ${scope()}`;
    if (filters.mode === "age" && metric.value !== null) note += ` · Recuperación: ${metric.recovery || "sin recuperación observada"}`;
    if (smallBase(metric)) note += " · LN < 100: base pequeña en al menos un grupo";
    return { title: name(state), value: metricLabel(metric.value), counts: metric.counts, note, metric };
  }

  function showTip(element, event) {
    const detail = tipData(element);
    if (!detail) return;
    activeTip = element;
    const counts = detail.counts;
    let comparisonText = "";
    if (detail.metric && detail.metric.value !== null) {
      const metric = detail.metric;
      if (filters.mode === "age") comparisonText = `18-19: ${percent(metric.firstRate)} · LN ${number(metric.first.ln)}<br>20-29: ${percent(metric.youngRate)} · LN ${number(metric.young.ln)}`;
      if (filters.mode === "election") comparisonText = `Presidencial: ${percent(rate(metric.presidential))} · LN ${number(metric.presidential.ln)}<br>Intermedia: ${percent(rate(metric.intermediate))} · LN ${number(metric.intermediate.ln)}`;
      if (filters.mode === "gender") comparisonText = `Mujeres: ${percent(rate(metric.women))} · LN ${number(metric.women.ln)}<br>Hombres: ${percent(rate(metric.men))} · LN ${number(metric.men.ln)}`;
    }
    let nationalComparison = "";
    if (detail.metric) {
      const national = engine.metric(filters, 0);
      const signed = filters.mode !== "participation";
      const limit = signed ? Math.max(Math.abs(mapScale.min), Math.abs(mapScale.max)) : 100;
      const bar = (label, value, nationalRow) => {
        const width = value === null ? 0 : Math.min(signed ? 50 : 100, Math.abs(value) / limit * (signed ? 50 : 100));
        const left = signed ? value !== null && value < 0 ? 50 - width : 50 : 0;
        return `<div class="tip-row ${nationalRow ? "national" : ""}"><span>${html(label)}</span><strong>${html(metricLabel(value))}</strong><div class="tip-track ${signed ? "signed" : ""}"><span class="tip-fill" style="left:${left}%;width:${width}%;${nationalRow ? "" : `background:${color(value)}`}"></span></div></div>`;
      };
      nationalComparison = `<div class="tip-comparison"><div class="tip-comparison-title">Misma métrica y perfil · escala ${signed ? `±${limit} pp` : "0–100%"}</div>${bar(detail.title, detail.metric.value, false)}${bar("Total Nacional", national.value, true)}</div>`;
    }
    $("tooltip").innerHTML = `<strong>${html(detail.title)}</strong><span class="tooltip-value">${html(detail.value)}</span>${comparisonText ? `<div>${comparisonText}</div>` : ""}${nationalComparison}<div>LN ${number(counts.ln)} · SV ${number(counts.sv)}<br>NV ${number(counts.nv)} · NS ${number(counts.ns)}</div><p class="tooltip-note">${html(detail.note)}</p>`;
    $("tooltip").hidden = false;
    const rect = element.getBoundingClientRect();
    tipLocation = { x: event && Number.isFinite(event.clientX) ? event.clientX : rect.x + rect.width / 2, y: event && Number.isFinite(event.clientY) ? event.clientY : rect.y + rect.height / 2 };
    positionTip();
  }

  function positionTip() {
    if (!tipLocation || $("tooltip").hidden) return;
    const rect = $("tooltip").getBoundingClientRect();
    const x = Math.max(8, Math.min(window.innerWidth - rect.width - 8, tipLocation.x + 16));
    const y = Math.max(8, Math.min(window.innerHeight - rect.height - 8, tipLocation.y + 16));
    $("tooltip").style.left = `${x}px`;
    $("tooltip").style.top = `${y}px`;
  }

  function hideTip() {
    $("tooltip").hidden = true;
    activeTip = null;
  }

  function render() {
    hideTip();
    quizGuess = null;
    controls();
    paintMap();
    updatePanel();
    scheduled = 0;
  }

  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(render);
  }

  function selectState(code, scroll = false) {
    filters.state = Number(code);
    render();
    if (scroll && matchMedia("(max-width: 850px)").matches) $("radiografia").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }

  Object.entries(data.states).forEach(([code, label]) => $("select-state").add(new Option(label, code)));
  for (const field of ["year", "sex", "section", "age"]) {
    $("filter-" + field).addEventListener("change", event => {
      filters[field] = field === "year" ? Number(event.target.value) : event.target.value;
      if (filters.year !== 2024 && filters.sex === "2" && filters.mode !== "election") filters.sex = "all";
      schedule();
    }, { signal });
  }
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => {
    filters.mode = button.dataset.mode;
    if (filters.mode === "age") filters.age = "all";
    if (filters.mode === "gender") { filters.year = 2024; filters.sex = "all"; }
    render();
  }, { signal }));
  $("select-state").addEventListener("change", event => selectState(event.target.value), { signal });
  $("national-button").addEventListener("click", () => selectState(0), { signal });
  document.querySelectorAll("[data-panel]").forEach(button => button.addEventListener("click", () => activatePanel(button.dataset.panel), { signal }));
  document.querySelector(".panel-tabs").addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...document.querySelectorAll("[data-panel]")];
    const index = buttons.findIndex(button => button.dataset.panel === selectedPanel);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    activatePanel(buttons[next].dataset.panel, true);
  }, { signal });
  document.querySelector(".map-canvas").addEventListener("click", event => {
    const button = event.target.closest("[data-rank-state]");
    if (button) selectState(button.dataset.rankState, true);
  }, { signal });
  document.querySelectorAll("[data-quiz]").forEach(button => button.addEventListener("click", () => {
    quizTopic = button.dataset.quiz;
    quizGuess = null;
    renderQuiz();
  }, { signal }));
  $("quiz-answers").addEventListener("click", event => {
    const button = event.target.closest("[data-guess]");
    if (!button) return;
    quizGuess = Number(button.dataset.guess);
    renderQuiz();
    if (event.detail === 0) $("quiz-answers").querySelector(`[data-guess="${quizGuess}"]`).focus({ preventScroll: true });
  }, { signal });
  $("mexico-map").addEventListener("click", event => {
    const state = event.target.closest(".state");
    if (state) selectState(state.dataset.edocve, true);
  }, { signal });
  $("mexico-map").addEventListener("keydown", event => {
    const state = event.target.closest(".state");
    if (state && ["Enter", " "].includes(event.key)) { event.preventDefault(); selectState(state.dataset.edocve, true); }
  }, { signal });
  document.addEventListener("pointerover", event => {
    const element = event.target.closest(".state,[data-point]");
    if (element && element !== activeTip) showTip(element, event);
  }, { signal });
  document.addEventListener("pointermove", event => {
    if (!activeTip) return;
    if (!activeTip.contains(event.target)) { hideTip(); return; }
    tipLocation = { x: event.clientX, y: event.clientY };
    positionTip();
  }, { signal, passive: true });
  document.addEventListener("focusin", event => {
    const element = event.target.closest(".state,[data-point]");
    if (element) showTip(element);
    else hideTip();
  }, { signal });
  document.addEventListener("focusout", hideTip, { signal });
  document.addEventListener("keydown", event => { if (event.key === "Escape") hideTip(); }, { signal });
  document.addEventListener("scroll", hideTip, { signal, passive: true });
  $("municipal-detail").addEventListener("toggle", () => { if ($("municipal-detail").open) renderMunicipal(); }, { signal });
  $("municipal-search").addEventListener("input", renderMunicipal, { signal });
  document.querySelectorAll('a[href="#metodologia"]').forEach(link => link.addEventListener("click", () => { $("metodologia").open = true; }, { signal }));
  $("source-list").innerHTML = data.sources.map(source => `<li><strong>${html(source.file)}</strong><br><code>${html(source.sha256)}</code></li>`).join("");
  chartObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const kind = entry.target.dataset.chart;
      if (entry.isIntersecting) {
        visibleCharts.add(kind);
        if (dirtyCharts.has(kind)) renderChart(kind);
      } else visibleCharts.delete(kind);
    }
  }, { rootMargin: "150px" });
  document.querySelectorAll("[data-chart]").forEach(chart => chartObserver.observe(chart));
  window.addEventListener("pagehide", event => {
    if (event.persisted) return;
    lifecycle.abort();
    chartObserver.disconnect();
    if (stackAnimation) stackAnimation.cancel();
    if (scheduled) cancelAnimationFrame(scheduled);
    engine.cache.clear();
    municipalRows = null;
  }, { once: true });
  render();
})();
