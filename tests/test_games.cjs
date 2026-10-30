const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const api = require("../web/data-engine.js");
const { createContent, createDeck } = require("../web/game-content.js");
const html = fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const data = JSON.parse(html.match(/<script id="ccpc-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const content = createContent(data,api);
const items = [...content.balero,...Object.values(content.pirinola).flat()];

test("four banks contain eight sourced items with distinct questions", () => {
  assert.equal(content.balero.length,8);
  for (const bank of Object.values(content.pirinola)) assert.equal(bank.length,8);
  assert.equal(new Set(items.map(item=>item.id)).size,32);
  const questions = items.filter(item=>item.type==="PREGUNTA");
  assert.equal(new Set(questions.map(item=>item.prompt)).size,16);
  for (const item of items) {
    assert.ok(item.scope && item.source && item.explanation && item.evidence.length);
    assert.doesNotMatch(item.prompt || item.title,/2 \+ 2|aparecerá/);
    if (item.options) {
      assert.equal(item.options.length,3);
      assert.equal(new Set(item.options.map(option=>option.text)).size,3);
      assert.ok(item.options.some(option=>option.id===item.correct));
    }
  }
});

test("all factual evidence reconciles with raw embedded groups without averaging rates", () => {
  for (const item of items) for (const evidence of item.evidence) {
    if (evidence.kind === "special") {
      const total=data.special.filter(row=>(!evidence.state || row[0]===evidence.state) && row[2]===evidence.modality).reduce((sum,row)=>sum+row[3],0);
      assert.equal(evidence.count,total,item.id);
      assert.equal(evidence.counts,undefined);
      continue;
    }
    const query=evidence.criteria;
    const years=query.years || [query.year || 2024];
    const rows=data.rows.filter(row=>row[1]===(query.state || 0) && years.includes(row[0]) && (query.sex===undefined || row[3]===query.sex) && (query.section===undefined || row[2]===query.section) && (query.age===undefined || row[4]===query.age));
    const total={ln:0,sv:0,nv:0,ns:0,rows:rows.length};
    rows.forEach(row=>["ln","sv","nv","ns"].forEach((field,index)=>total[field]+=row[5+index]));
    assert.deepEqual(evidence.counts,total,item.id);
    assert.equal(total.ln,total.sv+total.nv+total.ns);
  }
  const answer=id=>items.find(item=>item.id===id).options.find(option=>option.id==="0").text;
  assert.equal(answer("b-year"),"2012");
  assert.equal(answer("b-young"),"25-29");
  assert.equal(answer("b-recovery"),"40-49");
  assert.equal(answer("p-peak-age"),"60-69");
  assert.equal(answer("p-anticipated"),"3,449");
  assert.equal(answer("p-nonbinary"),"105");
  assert.match(items.find(item=>item.id==="r-jalisco").explanation,/LN 25, SV 20.*80.00%.*LN < 100/);
});

test("each deck exhausts its bank before repeating and avoids consecutive repeats across cycles", () => {
  for (const bank of [content.balero,...Object.values(content.pirinola)]) {
    const original=JSON.stringify(bank);
    const deck=createDeck(bank,()=>0);
    const first=bank.map(()=>deck.next().id);
    const second=bank.map(()=>deck.next().id);
    assert.equal(new Set(first).size,bank.length);
    assert.equal(new Set(second).size,bank.length);
    assert.notEqual(first.at(-1),second[0]);
    assert.equal(JSON.stringify(bank),original);
  }
});
