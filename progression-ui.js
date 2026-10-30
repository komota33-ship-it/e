import { PERKS, SYNERGIES, synergyActive, buyPerk } from "./progression.js";
export function createProgressUI({ root, profile, onChanged, onClose }) {
  const find = (id) => root.querySelector("#" + id);
  function render() {
    const p = profile();
    find("progress-dna").textContent = p.dna;
    find("progress-stats").textContent =
      `Убийств: ${p.kills} · Смертей: ${p.deaths} · Эвакуаций: ${p.wins} · Лучший спуск: ${p.bestDepth === 50 ? "B1" : p.bestDepth === 0 ? "крыша" : 51 - p.bestDepth + " этаж"}`;
    const wasOpen =
        find("progress-synergy").querySelector("details")?.open || false,
      locked = document.createElement("details"),
      summary = document.createElement("summary");
    locked.open = wasOpen;
    locked.append(summary);
    const active = [];
    for (const [id, def] of Object.entries(SYNERGIES)) {
      const line = document.createElement("p");
      if (synergyActive(p, id)) {
        line.textContent = `◆ ${def.name.toUpperCase()} АКТИВЕН · ${def.description}. Со следующего старта.`;
        active.push(line);
      } else {
        const requirements = Object.entries(def.requires)
          .map(([key, rank]) => `${PERKS[key].name} ${p.perks[key]}/${rank}`)
          .join(" + ");
        line.textContent = `◇ ${def.name.toUpperCase()} · ${requirements} → ${def.description}`;
        locked.append(line);
      }
    }
    summary.textContent = `Синергии: ${active.length} из ${Object.keys(SYNERGIES).length} · условия остальных`;
    find("progress-synergy").replaceChildren(
      ...active,
      ...(active.length < Object.keys(SYNERGIES).length ? [locked] : []),
    );
    find("perk-list").replaceChildren();
    for (const [id, def] of Object.entries(PERKS)) {
      if (
        find("progress-branch").value !== "all" &&
        find("progress-branch").value !== def.branch
      )
        continue;
      const level = p.perks[id],
        card = document.createElement("article");
      card.className = "perk-card";
      const branch = document.createElement("span");
      branch.className = "tiny";
      branch.textContent = def.branch;
      const title = document.createElement("h3");
      title.textContent = def.name;
      const description = document.createElement("p");
      description.textContent = def.description;
      const rank = document.createElement("div");
      rank.className = "perk-rank";
      rank.textContent =
        "◆".repeat(level) + "◇".repeat(3 - level) + ` · ${level}/3`;
      const button = document.createElement("button");
      button.dataset.perk = id;
      button.disabled = level === 3 || p.dna < def.costs[level];
      button.textContent =
        level === 3 ? "ИЗУЧЕНО" : `УЛУЧШИТЬ · ${def.costs[level]} ДНК`;
      button.onclick = () => {
        if (!buyPerk(p, id)) return;
        const saved = onChanged();
        render();
        find("progress-message").textContent = saved
          ? `${def.name}: уровень ${level + 1}. Улучшение действует со следующего старта.`
          : "Улучшение действует в этой сессии. Браузер не разрешил сохранить прогресс.";
        find("progress-close").focus();
      };
      card.append(branch, title, description, rank, button);
      find("perk-list").append(card);
    }
  }
  find("progress-close").onclick = onClose;
  find("progress-branch").onchange = render;
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    if (e.key === "Tab") {
      const buttons = [
          ...root.querySelectorAll("button:not(:disabled), select, summary"),
        ],
        first = buttons[0],
        last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  return {
    open() {
      find("progress-branch").value = "all";
      render();
      find("progress-message").textContent =
        "ДНК и изученные улучшения сохраняются после смерти.";
      root.hidden = false;
      find("progress-close").focus();
    },
    close() {
      root.hidden = true;
    },
  };
}
