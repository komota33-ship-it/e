import assert from "node:assert/strict";
import { FLOOR_STORY_BEATS, STORY_BEATS, storyBeatForFloor } from "../story.js";

const counts = { ЕЛЕНА: 0, МАРКУС: 0, МАМА: 0 };
for (const [id, lines] of Object.entries(STORY_BEATS)) {
  assert(lines.length > 0, `${id}: empty transmission`);
  for (const line of lines) {
    assert(
      line.text.length >= 30 && line.text.length <= 170,
      `${id}: unreadable line`,
    );
    assert(line.speaker.length > 0, `${id}: missing speaker`);
    const name = line.speaker.split(" · ")[0].replace("?", "");
    assert(name in counts, `${id}: unknown speaker ${name}`);
    counts[name]++;
  }
}
assert(Object.values(counts).every((count) => count >= 5 && count <= 10));
for (const [floor, id] of Object.entries(FLOOR_STORY_BEATS)) {
  assert(STORY_BEATS[id], `${floor}: missing transmission`);
  assert.equal(storyBeatForFloor(Number(floor)), id);
}
assert.equal(storyBeatForFloor(49), null);
assert.equal(storyBeatForFloor(2), null);
console.log(
  "PASS: Elena, Marcus and Mama each have 5–10 authored lines across the descent",
);
