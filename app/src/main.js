// Vice City Studio — the editor.
//
// Wires the page: load photos (upload, drag and drop, or a sample), pick a
// panel and crop its photo, choose a grade and a caption, and export the cover
// as a PNG in the common post sizes. The preview is a live canvas; panel
// grading is cached per panel so typing a caption never re-grades a photo.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).

import { SIZES, drawCover, layoutFor, renderPanel } from './cover.js';
import { loadPhotoFile, loadPhotoURL } from './photos.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { name: 'boulevard', label: 'Boulevard' },
  { name: 'pier', label: 'Pier' },
  { name: 'night', label: 'Night street' },
  { name: 'market', label: 'Market' },
  { name: 'bike', label: 'Bike' },
];

/** Preview canvas long side, in pixels (the export renders at full size). */
const PREVIEW_LONG_SIDE = 960;

/** Face-friendly default crop per panel, applied when a new photo is assigned.
 *  Staggered slightly top to bottom so one photo across all three panels reads
 *  as three different crops, not the same frame three times. */
const DEFAULT_CROPS = [
  { zoom: 1.05, panX: -0.2, panY: -0.75 },
  { zoom: 1.45, panX: 0, panY: -0.55 },
  { zoom: 1.45, panX: 0, panY: -0.35 },
];

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');
const zoomInput = document.getElementById('zoom');
const gradeInput = document.getElementById('grade');
const panelSelect = document.getElementById('panelSelect');
const thumbsEl = document.getElementById('thumbs');
const samplesEl = document.getElementById('samples');

const state = {
  size: 'landscape',
  photos: [],
  // Default crops favour the top of a photo, where faces usually are, so a
  // portrait photo in a wide panel still shows the face.
  panels: [
    { photo: null, zoom: 1.05, panX: -0.2, panY: -0.75 },
    { photo: null, zoom: 1.45, panX: 0, panY: -0.55 },
    { photo: null, zoom: 1.45, panX: 0, panY: -0.35 },
  ],
  selectedPanel: 0,
  grade: 'sunset',
  gradeStrength: 0.7,
  title: 'Sunset Heist',
  tagline: 'A sunset story',
};

/** Graded panel canvases, keyed by panel inputs — caption typing never re-grades. */
const gradedCache = new Map();
let dragging = false;
let dragPanel = -1;
let dragLast = null;
let renderQueued = false;

function setStatus(text) {
  statusEl.textContent = text;
}

function panelKey(i) {
  const p = state.panels[i];
  const rect = layoutFor(canvas.width, canvas.height).panels[i];
  return [
    p.photo ? p.photo.id : 'none',
    p.zoom.toFixed(3), p.panX.toFixed(3), p.panY.toFixed(3),
    state.grade, state.gradeStrength.toFixed(3),
    rect.w, rect.h,
  ].join('|');
}

function gradedPanel(i) {
  const key = panelKey(i);
  let rendered = gradedCache.get(key);
  if (rendered) return rendered;
  const p = state.panels[i];
  if (!p.photo) return null;
  const rect = layoutFor(canvas.width, canvas.height).panels[i];
  rendered = renderPanel(p.photo.canvas, rect, p, state.grade, state.gradeStrength);
  gradedCache.set(key, rendered);
  if (gradedCache.size > 24) gradedCache.clear();
  return rendered;
}

/** Redraws the preview, reusing graded panels from the cache. */
function redraw() {
  const graded = state.panels.map((_, i) => gradedPanel(i));
  const raw = dragging && dragPanel >= 0 ? new Set([dragPanel]) : new Set();
  drawCover(canvas, state, { gradedPanels: graded, rawPanels: raw });
}

/** Queues a redraw on the next animation frame (slider drags). */
function queueRedraw() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    redraw();
  });
}

/** Sizes the preview canvas for the current export size (long side 960 px). */
function sizePreview() {
  const size = SIZES[state.size];
  const scale = PREVIEW_LONG_SIDE / Math.max(size.w, size.h);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  gradedCache.clear();
}

function setSize(name) {
  if (!SIZES[name]) return;
  state.size = name;
  document.querySelectorAll('#sizes .size').forEach((b) => {
    b.classList.toggle('on', b.dataset.size === name);
  });
  sizePreview();
  redraw();
}

function selectPanel(i) {
  state.selectedPanel = i;
  panelSelect.value = String(i);
  const p = state.panels[i];
  zoomInput.value = String(p.zoom);
  renderThumbs();
}

/** Assigns a photo to a panel (or to every panel when `all` is true).
 *  The panel's crop resets to its face-friendly default for the new photo. */
function assignPhoto(photo, panelIndex, all = false) {
  const resetCrop = (p, i) => {
    const d = DEFAULT_CROPS[i];
    p.zoom = d.zoom; p.panX = d.panX; p.panY = d.panY;
  };
  if (all) {
    state.panels.forEach((p, i) => { p.photo = photo; resetCrop(p, i); });
  } else if (panelIndex >= 0) {
    state.panels[panelIndex].photo = photo;
    resetCrop(state.panels[panelIndex], panelIndex);
  }
  gradedCache.clear();
  renderThumbs();
  redraw();
}

/** Adds freshly loaded photos: the first fills every panel, the next ones
 *  take the next empty panel, later ones wait in the strip to be assigned. */
function addPhotos(photos) {
  photos.forEach((photo) => {
    state.photos.push(photo);
    if (state.photos.length === 1) {
      assignPhoto(photo, 0, true);
      return;
    }
    const empty = state.panels.findIndex((p) => !p.photo);
    if (empty >= 0) assignPhoto(photo, empty);
  });
  renderThumbs();
  redraw();
}

async function loadSample(name) {
  setStatus(`Loading sample ${name}…`);
  const photo = await loadPhotoURL(`samples/${name}.jpg`, name);
  addPhotos([photo]);
  setStatus(`Loaded sample ${name}.`);
  return photo;
}

function renderThumbs() {
  thumbsEl.innerHTML = '';
  const assigned = new Set(state.panels.map((p) => (p.photo ? p.photo.id : -1)));
  state.photos.forEach((photo) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (assigned.has(photo.id) ? ' assigned' : '');
    if (state.panels[state.selectedPanel].photo === photo) b.classList.add('sel');
    b.title = photo.name;
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = photo.canvas.toDataURL('image/jpeg', 0.72);
    img.alt = photo.name;
    b.appendChild(img);
    b.addEventListener('click', () => assignPhoto(photo, state.selectedPanel));
    thumbsEl.appendChild(b);
  });
}

function renderSamples() {
  SAMPLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = s.label;
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = `samples/${s.name}.jpg`;
    img.alt = s.label;
    b.appendChild(img);
    b.addEventListener('click', async () => {
      const existing = state.photos.find((p) => p.name === s.name);
      if (existing) {
        assignPhoto(existing, state.selectedPanel);
        return;
      }
      const photo = await loadSample(s.name);
      assignPhoto(photo, state.selectedPanel);
    });
    samplesEl.appendChild(b);
  });
}

/** Renders the cover at full export size and returns the PNG blob + name. */
async function renderExport(sizeName) {
  const size = SIZES[sizeName];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  await document.fonts.ready;
  drawCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  return { blob, name: `vice-city-studio-${sizeName}-${size.w}x${size.h}.png` };
}

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

async function exportSize(sizeName) {
  setStatus(`Rendering ${SIZES[sizeName].label}…`);
  const { blob, name } = await renderExport(sizeName);
  downloadBlob(blob, name);
  setStatus(`Saved ${name}.`);
  return { blob, name };
}

async function exportAll() {
  for (const name of Object.keys(SIZES)) {
    await exportSize(name);
  }
  setStatus('Saved all 4 sizes.');
}

/** Canvas point (in canvas pixels) → panel index, or -1 outside any panel. */
function panelAt(cx, cy) {
  const { panels } = layoutFor(canvas.width, canvas.height);
  return panels.findIndex((r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h);
}

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

/** Drawn photo size for a panel, for turning a drag into a pan fraction. */
function drawnSize(panel, rect) {
  const photo = panel.photo.canvas;
  const base = Math.max(rect.w / photo.width, rect.h / photo.height) * panel.zoom;
  return { w: photo.width * base, h: photo.height * base };
}

function wireEvents() {
  document.getElementById('browse').addEventListener('click', () => {
    document.getElementById('photo').click();
  });
  document.getElementById('photo').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    setStatus(`Loading ${files.length} photo${files.length > 1 ? 's' : ''}…`);
    addPhotos(await Promise.all(files.map(loadPhotoFile)));
    setStatus('Photos loaded.');
    e.target.value = '';
  });

  const drop = document.getElementById('drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setStatus(`Loading ${files.length} photo${files.length > 1 ? 's' : ''}…`);
    addPhotos(await Promise.all(files.map(loadPhotoFile)));
    setStatus('Photos loaded.');
  });

  document.getElementById('onePhoto').addEventListener('click', () => {
    if (!state.photos.length) return;
    assignPhoto(state.photos[0], 0, true);
    setStatus('First photo on all panels.');
  });

  panelSelect.addEventListener('change', () => selectPanel(Number(panelSelect.value)));
  zoomInput.addEventListener('input', () => {
    state.panels[state.selectedPanel].zoom = Number(zoomInput.value);
    queueRedraw();
  });
  document.getElementById('fitBtn').addEventListener('click', () => {
    const p = state.panels[state.selectedPanel];
    p.zoom = 1; p.panX = 0; p.panY = 0;
    zoomInput.value = '1';
    gradedCache.clear();
    redraw();
  });
  document.getElementById('fillBtn').addEventListener('click', () => {
    const p = state.panels[state.selectedPanel];
    p.zoom = 1.8; p.panX = 0; p.panY = 0;
    zoomInput.value = '1.8';
    gradedCache.clear();
    redraw();
  });

  document.getElementById('presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-grade]');
    if (!b) return;
    state.grade = b.dataset.grade;
    document.querySelectorAll('#presets .preset').forEach((x) => {
      x.classList.toggle('on', x === b);
    });
    gradedCache.clear();
    redraw();
  });
  gradeInput.addEventListener('input', () => {
    state.gradeStrength = Number(gradeInput.value) / 100;
    queueRedraw();
  });

  captionInput.addEventListener('input', () => {
    state.title = captionInput.value;
    queueRedraw();
  });
  taglineInput.addEventListener('input', () => {
    state.tagline = taglineInput.value;
    queueRedraw();
  });

  document.getElementById('sizes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (b) setSize(b.dataset.size);
  });
  document.getElementById('export').addEventListener('click', () => exportSize(state.size));
  document.getElementById('exportAll').addEventListener('click', exportAll);

  canvas.addEventListener('pointerdown', (e) => {
    const { x, y } = canvasPoint(e);
    const i = panelAt(x, y);
    if (i < 0 || !state.panels[i].photo) return;
    selectPanel(i);
    dragging = true;
    dragPanel = i;
    dragLast = { x, y };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || dragPanel < 0) return;
    const { x, y } = canvasPoint(e);
    const panel = state.panels[dragPanel];
    const rect = layoutFor(canvas.width, canvas.height).panels[dragPanel];
    const drawn = drawnSize(panel, rect);
    const ox = Math.max(0, (drawn.w - rect.w) / 2);
    const oy = Math.max(0, (drawn.h - rect.h) / 2);
    if (ox > 0) panel.panX = Math.max(-1, Math.min(1, panel.panX - (x - dragLast.x) / ox));
    if (oy > 0) panel.panY = Math.max(-1, Math.min(1, panel.panY - (y - dragLast.y) / oy));
    dragLast = { x, y };
    queueRedraw();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    dragPanel = -1;
    dragLast = null;
    gradedCache.clear();
    redraw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

/** Loads the three default samples so the app opens on a finished cover. */
async function loadDefaults() {
  const boulevard = await loadSample('boulevard');
  const pier = await loadSample('pier');
  const night = await loadSample('night');
  state.panels[0].photo = boulevard;
  state.panels[1].photo = pier;
  state.panels[2].photo = night;
  gradedCache.clear();
  renderThumbs();
  redraw();
  setStatus('Ready — pick a photo, a grade and a size, then export.');
}

async function init() {
  wireEvents();
  renderSamples();
  sizePreview();
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('28px Oswald'),
      document.fonts.ready,
    ]);
  } catch {
    // Canvas falls back to sans-serif; the cover still renders.
  }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, {
      state,
      loadSample,
      setSize,
      selectPanel,
      assignPhoto,
      setStatus,
      redraw,
    });
  } else {
    await loadDefaults();
  }
  redraw();
}

/** Test hook: the driver and the finalist review can call these directly. */
window.__viceCity = {
  state,
  setSize,
  loadSample,
  exportPNG: async (sizeName) => {
    const { blob, name } = await renderExport(sizeName);
    return { name, dataUrl: await blobToDataURL(blob) };
  },
  exportSize,
};

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

init();
