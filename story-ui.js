import { STORY_BEATS } from "./story.js";

export function createStoryRadio({ root }) {
  const speaker = root.querySelector(".radio-speaker");
  const text = root.querySelector(".radio-text");
  const played = new Set();
  let queue = [];
  let remaining = 0;

  function advance() {
    const line = queue.shift();
    if (!line) {
      root.hidden = true;
      remaining = 0;
      return;
    }
    speaker.textContent = line.speaker;
    text.textContent = line.text;
    remaining = Math.max(3.7, Math.min(6, line.text.length / 18));
    root.hidden = false;
  }

  function clear() {
    queue = [];
    remaining = 0;
    root.hidden = true;
  }

  function reset() {
    clear();
    played.clear();
  }

  function play(id, interrupt = false) {
    if (!STORY_BEATS[id] || played.has(id)) return false;
    played.add(id);
    if (interrupt) clear();
    queue.push(...STORY_BEATS[id]);
    if (!remaining) advance();
    return true;
  }

  function update(dt) {
    if (!remaining) return;
    remaining -= dt;
    if (remaining <= 0) advance();
  }

  return { play, update, clear, reset };
}
