import {
  ITEMS,
  ATTACHMENTS,
  backpackFor,
  addInventoryItem,
  weaponStats,
} from "./inventory.js";
// Transactions preserve weapon uid/slots and never spend ammunition or items on failure.
export function installAttachment(state, attachmentUid, weaponUid) {
  const source = state.inventory.find((i) => i.uid === attachmentUid),
    weapon = state.inventory.find((i) => i.uid === weaponUid),
    def = Object.hasOwn(ATTACHMENTS, source?.type) ? ATTACHMENTS[source.type] : null;
  if (!def || ITEMS[weapon?.type]?.group !== "weapon")
    return { ok: false, message: "Выберите обвес и оружие в рюкзаке." };
  if (weapon.attachments?.[def.slot])
    return {
      ok: false,
      message: "Этот обвес уже установлен. Сначала снимите его.",
    };
  const copy = structuredClone(state.inventory),
    target = copy.find((i) => i.uid === weaponUid);
  target.attachments = { ...target.attachments, [def.slot]: source.type };
  copy.splice(
    copy.findIndex((i) => i.uid === attachmentUid),
    1,
  );
  state.inventory.splice(0, state.inventory.length, ...copy);
  return {
    ok: true,
    message: `${def.name} установлен на ${ITEMS[weapon.type].name}.`,
  };
}
export function removeAttachment(state, weaponUid, slot) {
  const weapon = state.inventory.find((i) => i.uid === weaponUid),
    type = weapon?.attachments?.[slot];
  if (
    ITEMS[weapon?.type]?.group !== "weapon" ||
    !Object.hasOwn(ATTACHMENTS, type)
  )
    return { ok: false, message: "Этот обвес не установлен." };
  const copy = structuredClone(state.inventory),
    target = copy.find((i) => i.uid === weaponUid),
    grid = backpackFor(state);
  delete target.attachments[slot];
  const excess = Math.max(0, target.loaded - weaponStats(target).capacity);
  target.loaded -= excess;
  if (
    (excess &&
      addInventoryItem(copy, ITEMS[target.type].ammo, excess, {}, grid)) ||
    addInventoryItem(copy, type, 1, {}, grid)
  )
    return {
      ok: false,
      message:
        "Нужно место для обвеса и лишних патронов. Оружие и патроны сохранены.",
    };
  state.inventory.splice(0, state.inventory.length, ...copy);
  return {
    ok: true,
    message: `${ATTACHMENTS[type].name} снят.${excess ? ` В рюкзак возвращено патронов: ${excess}.` : ""}`,
  };
}
