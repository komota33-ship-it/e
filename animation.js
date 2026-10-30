import { HERO_STRIDE, HERO_LEG_LENGTH, heroLegPose } from "./gait.js";
import { BRUTE_BURST_DELAY } from "./combat.js";
// Each pose is a complete drawing, at one uniform scale for the whole strip.
export const PLAYER_WEAPON = { shoulderX: 13, shoulderY: -86, muzzle: 64 };
const TAU = Math.PI * 2;
const SPRITE_LAYERS = [
  "motion",
  "walk",
  "death",
  "dash",
  "melee",
  "spit",
  "scream",
  "volley",
  "surrender",
];
const clampAnimation = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const strideLengths = {
  player: HERO_STRIDE,
  walker: 60,
  runner: 100,
  brute: 44,
  screamer: 64,
  spitter: 58,
  armored: 48,
  boss: 62,
  matriarch: 44,
  alpha: 66,
  carapace: 48,
  chimera: 52,
  mama: 55,
  elena: 60,
};
export function advanceGait(actor, displacement, type) {
  actor.phase = (actor.phase || 0) + (displacement / strideLengths[type]) * TAU;
}
// Two brief flight phases per run cycle. Move the whole drawing, never stretch
// the legs; grounded contact frames stay on the floor in either direction.
export function runnerFlightLift(phase = 0) {
  const step = (((phase / Math.PI) % 1) + 1) % 1;
  if (step <= 0.65) return 0;
  return 4 * Math.sin(((step - 0.65) / 0.35) * Math.PI) ** 2;
}
export function animationFrame(actor, type, options = {}) {
  if (actor.deathAge !== undefined) {
    const duration =
      type === "boss" ? 1.2 : type === "brute" ? BRUTE_BURST_DELAY : 0.9;
    const count = options.deathFrameCount || 4;
    return (
      8 +
      Math.min(
        count - 1,
        Math.floor((Math.max(0, actor.deathAge) / duration) * count),
      )
    );
  }
  const attack = actor.attack;
  if (attack) {
    if (attack.time < attack.windup * 0.22) return type === "boss" ? 5 : 4;
    if (attack.time < attack.windup) return type === "boss" ? 4 : 5;
    if (attack.time < attack.windup + attack.active) return 6;
    const recovery = clampAnimation(
      (attack.time - attack.windup - attack.active) / attack.recovery,
    );
    // Return the arms to a resting pose before allowing the next step. Ranged
    // attackers use their own recovery drawing, never rewind the spit/scream.
    if (type === "boss") return 7;
    if (
      type === "spitter" ||
      type === "screamer" ||
      type === "alpha" ||
      type === "chimera"
    )
      return recovery < 0.7 ? 7 : 4;
    return recovery < 0.4 ? 7 : recovery < 0.8 ? 5 : 4;
  }
  if (options.airborne) return 1;
  if ((actor.moveBlend || 0) < 0.12)
    return type === "boss" ? 7 : type === "mama" || type === "elena" ? 0 : 4;
  return Math.floor(
    (((((actor.phase || 0) / TAU) % 1) + 1) % 1) *
      (options.walkFrameCount || (type === "player" ? 8 : 4)),
  );
}
export function attackAnimationFrame(attack) {
  if (attack.time < attack.windup)
    return Math.min(
      2,
      Math.floor((Math.max(0, attack.time) / attack.windup) * 3),
    );
  if (attack.time < attack.windup + attack.active)
    return (
      3 +
      Math.min(
        1,
        Math.floor(((attack.time - attack.windup) / attack.active) * 2),
      )
    );
  return (
    5 +
    Math.min(
      2,
      Math.floor(
        (Math.max(0, attack.time - attack.windup - attack.active) /
          attack.recovery) *
          3,
      ),
    )
  );
}
export function atlasCells(image, columnCount = 4, rowCount = 3, gutter = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const c = canvas.getContext("2d", { willReadFrequently: true });
  c.drawImage(image, 0, 0);
  const pixels = c.getImageData(0, 0, image.width, image.height).data;
  // Generated sheets have slightly uneven gutters. Locate transparent gaps
  // before extracting poses, so feet or reaching hands are never sliced off.
  function boundaries(length, count, measure) {
    const result = [0];
    for (let i = 1; i < count; i++) {
      const expected = (length * i) / count,
        reach = (length / count) * 0.22;
      let best = Math.round(expected),
        score = Infinity;
      for (
        let at = Math.floor(expected - reach);
        at <= expected + reach;
        at++
      ) {
        let ink = 0;
        for (let offset = -gutter; offset <= gutter; offset++)
          ink += measure(Math.max(0, Math.min(length - 1, at + offset)));
        const value = ink * length + Math.abs(at - expected);
        if (value < score) {
          score = value;
          best = at;
        }
      }
      result.push(best);
    }
    result.push(length);
    return result;
  }
  const rows = boundaries(image.height, rowCount, (y) => {
    let n = 0;
    for (let x = 0; x < image.width; x++)
      if (pixels[(y * image.width + x) * 4 + 3] > 40) n++;
    return n;
  });
  const cells = [];
  for (let row = 0; row < rowCount; row++) {
    const columns = boundaries(image.width, columnCount, (x) => {
      let n = 0;
      for (let y = rows[row]; y < rows[row + 1]; y++)
        if (pixels[(y * image.width + x) * 4 + 3] > 40) n++;
      return n;
    });
    for (let col = 0; col < columnCount; col++)
      cells.push([columns[col], rows[row], columns[col + 1], rows[row + 1]]);
  }
  return cells;
}
function inspectFrame(image, rectangle) {
  const [sx, sy, right, bottom] = rectangle;
  const width = right - sx;
  const buffer = document.createElement("canvas");
  buffer.width = right - sx;
  buffer.height = bottom - sy;
  const context = buffer.getContext("2d", { willReadFrequently: true });
  context.drawImage(
    image,
    sx,
    sy,
    buffer.width,
    buffer.height,
    0,
    0,
    buffer.width,
    buffer.height,
  );
  const data = context.getImageData(0, 0, buffer.width, buffer.height).data;
  let x0 = buffer.width,
    y0 = buffer.height,
    x1 = 0,
    y1 = 0;
  for (let y = 0; y < buffer.height; y++)
    for (let x = 0; x < buffer.width; x++) {
      if (data[(y * buffer.width + x) * 4 + 3] < 60) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  if (x0 > x1) return null;
  let footRight = x0;
  for (let y = Math.max(y0, y1 - 8); y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (data[(y * buffer.width + x) * 4 + 3] >= 100)
        footRight = Math.max(footRight, x);
  // Anchor living poses at the pelvis, not at the ends of attacking hands.
  let hipSum = 0,
    hipPixels = 0;
  const top = Math.floor(y0 + (y1 - y0) * 0.51),
    end = Math.ceil(y0 + (y1 - y0) * 0.61);
  for (let y = top; y <= end; y++)
    for (let x = x0; x <= x1; x++) {
      if (data[(y * buffer.width + x) * 4 + 3] < 100) continue;
      hipSum += x;
      hipPixels++;
    }
  return {
    image,
    sx,
    sy,
    width: buffer.width,
    height: buffer.height,
    bounds: { x0, y0, x1, y1 },
    hip: hipPixels ? hipSum / hipPixels : width / 2,
    floor: y1 + 1,
    footRight,
    visibleHeight: y1 - y0 + 1,
  };
}
export function createSpriteAnimator(ctx, art) {
  const cache = new Map();
  function framesFor(type) {
    const cached = cache.get(type);
    // Menu rendering may begin while optional atlases are still loading. A
    // cached base sheet must pick up newly loaded layers on the next draw.
    if (
      cached &&
      cached.images.every(
        (image, i) => image === art[`${SPRITE_LAYERS[i]}_${type}`],
      )
    )
      return cached;
    const image = art[`motion_${type}`];
    if (!image) return null;
    const frames = atlasCells(image).map((rectangle) =>
      inspectFrame(image, rectangle),
    );
    if (frames.some((f) => !f)) return null;
    if (type === "carapace") {
      // The shield reaches far outside the torso during a shove. Keep the
      // planted boot at one world point instead of centring the changing pose.
      const planted = frames[4];
      frames.slice(4, 8).forEach((f) => {
        f.anchor = f.footRight - planted.footRight + planted.hip;
      });
    }
    const standing = frames
      .slice(0, 4)
      .map((f) => f.visibleHeight)
      .sort((a, b) => a - b);
    const scale = 124 / ((standing[1] + standing[2]) / 2);
    // Record each death pose relative to its own cell centre; irregular gutters
    // are padding, not movement that should be added to the actor.
    const registration =
      frames.slice(0, 4).reduce((sum, f) => sum + f.hip / f.width, 0) / 4;
    const sheet = {
      frames,
      scale,
      registration,
      images: SPRITE_LAYERS.map((layer) => art[`${layer}_${type}`]),
    };
    for (const action of ["dash", "melee", "spit", "scream", "volley"]) {
      const actionImage = art[`${action}_${type}`];
      if (!actionImage) continue;
      const frames = atlasCells(actionImage, 4, 2, 2).map((r) =>
        inspectFrame(actionImage, r),
      );
      if (frames.every(Boolean)) {
        sheet[`${action}Frames`] = frames;
        sheet[`${action}Scale`] =
          124 / ((frames[0].visibleHeight + frames[7].visibleHeight) / 2);
        // A stationary swipe pivots over its front foot. Reaching hands must
        // not drag the body's origin sideways as the silhouette changes.
        if (action !== "dash")
          frames.forEach((f) => {
            f.anchor = f.footRight - frames[0].footRight + frames[0].hip;
          });
        if (action === "spit" && type === "spitter") {
          // Lip sockets measured on the source atlas; transform them with the
          // exact same crop, planted foot and uniform scale as the body.
          const mouths = [
            [293, 160],
            [668, 119],
            [1050, 113],
            [1489, 206],
            [341, 685],
            [694, 671],
            [1050, 676],
            [1433, 676],
          ];
          frames.forEach((f, i) => {
            f.mouth = {
              x: (mouths[i][0] - f.sx - f.anchor) * sheet.spitScale,
              y: (mouths[i][1] - f.sy - f.floor) * sheet.spitScale,
            };
          });
        }
        if (action === "volley" && type === "boss") {
          // First active pose: the bright acid emerges from the outer claw.
          const f = frames[3];
          sheet.volleyOrigin = {
            x: (1485 - f.sx - f.anchor) * sheet.volleyScale,
            y: (280 - f.sy - f.floor) * sheet.volleyScale,
          };
        }
      }
    }
    const deathImage = art[`death_${type}`];
    if (deathImage) {
      const deathFrames = atlasCells(deathImage, 4, 2, 2).map((r) =>
        inspectFrame(deathImage, r),
      );
      if (deathFrames.every(Boolean)) {
        sheet.deathFrames = deathFrames;
        sheet.deathScale = 124 / deathFrames[0].visibleHeight;
        // Use one authored origin for the entire strip, not the changing
        // silhouette centre. Extraction gutters must not move the corpse.
        const origin = deathFrames[0].sx + deathFrames[0].hip;
        deathFrames.forEach((f, i) => {
          f.anchor = origin + ((i % 4) * deathImage.width) / 4 - f.sx;
        });
      }
    }
    const surrenderImage = art[`surrender_${type}`];
    if (surrenderImage) {
      const surrenderFrames = atlasCells(surrenderImage, 4, 2, 2).map((r) =>
        inspectFrame(surrenderImage, r),
      );
      if (surrenderFrames.every(Boolean)) {
        sheet.surrenderFrames = surrenderFrames;
        sheet.surrenderScale = 124 / surrenderFrames[0].visibleHeight;
        const origin = surrenderFrames[0].sx + surrenderFrames[0].hip;
        surrenderFrames.forEach((f, i) => {
          f.anchor = origin + ((i % 4) * surrenderImage.width) / 4 - f.sx;
        });
      }
    }
    const walkImage = art[`walk_${type}`];
    if (walkImage) {
      // Keep transparent padding around each pose, just as for action/death
      // strips. A boundary on the first empty column can graze a boot's edge.
      sheet.walkFrames = atlasCells(walkImage, 4, 2, 2).map((r) =>
        inspectFrame(walkImage, r),
      );
      const heights = sheet.walkFrames
        .map((f) => f.visibleHeight)
        .sort((a, b) => a - b);
      sheet.walkScale = 124 / ((heights[3] + heights[4]) / 2);
      if (type === "player") {
        const sockets = [
          [247, 164],
          [620, 163],
          [1004, 167],
          [1383, 164],
          [247, 665],
          [620, 664],
          [1000, 665],
          [1386, 665],
        ];
        sheet.walkFrames.forEach(
          (f, i) =>
            (f.shoulder = {
              x: (sockets[i][0] - f.sx - f.hip) * sheet.walkScale,
              y: (sockets[i][1] - f.sy - f.floor) * sheet.walkScale,
            }),
        );
      }
    }
    if (type === "mama" || type === "elena") {
      // These character atlases dedicate row two to walking and row three to
      // the authored attack. Map them to the generic action layers.
      sheet.walkFrames = frames.slice(4, 8);
      sheet.walkScale = scale;
      const ritual = frames.slice(8, 12);
      sheet.meleeFrames = [
        ritual[0],
        ritual[0],
        ritual[1],
        ritual[2],
        ritual[2],
        ritual[3],
        ritual[3],
        ritual[3],
      ];
      sheet.meleeScale = scale;
      if (type === "elena") {
        sheet.volleyFrames = sheet.meleeFrames;
        sheet.volleyScale = scale;
      }
      ritual.forEach((f) => {
        f.anchor = f.footRight - ritual[0].footRight + ritual[0].hip;
      });
    }
    cache.set(type, sheet);
    return sheet;
  }
  function drawLegs(pose) {
    const frames =
      cache.get("legs") ||
      atlasCells(art.hero_legs, 3, 2).map((r) =>
        inspectFrame(art.hero_legs, r),
      );
    cache.set("legs", frames);
    function segment(index, start, end) {
      const f = frames[index],
        b = f.bounds;
      const joints = [
        [337, 80, 431, 394],
        [775, 100, 775, 421],
        null,
        [339, 585, 421, 913],
        [773, 612, 777, 938],
      ];
      const [ax, ay, bx, by] = joints[index];
      const ratio = HERO_LEG_LENGTH / Math.hypot(bx - ax, by - ay);
      ctx.save();
      ctx.translate(start.x, start.y);
      ctx.rotate(
        Math.atan2(end.y - start.y, end.x - start.x) -
          Math.atan2(by - ay, bx - ax),
      );
      // The kneepad belongs to the shin; trim the duplicate cap on the thigh.
      const height = index % 3 === 0 ? by - f.sy - 35 : f.height;
      ctx.drawImage(
        f.image,
        f.sx,
        f.sy,
        f.width,
        height,
        -(ax - f.sx) * ratio,
        -(ay - f.sy) * ratio,
        f.width * ratio,
        height * ratio,
      );
      ctx.restore();
    }
    function boot(index, leg) {
      const { ankle, angle = 0 } = leg;
      const f = frames[index],
        b = f.bounds,
        ratio = 23 / (b.x1 - b.x0 + 1);
      ctx.save();
      ctx.translate(ankle.x, ankle.y);
      ctx.rotate(angle);
      // The ankle sits 7 world units above a flat planted sole.
      ctx.drawImage(
        f.image,
        f.sx,
        f.sy,
        f.width,
        f.height,
        -(b.x0 + (b.x1 - b.x0) * 0.3) * ratio,
        7 - f.floor * ratio,
        f.width * ratio,
        f.height * ratio,
      );
      ctx.restore();
    }
    for (const [leg, offset] of [
      [pose.far, 3],
      [pose.near, 0],
    ]) {
      ctx.save();
      if (offset === 3) ctx.filter = "brightness(.78)";
      segment(offset, leg.hip, leg.knee);
      segment(offset + 1, leg.knee, leg.ankle);
      boot(offset + 2, leg);
      ctx.restore();
    }
  }
  function torsoFrame() {
    if (cache.has("torso")) return cache.get("torso");
    const f = inspectFrame(art.hero_torso, [
      0,
      0,
      art.hero_torso.width,
      art.hero_torso.height,
    ]);
    f.scale = 63 / (970 - f.bounds.y0);
    f.x = -680 * f.scale;
    f.y = -124 - f.bounds.y0 * f.scale;
    cache.set("torso", f);
    return f;
  }
  function shoulderFor(actor, options = {}) {
    const sheet = framesFor("player");
    if (
      art.hero_legs &&
      art.hero_torso &&
      actor.deathAge === undefined &&
      !options.airborne
    ) {
      const f = torsoFrame();
      return {
        x: f.x + 790 * f.scale,
        y: f.y + 588 * f.scale + heroLegPose(actor).bob,
      };
    }
    if (
      sheet?.walkFrames &&
      actor.deathAge === undefined &&
      !actor.attack &&
      !options.airborne &&
      (actor.moveBlend || 0) >= 0.12
    ) {
      const frame = sheet.walkFrames[animationFrame(actor, "player", options)];
      return frame.shoulder;
    }
    return { x: PLAYER_WEAPON.shoulderX, y: PLAYER_WEAPON.shoulderY };
  }
  function draw(actor, options) {
    const {
      type,
      x,
      y,
      dir = 1,
      size = 1,
      aimAngle = 0,
      reload = 0,
      shot = 0,
      melee = 0,
      hit = 0,
      weapon = "pistol",
    } = options;
    const sheet = framesFor(type);
    if (!sheet) return false;
    const index = animationFrame(actor, type, {
        ...options,
        walkFrameCount: sheet.walkFrames?.length,
        deathFrameCount: sheet.deathFrames?.length,
      }),
      dead = actor.deathAge !== undefined;
    const walking =
      !dead &&
      !actor.attack &&
      !options.airborne &&
      (actor.moveBlend || 0) >= 0.12 &&
      sheet.walkFrames;
    const rigged =
      type === "player" &&
      !dead &&
      !options.airborne &&
      art.hero_legs &&
      art.hero_torso;
    const separateDeath = dead && sheet.deathFrames;
    const surrendering = !dead && actor.surrender && sheet.surrenderFrames;
    const action =
      actor.attack?.kind === "dash"
        ? "dash"
        : actor.attack?.kind === "spit"
          ? "spit"
          : actor.attack?.kind === "volley"
            ? "volley"
            : ["runner", "melee", "heavy"].includes(actor.attack?.kind)
              ? "melee"
              : actor.attack?.kind === "summon" && type === "mama"
                ? "melee"
                : actor.attack?.kind === "scream"
                  ? "scream"
                  : null;
    const actionFrames = !dead && action && sheet[`${action}Frames`];
    const frame = separateDeath
        ? sheet.deathFrames[index - 8]
        : surrendering
          ? sheet.surrenderFrames[
              Math.min(7, Math.floor(((actor.surrenderAge || 0) * 8) / 0.9))
            ]
          : actionFrames
            ? actionFrames[attackAnimationFrame(actor.attack)]
            : rigged
              ? sheet.frames[4]
              : walking
                ? sheet.walkFrames[index]
                : sheet.frames[index],
      scale = separateDeath
        ? sheet.deathScale
        : surrendering
          ? sheet.surrenderScale
          : actionFrames
            ? sheet[`${action}Scale`]
            : rigged
              ? sheet.scale
              : walking
                ? sheet.walkScale
                : sheet.scale;
    const gait = rigged ? heroLegPose(actor) : null;
    // Death frames contain the actual fall. Never flatten or rotate a standing body.
    const anchor =
      separateDeath ||
      surrendering ||
      (actionFrames && action !== "dash") ||
      (type === "carapace" && actor.attack && frame.anchor !== undefined)
        ? frame.anchor
        : dead
          ? sheet.registration * frame.width
          : frame.hip;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * size, size);
    if (hit > 0) ctx.filter = "brightness(1.12) saturate(.85)";
    if (gait) {
      drawLegs(gait);
      const torso = torsoFrame();
      ctx.drawImage(
        torso.image,
        torso.sx,
        torso.sy,
        torso.width,
        torso.height,
        torso.x,
        torso.y + gait.bob,
        torso.width * torso.scale,
        torso.height * torso.scale,
      );
    } else {
      const lift =
        walking && type === "runner"
          ? runnerFlightLift(actor.phase) * clampAnimation(actor.moveBlend)
          : 0;
      ctx.drawImage(
        frame.image,
        frame.sx,
        frame.sy,
        frame.width,
        frame.height,
        -anchor * scale,
        -frame.floor * scale - lift,
        frame.width * scale,
        frame.height * scale,
      );
    }
    if (
      type === "player" &&
      !dead &&
      art.weapon_arms &&
      (weapon !== "none" || melee > 0)
    ) {
      const localAngle = Math.atan2(
        Math.sin(aimAngle),
        Math.cos(aimAngle) * dir,
      );
      const index =
        melee > 0 ? 2 : reload > 0 ? 3 : weapon === "shotgun" ? 1 : 0;
      const cw = art.weapon_arms.width / 2,
        ch = art.weapon_arms.height / 2;
      const armFrames =
        cache.get("arms") ||
        atlasCells(art.weapon_arms, 2, 2).map((r) =>
          inspectFrame(art.weapon_arms, r),
        );
      cache.set("arms", armFrames);
      const a = armFrames[index],
        pivotX = a.bounds.x0 + 85,
        pivotY = a.bounds.y0 + 86;
      const angle =
        melee > 0
          ? -1.2 + (1 - melee / 0.45) * 1.8
          : reload > 0
            ? 0.45
            : localAngle;
      const correction = [0.045, -0.005, -0.06, 0][index],
        armScale = 0.11;
      const recoil = clampAnimation(shot / 0.23) * 1.1;
      const shoulder = shoulderFor(actor, options);
      ctx.save();
      ctx.translate(shoulder.x - recoil, shoulder.y);
      ctx.rotate(angle + correction);
      ctx.drawImage(
        a.image,
        a.sx,
        a.sy,
        a.width,
        a.height,
        -pivotX * armScale,
        -pivotY * armScale,
        a.width * armScale,
        a.height * armScale,
      );
      ctx.restore();
    }
    ctx.restore();
    return true;
  }
  function spitMouthFor(actor) {
    const sheet = framesFor("spitter");
    const frame =
      actor.attack?.kind === "spit" ? attackAnimationFrame(actor.attack) : 3;
    return sheet?.spitFrames?.[frame]?.mouth || { x: 20, y: -107 };
  }
  function bossVolleyOriginFor() {
    return framesFor("boss")?.volleyOrigin || { x: 90, y: -88 };
  }
  function chimeraSpitOriginFor() {
    const sheet = framesFor("chimera"),
      f = sheet?.spitFrames?.[4];
    // Outer tip of the mutated hand in the first active spit pose.
    return f
      ? {
          x: (475 - f.sx - f.anchor) * sheet.spitScale,
          y: (600 - f.sy - f.floor) * sheet.spitScale,
        }
      : { x: 85, y: -72 };
  }
  function elenaPulseOriginFor() {
    const sheet = framesFor("elena"),
      f = sheet?.frames?.[10];
    return f
      ? {
          x: (1038 - f.sx - f.anchor) * sheet.scale,
          y: (897 - f.sy - f.floor) * sheet.scale,
        }
      : { x: 65, y: -72 };
  }
  function bruteBurstOriginFor() {
    const sheet = framesFor("brute");
    const f = sheet?.deathFrames?.[7];
    // Belly in the final authored pose; use the same crop, anchor and scale
    // as draw(), so facing and enemy size can be applied by the caller.
    return f
      ? {
          x: (1356 - f.sx - f.anchor) * sheet.deathScale,
          y: (862 - f.sy - f.floor) * sheet.deathScale,
        }
      : { x: 0, y: -24 };
  }
  function screamMouthFor() {
    const sheet = framesFor("screamer"),
      f = sheet?.screamFrames?.[3];
    // First active scream pose: the wave begins at the open mouth.
    return f
      ? {
          x: (1422 - f.sx - f.anchor) * sheet.screamScale,
          y: (101 - f.sy - f.floor) * sheet.screamScale,
        }
      : { x: 12, y: -110 };
  }
  function alphaScreamMouthFor() {
    const sheet = framesFor("alpha"),
      f = sheet?.frames?.[6];
    return f
      ? {
          x: (1001 - f.sx - f.hip) * sheet.scale,
          y: (400 - f.sy - f.floor) * sheet.scale,
        }
      : { x: 16, y: -112 };
  }
  return {
    draw,
    framesFor,
    shoulderFor,
    spitMouthFor,
    bossVolleyOriginFor,
    chimeraSpitOriginFor,
    elenaPulseOriginFor,
    bruteBurstOriginFor,
    screamMouthFor,
    alphaScreamMouthFor,
  };
}
