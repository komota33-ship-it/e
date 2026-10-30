import { ITEMS, ATTACHMENTS, backpackFor } from "./inventory.js";
export const EQUIPMENT_SLOTS = {
  head: "ГОЛОВА",
  torso: "ТОРС",
  hands: "РУКИ",
  feet: "НОГИ",
};
export const armorCondition = (item) => item.durability ?? 100;
export function equipmentFor(state) {
  const equipment = {
    head: null,
    torso: state.armorId || null,
    hands: null,
    feet: null,
    ...state.equipment,
  };
  for (const slot of Object.keys(EQUIPMENT_SLOTS))
    if (
      !state.inventory.some(
        (i) => i.uid === equipment[slot] && ITEMS[i.type]?.slot === slot,
      )
    )
      equipment[slot] = null;
  return equipment;
}
export function validEquipment(items, equipment) {
  if (equipment === undefined) return true; // pre-equipment checkpoints
  if (!equipment || typeof equipment !== "object" || Array.isArray(equipment))
    return false;
  return Object.entries(equipment).every(
    ([slot, uid]) =>
      Object.hasOwn(EQUIPMENT_SLOTS, slot) &&
      (uid === null ||
        items.some((i) => i.uid === uid && ITEMS[i.type].slot === slot)),
  );
}
export function itemWeight(item) {
  const d = ITEMS[item.type];
  return (
    d.weight * item.qty +
    (d.group === "weapon"
      ? (item.loaded || 0) * ITEMS[d.ammo].weight +
        Object.values(item.attachments || {}).reduce(
          (sum, type) => sum + (ATTACHMENTS[type]?.weight || 0),
          0,
        )
      : 0)
  );
}
export function equipmentStats(state) {
  const equipment = equipmentFor(state);
  const weight = state.inventory.reduce((n, i) => n + itemWeight(i), 0);
  const pack = backpackFor(state);
  const limit = (state.carryCapacity ?? 18) - 8 + pack.bonus;
  const overloaded = weight > limit + 1e-8;
  const stats = {
    weight,
    limit,
    overloaded,
    defense: 0,
    speed: 1,
    reload: 1,
    melee: 1,
    view: 1,
    noise: 1,
    stability: 1,
    staminaCost: overloaded ? 1.25 : 1,
  };
  for (const uid of Object.values(equipment)) {
    const item = state.inventory.find((i) => i.uid === uid);
    if (!item) continue;
    const d = ITEMS[item.type],
      working = armorCondition(item) > 0;
    if (working) stats.defense += d.defense;
    for (const [key, value] of Object.entries(d.modifiers))
      if (working || (value < 0 && key !== "noise")) stats[key] += value;
  }
  // Concept sums can exceed 100%. Cap avoids immunity and negative damage.
  stats.defense = Math.min(0.9, stats.defense);
  stats.speed =
    Math.max(0.3, stats.speed) * pack.speed * (overloaded ? 0.85 : 1);
  stats.reload *= overloaded ? 0.9 : 1;
  stats.noise *= pack.noise;
  return stats;
}
export function wearEquipment(state, random = Math.random) {
  const broken = [];
  for (const uid of Object.values(equipmentFor(state))) {
    const item = state.inventory.find((i) => i.uid === uid);
    if (!item || armorCondition(item) <= 0) continue;
    item.durability = Math.max(
      0,
      armorCondition(item) - (1 + Math.min(2, Math.floor(random() * 3))),
    );
    if (!item.durability) broken.push(ITEMS[item.type].name);
  }
  return broken;
}
