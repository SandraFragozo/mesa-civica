(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const data = JSON.parse($("ccpc-data").textContent);
  const engine = new CCPC.DataEngine(data);
  const number = value => new Intl.NumberFormat("es-MX").format(value);
  const percent = value => `${value.toFixed(2)} %`;
  const rate = counts => CCPC.rate(counts);
  const pages = [
    { chapter: "01 · La mesa de México", title: "32 estados, seis elecciones", lead: "Cada color del mapa representa una entidad. Abre el mapa de la mesa para cambiar los filtros y descubrir cómo participa cada grupo.", figure: "map", graphic: () => {
      const counts = engine.sum({ state: 0, year: 2024 });
      return { heading: "México en 2024", rows: [["Sí votó", rate(counts), "#1d7787"], ["No votó", CCPC.rate(counts, "nv"), "#a32c39"], ["No especificado", CCPC.rate(counts, "ns"), "#a98b53"]], reading: `En los conteos ordinarios de 2024 hay ${number(counts.ln)} registros en lista nominal. ${number(counts.sv)} tienen marca de voto. Los casos sin información se conservan separados.` };
    } },
    { chapter: "02 · Edades", title: "Después del primer voto", lead: "La participación de los grupos de 20 a 29 años es menor que la de 18 a 19 años. Son grupos distintos, no el seguimiento de las mismas personas.", figure: "18–29", graphic: () => {
      const ages = [["18–19", 0], ["20–24", 1], ["25–29", 2], ["40–49", 4]];
      return { heading: "Participación por edad · 2024", rows: ages.map(([label, age], index) => [label, rate(engine.sum({ state: 0, year: 2024, age })), ["#1d7787", "#bd6953", "#a32c39", "#438363"][index]]), reading: "El grupo de 40 a 49 años es el primero, desde los 30, que alcanza la participación observada en 18 a 19 años. Esto ocurre en las seis elecciones estudiadas." };
    } },
    { chapter: "03 · Tiempo", title: "Seis momentos del voto", lead: "Las elecciones presidenciales e intermedias muestran ritmos distintos. Mira cómo cambia el porcentaje de registros con marca de voto.", figure: "2009–24", graphic: () => ({ heading: "Participación nacional", rows: data.years.map(year => [String(year), rate(engine.sum({ state: 0, year })), [2012, 2018, 2024].includes(year) ? "#1d7787" : "#a32c39"]), reading: "2009, 2015 y 2021 son elecciones intermedias; 2012, 2018 y 2024 son presidenciales. Comparar estos años describe diferencias observadas, no sus causas." }) },
    { chapter: "04 · Territorio", title: "Ellas y las tres zonas", lead: "Los conteos distinguen secciones urbanas, mixtas y rurales. La comparación entre mujeres y hombres cambia según la zona.", figure: "♀ · ♂", graphic: () => {
      const rows = [];
      for (const [label, section] of [["Rural · mujeres", 2], ["Rural · hombres", 2], ["Urbana · mujeres", 0], ["Urbana · hombres", 0]]) rows.push([label, rate(engine.sum({ state: 0, year: 2024, section, sex: label.includes("mujeres") ? 1 : 0 })), label.includes("mujeres") ? "#438363" : "#1d7787"]);
      return { heading: "Participación en 2024", rows, reading: "En la zona rural, la diferencia entre mujeres y hombres es de 11.16 puntos porcentuales. El dato describe el sexo registrado en los archivos, no explica por qué ocurre la diferencia." };
    } },
    { chapter: "05 · Inclusión", title: "Otras formas de participar", lead: "En 2024 hay archivos especiales para Voto Anticipado y Prisión Preventiva. Se presentan aparte de los conteos ordinarios.", figure: "2024", graphic: () => {
      const special = engine.special(0);
      const nb = engine.sum({ state: 0, year: 2024, sex: 2 });
      return { heading: "Registros en 2024", rows: [], facts: [["Voto Anticipado", number(special[0].count)], ["Prisión Preventiva", number(special[1].count)], ["No binario · lista ordinaria", number(nb.ln)]], reading: "Los archivos especiales no tienen un denominador comparable para calcular participación. En la categoría no binaria ordinaria hay 105 registros a nivel nacional: es una base pequeña y debe leerse con cautela." };
    } }
  ];
  let current = 0;
  const graphic = $("atlas-graphic");
  const illustration = $("atlas-illustration");

  function showPage(index) {
    current = index;
    const page = pages[current];
    $("atlas-chapter").textContent = page.chapter;
    $("atlas-title").textContent = page.title;
    $("atlas-lead").textContent = page.lead;
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
    const values = page.graphic();
    graphic.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = values.heading;
    graphic.append(heading);
    for (const [label, value, color] of values.rows) {
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
      metric.textContent = value === null ? "Sin dato" : percent(value);
      row.append(name, track, metric);
      graphic.append(row);
    }
    for (const [label, value] of values.facts || []) {
      const row = document.createElement("div");
      const metric = document.createElement("strong");
      const name = document.createElement("p");
      metric.className = "atlas-number";
      name.className = "atlas-small";
      metric.textContent = value;
      name.textContent = label;
      row.append(metric, name);
      graphic.append(row);
    }
    $("atlas-reading").textContent = values.reading;
    $("atlas-pagination").textContent = `${current + 1} / ${pages.length}`;
    $("atlas-previous").disabled = current === 0;
    $("atlas-next").disabled = current === pages.length - 1;
  }

  $("atlas-opener").addEventListener("click", () => showPage(0));
  $("atlas-previous").addEventListener("click", () => showPage(Math.max(0, current - 1)));
  $("atlas-next").addEventListener("click", () => showPage(Math.min(pages.length - 1, current + 1)));
})();
