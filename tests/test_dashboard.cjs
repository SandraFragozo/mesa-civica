const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DataEngine, rate, smallBase } = require("../web/data-engine.js");
const page = fs.readFileSync(path.join(__dirname, "../output/mapa_interactivo/index.html"), "utf8");
const data = JSON.parse(page.match(/<script id="ccpc-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const engine = new DataEngine(data);
const filters = { state: 0, year: 2024, sex: "all", section: "all", age: "all", mode: "participation" };

test("2024 national totals match the original cubos", () => {
  assert.deepEqual(engine.sum(), { ln: 98330348, sv: 54899228, nv: 37105466, ns: 6325654, rows: 57 });
});

test("national and sum of 32 entities reconcile for every demographic cell", () => {
  for (const row of data.rows.filter(item => item[1] === 0)) {
    const query = { year: row[0], section: row[2], sex: row[3], age: row[4] };
    const actual = [0, 0, 0, 0];
    for (let state = 1; state <= 32; state += 1) {
      const sum = engine.sum({ ...query, state });
      ["ln", "sv", "nv", "ns"].forEach((field, index) => { actual[index] += sum[field]; });
    }
    assert.deepEqual(actual, row.slice(5));
  }
});

test("rates use aggregated counts and preserve zero-denominator gaps", () => {
  const sample = new DataEngine({ ...data, rows: [[2024, 0, 0, 0, 0, 10, 10, 0, 0], [2024, 0, 1, 0, 0, 90, 0, 80, 10]] });
  assert.equal(rate(sample.sum()), 10);
  assert.equal(rate(sample.sum({ state: 32 })), null);
});

test("age drop combines ages 20-24 and 25-29 before division", () => {
  const result = engine.ageDrop(filters);
  const a = engine.sum({ age: 1 }), b = engine.sum({ age: 2 });
  assert.equal(result.young.ln, a.ln + b.ln);
  assert.equal(result.youngRate, (a.sv + b.sv) / (a.ln + b.ln) * 100);
  assert.equal(result.recovery, "40-49");
  assert.equal(result.value, result.firstRate - result.youngRate);
});

test("small comparison groups are flagged even when the combined LN exceeds 100", () => {
  const metric = engine.metric({ ...filters, mode: "age", sex: 2 });
  assert.equal(metric.counts.ln, 105);
  assert.equal(smallBase(metric), true);
});

test("electoral gap pools counts for exactly three elections per type", () => {
  const result = engine.electionGap(filters);
  const annual = year => engine.sum({ year });
  assert.equal(result.presidential.ln, [2012, 2018, 2024].reduce((sum, year) => sum + annual(year).ln, 0));
  assert.equal(result.intermediate.sv, [2009, 2015, 2021].reduce((sum, year) => sum + annual(year).sv, 0));
  assert.equal(result.value, rate(result.presidential) - rate(result.intermediate));
});

test("gender comparison uses women minus men in 2024", () => {
  const result = engine.genderGap({ ...filters, year: 2009, sex: 2, section: 2 });
  assert.equal(result.value, rate(engine.sum({ year: 2024, sex: 1, section: 2 })) - rate(engine.sum({ year: 2024, sex: 0, section: 2 })));
});

test("mode overrides match the controls' declared scope", () => {
  assert.equal(engine.effective({ ...filters, mode: "age", age: 6 }).age, "all");
  assert.deepEqual(engine.effective({ ...filters, mode: "election" }).years, [2009, 2012, 2015, 2018, 2021, 2024]);
  const gender = engine.effective({ ...filters, year: 2009, sex: 2, mode: "gender" });
  assert.equal(gender.year, 2024);
  assert.equal(gender.sex, "all");
});

test("special modalities stay as separate counts without denominators", () => {
  assert.deepEqual(engine.special(0).map(item => item.count), [3449, 26563]);
  const filtered = engine.special(0, 0);
  assert.ok(filtered[0].count <= 3449);
  assert.ok(!("ln" in filtered[0]));
});

test("nonbinary historical absence is not a zero participation rate", () => {
  assert.equal(rate(engine.sum({ year: 2021, sex: 2 })), null);
  const actual = engine.sum({ year: 2024, sex: 2 });
  assert.equal(actual.ln, 105);
  assert.equal(actual.sv, 79);
  assert.equal(engine.electionGap({ ...filters, sex: 2 }).value, null);
});

test("offline deliverable contains all data and no external runtime assets", () => {
  assert.ok(page.includes('id="municipal-data"'));
  assert.ok(page.includes("data:font/ttf;base64,"));
  assert.equal((page.match(/data-edocve="\d+"/g) || []).length, 32);
  assert.ok(!/<script[^>]+src=/.test(page));
  assert.ok(!/<link[^>]+rel="stylesheet"/.test(page));
  assert.ok(!page.includes("@@"));
});
