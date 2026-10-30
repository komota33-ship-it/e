import { installAttachment, removeAttachment } from "./attachments.js";
import {
  swapBackpack,
  weaponSlotsFor,
  assignWeaponSlot,
  validWeaponSlots,
} from "./backpacks.js";
import {
  equipmentFor,
  equipmentStats,
  validEquipment,
  wearEquipment,
  armorCondition,
} from "./equipment.js";
import { heroAimFacing } from "./gait.js";
import {
  freshAwareness,
  rememberTarget,
  hearSound,
  stepAwareness,
} from "./awareness.js";
import {
  INFECTION_PER_BITE,
  infectionStage,
  infectionMaxHp,
  applyInfection,
  stepInfection,
  freshNoise,
  addNoise,
  noiseLevel,
  noiseThreshold,
  stepNoise,
  containerProfile,
  TRAPS,
  createContainerTrap,
  createContainerAmbush,
  armContainerAmbush,
  armContainerTrap,
  disarmContainerTrap,
  stepContainerTrap,
  trapDamageFactor,
} from "./hazards.js";
import { RECIPES, craftProblem, craftItem } from "./crafting.js";
import {
  readProgress,
  writeProgress,
  awardKill,
  perkEffects,
  recordDepth,
  searchDuration,
} from "./progression.js";
import { createProgressUI } from "./progression-ui.js";
import {
  freshSurvival,
  startDodge,
  stepSurvival,
  spendStamina,
  stepRegeneration,
  reviveSurvival,
} from "./survival.js";
import { SCENE_LAYOUTS } from "./layouts.js";
import { createFloorLayout, createRoomLayout } from "./level-layouts.js";
import {
  ITEMS,
  weaponStats,
  containerPreview,
  BACKPACKS,
  DEFAULT_BACKPACK,
  backpackFor,
  inventoryCount,
  addInventoryItem,
  consumeInventory,
  validInventory,
  starterInventory,
  containerLoot,
} from "./inventory.js";
import { createInventoryUI } from "./inventory-ui.js";
import {
  JOURNAL_NOTES,
  noteForFloor,
  readJournal,
  writeJournal,
} from "./journal.js";
import { createJournalUI } from "./journal-ui.js";
import { storyBeatForFloor } from "./story.js";
import { createStoryRadio } from "./story-ui.js";
import { ENDINGS, readEndings, writeEndings } from "./endings.js";
import { createEndingUI } from "./ending-ui.js";
import {
  sceneDepth,
  projectFloorPainting,
  paintLevelBackdrop,
  drawDistantWindows,
  drawFloorDepth,
} from "./depth.js";
import { drawForegroundDressing } from "./dressing.js";
import {
  QUICK_DEFAULTS,
  normalizeQuickSlots,
  assignQuickSlot,
} from "./quickslots.js";
import {
  createSpriteAnimator,
  advanceGait,
  PLAYER_WEAPON,
} from "./animation.js";
import {
  BRUTE_BURST_DELAY,
  beginEnemyAttack,
  stepEnemyAttack,
  activeAttackSeconds,
  traceShot,
  traceVolley,
  criticalRoll,
  berserkFactor,
  shotDamage,
  knifeDamage,
} from "./combat.js";
import {
  drawWindowWeather,
  drawInteriorAmbience,
  drawSceneLighting,
  drawContactShadow,
} from "./atmosphere.js";
const $ = (id) => document.getElementById(id);
const canvas = $("game"),
  ctx = canvas.getContext("2d", { alpha: false });
let WORLD = 1800;
let activeLayoutId = "office",
  searching = null,
  crafting = null,
  floorNoise = freshNoise();
const GROUND = 423,
  GRAVITY = 1050;
let scene = "corridor",
  doors = [],
  roomStates = new Map(),
  corridorState = null,
  roomReturnX = 140;
let transitionTime = 0;
const aim = { active: false, x: 0, y: 0, angle: 0 };
const SAVE_KEY = "elevator-to-hell-v3";
const QUICK_STORAGE_KEY = "elevator-to-hell-quick-v1";
const QUICK_BUTTONS = ["grenade", "heal", "flashlight", "knife"];
const QUICK_LABELS = {
  grenade: "ГРАНАТА",
  medkit: "АПТЕЧКА",
  bandage: "БИНТ",
  green: "ТРАВА",
  mixture: "СМЕСЬ",
  water: "ВОДА",
  food: "ЕДА",
  battery: "БАТАРЕЯ",
  antidote: "АНТИДОТ",
  flashlight: "ФОНАРЬ",
  knife: "НОЖ",
};
let quickSlots = (() => {
  try {
    return normalizeQuickSlots(
      JSON.parse(localStorage.getItem(QUICK_STORAGE_KEY)),
    );
  } catch {
    return [...QUICK_DEFAULTS];
  }
})();
const progressStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};
let profile = readProgress(progressStorage),
  runEffects = perkEffects(profile),
  runDna = 0;
const journalNotes = new Set(readJournal(progressStorage));
const completedEndings = new Set(readEndings(progressStorage));
let journalUI = null,
  journalReturnMode = "intro";
let endingUI = null;
let progressUI = null,
  progressReturnMode = "intro";
function persistProgress() {
  return writeProgress(progressStorage, profile);
}
function openProgress() {
  if (!["intro", "dead", "won"].includes(mode)) return;
  progressReturnMode = mode;
  mode = "progress";
  clearInput();
  progressUI.open();
}
function closeProgress() {
  if (mode !== "progress") return;
  progressUI.close();
  mode = progressReturnMode;
  updateHud();
  $("progress-toggle").focus();
}
function openJournal(preferredId = null) {
  if (mode === "journal") {
    journalUI.open([...journalNotes], preferredId);
    return;
  }
  if (mode === "inventory") closeInventory();
  if (mode === "progress") closeProgress();
  if (!["intro", "playing", "paused", "dead", "won"].includes(mode)) return;
  journalReturnMode = mode;
  mode = "journal";
  clearInput();
  journalUI.open([...journalNotes], preferredId);
  updateMusicVolume();
  updateHud();
}
function closeJournal() {
  if (mode !== "journal") return;
  journalUI.close();
  mode = journalReturnMode;
  updateMusicVolume();
  updateHud();
  if (mode === "playing") canvas.focus();
  else $("journal-toggle").focus();
}
function openEndingChoice() {
  if (mode !== "playing" || floor !== 0 || scene !== "corridor") return;
  if (enemies.some((enemy) => enemy.type === "boss" && enemy.life > 0)) return;
  mode = "endingChoice";
  clearInput();
  storyRadio?.clear();
  endingUI.open(completedEndings);
  updateMusicVolume();
  updateHud();
}
function closeEndingChoice() {
  if (mode !== "endingChoice") return;
  endingUI.hide();
  mode = "playing";
  updateMusicVolume();
  updateHud();
  canvas.focus();
}
function chooseEnding(id) {
  if (mode !== "endingChoice" || !Object.hasOwn(ENDINGS, id)) return;
  endingUI.hide();
  completedEndings.add(id);
  writeEndings(progressStorage, [...completedEndings]);
  endGame(true, "", id);
}
const runtimeLayouts = new Map();
let inventoryUI = null,
  dropSerial = 0;
function section(n = floor) {
  if (n === 51)
    return { id: "roof", name: "КРЫША", types: ["walker"], count: 2 };
  if (n === 0)
    return {
      id: "bunker",
      name: "БУНКЕР B1",
      types: ["armored", "spitter"],
      count: 5,
    };
  if (n >= 41)
    return {
      id: "office",
      name: "ОФИСЫ",
      types: ["walker", "runner"],
      count: 5,
    };
  if (n >= 31)
    return {
      id: "laboratory",
      name: "ЛАБОРАТОРИИ",
      types: ["spitter", "walker", "runner"],
      count: 8,
    };
  if (n >= 21)
    return {
      id: "apartment",
      name: "АПАРТАМЕНТЫ",
      types: ["walker", "runner", "brute"],
      count: 9,
    };
  if (n >= 11)
    return {
      id: "mall",
      name: "ТОРГОВЫЙ ЦЕНТР",
      types: ["walker", "runner", "screamer", "brute"],
      count: 14,
    };
  return {
    id: "parking",
    name: "ПАРКИНГ",
    types: ["armored", "walker", "spitter"],
    count: 10,
  };
}
const floorLabel = (n) =>
  n === 51 ? "КРЫША" : n === 0 ? "B1" : String(n).padStart(2, "0");
const nextFloor = (n) => (n === 2 ? 0 : n - 1);
const keys = new Set(),
  held = new Set();
let renderScale = 1;
let viewW = 960,
  camera = 0,
  mode = "intro",
  floor = 51,
  elapsed = 0;
let player,
  enemies = [],
  crates = [],
  obstacles = [],
  particles = [],
  projectiles = [],
  corpses = [],
  stains = [];
let storyRadio = null;
let ambientDripClock = 0,
  spriteAnimator = null,
  lastZombieSound = -2;
let flash = true,
  kills = 0,
  reloadTime = 0,
  shotTime = 0,
  hurtTime = 0,
  shake = 0,
  muzzleTime = 0;
let toastTime = 0,
  soundOn = true,
  soundVolume = 0.55,
  musicVolume = 0.32,
  cameraShake = true,
  audioContext,
  musicBus,
  musicNextAt = 0,
  musicStep = 0,
  checkpoint = null,
  lastTime = 0;
const SETTINGS_KEY = "elevator-to-hell-settings-v1";
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if (typeof saved?.sound === "boolean") soundOn = saved.sound;
  if (Number.isFinite(saved?.volume))
    soundVolume = Math.max(0, Math.min(1, saved.volume));
  if (Number.isFinite(saved?.music))
    musicVolume = Math.max(0, Math.min(1, saved.music));
  if (typeof saved?.shake === "boolean") cameraShake = saved.shake;
} catch {}
const zones = [
  "КВАРТИРЫ",
  "ОФИСНЫЙ БЛОК",
  "ТЕХНИЧЕСКИЙ ЭТАЖ",
  "БОЛЬНИЧНОЕ КРЫЛО",
  "ЖИЛОЙ КОРИДОР",
];
const enemyTypes = {
  walker: {
    name: "ХОДОК",
    hp: 20,
    speed: 31,
    damage: 5,
    color: "#68774a",
    coat: "#604c3d",
    size: 1,
  },
  runner: {
    name: "БЕГУН",
    hp: 10,
    speed: 84,
    damage: 8,
    color: "#a0927b",
    coat: "#49414c",
    size: 0.92,
  },
  brute: {
    name: "ТОЛСТЯК",
    hp: 80,
    speed: 23,
    damage: 20,
    color: "#78824b",
    coat: "#65412e",
    size: 1.45,
  },
  screamer: {
    name: "КРИКУН",
    hp: 15,
    speed: 39,
    damage: 0,
    color: "#b2a39a",
    coat: "#544b50",
    size: 1.03,
  },
  spitter: {
    name: "ПЛЕВУН",
    hp: 25,
    speed: 30,
    damage: 12,
    color: "#8c9b4a",
    coat: "#4b5738",
    size: 1,
  },
  armored: {
    name: "БРОНЕВИК",
    hp: 60,
    speed: 28,
    damage: 15,
    color: "#79858b",
    coat: "#354450",
    size: 1.2,
  },
  boss: {
    name: "ОБЪЕКТ 0",
    hp: 1500,
    speed: 26,
    damage: 28,
    color: "#69786b",
    coat: "#263b47",
    size: 1.9,
  },
  matriarch: {
    name: "ТОЛСТЯК-МАТКА",
    hp: 300,
    speed: 19,
    damage: 20,
    color: "#858978",
    coat: "#393a36",
    size: 1.75,
  },
  alpha: {
    name: "КРИКУН-АЛЬФА",
    hp: 250,
    speed: 34,
    damage: 0,
    color: "#b6afad",
    coat: "#58515a",
    size: 1.55,
  },
  carapace: {
    name: "БРОНЕНОСЕЦ",
    hp: 500,
    speed: 22,
    damage: 22,
    color: "#6e7274",
    coat: "#343e46",
    size: 1.72,
  },
  chimera: {
    name: "ХИМЕРА",
    hp: 600,
    speed: 37,
    damage: 24,
    color: "#82a25a",
    coat: "#39433a",
    size: 1.65,
  },
  mama: {
    name: "МАМА",
    hp: 700,
    speed: 35,
    damage: 23,
    color: "#916a68",
    coat: "#4c3037",
    size: 1.32,
  },
  elena: {
    name: "ЕЛЕНА?",
    hp: 800,
    speed: 38,
    damage: 20,
    color: "#75a9a3",
    coat: "#b8b8aa",
    size: 1.4,
  },
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function hash(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function rect(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
}
function line(x1, y1, x2, y2, c, w = 1) {
  ctx.strokeStyle = c;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function poly(points, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function text(t, x, y, c = "#8ca2b0", size = 10, align = "left") {
  ctx.fillStyle = c;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(t, Math.round(x), Math.round(y));
}
function glow(x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function resize() {
  const b = canvas.getBoundingClientRect();
  viewW = (540 * b.width) / b.height;
  renderScale = Math.min(
    2,
    Math.max(1, (b.height / 540) * (devicePixelRatio || 1)),
  );
  canvas.width = Math.round(viewW * renderScale);
  canvas.height = Math.round(540 * renderScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}
new ResizeObserver(resize).observe(canvas);
function notify(message) {
  $("toast").textContent = message;
  toastTime = 3.3;
}
function tone(freq = 140, duration = 0.07, type = "square", volume = 0.025) {
  if (!soundOn || soundVolume <= 0) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const osc = audioContext.createOscillator(),
      gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, freq / 4),
      audioContext.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume * soundVolume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration,
    );
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch {}
}
function noiseSound(kind, distance = 0) {
  if (!soundOn || soundVolume <= 0) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const shotgun = kind === "shotgun",
      zombie = kind === "zombie";
    const duration = zombie ? 0.38 : shotgun ? 0.24 : 0.13;
    const level = soundVolume * Math.max(0.12, 1 - distance / 620);
    const buffer = audioContext.createBuffer(
      1,
      Math.ceil(audioContext.sampleRate * duration),
      audioContext.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    let seed =
      (Math.floor(elapsed * 1000) + (zombie ? 83 : shotgun ? 47 : 19)) | 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const envelope = Math.exp(
        (-i / samples.length) * (zombie ? 2 : shotgun ? 5 : 9),
      );
      samples[i] = ((seed >>> 8) / 8388608 - 1) * envelope;
    }
    const source = audioContext.createBufferSource(),
      filter = audioContext.createBiquadFilter(),
      gain = audioContext.createGain();
    source.buffer = buffer;
    filter.type = zombie ? "lowpass" : "bandpass";
    filter.frequency.value = zombie ? 430 : shotgun ? 850 : 1700;
    filter.Q.value = zombie ? 0.7 : 0.5;
    gain.gain.value = level * (zombie ? 0.075 : shotgun ? 0.19 : 0.12);
    source.connect(filter).connect(gain).connect(audioContext.destination);
    source.start();
    const osc = audioContext.createOscillator(),
      bass = audioContext.createGain();
    osc.type = zombie ? "sawtooth" : "triangle";
    const now = audioContext.currentTime;
    osc.frequency.setValueAtTime(zombie ? 88 : shotgun ? 115 : 160, now);
    osc.frequency.exponentialRampToValueAtTime(
      zombie ? 46 : 35,
      now + duration,
    );
    bass.gain.setValueAtTime(level * (zombie ? 0.04 : 0.12), now);
    bass.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(bass).connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {}
}
const MUSIC_CHORDS = [
  [110, 130.81, 164.81, 220],
  [87.31, 110, 130.81, 174.61],
  [73.42, 110, 146.83, 174.61],
  [82.41, 123.47, 164.81, 246.94],
];
function updateMusicVolume() {
  if (!musicBus || !audioContext) return;
  const level =
    soundOn && !document.hidden
      ? musicVolume * (mode === "playing" ? 0.72 : 0.42)
      : 0;
  musicBus.gain.setTargetAtTime(level, audioContext.currentTime, 0.35);
}
function scheduleMusic() {
  if (
    !musicBus ||
    !audioContext ||
    audioContext.state === "suspended" ||
    !soundOn ||
    musicVolume <= 0 ||
    document.hidden
  )
    return;
  const now = audioContext.currentTime;
  if (musicNextAt < now - 10) musicNextAt = now + 0.1;
  while (musicNextAt < now + 1.2) {
    const notes = MUSIC_CHORDS[musicStep % MUSIC_CHORDS.length],
      at = Math.max(now + 0.02, musicNextAt),
      duration = 8;
    for (const [index, frequency] of notes.entries()) {
      const osc = audioContext.createOscillator(),
        gain = audioContext.createGain();
      osc.type = index === 0 ? "sine" : "triangle";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(index === 0 ? 0.025 : 0.013, at + 1.7);
      gain.gain.setValueAtTime(index === 0 ? 0.025 : 0.013, at + 4.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      osc.connect(gain).connect(musicBus);
      osc.start(at);
      osc.stop(at + duration + 0.05);
    }
    if (musicStep % 2 === 1) {
      const bell = audioContext.createOscillator(),
        tail = audioContext.createGain();
      bell.type = "sine";
      bell.frequency.value = notes[2] * 4;
      tail.gain.setValueAtTime(0.0001, at + 3);
      tail.gain.linearRampToValueAtTime(0.009, at + 3.02);
      tail.gain.exponentialRampToValueAtTime(0.0001, at + 5.8);
      bell.connect(tail).connect(musicBus);
      bell.start(at + 3);
      bell.stop(at + 5.85);
    }
    musicStep++;
    musicNextAt = at + 7.5;
  }
}
function ensureMusic() {
  if (!soundOn || musicVolume <= 0) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    if (!musicBus) {
      musicBus = audioContext.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(audioContext.destination);
      musicNextAt = audioContext.currentTime + 0.1;
    }
    updateMusicVolume();
    scheduleMusic();
  } catch {}
}
function makeEnemy(type, x) {
  const enemy = {
    type,
    ...enemyTypes[type],
    x,
    y: GROUND,
    vx: 0,
    dir: -1,
    life: enemyTypes[type].hp,
    cooldown: rnd(0, 2),
    hit: 0,
    phase: rnd(0, 6),
    alert: false,
    ...freshAwareness(x, Math.floor(x / 70) % 3 === 0),
    state: "idle",
    attack: null,
    moveBlend: 0,
    dashCooldown: rnd(0.5, 2),
    dripClock: rnd(0.1, 0.6),
  };
  if (type === "chimera") {
    const pool = ["fast", "armored", "acidic", "regenerative"];
    enemy.mutations = [];
    for (let i = 0; i < 2; i++)
      enemy.mutations.push(
        pool.splice(Math.floor(Math.random() * pool.length), 1)[0],
      );
    if (enemy.mutations.includes("fast")) enemy.speed *= 1.5;
    enemy.regenDelay = 0;
  }
  return enemy;
}
function enemyHealthScale(zone = section().id) {
  return (
    {
      roof: 1,
      office: 1,
      laboratory: 1.3,
      apartment: 1.6,
      mall: 1.9,
      parking: 2.2,
      bunker: 2.5,
    }[zone] || 1
  );
}
function sceneLayout() {
  return runtimeLayouts.get(activeLayoutId) || SCENE_LAYOUTS[activeLayoutId];
}
function sceneObject(object, layout = sceneLayout()) {
  const { scale, projectY } = sceneDepth(layout, GROUND);
  const [x, y, w, h] = object.rect;
  const bounds = {
    x: x * scale,
    y: projectY(y),
    w: w * scale,
    h: projectY(y + h) - projectY(y),
  };
  return {
    ...object,
    bounds,
    x: bounds.x + bounds.w / 2,
    range: bounds.w / 2 + 26,
  };
}
function sceneContainers(layout, storyNote = null) {
  const containers = layout.containers.map((c) => ({
    ...sceneObject(c, layout),
    opened: false,
    trap: createContainerTrap(floor, layout.id, c),
    ambush: createContainerAmbush(floor, layout.id, c),
    loot: containerLoot(
      floor,
      layout.id,
      c.id,
      c.kind,
      runEffects.lootBonus,
      runEffects.rareLootBonus,
    ),
  }));
  if (storyNote) {
    const archive = containers.find(
      (c) => c.id === `landmark-${storyNote.floor}`,
    );
    if (archive) archive.noteId = storyNote.id;
  }
  return containers;
}

function cameraTarget() {
  return WORLD < viewW
    ? (WORLD - viewW) / 2
    : clamp(player.x - viewW * 0.33, 0, WORLD - viewW);
}
function liftObject() {
  return sceneObject(sceneLayout().lift);
}
function exitObject() {
  return sceneObject(sceneLayout().exit);
}
function generateLevel() {
  storyRadio?.clear();
  scene = "corridor";
  const layout = createFloorLayout(floor, section().id);
  activeLayoutId = layout.id;
  runtimeLayouts.set(layout.id, layout);
  WORLD = layout.width;
  searching = null;
  crafting = null;
  floorNoise = freshNoise();
  roomStates = new Map();
  corridorState = null;
  doors = layout.doors.map((d) => sceneObject(d));
  reloadTime = shotTime = hurtTime = shake = 0;
  camera = 0;
  particles = [];
  projectiles = [];
  corpses = [];
  stains = [];
  ambientDripClock = 0;
  player.x = 65;
  player.y = GROUND;
  player.vy = 0;
  player.dir = 1;
  player.walk = 0;
  delete player.deathAge;
  delete player.deathSign;
  player.phase = 0;
  player.moveBlend = 0;
  player.gait = 0;
  player.meleeTime = 0;
  crates = sceneContainers(layout, noteForFloor(floor));
  // Furniture is behind the walkable foreground lane. No invisible crate walls.
  obstacles = [];
  const zone = section(),
    count = zone.count + (floor === 51 ? 0 : (50 - floor) % 3);
  const scale = enemyHealthScale(zone.id);
  enemies = Array.from({ length: count }, (_, i) => {
    const e = makeEnemy(
      zone.types[i % zone.types.length],
      WORLD *
        (floor === 51 ? 0.58 : layout.encounter === "ambush" ? 0.58 : 0.35) +
        i * ((WORLD * (layout.encounter === "ambush" ? 0.3 : 0.53)) / count),
    );
    e.hp *= scale;
    e.life = e.hp;
    return e;
  });
  if (floor === 0) {
    enemies.push(makeEnemy("boss", WORLD * 0.79));
    crates[0].loot = [
      { type: "ammo", qty: 60 },
      { type: "shells", qty: 20 },
      { type: "medkit", qty: 1 },
    ];
  }
  if (floor === 5) enemies.push(makeEnemy("matriarch", WORLD * 0.76));
  if (floor === 10) enemies.push(makeEnemy("alpha", WORLD * 0.76));
  if (floor === 15) enemies.push(makeEnemy("carapace", WORLD * 0.76));
  if (floor === 20) enemies.push(makeEnemy("chimera", WORLD * 0.76));
  if (floor === 25) enemies.push(makeEnemy("mama", WORLD * 0.76));
  if (floor === 30) enemies.push(makeEnemy("elena", WORLD * 0.76));
  syncSupplies();
  updateHud();
}
function captureScene() {
  return {
    enemies,
    crates,
    obstacles,
    corpses,
    projectiles,
    particles,
    stains,
    width: WORLD,
    layoutId: activeLayoutId,
  };
}
function restoreScene(state) {
  ({ enemies, crates, obstacles, corpses, projectiles, particles, stains } =
    state);
  WORLD = state.width;
  activeLayoutId = state.layoutId;
  searching = null;
}
function makeRoom(door) {
  const layout = createRoomLayout(floor, door),
    layoutId = layout.id;
  runtimeLayouts.set(layoutId, layout);
  const types =
    door.kind === "infirmary"
      ? ["walker", "spitter"]
      : door.kind === "office"
        ? ["runner", "walker"]
        : ["walker"];
  return {
    width: layout.width,
    layoutId,
    obstacles: [],
    corpses: [],
    stains: [],
    projectiles: [],
    particles: [],
    crates: sceneContainers(layout),
    enemies: types.map((type, i) =>
      makeEnemy(type, layout.width * (0.76 + i * 0.14)),
    ),
  };
}
function enterRoom(door) {
  corridorState = captureScene();
  roomReturnX = player.x;
  scene = door.id;
  if (!roomStates.has(scene)) roomStates.set(scene, makeRoom(door));
  restoreScene(roomStates.get(scene));
  const entry = exitObject(),
    entryDir = entry.x > WORLD / 2 ? -1 : 1;
  player.x = entry.x + entryDir * (entry.bounds.w / 2 + 24);
  player.y = GROUND;
  player.vy = 0;
  player.dir = entryDir;
  camera = cameraTarget();
  transitionTime = 0.55;
  clearInput();
  tone(95, 0.23, "triangle");
  updateHud();
  notify(`${door.name} · E у двери слева — вернуться`);
}
function leaveRoom() {
  roomStates.set(scene, captureScene());
  restoreScene(corridorState);
  scene = "corridor";
  player.x = roomReturnX;
  player.y = GROUND;
  player.vy = 0;
  camera = cameraTarget();
  transitionTime = 0.55;
  clearInput();
  tone(110, 0.2, "triangle");
  updateHud();
  notify("Вы вернулись на этаж.");
}
function saveCheckpoint(manual = false) {
  syncSupplies();
  checkpoint = {
    version: 3,
    floor,
    hp: player.hp,
    inventory: structuredClone(player.inventory),
    weaponId: player.weaponId,
    weaponSlots: weaponSlotsFor(player),
    backpack: player.backpack || DEFAULT_BACKPACK,
    armorId: player.armorId,
    equipment: equipmentFor(player),
    battery: player.battery,
    stamina: player.stamina,
    infection: player.infection,
    revivesUsed: player.revivesUsed,
    kills,
  };
  if (manual) {
    checkpoint.session = {
      version: 1,
      scene,
      x: player.x,
      dir: player.dir,
      roomReturnX,
      active: structuredClone(captureScene()),
      corridor: scene === "corridor" ? null : structuredClone(corridorState),
      rooms: structuredClone([...roomStates].filter(([id]) => id !== scene)),
      noise: structuredClone(floorNoise),
    };
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint));
    return true;
  } catch {
    return false;
  }
}

function validSceneSnapshot(s) {
  return (
    s &&
    Number.isFinite(s.width) &&
    s.width > 0 &&
    typeof s.layoutId === "string" &&
    [
      "enemies",
      "crates",
      "obstacles",
      "corpses",
      "projectiles",
      "particles",
      "stains",
    ].every((key) => Array.isArray(s[key]))
  );
}

function validManualSession(s) {
  return (
    !s ||
    (s.version === 1 &&
      typeof s.scene === "string" &&
      Number.isFinite(s.x) &&
      s.x >= 0 &&
      s.x <= 10000 &&
      [1, -1].includes(s.dir) &&
      validSceneSnapshot(s.active) &&
      (s.scene === "corridor" ? !s.corridor : validSceneSnapshot(s.corridor)) &&
      Array.isArray(s.rooms) &&
      s.rooms.every(
        (entry) =>
          Array.isArray(entry) &&
          entry.length === 2 &&
          typeof entry[0] === "string" &&
          validSceneSnapshot(entry[1]),
      ))
  );
}

function restoreManualSession(s) {
  if (
    !s ||
    !validManualSession(s) ||
    (s.scene !== "corridor" && !doors.some((door) => door.id === s.scene))
  )
    return false;
  for (const door of doors) {
    if (s.scene === door.id || s.rooms.some(([id]) => id === door.id)) {
      const layout = createRoomLayout(floor, door);
      runtimeLayouts.set(layout.id, layout);
    }
  }
  roomStates = new Map(s.rooms);
  corridorState = s.corridor;
  scene = s.scene;
  roomReturnX = s.roomReturnX || 65;
  restoreScene(s.active);
  player.x = clamp(s.x, 35, WORLD - 55);
  player.dir = s.dir;
  floorNoise = s.noise || freshNoise();
  camera = cameraTarget();
  return true;
}

function readCheckpoint() {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (
      p?.version === 3 &&
      Number.isInteger(p.floor) &&
      (p.session
        ? p.floor >= 0 && p.floor <= 51 && validManualSession(p.session)
        : p.floor === 51 ||
          (p.floor >= 5 && p.floor <= 50 && p.floor % 5 === 0)) &&
      Number.isFinite(p.hp) &&
      p.hp > 0 &&
      p.hp <= 260 &&
      (p.revivesUsed === undefined ||
        (Number.isInteger(p.revivesUsed) &&
          p.revivesUsed >= 0 &&
          p.revivesUsed <= 3)) &&
      (p.infection === undefined ||
        (Number.isFinite(p.infection) &&
          p.infection >= 0 &&
          p.infection < 100)) &&
      (p.stamina === undefined ||
        (Number.isFinite(p.stamina) && p.stamina >= 0 && p.stamina <= 100)) &&
      Number.isFinite(p.battery) &&
      p.battery >= 0 &&
      p.battery <= 100 &&
      Number.isInteger(p.kills) &&
      p.kills >= 0 &&
      (p.backpack === undefined || Object.hasOwn(BACKPACKS, p.backpack)) &&
      validInventory(p.inventory, backpackFor(p)) &&
      validWeaponSlots(p) &&
      (!p.weaponId ||
        p.inventory.some(
          (i) => i.uid === p.weaponId && ITEMS[i.type].group === "weapon",
        )) &&
      (!p.armorId ||
        p.inventory.some(
          (i) => i.uid === p.armorId && ITEMS[i.type].slot === "torso",
        )) &&
      validEquipment(p.inventory, p.equipment)
    )
      return p;
  } catch {}
  return null;
}
function equippedWeapon() {
  return player.inventory.find((i) => i.uid === player.weaponId) || null;
}
function switchQuickWeapon(index, assignedUid) {
  if (mode !== "playing" && mode !== "inventory") return;
  const uid = assignedUid || weaponSlotsFor(player)[index];
  if (!uid || !assignWeaponSlot(player, index, uid)) return;
  reloadTime = 0;
  syncSupplies();
  updateHud();
  if (mode === "playing")
    notify(`В руках: ${ITEMS[equippedWeapon().type].name}`);
}
function syncSupplies() {
  if (!player.inventory) player.inventory = starterInventory();
  player.weaponSlots = weaponSlotsFor(player);
  const weapon = equippedWeapon();
  player.ammo = weapon?.loaded || 0;
  player.reserve = weapon
    ? inventoryCount(player.inventory, ITEMS[weapon.type].ammo)
    : 0;
  player.meds = inventoryCount(player.inventory, "medkit");
  player.grenades = inventoryCount(player.inventory, "grenade");
  player.equipment = equipmentFor(player);
  player.armorId = player.equipment.torso;
}
function quickIcon(type) {
  if (!type) return null;
  const special = type === "flashlight" || type === "knife";
  const definition = ITEMS[type];
  const sheet = special ? "gear" : definition?.sheet || "loot";
  const image = art[sheet];
  if (!image) return null;
  const columns = special
    ? 2
    : definition.sheetColumns || (definition.sheet ? 2 : 4);
  const index =
    type === "flashlight" ? 0 : type === "knife" ? 1 : definition.icon;
  const cell = image.width / columns;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  canvas.className = "art-icon";
  canvas
    .getContext("2d")
    .drawImage(
      image,
      (index % columns) * cell,
      Math.floor(index / columns) * cell,
      cell,
      cell,
      0,
      0,
      96,
      96,
    );
  return canvas;
}
function renderQuickSlots() {
  QUICK_BUTTONS.forEach((id, index) => {
    const button = $(id),
      type = quickSlots[index],
      label = type ? QUICK_LABELS[type] : "ПУСТО";
    if (button.dataset.quickType !== (type || "")) {
      button.dataset.quickType = type || "";
      button
        .querySelector("span")
        .replaceChildren(
          quickIcon(type) || document.createTextNode(type ? "◆" : "+"),
        );
      button.querySelector("em").textContent = label.toUpperCase();
      button.title = `${index + 1} · ${label} · настройка в рюкзаке`;
      button.setAttribute("aria-label", button.title);
    }
    let count = button.querySelector("b");
    if (!count) {
      count = document.createElement("b");
      button.append(count);
    }
    count.textContent =
      type === "flashlight"
        ? `${Math.ceil(player.battery)}%`
        : type
          ? `${inventoryCount(player.inventory, type)}`
          : "";
    button.classList.toggle("selected", type === "flashlight" && flash);
    button.classList.toggle(
      "empty",
      !!type &&
        type !== "flashlight" &&
        !inventoryCount(player.inventory, type),
    );
  });
}
function setQuickSlot(index, type) {
  const next = assignQuickSlot(quickSlots, index, type, player.inventory);
  if (!next) return "Этот предмет нельзя назначить или его нет в рюкзаке.";
  quickSlots = next;
  try {
    localStorage.setItem(QUICK_STORAGE_KEY, JSON.stringify(quickSlots));
  } catch {
    // The current run still keeps the chosen layout when storage is full.
  }
  renderQuickSlots();
  return `Слот ${index + 1}: ${type === "flashlight" ? "Фонарик" : type ? ITEMS[type].name : "пусто"}.`;
}
function useQuickSlot(index) {
  if (mode !== "playing") return;
  const type = quickSlots[index];
  if (!type) return;
  if (type === "grenade") return grenade();
  if (type === "knife") return melee();
  if (type === "flashlight") {
    flash = !flash;
    return renderQuickSlots();
  }
  const item = player.inventory.find((candidate) => candidate.type === type);
  notify(
    item
      ? useInventoryItem(item.uid)
      : `${ITEMS[type].name}: запас закончился.`,
  );
}
function useInventoryItem(uid) {
  const item = player.inventory.find((i) => i.uid === uid);
  if (!item) return "Предмет не найден.";
  const d = ITEMS[item.type];
  let message = "";
  if (d.group === "weapon") {
    const slots = weaponSlotsFor(player);
    const free = slots.indexOf(null),
      present = slots.indexOf(uid);
    assignWeaponSlot(
      player,
      present >= 0
        ? present
        : free >= 0
          ? free
          : Math.max(0, slots.indexOf(player.weaponId)),
      uid,
    );
    reloadTime = 0;
    message = `В руках: ${d.name}`;
  } else if (d.group === "backpack") {
    const result = swapBackpack(player, { uid });
    if (!result.ok) return result.message;
    message = result.message;
  } else if (d.group === "armor") {
    if (armorCondition(item) <= 0)
      return "Снаряжение сломано. Отремонтируйте его у рабочего стола.";
    player.equipment = equipmentFor(player);
    player.equipment[d.slot] = uid;
    message = `Надето: ${d.name}. Прочность ${Math.ceil(armorCondition(item))}%.`;
  } else if (item.type === "battery") {
    if (player.battery >= 100) return "Фонарь уже заряжен.";
    consumeInventory(player.inventory, item.type);
    player.battery = 100;
    message = "Фонарик заряжен.";
  } else if (item.type === "antidote") {
    if (!player.infection) return "Заражения нет. Антидот сохранён.";
    consumeInventory(player.inventory, item.type);
    player.infection = 0;
    refreshInfection();
    message = "Антидот введён. Заражение снято; раны требуют лечения.";
  } else if (d.heal) {
    const treatsInfection = item.type === "medkit" && player.infection > 0;
    if (player.hp >= player.maxHp && !treatsInfection)
      return "Здоровье полное. Предмет сохранён.";
    if (treatsInfection) {
      player.infection = Math.max(0, player.infection - 20);
      refreshInfection();
    }
    const gain = Math.min(
      item.type === "mixture" ? player.maxHp : d.heal,
      player.maxHp - player.hp,
    );
    player.hp += gain;
    item.qty--;
    if (!item.qty) player.inventory.splice(player.inventory.indexOf(item), 1);
    message = `Восстановлено ${Math.ceil(gain)} здоровья.${treatsInfection ? " Заражение снижено на 20 п.п." : ""}`;
  } else return "Этот предмет используется в бою или при комбинировании.";
  syncSupplies();
  updateHud();
  return message;
}
function refreshInfection() {
  const before = player.maxHp;
  player.maxHp = infectionMaxHp(runEffects.maxHp, player.infection || 0);
  player.hp = Math.min(player.hp, player.maxHp);
  if (player.maxHp < before && mode === "playing")
    notify("Заражение снижает предел здоровья. Нужен антидот или аптечка.");
  if (player.infection >= 100 && mode === "playing") {
    player.hp = 0;
    player.deathAge = 0;
    player.deathSign = -1;
    endGame(false, "infection");
  }
}
function emitNoise(amount, x = player.x, hearing = amount >= 1 ? amount : 0) {
  const factor = runEffects.noiseFactor * equipmentStats(player).noise;
  addNoise(floorNoise, amount * factor);
  if (hearing > 0) for (const e of enemies) hearSound(e, x, hearing * factor);
}
function sceneIsDark() {
  return scene === "corridor" && section().id === "parking";
}
function spawnNoiseWave() {
  const entrances =
    scene === "corridor" ? [...doors, liftObject()] : [exitObject()];
  const entry = entrances.sort(
    (a, b) => Math.abs(b.x - player.x) - Math.abs(a.x - player.x),
  )[0];
  // No enemy materialises on the player, even in a very small room.
  const x = entry?.x ?? (player.x < WORLD / 2 ? WORLD - 55 : 35);
  if (Math.abs(x - player.x) < 220) {
    floorNoise.pending = 1;
    floorNoise.waves--;
    return;
  }
  const count = Math.min(
    section().id === "roof" || section().id === "office" ? 2 : 4,
    40 - enemies.filter((e) => e.life > 0).length,
  );
  for (let i = 0; i < count; i++) {
    const type = section().types[i % section().types.length];
    const e = makeEnemy(
      type,
      clamp(x + Math.sign(x - player.x) * i * 22, 35, WORLD - 55),
    );
    e.hp *= enemyHealthScale();
    e.life = e.hp;
    rememberTarget(e, player.x, player.y);
    e.cooldown = 1;
    enemies.push(e);
  }
  if (count <= 0) floorNoise.waves--;
  if (count > 0) {
    notify(`Орда услышала шум: +${count} заражённых.`);
    tone(85, 0.3, "sawtooth", 0.025);
  }
}
function nearWorkbench() {
  return crates.find(
    (c) =>
      (c.type === "desk" || c.kind === "workshop") &&
      Math.abs(c.x - player.x) < c.range &&
      player.y >= GROUND - 5,
  );
}
function startCraft(id, targetUid) {
  if (mode !== "inventory") return "Откройте рюкзак рядом с рабочим столом.";
  if (!nearWorkbench()) return "Нужен рабочий стол или технический ящик рядом.";
  const problem = craftProblem(
    player.inventory,
    profile,
    id,
    targetUid,
    backpackFor(player),
  );
  if (problem) return problem;
  const duration = RECIPES[id].seconds * runEffects.craftTime;
  closeInventory();
  crafting = { id, targetUid, remaining: duration, duration };
  notify(
    `Изготовление: ${RECIPES[id].name}. Движение и урон прерывают работу.`,
  );
  return "";
}
function openInventory(container = null) {
  if (mode !== "playing") return;
  searching = null;
  crafting = null;
  clearInput();
  mode = "inventory";
  inventoryUI.open(container);
}
function closeInventory() {
  if (mode !== "inventory") return;
  inventoryUI.close();
  mode = "playing";
  clearInput();
  updateHud();
  canvas.focus();
}
function dropInventoryItem(uid) {
  const item = player.inventory.find((i) => i.uid === uid);
  if (!item) return;
  let bag = crates.find((c) => c.portable && Math.abs(c.x - player.x) < 45);
  if (!bag) {
    const bagX = clamp(player.x + 50, 35, WORLD - 55);
    bag = {
      id: `bag-${++dropSerial}`,
      label: "ОСТАВЛЕННАЯ СУМКА",
      kind: "bag",
      portable: true,
      x: bagX,
      range: 44,
      bounds: { x: bagX - 19, y: GROUND - 26, w: 38, h: 26 },
      opened: true,
      loot: [],
    };
    crates.push(bag);
  }
  bag.loot.push({
    type: item.type,
    qty: item.qty,
    ...(item.loaded !== undefined ? { loaded: item.loaded } : {}),
    ...(item.attachments
      ? { attachments: structuredClone(item.attachments) }
      : {}),
    ...(item.durability !== undefined ? { durability: item.durability } : {}),
  });
  player.inventory.splice(player.inventory.indexOf(item), 1);
  if (player.weaponId === uid) {
    reloadTime = 0;
    player.weaponId =
      player.inventory.find((i) => ITEMS[i.type].group === "weapon")?.uid ||
      null;
  }
  syncSupplies();
  updateHud();
}

function startGame(resume = false) {
  const s = resume ? checkpoint : null;
  storyRadio?.reset();
  runEffects = perkEffects(profile);
  runDna = 0;
  floor = s?.floor ?? 51;
  kills = s?.kills || 0;
  const inventory = s ? structuredClone(s.inventory) : starterInventory();
  player = {
    x: 65,
    y: GROUND,
    vy: 0,
    dir: 1,
    walk: 0,
    ...freshSurvival(),
    stamina: s?.stamina ?? 100,
    revivesUsed: s?.revivesUsed ?? 0,
    infection: s?.infection ?? 0,
    maxHp: runEffects.maxHp,
    hp: Math.min(runEffects.maxHp, s?.hp ?? runEffects.maxHp),
    inventory,
    backpack: s?.backpack || DEFAULT_BACKPACK,
    weaponSlots: s?.weaponSlots ? [...s.weaponSlots] : undefined,
    weaponId:
      s?.weaponId || inventory.find((i) => i.type === "pistol")?.uid || null,
    armorId: s?.armorId || null,
    equipment: s?.equipment
      ? structuredClone(s.equipment)
      : { torso: s?.armorId || null },
    carryCapacity: runEffects.carryCapacity,
    battery: s?.battery ?? 100,
  };
  refreshInfection();
  inventoryUI?.close();
  progressUI?.close();
  endingUI?.hide();
  recordDepth(profile, floor);
  persistProgress();
  syncSupplies();
  generateLevel();
  const restored = resume && s?.session && restoreManualSession(s.session);
  aim.active = false;
  mode = "playing";
  $("game").closest(".stage").classList.remove("menu-background");
  $("overlay").classList.add("hidden");
  ensureMusic();
  clearInput();
  if (!restored) saveCheckpoint();
  updateHud();
  storyRadio?.play(storyBeatForFloor(floor));
  notify(
    floor === 51
      ? "Крыша. A/D — движение · I — рюкзак · E — обыск и спуск."
      : `${sceneLayout().title}. Лифт доступен — исследуйте этаж и собирайте припасы.`,
  );
  canvas.focus();
}

function updateHud() {
  $("floor").textContent = floorLabel(floor);
  $("floor-kind").textContent = floor === 51 ? "БАШНЯ" : "ЭТАЖ";
  $("location").textContent =
    scene !== "corridor"
      ? doors.find((d) => d.id === scene).name
      : sceneLayout().title;
  $("hp").textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  $("combat-state").hidden = berserkFactor(runEffects, player) === 1;
  $("revive-state").hidden = runEffects.revivals === 0;
  $("revive-state").textContent =
    `ВТОРОЕ ДЫХАНИЕ · ${Math.max(0, runEffects.revivals - player.revivesUsed)} / ${runEffects.revivals}${player.reviveGrace > 0 ? ` · ЗАЩИТА ${player.reviveGrace.toFixed(1)} С` : ""}`;
  $("hp-fill").style.width = `${(Math.max(0, player.hp) / player.maxHp) * 96}%`;
  $("ammo").textContent =
    reloadTime > 0 ? "ПЕРЕЗАРЯДКА" : `${player.ammo} / ${player.reserve}`;
  $("ammo-fill").style.width =
    `${(player.ammo / (weaponStats(equippedWeapon()).capacity || 12)) * 96}%`;
  $("stamina").textContent = `${Math.floor(player.stamina)} / 100`;
  $("stamina-fill").style.width = `${player.stamina * 0.96}%`;
  $("stamina-fill").classList.toggle(
    "exhausted",
    player.stamina < 25 * equipmentStats(player).staminaCost,
  );
  $("dodge-label").textContent =
    player.dodgeCooldown > 0
      ? `УКЛОНЕНИЕ · ${player.dodgeCooldown.toFixed(1)} с`
      : player.stamina < 25 * equipmentStats(player).staminaCost
        ? "УКЛОНЕНИЕ · НЕТ СИЛ"
        : "Q · УКЛОНЕНИЕ";
  const infection = player.infection || 0;
  $("infection").textContent = `${Math.floor(infection)}%`;
  $("infection-fill").style.width = `${infection * 0.96}%`;
  $("infection-state").textContent = [
    "НЕКРОС-7 · СТАБИЛЬНО",
    "ЗАРАЖЕНИЕ · −10% МАКС. HP",
    "ЗАРАЖЕНИЕ · −30% МАКС. HP",
    "КРИТИЧЕСКОЕ ЗАРАЖЕНИЕ",
    "НЕКРОС-7",
  ][infectionStage(infection)];
  const threshold = noiseThreshold(section().id);
  const noise = noiseLevel(floorNoise);
  $("noise-fill").style.width = `${Math.min(96, (noise / threshold) * 96)}%`;
  $("noise").textContent = `${Math.floor(noise)} / ${threshold}`;
  $("noise-state").textContent =
    floorNoise.pending > 0
      ? `ОРДА ЧЕРЕЗ ${Math.ceil(floorNoise.pending)} С`
      : floorNoise.cooldown > 0
        ? "ШУМ · ЗАРАЖЁННЫЕ НАСТОРОЖЕ"
        : "ШУМ ЗА 5 СЕКУНД";
  $("noise-state").classList.toggle("danger", floorNoise.pending > 0);
  $("progress-balance").textContent = profile.dna;
  $("journal-total").textContent = journalNotes.size;
  $("progress-toggle").disabled = ![
    "intro",
    "dead",
    "won",
    "progress",
  ].includes(mode);
  $("progress-toggle").title =
    mode === "playing"
      ? "Улучшения доступны между забегами"
      : "Постоянные улучшения за ДНК";
  $("meds").textContent = player.meds;
  $("grenades").textContent = player.grenades;
  renderQuickSlots();
  $("objective").textContent =
    floor === 51
      ? "Найти припасы и спуститься с крыши →"
      : floor === 0
        ? enemies.some((e) => e.type === "boss" && e.life > 0)
          ? "Уничтожить Объект 0"
          : "У шлюза выбрать исход спуска →"
        : floor === 5 &&
            enemies.some((e) => e.type === "matriarch" && e.life > 0)
          ? "Победить Толстяка-Матку · лифт заблокирован"
          : floor === 10 &&
              enemies.some((e) => e.type === "alpha" && e.life > 0)
            ? "Победить Крикуна-Альфу · лифт заблокирован"
            : floor === 15 &&
                enemies.some((e) => e.type === "carapace" && e.life > 0)
              ? "Атаковать Броненосца со спины · лифт заблокирован"
              : floor === 20 &&
                  enemies.some((e) => e.type === "chimera" && e.life > 0)
                ? "Победить Химеру · лифт заблокирован"
                : floor === 25 &&
                    enemies.some(
                      (e) => e.type === "mama" && e.life > 0 && !e.spared,
                    )
                  ? enemies.some((e) => e.type === "mama" && e.surrender)
                    ? "Мама сдаётся · E рядом, чтобы пощадить, или добейте её"
                    : "Остановить Маму · лифт заблокирован"
                  : floor === 30 &&
                      enemies.some(
                        (e) => e.type === "elena" && !e.cloned && e.life > 0,
                      )
                    ? "Остановить «Елену?» · лифт заблокирован"
                    : "Исследовать этаж · спуск через лифт →";
  const gear = equipmentStats(player);
  $("load-label").textContent =
    `${gear.weight.toFixed(1)} / ${gear.limit} КГ${gear.overloaded ? " · ПЕРЕГРУЗ" : ""} · ЗАЩИТА ${Math.round(gear.defense * 100)}%`;
  $("load-label").classList.toggle("danger", gear.overloaded);
  $("weapon-label").textContent =
    (equippedWeapon() ? ITEMS[equippedWeapon().type].name : "НЕТ ОРУЖИЯ") +
    ` · ФОНАРЬ ${Math.ceil(player.battery)}%` +
    (backpackFor(player).weaponSlots > 1
      ? ` · ОРУЖИЕ 1–${backpackFor(player).weaponSlots}`
      : "");
  $("checkpoint-label").textContent =
    `ЧЕКПОИНТ: ${floorLabel(checkpoint?.floor ?? 50)}`;
  const seen = enemies.some((e) => e.life > 0 && e.seesPlayer);
  const sought = enemies.some(
    (e) => e.life > 0 && e.alert && Math.abs(e.x - player.x) < 550,
  );
  $("stealth-label").textContent = seen
    ? "ВАС ОБНАРУЖИЛИ"
    : sought
      ? "ВАС ИЩУТ · УЙДИТЕ ОТ МЕСТА ШУМА"
      : sceneIsDark()
        ? flash && player.battery > 0
          ? "ФОНАРЬ ВКЛЮЧЁН · L — ПОГАСИТЬ"
          : "В ТЕНИ · L — ФОНАРЬ"
        : "НЕ ОБНАРУЖЕН";
  $("stealth-label").classList.toggle("detected", seen);
  $("threat").textContent = enemies.length
    ? `ЗАРАЖЁННЫХ: ${enemies.length}`
    : "ЗОНА ЗАЧИЩЕНА";
}
function clearInput() {
  keys.clear();
  held.clear();
  document
    .querySelectorAll(".pressed")
    .forEach((b) => b.classList.remove("pressed"));
}
function pause() {
  if (!$("settings-panel").hidden) {
    $("settings-panel").hidden = true;
    return;
  }
  if (mode === "progress") {
    closeProgress();
    return;
  }
  if (mode === "journal") {
    closeJournal();
    return;
  }
  if (mode === "endingChoice") {
    closeEndingChoice();
    return;
  }
  if (mode === "inventory") {
    closeInventory();
    return;
  }
  if (mode === "playing") {
    mode = "paused";
    updateMusicVolume();
    clearInput();
    showOverlay(
      "ПАУЗА",
      "ПЕРЕДЫШКА",
      "На этом этаже пока тихо.<br>Продолжай, когда будешь готов.",
      "ПРОДОЛЖИТЬ",
    );
  } else if (mode === "paused") {
    mode = "playing";
    updateMusicVolume();
    $("overlay").classList.add("hidden");
    canvas.focus();
  }
}
function showOverlay(title, kicker, copy, button) {
  $("overlay").classList.remove("ending-result");
  $("ending-visual").hidden = true;
  $("ending-story").hidden = true;
  $("overlay-title").textContent = title;
  $("overlay-chapter").textContent = kicker;
  $("overlay-copy").innerHTML = copy;
  $("start").innerHTML = button + " <span>→</span>";
  $("continue").hidden = true;
  $("settings-panel").hidden = true;
  $("menu-save").hidden = mode !== "paused";
  $("menu-main").hidden = mode !== "paused";
  $("menu-save").textContent = "СОХРАНИТЬ ПРОГРЕСС";
  $("overlay").classList.remove("hidden");
}
function showMainMenu() {
  storyRadio?.clear();
  endingUI?.hide();
  clearInput();
  mode = "intro";
  $("game").closest(".stage").classList.add("menu-background");
  updateMusicVolume();
  showOverlay(
    "ЛИФТ В АД",
    "БАШНЯ АТЛАС · 50 ЭТАЖЕЙ ДО B1",
    "Город пал за сутки. Спускайся через башню, ищи припасы и доберись до бункера.",
    "НОВАЯ ИГРА",
  );
  $("overlay-title").innerHTML = "ЛИФТ<br><em>В АД</em>";
  checkpoint = readCheckpoint();
  if (checkpoint) {
    $("continue").hidden = false;
    $("continue").textContent = `ПРОДОЛЖИТЬ · ${floorLabel(checkpoint.floor)}`;
  }
}
function persistSettings() {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        sound: soundOn,
        volume: soundVolume,
        music: musicVolume,
        shake: cameraShake,
      }),
    );
  } catch {}
}
function syncSettings() {
  $("setting-sound").checked = soundOn;
  $("setting-volume").value = String(Math.round(soundVolume * 100));
  $("setting-music").value = String(Math.round(musicVolume * 100));
  $("setting-shake").checked = cameraShake;
  $("sound").textContent = `ЗВУК: ${soundOn ? "ВКЛ" : "ВЫКЛ"}`;
  $("sound").setAttribute(
    "aria-label",
    soundOn ? "Выключить звук" : "Включить звук",
  );
}
function endGame(won, cause = "", endingId = "evacuation") {
  if (mode === "dead" || mode === "won") return;
  const ending = won ? ENDINGS[endingId] || ENDINGS.evacuation : null;
  crafting = null;
  if (!won && mode === "playing" && reviveSurvival(player, runEffects)) {
    searching = null;
    reloadTime = 0;
    hurtTime = 0;
    clearInput();
    // Update only the spent lives on the existing entry checkpoint. Never move
    // its spawn, inventory or health to the place where the fatal hit happened.
    let saved = true;
    if (checkpoint) {
      checkpoint.revivesUsed = player.revivesUsed;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint));
      } catch {
        saved = false;
      }
    }
    burst(player.x, player.y - 65, 18, "#c5cba5");
    hitLabel(
      { x: player.x, y: player.y, size: 1 },
      runEffects.revivalHealth === 0.5 ? "ФЕНИКС" : "ВТОРОЕ ДЫХАНИЕ",
    );
    tone(420, 0.3, "triangle");
    notify(
      saved
        ? `Вы снова в бою · осталось возрождений: ${runEffects.revivals - player.revivesUsed}.`
        : "Вы снова в бою. Браузер не разрешил сохранить расход возрождения.",
    );
    updateHud();
    return;
  }
  if (cause === "infection") {
    const bonus = Math.floor(runDna * 0.5);
    profile.dna = Math.min(1e9, profile.dna + bonus);
    profile.earned = Math.min(1e9, profile.earned + bonus);
    runDna += bonus;
  }
  if (won) profile.wins++;
  else profile.deaths++;
  recordDepth(profile, floor);
  persistProgress();
  mode = won ? "won" : "dead";
  storyRadio?.clear();
  updateMusicVolume();
  clearInput();
  if (won) {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    checkpoint = null;
  }
  showOverlay(
    won ? ending.title : "СПУСК ОКОНЧЕН",
    won
      ? "БУНКЕР B1 · ОБЪЕКТ 0 УНИЧТОЖЕН"
      : cause === "infection"
        ? "НЕКРОС-7 · ЗАРАЖЕНИЕ 100%"
        : `СИГНАЛ ПОТЕРЯН · ${floorLabel(floor)}`,
    won
      ? `${ending.description}<br>Уничтожено заражённых: ${kills}.`
      : `Курьер не добрался до выхода.<br>Пройдено этажей: ${floor === 0 ? 50 : Math.max(0, 51 - floor)}. Уничтожено заражённых: ${kills}.`,
    "НА КРЫШУ",
  );
  if (won) {
    $("ending-image").src = ending.image;
    $("ending-image").alt = ending.imageAlt;
    $("ending-visual").hidden = false;
    $("ending-story").textContent = ending.paragraphs.join("\n\n");
    $("ending-story").hidden = false;
    $("overlay").classList.add("ending-result");
  }
  if (cause === "infection")
    $("overlay-copy").innerHTML +=
      "<br>Смерть от заражения: +50% ДНК за эту попытку.";
  $("overlay-copy").innerHTML +=
    `<br>ДНК за попытку: +${runDna}. Сохранено ДНК: ${profile.dna}.<br>Улучшения — в лаборатории над игровым полем.`;
  if (runEffects.dnaBonus)
    $("overlay-copy").innerHTML +=
      `<br>Мораль: +${runEffects.dnaBonus}% ДНК за убийства уже включены в награду.`;
  updateHud();
  if (!won && checkpoint) {
    $("continue").hidden = false;
    $("continue").textContent = `С ЧЕКПОИНТА ${floorLabel(checkpoint.floor)}`;
  }
  if (won) $("start").focus();
}
function hurt(amount, source = "impact") {
  if (
    hurtTime > 0 ||
    player.reviveGrace > 0 ||
    player.dodgeTime > 0 ||
    mode !== "playing"
  )
    return;
  searching = null;
  crafting = null;
  if (source === "bite") {
    applyInfection(player, INFECTION_PER_BITE, runEffects.infectionResistance);
    refreshInfection();
    if (mode !== "playing" || player.reviveGrace > 0) return;
  }
  const gear = equipmentStats(player);
  amount *= (1 - gear.defense) * runEffects.incomingDamage;
  const broken = wearEquipment(player);
  if (broken.length) notify(`Сломано: ${broken.join(", ")}. Нужен ремонт.`);
  player.hp = Math.max(0, player.hp - amount);
  hurtTime = 0.8;
  shake = 1.5 / gear.stability;
  tone(65, 0.17, "sawtooth", 0.05);
  burst(player.x, player.y - 35, 8, "#9e3028");
  updateHud();
  if (player.hp <= 0) {
    player.deathAge = 0;
    player.deathSign = -1;
    endGame(false);
  }
}
function burst(x, y, n, color) {
  for (let i = 0; i < n; i++)
    particles.push({
      x,
      y,
      vx: rnd(-100, 100),
      vy: rnd(-140, 30),
      life: rnd(0.2, 0.6),
      max: 0.6,
      color,
      size: rnd(2, 5),
    });
}
function addStain(kind, x, radius = 18, active = 0) {
  const nearby = stains.find((s) => s.kind === kind && Math.abs(s.x - x) < 12);
  if (nearby) {
    nearby.radius = Math.min(46, nearby.radius + radius * 0.16);
    nearby.active = Math.max(nearby.active, active);
    return;
  }
  stains.push({
    kind,
    x: clamp(x, 0, WORLD),
    radius,
    active,
    age: 0,
    variant: Math.floor(rnd(0, 4)),
  });
  if (stains.length > 64) stains.shift();
}
function fluidBurst(kind, x, y, n, dir = 0) {
  for (let i = 0; i < n; i++)
    particles.push({
      x,
      y,
      vx: rnd(-70, 70) + dir * rnd(25, 90),
      vy: rnd(-135, -20),
      life: 2,
      max: 2,
      color:
        kind === "blood" ? "#8b1716" : kind === "water" ? "#7899a6" : "#637c2d",
      size: rnd(1.1, 2.7),
      fluid: kind,
    });
  if (particles.length > 450) particles.splice(0, particles.length - 450);
}
function bossSupplies(e, spared = false) {
  if (e.rewarded) return;
  e.rewarded = true;
  profile.dna = Math.min(1e9, profile.dna + 100);
  profile.earned = Math.min(1e9, profile.earned + 100);
  runDna += 100;
  const x = clamp(e.x, 35, WORLD - 55);
  crates.push({
    id: `${e.type}-cache`,
    label:
      {
        alpha: "ПРИПАСЫ АЛЬФЫ",
        carapace: "ПРИПАСЫ БРОНЕНОСЦА",
        chimera: "ПРИПАСЫ ХИМЕРЫ",
        mama: spared ? "ДАР МАМЫ" : "ПРИПАСЫ МАМЫ",
        elena: "ПРИПАСЫ ИЗ ИЗОЛЯТОРА",
      }[e.type] || "ПРИПАСЫ МАТКИ",
    kind: "bag",
    portable: true,
    x,
    range: 48,
    bounds: { x: x - 19, y: GROUND - 26, w: 38, h: 26 },
    opened: true,
    loot: spared
      ? [
          { type: "antidote", qty: 1 },
          { type: "medkit", qty: 1 },
          { type: "shells", qty: 8 },
        ]
      : [
          { type: "ammo", qty: 60 },
          { type: "shells", qty: 12 },
          { type: "medkit", qty: 1 },
        ],
  });
  notify(
    spared
      ? "Мама пощажена. Она оставила антидот и открыла путь к лифту."
      : e.type === "elena"
        ? "Сигнал «Елены» оборвался. В изоляторе остались припасы."
        : `${e.name} повержен. Припасы у тела, путь к лифту открыт.`,
  );
}
function spawnElenaEchoes(e) {
  const alive = enemies.filter(
    (other) => other.cloned && other.life > 0,
  ).length;
  for (let i = 0; i < Math.min(2, 4 - alive); i++) {
    const clone = makeEnemy(
      "elena",
      clamp(e.x + (i ? 155 : -155), 35, WORLD - 55),
    );
    clone.cloned = true;
    clone.hp = clone.life = 28;
    clone.damage = 9;
    clone.speed = 64;
    clone.size = 1.12;
    clone.echoTime = 7;
    clone.cooldown = 0.9;
    rememberTarget(clone, player.x, player.y, "sight");
    enemies.push(clone);
    burst(clone.x, GROUND - 82, 14, "#6ad1c2");
  }
  shake = Math.max(shake, 1.1);
  tone(410, 0.2, "sine", 0.028);
  notify("Сигнал раздвоился. Найдите настоящий источник.");
}
function damageEnemy(e, damage, impact = {}) {
  if (e.life <= 0 || e.spared) return;
  const shieldFront =
    e.type === "carapace" && ((impact.sourceX ?? player.x) - e.x) * e.dir >= 0;
  if (e.type === "carapace") damage *= shieldFront ? 0.15 : 1.5;
  if (e.type === "chimera" && e.mutations?.includes("armored")) damage *= 0.7;
  e.life -= damage;
  if (e.cloned && e.life <= 0) {
    e.life = 0;
    burst(e.x, e.y - 70 * e.size, 12, "#6ad1c2");
    tone(520, 0.12, "sine", 0.018);
    return;
  }
  if (e.cloned) {
    e.hit = 0.2;
    burst(e.x, e.y - 70 * e.size, 5, "#6ad1c2");
    return;
  }
  if (e.type === "chimera") e.regenDelay = 2.5;
  if (e.type === "carapace")
    hitLabel(e, shieldFront ? "ЩИТ · −85%" : "СПИНА · ×1.5");
  e.hit = 0.2;
  rememberTarget(
    e,
    impact.sourceX ?? player.x,
    impact.sourceY ?? player.y,
    "hurt",
  );
  const knock = impact.dir ?? player.dir;
  const x = impact.x ?? e.x,
    y = impact.y ?? e.y - 75 * e.size;
  if (impact.metal || shieldFront) {
    burst(x, y, 5, "#cfb87f");
  } else
    fluidBurst(
      e.type === "spitter" ? "slime" : "blood",
      x,
      y,
      damage >= 20 ? 9 : 5,
      knock,
    );
  if (e.attack && e.attack.time < e.attack.windup) {
    e.attack = null;
    e.cooldown = Math.max(e.cooldown, 0.45);
  }
  if (e.type === "mama" && !e.surrender && e.life <= e.hp * 0.12) {
    e.life = e.hp * 0.12;
    e.surrender = true;
    e.surrenderAge = 0;
    e.attack = null;
    e.moveBlend = 0;
    e.state = "surrender";
    e.alert = false;
    e.seesPlayer = false;
    e.brain = "idle";
    notify("Мама сложила оружие. E рядом — пощадить; огонь — добить.");
    storyRadio?.play("mamaSurrender", true);
    tone(280, 0.22, "sine", 0.04);
    return;
  }
  if (e.type === "elena" && !e.cloned && e.life > 0) {
    if (e.life <= e.hp * 0.5 && !e.echoPhaseOne) {
      e.echoPhaseOne = true;
      spawnElenaEchoes(e);
      storyRadio?.play("elenaEcho", true);
    }
    if (e.life <= e.hp * 0.2 && !e.echoPhaseTwo) {
      e.echoPhaseTwo = true;
      spawnElenaEchoes(e);
    }
  }
  if (e.life <= 0) {
    if (e.type === "mama") storyRadio?.play("mamaKilled", true);
    if (e.type === "elena")
      for (const clone of enemies)
        if (clone.cloned && clone.life > 0) {
          clone.life = 0;
          burst(clone.x, clone.y - 70 * clone.size, 10, "#6ad1c2");
        }
    kills++;
    const dna = awardKill(profile, e.type, runEffects.dnaBonus);
    runDna += dna;
    if (
      ["matriarch", "alpha", "carapace", "chimera", "mama", "elena"].includes(
        e.type,
      )
    )
      bossSupplies(e);
    persistProgress();
    corpses.push({
      ...e,
      attack: null,
      state: "death",
      deathAge: 0,
      deathSign: knock * e.dir,
      exploded: false,
    });
    if (corpses.length > 32) corpses.shift();
    fluidBurst(
      e.type === "spitter" ? "slime" : "blood",
      e.x,
      e.y - 65 * e.size,
      12,
      knock,
    );
    tone(90, 0.09, "triangle");
  }
}
function updateDeaths(dt, canDamage = true) {
  for (const c of corpses) {
    c.deathAge += dt;
    if (c.type === "brute" && !c.exploded && c.deathAge >= BRUTE_BURST_DELAY) {
      c.exploded = true;
      const origin = (spriteAnimator ||= createSpriteAnimator(
        ctx,
        art,
      )).bruteBurstOriginFor();
      const burstX = c.x + c.dir * origin.x * c.size;
      const burstY = c.y + origin.y * c.size;
      fluidBurst("slime", burstX, burstY, 24);
      fluidBurst("blood", burstX, burstY, 14);
      addStain("slime", burstX - 14, 43);
      addStain("blood", burstX + 16, 38);
      for (let i = 0; i < 12; i++)
        particles.push({
          x: burstX,
          y: burstY,
          vx: rnd(-175, 175),
          vy: rnd(-250, -90),
          life: 2.2,
          max: 2.2,
          chunk: true,
          size: rnd(4, 9),
          rotation: rnd(0, Math.PI * 2),
          spin: rnd(-8, 8),
        });
      particles.push({
        x: burstX,
        y: burstY,
        life: 0.95,
        max: 0.95,
        explosion: true,
        organic: true,
        size: 240,
      });
      shake = 2;
      tone(65, 0.25, "sawtooth", 0.035);
      if (canDamage) {
        if (Math.abs(player.x - c.x) < 100) hurt(20);
        for (const other of enemies)
          if (other.life > 0 && Math.abs(other.x - c.x) < 105)
            damageEnemy(other, 45, {
              dir: Math.sign(other.x - c.x),
              sourceX: c.x,
              sourceY: c.y,
            });
      }
    }
    if (!c.stained && c.deathAge > 0.55) {
      c.stained = true;
      addStain(c.type === "spitter" ? "slime" : "blood", c.x, 24 * c.size);
    }
  }
}
function launchAcid(e, spread = 0, target = player) {
  const animator = (spriteAnimator ||= createSpriteAnimator(ctx, art));
  const mouth =
    e.type === "spitter"
      ? animator.spitMouthFor(e)
      : e.type === "boss"
        ? animator.bossVolleyOriginFor()
        : e.type === "chimera"
          ? animator.chimeraSpitOriginFor()
          : { x: 20, y: -107 };
  const x = e.x + e.dir * mouth.x * e.size,
    y = e.y + mouth.y * e.size;
  const flight = Math.max(0.3, Math.abs(target.x - x) / 235);
  projectiles.push({
    kind: "acid",
    x,
    y,
    vx: e.dir * (235 + spread * 25),
    vy: (target.y - 65 - y) / flight - 32.5 * flight + spread * 35,
    timer: 3,
    damage: e.type === "chimera" && e.mutations?.includes("acidic") ? 16 : 12,
    trail: 0,
  });
  fluidBurst("slime", x, y, 5, e.dir);
  tone(180, 0.12, "triangle", 0.015);
}
function launchEchoPulse(e, spread = 0, target = player) {
  const origin = (spriteAnimator ||= createSpriteAnimator(
    ctx,
    art,
  )).elenaPulseOriginFor();
  const x = e.x + e.dir * origin.x * e.size,
    y = e.y + origin.y * e.size;
  const flight = Math.max(0.3, Math.abs(target.x - x) / 255);
  projectiles.push({
    kind: "echo",
    x,
    y,
    vx: e.dir * (255 + spread * 22),
    vy: (target.y - 65 - y) / flight - 32.5 * flight + spread * 36,
    timer: 3,
    damage: 14,
    trail: 0,
  });
  burst(x, y, 5, "#69cfc2");
  tone(460, 0.13, "sine", 0.02);
}
function resolveEnemyImpact(e, a) {
  if (a.kind === "summon") {
    const alive = enemies.filter(
      (other) => other.summonedBy === e.type && other.life > 0,
    ).length;
    const count = Math.min(
      e.type === "mama" ? 2 : 3,
      (e.type === "mama" ? 5 : 8) - alive,
      40 - enemies.length,
    );
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? -1 : 1;
      const x = clamp(e.x + side * (65 + i * 30), 35, WORLD - 55);
      const child = makeEnemy(
        (e.type === "mama" && i === 1) || i === 2 ? "runner" : "walker",
        x,
      );
      child.summonedBy = e.type;
      child.hp *= enemyHealthScale(section().id);
      child.life = child.hp;
      child.emergeTime = 0.35;
      child.cooldown = 1.1;
      rememberTarget(child, player.x, player.y, "sight");
      enemies.push(child);
      fluidBurst("blood", x, GROUND - 14, 5);
    }
    shake = Math.max(shake, 1.4);
    tone(75, 0.25, "sawtooth", 0.04);
    return;
  }
  if (a.kind === "spit") {
    launchAcid(e, 0, { x: a.targetX, y: a.targetY });
    return;
  }
  if (a.kind === "volley") {
    for (let i = -1; i <= 1; i++)
      (e.type === "elena" ? launchEchoPulse : launchAcid)(e, i, {
        x: a.targetX,
        y: a.targetY,
      });
    return;
  }
  if (a.kind === "scream") {
    const animator = (spriteAnimator ||= createSpriteAnimator(ctx, art));
    const mouth =
      e.type === "alpha"
        ? animator.alphaScreamMouthFor()
        : animator.screamMouthFor();
    particles.push({
      x: e.x + a.dir * mouth.x * e.size,
      y: e.y + mouth.y * e.size,
      life: 0.8,
      max: 0.8,
      ring: true,
    });
    for (const other of enemies) rememberTarget(other, e.x, e.y);
    const count = Math.min(5, 40 - enemies.length);
    for (let i = 0; i < count; i++) {
      const z = makeEnemy(
        i % 2 ? "walker" : "runner",
        clamp(e.x + (i % 2 ? 1 : -1) * (250 + i * 35), 40, WORLD - 50),
      );
      if (e.type === "alpha") {
        z.hp *= enemyHealthScale(section().id);
        z.life = z.hp;
        z.emergeTime = 0.35;
        z.cooldown = 0.9;
        rememberTarget(z, player.x, player.y, "sight");
      } else rememberTarget(z, e.x, e.y);
      enemies.push(z);
    }
    tone(480, 0.25, "sawtooth", 0.025);
    return;
  }
  if (a.kind === "dash") return;
  const distance = (player.x - e.x) * a.dir;
  if (
    distance > -15 &&
    distance < 60 * e.size &&
    Math.abs(player.y - e.y) < 65
  ) {
    hurt(e.damage, "bite");
    fluidBurst("blood", player.x, player.y - 55, 4, a.dir);
    a.hitDone = true;
  }
}
function updateEnemy(e, dt) {
  if (e.life <= 0) return;
  if (e.cloned) {
    e.echoTime -= dt;
    if (e.echoTime <= 0) {
      e.life = 0;
      burst(e.x, e.y - 70 * e.size, 8, "#69cfc2");
      return;
    }
  }
  if (e.type === "mama" && e.surrender) {
    e.surrenderAge = Math.min(1, (e.surrenderAge || 0) + dt);
    e.attack = null;
    e.moveBlend = 0;
    e.state = "surrender";
    e.alert = false;
    e.seesPlayer = false;
    return;
  }
  const priorAttack = e.attack;
  if (e.emergeTime > 0) {
    e.emergeTime = Math.max(0, e.emergeTime - dt);
    return;
  }
  e.hit = Math.max(0, e.hit - dt);
  if (e.type === "chimera" && e.mutations?.includes("regenerative")) {
    e.regenDelay = Math.max(0, (e.regenDelay || 0) - dt);
    if (e.regenDelay === 0) e.life = Math.min(e.hp, e.life + 4 * dt);
  }
  e.cooldown -= dt;
  e.dashCooldown -= dt;
  e.dripClock -= dt;
  const before = e.x,
    dx = player.x - e.x,
    distance = Math.abs(dx);
  stepAwareness(e, player, dt, {
    dark: sceneIsDark(),
    flashlight: flash && player.battery > 0,
  });
  if (e.dripClock <= 0) {
    e.dripClock = e.type === "spitter" || e.type === "chimera" ? 0.45 : 0.9;
    if (e.type === "spitter" || e.type === "chimera")
      fluidBurst("slime", e.x + e.dir * 17 * e.size, e.y - 108 * e.size, 1);
    else if (e.life < e.hp * 0.55)
      fluidBurst("blood", e.x, e.y - 64 * e.size, 1);
  }
  if (e.attack) {
    const a = e.attack;
    e.dir = a.dir;
    const impact = stepEnemyAttack(e, dt);
    const activeSeconds = activeAttackSeconds(a, dt);
    if (a.kind === "dash" && activeSeconds > 0) {
      e.x = clamp(
        e.x + e.dir * 310 * runEffects.enemySpeed * activeSeconds,
        35,
        WORLD - 45,
      );
      if (
        !a.hitDone &&
        player.x > Math.min(before, e.x) - 45 * e.size &&
        player.x < Math.max(before, e.x) + 45 * e.size &&
        Math.abs(player.y - e.y) < 65
      ) {
        hurt(e.damage, "bite");
        a.hitDone = true;
        fluidBurst("blood", player.x, player.y - 55, 4, e.dir);
      }
    }
    if (impact) resolveEnemyImpact(e, a);
  } else if (["chase", "investigate", "patrol"].includes(e.brain)) {
    let targetX = clamp(e.targetX, 35, WORLD - 55);
    if (e.brain === "patrol" && Math.abs(e.x - targetX) < 5) {
      e.patrolDir *= -1;
      targetX = clamp(e.homeX + e.patrolDir * 65, 35, WORLD - 55);
      e.targetX = targetX;
    }
    const travel = Math.abs(targetX - e.x);
    if (travel > 2) e.dir = targetX < e.x ? -1 : 1;
    const range = e.seesPlayer
      ? e.type === "spitter"
        ? 240
        : e.type === "boss" || e.type === "matriarch"
          ? 100
          : 39 * e.size
      : 5;
    if (e.seesPlayer && e.cooldown <= 0 && e.hit <= 0) {
      if ((e.type === "screamer" || e.type === "alpha") && distance < 450)
        beginEnemyAttack(e, "scream");
      else if (e.type === "spitter" && distance < 420 && distance > 65)
        beginEnemyAttack(e, "spit");
      else if (e.type === "chimera" && distance < 510 && distance > 105)
        beginEnemyAttack(e, "spit");
      else if (
        e.type === "elena" &&
        !e.cloned &&
        distance < 550 &&
        distance > 115
      )
        beginEnemyAttack(e, "volley");
      else if (e.type === "boss" && distance > 110 && distance < 550)
        beginEnemyAttack(e, "volley");
      else if (e.type === "matriarch" && distance > 115 && distance < 520)
        beginEnemyAttack(e, "summon");
      else if (e.type === "mama" && distance > 115 && distance < 520)
        beginEnemyAttack(e, "summon");
      else if (
        e.type === "runner" &&
        e.dashCooldown <= 0 &&
        distance > 90 &&
        distance < 260
      )
        beginEnemyAttack(e, "dash");
      else if (
        distance < 55 * e.size &&
        Math.abs(player.y - e.y) < 70 &&
        e.type !== "screamer" &&
        e.type !== "alpha"
      )
        beginEnemyAttack(
          e,
          e.type === "runner"
            ? "runner"
            : [
                  "brute",
                  "boss",
                  "matriarch",
                  "carapace",
                  "chimera",
                  "mama",
                  "elena",
                ].includes(e.type)
              ? "heavy"
              : "melee",
        );
    }
    if (!e.attack && travel > range && e.hit <= 0) {
      const speed =
        e.speed *
        runEffects.enemySpeed *
        (e.brain === "patrol" ? 0.35 : 1) *
        (e.slow ? 0.7 : 1) *
        (e.type === "boss" && e.life < e.hp * 0.5 ? 2.2 : 1);
      e.x += e.dir * Math.min(travel - range, speed * dt);
      e.x = clamp(e.x, 35, WORLD - 55);
    }
  }
  if (!priorAttack && e.attack && elapsed - lastZombieSound > 0.4) {
    noiseSound("zombie", Math.abs(e.x - player.x));
    lastZombieSound = elapsed;
  }
  if (!e.attack)
    e.state =
      e.hit > 0 ? "hurt" : Math.abs(e.x - before) > 0.01 ? "walk" : "idle";
  const moving = Math.abs(e.x - before) > 0.01;
  e.moveBlend += (Number(moving) - e.moveBlend) * Math.min(1, dt * 12);
  advanceGait(e, (e.x - before) * e.dir, e.type);
}
function reload() {
  const weapon = equippedWeapon();
  if (mode !== "playing" || reloadTime > 0 || !weapon) return;
  if (weapon.loaded >= weaponStats(weapon).capacity) return;
  if (!player.reserve) {
    notify("Нет нужных патронов. Ищите припасы или используйте нож.");
    return;
  }
  reloadTime =
    (weapon.type === "shotgun" ? 1.8 : 1.2) / equipmentStats(player).reload;
  tone(300, 0.05, "triangle");
  updateHud();
}

function fire() {
  if (
    mode !== "playing" ||
    shotTime > 0 ||
    reloadTime > 0 ||
    transitionTime > 0 ||
    player.dodgeTime > 0 ||
    crafting
  )
    return;
  if (!player.ammo) {
    reload();
    if (!player.reserve) melee();
    return;
  }
  const weapon = equippedWeapon();
  if (!weapon) return;
  emitNoise((weapon.type === "shotgun" ? 40 : 20) * weaponStats(weapon).noise);
  weapon.loaded--;
  syncSupplies();
  const gun = ITEMS[weapon.type];
  shotTime = gun.delay / runEffects.fireRate;
  muzzleTime = 0.045;
  shake = 0;
  noiseSound(weapon.type);
  const angle = aim.active ? aim.angle : player.dir === 1 ? 0 : Math.PI,
    dx = Math.cos(angle),
    dy = Math.sin(angle);
  const origin = weaponOrigin();
  const sx = origin.x + dx * PLAYER_WEAPON.muzzle,
    sy = origin.y + dy * PLAYER_WEAPON.muzzle;
  burst(sx, sy, 4, "#f9cb70");
  particles.push({
    x: player.x,
    y: player.y - 90,
    vx: -player.dir * 60,
    vy: -115,
    life: 1.2,
    max: 1.2,
    color: "#c29e4b",
    size: 3,
    casing: true,
  });
  for (let i = 0; i < 3; i++)
    particles.push({
      x: sx,
      y: sy,
      vx: dx * rnd(8, 20),
      vy: rnd(-25, -12),
      life: rnd(0.3, 0.7),
      max: 0.7,
      color: "#a7a79c",
      size: 8 + i * 3,
      smoke: true,
    });
  const rays = traceVolley(enemies, sx, sy, angle, gun, runEffects.penetration);
  const critical =
    rays.some((ray) => ray.hits.length > 0) &&
    criticalRoll({
      ...runEffects,
      criticalChance: Math.min(
        1,
        runEffects.criticalChance + weaponStats(weapon).criticalBonus,
      ),
    });
  const victims = new Map();
  for (const ray of rays) {
    const travelTime = Math.max(
      0.08,
      ray.range / (weapon.type === "shotgun" ? 2100 : 2900),
    );
    particles.push({
      x: sx,
      y: sy,
      end: sx + ray.dx * ray.range,
      endY: sy + ray.dy * ray.range,
      life: travelTime,
      max: travelTime,
      color: weapon.type === "shotgun" ? "#e4ba70" : "#ffe0a0",
      size: weapon.type === "shotgun" ? 1.2 : 2.1,
      tracer: true,
    });
    for (const impact of ray.hits) {
      const hit = impact.enemy;
      const relative = (hit.y - impact.y) / (125 * hit.size);
      const frontArmor = hit.type === "armored" && ray.dx * hit.dir < 0;
      const falloff =
        weapon.type === "shotgun"
          ? Math.max(0.3, 1 - impact.distance / 700)
          : 1;
      const damage = shotDamage(gun.damage, runEffects, player, {
        relative,
        frontArmor,
        falloff,
        critical,
      });
      const victim = victims.get(hit) || {
        damage: 0,
        head: false,
        legs: false,
        metal: true,
        impact: { x: impact.x, y: impact.y, dir: ray.dx >= 0 ? 1 : -1 },
      };
      victim.damage += damage;
      victim.head ||= relative > 0.77;
      victim.legs ||= relative < 0.3;
      victim.metal &&= frontArmor;
      victims.set(hit, victim);
    }
  }
  // Apply once per victim, preserving one death, corpse and DNA award per zombie.
  for (const [hit, victim] of victims) {
    if (victim.legs) hit.slow = true;
    damageEnemy(hit, victim.damage, { ...victim.impact, metal: victim.metal });
    hitLabel(
      hit,
      critical
        ? victim.head
          ? "КРИТ · В ГОЛОВУ"
          : "КРИТ"
        : victim.head
          ? "В ГОЛОВУ"
          : null,
      critical,
    );
  }
  updateHud();
}
function hitLabel(enemy, label, critical = false) {
  if (!label) return;
  particles.push({
    x: enemy.x,
    y: enemy.y - 125 * enemy.size - 8,
    vx: 0,
    vy: -25,
    life: 0.5,
    max: 0.5,
    label,
    color: critical ? "#e8a16e" : "#e5c58b",
  });
}
function melee() {
  if (mode !== "playing" || shotTime > 0 || player.dodgeTime > 0 || crafting)
    return;
  if (!inventoryCount(player.inventory, "knife")) {
    notify("Нож остался в сумке. Откройте I.");
    return;
  }
  if (!spendStamina(player, 15 * equipmentStats(player).staminaCost)) {
    notify("Недостаточно выносливости для ножа.");
    return;
  }
  shotTime = 0.5;
  player.meleeTime = 0.45;
  tone(220, 0.06, "triangle");
  particles.push({
    x: player.x + player.dir * 33,
    y: player.y - 36,
    life: 0.16,
    max: 0.16,
    slash: true,
    dir: player.dir,
  });
  const critical = criticalRoll(runEffects);
  for (const e of enemies)
    if (
      e.life > 0 &&
      Math.abs(e.x - player.x) < 87 &&
      Math.abs(e.y - player.y) < 80 &&
      (e.x - player.x) * player.dir > -10
    ) {
      damageEnemy(
        e,
        knifeDamage(runEffects, player, equipmentStats(player).melee, critical),
      );
      hitLabel(e, critical ? "КРИТ" : null, critical);
    }
}
function dodge() {
  if (mode !== "playing" || transitionTime > 0 || player.y < GROUND - 1) return;
  const direction =
    (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) || player.dir;
  if (!startDodge(player, direction, equipmentStats(player).staminaCost)) {
    notify(
      player.dodgeCooldown > 0
        ? "Уклонение восстанавливается."
        : `Для уклонения нужно ${25 * equipmentStats(player).staminaCost} выносливости.`,
    );
    return;
  }
  searching = null;
  crafting = null;
  player.meleeTime = 0;
  tone(140, 0.07, "triangle", 0.012);
  updateHud();
}
function heal() {
  if (mode !== "playing") return;
  const item =
    player.inventory.find((i) => i.type === "medkit") ||
    player.inventory.find((i) => ITEMS[i.type].heal);
  if (!item) {
    notify("Нет лечебных предметов.");
    return;
  }
  notify(useInventoryItem(item.uid));
  tone(520, 0.2, "sine");
}

function grenade() {
  if (mode !== "playing" || crafting) return;
  if (!player.grenades) {
    notify("Гранат больше нет.");
    return;
  }
  consumeInventory(player.inventory, "grenade");
  syncSupplies();
  projectiles.push({
    kind: "grenade",
    x: player.x,
    y: player.y - 40,
    vx: player.dir * 300,
    vy: -280,
    timer: 1.15,
  });
  tone(300, 0.05, "triangle");
  updateHud();
}
function interactionTarget() {
  if (player.y < GROUND - 60) return null;
  const candidates = crates.map((object) => ({ type: "container", object }));
  if (scene === "corridor") {
    const mama = enemies.find(
      (e) => e.type === "mama" && e.surrender && !e.spared && e.life > 0,
    );
    if (mama) {
      const mercyTarget = {
        type: "mama",
        object: {
          x: mama.x,
          range: 95,
          bounds: { x: mama.x - 26, y: GROUND - 122, w: 52, h: 122 },
          enemy: mama,
        },
      };
      if (Math.abs(mama.x - player.x) < 65) return mercyTarget;
      candidates.push(mercyTarget);
    }
    candidates.push(...doors.map((object) => ({ type: "door", object })), {
      type: "lift",
      object: liftObject(),
    });
  } else candidates.push({ type: "exit", object: exitObject() });
  return (
    candidates
      .filter((t) => Math.abs(t.object.x - player.x) < t.object.range)
      .sort(
        (a, b) =>
          Math.abs(a.object.x - player.x) - Math.abs(b.object.x - player.x),
      )[0] || null
  );
}
function releaseContainerAmbush(crate) {
  if (crate.ambush?.status !== "pending") return false;
  if (enemies.filter((e) => e.life > 0).length >= 40) return false;
  const side = crate.ambush.side || 1;
  const enemy = makeEnemy("walker", clamp(crate.x + side * 48, 35, WORLD - 45));
  enemy.dir = -side;
  enemy.hp *= enemyHealthScale();
  enemy.life = enemy.hp;
  enemy.cooldown = 0.9;
  enemy.emergeTime = 0.35;
  rememberTarget(enemy, crate.ambush.targetX ?? crate.x, GROUND, "sound");
  enemies.push(enemy);
  crate.ambush.status = "spent";
  burst(crate.x, GROUND - 35, 14, "#9a977f");
  tone(85, 0.2, "sawtooth", 0.025);
  // Keep the time-critical trap warning visible when both risks occur together.
  if (!crates.some((c) => c.trap?.status === "warning"))
    notify("ЗАСАДА! Заражённый прятался у припасов. E — открыть контейнер.");
  return true;
}
function updateContainerTraps(dt) {
  for (const crate of crates) {
    const event = stepContainerTrap(crate.trap, dt);
    if (!event.triggered && !event.gasTicks) continue;
    const definition = TRAPS[crate.trap.type],
      factor = runEffects.trapFactor,
      damageFactor = trapDamageFactor(crate.trap.type, runEffects);
    if (event.triggered) {
      const noise =
        (crate.trap.type === "alarm"
          ? noiseThreshold(section().id) + 10
          : definition.noise) * factor;
      // A device emits its own noise, independent of the player's backpack/Ghost.
      addNoise(floorNoise, noise);
      for (const enemy of enemies) hearSound(enemy, crate.x, noise);
      burst(
        crate.x,
        GROUND - 40,
        crate.trap.type === "mine" ? 28 : 12,
        definition.color,
      );
      if (crate.trap.type === "mine") {
        particles.push({
          x: crate.x,
          y: GROUND - 25,
          life: 0.4,
          max: 0.4,
          explosion: true,
        });
        shake = 2;
      }
      tone(crate.trap.type === "alarm" ? 650 : 90, 0.22, "sawtooth", 0.035);
      notify(
        `${definition.name} · ${trapProtectionLabel(crate.trap.type) || "ловушка сработала"}. Припасы остались в контейнере.`,
      );
    }
    const pulses = (event.triggered ? 1 : 0) + event.gasTicks;
    if (
      definition.damage > 0 &&
      damageFactor > 0 &&
      Math.hypot(player.x - crate.x, player.y - GROUND) < definition.radius
    ) {
      for (let i = 0; i < pulses; i++)
        hurt(definition.damage * damageFactor, "trap");
    }
    if (mode !== "playing") return;
  }
}
function trapProtectionLabel(type) {
  if (type === "shock" && runEffects.shockResistance === 1)
    return "ЭЛЕКТРИК · ИММУНИТЕТ К ШОКУ";
  if (type === "gas" && runEffects.gasResistance === 1)
    return "РЕСПИРАТОР · ИММУНИТЕТ К ГАЗУ";
  return "";
}
function openContainer(crate) {
  if (crate.noteId && !journalNotes.has(crate.noteId)) {
    journalNotes.add(crate.noteId);
    writeJournal(progressStorage, [...journalNotes]);
    tone(490, 0.18, "triangle", 0.026);
    openJournal(crate.noteId);
    return;
  }
  openInventory(crate);
}
function finishSearch(crate) {
  if (crate.opened) return;
  crate.opened = true;
  const warning = armContainerTrap(crate.trap, runEffects.trapFactor === 0);
  const ambush = armContainerAmbush(crate.ambush);
  if (ambush) {
    crate.ambush.side = player.x <= crate.x ? 1 : -1;
    crate.ambush.targetX = player.x;
    releaseContainerAmbush(crate);
  }
  if (warning) {
    tone(760, 0.12, "square", 0.025);
    notify(
      `${ambush ? "ЗАСАДА! · " : ""}${TRAPS[crate.trap.type].name} · E — обезвредить за 0,5 секунды!`,
    );
    return;
  }
  if (ambush) {
    if (crate.ambush.status === "pending")
      notify("В КОНТЕЙНЕРЕ ЗАРАЖЁННЫЙ! · E — припасы.");
    return;
  }
  burst(crate.x, crate.bounds.y + crate.bounds.h * 0.5, 5, "#a99b7a");
  tone(430, 0.1, "triangle");
  openContainer(crate);
}

function interact() {
  if (mode !== "playing" || transitionTime > 0 || player.dodgeTime > 0) return;
  if (crafting) {
    crafting = null;
    notify("Изготовление отменено. Ресурсы сохранены.");
    return;
  }
  const target = interactionTarget();
  if (!target) {
    notify("Подойдите к мебели, двери или лифту и нажмите E.");
    return;
  }
  const { type, object } = target;
  if (type === "mama") {
    const mama = object.enemy;
    if (mama.surrender && !mama.spared && mama.life > 0) {
      mama.spared = true;
      mama.surrenderAge = 1;
      mama.alert = false;
      mama.seesPlayer = false;
      bossSupplies(mama, true);
      storyRadio?.play("mamaSpared", true);
      persistProgress();
      saveCheckpoint(true);
      tone(440, 0.25, "sine", 0.045);
    }
    return;
  }
  if (type === "container") {
    if (disarmContainerTrap(object.trap)) {
      burst(object.x, object.bounds.y, 6, "#aebd9a");
      tone(400, 0.1, "triangle");
      notify("Ловушка обезврежена. Припасы целы.");
      openContainer(object);
      return;
    }
    if (object.opened) {
      openContainer(object);
      return;
    }
    if (!searching) {
      searching = {
        id: object.id,
        remaining: searchDuration(object, runEffects.searchTime),
        duration: searchDuration(object, runEffects.searchTime),
        startX: player.x,
        heardAmount: 0,
        hearingClock: 0,
      };
      tone(160, 0.08, "triangle", 0.015);
    }
    return;
  }
  searching = null;
  if (type === "exit") {
    leaveRoom();
    return;
  }
  if (type === "door") {
    enterRoom(object);
    return;
  }
  if (type === "lift") {
    if (
      floor === 5 &&
      enemies.some((e) => e.type === "matriarch" && e.life > 0)
    ) {
      notify("Матка блокирует путь к лифту.");
      return;
    }
    if (floor === 10 && enemies.some((e) => e.type === "alpha" && e.life > 0)) {
      notify("Крикун-Альфа блокирует путь к лифту.");
      return;
    }
    if (
      floor === 15 &&
      enemies.some((e) => e.type === "carapace" && e.life > 0)
    ) {
      notify("Броненосец блокирует путь к лифту.");
      return;
    }
    if (
      floor === 20 &&
      enemies.some((e) => e.type === "chimera" && e.life > 0)
    ) {
      notify("Химера блокирует путь к лифту.");
      return;
    }
    if (
      floor === 25 &&
      enemies.some((e) => e.type === "mama" && e.life > 0 && !e.spared)
    ) {
      notify("Мама блокирует путь к лифту.");
      return;
    }
    if (
      floor === 30 &&
      enemies.some((e) => e.type === "elena" && !e.cloned && e.life > 0)
    ) {
      notify("Силуэт у лифта отвечает голосом Елены. Путь заблокирован.");
      return;
    }
    if (floor === 0) {
      if (enemies.some((e) => e.type === "boss" && e.life > 0)) {
        notify("Объект 0 блокирует эвакуацию.");
        return;
      }
      openEndingChoice();
      return;
    }
    floor = nextFloor(floor);
    recordDepth(profile, floor);
    persistProgress();
    player.hp = Math.min(player.maxHp, player.hp + 10);

    generateLevel();
    transitionTime = 0.8;
    storyRadio?.play(storyBeatForFloor(floor));
    if (floor > 0 && floor % 5 === 0) saveCheckpoint();
    notify(
      floor === 30
        ? "Рация: «Ты помнишь меня?» В коридоре отвечает тот же голос."
        : `Этаж ${floorLabel(floor)} · ${section().name}. ${floor > 0 && floor % 5 === 0 ? "Чекпоинт сохранён." : "Последний чекпоинт: " + floorLabel(checkpoint?.floor ?? 50)}`,
    );
    tone(270, 0.4, "sine");
    return;
  }
  notify("Подойдите к двери или ящику и нажмите E.");
}
function getPrompt() {
  if (crafting)
    return `ИЗГОТОВЛЕНИЕ: ${RECIPES[crafting.id].name} · ${Math.ceil(crafting.remaining * 10) / 10} с · движение / E — отмена`;
  if (searching) return "ОБЫСК…";
  const target = interactionTarget();
  if (!target) return "";
  const { type, object } = target;
  if (type === "mama") return "E · ПОЩАДИТЬ МАМУ · ИЛИ ПРОДОЛЖИТЬ БОЙ";
  if (type === "container" && object.trap?.status === "warning")
    return `ЛОВУШКА: ${TRAPS[object.trap.type].name} · E — ОБЕЗВРЕДИТЬ · ${object.trap.remaining.toFixed(2)} С${trapProtectionLabel(object.trap.type) ? " · " + trapProtectionLabel(object.trap.type) : ""}`;
  if (type === "container" && object.trap?.gasRemaining > 0)
    return `ГАЗ · ${trapProtectionLabel("gas") || "ОТОЙДИТЕ ОТ КОНТЕЙНЕРА"} · ${Math.ceil(object.trap.gasRemaining)} С · E — ПРИПАСЫ`;
  if (type === "container")
    return (
      (object.opened
        ? `E · ${object.label} · ${object.loot.length ? "ЕСТЬ ПРИПАСЫ" : "ПУСТО"}`
        : `E · ОБЫСКАТЬ: ${object.label}${object.noteId && !journalNotes.has(object.noteId) ? " · ЗАПИСЬ" : ""}`) +
      (nearWorkbench() ? " · I — изготовление" : "")
    );
  if (type === "exit") return "E · ВЕРНУТЬСЯ НА ЭТАЖ";
  if (type === "door") return `E · ВОЙТИ: ${object.name}`;
  return `E · ${floor === 51 ? "СПУСТИТЬСЯ С КРЫШИ" : floor === 0 ? "ВЫБРАТЬ ИСХОД" : "СПУСТИТЬСЯ НА ЭТАЖ " + floorLabel(nextFloor(floor))}`;
}
function update(dt) {
  elapsed += dt;
  if (mode === "dead" || mode === "won") {
    if (mode === "dead") player.deathAge = (player.deathAge || 0) + dt;
    updateDeaths(dt, false);
    return;
  }
  if (mode !== "playing") return;
  storyRadio?.update(dt);
  transitionTime = Math.max(0, transitionTime - dt);
  if (transitionTime > 0) return;
  player.reviveGrace = Math.max(0, player.reviveGrace - dt);
  const noiseEvent = stepNoise(floorNoise, dt, noiseThreshold(section().id));
  if (noiseEvent === "warning")
    notify("Шум привлёк заражённых. Через 3 секунды прибудет орда!");
  if (noiseEvent === "wave") spawnNoiseWave();
  const revivesBefore = player.revivesUsed;
  stepInfection(player, dt, runEffects.infectionResistance);
  refreshInfection();
  if (mode !== "playing" || player.revivesUsed !== revivesBefore) return;
  stepRegeneration(player, dt, runEffects.regeneration);
  updateContainerTraps(dt);
  if (mode !== "playing" || player.revivesUsed !== revivesBefore) return;
  for (const crate of crates) releaseContainerAmbush(crate);
  muzzleTime = Math.max(0, muzzleTime - dt);
  player.meleeTime = Math.max(0, (player.meleeTime || 0) - dt);
  shotTime = Math.max(0, shotTime - dt);
  hurtTime = Math.max(0, hurtTime - dt);
  shake = Math.max(0, shake - dt * 18);
  if (toastTime > 0) {
    toastTime -= dt;
    if (toastTime <= 0) $("toast").textContent = "";
  }
  if (reloadTime > 0) {
    reloadTime -= dt;
    if (reloadTime <= 0) {
      const weapon = equippedWeapon();
      if (weapon) {
        const d = ITEMS[weapon.type],
          amount = Math.min(
            weaponStats(weapon).capacity - weapon.loaded,
            inventoryCount(player.inventory, d.ammo),
          );
        consumeInventory(player.inventory, d.ammo, amount);
        weapon.loaded += amount;
        syncSupplies();
      }
      reloadTime = 0;
      updateHud();
      tone(550, 0.07, "triangle");
    }
  }
  if (flash) player.battery = Math.max(0, player.battery - dt * 0.3);
  const previousPlayerX = player.x;
  const axis =
    (keys.has("KeyD") || keys.has("ArrowRight") || held.has("right") ? 1 : 0) -
    (keys.has("KeyA") || keys.has("ArrowLeft") || held.has("left") ? 1 : 0);
  const combat =
    enemies.some(
      (e) => e.life > 0 && e.alert && Math.abs(e.x - player.x) < 450,
    ) || hurtTime > 0;
  const canMove =
    axis && player.y === GROUND && player.x > 35 && player.x < WORLD - 55;
  const gear = equipmentStats(player);
  const movement = stepSurvival(player, dt, {
    costMultiplier: gear.staminaCost,
    combat,
    sprint: !!canMove && (keys.has("ShiftLeft") || keys.has("ShiftRight")),
    busy: player.meleeTime > 0,
  });
  const moveAxis = movement.dodging ? player.dodgeDir : axis;
  player.moving = !!moveAxis;
  if (moveAxis) {
    if (!aim.active) player.dir = moveAxis;
    let nx = clamp(
      player.x +
        (movement.dodging
          ? movement.dashDistance
          : axis *
            145 *
            runEffects.moveSpeed *
            gear.speed *
            (movement.running ? 1.5 : 1) *
            dt),
      35,
      WORLD - 55,
    );
    for (const o of obstacles) {
      if (player.y > GROUND - o.h && nx + 13 > o.x && nx - 13 < o.x + o.w)
        nx = moveAxis > 0 ? o.x - 13 : o.x + o.w + 13;
    }
    player.x = nx;
  }
  camera += (cameraTarget() - camera) * Math.min(1, dt * 6);
  if (aim.active)
    player.dir = heroAimFacing(player.dir, aim.x + camera, player.x);
  const walked = player.y === GROUND ? player.x - previousPlayerX : 0;
  player.gait =
    (player.gait || 0) +
    ((Math.abs(walked) > 0.001 ? 1 : 0) - (player.gait || 0)) *
      Math.min(1, dt * 12);
  if (walked && !movement.dodging) emitNoise((movement.running ? 10 : 2) * dt);
  if (crafting) {
    if (axis || player.y < GROUND - 1 || movement.dodging || !nearWorkbench()) {
      crafting = null;
      notify("Изготовление отменено. Ресурсы сохранены.");
    } else {
      crafting.remaining -= dt;
      if (crafting.remaining <= 0) {
        const result = craftItem(
          player.inventory,
          profile,
          crafting.id,
          crafting.targetUid,
          backpackFor(player),
        );
        crafting = null;
        if (result.ok) persistProgress();
        syncSupplies();
        notify(result.message);
      }
    }
  }
  const previousStep = Math.floor((player.phase || 0) / Math.PI);
  advanceGait(player, walked * player.dir, "player");
  if (walked && Math.floor(player.phase / Math.PI) !== previousStep) {
    if (!movement.dodging) emitNoise(0, player.x, movement.running ? 5 : 1);
    burst(player.x, GROUND - 2, 2, "#8b8b7b");
    tone(65, 0.035, "triangle", 0.006);
  }
  player.walk = player.phase;
  player.moveBlend = player.gait;
  player.vy += GRAVITY * dt;
  player.y = Math.min(GROUND, player.y + player.vy * dt);
  if (player.y === GROUND) player.vy = 0;
  if (aim.active) resolvePlayerAim();
  if (searching) {
    const target = interactionTarget();
    if (
      !target ||
      target.type !== "container" ||
      target.object.id !== searching.id ||
      Math.abs(player.x - searching.startX) > 8 ||
      player.y < GROUND - 5
    )
      searching = null;
    else {
      const sound =
        (containerProfile(target.object).noise *
          runEffects.searchNoise *
          Math.min(dt, searching.remaining)) /
        searching.duration;
      emitNoise(sound, player.x, 0);
      searching.heardAmount += sound;
      searching.hearingClock += dt;
      if (searching.hearingClock >= 0.4 || searching.remaining <= dt) {
        emitNoise(0, player.x, searching.heardAmount);
        searching.heardAmount = searching.hearingClock = 0;
      }
      searching.remaining -= dt;
      if (searching.remaining <= 0) {
        finishSearch(target.object);
        searching = null;
      }
    }
  }
  if (mode !== "playing") return;
  if (keys.has("KeyF") || held.has("fire")) fire();
  for (const e of [...enemies]) updateEnemy(e, dt);
  ambientDripClock -= dt;
  if (ambientDripClock <= 0) {
    ambientDripClock = rnd(0.5, 1.3);
    for (const [x, y, kind] of sceneLayout().drips || []) {
      const b = sceneObject({ rect: [x, y, 0, 0] }).bounds;
      fluidBurst(kind, b.x, b.y, 1);
    }
  }
  for (const stain of stains) {
    stain.age += dt;
    stain.active = Math.max(0, stain.active - dt);
    if (
      stain.active > 0 &&
      Math.abs(player.x - stain.x) < stain.radius * 0.8 &&
      player.y > GROUND - 12
    )
      hurt(6);
  }
  if (
    scene === "corridor" &&
    section().id === "laboratory" &&
    player.y > GROUND - 15 &&
    sceneLayout().hazards.some((rect) => {
      const b = sceneObject({ rect }).bounds;
      return player.x > b.x && player.x < b.x + b.w;
    })
  )
    hurt(8);
  enemies = enemies.filter((e) => e.life > 0);
  updateDeaths(dt);
  for (const p of projectiles) {
    p.timer -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.kind === "grenade" ? 650 : 65) * dt;
    if (p.kind === "grenade" && p.y >= GROUND - 5) {
      p.y = GROUND - 5;
      p.vy = -Math.abs(p.vy) * 0.45;
      p.vx *= 0.65;
    }
    if (
      (p.kind === "acid" || p.kind === "echo") &&
      Math.hypot(player.x - p.x, player.y - 65 - p.y) < 24
    ) {
      hurt(p.damage || 12, p.kind === "echo" ? "bite" : "impact");
      p.timer = 0;
    }
    if (p.kind === "acid" || p.kind === "echo") {
      p.trail = (p.trail || 0) - dt;
      if (p.trail <= 0) {
        p.trail = 0.06;
        particles.push({
          x: p.x,
          y: p.y,
          vx: rnd(-8, 8),
          vy: 15,
          life: 0.35,
          max: 0.35,
          color: p.kind === "echo" ? "#67c8b9" : "#657b2c",
          size: 2,
          ...(p.kind === "echo" ? {} : { fluid: "slime" }),
        });
      }
      if (p.y >= GROUND) p.timer = 0;
    }
    if (p.timer <= 0) {
      if (p.kind === "grenade") {
        emitNoise(60, p.x);
        burst(p.x, p.y - 10, 45, "#e99c4e");
        particles.push({
          x: p.x,
          y: p.y - 15,
          life: 0.4,
          max: 0.4,
          explosion: true,
        });
        shake = 3;
        tone(55, 0.35, "sawtooth", 0.1);
        for (const e of enemies)
          if (Math.hypot(e.x - p.x, e.y - 35 - p.y) < 190)
            damageEnemy(e, 180 * berserkFactor(runEffects, player), {
              sourceX: p.x,
              sourceY: p.y,
            });
        if (Math.hypot(player.x - p.x, player.y - 65 - p.y) < 90) hurt(20);
      } else if (p.kind === "echo") {
        burst(p.x, Math.min(p.y, GROUND - 4), 10, "#69cfc2");
        tone(280, 0.08, "sine", 0.012);
      } else {
        fluidBurst("slime", p.x, Math.min(p.y, GROUND - 3), 10);
        particles.push({
          x: p.x,
          y: Math.min(p.y, GROUND - 12),
          life: 0.45,
          max: 0.45,
          acidSplash: true,
        });
        addStain("slime", p.x, 27, 5);
      }
    }
  }
  projectiles = projectiles.filter((p) => p.timer > 0);
  for (const p of particles) {
    p.life -= dt;
    if (!p.tracer && !p.slash && !p.ring && !p.explosion && !p.acidSplash) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.smoke ? -12 : 420) * dt;
      if (p.chunk) {
        p.rotation += p.spin * dt;
        if (p.y >= GROUND - 2) {
          p.y = GROUND - 2;
          if (!p.settled) {
            addStain("blood", p.x, p.size * 2);
            p.settled = true;
          }
          p.vx *= Math.exp(-12 * dt);
          p.vy = 0;
          p.spin = 0;
        }
      }
      if (p.fluid && p.y >= GROUND) {
        if (p.fluid !== "water") addStain(p.fluid, p.x, p.size * 3);
        p.life = 0;
      }
      if (p.casing && p.y > GROUND - 2) {
        p.y = GROUND - 2;
        p.vy = -Math.abs(p.vy) * 0.35;
        p.vx *= 0.6;
      }
    }
  }
  particles = particles.filter((p) => p.life > 0).slice(-450);
  const prompt = getPrompt();
  $("prompt").textContent = prompt;
  $("prompt").style.display = prompt ? "block" : "none";
  updateHud();
}

// Generated atlases are shared by the server and the self-contained HTML build.
const art = {};
const artSources =
  globalThis.EMBEDDED_GAME_ART ||
  Object.fromEntries(
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
      "ammo_variants",
      "weapon_icons",
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
    ].map((name) => [name, `/assets/${name}.png`]),
  );
const artReady = Promise.all(
  Object.entries(artSources).map(
    ([key, src]) =>
      new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          art[key] = image;
          resolve(true);
        };
        image.onerror = () => resolve(false);
        image.src = src;
      }),
  ),
);
function atlasRect(name, index) {
  const image = art[name];
  if (!image) return null;
  const w = image.width / 2,
    h = image.height / 2;
  const ground = name === "environments" ? (index < 2 ? 390 : 351) : h * 0.82;
  return [(index % 2) * w, Math.floor(index / 2) * h, w, h, ground];
}
const backgroundCache = new Map();
function quietBackground(name, index) {
  const key = `${name}:${index}`;
  if (backgroundCache.has(key)) return backgroundCache.get(key);
  const r = atlasRect(name, index);
  if (!r) return null;
  const [sx, sy, sw, sh, ground] = r;
  const buffer = document.createElement("canvas");
  buffer.width = sw;
  buffer.height = sh;
  const paint = buffer.getContext("2d");
  paint.imageSmoothingEnabled = true;
  paint.imageSmoothingQuality = "high";
  paint.filter = "blur(.55px) saturate(.58) contrast(.82) brightness(.88)";
  paint.drawImage(art[name], sx, sy, sw, sh, 0, 0, sw, sh);
  paint.filter = "none";
  paint.fillStyle = "#14202e24";
  paint.fillRect(0, 0, sw, sh);
  const result = { image: buffer, ground, width: sw, height: sh };
  backgroundCache.set(key, result);
  return result;
}
function panel(name, index, x, width) {
  const backdrop = quietBackground(name, index);
  if (!backdrop) return false;
  const scale = width / backdrop.width;
  ctx.drawImage(
    backdrop.image,
    x,
    GROUND - backdrop.ground * scale,
    width,
    backdrop.height * scale,
  );
  return true;
}
function sceneBackdrop(layout) {
  const key = `${activeLayoutId}:floor-${art.floor_surfaces ? "painted" : "fallback"}`;
  if (backgroundCache.has(key)) return backgroundCache.get(key);
  if (!art[layout.art]) return null;
  const [sx, sy, sw, sh] = layout.crop;
  const buffer = document.createElement("canvas");
  buffer.width = sw;
  buffer.height = sh;
  const paint = buffer.getContext("2d");
  paintLevelBackdrop(paint, art, layout);
  const projected = document.createElement("canvas");
  projected.width = sw;
  projected.height = sceneDepth(layout, GROUND).height;
  projectFloorPainting(
    projected.getContext("2d"),
    buffer,
    layout,
    GROUND,
    art.floor_surfaces,
  );
  backgroundCache.set(key, projected);
  if (backgroundCache.size > 12)
    backgroundCache.delete(backgroundCache.keys().next().value);
  return projected;
}
function objectLabel(object, label, color = "#9eaaa8") {
  const b = object.bounds,
    x = object.x - camera,
    y = b.y - 10;
  if (x < -120 || x > viewW + 120) return;
  text(label, x, y, color, 8, "center");
}
function generatedEnvironment() {
  rect(0, 0, viewW, 540, "#090f14");
  if (mode === "intro") {
    panel("environments", 0, (viewW - 1040) / 2, 1040);
    return true;
  }
  const layout = sceneLayout(),
    background = sceneBackdrop(layout),
    { scale, rear } = sceneDepth(layout, GROUND);
  const ceiling = ctx.createLinearGradient(0, 0, 0, 130);
  ceiling.addColorStop(0, "#101a22");
  ceiling.addColorStop(1, "#080e13");
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, viewW, 130);
  // Exactly one painting, rendered once. The same transform places every hotspot.
  if (background)
    ctx.drawImage(
      background,
      -camera,
      rear - layout.ground * scale,
      WORLD,
      background.height * scale,
    );
  else {
    rect(-camera, GROUND - 210, WORLD, 210, "#172129");
    rect(-camera, GROUND, WORLD, 15, "#374149");
  }
  drawDistantWindows(
    ctx,
    art,
    (layout.windows || []).map((rect) => sceneObject({ rect }).bounds),
    camera,
    elapsed,
    WORLD,
    layout.id,
  );
  drawFloorDepth(ctx, WORLD, GROUND, camera, viewW, rear, !!art.floor_surfaces);
  drawForegroundDressing(
    ctx,
    art,
    layout,
    floor,
    camera,
    GROUND,
    player.x,
    viewW,
    "back",
  );
  drawInteriorAmbience(
    ctx,
    layout.zone,
    floor,
    elapsed,
    camera,
    WORLD,
    GROUND,
    viewW,
  );
  drawWindowWeather(
    ctx,
    layout.zone === "roof"
      ? [{ x: 0, y: 0, w: WORLD, h: GROUND }]
      : (layout.windows || []).map((rect) => sceneObject({ rect }).bounds),
    elapsed,
    camera,
    floor,
  );
  drawSceneLighting(
    ctx,
    (layout.lights || []).map((l) => ({ ...l, ...sceneObject(l) })),
    crates,
    GROUND,
    camera,
    WORLD,
    elapsed,
    floor,
    layout.tone || 0,
    layout.zone,
  );
  const target = interactionTarget();
  for (const c of crates) {
    const b = c.bounds;
    if (c.portable) {
      if (art.backpacks) {
        drawContactShadow(ctx, c.x - camera, GROUND, 0.75);
        ctx.save();
        ctx.filter = "brightness(.78) saturate(.7)";
        ctx.drawImage(
          art.backpacks,
          0,
          0,
          art.backpacks.width / 3,
          art.backpacks.height / 2,
          b.x - camera - 5,
          GROUND - 36,
          b.w + 10,
          36,
        );
        ctx.restore();
      }
      text("◆ ПРИПАСЫ", c.x - camera, b.y - 9, "#c4b789", 8, "center");
    }
    if (c.trap?.status === "warning") {
      text(
        `! ${TRAPS[c.trap.type].name} · E`,
        c.x - camera,
        b.y - 18,
        "#e2ad74",
        10,
        "center",
      );
      rect(c.x - camera - 30, b.y - 10, 60, 4, "#302522");
      rect(c.x - camera - 30, b.y - 10, 120 * c.trap.remaining, 4, "#d9a16b");
    }
    if (c.trap?.gasRemaining > 0) {
      ctx.save();
      ctx.filter = "sepia(1) saturate(2) hue-rotate(25deg) brightness(1.5)";
      for (let i = 0; i < 3; i++)
        vfxSprite(
          8 + ((Math.floor(elapsed * 5) + i) % 4),
          c.x - camera - 60 + i * 60,
          GROUND - 35 - (i % 2) * 22,
          110,
          85,
          0.45 * Math.min(1, c.trap.gasRemaining),
        );
      ctx.restore();
    }
    if (c.trap?.gasRemaining > 0)
      text(
        `ГАЗ · ${Math.ceil(c.trap.gasRemaining)} С · ${runEffects.gasResistance === 1 ? "ЗАЩИТА" : "ОТОЙДИТЕ"}`,
        c.x - camera,
        b.y - 18,
        "#c2cc8e",
        9,
        "center",
      );
    if (c.opened && c.trap?.status !== "warning")
      text("✓", b.x + b.w - camera - 7, b.y + 12, "#93a197", 9, "center");
    if (searching?.id === c.id) {
      const progress = 1 - searching.remaining / searching.duration;
      rect(c.x - camera - 25, b.y - 9, 50, 3, "#253133");
      rect(c.x - camera - 25, b.y - 9, 50 * progress, 3, "#c0ad7d");
    }
  }
  if (scene === "corridor") {
    for (const d of doors) {
      const state = roomStates.get(d.id),
        cleared = state && !state.enemies.some((e) => e.life > 0);
      objectLabel(
        d,
        d.name +
          (cleared ? " ✓" : "") +
          (target?.type === "door" && target.object.id === d.id ? " · E" : ""),
        "#8d9d9c",
      );
    }
    const lift = liftObject();
    objectLabel(
      lift,
      floor === 51
        ? "ЛЕСТНИЦА · ЭТАЖ 50"
        : floor === 0
          ? "ЭВАКУАЦИОННЫЙ ШЛЮЗ"
          : `ЛИФТ · ${floorLabel(floor)} → ${floorLabel(nextFloor(floor))}`,
    );
  } else objectLabel(exitObject(), "ВЫХОД НА ЭТАЖ");
  if (target) {
    const b = target.object.bounds;
    ctx.save();
    ctx.strokeStyle =
      target.type === "container" && target.object.opened
        ? "#81918566"
        : "#c4b48b99";
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x - camera - 2, b.y - 2, b.w + 4, b.h + 4);
    ctx.restore();
    if (target.type === "mama")
      objectLabel(target.object, "E · ПОЩАДИТЬ МАМУ", "#c9b79b");
    if (!searching && target.type === "container")
      objectLabel(
        target.object,
        target.object.label +
          " · " +
          (target.object.trap?.status === "warning"
            ? "ЛОВУШКА · E"
            : target.object.opened
              ? target.object.loot.length
                ? "ПРИПАСЫ · E"
                : "ПУСТО"
              : "E"),
        "#c8bb9b",
      );
  }
  for (const r of layout.hazards) {
    const b = sceneObject({ rect: r }).bounds;
    acidSprite(
      8 + (Math.floor(elapsed * 6) % 4),
      b.x + b.w / 2 - camera,
      b.y - 5,
      b.w,
      30,
      0,
      0.7,
    );
    glow(b.x + b.w / 2 - camera, b.y, b.w * 0.5, "#a8cf3419");
  }
  for (let i = 0; i < 12; i++) {
    const x =
      ((hash(i + 81) * WORLD + elapsed * (1 + (i % 3))) % WORLD) - camera;
    rect(x, 180 + hash(i + 12) * 200, 1, 1, "#c1c0ab25");
  }
  return true;
}
function generatedHuman(x, y, dir, phase, type, hit, actor = null) {
  spriteAnimator ||= createSpriteAnimator(ctx, art);
  const data = actor || {
    ...(type === "player" ? player : {}),
    type,
    phase,
    moveBlend: type === "player" ? player.gait || 0 : 0.6,
  };
  if (
    spriteAnimator.draw(data, {
      type,
      x,
      y,
      dir,
      size: type === "player" ? 1 : enemyTypes[type].size,
      time: elapsed,
      aimAngle: aim.active ? aim.angle : dir === 1 ? 0 : Math.PI,
      weapon: type === "player" ? equippedWeapon()?.type || "none" : null,
      reload: type === "player" ? reloadTime : 0,
      shot: type === "player" ? shotTime : 0,
      melee: type === "player" ? player.meleeTime || 0 : 0,
      airborne: type === "player" && player.y < GROUND - 1,
      hit,
    })
  )
    return true;
  return false;
}
function vfxSprite(index, x, y, w, h, alpha = 1) {
  if (!art.vfx) return;
  const cw = art.vfx.width / 4,
    ch = art.vfx.height / 4;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(
    art.vfx,
    (index % 4) * cw,
    Math.floor(index / 4) * ch,
    cw,
    ch,
    x - w / 2,
    y - h / 2,
    w,
    h,
  );
  ctx.restore();
}
function acidSprite(index, x, y, w, h, angle = 0, alpha = 1) {
  if (!art.acid) return;
  const cw = art.acid.width / 4,
    ch = art.acid.height / 3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(
    art.acid,
    (index % 4) * cw,
    Math.floor(index / 4) * ch,
    cw,
    ch,
    index < 4 ? -w * 0.7 : -w / 2,
    -h / 2,
    w,
    h,
  );
  ctx.restore();
}
function drawStains() {
  for (const s of stains) {
    const spread = Math.min(1, s.age * 3 + 0.4);
    vfxSprite(
      (s.kind === "blood" ? 0 : 4) + s.variant,
      s.x - camera,
      GROUND + 2,
      s.radius * 2 * spread,
      13 * spread,
      s.kind === "blood" ? 0.68 : 0.7,
    );
    if (s.active > 0) {
      const strength = Math.min(1, s.active);
      ctx.save();
      ctx.translate(s.x - camera, GROUND + 7);
      ctx.scale(s.radius, 9);
      const pool = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1);
      pool.addColorStop(0, `rgba(139, 165, 43, ${0.6 * strength})`);
      pool.addColorStop(0.72, `rgba(93, 118, 31, ${0.4 * strength})`);
      pool.addColorStop(1, `rgba(40, 63, 18, ${0.12 * strength})`);
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(185, 204, 73, ${0.48 * strength})`;
      ctx.lineWidth = 0.09;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.filter = "brightness(1.22) saturate(.78)";
      acidSprite(
        8 + (Math.floor(elapsed * 7) % 4),
        s.x - camera,
        GROUND - 8,
        s.radius * 2,
        35,
        0,
        0.86 * strength,
      );
      ctx.restore();
      const bubble = 1 + Math.sin(elapsed * 5 + s.x) * 0.2;
      glow(s.x - camera, GROUND, 16 * bubble, "#a9b83c20");
    }
  }
}
function drawSetDressingStains() {
  if (!art.vfx) return;
  const layout = sceneLayout();
  const scale = layout.width / layout.crop[2];
  const furniture = layout.containers || [];
  if (!furniture.length) return;
  const room = layout.id.includes("-room-");
  const aftermath =
    layout.encounter === "swarm" ? 2 : layout.encounter === "ambush" ? 1 : 0;
  const count = room
    ? 1
    : Math.min(8, Math.max(2, Math.round(layout.width / 370)) + aftermath);
  const acid = ["laboratory", "infirmary", "bunker"].includes(layout.zone);
  ctx.save();
  ctx.filter = "brightness(.65) saturate(.73)";
  for (let i = 0; i < count; i++) {
    const object =
      furniture[(i * 3 + floor + furniture.length) % furniture.length];
    const offset = ((floor * 37 + i * 67) % 83) - 41;
    const x = (object.rect[0] + object.rect[2] * 0.5) * scale + offset;
    if (x - camera < -60 || x - camera > viewW + 60) continue;
    const radius = 29 + ((floor + i * 11) % 23);
    vfxSprite(
      (acid ? 4 : 0) + ((floor + i) % 4),
      x - camera,
      GROUND + 8 + (i % 3) * 7,
      radius,
      11 + (i % 2) * 3,
      layout.zone === "roof" ? 0.2 : acid ? 0.37 : 0.32,
    );
  }
  ctx.restore();
}
function drawSetDressingBodies() {
  if (floor !== 51 || scene !== "corridor" || !art.death_walker) return;
  const x = WORLD * 0.28;
  if (x - camera < -110 || x - camera > viewW + 110) return;
  ctx.save();
  ctx.filter = "brightness(.66) saturate(.72)";
  ctx.globalAlpha = 0.9;
  drawContactShadow(ctx, x - camera, GROUND, 0.9);
  generatedHuman(x - camera, GROUND, 1, 0, "walker", 0, {
    type: "walker",
    deathAge: 4,
    dir: 1,
    phase: 0,
    moveBlend: 0,
  });
  ctx.restore();
}
function drawAtmosphere() {
  if (mode === "intro") return;
  if (sceneIsDark()) {
    const px = player.x - camera,
      py = player.y - 55;
    const radius = flash && player.battery > 0 ? 320 : 95;
    const light = ctx.createRadialGradient(px, py, 35, px, py, radius);
    light.addColorStop(0, "#02040a10");
    light.addColorStop(
      0.65,
      flash && player.battery > 0 ? "#02040a66" : "#02040acc",
    );
    light.addColorStop(1, "#02040ae8");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, viewW, 540);
  }
  const boss = enemies.find(
    (e) =>
      [
        "boss",
        "matriarch",
        "alpha",
        "carapace",
        "chimera",
        "mama",
        "elena",
      ].includes(e.type) &&
      e.life > 0 &&
      !e.spared &&
      !e.cloned,
  );
  if (boss) {
    const w = Math.min(360, viewW * 0.5),
      x = (viewW - w) / 2;
    rect(x, 43, w, 7, "#171e27");
    rect(
      x,
      43,
      (w * boss.life) / boss.hp,
      7,
      boss.surrender ? "#a98a58" : "#9d2929",
    );
    text(
      boss.surrender ? "МАМА · СДАЁТСЯ" : boss.name,
      viewW / 2,
      34,
      boss.surrender ? "#d5bd90" : "#cc7f73",
      11,
      "center",
    );
    if (boss.type === "chimera") {
      const names = {
        fast: "БЫСТРАЯ",
        armored: "БРОНЯ",
        acidic: "КИСЛОТА",
        regenerative: "РЕГЕНЕРАЦИЯ",
      };
      text(
        boss.mutations.map((kind) => names[kind]).join(" · "),
        viewW / 2,
        65,
        "#a8c494",
        10,
        "center",
      );
    }
    if (boss.type === "mama" && boss.surrender)
      text(
        "E РЯДОМ — ПОЩАДИТЬ · ВЫСТРЕЛ — ДОБИТЬ",
        viewW / 2,
        65,
        "#d5bd90",
        10,
        "center",
      );
  }
  if (aim.active && mode === "playing") {
    const x = aim.x,
      y = aim.y;
    ctx.strokeStyle = muzzleTime > 0 ? "#f5ce7a" : "#c3d3cc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    for (const d of [-1, 1]) {
      line(x + d * 9, y, x + d * 14, y, "#c3d3cc");
      line(x, y + d * 9, x, y + d * 14, "#c3d3cc");
    }
    rect(x - 1, y - 1, 2, 2, "#b3352c");
  }
}

// Lightweight fallback while the generated art is loading.
function city() {
  const sky = ctx.createLinearGradient(0, 0, 0, 430);
  sky.addColorStop(0, "#080f1c");
  sky.addColorStop(0.55, "#172538");
  sky.addColorStop(0.82, "#773b32");
  sky.addColorStop(1, "#b65a32");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, 540);
  glow(viewW * 0.77, 304, 210, "#bd52292a");
  for (let i = 0; i < 28; i++) {
    const x =
        ((((i * 96 - camera * 0.07) % (viewW + 180)) + viewW + 180) %
          (viewW + 180)) -
        90,
      y = 35 + hash(i + 9) * 190;
    rect(x, y, 90 + hash(i) * 150, 5 + hash(i + 3) * 13, "#111d2c");
    rect(x + 15, y + 10, 150, 7, "#101b29");
  }
  for (let layer = 0; layer < 3; layer++) {
    const step = layer === 0 ? 43 : layer === 1 ? 63 : 95,
      par = 0.09 + layer * 0.1;
    for (let i = -2; i < Math.ceil((viewW + camera * par) / step) + 3; i++) {
      const seed = i + layer * 111,
        x = i * step - camera * par,
        h = 65 + hash(seed + 4) * (115 + layer * 35),
        y = 408 - h,
        w = step - 6;
      rect(
        x,
        y,
        w,
        h + 35,
        layer === 0 ? "#25303a" : layer === 1 ? "#18242d" : "#101b25",
      );
      rect(x + 3, y + 4, w - 6, 3, "#32404a");
      if (hash(seed + 54) > 0.6) {
        rect(x + w / 2, y - 26, 2, 26, "#233543");
        rect(x + w / 2 - 2, y - 26, 5, 3, "#d33c2b");
        if (Math.sin(elapsed * 2 + seed) > 0)
          glow(x + w / 2, y - 25, 12, "#f0242444");
      }
      for (let row = 0; row < h / 11 - 1; row++)
        for (let col = 0; col < w / 9 - 1; col++) {
          const r = hash(seed * 50 + row * 13 + col);
          if (r > 0.42)
            rect(
              x + 5 + col * 9,
              y + 10 + row * 11,
              3,
              5,
              r > 0.92 ? "#d89b53" : r > 0.82 ? "#a16c3b" : "#36434b",
            );
        }
      if (hash(seed + 70) > 0.55 && layer > 0) {
        const fx = x + w * 0.6;
        for (let j = 0; j < 5; j++) {
          const fh = 35 + hash(seed + j + Math.floor(elapsed * 9)) * 85;
          rect(fx + j * 4 - 10, 408 - fh, 5, fh, "#c74f24");
          rect(fx + j * 4 - 8, 415 - fh * 0.6, 3, fh * 0.6, "#ed9c39");
        }
        glow(fx, 367, 95, "#ef702b40");
        for (let j = 0; j < 5; j++) {
          const sy = (elapsed * 15 + j * 24) % 170;
          rect(
            fx - 15 + Math.sin(sy * 0.04) * 16,
            335 - sy,
            35 + sy * 0.16,
            24,
            "#111720bb",
          );
        }
      }
    }
  }
  for (let i = 0; i < 16; i++) {
    const x = (hash(i + 25) * viewW + elapsed * 9) % (viewW + 10),
      y = 360 - ((elapsed * 25 + hash(i) * 300) % 300);
    rect(x, y, 2, 2, "#d66a3655");
  }
}
function environment() {
  generatedEnvironment();
}
function human(x, y, dir, phase, type = "player", hit = 0, actor = null) {
  if (generatedHuman(x, y, dir, phase, type, hit, actor)) return;
  // Whole-sprite fallback only while animation art is loading; no runtime body cuts.
  if (!art.sprites) return;
  const index = {
      player: 0,
      walker: 4,
      runner: 8,
      brute: 9,
      screamer: 10,
      spitter: 11,
      armored: 12,
      boss: 12,
      matriarch: 9,
      alpha: 10,
      carapace: 12,
      chimera: 9,
      mama: 10,
      elena: 10,
    }[type],
    cell = art.sprites.width / 4,
    size = 135 * (type === "player" ? 1 : enemyTypes[type].size);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.drawImage(
    art.sprites,
    (index % 4) * cell,
    Math.floor(index / 4) * cell,
    cell,
    cell,
    -size / 2,
    -size * 0.985,
    size,
    size,
  );
  ctx.restore();
}
function renderLootPreview() {
  const target =
    mode === "playing" && transitionTime <= 0 && !searching && !crafting
      ? interactionTarget()
      : null;
  const crate = target?.type === "container" ? target.object : null;
  const content =
    crate?.trap?.status === "warning" || crate?.trap?.gasRemaining > 0
      ? ""
      : containerPreview(crate, runEffects.inspection);
  const panel = $("loot-preview"),
    body = $("loot-preview-content");
  panel.hidden = !content;
  if (body.textContent !== content) {
    body.textContent = content;
    body.scrollTop = 0;
  }
  const action = content
    ? `E — ${crate.opened ? "открыть" : "обыскать"} · осмотр не обезвреживает ловушки`
    : "";
  if ($("loot-preview-action").textContent !== action)
    $("loot-preview-action").textContent = action;
}
function render() {
  renderLootPreview();
  const searchPanel = $("search-progress");
  searchPanel.hidden = !searching || mode !== "playing";
  if (!searchPanel.hidden) {
    const value = Math.max(
      0,
      Math.min(
        100,
        Math.round((1 - searching.remaining / searching.duration) * 100),
      ),
    );
    $("search-fill").style.width = `${value}%`;
    $("search-percent").textContent = `${value}%`;
    searchPanel.setAttribute("aria-valuenow", String(value));
  }
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.globalAlpha = 1;
  if (!art.environments) city();
  ctx.save();
  if (cameraShake && shake > 0 && mode === "playing")
    ctx.translate(
      Math.sin(elapsed * 37) * shake * 0.4,
      Math.sin(elapsed * 29) * shake * 0.2,
    );
  environment();
  drawSetDressingStains();
  drawSetDressingBodies();
  drawStains();
  for (const c of corpses) {
    if (c.type === "brute" && c.exploded) continue;
    drawContactShadow(ctx, c.x - camera, GROUND, c.size);
    ctx.save();
    if (c.type === "brute") {
      const pulse = Math.pow(Math.sin(c.deathAge * 25), 2);
      ctx.filter = `brightness(${1 + pulse * 0.45}) sepia(${pulse * 0.35})`;
    }
    human(c.x - camera, c.y, c.dir, c.phase, c.type, 0, c);
    ctx.restore();
  }
  for (const e of enemies) {
    if (e.x - camera < -80 || e.x - camera > viewW + 80) continue;
    drawContactShadow(ctx, e.x - camera, GROUND, e.size);
    ctx.save();
    if (e.cloned) {
      ctx.globalAlpha = 0.47 + 0.08 * Math.sin(elapsed * 13 + e.x);
      ctx.filter = "hue-rotate(110deg) saturate(1.35)";
    }
    if (e.emergeTime > 0) {
      ctx.beginPath();
      ctx.rect(0, 0, viewW, GROUND);
      ctx.clip();
      ctx.globalAlpha = 1 - (e.emergeTime / 0.35) * 0.35;
      ctx.translate(0, (e.emergeTime / 0.35) * 20);
    }
    human(e.x - camera, e.y, e.dir, e.phase, e.type, e.hit, e);
    ctx.restore();
    if (e.type === "mama" && e.spared)
      text("ПОЩАЖЕНА", e.x - camera, e.y - 90 * e.size, "#d5bd90", 9, "center");
    if (["chase", "investigate", "search"].includes(e.brain)) {
      text(
        e.seesPlayer ? "!" : "?",
        e.x - camera,
        e.y - 145 * e.size,
        e.seesPlayer ? "#dba086" : "#c0b784",
        13,
        "center",
      );
    }
    if (e.life < e.hp && !e.spared && !e.cloned) {
      rect(e.x - camera - 17, e.y - 132 * e.size, 34, 3, "#1c1b1d");
      rect(
        e.x - camera - 17,
        e.y - 132 * e.size,
        (34 * e.life) / e.hp,
        3,
        "#9b4434",
      );
    }
  }
  if (flash && player.battery > 0) {
    const px = player.x - camera,
      py = player.y - 90;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(aim.active ? aim.angle : player.dir === 1 ? 0 : Math.PI);
    ctx.globalCompositeOperation = "screen";
    const cone = ctx.createLinearGradient(0, 0, 330, 0);
    cone.addColorStop(0, "#eddaa516");
    cone.addColorStop(1, "#eddaa500");
    poly(
      [
        [8, -4],
        [330, -150],
        [330, 150],
        [8, 4],
      ],
      cone,
    );
    ctx.restore();
  }

  if (player.dodgeTime > 0) {
    for (const offset of [34, 18]) {
      ctx.save();
      ctx.globalAlpha = offset === 34 ? 0.07 : 0.14;
      human(
        player.x - camera - player.dodgeDir * offset,
        player.y,
        player.dir,
        player.walk,
        "player",
        0,
        player,
      );
      ctx.restore();
    }
  }
  drawContactShadow(ctx, player.x - camera, GROUND, 1, GROUND - player.y);
  human(
    player.x - camera,
    player.y,
    player.dir,
    player.walk,
    "player",
    Math.max(0, hurtTime - 0.55),
    player,
  );
  if (
    equippedWeapon()?.attachments?.rail === "laser" &&
    mode !== "dead" &&
    mode !== "won" &&
    !player.meleeTime &&
    !reloadTime
  ) {
    const origin = weaponOrigin(),
      angle = aim.active ? aim.angle : player.dir === 1 ? 0 : Math.PI,
      dx = Math.cos(angle),
      dy = Math.sin(angle),
      sx = origin.x + dx * PLAYER_WEAPON.muzzle,
      sy = origin.y + dy * PLAYER_WEAPON.muzzle,
      hit = traceShot(enemies, sx, sy, dx, dy)[0],
      endX = hit?.x ?? sx + dx * 760,
      endY = hit?.y ?? sy + dy * 760;
    line(sx - camera, sy, endX - camera, endY, "#d85e5e45");
    if (hit) glow(endX - camera, endY, 4, "#f0747466");
  }
  if (muzzleTime > 0) {
    const angle = aim.active ? aim.angle : player.dir === 1 ? 0 : Math.PI,
      x = weaponOrigin().x - camera + Math.cos(angle) * PLAYER_WEAPON.muzzle,
      y = weaponOrigin().y + Math.sin(angle) * PLAYER_WEAPON.muzzle;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    poly(
      [
        [0, -3],
        [18, -8],
        [11, 0],
        [24, 3],
        [0, 4],
      ],
      "#ffe7a1",
    );
    ctx.restore();
    glow(x, y, 30, "#e8b86628");
  }
  for (const p of projectiles) {
    if (p.kind === "acid" || p.kind === "echo") {
      const echo = p.kind === "echo";
      if (p.y < GROUND && p.vy > 0) {
        const fall =
          (Math.sqrt(p.vy * p.vy + 130 * (GROUND - p.y)) - p.vy) / 65;
        const landingX = p.x + p.vx * fall - camera;
        if (landingX > -36 && landingX < viewW + 36) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(landingX, GROUND + 7, 24, 7, 0, 0, Math.PI * 2);
          ctx.fillStyle = echo ? "#69cfc222" : "#9fbb3522";
          ctx.fill();
          ctx.strokeStyle = echo ? "#83e2d166" : "#c0dc5266";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.save();
      if (echo) ctx.filter = "hue-rotate(90deg) saturate(1.5)";
      acidSprite(
        Math.floor(elapsed * 12) % 4,
        p.x - camera,
        p.y,
        64,
        32,
        Math.atan2(p.vy, p.vx),
      );
      ctx.restore();
      glow(p.x - camera, p.y, 18, echo ? "#69cfc230" : "#a8c53e20");
    } else rect(p.x - camera - 3, p.y - 4, 7, 8, "#8a985c");
  }
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    if (p.acidSplash) {
      acidSprite(
        4 + Math.min(3, Math.floor((1 - p.life / p.max) * 4)),
        p.x - camera,
        p.y,
        85,
        85,
        0,
        ctx.globalAlpha,
      );
    } else if (p.chunk) {
      ctx.save();
      ctx.translate(p.x - camera, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = "#491b16";
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.65);
      ctx.fillStyle = "#827443";
      ctx.fillRect(-p.size / 3, -p.size / 3, p.size * 0.5, p.size * 0.22);
      ctx.restore();
    } else if (p.fluid) {
      line(
        p.x - camera,
        p.y,
        p.x - camera - p.vx * 0.015,
        p.y - p.vy * 0.015,
        p.color,
        p.size,
      );
      rect(
        p.x - camera,
        p.y,
        p.size * 0.6,
        p.size * 0.6,
        p.fluid === "blood" ? "#b85b4233" : "#cedb8955",
      );
    } else if (p.tracer) {
      const progress = 1 - p.life / p.max;
      const distance = Math.hypot(p.end - p.x, (p.endY ?? p.y) - p.y);
      const tail = Math.max(0, progress - 46 / Math.max(1, distance));
      const ex = p.x + (p.end - p.x) * progress,
        ey = p.y + ((p.endY ?? p.y) - p.y) * progress;
      line(
        p.x + (p.end - p.x) * tail - camera,
        p.y + ((p.endY ?? p.y) - p.y) * tail,
        ex - camera,
        ey,
        p.color,
        p.size,
      );
      glow(ex - camera, ey, p.size * 4, "#ffd58755");
    } else if (p.slash) {
      ctx.strokeStyle = "#c5d5dc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x - camera, p.y, 31, -1.2, 1.1);
      ctx.stroke();
    } else if (p.ring) {
      ctx.strokeStyle = "#b79d98";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x - camera, p.y, (1 - p.life / p.max) * 150, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.explosion) {
      const progress = 1 - p.life / p.max;
      if (p.organic) {
        const image = art.brute_burst;
        const frame = Math.min(7, Math.floor(progress * 8));
        const w = image.width / 4,
          h = image.height / 2;
        ctx.globalAlpha = 1 - Math.max(0, progress - 0.7) / 0.3;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, viewW, GROUND);
        ctx.clip();
        // The initial burst's core is at (192, 375) in a 384×512 cell.
        // Anchor that core to the corpse belly instead of the image bottom.
        ctx.drawImage(
          image,
          (frame % 4) * w,
          Math.floor(frame / 4) * h,
          w,
          h,
          p.x - camera - p.size / 2,
          p.y - p.size * (375 / 384),
          p.size,
          (p.size * h) / w,
        );
        ctx.restore();
      } else {
        vfxSprite(
          12 + Math.min(3, Math.floor(progress * 4)),
          p.x - camera,
          p.y,
          170,
          170,
          1 - progress * 0.7,
        );
        glow(p.x - camera, p.y, 70, "#d9a14128");
      }
    } else if (p.label) text(p.label, p.x - camera, p.y, p.color, 9, "center");
    else if (p.smoke) {
      ctx.globalAlpha *= 0.25;
      vfxSprite(
        8 + Math.min(3, Math.floor((1 - p.life / p.max) * 4)),
        p.x - camera,
        p.y,
        p.size * 3,
        p.size * 3,
        0.65,
      );
    } else rect(p.x - camera, p.y, p.size, p.size, p.color);
  }
  ctx.globalAlpha = 1;
  if (mode !== "intro")
    drawForegroundDressing(
      ctx,
      art,
      sceneLayout(),
      floor,
      camera,
      GROUND,
      player.x,
      viewW,
    );
  ctx.restore();
  if (mode !== "intro") {
    const edge = (viewW * (1 - equipmentStats(player).view)) / 2;
    if (edge > 0) {
      const left = ctx.createLinearGradient(0, 0, edge + 18, 0);
      left.addColorStop(0, "#05080b");
      left.addColorStop(edge / (edge + 18), "#05080b");
      left.addColorStop(1, "#05080b00");
      ctx.fillStyle = left;
      ctx.fillRect(0, 0, edge + 18, 540);
      const right = ctx.createLinearGradient(viewW - edge - 18, 0, viewW, 0);
      right.addColorStop(0, "#05080b00");
      right.addColorStop(18 / (edge + 18), "#05080b");
      right.addColorStop(1, "#05080b");
      ctx.fillStyle = right;
      ctx.fillRect(viewW - edge - 18, 0, edge + 18, 540);
    }
  }
  if (mode === "intro") {
    for (let i = 0; i < 95; i++) {
      const x = (hash(i) * viewW - elapsed * 75 + viewW * 100) % viewW,
        y = (hash(i + 900) * 540 + elapsed * 340) % 540;
      line(x, y, x - 4, y + 12, "#a1bdce20");
    }
  }
  rect(0, 0, viewW, 2, "#a5b2bc13");
  if (player.infection >= 60 && mode === "playing") {
    // Restrained peripheral haze; the character, aim and HUD remain readable.
    const haze = ctx.createRadialGradient(
      viewW / 2,
      270,
      viewW * 0.22,
      viewW / 2,
      270,
      viewW * 0.7,
    );
    haze.addColorStop(0, "#30412c00");
    haze.addColorStop(1, player.infection >= 90 ? "#6b78265c" : "#56704b30");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, viewW, 540);
  }
  if (crafting && mode === "playing") {
    const progress = 1 - crafting.remaining / crafting.duration;
    rect(player.x - camera - 35, player.y - 145, 70, 5, "#18251d");
    rect(player.x - camera - 35, player.y - 145, progress * 70, 5, "#b9b68c");
  }
  // No scanline overlay: keep the scene calm during camera movement.
  drawAtmosphere();
  if (transitionTime > 0) {
    ctx.fillStyle = `rgba(2,5,9,${Math.min(1, transitionTime * 2)})`;
    ctx.fillRect(0, 0, viewW, 540);
  }
  if (hurtTime > 0.5) {
    ctx.fillStyle = `rgba(165,20,15,${(hurtTime - 0.5) * 0.12})`;
    ctx.fillRect(0, 0, viewW, 540);
  }
}

$("start").onclick = () => {
  if (mode === "paused") pause();
  else startGame();
};
$("continue").onclick = () => startGame(true);
$("pause").onclick = pause;
$("sound").onclick = () => {
  soundOn = !soundOn;
  syncSettings();
  persistSettings();
  if (soundOn) ensureMusic();
  updateMusicVolume();
  tone(330, 0.1, "triangle");
};
$("menu-save").onclick = () => {
  if (mode !== "paused") return;
  const saved = saveCheckpoint(true);
  $("menu-save").textContent = saved
    ? "СОХРАНЕНО · ТЕКУЩАЯ КОМНАТА"
    : "НЕ УДАЛОСЬ СОХРАНИТЬ";
  tone(saved ? 480 : 90, 0.1, "triangle");
};
$("menu-main").onclick = () => {
  showMainMenu();
};
$("menu-quit").onclick = () => {
  window.location.assign("about:blank");
};
$("menu-settings").onclick = () => {
  syncSettings();
  $("settings-panel").hidden = false;
  ensureMusic();
  tone(300, 0.05, "triangle");
};
$("settings-back").onclick = () => {
  $("settings-panel").hidden = true;
  tone(260, 0.05, "triangle");
};
$("setting-sound").onchange = (event) => {
  soundOn = event.target.checked;
  syncSettings();
  persistSettings();
  if (soundOn) ensureMusic();
  updateMusicVolume();
  tone(390, 0.08, "triangle");
};
$("setting-volume").oninput = (event) => {
  soundVolume = Number(event.target.value) / 100;
  persistSettings();
};
$("setting-music").oninput = (event) => {
  musicVolume = Number(event.target.value) / 100;
  persistSettings();
  if (musicVolume > 0) ensureMusic();
  updateMusicVolume();
};
$("setting-shake").onchange = (event) => {
  cameraShake = event.target.checked;
  persistSettings();
};
syncSettings();
document.addEventListener("visibilitychange", updateMusicVolume);
window.addEventListener("pointerdown", ensureMusic, { once: true });
QUICK_BUTTONS.forEach((id, index) => {
  $(id).onclick = () => useQuickSlot(index);
});
$("interact").onclick = interact;
$("reload").onclick = reload;
for (const action of ["left", "right", "fire"]) {
  const b = $(action);
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    if (mode === "playing") {
      held.add(action);
      b.classList.add("pressed");
    }
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => {
      held.delete(action);
      b.classList.remove("pressed");
    });
}
function weaponOrigin() {
  spriteAnimator ||= createSpriteAnimator(ctx, art);
  const shoulder = spriteAnimator.shoulderFor(player, {
    airborne: player.y < GROUND - 1,
  });
  return { x: player.x + player.dir * shoulder.x, y: player.y + shoulder.y };
}
function resolvePlayerAim() {
  player.dir = heroAimFacing(player.dir, aim.x + camera, player.x);
  const origin = weaponOrigin();
  const dx = aim.x + camera - origin.x,
    dy = aim.y - origin.y;
  // At the shoulder itself there is no well-defined aim angle.
  if (Math.hypot(dx, dy) > 0.5) aim.angle = Math.atan2(dy, dx);
}
function updateAim(event) {
  const b = canvas.getBoundingClientRect();
  aim.x = ((event.clientX - b.left) / b.width) * viewW;
  aim.y = ((event.clientY - b.top) / b.height) * 540;
  aim.active = true;
  resolvePlayerAim();
}
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse" && mode === "playing") updateAim(e);
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button === 0 && mode === "playing") {
    e.preventDefault();
    updateAim(e);
    held.add("fire");
    canvas.setPointerCapture(e.pointerId);
  }
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(event, () => held.delete("fire"));
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
const gameKeys = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyF",
  "KeyE",
  "KeyR",
  "KeyG",
  "KeyH",
  "KeyV",
  "KeyL",
  "KeyI",
  "KeyJ",
  "Tab",
  "Escape",
  "ShiftLeft",
  "ShiftRight",
  "KeyQ",
  "Digit1",
  "Digit2",
  "Digit3",
];
window.addEventListener("keydown", (e) => {
  if (!gameKeys.includes(e.code)) return;
  if (e.code === "KeyJ") {
    e.preventDefault();
    if (!e.repeat) {
      if (mode === "journal") closeJournal();
      else openJournal();
    }
    return;
  }
  if (e.code === "KeyI" || e.code === "Tab") {
    if (mode === "inventory" && e.code === "Tab") return;
    e.preventDefault();
    if (!e.repeat) {
      if (mode === "inventory") closeInventory();
      else openInventory();
    }
    return;
  }
  if (e.code === "Escape") {
    if (!e.repeat) pause();
    return;
  }
  if (mode !== "playing") return;
  e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "KeyE") interact();
  if (e.code === "KeyR") reload();
  if (e.code === "KeyG") grenade();
  if (e.code === "KeyH") heal();
  if (e.code === "KeyV") melee();
  if (e.code === "KeyQ") dodge();
  if (/^Digit[123]$/.test(e.code))
    switchQuickWeapon(Number(e.code.slice(-1)) - 1);
  if (e.code === "KeyL") {
    flash = !flash;
    renderQuickSlots();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  clearInput();
  if (mode === "playing") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInput();
    if (mode === "playing") pause();
  }
});
player = {
  x: 65,
  y: GROUND,
  vy: 0,
  dir: 1,
  walk: 0,
  ...freshSurvival(),
  infection: 0,
  maxHp: runEffects.maxHp,
  hp: runEffects.maxHp,
  inventory: starterInventory(),
  backpack: DEFAULT_BACKPACK,
  battery: 100,
  armorId: null,
  equipment: {},
  carryCapacity: runEffects.carryCapacity,
};
player.weaponId = player.inventory.find((i) => i.type === "pistol").uid;
syncSupplies();
inventoryUI = createInventoryUI({
  root: $("inventory"),
  art,
  state: () => player,
  onClose: closeInventory,
  onChanged: () => {
    syncSupplies();
    updateHud();
  },
  onUse: useInventoryItem,
  onDrop: dropInventoryItem,
  onAttachment: (weaponUid, sourceUid, slot) => {
    const result = slot
      ? removeAttachment(player, weaponUid, slot)
      : installAttachment(player, sourceUid, weaponUid);
    if (result.ok) {
      reloadTime = 0;
      syncSupplies();
      updateHud();
    }
    return result.message;
  },
  onSwapBackpack: (container, index) => {
    const result = swapBackpack(player, { container, index });
    if (result.ok) {
      syncSupplies();
      updateHud();
    }
    return result.message;
  },
  onWeaponSlot: switchQuickWeapon,
  quickSlots: () => quickSlots,
  onQuickAssign: setQuickSlot,
  onUnequip: (slot) => {
    player.equipment = equipmentFor(player);
    player.equipment[slot] = null;
    syncSupplies();
    updateHud();
  },
  craftingState: () => ({
    available: !!nearWorkbench(),
    profile,
    multiplier: runEffects.craftTime,
  }),
  onCraft: startCraft,
});
$("inventory-toggle").onclick = () =>
  mode === "inventory" ? closeInventory() : openInventory();
journalUI = createJournalUI({ root: $("journal"), onClose: closeJournal });
endingUI = createEndingUI({
  root: $("ending-choice"),
  onSelect: chooseEnding,
  onClose: closeEndingChoice,
});
storyRadio = createStoryRadio({ root: $("story-radio") });
$("journal-toggle").onclick = () =>
  mode === "journal" ? closeJournal() : openJournal();
progressUI = createProgressUI({
  root: $("progression"),
  profile: () => profile,
  onChanged: () => {
    const saved = persistProgress();
    updateHud();
    return saved;
  },
  onClose: closeProgress,
});
$("progress-toggle").onclick = openProgress;
generateLevel();
checkpoint = readCheckpoint();
if (checkpoint) {
  $("continue").hidden = false;
  $("continue").textContent = `ПРОДОЛЖИТЬ · ЭТАЖ ${checkpoint.floor}`;
}
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000 || 0, 0.035);
  lastTime = now;
  update(dt);
  scheduleMusic();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

artReady.then((results) => {
  for (const id of QUICK_BUTTONS) delete $(id).dataset.quickType;
  renderQuickSlots();
  if (results.some((ok) => !ok))
    notify("Часть графики не загрузилась. Проверьте папку assets.");
});
