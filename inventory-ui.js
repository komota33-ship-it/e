import { weaponSlotsFor } from "./backpacks.js";
import { atlasCells } from "./animation.js";
import {
  EQUIPMENT_SLOTS,
  equipmentFor,
  equipmentStats,
  armorCondition,
  itemWeight,
} from "./equipment.js";
import {
  ITEMS,
  ATTACHMENTS,
  weaponStats,
  backpackFor,
  BACKPACKS,
  inventorySize,
  placeItem,
  sortInventory,
  combineInventory,
  addInventoryItem,
} from "./inventory.js";
import { RECIPES, craftProblem } from "./crafting.js";
export function createInventoryUI({
  root,
  art,
  state,
  onClose,
  onChanged,
  onUse,
  onDrop,
  onAttachment,
  onUnequip,
  onSwapBackpack,
  onWeaponSlot,
  quickSlots,
  onQuickAssign,
  craftingState,
  onCraft,
}) {
  let selected = null,
    container = null,
    dragged = null,
    selectedQuickTool = false;
  const find = (id) => root.querySelector("#" + id);
  const grid = find("inventory-grid");
  const iconRectangles = new Map();
  function message(text) {
    find("inventory-message").textContent = text;
  }
  function icon(type, large = false) {
    const c = document.createElement("canvas");
    c.width = c.height = large ? 192 : 96;
    c.className = "item-art";
    const d = ITEMS[type],
      image = d.sheet ? art[d.sheet] : d.icon < 0 ? art.gear : art.loot;
    if (image) {
      const n = d.sheetColumns || (d.sheet || d.icon < 0 ? 2 : 4),
        index = d.icon < 0 ? 1 : d.icon,
        w = image.width / n,
        h = image.height / (d.sheetRows || n);
      let rectangle = [(index % n) * w, Math.floor(index / n) * h, w, h];
      if (d.sourceRect)
        rectangle = d.sourceRect.map(
          (value, index) => value * (index % 2 ? image.height : image.width),
        );
      else if (d.sheetColumns) {
        if (!iconRectangles.has(image))
          iconRectangles.set(image, atlasCells(image, n, d.sheetRows || n));
        const [x, y, right, bottom] = iconRectangles.get(image)[index];
        rectangle = [x, y, right - x, bottom - y];
      }
      const scale = Math.min(c.width / rectangle[2], c.height / rectangle[3]);
      c.getContext("2d").drawImage(
        image,
        ...rectangle,
        (c.width - rectangle[2] * scale) / 2,
        (c.height - rectangle[3] * scale) / 2,
        rectangle[2] * scale,
        rectangle[3] * scale,
      );
    }
    return c;
  }
  function take(index) {
    const loot = container?.loot[index];
    if (!loot) return;
    const before = loot.qty,
      remaining = addInventoryItem(
        state().inventory,
        loot.type,
        loot.qty,
        {
          ...(loot.loaded !== undefined ? { loaded: loot.loaded } : {}),
          ...(loot.attachments
            ? { attachments: structuredClone(loot.attachments) }
            : {}),
          ...(loot.durability !== undefined
            ? { durability: loot.durability }
            : {}),
        },
        backpackFor(state()),
      );
    loot.qty = remaining;
    if (!remaining) container.loot.splice(index, 1);
    onChanged();
    render();
    message(
      remaining
        ? `Не хватает места. Взято: ${before - remaining}. Остальное осталось в контейнере.`
        : "Предмет помещён в рюкзак.",
    );
  }
  function render() {
    const player = state(),
      items = player.inventory,
      pack = backpackFor(player);
    if (selected && !items.some((i) => i.uid === selected)) selected = null;
    find("inventory-health").textContent =
      `HP ${Math.ceil(player.hp)} / ${player.maxHp || 100} · ЗАРАЖЕНИЕ ${Math.floor(player.infection || 0)}% · ФОНАРЬ ${Math.ceil(player.battery)}%`;
    find("inventory-capacity").textContent =
      `${items.reduce((n, i) => n + ITEMS[i.type].w * ITEMS[i.type].h, 0)} / ${pack.columns * pack.rows} ЯЧЕЕК`;
    const equipment = equipmentFor(player),
      gear = equipmentStats(player);
    find("inventory-load").textContent =
      `${pack.name.toUpperCase()} ${pack.columns}×${pack.rows} · ${gear.weight.toFixed(2)} / ${gear.limit} кг · Защита ${Math.round(gear.defense * 100)}% (предел 90%) · Скорость ${Math.round(gear.speed * 100)}%` +
      (gear.overloaded
        ? " · ПЕРЕГРУЗ: −15% скорости, +25% расхода сил, −10% скорости перезарядки"
        : pack.noise < 1
          ? " · Шум рюкзака −10%"
          : pack.speed < 1
            ? " · Карго: −20% скорости"
            : "");
    find("inventory-load").title =
      `Лимит: 10 кг + ${pack.bonus} кг рюкзака + ${(player.carryCapacity ?? 18) - 18} кг перков. Включает ранги Выжившего, Грузчика и Хамстера; применяется при старте спуска.`;
    find("inventory-load").classList.toggle("danger", gear.overloaded);
    find("equipment-slots").replaceChildren();
    for (const [slot, label] of Object.entries(EQUIPMENT_SLOTS)) {
      const equipped = items.find((i) => i.uid === equipment[slot]),
        button = document.createElement("button");
      button.className = "equipment-slot";
      button.dataset.slot = slot;
      const title = document.createElement("strong");
      title.textContent = label;
      button.append(title);
      const detail = document.createElement("span");
      if (equipped) {
        button.append(icon(equipped.type));
        detail.textContent = `${ITEMS[equipped.type].name} · ${Math.ceil(armorCondition(equipped))}%${armorCondition(equipped) === 0 ? " · СЛОМАНО" : ""}`;
        button.title = "Нажмите, чтобы снять. Предмет останется в рюкзаке.";
        button.onclick = () => {
          onUnequip(slot);
          render();
          message("Снаряжение снято и осталось в рюкзаке.");
          find("equipment-slots")
            .querySelector(`[data-slot="${slot}"]`)
            .focus();
        };
      } else {
        detail.textContent = "Пусто";
        button.disabled = true;
      }
      button.append(detail);
      find("equipment-slots").append(button);
    }
    find("weapon-slots").replaceChildren();
    const chosenWeapon = items.find(
      (i) => i.uid === selected && ITEMS[i.type].group === "weapon",
    );
    weaponSlotsFor(player).forEach((uid, index) => {
      const slot = document.createElement("button"),
        weapon = items.find((i) => i.uid === uid);
      slot.dataset.weaponSlot = index;
      slot.className = "weapon-slot";
      slot.classList.toggle("active", !!uid && uid === player.weaponId);
      slot.textContent = `${index + 1} · ${weapon ? ITEMS[weapon.type].name : "Пусто"}`;
      slot.disabled = !weapon && !chosenWeapon;
      slot.title = chosenWeapon
        ? "Назначить выбранное оружие в этот слот"
        : "Выберите оружие в сетке и нажмите слот. В бою: клавиши 1–3.";
      slot.onclick = () => {
        onWeaponSlot(index, chosenWeapon?.uid);
        render();
        message("Быстрое оружие обновлено. Переключение в бою — клавиши 1–3.");
      };
      find("weapon-slots").append(slot);
    });
    find("quick-assign").replaceChildren();
    const chosenQuick = items.find((item) => item.uid === selected);
    quickSlots().forEach((type, index) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "quick-assign-slot";
      slot.dataset.quickIndex = index;
      if (type && type !== "flashlight") slot.append(icon(type));
      const title = document.createElement("span");
      title.textContent = `${index + 1} · ${type === "flashlight" ? "Фонарик" : type ? ITEMS[type].name : "Пусто"}`;
      slot.append(title);
      slot.title =
        "Выберите расходник или нож в сетке и нажмите сюда; без выбора — очистить";
      slot.onclick = () => {
        message(
          onQuickAssign(
            index,
            selectedQuickTool ? "flashlight" : chosenQuick?.type || null,
          ),
        );
        selectedQuickTool = false;
        render();
      };
      slot.ondragover = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      };
      slot.ondrop = (event) => {
        event.preventDefault();
        const uid = dragged || event.dataTransfer.getData("text/plain");
        const item = items.find((candidate) => candidate.uid === uid);
        if (!item) return;
        message(onQuickAssign(index, item.type));
        dragged = null;
        selectedQuickTool = false;
        render();
      };
      find("quick-assign").append(slot);
    });
    find("quick-assign-light").onclick = () => {
      selectedQuickTool = true;
      selected = null;
      message("Фонарик выбран. Нажмите нужный быстрый слот.");
      render();
    };
    find("quick-assign-light").classList.toggle("active", selectedQuickTool);
    grid.style.gridTemplateColumns = `repeat(${pack.columns}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${pack.rows}, minmax(0, 1fr))`;
    grid.style.aspectRatio = `${pack.columns} / ${pack.rows}`;
    grid.setAttribute(
      "aria-label",
      `${pack.name}: ${pack.columns} столбцов, ${pack.rows} строк`,
    );
    grid.replaceChildren();
    for (let y = 0; y < pack.rows; y++)
      for (let x = 0; x < pack.columns; x++) {
        const cell = document.createElement("button");
        cell.className = "inventory-cell";
        cell.style.gridColumn = x + 1;
        cell.style.gridRow = y + 1;
        cell.setAttribute("aria-label", `Ячейка ${x + 1}, ${y + 1}`);
        cell.onclick = () => {
          const item = items.find((i) => i.uid === selected);
          if (!item) return;
          if (placeItem(items, item, x, y, item.rotated, pack)) {
            onChanged();
            render();
            message("Предмет перемещён.");
          } else
            message("Предмет не помещается: место занято или край рюкзака.");
        };
        grid.append(cell);
      }
    for (const item of items) {
      const [w, h] = inventorySize(item),
        d = ITEMS[item.type],
        button = document.createElement("button");
      button.className =
        "inventory-item" + (selected === item.uid ? " active" : "");
      button.style.gridColumn = `${item.x + 1} / span ${w}`;
      button.style.gridRow = `${item.y + 1} / span ${h}`;
      button.dataset.uid = item.uid;
      button.draggable = true;
      button.title = d.name;
      button.setAttribute("aria-label", `${d.name}, ${item.qty} шт.`);
      const picture = icon(item.type);
      if (item.rotated) picture.style.transform = "rotate(90deg)";
      button.append(picture);
      const label = document.createElement("span");
      label.textContent = d.name;
      button.append(label);
      const amount = document.createElement("b");
      amount.textContent =
        d.group === "weapon"
          ? `${item.loaded}/${weaponStats(item).capacity}`
          : d.group === "armor"
            ? `${Math.ceil(armorCondition(item))}%`
            : item.qty > 1
              ? item.qty
              : "";
      button.append(amount);
      if (
        item.uid === player.weaponId ||
        Object.values(equipment).includes(item.uid)
      ) {
        const tag = document.createElement("em");
        tag.textContent = "НАДЕТО";
        button.append(tag);
      }
      button.onclick = () => {
        selected = item.uid;
        selectedQuickTool = false;
        render();
        message(
          "Перетащите предмет или щёлкните свободную ячейку. R — повернуть.",
        );
      };
      button.ondblclick = () => use();
      button.ondragstart = (e) => {
        dragged = item.uid;
        selected = item.uid;
        e.dataTransfer.setData("text/plain", item.uid);
        e.dataTransfer.effectAllowed = "move";
        button.classList.add("dragging");
      };
      button.ondragend = () => {
        dragged = null;
        render();
      };
      grid.append(button);
    }
    find("loot-panel").hidden = !container;
    find("loot-list").replaceChildren();
    if (container) {
      find("loot-title").textContent = container.label;
      container.loot.forEach((loot, index) => {
        const button = document.createElement("button");
        button.className = "loot-item";
        button.append(icon(loot.type));
        const label = document.createElement("span");
        label.textContent = `${ITEMS[loot.type].name} ×${loot.qty}${ITEMS[loot.type].group === "armor" ? ` · ${Math.ceil(armorCondition(loot))}%` : ""}`;
        if (ITEMS[loot.type].group === "weapon") {
          const mods = Object.values(loot.attachments || {}).map(
            (type) => ITEMS[type].name,
          );
          label.textContent += ` · Патроны ${loot.loaded || 0}/${weaponStats(loot).capacity}${mods.length ? ` · ${mods.join(", ")}` : ""}`;
        }
        button.append(label);
        button.onclick = () => take(index);
        if (ITEMS[loot.type].group === "backpack") {
          const foundPack = BACKPACKS[loot.type];
          label.textContent += ` · ${foundPack.columns}×${foundPack.rows} · +${foundPack.bonus} кг`;
          button.title = ITEMS[loot.type].description;
          const row = document.createElement("div"),
            wear = document.createElement("button");
          row.className = "loot-pack";
          wear.dataset.swapPack = loot.type;
          wear.title = ITEMS[loot.type].description;
          wear.textContent = "Надеть · обменять старый";
          wear.setAttribute(
            "aria-label",
            `Надеть ${ITEMS[loot.type].name} из контейнера`,
          );
          wear.onclick = () => {
            const result = onSwapBackpack(container, index);
            render();
            message(result);
          };
          row.append(button, wear);
          find("loot-list").append(row);
        } else find("loot-list").append(button);
      });
      if (!container.loot.length) {
        const p = document.createElement("p");
        p.textContent = "Контейнер пуст.";
        find("loot-list").append(p);
      }
      find("loot-all").disabled = !container.loot.length;
    }
    const item = items.find((i) => i.uid === selected),
      d = item ? ITEMS[item.type] : null;
    find("item-preview").replaceChildren(
      ...(item ? [icon(item.type, true)] : []),
    );
    find("item-name").textContent = d?.name || "Выберите предмет";
    find("item-description").textContent = item
      ? `${d.description} Масса: ${itemWeight(item).toFixed(2)} кг.${d.group === "armor" ? ` Прочность: ${Math.ceil(armorCondition(item))}%.` : ""}`
      : "Распределяйте место в рюкзаке. Во время осмотра игра стоит на паузе.";
    for (const id of ["item-use", "item-rotate", "item-combine", "item-drop"])
      find(id).disabled = !item;
    find("item-use").textContent =
      d?.group === "weapon"
        ? "Взять в руки"
        : ["armor", "backpack"].includes(d?.group)
          ? "Надеть"
          : "Использовать";
    if (d)
      find("item-use").disabled = !(
        d.heal ||
        d.group ||
        item.type === "antidote" ||
        item.type === "battery"
      );
    find("item-use").hidden = d?.group === "attachment";
    const modPanel = find("attachment-panel");
    modPanel.replaceChildren();
    modPanel.hidden = !["weapon", "attachment"].includes(d?.group);
    if (!modPanel.hidden) {
      const heading = document.createElement("h4");
      heading.textContent =
        d.group === "attachment" ? "УСТАНОВИТЬ НА ОРУЖИЕ" : "ОБВЕСЫ";
      modPanel.append(heading);
      if (d.group === "weapon") {
        const stats = weaponStats(item),
          detail = document.createElement("p");
        detail.textContent = `Магазин ${item.loaded}/${stats.capacity} · Шум выстрела ${Math.round(stats.noise * 100)}% · Крит +${Math.round(stats.criticalBonus * 100)} п.п.`;
        modPanel.append(detail);
        for (const [slot, label] of Object.entries({
          muzzle: "Глушитель",
          rail: "Лазер",
          magazine: "Магазин",
        })) {
          const type = item.attachments?.[slot],
            button = document.createElement("button");
          button.dataset.removeAttachment = slot;
          button.disabled = !type;
          if (type) button.append(icon(type));
          button.append(
            document.createTextNode(
              type ? `Снять: ${ITEMS[type].name}` : `${label}: не установлен`,
            ),
          );
          button.onclick = () => {
            const result = onAttachment(item.uid, null, slot);
            render();
            message(result);
          };
          modPanel.append(button);
        }
      } else {
        const weapons = items.filter((i) => ITEMS[i.type].group === "weapon");
        if (!weapons.length) {
          const detail = document.createElement("p");
          detail.textContent = "В рюкзаке нет подходящего оружия.";
          modPanel.append(detail);
        }
        weapons.forEach((weapon, index) => {
          const button = document.createElement("button");
          button.dataset.attachWeapon = weapon.uid;
          button.disabled = !!weapon.attachments?.[ATTACHMENTS[item.type].slot];
          button.append(
            icon(weapon.type),
            document.createTextNode(
              `${index + 1}. ${ITEMS[weapon.type].name}${weapon.uid === player.weaponId ? " · в руках" : ""}${button.disabled ? " · уже установлен" : ""}`,
            ),
          );
          button.onclick = () => {
            const result = onAttachment(weapon.uid, item.uid);
            selected = weapon.uid;
            render();
            message(result);
          };
          modPanel.append(button);
        });
      }
    }
    const workshop = craftingState();
    find("item-repair").hidden = d?.group !== "armor";
    const repairProblem = craftProblem(
      items,
      workshop.profile,
      "repair",
      item?.uid,
      pack,
    );
    find("item-repair").disabled = !workshop.available || !!repairProblem;
    find("item-repair").title = !workshop.available
      ? "Нужен рабочий стол или технический ящик"
      : repairProblem || "1 металл + 1 ткань; восстановление до 100%";
    find("craft-status").textContent = workshop.available
      ? `РАБОЧЕЕ МЕСТО РЯДОМ · ${workshop.profile.dna} ДНК · ВО ВРЕМЯ РАБОТЫ БОЙ ПРОДОЛЖАЕТСЯ`
      : "Найдите стол или технический ящик. Ресурсы списываются после завершения работы.";
    find("craft-recipes").replaceChildren();
    for (const [id, recipe] of Object.entries(RECIPES)) {
      if (recipe.repair) continue;
      const button = document.createElement("button");
      button.className = "craft-recipe";
      button.dataset.recipe = id;
      const title = document.createElement("strong");
      title.textContent = `${recipe.name} · ${(recipe.seconds * workshop.multiplier).toFixed(1)} с`;
      const ingredients = document.createElement("span");
      ingredients.textContent =
        Object.entries(recipe.ingredients)
          .map(([t, n]) => `${ITEMS[t].name} ×${n}`)
          .join(" + ") + (recipe.dna ? ` + ${recipe.dna} ДНК` : "");
      const reason = craftProblem(items, workshop.profile, id, undefined, pack);
      button.disabled = !workshop.available || !!reason;
      button.title = !workshop.available
        ? "Нужен рабочий стол или технический ящик"
        : reason || "Начать изготовление на этаже";
      button.append(icon(recipe.out), title, ingredients);
      button.onclick = () => {
        const result = onCraft(id);
        if (result) message(result);
      };
      find("craft-recipes").append(button);
    }
    if (selected)
      grid
        .querySelector(`[data-uid="${selected}"]`)
        ?.focus({ preventScroll: true });
  }
  function use() {
    const item = state().inventory.find((i) => i.uid === selected);
    if (item) {
      if (ITEMS[item.type].group === "attachment") {
        message("Выберите оружие в блоке установки обвеса.");
        return;
      }
      const result = onUse(item.uid);
      render();
      message(result);
    }
  }
  function rotate() {
    const item = state().inventory.find((i) => i.uid === selected);
    if (!item) return;
    if (
      placeItem(
        state().inventory,
        item,
        item.x,
        item.y,
        !item.rotated,
        backpackFor(state()),
      )
    ) {
      onChanged();
      render();
      message("Предмет повёрнут.");
    } else message("Для поворота освободите соседние ячейки.");
  }
  grid.ondragover = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  grid.ondrop = (e) => {
    e.preventDefault();
    const uid = dragged || e.dataTransfer.getData("text/plain"),
      item = state().inventory.find((i) => i.uid === uid);
    if (!item) return;
    const r = grid.getBoundingClientRect(),
      x = Math.floor(
        ((e.clientX - r.left) / r.width) * backpackFor(state()).columns,
      ),
      y = Math.floor(
        ((e.clientY - r.top) / r.height) * backpackFor(state()).rows,
      );
    const ok = placeItem(
      state().inventory,
      item,
      x,
      y,
      item.rotated,
      backpackFor(state()),
    );
    dragged = null;
    onChanged();
    render();
    message(ok ? "Предмет перемещён." : "Предмет не помещается в это место.");
  };
  find("inventory-close").onclick = onClose;
  find("item-use").onclick = use;
  find("item-repair").onclick = () => {
    const result = onCraft("repair", selected);
    if (result) message(result);
  };
  find("item-rotate").onclick = rotate;
  find("item-combine").onclick = () => {
    const selectedType = state().inventory.find(
      (i) => i.uid === selected,
    )?.type;
    if (selectedType === "powder" || selectedType === "metal") {
      const result = onCraft("ammo");
      if (result) message(result);
      return;
    }
    const result = combineInventory(
      state().inventory,
      selected,
      backpackFor(state()),
    );
    onChanged();
    render();
    message(
      result
        ? `Получено: ${ITEMS[result].name}`
        : "Нет подходящей пары или места. Травы: зелёная + красная. Патроны: порох + металл.",
    );
  };
  find("item-drop").onclick = () => {
    if (selected) {
      onDrop(selected);
      selected = null;
      render();
      message("Предмет оставлен в сумке на полу. Его можно подобрать снова.");
    }
  };
  find("inventory-sort").onclick = () => {
    const ok = sortInventory(state().inventory, backpackFor(state()));
    onChanged();
    render();
    message(
      ok
        ? "Предметы упорядочены."
        : "Автоматическая укладка не поместилась. Текущее расположение сохранено.",
    );
  };
  find("loot-all").onclick = () => {
    for (let i = (container?.loot.length || 0) - 1; i >= 0; i--) take(i);
  };
  root.addEventListener("keydown", (e) => {
    if (e.code === "KeyR") {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) rotate();
    }
    if (e.code === "Tab") {
      const buttons = [
        ...root.querySelectorAll("button:not([disabled])"),
      ].filter((b) => b.getClientRects().length);
      if (e.shiftKey && document.activeElement === buttons[0]) {
        e.preventDefault();
        buttons.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === buttons.at(-1)) {
        e.preventDefault();
        buttons[0].focus();
      }
    }
  });
  return {
    open(source = null) {
      container = source;
      root.hidden = false;
      render();
      root.querySelector(".inventory-shell").scrollTop = 0;
      message(
        source
          ? "Выберите, что забрать. Невзятые предметы останутся здесь."
          : "I / Esc — вернуться. Перетаскивание — переместить, R — повернуть.",
      );
      find("inventory-close").focus();
    },
    close() {
      root.hidden = true;
      container = null;
      dragged = null;
    },
    render,
    icon,
  };
}
