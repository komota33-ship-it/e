import { readFileSync, writeFileSync } from "node:fs";
import { planForeground } from "../dressing.js";

const layouts = JSON.parse(readFileSync(new URL("./layouts.json", import.meta.url), "utf8"));
const plans = {};

for (const [floor, layout] of Object.entries(layouts)) {
  const number = Number(floor);
  plans[layout.id] = planForeground(layout, number);
  for (const room of Object.values(layout.rooms || {}))
    plans[room.id] = planForeground(room, number);
}

writeFileSync(new URL("./foreground_layouts.json", import.meta.url), JSON.stringify(plans));
console.log(`Wrote foreground placements for ${Object.keys(plans).length} scenes`);
