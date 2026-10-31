const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { cards, createGame } = require("../web/loteria.js");

test("18 cartas tienen imágenes locales y números únicos", () => {
  assert.equal(cards.length, 18);
  assert.equal(new Set(cards.map(card => card.id)).size, 18);
  for (const card of cards) {
    assert.match(card.image, new RegExp(`^${card.id}-`));
    assert.ok(fs.existsSync(path.join(__dirname, "../assets/imgs/loteria", card.image)));
    assert.ok(card.description.length > 40);
  }
});

for (const size of [3, 4]) test(`tablero ${size}×${size}: sin repetidas, marcas válidas y victoria`, () => {
  const game = createGame({ size, opponent: true, random: () => 0.38 });
  assert.equal(game.player.length, size * size);
  assert.equal(game.machine.length, size * size);
  assert.equal(new Set(game.player.map(card => card.id)).size, size * size);
  assert.equal(new Set(game.machine.map(card => card.id)).size, size * size);
  assert.equal(game.mark(game.player[0].id), false);
  const order = [];
  let next;
  while ((next = game.draw())) order.push(next.id);
  assert.equal(order.length, 18);
  assert.equal(new Set(order).size, 18);
  for (const card of game.player) assert.equal(game.mark(card.id), true);
  assert.equal(game.winner, "player");
  assert.equal(game.mark(game.machine[0].id, "machine"), false);
});

test("la máquina gana si completa primero su tablero", () => {
  const game = createGame({ opponent: true });
  while (game.draw()) {}
  for (const card of game.machine) assert.equal(game.mark(card.id, "machine"), true);
  assert.equal(game.winner, "machine");
  assert.equal(game.mark(game.player[0].id), false);
});
