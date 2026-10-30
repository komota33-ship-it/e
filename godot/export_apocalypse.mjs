import { readFileSync, writeFileSync } from "node:fs";
import { containerLoot } from "../inventory.js";
import { containerProfile } from "../hazards.js";

const root = new URL("./", import.meta.url);
const layouts = JSON.parse(readFileSync(new URL("layouts.json", root), "utf8"));
const foreground = JSON.parse(readFileSync(new URL("foreground_layouts.json", root), "utf8"));
const cells = JSON.parse(readFileSync(new URL("apocalypse_cells.json", root), "utf8"));
const plans = {};

function hash(value) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619) >>> 0;
  return result;
}

function sector(zone, floor) {
  if (zone === "technical") return floor >= 41 ? "office" : floor >= 31 ? "laboratory" : floor >= 21 ? "apartment" : floor >= 11 ? "mall" : floor >= 2 ? "parking" : "bunker";
  return zone === "infirmary" ? "laboratory" : zone;
}

function scaleOf(scene) { return scene.width / scene.crop[2]; }

function blockedIntervals(scene, scale) {
  const result = [];
  for (const item of [...(scene.doors || []), ...[scene.lift, scene.exit].filter(Boolean)]) {
    const [x, , width] = item.rect;
    const clearance = item === scene.lift || item === scene.exit || (scene.doors || []).includes(item) ? 44 : 24;
    result.push([x * scale - clearance, (x + width) * scale + clearance]);
  }
  for (const prop of scene.id.includes("-room-") ? [] : foreground[scene.id] || []) {
    // Existing small debris can sit at another floor depth; only avoid direct
    // center collisions, rather than emptying the entire walkable corridor.
    const radius = 9;
    result.push([prop.x - radius, prop.x + radius]);
  }
  return result;
}

function plan(scene, floor) {
  const zone = sector(scene.zone, floor);
  const isRoom = scene.id.includes("-room-");
  const scale = scaleOf(scene);
  const blocked = blockedIntervals(scene, scale);
  const result = [];
  const seed = hash(scene.id);
  const target = isRoom ? 1 : scene.zone === "roof" ? 3 : 7 + (floor % 3);
  const first = isRoom ? 42 : 68;
  const last = scene.width - first;
  const spacing = isRoom ? 48 : 74;
  const candidates = [];
  for (let x = first + seed % 42; x < last; x += spacing)
    candidates.push(x + ((hash(`${scene.id}:${Math.round(x)}`) % 39) - 19));
  candidates.sort((a, b) => (hash(`${scene.id}:${Math.round(a)}:order`) % 10000) - (hash(`${scene.id}:${Math.round(b)}:order`) % 10000));
  const used = new Set();
  for (const candidate of candidates) {
    if (result.length >= target) break;
    const choices = Array.from({ length: 8 }, (_, i) => (i + seed + result.length * 3) % 8);
    for (const choice of choices) {
      if (used.has(choice)) continue;
      const sheet = choice < 4 ? "a" : "b";
      const index = choice % 4;
      // New continuous plates are architectural walls only, so a desk from
      // the measured prop atlas can sit in front at courier waist height.
      if (zone === "office" && !scene.continuousBackground && sheet === "a" && index === 0) continue;
      const landmark = scene.landmark;
      if (zone === "office" && landmark && !isRoom) {
        const left = landmark.x * scale;
        const right = (landmark.x + landmark.width) * scale;
        const bulkyFurniture = sheet === "b" && index !== 2;
        if (candidate >= left && candidate <= right && bulkyFurniture) continue;
      }
      const source = cells[`${zone}_${sheet}`][index];
      // The courier is about 135 px high. Upright props and rubble must stay
      // lower than his shoulder; a normal desk is around his waist.
      const maxHeight = sheet === "a" ? 79 : 91;
      const preferredWidth = sheet === "a" ? 91 : 137;
      const width = Math.min(preferredWidth, maxHeight * source[2] / source[3]);
      const half = width * 0.5 + 9;
      if (candidate - half < 20 || candidate + half > scene.width - 20) continue;
      if (blocked.some(([left, right]) => candidate + half >= left && candidate - half <= right)) continue;
      if (result.some(prop => Math.abs(prop.x - candidate) < (prop.width + width) * 0.5 + 24)) continue;
      const depth = isRoom ? 18 + (seed % 8) : 10 + (hash(`${candidate}:depth`) % 24);
      result.push({ zone, sheet, index, x: Math.round(candidate), width: Math.round(width), depth, layer: "front" });
      used.add(choice);
      break;
    }
  }
  result.sort((a, b) => a.x - b.x);
  return result;
}

let count = 0;
let interactive = 0;
for (const [floorText, layout] of Object.entries(layouts)) {
  const floor = Number(floorText);
  for (const scene of [layout, ...Object.values(layout.rooms || {})]) {
    const props = plan(scene, floor);
    plans[scene.id] = props;
    count += props.length;
    if (scene !== layout || props.length === 0) continue;
    const cache = props.find(prop => prop.sheet === "b") || props[props.length - 1];
    const id = `salvage-${floor}`;
    if (scene.containers.some(item => item.id === id)) continue;
    const rectX = cache.x / scaleOf(scene) - 19;
    const container = {
      id, rect: [rectX, scene.ground - 70, 38, 60],
      label: "ЗАВАЛ С ПРИПАСАМИ", kind: floor >= 41 ? "ammo" : floor >= 31 ? "medical" : "workshop", type: "crate",
    };
    container.loot = containerLoot(floor, scene.id, id, container.kind);
    container.bonusTypes = [];
    container.rareByBonus = {};
    container.search = containerProfile(container);
    scene.containers.push(container);
    interactive++;
  }
}
writeFileSync(new URL("layouts.json", root), JSON.stringify(layouts));
writeFileSync(new URL("apocalypse_layouts.json", root), JSON.stringify(plans));
console.log(`Placed ${count} generated props in ${Object.keys(plans).length} scenes, including ${interactive} searchable floor caches`);
