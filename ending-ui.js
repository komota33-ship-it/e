import { ENDINGS, ENDING_IDS } from "./endings.js";

export function createEndingUI({ root, onSelect, onClose }) {
  const options = root.querySelector("#ending-options");
  const close = root.querySelector("#ending-close");

  function open(completed) {
    options.replaceChildren();
    for (const id of ENDING_IDS) {
      const ending = ENDINGS[id];
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.ending = id;
      const image = document.createElement("img");
      image.src = ending.image;
      image.alt = "";
      image.className = "ending-option-image";
      const status = document.createElement("small");
      status.textContent = completed.has(id) ? "УЖЕ ПРОЙДЕНО" : "НОВЫЙ ИСХОД";
      const name = document.createElement("strong");
      name.textContent = ending.title;
      const description = document.createElement("span");
      description.textContent = ending.description;
      button.append(image, status, name, description);
      button.addEventListener("click", () => onSelect(id));
      options.append(button);
    }
    root.hidden = false;
    options.querySelector("button")?.focus();
  }

  function hide() {
    root.hidden = true;
  }

  close.addEventListener("click", onClose);
  return { open, hide };
}
