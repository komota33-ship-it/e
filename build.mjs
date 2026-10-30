import { readFile, mkdir, writeFile } from "node:fs/promises";

const root = new URL("./", import.meta.url);
const [html, css, game, ...modules] = await Promise.all(
  [
    "index.html",
    "style.css",
    "game.js",
    "awareness.js",
    "hazards.js",
    "inventory.js",
    "attachments.js",
    "backpacks.js",
    "equipment.js",
    "crafting.js",
    "progression.js",
    "journal.js",
    "journal-ui.js",
    "story.js",
    "story-ui.js",
    "endings.js",
    "ending-ui.js",
    "progression-ui.js",
    "survival.js",
    "layouts.js",
    "gait.js",
    "animation.js",
    "combat.js",
    "atmosphere.js",
    "sector-layouts.js",
    "level-layouts.js",
    "inventory-ui.js",
    "depth.js",
    "dressing.js",
    "quickslots.js",
  ].map((file) => readFile(new URL(file, root), "utf8")),
);
const js =
  modules
    .map((source) =>
      source
        .replace(/^import[\s\S]*?from ['"]\.\/[^'"\n]+['"];\n/gm, "")
        .replace(/^export /gm, ""),
    )
    .join("\n") +
  "\n" +
  game.replace(/^import[\s\S]*?from ['"]\.\/[^'"\n]+['"];\n/gm, "");
const art = Object.fromEntries(
  await Promise.all(
    [
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
    ].map(async (name) => [
      name,
      "data:image/png;base64," +
        (await readFile(new URL(`assets/${name}.png`, root))).toString(
          "base64",
        ),
    ]),
  ),
);
const hudIconData =
  "data:image/png;base64," +
  (await readFile(new URL("assets/hud_icons.png", root))).toString("base64");
const menuBackdropData =
  "data:image/png;base64," +
  (await readFile(new URL("assets/menu_backdrop.png", root))).toString(
    "base64",
  );
const endingPaths = ["evacuation", "rescue", "truth"];
const endingImageData = Object.fromEntries(
  await Promise.all(
    endingPaths.map(async (id) => [
      `/assets/ending_${id}.webp`,
      "data:image/webp;base64," +
        (await readFile(new URL(`assets/ending_${id}.webp`, root))).toString(
          "base64",
        ),
    ]),
  ),
);
const bundledJs = Object.entries(endingImageData).reduce(
  (source, [path, data]) => source.replaceAll(path, data),
  js,
);
const standalone = html
  .replace(
    /<link\b[^>]*href="\/style\.css"[^>]*>/,
    () =>
      `<style>${css.replaceAll("/assets/hud_icons.png", hudIconData).replaceAll("/assets/menu_backdrop.png", menuBackdropData)}</style>`,
  )
  .replace(
    '<script type="module" src="/game.js"></script>',
    () =>
      `<script>globalThis.EMBEDDED_GAME_ART=${JSON.stringify(art)};</script><script type="module">${bundledJs}</script>`,
  )
  .replace('class="logo" href="/"', 'class="logo" href=""');
await mkdir(new URL("dist/", root), { recursive: true });
await writeFile(new URL("dist/lift-v-ad.html", root), standalone);
console.log("Standalone game: dist/lift-v-ad.html");
