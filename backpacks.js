import {
  ITEMS,
  BACKPACKS,
  DEFAULT_BACKPACK,
  backpackFor,
  validInventory,
  sortInventory,
  inventorySize,
} from "./inventory.js";
// All swaps are prepared on clones. Refusal never consumes loot or moves items.
function packContents(items, grid) {
  if (validInventory(items, grid)) return true;
  if (
    items.reduce((n, i) => n + ITEMS[i.type].w * ITEMS[i.type].h, 0) >
    grid.columns * grid.rows
  )
    return false;
  if (sortInventory(items, grid)) return true;
  // A bounded exact fallback handles awkward rectangular gaps that first-fit misses.
  const ordered = [...items].sort(
    (a, b) =>
      ITEMS[b.type].w * ITEMS[b.type].h - ITEMS[a.type].w * ITEMS[a.type].h,
  );
  const choices = ordered.map((item) => {
    const variants = [];
    for (const rotated of [false, true]) {
      const [w, h] = inventorySize(item, rotated);
      if (rotated && w === h) continue;
      for (let y = 0; y <= grid.rows - h; y++)
        for (let x = 0; x <= grid.columns - w; x++) {
          let mask = 0n;
          for (let dy = 0; dy < h; dy++)
            for (let dx = 0; dx < w; dx++)
              mask |= 1n << BigInt((y + dy) * grid.columns + x + dx);
          variants.push({ x, y, rotated, mask });
        }
    }
    return variants;
  });
  const memo = new Set();
  let nodes = 0;
  function place(index, occupied) {
    if (index === ordered.length) return true;
    if (++nodes > 50000) return false;
    const key = `${index}:${occupied}`;
    if (memo.has(key)) return false;
    for (const v of choices[index]) {
      if (v.mask & occupied) continue;
      const item = ordered[index];
      item.x = v.x;
      item.y = v.y;
      item.rotated = v.rotated;
      if (place(index + 1, occupied | v.mask)) return true;
      // All remaining 1x1 items are equivalent; alternate cells cannot help.
      if (ITEMS[item.type].w * ITEMS[item.type].h === 1) break;
    }
    memo.add(key);
    return false;
  }
  return place(0, 0n);
}
export function swapBackpack(state, source) {
  const container = source.container;
  const chosen = container
    ? container.loot[source.index]
    : state.inventory.find((i) => i.uid === source.uid);
  if (!chosen || !Object.hasOwn(BACKPACKS, chosen.type))
    return { ok: false, message: "Рюкзак не найден." };
  const previous = state.backpack || DEFAULT_BACKPACK,
    newType = chosen.type;
  if (previous === newType)
    return { ok: false, message: "Уже надет такой рюкзак." };
  const copy = structuredClone(state.inventory);
  if (!container) {
    const index = copy.findIndex((i) => i.uid === chosen.uid);
    // The old pack takes the spare pack's uid and position; no extra item is lost.
    copy[index] = {
      uid: chosen.uid,
      type: previous,
      qty: 1,
      x: chosen.x,
      y: chosen.y,
      rotated: chosen.rotated,
    };
  }
  if (!packContents(copy, BACKPACKS[newType]))
    return {
      ok: false,
      message:
        "Не удалось уложить все вещи. Освободите место; рюкзаки и предметы сохранены.",
    };
  if (container) {
    const loot = container.loot;
    if (chosen.qty === 1) loot[source.index] = { type: previous, qty: 1 };
    else {
      chosen.qty--;
      loot.push({ type: previous, qty: 1 });
    }
  }
  state.inventory.splice(0, state.inventory.length, ...copy);
  state.backpack = newType;
  state.weaponSlots = weaponSlotsFor(state);
  return {
    ok: true,
    message: `Надет ${BACKPACKS[newType].name}. Старый рюкзак ${container ? "остался в контейнере" : "сохранён в сетке"}.`,
  };
}
export function weaponSlotsFor(state) {
  const count = backpackFor(state).weaponSlots,
    valid = (uid) =>
      state.inventory.some(
        (i) => i.uid === uid && ITEMS[i.type].group === "weapon",
      );
  const slots = Array.from({ length: count }, (_, i) =>
    valid(state.weaponSlots?.[i]) ? state.weaponSlots[i] : null,
  );
  const seen = new Set();
  for (let i = 0; i < slots.length; i++) {
    if (seen.has(slots[i])) slots[i] = null;
    else if (slots[i]) seen.add(slots[i]);
  }
  if (valid(state.weaponId) && !slots.includes(state.weaponId)) {
    const free = slots.indexOf(null);
    slots[free >= 0 ? free : 0] = state.weaponId;
  }
  return slots;
}
export function assignWeaponSlot(state, index, uid) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= backpackFor(state).weaponSlots ||
    !state.inventory.some(
      (i) => i.uid === uid && ITEMS[i.type].group === "weapon",
    )
  )
    return false;
  const slots = weaponSlotsFor(state);
  for (let i = 0; i < slots.length; i++) if (slots[i] === uid) slots[i] = null;
  slots[index] = uid;
  state.weaponSlots = slots;
  state.weaponId = uid;
  return true;
}
export function validWeaponSlots(state) {
  const slots = state.weaponSlots;
  if (slots === undefined) return true;
  if (!Array.isArray(slots) || slots.length > backpackFor(state).weaponSlots)
    return false;
  const used = new Set();
  return slots.every(
    (uid) =>
      uid === null ||
      (!used.has(uid) &&
        used.add(uid) &&
        state.inventory.some(
          (i) => i.uid === uid && ITEMS[i.type].group === "weapon",
        )),
  );
}
