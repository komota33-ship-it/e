// Architecture ends behind the actors, leaving a visible floor lane beneath
// their feet. Source rectangles and the painting use this same projection.
export function sceneDepth(layout, ground) {
  const scale = layout.width / layout.crop[2];
  const inset = layout.zone === "roof" ? 0 : 30;
  const rear = ground - inset;
  const sourceFloor = (layout.floorEnd ?? layout.crop[3]) - layout.ground;
  const floorStretch = inset ? (inset + 46) / (sourceFloor * scale) : 1;
  return {
    scale,
    rear,
    floorStretch,
    floorHeight: Math.ceil(layout.ground + sourceFloor * floorStretch),
    height: Math.ceil(
      layout.ground + sourceFloor * floorStretch + (inset ? 23 / scale : 0),
    ),
    projectY(y) {
      return (
        rear +
        (y - layout.ground) * scale * (y > layout.ground ? floorStretch : 1)
      );
    },
  };
}

// Assemble a continuous generated floor plane and slab face beneath the
// architecture. The original painting supplies a fallback while art loads.
export function projectFloorPainting(
  ctx,
  image,
  layout,
  ground,
  surfaces = null,
) {
  const depth = sceneDepth(layout, ground),
    seam = layout.ground;
  if (layout.zone === "roof") {
    ctx.drawImage(image, 0, 0);
    return;
  }
  ctx.drawImage(image, 0, 0, image.width, seam, 0, 0, image.width, seam);
  if (surfaces) {
    // Measured bands: upper walking surface followed by its concrete slab face.
    const bands = {
      office: [0, 118, 160],
      laboratory: [161, 280, 325],
      apartment: [327, 462, 507],
      mall: [509, 637, 678],
      parking: [680, 820, 859],
      bunker: [861, 981, 1024],
    };
    const zone =
      layout.zone === "technical"
        ? "parking"
        : layout.zone === "infirmary"
          ? "laboratory"
          : layout.zone;
    const [top, edge, bottom] = bands[zone] || bands.office;
    const plane = 76 / depth.scale,
      face = 23 / depth.scale;
    ctx.save();
    ctx.filter = "saturate(.68) brightness(.8)";
    ctx.drawImage(
      surfaces,
      0,
      top,
      surfaces.width,
      edge - top,
      0,
      seam,
      image.width,
      plane,
    );
    ctx.drawImage(
      surfaces,
      0,
      edge,
      surfaces.width,
      bottom - edge,
      0,
      seam + plane,
      image.width,
      face,
    );
    ctx.filter = "none";
    const join = ctx.createLinearGradient(0, seam, 0, seam + 10 / depth.scale);
    join.addColorStop(0, "#02070b88");
    join.addColorStop(1, "#02070b00");
    ctx.fillStyle = join;
    ctx.fillRect(0, seam, image.width, 10 / depth.scale);
    ctx.restore();
    return;
  }
  ctx.drawImage(
    image,
    0,
    seam,
    image.width,
    (layout.floorEnd ?? image.height) - seam,
    0,
    seam,
    image.width,
    ((layout.floorEnd ?? image.height) - seam) * depth.floorStretch,
  );
}

// A single assembled floor painting plus independently moving depth layers.
export function paintLevelBackdrop(ctx, art, layout) {
  ctx.save();
  ctx.filter = "saturate(.78) contrast(.94) brightness(.94)";
  if (layout.parts) {
    for (const p of layout.parts) {
      ctx.save();
      if (p.panel) {
        // Preserve the artwork's aspect ratio and measured floor line.
        ctx.drawImage(art[p.art], ...p.source, p.x, 0, p.width, p.height);
      } else {
        const [sx, sy, sw, sh] = p.source;
        if (p.mirror) {
          ctx.translate(p.x + sw, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(
          art[layout.art],
          sx,
          sy,
          sw,
          sh,
          p.mirror ? 0 : p.x,
          0,
          sw,
          sh,
        );
      }
      ctx.restore();
    }
  } else {
    const [sx, sy, sw, sh] = layout.crop;
    if (layout.mirror) {
      ctx.translate(sw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(art[layout.art], sx, sy, sw, sh, 0, 0, sw, sh);
  }
  ctx.restore();
  if (layout.zone === "roof") return;
  // Pillar returns cover architectural joins, continuous cornice and skirting
  // keep differently arranged wings part of one coherent building.
  for (const x of layout.seams || []) {
    const shade = ctx.createLinearGradient(x - 9, 0, x + 11, 0);
    shade.addColorStop(0, "#070c1100");
    shade.addColorStop(0.35, "#070c11bf");
    shade.addColorStop(0.5, "#465052b3");
    shade.addColorStop(0.75, "#1a232cdd");
    shade.addColorStop(1, "#070c1100");
    ctx.fillStyle = shade;
    ctx.fillRect(x - 9, 0, 20, layout.ground + 5);
  }
  const floor = ctx.createLinearGradient(
    0,
    layout.ground - 3,
    0,
    layout.ground + 36,
  );
  floor.addColorStop(0, "#9eacb013");
  floor.addColorStop(0.15, "#070b111a");
  floor.addColorStop(1, "#03080d8a");
  ctx.fillStyle = floor;
  ctx.fillRect(0, layout.ground - 3, layout.crop[2], 39);
  ctx.fillStyle = ["#09243b08", "#80631a08", "#2746410b", "#6b281e0a"][
    layout.tone || 0
  ];
  ctx.fillRect(0, 0, layout.crop[2], layout.crop[3]);
  for (const d of [
    ...(layout.doors || []),
    ...(layout.exit ? [layout.exit] : []),
    ...(layout.lift ? [layout.lift] : []),
  ]) {
    const [x, y, w, h] = d.rect;
    const inset = ctx.createLinearGradient(x, y, x + Math.min(15, w * 0.15), y);
    inset.addColorStop(0, "#000a");
    inset.addColorStop(1, "#0000");
    ctx.fillStyle = inset;
    ctx.fillRect(x, y, w * 0.18, h);
    ctx.fillStyle = "#b9c3bb19";
    ctx.fillRect(x + w - 2, y, 2, h);
    ctx.fillStyle = "#02070988";
    ctx.fillRect(x, y, w, 4);
  }
}
export function drawDistantWindows(
  ctx,
  art,
  windows,
  camera,
  time,
  sceneWidth,
  sceneId = "",
) {
  // Room backdrops have their exterior painted into the same image as the
  // frame. An additional rectangular city layer looks like a pasted poster.
  if (sceneId.includes("-room-") || !art.city_panorama || !windows.length)
    return;
  const visible = windows.filter(
    (b) => b.x + b.w >= camera && b.x <= camera + ctx.canvas.width,
  );
  if (!visible.length) return;
  ctx.save();
  ctx.beginPath();
  for (const b of visible)
    ctx.rect(b.x - camera + 2, b.y + 2, b.w - 4, b.h - 4);
  ctx.clip();
  // The same world-space skyline is visible through all corridor windows.
  // Let the painted grime and reflections remain visible over the distant view.
  const panoramaWidth = Math.max(1900, sceneWidth);
  ctx.globalAlpha = 0.68;
  ctx.filter = "brightness(.64) saturate(.58) blur(.45px)";
  ctx.drawImage(
    art.city_panorama,
    -camera,
    -95,
    panoramaWidth,
    (panoramaWidth * art.city_panorama.height) / art.city_panorama.width,
  );
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  for (const b of visible) {
    const glass = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    glass.addColorStop(0, "#798e9124");
    glass.addColorStop(0.28, "#19273408");
    glass.addColorStop(1, "#02091057");
    ctx.fillStyle = glass;
    ctx.fillRect(b.x - camera, b.y, b.w, b.h);
  }
  ctx.restore();
  // The dark bevel belongs to each pane, over the city and under rain on glass.
  for (const b of visible) {
    const edge = ctx.createLinearGradient(
      b.x - camera,
      b.y,
      b.x - camera + 16,
      b.y,
    );
    edge.addColorStop(0, "#02070aaa");
    edge.addColorStop(1, "#02070a00");
    ctx.fillStyle = edge;
    ctx.fillRect(b.x - camera, b.y, 16, b.h);
  }
}
export function drawFloorDepth(
  ctx,
  width,
  ground,
  camera,
  viewWidth,
  rear = ground,
  paintedFloor = false,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-camera, rear, width, ground + 48 - rear);
  ctx.clip();
  const sheen = ctx.createLinearGradient(0, rear, 0, ground + 48);
  sheen.addColorStop(0, "#b3bdc00b");
  sheen.addColorStop(0.4, "#111c2b0a");
  sheen.addColorStop(1, "#02080d9a");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, rear, viewWidth, ground + 48 - rear);
  ctx.restore();
  if (rear < ground && !paintedFloor) {
    // A narrow bevel and a darker slab face separate the walkable surface
    // from the void below. Joints stay in world space when the camera moves.
    const edge = ground + 46;
    ctx.save();
    const face = ctx.createLinearGradient(0, edge, 0, edge + 23);
    face.addColorStop(0, "#374146");
    face.addColorStop(0.18, "#263036");
    face.addColorStop(1, "#0b131b");
    ctx.fillStyle = face;
    ctx.fillRect(-camera, edge, width, 23);
    ctx.fillStyle = "#8f9b9d70";
    ctx.fillRect(-camera, edge, width, 1.5);
    ctx.fillStyle = "#070e1680";
    for (
      let x = Math.max(0, Math.floor(camera / 160) * 160);
      x < Math.min(width, camera + viewWidth);
      x += 160
    )
      ctx.fillRect(x - camera, edge + 2, 1.5, 19);
    ctx.fillStyle = "#02070bbb";
    ctx.fillRect(-camera, edge + 22, width, 3);
    ctx.restore();
  }
}
