// Vice City Studio — the cover renderer.
//
// A cover is three photo panels (one big hero, two small) over a deep-plum field,
// with a title band along the foot. Every panel photo is run through the
// "GTA-ify" grade: contrast + saturation, a gentle posterize blended back with
// the original so faces keep their modelling, a neon-sunset duotone tint, a
// halftone print texture, grain and a vignette. The grade is deliberately
// restrained — a polished, legible cover from one photo beats an effect that
// turns faces into mud.

export const SIZES = {
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920 × 1080' },
  square: { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  story: { w: 1080, h: 1920, label: 'Story 1080 × 1920' },
};

/** Colour grades: shadow/highlight duotone ends and the sunset wash. */
export const GRADES = {
  sunset: { shadow: [38, 10, 58], high: [255, 176, 102], wash: 'rgba(255, 70, 110, 0.10)', warm: 'rgba(255, 150, 60, 0.08)' },
  neon: { shadow: [16, 10, 54], high: [120, 220, 255], wash: 'rgba(150, 60, 255, 0.12)', warm: 'rgba(255, 46, 136, 0.08)' },
  golden: { shadow: [40, 22, 10], high: [255, 200, 110], wash: 'rgba(255, 140, 40, 0.10)', warm: 'rgba(255, 190, 90, 0.08)' },
  off: { shadow: [0, 0, 0], high: [255, 255, 255], wash: 'rgba(0, 0, 0, 0)', warm: 'rgba(0, 0, 0, 0)' },
};

const PLUM = '#1a0b26';
const PLUM_DARK = '#14061f';
const PINK = '#ff2e88';
const ORANGE = '#ff7a18';
const TEAL = '#22d3ee';
const GOLD = '#ffb347';

/**
 * Geometry for a cover of w × h pixels: three panels and the title band.
 * Landscape puts the hero left and two panels stacked right; portrait, square
 * and story stack the hero on top and two panels in a row beneath it.
 */
export function layoutFor(w, h) {
  const gutter = Math.max(6, Math.round(w * 0.008));
  const bandH = Math.round(h * 0.15);
  const contentH = h - bandH - gutter;
  const landscape = w > h;
  let panels;
  if (landscape) {
    const heroW = Math.round((w - gutter) * 0.6);
    const sideW = w - heroW - gutter;
    const sideH = Math.round((contentH - gutter) / 2);
    panels = [
      { x: 0, y: 0, w: heroW, h: contentH },
      { x: heroW + gutter, y: 0, w: sideW, h: sideH },
      { x: heroW + gutter, y: sideH + gutter, w: sideW, h: sideH },
    ];
  } else {
    const heroH = Math.round(contentH * 0.58);
    const rowH = contentH - heroH - gutter;
    const colW = Math.round((w - gutter) / 2);
    panels = [
      { x: 0, y: 0, w, h: heroH },
      { x: 0, y: heroH + gutter, w: colW, h: rowH },
      { x: colW + gutter, y: heroH + gutter, w: w - colW - gutter, h: rowH },
    ];
  }
  return { panels, band: { x: 0, y: h - bandH, w, h: bandH }, gutter };
}

/**
 * Draws `img` (canvas or image) to cover the rect (x, y, w, h), like
 * background-size: cover. `zoom` magnifies from 1 to 3; `panX`/`panY` shift the
 * crop in the range -1..1, measured as a fraction of the overflow.
 */
export function drawCoverFit(ctx, img, x, y, w, h, zoom = 1, panX = 0, panY = 0) {
  const iw = img.width || img.naturalWidth;
  const ih = img.height || img.naturalHeight;
  const base = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const ox = dw > w ? Math.max(-1, Math.min(1, panX)) * (dw - w) / 2 : 0;
  const oy = dh > h ? Math.max(-1, Math.min(1, panY)) * (dh - h) / 2 : 0;
  ctx.drawImage(img, x + (w - dw) / 2 - ox, y + (h - dh) / 2 - oy, dw, dh);
}

let halftoneTile = null;
let grainTile = null;

/** A small dot grid, tiled as a print texture over a graded panel. */
function getHalftoneTile() {
  if (halftoneTile) return halftoneTile;
  const t = document.createElement('canvas');
  t.width = 10; t.height = 10;
  const c = t.getContext('2d');
  c.fillStyle = '#000';
  c.beginPath(); c.arc(5, 5, 1.7, 0, Math.PI * 2); c.fill();
  halftoneTile = t;
  return t;
}

/** A tile of fine random grain, tiled over a graded panel. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 140; t.height = 140;
  const c = t.getContext('2d');
  const img = c.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 64);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = Math.floor(Math.random() * 26);
  }
  c.putImageData(img, 0, 0);
  grainTile = t;
  return t;
}

/**
 * Grades the photo already drawn on `canvas` in place: contrast, saturation,
 * a posterize blended back with the original (faces keep their modelling),
 * a duotone tint, then halftone, grain, vignette and a sunset wash.
 * `strength` is 0..1. Grade "off" only lifts contrast and saturation a touch.
 */
export function gradeInto(canvas, gradeName, strength) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[gradeName] ?? GRADES.sunset;
  const s = Math.max(0, Math.min(1, strength));
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const con = 1 + 0.16 * s;
  const sat = 1 + 0.32 * s;
  const posterMix = gradeName === 'off' ? 0 : 0.6 * s;
  const duoMix = gradeName === 'off' ? 0 : 0.32 * s;
  const levels = 7;
  const [sr, sg, sb] = grade.shadow;
  const [hr, hg, hb] = grade.high;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - 128) * con + 128;
    let g = (d[i + 1] - 128) * con + 128;
    let b = (d[i + 2] - 128) * con + 128;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;
    if (posterMix > 0) {
      const q = (v) => Math.round((v / 255) * (levels - 1)) / (levels - 1) * 255;
      r += (q(r) - r) * posterMix;
      g += (q(g) - g) * posterMix;
      b += (q(b) - b) * posterMix;
    }
    if (duoMix > 0) {
      const l = Math.max(0, Math.min(1, lum / 255));
      r += (sr + (hr - sr) * l - r) * duoMix;
      g += (sg + (hg - sg) * l - g) * duoMix;
      b += (sb + (hb - sb) * l - b) * duoMix;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);

  // Sunset wash, stronger toward the foot of the panel.
  if (s > 0 && grade.wash !== 'rgba(0, 0, 0, 0)') {
    const wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, 'rgba(0, 0, 0, 0)');
    wash.addColorStop(1, grade.wash);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    const warm = ctx.createLinearGradient(w, 0, 0, h);
    warm.addColorStop(0, grade.warm);
    warm.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);
  }

  // Vignette: pull the corners in a little so the panel reads as a poster.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.72,
  );
  vig.addColorStop(0, 'rgba(16, 4, 28, 0)');
  vig.addColorStop(1, `rgba(16, 4, 28, ${0.24 * Math.max(s, 0.4)})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Halftone dots and grain, both kept faint so they texture, never muddy.
  if (s > 0 && gradeName !== 'off') {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ctx.createPattern(getHalftoneTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/**
 * Renders one panel photo into an offscreen canvas of the panel's size and
 * returns it, graded. `crop` is { zoom, panX, panY }.
 */
export function renderPanel(photo, rect, crop, gradeName, strength) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(rect.w));
  c.height = Math.max(2, Math.round(rect.h));
  const ctx = c.getContext('2d');
  ctx.fillStyle = PLUM;
  ctx.fillRect(0, 0, c.width, c.height);
  drawCoverFit(ctx, photo, 0, 0, c.width, c.height, crop.zoom, crop.panX, crop.panY);
  gradeInto(c, gradeName, strength);
  return c;
}

/** Draws the empty-panel placeholder: a setting sun and "ADD A PHOTO". */
function drawEmptyPanel(ctx, rect) {
  const { x, y, w, h } = rect;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#2a1240');
  g.addColorStop(1, '#160a24');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h * 0.42;
  const r = Math.min(w, h) * 0.2;
  const sun = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sun.addColorStop(0, GOLD);
  sun.addColorStop(1, PINK);
  ctx.fillStyle = sun;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(244, 238, 247, 0.75)';
  ctx.font = `${Math.max(11, Math.round(Math.min(w, h) * 0.055))}px Oswald, sans-serif`;
  ctx.textAlign = 'center';
  try { ctx.letterSpacing = '3px'; } catch { /* older canvas */ }
  ctx.fillText('ADD A PHOTO', cx, y + h * 0.78);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/** Largest Anton size that fits `text` in `maxWidth`, starting from `start`. */
function fitTitleSize(ctx, text, maxWidth, start) {
  let size = start;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** Draws the title band: neon rule, sun glow, big Anton title, Oswald tagline. */
function drawTitleBand(ctx, band, title, tagline, w) {
  const { x, y, h } = band;
  ctx.fillStyle = PLUM;
  ctx.fillRect(x, y, w, h);
  const rule = ctx.createLinearGradient(x, 0, x + w, 0);
  rule.addColorStop(0, PINK);
  rule.addColorStop(0.5, ORANGE);
  rule.addColorStop(1, TEAL);
  ctx.fillStyle = rule;
  ctx.fillRect(x, y, w, Math.max(3, Math.round(h * 0.03)));

  const cx = x + w / 2;
  const glow = ctx.createRadialGradient(cx, y + h * 0.55, 0, cx, y + h * 0.55, h * 1.15);
  glow.addColorStop(0, 'rgba(255, 110, 80, 0.30)');
  glow.addColorStop(1, 'rgba(255, 110, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);

  const text = (title || '').trim().toUpperCase();
  if (text) {
    const size = fitTitleSize(ctx, text, w * 0.88, Math.round(h * 0.52));
    const ty = y + h * 0.56;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Hard neon offset shadow, then a dark outline, then the white face.
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.fillStyle = PINK;
    ctx.fillText(text, cx + size * 0.035, ty + size * 0.04);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = PLUM_DARK;
    ctx.strokeText(text, cx, ty);
    ctx.fillStyle = '#fff8f0';
    ctx.fillText(text, cx, ty);
  }

  const tag = (tagline || '').trim().toUpperCase();
  if (tag) {
    const tSize = Math.max(10, Math.round(h * 0.14));
    ctx.font = `${tSize}px Oswald, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, tSize * 0.18)}px`; } catch { /* older canvas */ }
    const tw = ctx.measureText(tag).width;
    const grad = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
    grad.addColorStop(0, PINK);
    grad.addColorStop(1, GOLD);
    ctx.fillStyle = grad;
    ctx.fillText(tag, cx, y + h * 0.84);
    // Short dashes flanking the tagline.
    const dashW = Math.min(70, w * 0.05);
    const dy = y + h * 0.84;
    ctx.fillRect(cx - tw / 2 - dashW - 18, dy - 1, dashW, 2);
    ctx.fillRect(cx + tw / 2 + 18, dy - 1, dashW, 2);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  ctx.textBaseline = 'alphabetic';
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * `state` is { panels: [{ photo, zoom, panX, panY }], grade, gradeStrength,
 * title, tagline }. `opts` may carry `gradedPanels` (pre-rendered panel
 * canvases, same order as panels) and `rawPanels` (a Set of panel indexes to
 * draw ungraded, used while dragging for a smooth pan).
 */
export function drawCover(canvas, state, opts = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = PLUM;
  ctx.fillRect(0, 0, w, h);
  const { panels, band } = layoutFor(w, h);
  const raw = opts.rawPanels ?? new Set();
  const graded = opts.gradedPanels ?? [];

  state.panels.forEach((panel, i) => {
    const rect = panels[i];
    if (!panel || !panel.photo) {
      drawEmptyPanel(ctx, rect);
      return;
    }
    if (graded[i]) {
      ctx.drawImage(graded[i], rect.x, rect.y, rect.w, rect.h);
    } else if (raw.has(i)) {
      drawCoverFit(ctx, panel.photo, rect.x, rect.y, rect.w, rect.h, panel.zoom, panel.panX, panel.panY);
    } else {
      const rendered = renderPanel(panel.photo.canvas, rect, panel, state.grade, state.gradeStrength);
      ctx.drawImage(rendered, rect.x, rect.y, rect.w, rect.h);
    }
  });

  // Thin neon frame around the whole cover.
  ctx.strokeStyle = 'rgba(255, 46, 136, 0.55)';
  ctx.lineWidth = Math.max(2, Math.round(w * 0.002));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);

  drawTitleBand(ctx, band, state.title, state.tagline, w);
  return { panels, band };
}
