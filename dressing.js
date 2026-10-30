// Ten generated wall and floor props for each sector, roof and bunker. Placement is
// in world coordinates, with doors, lift, windows and searchable furniture kept clear.
const dressingZones = {
  office: {
    widths: [74, 68, 70, 86, 55, 60, 65, 65, 72, 73],
    wall: [0, 1, 5, 9],
    screen: 5,
    glow: "#a4b8c0",
  },
  laboratory: {
    widths: [76, 68, 76, 66, 80, 72, 72, 62, 85, 76],
    wall: [2],
    screen: 2,
    glow: "#d7b95c",
  },
  apartment: {
    widths: [75, 76, 79, 77, 75, 83, 68, 72, 74, 74],
    wall: [0, 4],
    screen: 7,
    glow: "#a8b6b7",
  },
  mall: {
    widths: [73, 83, 70, 68, 78, 73, 72, 75, 79, 79],
    wall: [2],
    screen: 7,
    glow: "#b8a779",
  },
  parking: {
    widths: [80, 75, 76, 77, 84, 68, 70, 73, 70, 81],
    wall: [1, 3, 7],
    screen: 3,
    glow: "#9dbac0",
  },
  roof: {
    widths: [66, 59, 67, 62, 57, 60, 54, 64, 68, 58],
    wall: [],
    screen: -1,
    glow: "#afb7bc",
  },
  bunker: {
    widths: [66, 64, 60, 57, 70, 59, 54, 62, 52, 56],
    wall: [3, 6, 8, 9],
    screen: 1,
    glow: "#9da9a0",
  },
};
const screenArea = {
  office: [0.13, 0.48, 0.73, 0.17],
  laboratory: [0.31, 0.25, 0.48, 0.42],
  apartment: [0.19, 0.24, 0.57, 0.31],
  mall: [0.22, 0.2, 0.53, 0.46],
  parking: [0.16, 0.39, 0.68, 0.35],
  bunker: [0.23, 0.29, 0.55, 0.35],
};
const dressingTop = {
  office: 50,
  laboratory: 40,
  apartment: 30,
  mall: 20,
  parking: 10,
  roof: 51,
  bunker: 0,
};
const dressingCache = new WeakMap();
const foregroundCache = new WeakMap();
const foregroundSourceBounds = new WeakMap();
const foregroundSourceTrim = {
  office: { 5: 700, 7: 720, 9: 650 },
  roof: { 8: 680 },
};
function visibleForegroundCells(image, zone) {
  const cached = foregroundSourceBounds.get(image);
  if (cached) return cached;
  const buffer = document.createElement("canvas");
  buffer.width = image.width;
  buffer.height = image.height;
  const context = buffer.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  const cells = [];
  for (let index = 0; index < 10; index++) {
    const left = Math.floor(((index % 5) * image.width) / 5);
    const right = Math.floor((((index % 5) + 1) * image.width) / 5);
    const top = Math.floor((Math.floor(index / 5) * image.height) / 2);
    const bottom = Math.floor(((Math.floor(index / 5) + 1) * image.height) / 2);
    let minX = right,
      minY = bottom,
      maxX = left,
      maxY = top;
    // A few generated atlases spill a first-row object into the next cell.
    // Discard that upper fragment, preserving the actual floor prop below it.
    const scanTop = Math.max(top, foregroundSourceTrim[zone]?.[index] || top);
    for (let y = scanTop; y < bottom; y++)
      for (let x = left; x < right; x++)
        if (pixels[(y * image.width + x) * 4 + 3] > 40) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
    cells.push(
      maxX >= minX
        ? [minX, minY, maxX + 1 - minX, maxY + 1 - minY]
        : [left, top, right - left, bottom - top],
    );
  }
  foregroundSourceBounds.set(image, cells);
  return cells;
}
// Target visible widths against a roughly 140 px tall courier. A helmet is
// head-sized; fallen chairs, suitcases, racks and barriers take more floor area.
// Zero removes a cutout that conflicts with the set.
const foregroundTargetWidth = {
  office: [68, 39, 50, 48, 35, 46, 0, 48, 0, 90],
  laboratory: [40, 52, 49, 66, 39, 34, 0, 58, 55, 0],
  apartment: [70, 57, 63, 42, 40, 0, 46, 62, 55, 38],
  mall: [78, 46, 62, 47, 47, 45, 0, 76, 42, 43],
  parking: [34, 34, 60, 59, 73, 0, 64, 45, 73, 52],
  roof: [18, 52, 62, 0, 57, 40, 0, 0, 61, 0],
  bunker: [38, 38, 0, 29, 25, 57, 46, 51, 34, 43],
};
const foregroundAffinity = {
  office: [
    "desk",
    "desk",
    "desk",
    "desk",
    "desk",
    "desk",
    null,
    "cabinet",
    null,
    "cabinet",
  ],
  laboratory: [
    "desk",
    "cabinet",
    "cabinet",
    "desk",
    "desk",
    "desk",
    null,
    "cabinet",
    "cabinet",
    null,
  ],
  apartment: [
    "desk",
    "cabinet",
    "cabinet",
    "desk",
    "desk",
    null,
    "cabinet",
    "cabinet",
    "cabinet",
    "desk",
  ],
  mall: [
    "cabinet",
    "door",
    "cabinet",
    "crate",
    "desk",
    "crate",
    null,
    "cabinet",
    "crate",
    "cabinet",
  ],
  parking: [
    "door",
    "crate",
    "crate",
    "crate",
    "door",
    null,
    "cabinet",
    "cabinet",
    "crate",
    "crate",
  ],
  roof: [],
  bunker: [
    "cabinet",
    "desk",
    null,
    "cabinet",
    "crate",
    "cabinet",
    "cabinet",
    "cabinet",
    "crate",
    "desk",
  ],
};
const foregroundWidthRatio = {
  office: [0.93, 0.88, 0.82, 0.79, 0.78, 0.85, 1, 1, 0.96, 0.8],
  laboratory: [0.93, 0.85, 0.91, 0.96, 0.92, 0.9, 1, 1, 1, 0.85],
  apartment: [0.89, 0.98, 0.95, 0.99, 0.88, 0.79, 1, 1, 1, 0.85],
  mall: [0.95, 1, 1, 1, 0.95, 0.82, 1, 1, 0.98, 0.91],
  parking: [0.91, 0.92, 0.99, 1, 0.97, 0.94, 1, 1, 1, 0.94],
  roof: [0.87, 1, 1, 1, 0.92, 0.92, 1, 1, 1, 0.94],
  bunker: [0.89, 0.84, 0.86, 0.88, 0.79, 0.92, 0.98, 0.88, 0.86, 0.92],
};
// Visible alpha height divided by atlas-cell width, measured from the generated
// sprites. Tall equipment is capped against the courier's 140 px silhouette.
const foregroundHeightRatio = {
  office: [0.59, 0.25, 0.28, 0.64, 0.34, 0.58, 1.44, 0.52, 1.49, 0.78],
  laboratory: [0.71, 0.95, 0.53, 0.78, 0.59, 0.5, 1.3, 0.62, 0.8, 1.15],
  apartment: [0.98, 0.67, 0.75, 0.62, 1.25, 1.37, 0.73, 0.88, 0.78, 1.17],
  mall: [1.22, 0.72, 0.83, 0.96, 1, 1.2, 1.23, 0.88, 0.82, 0.7],
  parking: [0.59, 0.69, 0.84, 0.6, 0.8, 1.11, 0.91, 0.61, 0.71, 0.99],
  roof: [0.26, 0.48, 0.55, 0.55, 0.65, 0.68, 1.35, 1.36, 0.71, 1.38],
  bunker: [0.52, 0.53, 0.61, 0.64, 0.36, 0.52, 0.59, 0.53, 0.53, 0.6],
};
export const DRESSING_VARIANTS = Object.keys(dressingZones).length * 10;
export const FOREGROUND_VARIANTS = DRESSING_VARIANTS;
export function dressingZone(zone, floor = null) {
  if (zone === "technical")
    return floor === null
      ? "parking"
      : floor === 0
        ? "bunker"
        : floor >= 41
          ? "office"
          : floor >= 31
            ? "laboratory"
            : floor >= 21
              ? "apartment"
              : floor >= 11
                ? "mall"
                : "parking";
  return zone === "infirmary" ? "laboratory" : zone;
}
function dressingHash(s) {
  let v = 2166136261;
  for (const c of s) v = Math.imul(v ^ c.charCodeAt(0), 16777619);
  return v >>> 0;
}
export function planDressing(layout, floor, ground) {
  const zone = dressingZone(layout.zone, floor),
    meta = dressingZones[zone];
  if (!meta) return [];
  const cached = dressingCache.get(layout);
  if (cached) return cached;
  const scale = layout.width / layout.crop[2],
    rear = ground - (layout.zone === "roof" ? 0 : 30);
  const room = layout.id.includes("-room-");
  // Compact rooms already have painted furniture. Extra rear cutouts overlap
  // the desk/window/door artwork and appear to be embedded in the wall.
  if (room) {
    dressingCache.set(layout, []);
    return [];
  }
  const unique =
    layout.zone === "roof"
      ? 0
      : layout.zone === "bunker"
        ? 9
        : room
          ? dressingHash(layout.id) % 10
          : Math.max(0, Math.min(9, dressingTop[zone] - floor));
  const indexes = [];
  const choices = room
    ? [unique, meta.wall[0], meta.screen, (unique + 3) % 10, (unique + 7) % 10]
    : [
        unique,
        (unique + 3) % 10,
        (unique + 7) % 10,
        meta.screen,
        (unique + 5) % 10,
      ];
  for (const i of choices)
    if (i >= 0 && !indexes.includes(i) && indexes.length < (room ? 3 : 4))
      indexes.push(i);
  const landmark = layout.parts?.find((p) => p.panel);
  const focus = layout.width * 0.5;
  const blocked = [...(layout.doors || []), layout.lift, layout.exit]
    .filter(Boolean)
    .map((o) => [o.rect[0] * scale, (o.rect[0] + o.rect[2]) * scale]);
  const furniture = (layout.containers || []).map((o) => [
    o.rect[0] * scale,
    (o.rect[0] + o.rect[2]) * scale,
  ]);
  const windows = (layout.windows || []).map((r) => [
    r[0] * scale,
    (r[0] + r[2]) * scale,
  ]);
  const landmarkCenter =
    landmark && (landmark.x + landmark.width * 0.5) * scale;
  const props = [];
  for (const [slot, index] of indexes.entries()) {
    const wall = meta.wall.includes(index),
      width = meta.widths[index];
    const preferred = room
      ? layout.width * (0.28 + slot * 0.24)
      : focus + [-420, 420, -650, 650][slot];
    const candidates = [];
    for (let x = 65; x < layout.width - 65; x += 37) candidates.push(x);
    candidates.sort(
      (a, b) => Math.abs(a - preferred) - Math.abs(b - preferred),
    );
    let x = candidates.find(
      (x) =>
        blocked.every(
          ([a, b]) => x + width * 0.5 < a - 12 || x - width * 0.5 > b + 12,
        ) &&
        (!landmarkCenter || Math.abs(x - landmarkCenter) > 115) &&
        furniture.every(
          ([a, b]) => x + width * 0.5 < a - 12 || x - width * 0.5 > b + 12,
        ) &&
        windows.every(
          ([a, b]) => x + width * 0.5 < a - 8 || x - width * 0.5 > b + 8,
        ) &&
        props.every((p) => Math.abs(p.x - x) > (p.w + width) * 0.65),
    );
    if (x === undefined && !room && props.length < 2)
      x = candidates.find(
        (candidate) =>
          blocked.every(
            ([a, b]) =>
              candidate + width * 0.5 < a - 12 ||
              candidate - width * 0.5 > b + 12,
          ) &&
          furniture.every(
            ([a, b]) =>
              candidate + width * 0.5 < a - 12 ||
              candidate - width * 0.5 > b + 12,
          ) &&
          windows.every(
            ([a, b]) =>
              candidate + width * 0.5 < a - 8 ||
              candidate - width * 0.5 > b + 8,
          ) &&
          props.every((p) => Math.abs(p.x - candidate) > (p.w + width) * 0.65),
      );
    if (x === undefined) continue;
    props.push({
      zone,
      index,
      x,
      w: width,
      bottom: wall ? rear - 38 : ground + 9,
      screen: index === meta.screen,
    });
  }
  dressingCache.set(layout, props);
  return props;
}
export function drawDressing(
  ctx,
  art,
  layout,
  floor,
  ground,
  camera,
  time,
  viewWidth,
) {
  const zone = dressingZone(layout.zone, floor),
    image = art[`dressing_${zone}`];
  if (!image) return;
  const meta = dressingZones[zone],
    cellW = image.width / 5,
    cellH = image.height / 2;
  const topEdge =
    ground -
    (layout.zone === "roof" ? 0 : 30) -
    layout.ground * (layout.width / layout.crop[2]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-camera, topEdge + 3, layout.width, ground + 54 - topEdge);
  ctx.clip();
  for (const p of planDressing(layout, floor, ground)) {
    const x = p.x - camera,
      w = p.w,
      h = (cellH / cellW) * w,
      y = p.bottom - h;
    if (x + w * 0.5 < 0 || x - w * 0.5 > viewWidth) continue;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.filter = "brightness(.66) saturate(.63) contrast(.9)";
    ctx.drawImage(
      image,
      (p.index % 5) * cellW,
      Math.floor(p.index / 5) * cellH,
      cellW,
      cellH,
      x - w / 2,
      y,
      w,
      h,
    );
    ctx.restore();
    if (p.screen) {
      const [rx, ry, rw, rh] = screenArea[zone],
        sx = x - w / 2 + rx * w,
        sy = y + ry * h,
        sw = rw * w,
        sh = rh * h;
      const flicker = 0.6 + 0.4 * Math.sin(time * 1.7 + p.x * 0.09) ** 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh);
      ctx.clip();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.12 * flicker;
      ctx.fillStyle = meta.glow;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.globalAlpha = 0.24 * flicker;
      ctx.fillRect(sx, sy + ((time * 17 + p.x) % sh), sw, 1.1);
      ctx.globalAlpha = 0.18 * flicker;
      for (let i = 0; i < 3; i++)
        ctx.fillRect(
          sx + sw * (0.15 + i * 0.24),
          sy + sh * (0.21 + i * 0.18),
          sw * 0.1,
          1,
        );
      ctx.restore();
    }
  }
  ctx.restore();
}

// The second atlas set gives every wing recognisable floor-level clutter.
// Near pieces fade just enough for the hero and interaction prompts to read.
export function planForeground(layout, floor) {
  const zone = dressingZone(layout.zone, floor);
  if (!dressingZones[zone]) return [];
  const cached = foregroundCache.get(layout);
  if (cached) return cached;
  const scale = layout.width / layout.crop[2];
  const room = layout.id.includes("-room-");
  const first =
    layout.zone === "roof"
      ? 0
      : layout.zone === "bunker"
        ? 9
        : room
          ? dressingHash(layout.id + "front") % 10
          : Math.max(0, Math.min(9, dressingTop[zone] - floor));
  const indexes =
    zone === "roof"
      ? [0, 1, 2, 4, 5, 8]
      : room
        ? Array.from({ length: 10 }, (_, i) => (first + i * 3) % 10)
        : [
            first,
            ...[2, 4, 6, 8, 1, 3, 7, 5, 9].map(
              (offset) => (first + offset) % 10,
            ),
          ];
  const selected = indexes
    .filter((index) => foregroundTargetWidth[zone][index] > 0)
    .slice(0, room ? 4 : 10);
  const blocked = [...(layout.doors || []), layout.lift, layout.exit]
    .filter(Boolean)
    .map((o) => [o.rect[0] * scale - 30, (o.rect[0] + o.rect[2]) * scale + 30]);
  const result = [];
  for (const [slot, index] of selected.entries()) {
    const width = Math.min(
      100 / foregroundHeightRatio[zone][index],
      foregroundTargetWidth[zone][index] / foregroundWidthRatio[zone][index],
    );
    const placement = dressingHash(
      `${layout.id}:${floor}:${index}:${slot}:depth`,
    );
    const broad =
      layout.width *
        (zone === "roof"
          ? [0.08, 0.19, 0.3, 0.72, 0.83, 0.94][slot]
          : room
            ? 0.14 + slot * 0.17
            : 0.08 + slot * 0.09) +
      (placement % 89) -
      44;
    const affinity = foregroundAffinity[zone][index];
    let anchorPoints = [];
    if (affinity === "door")
      anchorPoints = [...(layout.doors || []), layout.lift, layout.exit]
        .filter(Boolean)
        .flatMap((door) => [
          door.rect[0] * scale - width * 0.5 - 48,
          (door.rect[0] + door.rect[2]) * scale + width * 0.5 + 48,
        ]);
    else if (affinity && zone !== "roof") {
      const furniture = (layout.containers || []).filter(
        (item) => item.type === affinity,
      );
      const matched = furniture.length ? furniture : layout.containers || [];
      anchorPoints = matched.flatMap((item) => [
        item.rect[0] * scale - width * 0.5 - 16,
        (item.rect[0] + item.rect[2]) * scale + width * 0.5 + 16,
      ]);
    }
    const preferred = anchorPoints.length
      ? anchorPoints.sort(
          (a, b) => Math.abs(a - broad) - Math.abs(b - broad),
        )[0] +
        ((placement >>> 16) % 23) -
        11
      : broad;
    const candidates = [];
    for (let x = 53; x < layout.width - 53; x += 21) candidates.push(x);
    candidates.sort(
      (a, b) => Math.abs(a - preferred) - Math.abs(b - preferred),
    );
    const x = candidates.find(
      (candidate) =>
        blocked.every(
          ([a, b]) => candidate + width / 2 < a || candidate - width / 2 > b,
        ) &&
        result.every(
          (p) => Math.abs(p.x - candidate) > (p.width + width) * 0.54,
        ),
    );
    if (x !== undefined) {
      const depth =
        room && slot === 0
          ? -20 + ((placement >>> 8) % 15)
          : room && slot === 1
            ? 20 + ((placement >>> 8) % 16)
            : -20 + ((placement >>> 8) % 59);
      result.push({
        zone,
        index,
        x,
        width,
        depth,
        layer: depth < 12 ? "back" : "front",
      });
    }
  }
  foregroundCache.set(layout, result);
  return result;
}
export function drawForegroundDressing(
  ctx,
  art,
  layout,
  floor,
  camera,
  ground,
  playerX,
  viewWidth,
  pass = "front",
) {
  const zone = dressingZone(layout.zone, floor);
  const image = art[`foreground_${zone}`];
  if (!image) return;
  const wallTop =
    ground -
    (layout.zone === "roof" ? 0 : 30) -
    layout.ground * (layout.width / layout.crop[2]);
  const cellW = image.width / 5;
  const cells = visibleForegroundCells(image, zone);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-camera, wallTop + 5, layout.width, ground + 55 - wallTop);
  ctx.clip();
  for (const p of planForeground(layout, floor)) {
    if (p.layer !== pass) continue;
    const x = p.x - camera;
    if (x < -125 || x > viewWidth + 125) continue;
    const source = cells[p.index];
    const perspective = 0.9 + ((p.depth + 20) / 58) * 0.16;
    const w = (source[2] / cellW) * p.width * perspective;
    const h = (source[3] / cellW) * p.width * perspective;
    const footY = ground + p.depth;
    const near = Math.abs(p.x - playerX) < 85;
    ctx.save();
    ctx.fillStyle = "#03080b5e";
    ctx.beginPath();
    ctx.ellipse(x, footY, Math.max(7, w * 0.34), 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = pass === "back" ? 0.85 : near ? 0.67 : 0.94;
    ctx.filter = "brightness(.81) saturate(.78) contrast(1.02)";
    ctx.drawImage(image, ...source, x - w / 2, footY - h, w, h);
    ctx.restore();
  }
  ctx.restore();
}
