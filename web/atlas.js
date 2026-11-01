(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const data = JSON.parse($("ccpc-data").textContent);
  const engine = new CCPC.DataEngine(data);
  const number = value => new Intl.NumberFormat("es-MX").format(value);
  const percent = value => value === null ? "Sin dato" : `${value.toFixed(2)} %`;
  const rate = counts => CCPC.rate(counts);
  const source = "Fuente: INE / DECEyEC · Conteos Censales de Participación Ciudadana, 2009–2024.";
  const pages = [
    {
      chapter: "La mesa de México", title: "32 estados, seis elecciones", lead: "Cada color del mapa representa una entidad. Abre el mapa de la mesa para elegir grupos y comparar estados.", right: year => [`México en ${year}`, "De cada 100 registros de la lista nominal, ¿cuántos tienen marca de voto?"], figure: "map", side: "left", position: "bottom", yearEnabled: true,
      graphic: year => {
        const counts = engine.sum({ state: 0, year });
        return { highlight: [percent(rate(counts)), "con marca de voto"], rows: [["Sí votó", rate(counts), "#1d7787"], ["No votó", CCPC.rate(counts, "nv"), "#a32c39"], ["No especificado", CCPC.rate(counts, "ns"), "#a98b53"]], reading: `En ${year}, ${number(counts.sv)} de ${number(counts.ln)} registros tienen marca de voto. Los ${number(counts.ns)} casos sin información se muestran aparte.` };
      }
    },
    {
      chapter: "Edades", title: "Después del primer voto", lead: "La participación cambia entre edades. Cada barra reúne a un grupo distinto de personas de la elección elegida.", right: year => [`Participación por edad · ${year}`, "Compara el inicio, la caída en los veinte y la recuperación posterior."], figure: "18–29", side: "right", position: "top", yearEnabled: true,
      graphic: year => {
        const ages = [["18–19", 0], ["20–24", 1], ["25–29", 2], ["40–49", 4]];
        const drop = engine.ageDrop({ state: 0, year });
        return { highlight: [`${drop.value.toFixed(2)} puntos`, "menos entre 20–29 y 18–19"], rows: ages.map(([label, age], index) => [label, rate(engine.sum({ state: 0, year, age })), ["#1d7787", "#bd6953", "#a32c39", "#438363"][index]]), reading: `En ${year}, la participación de 20 a 29 años es ${drop.value.toFixed(2)} puntos menor que la de 18 a 19. El primer grupo de 30 años o más que iguala esa tasa es ${drop.recovery || "ninguno"}. No se sigue a las mismas personas.` };
      }
    },
    {
      chapter: "Tiempo", title: "Seis momentos del voto", lead: "Las elecciones presidenciales e intermedias presentan porcentajes diferentes. Cada año es una fotografía separada.", right: () => ["Participación nacional", "El año elegido se destaca; las seis barras conservan su propia base."], figure: "2009–24", side: "left", position: "top", yearEnabled: true,
      graphic: selected => {
        const type = [2012, 2018, 2024].includes(selected) ? "presidencial" : "intermedia";
        return { highlight: [percent(rate(engine.sum({ state: 0, year: selected }))), `participación en ${selected}`], rows: data.years.map(year => [year === selected ? `${year} · elegido` : String(year), rate(engine.sum({ state: 0, year })), [2012, 2018, 2024].includes(year) ? "#1d7787" : "#a32c39"]), reading: `${selected} fue una elección ${type}: ${percent(rate(engine.sum({ state: 0, year: selected })))} de participación en los conteos. Las diferencias entre años no indican por sí mismas su causa.` };
      }
    },
    {
      chapter: "Territorio", title: "Ellas y las tres zonas", lead: "Urbana, mixta y rural describen el tipo de sección electoral. Compara mujeres y hombres dentro de cada zona.", right: year => [`Mujeres y hombres · ${year}`, "Porcentajes calculados por separado para cada zona y sexo."], figure: "♀ · ♂", side: "right", position: "bottom", yearEnabled: true,
      graphic: year => {
        const rows = [];
        for (const [zone, section] of [["Urbana", 0], ["Mixta", 1], ["Rural", 2]]) {
          for (const [sexName, sex] of [["mujeres", 1], ["hombres", 0]]) rows.push([`${zone} · ${sexName}`, rate(engine.sum({ state: 0, year, section, sex })), sex ? "#438363" : "#1d7787"]);
        }
        const ruralWomen = rate(engine.sum({ state: 0, year, section: 2, sex: 1 }));
        const ruralMen = rate(engine.sum({ state: 0, year, section: 2, sex: 0 }));
        return { highlight: [`${(ruralWomen - ruralMen).toFixed(2)} puntos`, "diferencia rural mujeres–hombres"], rows, reading: `En la zona rural de ${year}, la diferencia entre mujeres y hombres es de ${(ruralWomen - ruralMen).toFixed(2)} puntos porcentuales. El dato describe los registros; no explica la causa.` };
      }
    },
    {
      chapter: "Inclusión", title: "Otras formas de participar", lead: "Los archivos de Voto Anticipado y Prisión Preventiva de 2024 se presentan aparte de la elección ordinaria.", right: () => ["Registros en 2024", "Tres conteos distintos que no deben sumarse como un solo porcentaje."], figure: "2024", side: "left", position: "bottom", yearEnabled: false,
      graphic: () => {
        const special = engine.special(0);
        const nb = engine.sum({ state: 0, year: 2024, sex: 2 });
        return { facts: [["Voto Anticipado", number(special[0].count)], ["Prisión Preventiva", number(special[1].count)], ["No binario · lista ordinaria", number(nb.ln)]], reading: "Los archivos especiales no tienen una lista nominal comparable para calcular una tasa. Los 105 registros de la categoría no binaria ordinaria son una base pequeña.", source: "Fuente: INE / DECEyEC · archivos especiales y conteos ordinarios de 2024." };
      }
    },
    {
      chapter: "Origen", title: "¿De dónde salen las cifras?", lead: "El Atlas usa los Conteos Censales de Participación Ciudadana publicados por el INE para seis elecciones ordinarias.", right: () => ["Del archivo al mapa", "La procedencia de cada grupo de cifras que ves en el sitio."], figure: "INE", side: "right", position: "middle", yearEnabled: false,
      graphic: () => ({ notes: [["192 archivos estatales", "Seis elecciones, cada una con un CSV por las 32 entidades. De ahí salen los porcentajes del mapa y de estas páginas."], ["Dos archivos especiales", "Voto Anticipado y Prisión Preventiva de 2024 se muestran como conteos separados."], ["Claves de entidades", "La clave EDOCVE vincula cada registro con uno de los 32 estados del mapa."]], reading: "Los archivos son conteos agrupados por características electorales y demográficas; esta página no muestra datos personales." })
    },
    {
      chapter: "Método", title: "¿Cómo se lee un porcentaje?", lead: "Primero se suman los registros del grupo elegido. Después se calcula el porcentaje sobre su propia lista nominal.", right: () => ["Una base, tres resultados", "Sí votó, no votó y no especificado se conservan separados."], figure: "Σ", side: "left", position: "top", yearEnabled: false,
      graphic: () => ({ notes: [["Lista nominal · LN", "Es la base de personas registradas para el grupo y la elección elegidos."], ["Sí votó · SV", "Participación = SV ÷ LN × 100. Nunca se promedian porcentajes de estados o grupos."], ["No votó · NV", "Abstención = NV ÷ LN × 100. NS indica que no se especificó si votó; no se suma a NV."]], reading: "Si LN es menor que 100, interpreta el porcentaje con cautela. Al comparar elecciones se observan grupos de años distintos, no las mismas personas a lo largo del tiempo." })
    }
  ];
  const illustration = $("atlas-illustration");
  const dataBlock = $("atlas-data-block");
  const graphic = $("atlas-graphic");
  const yearSelect = $("atlas-year");
  yearSelect.setAttribute("aria-hidden", "true");
  yearSelect.tabIndex = -1;
  let current = 0;
  let mobileSide = "left";

  function showPage(index, side = mobileSide) {
    current = index;
    CivicAchievements.record("year", Number($("atlas-year").value));
    if (current === pages.length - 1) CivicAchievements.award("atlas_end");
    mobileSide = side;
    $("atlas-spread").dataset.mobileSide = mobileSide;
    $("atlas-spread").dataset.page = String(index);
    const page = pages[current];
    const year = Number($("atlas-year").value);
    const [rightTitle, rightSubtitle] = page.right(year);
    $("atlas-chapter").textContent = `${String(current + 1).padStart(2, "0")} · ${page.chapter}`;
    $("atlas-title").textContent = page.title;
    $("atlas-lead").textContent = page.lead;
    $("atlas-right-kicker").textContent = page.chapter;
    const title = $("atlas-right-title");
    title.textContent = page.yearEnabled ? rightTitle.replace(String(year), "").trimEnd() : rightTitle;
    if (page.yearEnabled && !rightTitle.includes(String(year))) title.append(document.createTextNode(" · "));
    const control = document.createElement("span");
    control.className = "atlas-year-control";
    control.hidden = !page.yearEnabled;
    control.append(yearSelect);
    const yearButton = document.createElement("button");
    yearButton.type = "button";
    yearButton.className = "atlas-year-trigger";
    yearButton.setAttribute("aria-label", `Año de elección: ${year}. Cambiar año`);
    yearButton.setAttribute("aria-expanded", "false");
    yearButton.textContent = String(year);
    const yearMenu = document.createElement("span");
    yearMenu.className = "atlas-year-menu";
    yearMenu.hidden = true;
    yearMenu.setAttribute("role", "group");
    yearMenu.setAttribute("aria-label", "Años de elección");
    for (const option of yearSelect.options) {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = "atlas-year-choice";
      choice.textContent = option.value;
      choice.setAttribute("aria-current", String(option.value === yearSelect.value));
      choice.addEventListener("click", () => {
        yearSelect.value = option.value;
        yearSelect.dispatchEvent(new Event("change", { bubbles: true }));
        document.querySelector(".atlas-year-trigger").focus();
      });
      yearMenu.append(choice);
    }
    yearButton.addEventListener("click", () => {
      yearMenu.hidden = !yearMenu.hidden;
      yearButton.setAttribute("aria-expanded", String(!yearMenu.hidden));
    });
    control.append(yearButton, yearMenu);
    title.append(control);
    yearSelect.disabled = !page.yearEnabled;
    $("atlas-right-subtitle").textContent = rightSubtitle;
    $("atlas-left-number").textContent = String(current * 2 + 1).padStart(2, "0");
    $("atlas-right-number").textContent = String(current * 2 + 2).padStart(2, "0");
    const figureBody = $(page.side === "left" ? "atlas-left-body" : "atlas-right-body");
    const dataBody = $(page.side === "left" ? "atlas-right-body" : "atlas-left-body");
    figureBody.dataset.position = page.position;
    dataBody.dataset.position = "middle";
    figureBody.append(illustration);
    dataBody.append(dataBlock);
    illustration.replaceChildren();
    if (page.figure === "map") {
      const map = document.querySelector(".school-map-art svg").cloneNode(true);
      map.setAttribute("aria-hidden", "true");
      illustration.append(map);
    } else {
      const symbol = document.createElement("strong");
      symbol.className = "atlas-symbol";
      symbol.textContent = page.figure;
      illustration.append(symbol);
    }
    const values = page.graphic(year);
    graphic.replaceChildren();
    if (values.highlight) {
      const highlight = document.createElement("div");
      highlight.className = "atlas-highlight";
      const metric = document.createElement("strong");
      const explanation = document.createElement("span");
      metric.textContent = values.highlight[0];
      explanation.textContent = values.highlight[1];
      highlight.append(metric, explanation);
      graphic.append(highlight);
    }
    for (const [label, value, color] of values.rows || []) {
      const row = document.createElement("div");
      row.className = "atlas-bar";
      const name = document.createElement("span");
      name.textContent = label;
      const track = document.createElement("div");
      track.className = "atlas-bar-track";
      const fill = document.createElement("i");
      fill.style.setProperty("--bar-width", `${Math.max(0, Math.min(100, value || 0))}%`);
      fill.style.setProperty("--bar-color", color);
      track.append(fill);
      const metric = document.createElement("strong");
      metric.textContent = percent(value);
      row.append(name, track, metric);
      graphic.append(row);
    }
    for (const [label, value] of values.facts || []) {
      const item = document.createElement("div");
      item.className = "atlas-fact";
      const metric = document.createElement("strong");
      const name = document.createElement("span");
      metric.textContent = value;
      name.textContent = label;
      item.append(metric, name);
      graphic.append(item);
    }
    for (const [title, text] of values.notes || []) {
      const item = document.createElement("div");
      item.className = "atlas-note";
      const heading = document.createElement("strong");
      const detail = document.createElement("p");
      heading.textContent = title;
      detail.textContent = text;
      item.append(heading, detail);
      graphic.append(item);
    }
    $("atlas-reading").textContent = values.reading;
    $("atlas-source").textContent = values.source || source;
    const small = matchMedia("(max-width:650px)").matches;
    $("atlas-previous").disabled = current === 0 && (!small || mobileSide === "left");
    $("atlas-next").disabled = current === pages.length - 1 && (!small || mobileSide === "right");
  }

  $("atlas-opener").addEventListener("click", () => showPage(0, "left"));
  function turn(direction) {
    const small = matchMedia("(max-width:650px)").matches;
    if (!small) showPage(Math.max(0, Math.min(pages.length - 1, current + direction)));
    else if (direction < 0 && mobileSide === "right") showPage(current, "left");
    else if (direction > 0 && mobileSide === "left") showPage(current, "right");
    else showPage(Math.max(0, Math.min(pages.length - 1, current + direction)), direction < 0 ? "right" : "left");
    if (!matchMedia("(prefers-reduced-motion:reduce)").matches) {
      const visible = document.querySelectorAll(".atlas-page:not([hidden])");
      for (const sheet of visible) sheet.animate([{ transform: `rotateY(${direction > 0 ? 8 : -8}deg)`, opacity: .7 }, { transform: "rotateY(0deg)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
    }
  }
  $("atlas-previous").addEventListener("click", () => {
    turn(-1);
  });
  $("atlas-next").addEventListener("click", () => {
    turn(1);
  });
  $("atlas-year").addEventListener("change", () => showPage(current));
  document.addEventListener("click", event => {
    const control = document.querySelector(".atlas-year-control");
    if (!control || control.contains(event.target)) return;
    const menu = control.querySelector(".atlas-year-menu");
    const trigger = control.querySelector(".atlas-year-trigger");
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const control = document.querySelector(".atlas-year-control");
    if (!control) return;
    const menu = control.querySelector(".atlas-year-menu");
    if (menu.hidden) return;
    menu.hidden = true;
    control.querySelector(".atlas-year-trigger").setAttribute("aria-expanded", "false");
    control.querySelector(".atlas-year-trigger").focus();
  });
  window.addEventListener("resize", () => showPage(current));
})();
