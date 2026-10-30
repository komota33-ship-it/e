import http from "node:http";
import { readFile } from "node:fs/promises";
import { serveGameDownload } from "./download.mjs";
const files = {
  "/assets/hud_icons.png": ["assets/hud_icons.png", "image/png"],
  "/assets/menu_backdrop.png": ["assets/menu_backdrop.png", "image/png"],
  "/assets/ending_evacuation.webp": [
    "assets/ending_evacuation.webp",
    "image/webp",
  ],
  "/assets/ending_rescue.webp": ["assets/ending_rescue.webp", "image/webp"],
  "/assets/ending_truth.webp": ["assets/ending_truth.webp", "image/webp"],
  "/attachments.js": ["attachments.js", "text/javascript"],
  "/": ["index.html", "text/html"],
  "/style.css": ["style.css", "text/css"],
  "/awareness.js": ["awareness.js", "text/javascript"],
  "/hazards.js": ["hazards.js", "text/javascript"],
  "/crafting.js": ["crafting.js", "text/javascript"],
  "/progression.js": ["progression.js", "text/javascript"],
  "/journal.js": ["journal.js", "text/javascript"],
  "/journal-ui.js": ["journal-ui.js", "text/javascript"],
  "/story.js": ["story.js", "text/javascript"],
  "/story-ui.js": ["story-ui.js", "text/javascript"],
  "/endings.js": ["endings.js", "text/javascript"],
  "/ending-ui.js": ["ending-ui.js", "text/javascript"],
  "/progression-ui.js": ["progression-ui.js", "text/javascript"],
  "/survival.js": ["survival.js", "text/javascript"],
  "/backpacks.js": ["backpacks.js", "text/javascript"],
  "/equipment.js": ["equipment.js", "text/javascript"],
  "/gait.js": ["gait.js", "text/javascript"],
  "/animation.js": ["animation.js", "text/javascript"],
  "/combat.js": ["combat.js", "text/javascript"],
  "/atmosphere.js": ["atmosphere.js", "text/javascript"],
  "/layouts.js": ["layouts.js", "text/javascript"],
  "/game.js": ["game.js", "text/javascript"],
  "/dressing.js": ["dressing.js", "text/javascript"],
  "/quickslots.js": ["quickslots.js", "text/javascript"],
};
for (const name of [
  "environments",
  "sprites",
  "boss",
  "gear",
  "courier",
  "floorsA",
  "floorsB",
  "rooms",
  "vfx",
  "motion_player",
  "motion_walker",
  "motion_runner",
  "motion_brute",
  "motion_screamer",
  "motion_spitter",
  "motion_armored",
  "motion_boss",
  "motion_matriarch",
  "motion_alpha",
  "motion_carapace",
  "motion_chimera",
  "motion_mama",
  "motion_elena",
  "walk_player",
  "walk_walker",
  "walk_runner",
  "death_player",
  "death_walker",
  "death_runner",
  "dash_runner",
  "melee_runner",
  "melee_walker",
  "spit_spitter",
  "walk_spitter",
  "death_spitter",
  "walk_brute",
  "melee_brute",
  "death_brute",
  "walk_screamer",
  "scream_screamer",
  "death_screamer",
  "walk_armored",
  "melee_armored",
  "death_armored",
  "walk_boss",
  "melee_boss",
  "volley_boss",
  "death_boss",
  "walk_chimera",
  "death_chimera",
  "spit_chimera",
  "death_mama",
  "surrender_mama",
  "death_elena",
  "weapon_arms",
  "acid",
  "loot",
  "medical_items",
  "attachments",
  "armor_items",
  "backpacks",
  "roof",
  "city_panorama",
  "foreground_office",
  "foreground_laboratory",
  "foreground_apartment",
  "foreground_mall",
  "foreground_parking",
  "foreground_roof",
  "foreground_bunker",
  "floor_surfaces",
  "brute_burst",
  "hero_legs",
  "hero_torso",
  "sector_office",
  "sector_laboratory",
  "sector_apartment",
  "sector_mall",
  "sector_parking",
]) {
  files[`/assets/${name}.png`] = [`assets/${name}.png`, "image/png"];
}
for (const name of [
  "sector-layouts",
  "level-layouts",
  "inventory",
  "inventory-ui",
  "depth",
])
  files[`/${name}.js`] = [`${name}.js`, "text/javascript"];
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/download") {
    await serveGameDownload(req, res);
    return;
  }
  const file = files[pathname];
  if (!file) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    let data = await readFile(new URL(file[0], import.meta.url));
    if (pathname === "/") {
      // The offline build needs no download link; inject it only on the server.
      data = data
        .toString("utf8")
        .replace(
          '<div class="header-actions">',
          '<div class="header-actions"><a class="download-game" href="/download" download="lift-v-ad-v0.11.zip">СКАЧАТЬ · ZIP</a>',
        );
    }
    res.writeHead(200, { "Content-Type": `${file[1]}; charset=utf-8` });
    res.end(data);
  } catch {
    res.writeHead(500);
    res.end("Unable to read file");
  }
});
server.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log(
    "Elevator to Hell listening on port " + (process.env.PORT || 3000),
  ),
);
