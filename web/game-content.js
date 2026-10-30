(function (root) {
  "use strict";

  function createDeck(items, random = Math.random) {
    if (!items.length) throw new Error("El banco está vacío");
    let queue = [];
    let previous = null;
    return {
      next() {
        if (!queue.length) {
          queue = [...items];
          for (let index = queue.length - 1; index > 0; index -= 1) {
            const other = Math.floor(random() * (index + 1));
            [queue[index], queue[other]] = [queue[other], queue[index]];
          }
          if (queue.length > 1 && queue[0].id === previous) [queue[0], queue[1]] = [queue[1], queue[0]];
        }
        const item = queue.shift();
        previous = item.id;
        return item;
      }
    };
  }

  function createContent(data, api = root.CCPC) {
    const engine = new api.DataEngine(data);
    const number = value => new Intl.NumberFormat("es-MX").format(value);
    const decimal = value => new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    const pct = counts => `${decimal(api.rate(counts))}%`;
    const observe = (criteria, label) => ({ kind: "ordinary", label, criteria, counts: engine.sum(criteria) });
    const special = (state, modality) => ({ kind: "special", state, modality, count: engine.special(state)[modality].count });
    const national = observe({ year: 2024 }, "Total nacional 2024");
    const ages = data.ages.map((label, age) => observe({ year: 2024, age }, label));
    const yearly = data.years.map(year => observe({ year }, String(year)));
    const highestYear = [...yearly].sort((a, b) => api.rate(b.counts) - api.rate(a.counts))[0];
    const lowestAge = [...ages].sort((a, b) => api.rate(a.counts) - api.rate(b.counts))[0];
    const highestAge = [...ages].sort((a, b) => api.rate(b.counts) - api.rate(a.counts))[0];
    const recovery = engine.ageDrop({ year: 2024 }).recovery;
    const sections = [0, 1, 2].map(section => {
      const women = observe({ year: 2024, section, sex: 1 }, `${data.sections[section]} · Mujeres`);
      const men = observe({ year: 2024, section, sex: 0 }, `${data.sections[section]} · Hombres`);
      return { name: data.sections[section], women, men, gap: api.rate(women.counts) - api.rate(men.counts) };
    });
    const rural = sections[2];
    const largestGenderGap = [...sections].sort((a, b) => b.gap - a.gap)[0];
    const states = Object.keys(data.states).map(Number).map(state => observe({ year: 2024, state }, data.states[state]));
    const highestState = [...states].sort((a, b) => api.rate(b.counts) - api.rate(a.counts))[0];
    const lowestState = [...states].sort((a, b) => api.rate(a.counts) - api.rate(b.counts))[0];
    const nonbinary = observe({ year: 2024, sex: 2 }, "No binario · Nacional 2024");
    const jalisco = observe({ year: 2024, state: 14, sex: 2 }, "No binario · Jalisco 2024");
    const anticipated = special(0, 0);
    const prison = special(0, 1);
    const presidential = observe({ years: [2012, 2018, 2024] }, "Presidenciales acumuladas");
    const intermediate = observe({ years: [2009, 2015, 2021] }, "Intermedias acumuladas");
    const electoral = Object.keys(data.states).map(Number).map(state => ({ state, ...engine.electionGap({ state }) })).sort((a, b) => b.value - a.value)[0];
    const source = "Fuente: INE / DECEyEC · CCPC. Tasas calculadas con ΣSV / ΣLN.";
    const citation = evidence => evidence.every(item => item.kind === "special") ? "Fuente: INE / DECEyEC · CCPC 2024 · Registros de modalidades especiales, sin tasas." : source;
    const question = (id, prompt, correct, alternatives, explanation, scope, evidence) => ({ id, type: "PREGUNTA", prompt, options: [correct, ...alternatives].map((text, index) => ({ id: String(index), text })), correct: "0", explanation, scope, source: citation(evidence), evidence });
    const statement = (id, type, title, explanation, scope, evidence) => ({ id, type, title, explanation, scope, source: citation(evidence), evidence });
    const ageEvidence = ages.slice(0, 3);

    const balero = [
      question("b-year", "¿Qué elección tuvo la mayor participación nacional entre 2009 y 2024?", highestYear.label, ["2009", "2018"], `La elección de ${highestYear.label} registró ${pct(highestYear.counts)}: ${number(highestYear.counts.sv)} SV de ${number(highestYear.counts.ln)} LN.`, "Nacional · Seis elecciones 2009–2024", yearly),
      question("b-young", "¿Qué grupo de edad tuvo la menor participación nacional en 2024?", lowestAge.label, ["18-19 (Primovotantes)", "60-69"], `${lowestAge.label} registró ${pct(lowestAge.counts)}. Son ${number(lowestAge.counts.sv)} SV de ${number(lowestAge.counts.ln)} LN.`, "Nacional · 2024 · Todos los sexos y secciones", ages),
      question("b-recovery", "Después de los 20–29, ¿qué primer grupo recuperó en 2024 la tasa de los 18–19 años?", recovery, ["30-39", "70+"], `El primer grupo fue ${recovery}: ${pct(ages.find(age => age.label === recovery).counts)}, frente a ${pct(ages[0].counts)} en 18–19. La edad no acredita un primer voto individual.`, "Nacional · 2024 · Grupos de 30 años o más", ages),
      question("b-rural", "En las secciones rurales de 2024, ¿quiénes tuvieron mayor participación?", "Mujeres", ["Hombres", "Ambos tuvieron la misma tasa"], `Mujeres: ${pct(rural.women.counts)}. Hombres: ${pct(rural.men.counts)}. La diferencia es ${decimal(rural.gap)} puntos porcentuales.`, "Nacional · 2024 · Secciones rurales · Todas las edades", [rural.women, rural.men]),
      question("b-election", "¿De qué tipo fue la elección federal de 2021?", "Intermedia", ["Presidencial", "No hubo elección federal"], `2021 fue una elección intermedia. En estos conteos, su participación nacional fue ${pct(yearly.find(year => year.label === "2021").counts)}.`, "Nacional · 2021", [yearly.find(year => year.label === "2021")]),
      question("b-modalities", "¿Qué modalidad especial de 2024 tiene más registros en los archivos recibidos?", "Prisión Preventiva", ["Voto Anticipado", "Las dos tienen el mismo número"], `Prisión Preventiva: ${number(prison.count)} registros; Voto Anticipado: ${number(anticipated.count)}. Son universos separados y sus archivos no ofrecen LN para calcular tasas.`, "Nacional · Modalidades especiales · 2024", [prison, anticipated]),
      question("b-ln", "¿Qué representa LN en los conteos de participación?", "La lista nominal capturada", ["Solo los registros con marca de voto", "La suma de votos por partido"], `LN es la base de los porcentajes. En 2024 reúne ${number(national.counts.ln)} registros; SV identifica los que tienen marca de voto.`, "Nacional · Universo ordinario · 2024", [national]),
      question("b-ns", "¿Cómo deben tratarse los registros NS al medir abstención?", "Mantenerlos separados de NV", ["Sumarlos a NV", "Contarlos como SV"], `NS conserva la participación no especificada. En 2024 hay ${number(national.counts.ns)} NS; la abstención se calcula solo con NV / LN.`, "Nacional · Universo ordinario · 2024", [national])
    ];

    const questions = [
      question("p-top-state", "¿Qué entidad tuvo la mayor tasa de participación en 2024?", highestState.label, ["Chihuahua", "Baja California"], `${highestState.label}: ${pct(highestState.counts)}, con ${number(highestState.counts.sv)} SV de ${number(highestState.counts.ln)} LN.`, "32 entidades · 2024 · Todos los perfiles", states),
      question("p-bottom-state", "¿Qué entidad tuvo la menor tasa de participación en 2024?", lowestState.label, ["Yucatán", "Tlaxcala"], `${lowestState.label}: ${pct(lowestState.counts)}, con ${number(lowestState.counts.sv)} SV de ${number(lowestState.counts.ln)} LN.`, "32 entidades · 2024 · Todos los perfiles", states),
      question("p-peak-age", "¿Qué grupo de edad tuvo la participación nacional más alta en 2024?", highestAge.label, ["18-19 (Primovotantes)", "25-29"], `${highestAge.label} registró ${pct(highestAge.counts)}: ${number(highestAge.counts.sv)} SV de ${number(highestAge.counts.ln)} LN.`, "Nacional · 2024 · Todos los sexos y secciones", ages),
      question("p-territory", "¿En qué tipo de sección fue mayor la ventaja de participación de mujeres sobre hombres en 2024?", largestGenderGap.name, ["Urbana", "Mixta"], `En la sección ${largestGenderGap.name.toLowerCase()}, la brecha fue de ${decimal(largestGenderGap.gap)} pp. Se comparan las tasas de cada sexo, sin promediar porcentajes.`, "Nacional · 2024 · Todas las edades", sections.flatMap(section => [section.women, section.men])),
      question("p-anticipated", "¿Cuántos registros tiene el archivo nacional de Voto Anticipado 2024?", number(anticipated.count), [number(prison.count), number(nonbinary.counts.ln)], `El archivo reúne ${number(anticipated.count)} registros. El conteo se presenta separado del universo ordinario y no es una tasa.`, "Nacional · Voto Anticipado · 2024", [anticipated]),
      question("p-nonbinary", "¿Cuántos registros LN hay en la categoría No binario del universo ordinario de 2024?", number(nonbinary.counts.ln), [number(nonbinary.counts.sv), "32"], `Hay ${number(nonbinary.counts.ln)} LN: ${number(nonbinary.counts.sv)} SV, ${number(nonbinary.counts.nv)} NV y ${number(nonbinary.counts.ns)} NS. No se suman a las modalidades especiales.`, "Nacional · No binario · Universo ordinario · 2024", [nonbinary]),
      question("p-election-gap", "¿Qué entidad tuvo la mayor brecha presidencial menos intermedia al reunir las seis elecciones?", data.states[electoral.state], ["Quintana Roo", "Tlaxcala"], `${data.states[electoral.state]}: ${decimal(electoral.value)} pp, con ${pct(electoral.presidential)} en presidenciales y ${pct(electoral.intermediate)} en intermedias. Son registros persona-elección.`, "2009–2024 · Tres presidenciales y tres intermedias", [observe({ state: electoral.state, years: [2012, 2018, 2024] }, "Presidenciales"), observe({ state: electoral.state, years: [2009, 2015, 2021] }, "Intermedias")]),
      question("p-2018", "¿Cuál fue la tasa nacional de participación en los CCPC de 2018?", pct(yearly[3].counts), [pct(yearly[5].counts), pct(yearly[1].counts)], `En 2018 fue ${pct(yearly[3].counts)}: ${number(yearly[3].counts.sv)} SV / ${number(yearly[3].counts.ln)} LN. Estos conteos no equivalen automáticamente a los cómputos distritales.`, "Nacional · CCPC 2018", [yearly[3]])
    ];

    const myths = [
      statement("m-age", "MITO", "En 2024, los 18–19 fueron el grupo de edad que más participó.", `El grupo con mayor tasa fue ${highestAge.label}, con ${pct(highestAge.counts)}. Los 18–19 registraron ${pct(ages[0].counts)}.`, "Nacional · 2024 · Todos los perfiles", [highestAge, ages[0]]),
      statement("m-average", "MITO", "La tasa nacional se calcula promediando los porcentajes de los estados.", `Primero se suman los conteos. En 2024: ${number(national.counts.sv)} SV / ${number(national.counts.ln)} LN = ${pct(national.counts)}.`, "Nacional · Universo ordinario · 2024", [national]),
      statement("m-ns", "MITO", "NS y NV significan lo mismo y se pueden juntar como abstención.", `NS es participación no especificada y se mantiene separado. En 2024: NV ${number(national.counts.nv)} y NS ${number(national.counts.ns)}.`, "Nacional · Universo ordinario · 2024", [national]),
      statement("m-special", "MITO", "Los archivos especiales de 2024 permiten calcular tasas de participación.", `Contienen ${number(anticipated.count)} registros de Voto Anticipado y ${number(prison.count)} de Prisión Preventiva, pero carecen de LN y SV. Se muestran conteos separados, sin tasas.`, "Nacional · Modalidades especiales · 2024", [anticipated, prison]),
      statement("m-intermediate", "MITO", "Las intermedias tuvieron mayor participación conjunta que las presidenciales de 2009–2024.", `Las presidenciales reúnen ${pct(presidential.counts)} y las intermedias ${pct(intermediate.counts)}. Cada tasa usa sus sumas de SV y LN.`, "Nacional · Seis elecciones · Registros persona-elección", [presidential, intermediate]),
      statement("m-gender", "MITO", "La brecha de participación entre mujeres y hombres fue igual en todas las zonas en 2024.", sections.map(section => `${section.name}: ${decimal(section.gap)} pp`).join("; ") + ". Cada comparación usa su propio denominador.", "Nacional · 2024 · Todas las edades", sections.flatMap(section => [section.women, section.men])),
      statement("m-history", "MITO", "La categoría No binario puede compararse en todas las elecciones desde 2009.", `En estos datos está disponible en 2024: ${number(nonbinary.counts.ln)} LN y ${number(nonbinary.counts.sv)} SV. Su ausencia en años anteriores no representa una tasa de cero.`, "Nacional · Categoría SEXO registrada · 2009–2024", [nonbinary]),
      statement("m-people", "MITO", "Sumar la LN de las seis elecciones revela cuántas personas distintas participaron.", "Son registros persona-elección: alguien puede aparecer en varias elecciones. Además, LN incluye SV, NV y NS; no identifica solo a quienes votaron.", "Nacional · Seis cortes transversales 2009–2024", yearly)
    ];

    const recoveryYears = data.years.map(year => ({ year, group: engine.ageDrop({ year }).recovery }));
    const anticipatedLeader = Object.keys(data.states).map(Number).map(state => special(state, 0)).sort((a, b) => b.count - a.count)[0];
    const prisonLeader = Object.keys(data.states).map(Number).map(state => special(state, 1)).sort((a, b) => b.count - a.count)[0];
    const realities = [
      statement("r-young", "REALIDAD", "La participación cae después de los 18–19 años en 2024.", `18–19: ${pct(ages[0].counts)}; 20–24: ${pct(ages[1].counts)}; 25–29: ${pct(ages[2].counts)}. Son grupos de edad, sin seguimiento individual.`, "Nacional · 2024 · Todos los sexos y secciones", ageEvidence),
      statement("r-recovery", "REALIDAD", "La recuperación por edad se observa en las seis elecciones.", recoveryYears.map(item => `${item.year}: ${item.group}`).join("; ") + ". Se identifica el primer grupo de 30 o más años que alcanza la tasa de 18–19.", "Nacional · Seis elecciones 2009–2024", data.years.flatMap(year => data.ages.map((label, age) => observe({ year, age }, `${year} · ${label}`)))),
      statement("r-women", "REALIDAD", "Las mujeres registran mayor participación en los tres tipos de sección en 2024.", sections.map(section => `${section.name}: mujeres ${pct(section.women.counts)}, hombres ${pct(section.men.counts)}`).join("; ") + ". Es una diferencia descriptiva.", "Nacional · 2024 · Todas las edades", sections.flatMap(section => [section.women, section.men])),
      statement("r-ns", "REALIDAD", "La participación no especificada también debe mostrarse.", `En 2024 hay ${number(national.counts.ns)} NS (${decimal(api.rate(national.counts, "ns"))}% de LN). Se conservan separados de NV; no se supone que votaron o se abstuvieron.`, "Nacional · Universo ordinario · 2024", [national]),
      statement("r-total", "REALIDAD", `En los CCPC 2024, el ${pct(national.counts)} de la lista capturada tiene marca de voto.`, `${number(national.counts.sv)} SV de ${number(national.counts.ln)} LN: ${pct(national.counts)}. El universo de estos cuadernillos excluye casillas especiales y voto desde el extranjero.`, "Nacional · Universo ordinario · 2024", [national]),
      statement("r-jalisco", "REALIDAD", "Los porcentajes de bases pequeñas necesitan sus conteos.", `Jalisco, No binario 2024: LN ${number(jalisco.counts.ln)}, SV ${number(jalisco.counts.sv)}, participación ${pct(jalisco.counts)}. LN < 100: base pequeña. No representa el tamaño de toda la diversidad de género.`, "Jalisco · No binario · Universo ordinario · 2024", [jalisco]),
      statement("r-anticipated", "REALIDAD", "Voto Anticipado tiene registros distribuidos por entidad.", `${data.states[anticipatedLeader.state]} reúne el mayor conteo: ${number(anticipatedLeader.count)} registros, dentro de ${number(anticipated.count)} nacionales. Son conteos, no tasas.`, "Voto Anticipado · 2024 · Comparación estatal", [anticipatedLeader, anticipated]),
      statement("r-prison", "REALIDAD", "Prisión Preventiva tiene su propio universo de registros.", `${data.states[prisonLeader.state]} reúne el mayor conteo: ${number(prisonLeader.count)} registros, dentro de ${number(prison.count)} nacionales. Se mantienen separados de LN y de otras modalidades.`, "Prisión Preventiva · 2024 · Comparación estatal", [prisonLeader, prison])
    ];
    return { balero, pirinola: { MITO: myths, REALIDAD: realities, PREGUNTA: questions } };
  }

  const api = { createContent, createDeck };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CivicGames = api;
})(typeof globalThis === "undefined" ? window : globalThis);
