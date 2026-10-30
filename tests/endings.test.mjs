import assert from "node:assert/strict";
import {
  ENDINGS,
  ENDING_IDS,
  ENDINGS_KEY,
  normalizeEndings,
  readEndings,
  writeEndings,
} from "../endings.js";

assert.deepEqual(ENDING_IDS, ["evacuation", "rescue", "truth"]);
for (const [id, ending] of Object.entries(ENDINGS)) {
  assert(
    ending.title && ending.action && ending.description,
    `${id}: incomplete choice`,
  );
  assert(
    ending.image === `/assets/ending_${id}.webp` && ending.imageAlt,
    `${id}: missing art`,
  );
  assert(ending.paragraphs.length >= 3, `${id}: no story arc`);
  const words = ending.paragraphs.join(" ").trim().split(/\s+/).length;
  assert(words >= 200 && words <= 300, `${id}: ${words} words`);
}
assert.deepEqual(
  normalizeEndings(["truth", "unknown", "truth", "toString", null, "rescue"]),
  ["truth", "rescue"],
);
const state = new Map();
const storage = {
  getItem: (key) => state.get(key),
  setItem: (key, value) => state.set(key, value),
};
assert(writeEndings(storage, ["rescue", "truth"]));
assert.deepEqual(readEndings(storage), ["rescue", "truth"]);
state.set(ENDINGS_KEY, "{broken");
assert.deepEqual(readEndings(storage), []);
assert(
  !writeEndings(
    {
      setItem() {
        throw Error("quota");
      },
    },
    ["evacuation"],
  ),
);
console.log(
  "PASS: three 200–300-word endings, safe completion history and invalid save handling",
);
