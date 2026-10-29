const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawn } = require("node:child_process");
const { once } = require("node:events");
const { createHash } = require("node:crypto");

const root = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));

test("web project builds static HTML without executing Python", () => {
  const output = execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root, encoding: "utf8" });
  assert.match(output, /8 archivos/);
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, "public");
  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.installCommand, "");
  assert.equal(fs.readdirSync(root).some(name => name.endsWith(".py") || name === "requirements.txt"), false);
  const commands = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts;
  assert.doesNotMatch(commands.build, /python|pip/i);
  assert.doesNotMatch(commands.dev, /python|pip/i);
  for (const name of ["01_auditoria_rapida.py", "02_generar_cubos.py", "03_hallazgos_storytelling.py", "04_construir_mapa.py", "requirements.txt"]) assert.ok(fs.existsSync(path.join(root, "analysis", name)));
  const ignored = fs.readFileSync(path.join(root, ".vercelignore"), "utf8").split(/\r?\n/);
  for (const folder of ["analysis/", "output/", ".venv/", "tests/"]) assert.ok(ignored.includes(folder));
  assert.ok(ignored.includes("public/"));
  assert.ok(!ignored.includes("assets/"));
  assert.ok(fs.existsSync(path.join(root, "index.html")));
});

test("deployment builds from HTML and images with no analysis scripts or CSVs present", () => {
  const parent = path.join(root, ".local");
  fs.mkdirSync(parent, { recursive: true });
  const isolated = fs.mkdtempSync(path.join(parent, "web-only-"));
  assert.equal(path.dirname(isolated), parent);
  try {
    for (const name of ["index.html", "package.json", "vercel.json", "scripts", "assets/imgs", "assets/pirinola/pirinola-3d.js"]) fs.cpSync(path.join(root, name), path.join(isolated, name), { recursive: true });
    const output = execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: isolated, encoding: "utf8" });
    assert.match(output,/8 archivos/);
    assert.equal(fs.existsSync(path.join(isolated,"analysis")),false);
    assert.equal(fs.existsSync(path.join(isolated,"output")),false);
    const published = fs.readFileSync(path.join(isolated,"public/index.html"),"utf8");
    assert.equal(published,fs.readFileSync(path.join(root,"index.html"),"utf8"));
    const data = JSON.parse(published.match(/<script id="ccpc-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(Object.keys(data.states).length,32);
    assert.equal(data.rows.length,9560);
  } finally {
    fs.rmSync(isolated, { recursive: true, force: true });
  }
});

test("static server exposes the complete web and keeps analysis files private", async t => {
  const child = spawn(process.execPath, ["scripts/serve.mjs", "--preview"], { cwd: root, env: { ...process.env, PORT: "0", HOST: "127.0.0.1" }, stdio: ["ignore", "pipe", "pipe"] });
  t.after(async () => {
    if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
  });
  const address = await new Promise((resolve, reject) => {
    let text = "";
    const timeout = setTimeout(() => reject(new Error("El servidor estático no inició")), 5000);
    child.on("error", error => { clearTimeout(timeout); reject(error); });
    child.stdout.on("data", data => {
      text += data;
      const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); }
    });
  });
  const response = await fetch(address);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const html = await response.text();
  assert.match(html, /id="ccpc-data"/);
  assert.match(html, /id="municipal-data"/);
  const digest = bytes => createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest(html), digest(fs.readFileSync(path.join(root, "public/index.html"))));
  const images = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
  assert.equal(images.length,6);
  for (const name of images) {
    const image = await fetch(`${address}/${name}`);
    assert.equal(image.status, 200);
    assert.equal(digest(Buffer.from(await image.arrayBuffer())), digest(fs.readFileSync(path.join(root, name))));
  }
  for (const location of ["/analysis/requirements.txt", "/analysis/04_construir_mapa.py", "/output/cubo_estatal_demografico.csv", "/.git/config", "/missing", "/%2e%2e%5cpackage.json"]) assert.equal((await fetch(address + location)).status,404);
  assert.equal((await fetch(address, { method: "HEAD" })).status,200);
  assert.equal((await fetch(address, { method: "POST" })).status,405);
});
