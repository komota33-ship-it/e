import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, "unique_backgrounds.json"), "utf8"));
const layouts = JSON.parse(readFileSync(path.join(root, "layouts.json"), "utf8"));
const floors = Array.from({ length: 49 }, (_, index) => 50 - index).concat(0);
const insist = (condition, message) => { if (!condition) throw new Error(message); };
const hashes = new Set();
let minimumLength = Infinity;

insist(Object.keys(manifest).length === floors.length, "Every tower floor needs one unique painting");
for (const floor of floors) {
  const meta = manifest[String(floor)];
  const scene = layouts[String(floor)];
  insist(meta && scene?.uniqueBackground, `Floor ${floor} is missing its unique panorama`);
  insist(meta.continuous, `Floor ${floor} still uses spliced scenery`);
  const png = readFileSync(path.join(root, "../assets", meta.image));
  insist(png.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")), `Floor ${floor} is not a PNG`);
  insist(png.readUInt32BE(16) === meta.width && png.readUInt32BE(20) === meta.height, `Floor ${floor} dimensions differ from manifest`);
  const hash = createHash("sha256").update(png).digest("hex");
  insist(!hashes.has(hash), `Floor ${floor} reuses another floor painting`);
  hashes.add(hash);
  insist(scene.width >= 3400, `Floor ${floor} is too short (${scene.width})`);
  minimumLength = Math.min(minimumLength, scene.width);
  const parts = scene.parts;
  insist(scene.continuousBackground && scene.doorOverlay && parts.length === 1 && scene.seams.length === 0,
    `Floor ${floor} must have one unbroken wall and overlaid doors`);
  for (let index = 1; index < parts.length; index++)
    insist(Math.abs(parts[index].x - parts[index - 1].x - parts[index - 1].width) < 0.01,
      `Floor ${floor} has a gap at part ${index}`);
  const unique = parts.filter(part => part.art === `floor_unique_${floor}`);
  insist(unique.length >= (meta.continuous ? 1 : 4), `Floor ${floor} has too little unique scenery`);
  let imageCursor = 0;
  for (const part of unique) {
    insist(part.source[0] === imageCursor, `Floor ${floor} repeats or skips panorama pixels`);
    imageCursor += part.source[2];
  }
  insist(imageCursor === meta.width, `Floor ${floor} panorama was cropped`);
  for (const door of scene.doors) {
    const center = door.rect[0] + door.rect[2] / 2;
    insist(parts.some(part => center >= part.x && center < part.x + part.width && (meta.continuous || !part.art || door.id.startsWith("painted-"))),
      `Floor ${floor} door ${door.id} has no visible doorway`);
    insist(scene.rooms[door.id], `Floor ${floor} door ${door.id} lost its room`);
  }
  const liftCenter = scene.lift.rect[0] + scene.lift.rect[2] / 2;
  insist(parts.some(part => (meta.continuous || !part.art) && liftCenter >= part.x && liftCenter < part.x + part.width),
    `Floor ${floor} lift lost its painted bay`);
}
console.log(`PASS: ${floors.length} distinct panoramas, minimum corridor ${minimumLength}px, continuous scenery and usable doors`);
