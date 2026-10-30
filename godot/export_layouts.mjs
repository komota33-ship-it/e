import { writeFileSync } from "node:fs";
import { createFloorLayout, createRoomLayout } from "../level-layouts.js";
import { ENDINGS } from "../endings.js";
import { ITEMS, BACKPACKS, ATTACHMENTS, starterInventory, containerLoot } from "../inventory.js";
import { RECIPES } from "../crafting.js";
import { EQUIPMENT_SLOTS } from "../equipment.js";
import { DNA_REWARDS, PERKS, SYNERGIES } from "../progression.js";
import { JOURNAL_NOTES } from "../journal.js";
import { STORY_BEATS, FLOOR_STORY_BEATS } from "../story.js";
import { containerProfile, createContainerTrap, createContainerAmbush, TRAPS } from "../hazards.js";

function zoneFor(floor) {
  if (floor === 51) return "roof";
  if (floor >= 41) return "office";
  if (floor >= 31) return "laboratory";
  if (floor >= 21) return "apartment";
  if (floor >= 11) return "mall";
  if (floor >= 2) return "parking";
  return "bunker";
}

const floors = {};
function arsenalSeed(value) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
}
function godotArsenalLoot(container, floor, scene) {
  if (floor > 40 || floor < 2 || container.kind === "medical") return;
  const sector = floor >= 31 ? ["smg", "ammo", 16]
    : floor >= 21 ? ["assault", "rifle_ammo", 12]
    : floor >= 11 ? ["rifle", "sniper_ammo", 6]
    : ["railgun", "energy_cell", 2];
  const seed = arsenalSeed(`${floor}:${scene}:${container.id}:arsenal`);
  if (seed % 11 === 0) container.loot.push({ type: sector[0], qty: 1, loaded: 0 });
  if ((seed >>> 3) % 3 === 0) container.loot.push({ type: sector[1], qty: sector[2] });
}
function decorateContainer(container, floor, scene) {
  const base = containerLoot(floor, scene, container.id, container.kind);
  container.loot = base;
  container.bonusTypes = [];
  let previous = base;
  for (let count = 1; count <= 6; count++) {
    const next = containerLoot(floor, scene, container.id, container.kind, count);
    const type = next.find(item => item.qty > (previous.find(old => old.type === item.type)?.qty || 0))?.type;
    container.bonusTypes.push(type || "ammo");
    previous = next;
  }
  container.rareByBonus = {};
  for (const bonus of [10, 20, 30, 40, 50, 60])
    container.rareByBonus[bonus] = containerLoot(floor, scene, container.id, container.kind, 0, bonus).slice(base.length);
  container.search = containerProfile(container);
  container.trap = createContainerTrap(floor, scene, container);
  container.ambush = createContainerAmbush(floor, scene, container);
  godotArsenalLoot(container, floor, scene);
}
for (let floor = 51; floor >= 0; floor--) {
  if (floor === 1) continue;
  const layout = structuredClone(createFloorLayout(floor, zoneFor(floor)));
  layout.rooms = {};
  for (const door of layout.doors || []) {
    const room = structuredClone(createRoomLayout(floor, door));
    for (const container of room.containers || []) {
      decorateContainer(container, floor, room.id);
    }
    layout.rooms[door.id] = room;
  }
  for (const container of layout.containers || []) {
    decorateContainer(container, floor, layout.id);
  }
  floors[String(floor)] = layout;
}
writeFileSync(new URL("./layouts.json", import.meta.url), JSON.stringify(floors));
writeFileSync(new URL("./endings.json", import.meta.url), JSON.stringify(ENDINGS));
writeFileSync(new URL("./catalog.json", import.meta.url), JSON.stringify({
  items: ITEMS,
  backpacks: BACKPACKS,
  attachments: ATTACHMENTS,
  starterInventory: starterInventory(),
  recipes: RECIPES,
  equipmentSlots: EQUIPMENT_SLOTS,
  dnaRewards: DNA_REWARDS,
  perks: PERKS,
  synergies: SYNERGIES,
  notes: JOURNAL_NOTES,
  storyBeats: STORY_BEATS,
  floorStoryBeats: FLOOR_STORY_BEATS,
  traps: TRAPS,
}));
