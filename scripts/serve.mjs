import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(process.argv.includes("--preview") ? "../public/" : "../", import.meta.url));
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4170);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2" };

const server = http.createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!["/", "/index.html"].includes(pathname) && !pathname.startsWith("/assets/")) throw new Error("Ruta no pública");
    const segments = pathname.split("/");
    if (segments.some(part => part === ".." || part.startsWith(".")) || pathname.includes("\\") || pathname.includes("\0")) throw new Error("Ruta no pública");
    let location = path.resolve(root, `.${pathname}`);
    if (!location.startsWith(root) && location !== root.slice(0, -1)) throw new Error("Ruta no pública");
    if ((await stat(location)).isDirectory()) location = path.join(location, "index.html");
    const info = await stat(location);
    if (!info.isFile()) throw new Error("Archivo no encontrado");
    response.writeHead(200, { "Content-Type": types[path.extname(location).toLowerCase()] || "application/octet-stream", "Content-Length": info.size, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    if (request.method === "HEAD") { response.end(); return; }
    const stream = createReadStream(location);
    stream.on("error", () => response.destroy());
    response.on("close", () => stream.destroy());
    stream.pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("No encontrado");
  }
});

server.listen(port, host, () => console.log(`Mesa cívica: http://${host}:${server.address().port}/`));
