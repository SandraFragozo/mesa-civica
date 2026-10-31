const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const api = require("../web/data-engine.js");
const { createContent, createDeck, createDadosRoller } = require("../web/game-content.js");
const Dados3D = require("../assets/modelos-3d/dados/dados-3d.js");
const Pirinola3D = require("../assets/modelos-3d/pirinola/pirinola-3d.js");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const data = JSON.parse(html.match(/<script id="ccpc-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const content = createContent(data, api);
const pirinolaQuestions = Object.values(content.pirinola).flat();
const dadosStories = Object.values(content.dados).flat();
const allItems = [...content.balero, ...pirinolaQuestions, ...dadosStories];

test("balero keeps its eight original questions and pirinola has eight unique questions per difficulty", () => {
  assert.deepEqual(
    content.balero.map(item => item.id),
    ["b-year", "b-young", "b-recovery", "b-rural", "b-election", "b-modalities", "b-ln", "b-ns"]
  );
  assert.deepEqual(Object.keys(content.pirinola), ["FÁCIL", "MEDIO", "DIFÍCIL"]);
  for (const [difficulty, bank] of Object.entries(content.pirinola)) {
    assert.equal(bank.length, 8);
    for (const item of bank) {
      assert.equal(item.type, "PREGUNTA");
      assert.equal(item.difficulty, difficulty);
    }
  }
  for (const reusedId of ["p-anticipated", "p-nonbinary", "p-2018", "p-top-state", "p-bottom-state", "p-peak-age", "p-territory", "p-election-gap"]) {
    assert.ok(pirinolaQuestions.some(item => item.id === reusedId), reusedId);
  }
  const allQuestions = [...content.balero, ...pirinolaQuestions];
  assert.equal(allQuestions.length, 32);
  assert.equal(new Set(allQuestions.map(item => item.id)).size, 32);
  assert.equal(new Set(allQuestions.map(item => item.prompt)).size, 32);
  assert.equal(content.dados.MITO.length, 8);
  assert.equal(content.dados.VERDAD.length, 8);
  assert.equal(new Set(allItems.map(item => item.id)).size, 48);

  for (const item of allItems) {
    assert.ok(item.scope && item.source && item.explanation && item.evidence.length, item.id);
    assert.match(item.source, /^Fuente: INE \/ DECEyEC · CCPC/);
    assert.doesNotMatch(item.prompt || item.title, /2 \+ 2|aparecerá/);
    if (item.options) {
      assert.equal(item.options.length, 3, item.id);
      assert.equal(new Set(item.options.map(option => option.text)).size, 3, item.id);
      assert.ok(item.options.some(option => option.id === item.correct), item.id);
    }
  }
});

test("all factual evidence reconciles with raw embedded groups without averaging rates", () => {
  for (const item of allItems) {
    for (const evidence of item.evidence) {
      if (evidence.kind === "special") {
        const total = data.special
          .filter(row => (!evidence.state || row[0] === evidence.state) && row[2] === evidence.modality)
          .reduce((sum, row) => sum + row[3], 0);
        assert.equal(evidence.count, total, item.id);
        assert.equal(evidence.counts, undefined);
        continue;
      }
      const query = evidence.criteria;
      const years = query.years || [query.year || 2024];
      const ages = Array.isArray(query.age) ? query.age : query.age === undefined ? null : [query.age];
      const rows = data.rows.filter(
        row =>
          row[1] === (query.state || 0) &&
          years.includes(row[0]) &&
          (query.sex === undefined || row[3] === query.sex) &&
          (query.section === undefined || row[2] === query.section) &&
          (!ages || ages.includes(row[4]))
      );
      const total = { ln: 0, sv: 0, nv: 0, ns: 0, rows: rows.length };
      rows.forEach(row => ["ln", "sv", "nv", "ns"].forEach((field, index) => { total[field] += row[5 + index]; }));
      assert.deepEqual(evidence.counts, total, item.id);
      assert.equal(total.ln, total.sv + total.nv + total.ns);
    }
  }
  const answer = id => [...content.balero, ...pirinolaQuestions].find(item => item.id === id).options.find(option => option.id === "0").text;
  assert.equal(answer("b-year"), "2012");
  assert.equal(answer("b-young"), "25-29");
  assert.equal(answer("b-recovery"), "40-49");
  assert.equal(answer("p-peak-age"), "60-69");
  assert.equal(answer("p-anticipated"), "3,449");
  assert.equal(answer("p-nonbinary"), "105");
  assert.equal(answer("p-small-base-cdmx"), "LN < 100: base pequeña");
  assert.match(dadosStories.find(item => item.id === "r-jalisco").explanation, /LN 25, SV 20.*80\.00%.*LN < 100: base pequeña/);
  assert.match(pirinolaQuestions.find(item => item.id === "p-small-base-cdmx").explanation, /LN < 100: base pequeña/);
});

test("dados 3D model has three MITO and three VERDAD faces and visible top/front faces match all four combinations", () => {
  assert.equal(Dados3D.FACES.length, 6);
  assert.equal(Dados3D.FACES.filter(face => face.word === "MITO").length, 3);
  assert.equal(Dados3D.FACES.filter(face => face.word === "VERDAD").length, 3);
  assert.equal(Dados3D.CUBE_FACES.filter(face => face.word === "MITO").length, 3);
  assert.equal(Dados3D.CUBE_FACES.filter(face => face.word === "VERDAD").length, 3);

  for (let faceA = 1; faceA <= 6; faceA += 1) {
    for (let faceB = 1; faceB <= 6; faceB += 1) {
      for (const poseName of ["dynamic", "table"]) {
        const pose = Dados3D.getPairPose(poseName, faceA, faceB);
        const visA = Dados3D.getVisibleFace(pose.dieA.rot);
        const visB = Dados3D.getVisibleFace(pose.dieB.rot);
        const expectedWordA = Dados3D.FACES[faceA - 1].word;
        const expectedWordB = Dados3D.FACES[faceB - 1].word;
        assert.equal(visA.top.faceNum, faceA);
        assert.equal(visA.front.faceNum, faceA);
        assert.equal(visA.top.word, expectedWordA);
        assert.equal(visB.top.faceNum, faceB);
        assert.equal(visB.front.faceNum, faceB);
        assert.equal(visB.top.word, expectedWordB);
      }
    }
  }

  const roller = createDadosRoller(content.dados);
  for (const [wordA, wordB] of [["MITO", "MITO"], ["MITO", "VERDAD"], ["VERDAD", "MITO"], ["VERDAD", "VERDAD"]]) {
    for (let turn = 0; turn < 25; turn += 1) {
      const [first, second] = roller.draw(wordA, wordB);
      assert.equal(first.type, wordA);
      assert.equal(second.type, wordB);
      assert.notEqual(first.id, second.id);
      assert.notEqual(first.topic, second.topic);
      assert.ok(first.title && first.explanation && first.scope && first.source);
      assert.ok(second.title && second.explanation && second.scope && second.source);
    }
  }
});

test("pirinola 3D model has two FÁCIL, two MEDIO and two DIFÍCIL faces and decks cycle cleanly", () => {
  assert.equal(Pirinola3D.FACES.length, 6);
  assert.equal(Pirinola3D.FACES.filter(face => face.word === "FÁCIL").length, 2);
  assert.equal(Pirinola3D.FACES.filter(face => face.word === "MEDIO").length, 2);
  assert.equal(Pirinola3D.FACES.filter(face => face.word === "DIFÍCIL").length, 2);

  for (const bank of [content.balero, ...Object.values(content.dados), ...Object.values(content.pirinola)]) {
    const original = JSON.stringify(bank);
    const deck = createDeck(bank, () => 0);
    const first = bank.map(() => deck.next().id);
    const second = bank.map(() => deck.next().id);
    assert.equal(new Set(first).size, bank.length);
    assert.equal(new Set(second).size, bank.length);
    assert.notEqual(first.at(-1), second[0]);
    assert.equal(JSON.stringify(bank), original);
  }
});

test("runtime bundle and 3D modules operate offline without external network calls", () => {
  assert.match(html, /Content-Security-Policy[^>]*connect-src 'none'/);
  assert.doesNotMatch(html, /Salieron .* Total:/);
  for (const relPath of [
    "../web/game-content.js",
    "../web/scene.js",
    "../web/data-engine.js",
    "../assets/modelos-3d/dados/dados-3d.js",
    "../assets/modelos-3d/pirinola/pirinola-3d.js",
    "../assets/modelos-3d/balero/balero-3d.js"
  ]) {
    const sourceText = fs.readFileSync(path.join(__dirname, relPath), "utf8");
    assert.doesNotMatch(sourceText, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|https?:\/\//, relPath);
  }
});
