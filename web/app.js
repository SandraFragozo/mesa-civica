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
    participation: { title: "Participación ciudadana", description: "Porcentaje de registros con marca de voto sobre la lista nominal del grupo seleccionado.", legend: "Participación (%)", limit: 100 },
    age: { title: "La caída después de los 18-19", description: "Tasa de 18-19 menos tasa conjunta de 20-29 años. Un valor positivo indica menor participación en 20-29.", legend: "18-19 menos 20-29 (pp)", limit: 25 },
    election: { title: "Presidencial vs. intermedia", description: "Participación acumulada presidencial menos intermedia. Una brecha positiva indica menor participación en intermedias.", legend: "Presidencial menos intermedia (pp)", limit: 30 },
    gender: { title: "Brecha de género e inclusión", description: "Participación de mujeres menos hombres en 2024. Las modalidades especiales se muestran como conteos separados.", legend: "Mujeres menos hombres (pp)", limit: 20 }
  };
  const lifecycle = new AbortController();
  const signal = lifecycle.signal;
  let mapMetrics = new Map();
  let scheduled = 0;
  let municipalRows = null;
  let activeTip = null;
  let tipLocation = null;
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
    if (value === null) return "#e6e2e9";
    if (filters.mode === "participation") return interpolate("f4ecf9", "49225f", Math.max(0, Math.min(1, value / 100)));
    const amount = Math.min(1, Math.abs(value) / modes[filters.mode].limit);
    return value < 0 ? interpolate("f7f2f8", "ad3b70", amount) : interpolate("f7f2f8", "49225f", amount);
  }

  function metricLabel(value) {
    return filters.mode === "participation" ? percent(value) : points(value);
  }

  function controls() {
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
    $("legend-title").textContent = modes[filters.mode].legend;
    const limit = modes[filters.mode].limit;
    $("legend-gradient").style.background = filters.mode === "participation" ? "linear-gradient(to right,#f4ecf9,#49225f)" : "linear-gradient(to right,#ad3b70,#f7f2f8,#49225f)";
    $("legend-ticks").innerHTML = filters.mode === "participation" ? ["0%", "25%", "50%", "75%", "100%"].map(value => `<span>${value}</span>`).join("") : [`≤ −${limit} pp`, "0 pp", `≥ +${limit} pp`].map(value => `<span>${value}</span>`).join("");
  }

  function paintMap() {
    mapMetrics = new Map();
    document.querySelectorAll(".state").forEach(group => {
      const state = Number(group.dataset.edocve);
      const metric = engine.metric(filters, state);
      mapMetrics.set(state, metric);
      group.style.setProperty("--state-fill", color(metric.value));
      group.dataset.small = String(smallBase(metric));
      group.setAttribute("aria-pressed", String(state === filters.state));
      group.setAttribute("aria-label", `${name(state)}. ${modes[filters.mode].legend}: ${metricLabel(metric.value)}. LN: ${number(metric.counts.ln)}. Seleccionar entidad.`);
    });
  }

  function comparison(a, aLabel, b, bLabel) {
    return `<div class="comparison-values"><div><strong>${percent(rate(a))}</strong><span>${html(aLabel)} · LN ${number(a.ln)}${a.ln > 0 && a.ln < 100 ? " · base pequeña" : ""}</span></div><div><strong>${percent(rate(b))}</strong><span>${html(bLabel)} · LN ${number(b.ln)}${b.ln > 0 && b.ln < 100 ? " · base pequeña" : ""}</span></div></div>`;
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
      $("story-text").textContent = "La diferencia usa los conteos de mujeres y hombres en 2024. Consulta abajo el desglose por sección y los registros de inclusión; son universos distintos.";
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
    $("map-insight").textContent = `${name()}: ${$("story-title").textContent}. ${filters.mode === "age" && metric.value !== null ? (metric.recovery ? `Recuperación observada: ${metric.recovery}.` : "Sin recuperación observada en edades mayores.") : $("story-text").textContent}`;
    updateBreakdown(criteria);
    $("age-period").textContent = period();
    $("age-scope").textContent = `${filters.state ? name() + " frente al total nacional" : "Total Nacional"} · ${scope(criteria, false)}. Se muestran todas las edades.`;
    $("history-scope").textContent = `${name()} · ${scope(criteria)}. Cada punto corresponde a su propio año.`;
    document.querySelector(".chart-key .key-local").textContent = name();
    document.querySelectorAll(".chart-key .key-national").forEach(key => { key.hidden = !filters.state; });
    for (const chart of ["age", "history"]) {
      dirtyCharts.add(chart);
      if (visibleCharts.has(chart)) renderChart(chart);
    }
    if ($("municipal-detail").open) renderMunicipal();
    $("live-status").textContent = `${name()}. ${modes[filters.mode].title}. ${metricLabel(metric.value)}. ${period()}.`;
  }

  function updateBreakdown(criteria) {
    const sections = criteria.section === "all" ? [0, 1, 2, 3] : [Number(criteria.section)];
    const sexes = criteria.sex === "all" ? [1, 0, 2, 3] : [Number(criteria.sex)];
    const rows = [];
    for (const section of sections) {
      const values = [];
      for (const sex of sexes) {
        const count = engine.sum({ ...criteria, section, sex });
        if (!count.rows) continue;
        values.push(`<tr><td>${html(data.sexes[sex])}${count.ln > 0 && count.ln < 100 ? "<small>LN &lt; 100: base pequeña</small>" : ""}</td><td>${number(count.ln)}</td><td>${number(count.sv)}</td><td>${percent(rate(count))}</td></tr>`);
      }
      if (values.length) rows.push(`<tr class="row-section"><td colspan="4">${html(data.sections[section])}</td></tr>`, ...values);
    }
    $("breakdown-body").innerHTML = rows.length ? rows.join("") : '<tr><td colspan="4">Sin registros para esta combinación.</td></tr>';
    $("breakdown-scope").textContent = `${name()} · ${period()}. Mismos filtros que las tarjetas.`;
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
    const pieces = [`<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="${html(isAge ? "Curva de edad" : "Evolución de la participación")} de ${html(name())}">`];
    for (const tick of [0, 25, 50, 75, 100]) pieces.push(`<line x1="${left}" y1="${y(tick)}" x2="${width - right}" y2="${y(tick)}" stroke="#d9cce3"/><text x="${left - 7}" y="${y(tick) + 4}" text-anchor="end" fill="#66576d" font-size="14">${tick}</text>`);
    pieces.push(`<text x="${left - 18}" y="12" fill="#716277" font-size="12">%</text>`);
    function draw(values, nationalLine) {
      let path = "", previous = false;
      values.forEach((point, index) => {
        if (point.value === null) { previous = false; return; }
        path += `${previous ? "L" : "M"}${x(index)},${y(point.value)} `;
        previous = true;
      });
      pieces.push(`<path d="${path}" fill="none" stroke="${nationalLine ? "#9b8ba3" : "#653383"}" stroke-width="${nationalLine ? 2 : 3}" ${nationalLine ? 'stroke-dasharray="6 5"' : ""}/>`);
      values.forEach((point, index) => {
        if (point.value === null) return;
        const election = !isAge ? (PRESIDENTIAL.includes(YEARS[index]) ? "Presidencial" : "Intermedia") : "";
        const detail = chartPoint(point.counts, point.value, point.category, nationalLine ? "Total Nacional" : name(), `${election}${point.counts.ln < 100 ? " · LN < 100: base pequeña" : ""}`);
        const attributes = `class="chart-point" data-point="${detail}" tabindex="0" role="img" aria-label="${html((nationalLine ? "Total Nacional" : name()) + ", " + point.category + ": " + percent(point.value) + ", LN " + number(point.counts.ln))}"`;
        const fill = nationalLine ? "#fff" : !isAge && !PRESIDENTIAL.includes(YEARS[index]) ? "#977eaa" : "#653383";
        if (!isAge && !nationalLine && !PRESIDENTIAL.includes(YEARS[index])) pieces.push(`<rect x="${x(index) - 6}" y="${y(point.value) - 6}" width="12" height="12" rx="1" fill="${fill}" ${attributes}/>`);
        else pieces.push(`<circle cx="${x(index)}" cy="${y(point.value)}" r="${nationalLine ? 4 : 6}" fill="${fill}" ${nationalLine ? 'style="stroke:#9b8ba3"' : ""} ${attributes}/>`);
      });
    }
    if (filters.state) draw(national, true);
    draw(local, false);
    categories.forEach((category, index) => {
      pieces.push(`<text x="${x(index)}" y="${height - bottom + 23}" text-anchor="middle" fill="#66576d" font-size="15">${html(category)}</text>`);
      if (!isAge) pieces.push(`<text x="${x(index)}" y="${height - 5}" text-anchor="middle" fill="#66576d" font-size="12">${PRESIDENTIAL.includes(YEARS[index]) ? "Pres." : "Inter."}</text>`);
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
    $("municipal-body").innerHTML = values.slice(0, 25).map(row => `<tr><td>${html(row.name)}<small>Clave ${row.key}</small></td><td>${number(row.ln)}</td><td>${number(row.sv)}</td><td>${percent(rate(row))}</td></tr>`).join("") || '<tr><td colspan="4">Sin municipios que coincidan con la búsqueda.</td></tr>';
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
    $("tooltip").innerHTML = `<strong>${html(detail.title)}</strong><span class="tooltip-value">${html(detail.value)}</span>${comparisonText ? `<div>${comparisonText}</div>` : ""}<div>LN ${number(counts.ln)} · SV ${number(counts.sv)}<br>NV ${number(counts.nv)} · NS ${number(counts.ns)}</div><p class="tooltip-note">${html(detail.note)}</p>`;
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
    if (scheduled) cancelAnimationFrame(scheduled);
    engine.cache.clear();
    municipalRows = null;
  }, { once: true });
  render();
})();
