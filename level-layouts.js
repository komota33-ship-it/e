import { SCENE_LAYOUTS } from "./layouts.js";
import { sectorPanel } from "./sector-layouts.js";
const FLOOR_NAMES = {
  office: [
    "Приёмная дирекции",
    "Переговорные",
    "Финансовый отдел",
    "Архив договоров",
    "Диспетчерская",
    "Открытый офис",
    "Серверное крыло",
    "Кадровая служба",
    "Редакция",
    "Учебный центр",
  ],
  laboratory: [
    "Приём образцов",
    "Чистая зона",
    "Биохимия",
    "Виварий",
    "Карантин",
    "Аналитический блок",
    "Холодное хранение",
    "Токсикология",
    "Испытательная зона",
    "Утилизация",
  ],
  apartment: [
    "Пентхаусы",
    "Семейные квартиры",
    "Западное крыло",
    "Коммунальный блок",
    "Зимний сад",
    "Общежитие",
    "Детское крыло",
    "Прачечная",
    "Гостевые комнаты",
    "Кухонный блок",
  ],
  mall: [
    "Фуд-корт",
    "Кинотеатр",
    "Магазины одежды",
    "Книжный ряд",
    "Аптеки",
    "Электроника",
    "Супермаркет",
    "Склад доставки",
    "Торговая галерея",
    "Зона разгрузки",
  ],
  parking: [
    "Пост охраны",
    "Северная стоянка",
    "Автомастерская",
    "Мойка",
    "Служебные машины",
    "Грузовой сектор",
    "Резервуарная",
    "Вентиляционная",
    "Нижний гараж",
  ],
  bunker: ["Изолятор «Объект 0»"],
};
const permutations = [
  [1, 2, 3],
  [2, 1, 3],
  [3, 1, 2],
  [1, 3, 2],
  [2, 3, 1],
  [3, 2, 1],
];
const floorCache = new Map(),
  roomCache = new Map();
// All scenery uses the same physical reference: a 2.1 m door beside a 1.76 m hero.
// Only room dimensions change; furniture is never scaled independently per floor.
export const DOOR_HEIGHT = 148;
function architecturalScale(base) {
  const heights = (base.doors?.length ? base.doors : [base.exit || base.lift])
    .map((d) => d.rect[3])
    .sort((a, b) => a - b);
  return DOOR_HEIGHT / heights[Math.floor(heights.length / 2)];
}
export function createFloorLayout(floor, zone) {
  if (floorCache.has(floor)) return floorCache.get(floor);
  if (floor === 51) {
    const roof = {
      id: "floor-51",
      zone: "roof",
      title: "Эвакуационная площадка",
      art: "roof",
      crop: [0, 0, 1536, 1024],
      ground: 620,
      width: Math.round((1536 * DOOR_HEIGHT) / 204),
      doors: [],
      lift: { id: "stairs", rect: [1340, 378, 110, 204] },
      containers: [
        {
          id: "roof-supply",
          rect: [278, 501, 245, 80],
          label: "ЭВАКУАЦИОННЫЕ ПРИПАСЫ",
          kind: "ammo",
          type: "crate",
        },
        {
          id: "roof-medical",
          rect: [799, 508, 65, 35],
          label: "МЕДИЦИНСКИЙ КЕЙС",
          kind: "medical",
          type: "crate",
        },
        {
          id: "roof-tools",
          rect: [892, 531, 150, 50],
          label: "ЯЩИК ОХРАНЫ",
          kind: "workshop",
          type: "crate",
        },
      ],
      windows: [],
      lights: [{ rect: [1370, 343, 55, 17], color: "#d9a966" }],
      hazards: [],
      drips: [],
      seams: [],
      foreground: [
        { x: 620, kind: 2 },
        { x: 1120, kind: 7 },
      ],
      signature: "rooftop",
      encounter: "tutorial",
    };
    floorCache.set(floor, roof);
    return roof;
  }
  const base = SCENE_LAYOUTS[zone],
    top = {
      office: 50,
      laboratory: 40,
      apartment: 30,
      mall: 20,
      parking: 10,
      bunker: 0,
    }[zone],
    index = top - floor;
  const cuts =
    base.art === "floorsA"
      ? [0, 300, 710, 1000, 1280, 1536]
      : [0, 300, 740, 1060, 1290, 1536];
  let middle = [...permutations[(index + top) % 6]];
  // The door bays remain at their authored scale. Five different generated
  // sector paintings form most of each corridor, rather than repeating the
  // same three bays until the lift. Neighbouring floors use disjoint sets of
  // paintings; rotation gives each floor its own route through the zone.
  if (index >= 6) middle.splice(index % 3, 0, 1 + (index % 3));
  if (index === 9) middle.splice(2, 0, 2);
  const landmarkIndex = zone === "bunker" ? 9 : index;
  const remaining = [0, 2, 4, 6, 8].map(value => (value + landmarkIndex % 2) % 10).filter(value => value !== landmarkIndex);
  let shuffleSeed = (index + 1) * 73 + top * 19;
  for (let i = remaining.length - 1; i > 0; i--) {
    shuffleSeed = (Math.imul(shuffleSeed, 1664525) + 1013904223) >>> 0;
    const j = shuffleSeed % (i + 1);
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  const panelOrder = [landmarkIndex, ...remaining];
  const paintings = panelOrder.map((panelIndex, step) => ({
    panelIndex,
    main: step === 0,
  }));
  const order = [0];
  for (let step = 0; step < paintings.length; step++) {
    order.push(paintings[step]);
    if (step < middle.length) order.push(middle[step]);
  }
  order.push(4);
  const routeSignature = order.map(part => typeof part === "number" ? part : `S${part.panelIndex}`).join("-");
  const layout = {
      id: `floor-${floor}`,
      zone,
      title: FLOOR_NAMES[zone][index] || FLOOR_NAMES[zone][0],
      art: base.art,
      ground: base.ground,
      floorEnd: base.floorEnd,
      crop: [0, 0, 0, base.crop[3]],
      width: 0,
      parts: [],
      doors: [],
      containers: [],
      windows: [],
      lights: [],
      hazards: [],
      drips: [],
      seams: [],
      foreground: [],
      signature: `${zone}:${index}:${routeSignature}`,
      landmark: {
        art: `sector_${zone === "bunker" ? "parking" : zone}`,
        index: landmarkIndex,
      },
      floorNumber: floor,
      encounter: ["patrol", "ambush", "scattered", "swarm"][index % 4],
      tone: index % 4,
    };
  let cursor = 0;
  for (let position = 0; position < order.length; position++) {
    const part = order[position];
    if (typeof part === "object") {
      const panel = sectorPanel(
        zone === "bunker" ? "parking" : zone,
        part.panelIndex,
        base.ground,
      );
      const { width } = panel;
      layout.parts.push({ ...panel, x: cursor });
      if (part.main) {
        layout.landmark.x = cursor;
        layout.landmark.width = width;
      }
      const r = panel.lootRect;
      layout.containers.push({
        id: part.main ? `landmark-${floor}` : `wing-${floor}-${part.panelIndex}`,
        rect: [cursor + r[0], ...r.slice(1)],
        label: panel.lootLabel,
        kind:
          zone === "laboratory"
            ? "medical"
            : zone === "parking"
              ? "workshop"
              : "ammo",
        type: "cabinet",
      });
      layout.seams.push(cursor, cursor + width);
      cursor += width;
      continue;
    }
    const left = cuts[part],
      right = cuts[part + 1],
      width = right - left,
      dx = cursor - left;
    const mirror =
      position > 0 &&
      position < order.length - 1 &&
      (index + position) % 3 === 1;
    const remap = (r) => [
      mirror ? cursor + right - r[0] - r[2] : r[0] + dx,
      ...r.slice(1),
    ];
    layout.parts.push({
      mirror,
      source: [left, base.crop[1], width, base.crop[3]],
      x: cursor,
      width,
    });
    const owns = (rect) =>
      rect[0] + rect[2] / 2 >= left && rect[0] + rect[2] / 2 < right;
    for (const key of ["doors", "containers", "lights"])
      for (const object of base[key] || [])
        if (owns(object.rect)) {
          const copy = {
            ...structuredClone(object),
            id: `${object.id || key}-${position}`,
            rect: remap(object.rect),
          };
          if (key === "doors")
            copy.name = `${object.kind === "technical" ? "МАСТЕРСКАЯ" : object.kind === "infirmary" ? "МЕДПУНКТ" : zone === "apartment" ? "КВАРТИРА" : "КАБИНЕТ"} ${floor}-${position}`;
          if (key === "lights")
            copy.color = ["#a1bccb", "#bdad88", "#8fa7b2", "#bd8e73"][
              index % 4
            ];
          layout[key].push(copy);
        }
    for (const key of ["windows", "hazards"])
      for (const rect of base[key] || [])
        if (owns(rect)) layout[key].push(remap(rect));
    for (const [x, y, kind] of base.drips || [])
      if (x >= left && x < right)
        layout.drips.push([mirror ? cursor + right - x : x + dx, y, kind]);
    if (owns(base.lift.rect))
      layout.lift = { ...base.lift, rect: remap(base.lift.rect) };
    if (position > 0) layout.seams.push(cursor);
    if (
      position > 0 &&
      position < order.length - 1 &&
      (position + index) % 2 === 0
    )
      layout.foreground.push({
        x: cursor + width * 0.75,
        kind:
          zone === "office"
            ? 4
            : zone === "parking"
              ? 6
              : zone === "apartment"
                ? 5
                : 7,
      });
    cursor += width;
  }
  layout.foreground.push({ x: cursor * 0.43, kind: 1 });
  layout.crop[2] = cursor;
  layout.width = Math.round(cursor * architecturalScale(base));
  floorCache.set(floor, layout);
  return layout;
}
export function createRoomLayout(floor, door) {
  const id = `floor-${floor}-room-${door.id}`;
  if (roomCache.has(id)) return roomCache.get(id);
  const base = structuredClone(SCENE_LAYOUTS[`room-${door.kind}`]);
  const seed = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0),
    mirror = seed % 2 === 0;
  const layout = {
    ...base,
    id,
    zone: door.kind,
    title: door.name,
    mirror,
    width: Math.round(base.crop[2] * architecturalScale(base)),
    foreground: [
      { x: seed % 2 ? 430 : 160, kind: door.kind === "technical" ? 7 : 4 },
    ],
    tone: seed % 4,
  };
  if (mirror) {
    const flip = (r) => [base.crop[2] - r[0] - r[2], ...r.slice(1)];
    layout.exit.rect = flip(layout.exit.rect);
    for (const key of ["containers", "lights"])
      for (const o of layout[key] || []) o.rect = flip(o.rect);
    layout.windows = (layout.windows || []).map(flip);
    layout.hazards = (layout.hazards || []).map(flip);
    layout.drips = (layout.drips || []).map(([x, y, k]) => [
      base.crop[2] - x,
      y,
      k,
    ]);
  }
  roomCache.set(id, layout);
  return layout;
}
