import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";

// A fixed archive route; client-supplied paths never reach the filesystem.
export async function serveGameDownload(req, res) {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }
  const path = new URL("./dist/lift-v-ad-v0.11.zip", import.meta.url);
  let size;
  try {
    size = (await stat(path)).size;
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Архив игры пока недоступен.");
    return;
  }
  let start = 0,
    end = size - 1;
  const range = req.method === "GET" ? req.headers.range : null;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      if (!match[1]) start = Math.max(0, size - Number(match[2]));
      else {
        start = Number(match[1]);
        end = match[2] ? Math.min(end, Number(match[2])) : end;
      }
    } else start = size;
    if (!Number.isSafeInteger(start) || start >= size || end < start) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` });
      res.end();
      return;
    }
  }
  res.writeHead(range ? 206 : 200, {
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="lift-v-ad-v0.11.zip"',
    "Content-Length": end - start + 1,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = createReadStream(path, { start, end });
  stream.on("error", () => res.destroy());
  res.on("close", () => stream.destroy());
  stream.pipe(res);
}
