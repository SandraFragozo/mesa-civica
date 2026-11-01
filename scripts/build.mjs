import { copyFile, lstat, mkdir, readFile, realpath, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.resolve(root, "public");
const html = await readFile(path.join(root, "index.html"), "utf8");
if (!html.startsWith("<!doctype html>") || /@@[A-Z_]+@@/.test(html)) throw new Error("El HTML está incompleto. Regenera index.html con analysis/04_construir_mapa.py.");
const files = new Map([["index.html", path.join(root, "index.html")], ["assets/modelos-3d/pirinola/pirinola-3d.js", path.join(root, "assets/modelos-3d/pirinola/pirinola-3d.js")], ["assets/modelos-3d/balero/balero-3d.js", path.join(root, "assets/modelos-3d/balero/balero-3d.js")], ["assets/modelos-3d/dados/dados-3d.js", path.join(root, "assets/modelos-3d/dados/dados-3d.js")], ["assets/imgs/notebook/cover-cutout.png", path.join(root, "assets/imgs/notebook/cover-cutout.png")]]);
files.set("assets/imgs/notebook/atlas-democratico.jpg", path.join(root, "assets/imgs/notebook/atlas-democratico.jpg"));
for (const card of html.matchAll(/["'](\d{2}-[\w-]+\.jpg)["']/g)) {
  files.set(`assets/imgs/loteria/${card[1]}`, path.join(root, "assets/imgs/loteria", card[1]));
  const preview = card[1].replace(/\.jpg$/, ".png");
  files.set(`assets/imgs/loteria/preview/${preview}`, path.join(root, "assets/imgs/loteria/preview", preview));
}
files.set("assets/imgs/loteria/frijol.png", path.join(root, "assets/imgs/loteria/frijol.png"));
files.set("assets/imgs/loteria/reverso.jpg", path.join(root, "assets/imgs/loteria/reverso.jpg"));

for (const match of html.matchAll(/<(?:img|script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)) {
  const source = match[1];
  if (source.startsWith("data:")) continue;
  if (/^(?:[a-z]+:|\/\/)/i.test(source)) throw new Error(`Recurso externo en el sitio offline: ${source}`);
  const relative = decodeURIComponent(source.split(/[?#]/)[0]);
  const resource = path.resolve(root, relative);
  if (!relative.startsWith("assets/") || !resource.startsWith(root) || !(await stat(resource)).isFile() || !(await realpath(resource)).startsWith(root)) throw new Error(`Recurso local inválido: ${source}`);
  if (!/\.(?:css|js|json|png|jpe?g|svg|webp|avif|ico|ttf|woff2?)$/i.test(relative)) throw new Error(`Archivo ajeno al sitio web: ${source}`);
  files.set(path.relative(root, resource), resource);
}

if (path.dirname(destination) !== path.resolve(root) || path.basename(destination) !== "public") throw new Error("Directorio de publicación inválido");
try {
  if ((await lstat(destination)).isSymbolicLink() || !(await realpath(destination)).startsWith(root)) throw new Error("El directorio public debe pertenecer al proyecto");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await rm(destination, { recursive: true, force: true });
for (const [relative, source] of files) {
  const target = path.join(destination, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}
console.log(`Sitio HTML listo: public/ (${files.size} archivos). No requiere Python en el despliegue.`);
