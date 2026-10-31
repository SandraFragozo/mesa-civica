(function (root) {
  "use strict";

  function createDeck(items, random = Math.random) {
    if (!items.length) throw new Error("El banco está vacío");
    let queue = [];
    let previous = null;
    return {
      next(predicate = null) {
        if (!queue.length) {
          queue = [...items];
          for (let index = queue.length - 1; index > 0; index -= 1) {
            const other = Math.floor(random() * (index + 1));
            [queue[index], queue[other]] = [queue[other], queue[index]];
          }
          if (queue.length > 1 && queue[0].id === previous) [queue[0], queue[1]] = [queue[1], queue[0]];
        }
        if (typeof predicate === "function") {
          const matchIndex = queue.findIndex(predicate);
          if (matchIndex > 0) {
            const [picked] = queue.splice(matchIndex, 1);
            previous = picked.id;
            return picked;
          }
          if (matchIndex === -1) {
            const refill = items.filter(predicate);
            if (refill.length) {
              const fallback = refill[Math.floor(random() * refill.length)];
              previous = fallback.id;
              return fallback;
            }
          }
        }
        const item = queue.shift();
        previous = item.id;
        return item;
      }
    };
  }

  function createDadosRoller(dadosContent, random = Math.random) {
    const normalize = word => (word === "VERDAD" || word === "REALIDAD" ? "VERDAD" : "MITO");
    const decks = {
      MITO: createDeck(dadosContent.MITO, random),
      VERDAD: createDeck(dadosContent.VERDAD, random)
    };
    return {
      draw(wordA, wordB) {
        const typeA = normalize(wordA);
        const typeB = normalize(wordB);
        const first = decks[typeA].next();
        const second = decks[typeB].next(candidate => candidate.id !== first.id && (!first.topic || candidate.topic !== first.topic));
        return [first, second];
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
    const lowestYear = [...yearly].sort((a, b) => api.rate(a.counts) - api.rate(b.counts))[0];
    const lowestAge = [...ages].sort((a, b) => api.rate(a.counts) - api.rate(b.counts))[0];
    const highestAge = [...ages].sort((a, b) => api.rate(b.counts) - api.rate(a.counts))[0];
    const drop2024 = engine.ageDrop({ year: 2024 });
    const recovery = drop2024.recovery;
    const young20s2024 = observe({ year: 2024, age: [1, 2] }, "20-29 acumulado 2024");
    const dropsByYear = data.years.map(year => ({
      year,
      ...engine.ageDrop({ year }),
      obs18: observe({ year, age: 0 }, `${year} · 18-19`),
      obs20s: observe({ year, age: [1, 2] }, `${year} · 20-29`)
    }));
    const maxDropYear = [...dropsByYear].sort((a, b) => b.value - a.value)[0];
    const sections = [0, 1, 2].map(section => {
      const total = observe({ year: 2024, section }, data.sections[section]);
      const women = observe({ year: 2024, section, sex: 1 }, `${data.sections[section]} · Mujeres`);
      const men = observe({ year: 2024, section, sex: 0 }, `${data.sections[section]} · Hombres`);
      return { name: data.sections[section], total, women, men, gap: api.rate(women.counts) - api.rate(men.counts) };
    });
    const rural = sections[2];
    const largestGenderGap = [...sections].sort((a, b) => b.gap - a.gap)[0];
    const lowestSection = [...sections].sort((a, b) => api.rate(a.total.counts) - api.rate(b.total.counts))[0];
    const ageBySex = data.ages.map((label, age) => {
      const men = observe({ year: 2024, age, sex: 0 }, `${label} · Hombres`);
      const women = observe({ year: 2024, age, sex: 1 }, `${label} · Mujeres`);
      return { label, men, women, menAdvantage: api.rate(men.counts) - api.rate(women.counts) };
    });
    const menLeadAge = [...ageBySex].sort((a, b) => b.menAdvantage - a.menAdvantage)[0];
    const stateIds = Object.keys(data.states).map(Number);
    const states = stateIds.map(state => observe({ year: 2024, state }, data.states[state]));
    const highestState = [...states].sort((a, b) => api.rate(b.counts) - api.rate(a.counts))[0];
    const lowestState = [...states].sort((a, b) => api.rate(a.counts) - api.rate(b.counts))[0];
    const largestLnState = [...states].sort((a, b) => b.counts.ln - a.counts.ln)[0];
    const stateGenderGaps = stateIds.map(state => {
      const women = observe({ year: 2024, state, sex: 1 }, `${data.states[state]} · Mujeres`);
      const men = observe({ year: 2024, state, sex: 0 }, `${data.states[state]} · Hombres`);
      return { state, label: data.states[state], women, men, gap: api.rate(women.counts) - api.rate(men.counts) };
    });
    const topStateGenderGap = [...stateGenderGaps].sort((a, b) => b.gap - a.gap)[0];
    const nonbinary = observe({ year: 2024, sex: 2 }, "No binario · Nacional 2024");
    const jalisco = observe({ year: 2024, state: 14, sex: 2 }, "No binario · Jalisco 2024");
    const cdmxNonbinary = observe({ year: 2024, state: 9, sex: 2 }, "No binario · Ciudad de México 2024");
    const anticipated = special(0, 0);
    const prison = special(0, 1);
    const presidential = observe({ years: [2012, 2018, 2024] }, "Presidenciales acumuladas");
    const intermediate = observe({ years: [2009, 2015, 2021] }, "Intermedias acumuladas");
    const nationalElectionGap = engine.electionGap();
    const electoral = stateIds.map(state => ({ state, ...engine.electionGap({ state }) })).sort((a, b) => b.value - a.value)[0];
    const ageElectionGaps = data.ages.map((label, age) => ({
      age,
      label,
      ...engine.electionGap({ age }),
      presObs: observe({ age, years: [2012, 2018, 2024] }, `${label} · Presidenciales`),
      interObs: observe({ age, years: [2009, 2015, 2021] }, `${label} · Intermedias`)
    }));
    const topAgeElectionGap = [...ageElectionGaps].sort((a, b) => b.value - a.value)[0];
    const source = "Fuente: INE / DECEyEC · CCPC. Tasas calculadas con ΣSV / ΣLN.";
    const citation = evidence => evidence.every(item => item.kind === "special") ? "Fuente: INE / DECEyEC · CCPC 2024 · Registros de modalidades especiales, sin tasas." : source;
    const question = (id, prompt, correct, alternatives, explanation, scope, evidence, difficulty = null) => ({
      id,
      type: "PREGUNTA",
      ...(difficulty ? { difficulty } : {}),
      prompt,
      options: [correct, ...alternatives].map((text, index) => ({ id: String(index), text })),
      correct: "0",
      explanation,
      scope,
      source: citation(evidence),
      evidence
    });
    const statement = (id, type, title, explanation, scope, evidence, topic) => ({ id, type, topic, title, explanation, scope, source: citation(evidence), evidence });
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

    const easyQuestions = [
      question("p-anticipated", "¿Cuántos registros tiene el archivo nacional de Voto Anticipado 2024?", number(anticipated.count), [number(prison.count), number(nonbinary.counts.ln)], `El archivo reúne ${number(anticipated.count)} registros. El conteo se presenta separado del universo ordinario y no es una tasa.`, "Nacional · Voto Anticipado · 2024", [anticipated], "FÁCIL"),
      question("p-nonbinary", "¿Cuántos registros LN hay en la categoría No binario del universo ordinario de 2024?", number(nonbinary.counts.ln), [number(nonbinary.counts.sv), "32"], `Hay ${number(nonbinary.counts.ln)} LN: ${number(nonbinary.counts.sv)} SV, ${number(nonbinary.counts.nv)} NV y ${number(nonbinary.counts.ns)} NS. No se suman a las modalidades especiales.`, "Nacional · No binario · Universo ordinario · 2024", [nonbinary], "FÁCIL"),
      question("p-2018", "¿Cuál fue la tasa nacional de participación en los CCPC de 2018?", pct(yearly[3].counts), [pct(yearly[5].counts), pct(yearly[1].counts)], `En 2018 fue ${pct(yearly[3].counts)}: ${number(yearly[3].counts.sv)} SV / ${number(yearly[3].counts.ln)} LN. Estos conteos no equivalen automáticamente a los cómputos distritales.`, "Nacional · CCPC 2018", [yearly[3]], "FÁCIL"),
      question("p-sv", "¿Qué identifican las siglas SV en los cuadernillos de los CCPC?", "Los registros con marca de voto", ["Los registros sin marca de voto", "La suma de modalidades especiales"], `SV identifica a quienes tienen marca de voto en la lista nominal capturada: ${number(national.counts.sv)} de ${number(national.counts.ln)} LN en 2024 (${pct(national.counts)}).`, "Nacional · Universo ordinario · 2024", [national], "FÁCIL"),
      question("p-2024-rate", "¿Cuál fue la tasa nacional de participación capturada en los CCPC de 2024?", pct(national.counts), [`${decimal(api.rate(national.counts, "nv"))}%`, pct(yearly[1].counts)], `En 2024 se registraron ${number(national.counts.sv)} SV de ${number(national.counts.ln)} LN (${pct(national.counts)}). El universo ordinario excluye casillas especiales y voto desde el extranjero.`, "Nacional · Universo ordinario · 2024", [national], "FÁCIL"),
      question("p-prison-count", "¿Cuántos registros reúne el archivo nacional de Prisión Preventiva en 2024?", number(prison.count), [number(anticipated.count), "4,531"], `Reúne ${number(prison.count)} registros nacionales. Al no contar con denominador LN equivalente, se reporta únicamente como conteo separado, sin tasas.`, "Nacional · Prisión Preventiva · 2024", [prison], "FÁCIL"),
      question("p-first-2024", "¿Cuál fue la tasa nacional de participación del grupo de 18–19 años en 2024?", pct(ages[0].counts), [pct(ages[1].counts), pct(highestAge.counts)], `El grupo ${ages[0].label} registró ${pct(ages[0].counts)}: ${number(ages[0].counts.sv)} SV de ${number(ages[0].counts.ln)} LN. El tramo de edad no acredita el primer voto individual.`, "Nacional · 18–19 años · 2024", [ages[0]], "FÁCIL"),
      question("p-abstention-2024", "¿Cuál fue la tasa nacional de abstención registrada (NV / LN) en los CCPC de 2024?", `${decimal(api.rate(national.counts, "nv"))}%`, [`${decimal(api.rate(national.counts, "nv") + api.rate(national.counts, "ns"))}%`, `${decimal(api.rate(national.counts, "ns"))}%`], `Se registraron ${number(national.counts.nv)} NV entre ${number(national.counts.ln)} LN (${decimal(api.rate(national.counts, "nv"))}%). Los ${number(national.counts.ns)} NS (${decimal(api.rate(national.counts, "ns"))}%) se mantienen separados.`, "Nacional · Universo ordinario · 2024", [national], "FÁCIL")
    ];

    const anticipatedStates = stateIds.map(state => special(state, 0));
    const anticipatedLeader = [...anticipatedStates].sort((a, b) => b.count - a.count)[0];
    const prisonLeader = stateIds.map(state => special(state, 1)).sort((a, b) => b.count - a.count)[0];

    const mediumQuestions = [
      question("p-top-state", "¿Qué entidad tuvo la mayor tasa de participación en 2024?", highestState.label, ["Chihuahua", "Baja California"], `${highestState.label}: ${pct(highestState.counts)}, con ${number(highestState.counts.sv)} SV de ${number(highestState.counts.ln)} LN.`, "32 entidades · 2024 · Todos los perfiles", states, "MEDIO"),
      question("p-bottom-state", "¿Qué entidad tuvo la menor tasa de participación en 2024?", lowestState.label, ["Yucatán", "Tlaxcala"], `${lowestState.label}: ${pct(lowestState.counts)}, con ${number(lowestState.counts.sv)} SV de ${number(lowestState.counts.ln)} LN.`, "32 entidades · 2024 · Todos los perfiles", states, "MEDIO"),
      question("p-peak-age", "¿Qué grupo de edad tuvo la participación nacional más alta en 2024?", highestAge.label, ["18-19 (Primovotantes)", "25-29"], `${highestAge.label} registró ${pct(highestAge.counts)}: ${number(highestAge.counts.sv)} SV de ${number(highestAge.counts.ln)} LN.`, "Nacional · 2024 · Todos los sexos y secciones", ages, "MEDIO"),
      question("p-territory", "¿En qué tipo de sección fue mayor la ventaja de participación de mujeres sobre hombres en 2024?", largestGenderGap.name, ["Urbana", "Mixta"], `En la sección ${largestGenderGap.name.toLowerCase()}, la brecha fue de ${decimal(largestGenderGap.gap)} pp. Se comparan las tasas de cada sexo, sin promediar porcentajes.`, "Nacional · 2024 · Todas las edades", sections.flatMap(section => [section.women, section.men]), "MEDIO"),
      question("p-age-70-sex", "¿En qué único grupo de edad superó la tasa de hombres a la de mujeres a nivel nacional en 2024?", menLeadAge.label, ["60-69", "18-19 (Primovotantes)"], `En ${menLeadAge.label}, hombres registraron ${pct(menLeadAge.men.counts)} y mujeres ${pct(menLeadAge.women.counts)} (${decimal(menLeadAge.menAdvantage)} pp a favor de hombres). En todos los demás tramos fue mayor la tasa de mujeres.`, "Nacional · 2024 · Comparación por sexo y edad", ageBySex.flatMap(item => [item.men, item.women]), "MEDIO"),
      question("p-section-lowest", "Al comparar los tres tipos de sección en 2024, ¿cuál registró la menor tasa global de participación?", lowestSection.name, sections.filter(item => item.name !== lowestSection.name).map(item => item.name), `${lowestSection.name} registró ${pct(lowestSection.total.counts)}, frente a ${pct(sections[2].total.counts)} en Rural y ${pct(sections[0].total.counts)} en Urbana, sumando SV y LN de cada tipo.`, "Nacional · 2024 · Tres tipos de sección", sections.map(section => section.total), "MEDIO"),
      question("p-largest-ln-state", "¿Qué entidad concentró la mayor lista nominal capturada (LN) en el universo ordinario de 2024?", largestLnState.label, ["Ciudad de México", "Jalisco"], `${largestLnState.label} reunió ${number(largestLnState.counts.ln)} registros LN (${number(largestLnState.counts.sv)} SV, tasa de ${pct(largestLnState.counts)}). Por eso la tasa nacional pondera por conteos y no promedia estados.`, "32 entidades · Universo ordinario · 2024", states, "MEDIO"),
      question("p-va-leader", "¿Qué entidad concentró el mayor número de registros de Voto Anticipado en 2024?", data.states[anticipatedLeader.state], ["Estado de México", "Jalisco"], `${data.states[anticipatedLeader.state]} encabezó el archivo con ${number(anticipatedLeader.count)} de los ${number(anticipated.count)} registros nacionales. Se reportan conteos sin denominador LN.`, "32 entidades · Voto Anticipado · 2024", [...anticipatedStates, anticipated], "MEDIO")
    ];

    const hardQuestions = [
      question("p-election-gap", "¿Qué entidad tuvo la mayor brecha presidencial menos intermedia al reunir las seis elecciones?", data.states[electoral.state], ["Quintana Roo", "Tlaxcala"], `${data.states[electoral.state]}: ${decimal(electoral.value)} pp, con ${pct(electoral.presidential)} en presidenciales y ${pct(electoral.intermediate)} en intermedias. Son registros persona-elección.`, "2009–2024 · Tres presidenciales y tres intermedias", [observe({ state: electoral.state, years: [2012, 2018, 2024] }, "Presidenciales"), observe({ state: electoral.state, years: [2009, 2015, 2021] }, "Intermedias")], "DIFÍCIL"),
      question("p-nat-election-gap", "Al sumar las tres elecciones presidenciales y compararlas con las tres intermedias (2009–2024), ¿de cuánto es la brecha nacional?", `${decimal(nationalElectionGap.value)} pp`, [`${decimal(drop2024.value)} pp`, `${decimal(electoral.value)} pp`], `Las presidenciales acumulan ${pct(presidential.counts)} (${number(presidential.counts.sv)} SV / ${number(presidential.counts.ln)} LN) y las intermedias ${pct(intermediate.counts)} (${number(intermediate.counts.sv)} SV / ${number(intermediate.counts.ln)} LN): ${decimal(nationalElectionGap.value)} pp.`, "Nacional · 2009–2024 · Registros persona-elección", [presidential, intermediate], "DIFÍCIL"),
      question("p-age-election-gap", "Entre 2009 y 2024, ¿qué grupo de edad presenta la mayor brecha entre elecciones presidenciales e intermedias acumuladas?", topAgeElectionGap.label, ["18-19 (Primovotantes)", "70+"], `${topAgeElectionGap.label} alcanza ${pct(topAgeElectionGap.presidential)} en presidenciales y ${pct(topAgeElectionGap.intermediate)} en intermedias: una brecha de ${decimal(topAgeElectionGap.value)} pp calculada con ΣSV / ΣLN.`, "Nacional · 2009–2024 · Por grupo de edad", ageElectionGaps.flatMap(item => [item.presObs, item.interObs]), "DIFÍCIL"),
      question("p-age-drop-2024", "En 2024, al agrupar los conteos de 20–29 años frente a 18–19 años, ¿de cuántos puntos porcentuales es la caída nacional?", `${decimal(drop2024.value)} pp`, [`${decimal(api.rate(ages[0].counts) - api.rate(ages[1].counts))} pp`, `${decimal(api.rate(ages[0].counts) - api.rate(ages[2].counts))} pp`], `18–19 registra ${pct(ages[0].counts)} y el bloque 20–29 suma ${number(young20s2024.counts.sv)} SV de ${number(young20s2024.counts.ln)} LN (${pct(young20s2024.counts)}): una caída de ${decimal(drop2024.value)} pp sin promediar subgrupos.`, "Nacional · 2024 · 18–19 frente a 20–29 acumulado", [ages[0], young20s2024], "DIFÍCIL"),
      question("p-max-drop-year", "¿En cuál de las seis elecciones (2009–2024) fue más pronunciada la caída en puntos porcentuales de 18–19 al bloque acumulado 20–29?", String(maxDropYear.year), ["2024", "2012"], `En ${maxDropYear.year}, 18–19 registró ${pct(maxDropYear.obs18.counts)} y el bloque 20–29 acumulado ${pct(maxDropYear.obs20s.counts)}, con una caída de ${decimal(maxDropYear.value)} pp.`, "Nacional · Seis elecciones 2009–2024", dropsByYear.flatMap(item => [item.obs18, item.obs20s]), "DIFÍCIL"),
      question("p-lowest-year", "Al comparar las seis elecciones federales de 2009 a 2024, ¿cuál registró la menor participación nacional en los CCPC?", lowestYear.label, ["2015", "2021"], `La intermedia de ${lowestYear.label} tuvo ${pct(lowestYear.counts)}: ${number(lowestYear.counts.sv)} SV de ${number(lowestYear.counts.ln)} LN.`, "Nacional · Seis elecciones 2009–2024", yearly, "DIFÍCIL"),
      question("p-gender-gap-state", "¿Qué entidad registró en 2024 la mayor brecha en puntos porcentuales a favor de las mujeres sobre los hombres?", topStateGenderGap.label, ["Ciudad de México", "Nuevo León"], `En ${topStateGenderGap.label}, las mujeres registraron ${pct(topStateGenderGap.women.counts)} y los hombres ${pct(topStateGenderGap.men.counts)}, una diferencia de ${decimal(topStateGenderGap.gap)} pp.`, "32 entidades · 2024 · Comparación por sexo", stateGenderGaps.flatMap(item => [item.women, item.men]), "DIFÍCIL"),
      question("p-small-base-cdmx", `En Ciudad de México, la categoría No binario de 2024 suma ${number(cdmxNonbinary.counts.sv)} SV de ${number(cdmxNonbinary.counts.ln)} LN (${pct(cdmxNonbinary.counts)}). ¿Qué advertencia metodológica aplica al interpretarla?`, "LN < 100: base pequeña", ["Sin denominador LN disponible", "Sumar NS a NV para estabilizar la tasa"], `Con ${number(cdmxNonbinary.counts.ln)} LN (${number(cdmxNonbinary.counts.sv)} SV, ${number(cdmxNonbinary.counts.nv)} NV y ${number(cdmxNonbinary.counts.ns)} NS), aplica «LN < 100: base pequeña»: pocos casos alteran el porcentaje y deben mostrarse los conteos.`, "Ciudad de México · No binario · Universo ordinario · 2024", [cdmxNonbinary], "DIFÍCIL")
    ];

    const myths = [
      statement("m-age", "MITO", "En 2024, los 18–19 fueron el grupo de edad que más participó.", `El grupo con mayor tasa fue ${highestAge.label}, con ${pct(highestAge.counts)}. Los 18–19 registraron ${pct(ages[0].counts)}.`, "Nacional · 2024 · Todos los perfiles", [highestAge, ages[0]], "peak-age"),
      statement("m-average", "MITO", "La tasa nacional se calcula promediando los porcentajes de los estados.", `Primero se suman los conteos. En 2024: ${number(national.counts.sv)} SV / ${number(national.counts.ln)} LN = ${pct(national.counts)}.`, "Nacional · Universo ordinario · 2024", [national], "aggregation"),
      statement("m-ns", "MITO", "NS y NV significan lo mismo y se pueden juntar como abstención.", `NS es participación no especificada y se mantiene separado. En 2024: NV ${number(national.counts.nv)} y NS ${number(national.counts.ns)}.`, "Nacional · Universo ordinario · 2024", [national], "ns"),
      statement("m-special", "MITO", "Los archivos especiales de 2024 permiten calcular tasas de participación.", `Contienen ${number(anticipated.count)} registros de Voto Anticipado y ${number(prison.count)} de Prisión Preventiva, pero carecen de LN y SV. Se muestran conteos separados, sin tasas.`, "Nacional · Modalidades especiales · 2024", [anticipated, prison], "special-rates"),
      statement("m-intermediate", "MITO", "Las intermedias tuvieron mayor participación conjunta que las presidenciales de 2009–2024.", `Las presidenciales reúnen ${pct(presidential.counts)} y las intermedias ${pct(intermediate.counts)}. Cada tasa usa sus sumas de SV y LN.`, "Nacional · Seis elecciones · Registros persona-elección", [presidential, intermediate], "election-type"),
      statement("m-gender", "MITO", "La brecha de participación entre mujeres y hombres fue igual en todas las zonas en 2024.", sections.map(section => `${section.name}: ${decimal(section.gap)} pp`).join("; ") + ". Cada comparación usa su propio denominador.", "Nacional · 2024 · Todas las edades", sections.flatMap(section => [section.women, section.men]), "gender-zone"),
      statement("m-history", "MITO", "La categoría No binario puede compararse en todas las elecciones desde 2009.", `En estos datos está disponible en 2024: ${number(nonbinary.counts.ln)} LN y ${number(nonbinary.counts.sv)} SV. Su ausencia en años anteriores no representa una tasa de cero.`, "Nacional · Categoría SEXO registrada · 2009–2024", [nonbinary], "nonbinary-history"),
      statement("m-people", "MITO", "Sumar la LN de las seis elecciones revela cuántas personas distintas participaron.", "Son registros persona-elección: alguien puede aparecer en varias elecciones. Además, LN incluye SV, NV y NS; no identifica solo a quienes votaron.", "Nacional · Seis cortes transversales 2009–2024", yearly, "person-election")
    ];

    const recoveryYears = data.years.map(year => ({ year, group: engine.ageDrop({ year }).recovery }));
    const truths = [
      statement("r-young", "VERDAD", "La participación cae después de los 18–19 años en 2024.", `18–19: ${pct(ages[0].counts)}; 20–24: ${pct(ages[1].counts)}; 25–29: ${pct(ages[2].counts)}. Son grupos de edad, sin seguimiento individual.`, "Nacional · 2024 · Todos los sexos y secciones", ageEvidence, "young-drop"),
      statement("r-recovery", "VERDAD", "La recuperación por edad se observa en las seis elecciones.", recoveryYears.map(item => `${item.year}: ${item.group}`).join("; ") + ". Se identifica el primer grupo de 30 o más años que alcanza la tasa de 18–19.", "Nacional · Seis elecciones 2009–2024", data.years.flatMap(year => data.ages.map((label, age) => observe({ year, age }, `${year} · ${label}`))), "recovery-years"),
      statement("r-women", "VERDAD", "Las mujeres registran mayor participación en los tres tipos de sección en 2024.", sections.map(section => `${section.name}: mujeres ${pct(section.women.counts)}, hombres ${pct(section.men.counts)}`).join("; ") + ". Es una diferencia descriptiva.", "Nacional · 2024 · Todas las edades", sections.flatMap(section => [section.women, section.men]), "gender-zone"),
      statement("r-ns", "VERDAD", "La participación no especificada también debe mostrarse.", `En 2024 hay ${number(national.counts.ns)} NS (${decimal(api.rate(national.counts, "ns"))}% de LN). Se conservan separados de NV; no se supone que votaron o se abstuvieron.`, "Nacional · Universo ordinario · 2024", [national], "ns"),
      statement("r-total", "VERDAD", `En los CCPC 2024, el ${pct(national.counts)} de la lista capturada tiene marca de voto.`, `${number(national.counts.sv)} SV de ${number(national.counts.ln)} LN: ${pct(national.counts)}. El universo de estos cuadernillos excluye casillas especiales y voto desde el extranjero.`, "Nacional · Universo ordinario · 2024", [national], "national-2024"),
      statement("r-jalisco", "VERDAD", "Los porcentajes de bases pequeñas necesitan sus conteos.", `Jalisco, No binario 2024: LN ${number(jalisco.counts.ln)}, SV ${number(jalisco.counts.sv)}, participación ${pct(jalisco.counts)}. LN < 100: base pequeña. No representa el tamaño de toda la diversidad de género.`, "Jalisco · No binario · Universo ordinario · 2024", [jalisco], "small-base"),
      statement("r-anticipated", "VERDAD", "Voto Anticipado tiene registros distribuidos por entidad.", `${data.states[anticipatedLeader.state]} reúne el mayor conteo: ${number(anticipatedLeader.count)} registros, dentro de ${number(anticipated.count)} nacionales. Son conteos, no tasas.`, "Voto Anticipado · 2024 · Comparación estatal", [anticipatedLeader, anticipated], "anticipated-state"),
      statement("r-prison", "VERDAD", "Prisión Preventiva tiene su propio universo de registros.", `${data.states[prisonLeader.state]} reúne el mayor conteo: ${number(prisonLeader.count)} registros, dentro de ${number(prison.count)} nacionales. Se mantienen separados de LN y de otras modalidades.`, "Prisión Preventiva · 2024 · Comparación estatal", [prisonLeader, prison], "prison-state")
    ];

    return {
      balero,
      dados: { MITO: myths, VERDAD: truths },
      pirinola: { "FÁCIL": easyQuestions, MEDIO: mediumQuestions, "DIFÍCIL": hardQuestions }
    };
  }

  const api = { createContent, createDeck, createDadosRoller };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CivicGames = api;
})(typeof globalThis === "undefined" ? window : globalThis);
