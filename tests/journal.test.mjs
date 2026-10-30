import assert from "node:assert/strict";
import {
  JOURNAL_KEY,
  JOURNAL_NOTES,
  noteForFloor,
  noteForId,
  normalizeJournal,
  readJournal,
  writeJournal,
} from "../journal.js";

assert.equal(JOURNAL_NOTES.length, 30);
assert.equal(new Set(JOURNAL_NOTES.map((note) => note.id)).size, 30);
assert.equal(new Set(JOURNAL_NOTES.map((note) => note.floor)).size, 30);
assert(
  JOURNAL_NOTES.every((note) => note.body.trim().split(/\s+/).length >= 50),
);
assert(
  JOURNAL_NOTES.every((note) => note.body.trim().split(/\s+/).length <= 100),
);
assert.deepEqual(
  JOURNAL_NOTES.map((note) => note.floor),
  [...JOURNAL_NOTES.map((note) => note.floor)].sort((a, b) => b - a),
);
for (const note of JOURNAL_NOTES) {
  assert.equal(noteForFloor(note.floor), note);
  assert.equal(noteForId(note.id), note);
}
assert.equal(noteForFloor(51), null);
assert.equal(noteForId("unknown"), null);
assert.deepEqual(
  normalizeJournal(["log-01", "log-01", "unknown", 7, "log-30"]),
  ["log-01", "log-30"],
);
const storage = new Map();
const store = {
  getItem: (key) => storage.get(key),
  setItem: (key, value) => storage.set(key, value),
};
assert(writeJournal(store, ["log-01", "log-30"]));
assert.deepEqual(readJournal(store), ["log-01", "log-30"]);
storage.set(JOURNAL_KEY, "{broken");
assert.deepEqual(readJournal(store), []);
assert(
  !writeJournal(
    {
      setItem() {
        throw Error("quota");
      },
    },
    ["log-01"],
  ),
);
console.log(
  "PASS: 30 authored floor notes, unique order, 50–100 words, safe persistent journal",
);
