import { JOURNAL_NOTES, noteForId } from "./journal.js";

const label = (floor) => (floor === 0 ? "B1" : String(floor));

export function createJournalUI({ root, onClose }) {
  const list = root.querySelector("#journal-list");
  const count = root.querySelector("#journal-count");
  const title = root.querySelector("#journal-title");
  const author = root.querySelector("#journal-author");
  const body = root.querySelector("#journal-body");
  const closeButton = root.querySelector("#journal-close");
  let found = new Set();
  let selected = null;

  function select(id) {
    const note = found.has(id) ? noteForId(id) : null;
    selected = note?.id || null;
    title.textContent = note?.title || "ЗАПИСЬ НЕ НАЙДЕНА";
    author.textContent = note
      ? `ЭТАЖ ${label(note.floor)} · ${note.author}`
      : "Ищите документы при обыске столов и шкафов.";
    body.textContent =
      note?.body ||
      "Найденные записи останутся здесь после смерти и нового спуска.";
    for (const button of list.querySelectorAll("button[data-note-id]"))
      button.classList.toggle("selected", button.dataset.noteId === selected);
  }

  function open(ids, preferredId = null) {
    found = new Set(ids);
    count.textContent = `${found.size} / ${JOURNAL_NOTES.length}`;
    list.replaceChildren();
    for (const [index, note] of JOURNAL_NOTES.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.noteId = note.id;
      button.className = found.has(note.id) ? "found" : "locked";
      button.disabled = !found.has(note.id);
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const name = document.createElement("strong");
      name.textContent = found.has(note.id) ? note.title : "НЕИЗВЕСТНО";
      button.append(number, name);
      button.addEventListener("click", () => select(note.id));
      list.append(button);
    }
    root.hidden = false;
    select(
      preferredId && found.has(preferredId)
        ? preferredId
        : selected && found.has(selected)
          ? selected
          : [...ids].at(-1),
    );
    closeButton.focus();
  }

  function close() {
    root.hidden = true;
  }

  closeButton.addEventListener("click", onClose);
  return { open, close };
}
