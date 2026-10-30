import { readFileSync, writeFileSync } from "node:fs";
import { createRoomLayout } from "../level-layouts.js";
import { containerLoot } from "../inventory.js";
import { containerProfile, createContainerTrap, createContainerAmbush } from "../hazards.js";

const root = new URL("./", import.meta.url);
const layouts = JSON.parse(readFileSync(new URL("layouts.json", root), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("unique_backgrounds.json", root), "utf8"));

for (const [floorText, meta] of Object.entries(manifest)) {
  const floor = Number(floorText);
  const scene = layouts[floorText];
  if (!scene || !scene.parts || !meta.width || !meta.frontEdge)
    throw new Error(`Invalid unique background entry for floor ${floorText}`);
  const scale = scene.width / scene.crop[2];
  // The generator tends to make desks and counters too tall for the 140 px
  // courier. Keep their horizontal width and the walking floor position, but
  // compress the vertical scenery to the character/door scale.
  const verticalScale = meta.verticalScale ?? 0.88;
  if (verticalScale <= 0 || verticalScale > 1) throw new Error(`Invalid vertical scale on floor ${floor}`);
  if (meta.continuous) {
    // The old exporter inserted unrelated door paintings between slices of
    // each panorama. An architectural plate contains no oversized furniture,
    // so it can cover the entire long corridor without a visible join.
    const corridorWidth = Math.max(3400, Math.round(scene.width * 0.85));
    const cropWidth = corridorWidth / scale;
    const xScale = cropWidth / scene.crop[2];
    const remapRect = rect => {
      const middle = (rect[0] + rect[2] * 0.5) * xScale;
      return [middle - rect[2] * 0.5, ...rect.slice(1)];
    };
    for (const key of ["doors", "containers", "lights"])
      scene[key] = scene[key].map(item => ({ ...item, rect: remapRect(item.rect) }));
    for (const key of ["windows", "hazards"])
      scene[key] = scene[key].map(remapRect);
    // The panoramic plate already paints its windows. Reusing the old
    // procedural window rectangles creates extra panes over solid masonry.
    scene.windows = [];
    scene.drips = (scene.drips || []).map(([x, y, kind]) => [x * xScale, y, kind]);
    scene.lift = { ...scene.lift, rect: remapRect(scene.lift.rect) };
    const defaultAnchors = {
      3: [450, 1050, 1600],
      4: [330, 800, 1250, 1700],
      5: [300, 680, 1050, 1450, 1800],
    };
    const doorPositions = meta.doorPositions || defaultAnchors[scene.doors.length];
    if (doorPositions) {
      if (doorPositions.length !== scene.doors.length)
        throw new Error(`Floor ${floor} has ${scene.doors.length} doors but ${doorPositions.length} anchors`);
      scene.doors = scene.doors.map((door, index) => ({
        ...door,
        rect: [doorPositions[index] * cropWidth / meta.width - door.rect[2] * 0.5, ...door.rect.slice(1)],
      }));
    }
    scene.lift.rect[0] = (meta.liftPosition || 2080) * cropWidth / meta.width - scene.lift.rect[2] * 0.5;
    scene.parts = [{
      art: `floor_unique_${floor}`, source: [0, 0, meta.width, meta.height],
      x: 0, width: cropWidth, height: meta.height * verticalScale / scale,
      uniqueGround: meta.frontEdge * verticalScale,
    }];
    scene.seams = [];
    scene.crop[2] = cropWidth;
    scene.width = corridorWidth;
    scene.uniqueBackground = true;
    scene.continuousBackground = true;
    scene.doorOverlay = true;
    scene.uniqueImage = meta.image;
    scene.signature = `${scene.signature}:continuous:${floor}`;
    const landmark = {
      id: `landmark-${floor}`,
      rect: [cropWidth * 0.3 - 45, scene.ground - 82, 90, 70],
      label: `ПРИПАСЫ · ${scene.title.toUpperCase()}`,
      kind: "ammo", type: "crate",
    };
    landmark.loot = containerLoot(floor, scene.id, landmark.id, landmark.kind);
    landmark.bonusTypes = [];
    landmark.rareByBonus = {};
    landmark.search = containerProfile(landmark);
    scene.containers.push(landmark);
    continue;
  }
  const originals = scene.parts;
  const retained = originals.filter(part => !part.panel);
  const entrance = retained[0];
  const liftBay = retained[retained.length - 1];
  const doorBays = retained.slice(1, -1);
  const oldToNew = new Map();
  const parts = [];
  let cursor = 0;
  function appendOld(part) {
    oldToNew.set(part, cursor - part.x);
    parts.push({ ...part, x: cursor });
    cursor += part.width;
  }
  appendOld(entrance);
  const uniqueStart = cursor;
  for (let index = 0; index <= doorBays.length; index++) {
    const left = Math.round(meta.width * index / (doorBays.length + 1));
    const right = Math.round(meta.width * (index + 1) / (doorBays.length + 1));
    const width = (right - left) / scale;
    parts.push({
      art: `floor_unique_${floor}`,
      source: [left, 0, right - left, meta.height],
      x: cursor, width, height: meta.height * verticalScale / scale,
      uniqueGround: meta.frontEdge * verticalScale - 70,
    });
    cursor += width;
    if (index < doorBays.length) appendOld(doorBays[index]);
  }
  appendOld(liftBay);
  function remapX(x) {
    const part = retained.find(part => x >= part.x && x < part.x + part.width);
    return part ? x + oldToNew.get(part) : null;
  }
  function remapRect(rect) {
    const x = remapX(rect[0] + rect[2] * 0.5);
    return x === null ? null : [x - rect[2] * 0.5, ...rect.slice(1)];
  }
  for (const key of ["doors", "containers", "lights"]) {
    scene[key] = scene[key].flatMap(item => {
      const rect = remapRect(item.rect);
      return rect ? [{ ...item, rect }] : [];
    });
  }
  for (const key of ["windows", "hazards"])
    scene[key] = scene[key].map(remapRect).filter(Boolean);
  scene.drips = (scene.drips || []).flatMap(([x, y, kind]) => {
    const nx = remapX(x);
    return nx === null ? [] : [[nx, y, kind]];
  });
  scene.foreground = [];
  scene.lift = { ...scene.lift, rect: remapRect(scene.lift.rect) };
  if (!scene.lift.rect) throw new Error(`Lost lift on floor ${floor}`);
  scene.parts = parts;
  scene.seams = parts.slice(1).map(part => part.x);
  scene.crop[2] = cursor;
  scene.width = Math.round(cursor * scale);
  scene.uniqueBackground = true;
  scene.uniqueImage = meta.image;
  scene.signature = `${scene.signature}:unique:${floor}`;
  scene.landmark = { art: `floor_unique_${floor}`, index: floor, x: uniqueStart, width: meta.width / scale };
  const landmark = {
    id: `landmark-${floor}`,
    rect: [uniqueStart + 460 / scale, scene.ground - 82, 95 / scale, 70],
    label: `ПРИПАСЫ · ${scene.title.toUpperCase()}`,
    kind: "ammo", type: "crate",
  };
  landmark.loot = containerLoot(floor, scene.id, landmark.id, landmark.kind);
  landmark.bonusTypes = [];
  landmark.rareByBonus = {};
  landmark.search = containerProfile(landmark);
  scene.containers.push(landmark);
  for (const sourceX of meta.paintedDoors || []) {
    const slice = Math.min(doorBays.length, Math.floor(sourceX * (doorBays.length + 1) / meta.width));
    const insertedBayWidth = doorBays.slice(0, slice).reduce((sum, part) => sum + part.width, 0);
    const x = uniqueStart + sourceX / scale + insertedBayWidth;
    const door = { id: `painted-${floor}-${sourceX}`, kind: "office", name: `КАБИНЕТ ${floor}`, rect: [x - 45 / scale, scene.ground - 148 / scale, 90 / scale, 148 / scale] };
    scene.doors.push(door);
    const room = structuredClone(createRoomLayout(floor, door));
	for (const container of room.containers || []) {
		container.loot = containerLoot(floor, room.id, container.id, container.kind);
		container.bonusTypes = [];
		container.rareByBonus = {};
		container.search = containerProfile(container);
		container.trap = createContainerTrap(floor, room.id, container);
		container.ambush = createContainerAmbush(floor, room.id, container);
	}
    scene.rooms[door.id] = room;
  }
}
writeFileSync(new URL("layouts.json", root), JSON.stringify(layouts));
console.log(`Applied ${Object.keys(manifest).length} unique panoramic backgrounds`);
