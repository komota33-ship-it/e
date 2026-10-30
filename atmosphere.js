// Погодные эффекты обрезаются по стёклам; источники света привязаны к рисунку.
const weatherHash = (n) => {
  const v = Math.sin(n * 91.73 + 17.3) * 43758.5453;
  return v - Math.floor(v);
};
export function drawWindowWeather(ctx, windows, time, camera, seed = 0) {
  for (let pane = 0; pane < windows.length; pane++) {
    const b = windows[pane];
    if (b.x - camera + b.w < 0 || b.x - camera > ctx.canvas.width) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x - camera, b.y, b.w, b.h);
    ctx.clip();
    const flashPhase = (time + seed * 0.31) % 19;
    if (flashPhase < 0.16) {
      ctx.fillStyle = `rgba(139,166,189,${Math.sin((flashPhase / 0.16) * Math.PI) * 0.12})`;
      ctx.fillRect(b.x - camera, b.y, b.w, b.h);
    }
    for (let layer = 0; layer < 2; layer++) {
      ctx.strokeStyle = layer ? "#acc4d34a" : "#708d9d35";
      ctx.lineWidth = layer ? 1 : 0.65;
      ctx.beginPath();
      const count = Math.max(8, Math.ceil(b.w / 9));
      for (let i = 0; i < count; i++) {
        const key = i + pane * 113 + layer * 233 + seed;
        const speed = layer ? 210 : 130;
        const y =
          b.y +
          ((weatherHash(key + 91) * b.h + time * speed) % (b.h + 24)) -
          12;
        const x =
          b.x -
          camera +
          ((((weatherHash(key) * b.w - time * 35) % (b.w + 15)) + b.w + 15) %
            (b.w + 15)) -
          7;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + (layer ? 14 : 9));
      }
      ctx.stroke();
    }
    // Отблески пожаров вдалеке остаются за стеклом.
    for (let i = 0; i < 5; i++) {
      const x = b.x - camera + weatherHash(i + pane * 53) * b.w,
        y = b.y + b.h - ((time * 11 + i * 29) % (b.h * 0.75));
      ctx.fillStyle = "#b9763a65";
      ctx.fillRect(x, y, 1.2, 1.5);
    }
    const glass = ctx.createLinearGradient(
      b.x - camera,
      b.y,
      b.x - camera + b.w,
      b.y + b.h,
    );
    glass.addColorStop(0, "#aac7d00b");
    glass.addColorStop(0.5, "#101c2c00");
    glass.addColorStop(1, "#04091235");
    ctx.fillStyle = glass;
    ctx.fillRect(b.x - camera, b.y, b.w, b.h);
    ctx.restore();
  }
}
export function drawInteriorAmbience(
  ctx,
  zone,
  floor,
  time,
  camera,
  sceneWidth,
  ground,
  viewWidth,
) {
  if (zone === "roof") return;
  const sector =
    zone === "technical" || zone === "bunker"
      ? "parking"
      : zone === "infirmary"
        ? "laboratory"
        : zone;
  const tint =
    {
      office: "#a8b8b2",
      laboratory: "#9fbca9",
      apartment: "#c2ad8a",
      mall: "#bcb29b",
      parking: "#9cadb8",
    }[sector] || "#aeb9b5";
  ctx.save();
  // Slow motes make the lamps and depth visible without masking enemies.
  for (
    let i = Math.max(0, Math.floor(camera / 96) - 1);
    i < Math.ceil((camera + viewWidth) / 96) + 1;
    i++
  ) {
    const base = i * 96 + weatherHash(i * 13 + floor * 19) * 60;
    if (base > sceneWidth) continue;
    const drift = Math.sin(time * 0.43 + i * 2.1) * 5;
    const y =
      ground -
      22 -
      weatherHash(i * 37 + floor) * 176 +
      Math.sin(time * 0.3 + i) * 4;
    const alpha = 0.11 + weatherHash(i * 17 + floor) * 0.13;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = tint;
    ctx.fillRect(
      base - camera + drift,
      y,
      i % 4 ? 1.2 : 2.3,
      i % 4 ? 1.2 : 1.6,
    );
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < Math.ceil(sceneWidth / 360); i++) {
    const worldX = 185 + i * 360 + weatherHash(i + floor * 3) * 90;
    const x = worldX - camera;
    if (x < -20 || x > viewWidth + 20) continue;
    if (sector === "office" || sector === "apartment") {
      const y = ground + 10 - Math.abs(Math.sin(time * 0.8 + i * 3)) * 14;
      ctx.save();
      ctx.translate(x + Math.sin(time * 0.5 + i) * 7, y);
      ctx.rotate(Math.sin(time * 0.6 + i) * 0.35);
      ctx.globalAlpha = sector === "office" ? 0.23 : 0.14;
      ctx.fillStyle = sector === "office" ? "#bbb6a2" : "#ae9176";
      ctx.fillRect(-3, -1, 6, 2);
      ctx.restore();
    } else if (sector === "laboratory") {
      ctx.fillStyle = "#a2bc695c";
      ctx.fillRect(x - 7, ground + 2, 14, 1);
      for (let drop = 0; drop < 2; drop++) {
        const y = ground - 190 + ((time * 56 + drop * 98 + i * 41) % 188);
        ctx.fillStyle = "#b4d08476";
        ctx.fillRect(x + drop * 3, y, 1.7, 3.5);
      }
    } else if (sector === "mall") {
      const pulse = (time + floor * 0.19 + i * 1.7) % 8;
      if (pulse < 0.22) {
        ctx.strokeStyle = `rgba(235,178,101,${0.34 * (1 - pulse / 0.22)})`;
        ctx.beginPath();
        ctx.moveTo(x, ground - 177);
        ctx.lineTo(x + 4, ground - 170);
        ctx.lineTo(x + 1, ground - 166);
        ctx.stroke();
      }
    } else if (sector === "parking") {
      for (let wisp = 0; wisp < 3; wisp++) {
        const rise = (time * (12 + wisp * 3) + wisp * 20 + i * 7) % 53;
        ctx.strokeStyle = `rgba(158,177,184,${0.13 * (1 - rise / 53)})`;
        ctx.beginPath();
        ctx.moveTo(x + wisp * 6 - 6, ground + 3 - rise);
        ctx.quadraticCurveTo(
          x + Math.sin(time + wisp) * 7,
          ground - rise - 8,
          x + wisp * 6 - 2,
          ground - rise - 14,
        );
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
export function drawSceneLighting(
  ctx,
  lights,
  containers,
  ground,
  camera,
  sceneWidth,
  time = 0,
  floor = 50,
  tone = 0,
  zone = "office",
) {
  ctx.save();
  // Контактные тени объединяют мебель с полом, не меняя границы проходов.
  for (const c of containers) {
    const b = c.bounds;
    ctx.fillStyle = "#02060855";
    ctx.beginPath();
    ctx.ellipse(
      b.x + b.w * 0.54 - camera,
      ground + 2,
      b.w * 0.54,
      5,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalCompositeOperation = "screen";
  for (const [index, lamp] of lights.entries()) {
    const b = lamp.bounds,
      x = b.x + b.w / 2 - camera,
      y = b.y + b.h;
    if (x < -200 || x > ctx.canvas.width + 200) continue;
    const state = fixtureState(floor, index, time, tone, zone);
    const radius = lamp.radius || 140;
    ctx.globalAlpha = state.intensity;
    const light = ctx.createRadialGradient(x, y, 1, x, y, radius);
    light.addColorStop(0, `${lamp.color}1d`);
    light.addColorStop(0.55, `${lamp.color}0a`);
    light.addColorStop(1, `${lamp.color}00`);
    ctx.fillStyle = light;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    const ray = ctx.createLinearGradient(x, y, x, ground);
    ray.addColorStop(0, `${lamp.color}09`);
    ray.addColorStop(1, `${lamp.color}00`);
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(x - b.w * 0.4, y);
    ctx.lineTo(x + b.w * 0.4, y);
    ctx.lineTo(x + radius * 0.6, ground);
    ctx.lineTo(x - radius * 0.6, ground);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `${lamp.color}12`;
    ctx.beginPath();
    ctx.ellipse(
      x,
      ground + 7,
      Math.min(90, radius * 0.6),
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
    // The spark comes from the same painted fixture as its cone of light.
    if (state.spark) {
      ctx.strokeStyle = "#bba77b88";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + 3, y + 5);
      ctx.lineTo(x + 1, y + 8);
      ctx.stroke();
      ctx.fillStyle = "#e1c47d99";
      ctx.fillRect(x - 2, y + 6, 2, 2);
    }
  }
  ctx.restore();
}
export function fixtureState(floor, index, time, tone = 0, zone = "office") {
  if (zone === "roof") return { damaged: false, intensity: 1, spark: false };
  const damaged =
    (floor * 7 + index * 3 + tone) % 5 === 0 || (tone === 3 && index % 4 === 1);
  if (!damaged) return { damaged: false, intensity: 1, spark: false };
  const phase = (((time + floor * 0.71 + index * 1.43) % 7.6) + 7.6) % 7.6;
  const spark = phase < 0.14;
  return {
    damaged: true,
    intensity: spark ? 0.18 : 0.53 + Math.sin(time * 1.7 + index) * 0.06,
    spark,
  };
}
export function drawContactShadow(ctx, x, y, size = 1, air = 0) {
  ctx.save();
  // Soft outer shadow gives the body weight; the darker narrow centre stays
  // at floor level. Jumping only changes opacity/width, never the floor point.
  ctx.save();
  ctx.translate(x, y + 2);
  ctx.scale(size / (1 + air / 220), size * 0.22);
  const soft = ctx.createRadialGradient(0, 0, 2, 0, 0, 39);
  soft.addColorStop(0, `rgba(0,3,7,${0.4 / (1 + air / 100)})`);
  soft.addColorStop(1, "rgba(0,3,7,0)");
  ctx.fillStyle = soft;
  ctx.fillRect(-39, -39, 78, 78);
  ctx.restore();
  ctx.fillStyle = `rgba(0,3,7,${0.32 / (1 + air / 100)})`;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y + 2,
    (23 * size) / (1 + air / 220),
    4.2 * size,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}
