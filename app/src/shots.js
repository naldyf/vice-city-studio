// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, rendered at full export
// size and fitted to the viewport. `photo`/`photo2`/`photo3` pick samples
// (samples/<name>.jpg), `caption` and `tagline` the words, `size` the export
// size, `grade` and `strength` the colour grade, and `pan0`/`pan1`/`pan2`,
// `zoom0`/`zoom1`/`zoom2`, `px0`/`px1`/`px2` tune each panel's crop so a
// scene can frame its photos precisely. window.__shotReady is set once painted.

import { SIZES } from './cover.js';
import { loadPhotoURL } from './photos.js';

const canvas = document.getElementById('cover');

/**
 * Runs a screenshot scene. `api` is the editor's own wiring (state,
 * setSize, assignPhoto, redraw and friends) from main.js.
 */
export async function runShot(shot, query, api) {
  const { state } = api;

  const caption = query.get('caption');
  if (caption !== null) {
    state.title = caption;
    document.getElementById('caption').value = caption;
  }
  const tagline = query.get('tagline');
  if (tagline !== null) {
    state.tagline = tagline;
    document.getElementById('tagline').value = tagline;
  }
  const size = query.get('size');
  if (size && SIZES[size]) api.setSize(size);
  const grade = query.get('grade');
  if (grade) {
    state.grade = grade;
    document.querySelectorAll('#presets .preset').forEach((b) => {
      b.classList.toggle('on', b.dataset.grade === grade);
    });
  }
  const strength = query.get('strength');
  if (strength !== null) {
    state.gradeStrength = Number(strength) / 100;
    document.getElementById('grade').value = strength;
  }

  const names = [query.get('photo'), query.get('photo2'), query.get('photo3')]
    .filter((n) => n);
  if (!names.length) names.push('boulevard');
  for (let i = 0; i < names.length; i++) {
    const photo = await loadPhotoURL(`samples/${names[i]}.jpg`, names[i]);
    if (!state.photos.some((p) => p.name === photo.name)) state.photos.push(photo);
    api.assignPhoto(photo, i);
    // Per-panel crop tuning for this scene (panY, zoom, panX), if given.
    const panel = state.panels[i];
    const pan = query.get(`pan${i}`);
    if (pan !== null) panel.panY = Number(pan);
    const zoom = query.get(`zoom${i}`);
    if (zoom !== null) panel.zoom = Number(zoom);
    const px = query.get(`px${i}`);
    if (px !== null) panel.panX = Number(px);
  }
  api.selectPanel(0);

  if (shot === 'cover') {
    // Render at the full export size; CSS fits it to the viewport.
    const full = SIZES[state.size];
    canvas.width = full.w;
    canvas.height = full.h;
    document.body.classList.add('shot-cover');
  }
  api.redraw();
  await document.fonts.ready;
  api.redraw();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
