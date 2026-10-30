export const QUICK_DEFAULTS = ["grenade", "medkit", "flashlight", "knife"];
export const QUICK_ITEMS = new Set([
  "grenade",
  "medkit",
  "bandage",
  "green",
  "mixture",
  "water",
  "food",
  "battery",
  "antidote",
  "knife",
  "flashlight",
]);

export function normalizeQuickSlots(value) {
  if (!Array.isArray(value) || value.length !== 4) return [...QUICK_DEFAULTS];
  return value.map((type) =>
    type === null || QUICK_ITEMS.has(type) ? type : null,
  );
}

export function assignQuickSlot(slots, index, type, inventory) {
  if (!Number.isInteger(index) || index < 0 || index > 3) return null;
  if (type !== null && !QUICK_ITEMS.has(type)) return null;
  if (
    type !== null &&
    type !== "flashlight" &&
    !inventory.some((item) => item.type === type && item.qty > 0)
  )
    return null;
  const next = normalizeQuickSlots(slots);
  if (type) {
    const previous = next.indexOf(type);
    if (previous >= 0 && previous !== index) next[previous] = next[index];
  }
  next[index] = type;
  return next;
}
