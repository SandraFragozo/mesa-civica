(function (root) {
  "use strict";
  const cards = [
    ["01", "La credencial", "01-la-credencial.jpg", "La credencial permite identificarse para votar. Mantenerla vigente ayuda a ejercer ese derecho."],
    ["02", "La urna", "02-la-urna.jpg", "La urna recibe las boletas en la casilla. Los conteos de este sitio observan marcas de voto en la lista nominal."],
    ["03", "El casillero", "03-el-casillero.jpg", "Cada casilla organiza la recepción del voto. Los datos aquí se resumen por entidad, edad, sexo y tipo de sección."],
    ["04", "La lista", "04-la-lista.jpg", "La lista nominal capturada es la base para calcular la participación: se cuentan los registros con marca de voto y se dividen entre el total de la lista."],
    ["06", "El calendario", "06-el-calendario.jpg", "Compara seis elecciones federales: 2009, 2012, 2015, 2018, 2021 y 2024. Cada año es una fotografía distinta."],
    ["08", "El voto", "08-el-voto.jpg", "Una marca de voto registrada cuenta como participación en estos conteos. No revela por quién votó la persona."],
    ["11", "El nulo", "11-el-nulo.jpg", "Estos datos estudian si hay marca de voto. No sirven para sumar votos por partido ni para interpretar el sentido de una boleta anulada."],
    ["17", "La bandera", "17-la-bandera.jpg", "México se presenta como total nacional y por sus 32 entidades federativas. Cada estado aporta registros al total."],
    ["18", "El primer voto", "18-el-primer-voto.jpg", "El grupo de 18 a 19 años permite observar a votantes jóvenes. La edad no demuestra que cada persona votó por primera vez."],
    ["20", "La cuesta joven", "20-la-cuesta-joven.jpg", "La participación suele bajar en los grupos de 20 a 24 y 25 a 29 años frente al grupo de 18 a 19. Se comparan grupos, no las mismas personas."],
    ["22", "La intermedia", "22-la-intermedia.jpg", "Las elecciones de 2009, 2015 y 2021 fueron intermedias. Se pueden comparar con las presidenciales de 2012, 2018 y 2024."],
    ["24", "La inclusión", "24-la-inclusion.jpg", "En 2024 aparecen registros de la categoría no binario. También hay archivos separados de voto anticipado y prisión preventiva."],
    ["32", "Los 32", "32-los-32.jpg", "El mapa reúne las 32 entidades. Para comparar su participación se suman primero los registros y luego se calcula el porcentaje."],
    ["33", "Las tres zonas", "33-las-tres-zonas.jpg", "Urbana, mixta y rural describen tipos de sección electoral. Puedes comparar sus datos en el mapa."],
    ["40", "El repunte", "40-el-repunte.jpg", "Tras la caída de los veinte, algunos grupos de mayor edad vuelven a alcanzar la participación observada a los 18 y 19 años."],
    ["50", "La lupa", "50-la-lupa.jpg", "Un porcentaje se entiende mejor junto con sus conteos. Una base pequeña exige especial cuidado al comparar."],
    ["58", "La prisión preventiva", "58-la-prision-preventiva.jpg", "El archivo de prisión preventiva de 2024 se muestra como conteo aparte. No se mezcla con la lista nominal ordinaria."],
    ["61", "La votante", "61-la-votante.jpg", "En 2024 se puede comparar la participación registrada de mujeres y hombres por tipo de sección. La diferencia es descriptiva."]
  ].map(([id, title, image, description]) => ({ id, title, image, description }));

  function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [copy[index], copy[other]] = [copy[other], copy[index]];
    }
    return copy;
  }

  function createGame({ size = 3, opponent = false, random = Math.random } = {}) {
    if (![3, 4].includes(size)) throw new RangeError("El tablero debe ser de 3 o 4 casillas por lado");
    const count = size * size;
    const player = shuffle(cards, random).slice(0, count);
    const machine = opponent ? shuffle(cards, random).slice(0, count) : [];
    const deck = shuffle(cards, random);
    const called = new Set();
    const playerMarks = new Set();
    const machineMarks = new Set();
    let current = null;
    let winner = null;
    return {
      size, opponent, player, machine, deck, called, playerMarks, machineMarks,
      get current() { return current; },
      get winner() { return winner; },
      get remaining() { return deck.length; },
      draw() {
        if (winner || !deck.length) return null;
        current = deck.shift();
        called.add(current.id);
        return current;
      },
      mark(id, side = "player") {
        if (winner || !called.has(id)) return false;
        const board = side === "machine" ? machine : player;
        const marks = side === "machine" ? machineMarks : playerMarks;
        if (!board.some(card => card.id === id) || marks.has(id)) return false;
        marks.add(id);
        if (marks.size === count) winner = side;
        return true;
      }
    };
  }

  root.CivicLoteria = { cards, shuffle, createGame };
  if (typeof module !== "undefined" && module.exports) module.exports = root.CivicLoteria;
})(typeof globalThis === "undefined" ? window : globalThis);
