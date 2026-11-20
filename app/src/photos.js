// Vice City Studio — photo loading.
//
// A photo is a downscaled canvas (long side at most 2048 px) plus its size and
// a name, so panels can draw from it cheaply at any crop. Orientation is read
// from EXIF where the browser supports it, so a phone photo never arrives
// sideways. Large files are downscaled on load, never at export time.

/** Longest side a loaded photo keeps, in pixels. */
export const MAX_PHOTO_SIDE = 2048;

let nextId = 1;

/**
 * Decodes `file` (a File/Blob) into a photo object. Prefers
 * createImageBitmap with imageOrientation 'from-image' (EXIF-aware) and falls
 * back to an <img> element when the browser lacks it.
 */
export async function loadPhotoFile(file) {
  let bitmap = null;
  if (typeof createImageBitmap === 'function') {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = null;
    }
  }
  if (!bitmap) {
    const img = await loadImageElement(URL.createObjectURL(file));
    return finishPhoto(img, img.naturalWidth, img.naturalHeight, file.name);
  }
  const photo = finishPhoto(bitmap, bitmap.width, bitmap.height, file.name);
  if (bitmap.close) bitmap.close();
  return photo;
}

/** Loads a photo from a same-origin URL (a sample under samples/). */
export async function loadPhotoURL(url, name) {
  const img = await loadImageElement(url);
  return finishPhoto(img, img.naturalWidth, img.naturalHeight, name ?? url);
}

/** Loads an image element from a URL, resolving once it can be drawn. */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/**
 * Draws `source` (image or bitmap) into a canvas capped at MAX_PHOTO_SIDE
 * and returns the photo object the panels draw from.
 */
function finishPhoto(source, width, height, name) {
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
  const w = Math.max(2, Math.round(width * scale));
  const h = Math.max(2, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);
  return {
    id: nextId++,
    name: name || 'photo',
    canvas,
    width: w,
    height: h,
  };
}
