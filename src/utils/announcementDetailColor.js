/** Fallback when an announcement has no image / color extraction fails. */
export const FALLBACK_DETAIL_THEME = {
  panel: "linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
  panelCompact: "linear-gradient(135deg, #1a1a2e, #0f3460)",
  panelCompactExpanded: "linear-gradient(135deg, #1a1a2e, #16213e)",
  // Solid chrome for DETAILS/CLOSE tabs (same family as the panel).
  tab: "#0f3460",
  divider: "rgba(255,255,255,0.35)",
  bullet: "#fff",
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const mix = (r, g, b, t) => [
  Math.round(clamp(r * t, 0, 255)),
  Math.round(clamp(g * t, 0, 255)),
  Math.round(clamp(b * t, 0, 255)),
];

const luminance = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

const saturation = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
};

/** Darken a color until white text stays readable on it. */
const ensureReadableDark = (r, g, b) => {
  let [dr, dg, db] = [r, g, b];
  let lum = luminance(dr, dg, db);
  let guard = 0;
  while (lum > 0.32 && guard < 14) {
    [dr, dg, db] = mix(dr, dg, db, 0.82);
    lum = luminance(dr, dg, db);
    guard += 1;
  }
  // Keep a touch of chroma so yellow/gold doesn't collapse to muddy brown-black.
  if (saturation(r, g, b) > 0.35 && saturation(dr, dg, db) < 0.2) {
    const boost = 0.55;
    dr = Math.round(dr * (1 - boost) + r * boost * 0.45);
    dg = Math.round(dg * (1 - boost) + g * boost * 0.45);
    db = Math.round(db * (1 - boost) + b * boost * 0.45);
    [dr, dg, db] = mix(dr, dg, db, luminance(dr, dg, db) > 0.32 ? 0.75 : 1);
  }
  return [dr, dg, db];
};

export const buildDetailThemeFromRgb = (r, g, b) => {
  const [baseR, baseG, baseB] = ensureReadableDark(r, g, b);
  const [darkR, darkG, darkB] = mix(baseR, baseG, baseB, 0.62);
  const [midR, midG, midB] = mix(baseR, baseG, baseB, 0.85);
  const [lightR, lightG, lightB] = [baseR, baseG, baseB];

  return {
    panel: `linear-gradient(160deg, rgb(${darkR},${darkG},${darkB}) 0%, rgb(${midR},${midG},${midB}) 45%, rgb(${lightR},${lightG},${lightB}) 100%)`,
    panelCompact: `linear-gradient(135deg, rgb(${darkR},${darkG},${darkB}), rgb(${lightR},${lightG},${lightB}))`,
    panelCompactExpanded: `linear-gradient(135deg, rgb(${darkR},${darkG},${darkB}), rgb(${midR},${midG},${midB}))`,
    tab: `rgb(${midR},${midG},${midB})`,
    divider: "rgba(255,255,255,0.55)",
    bullet: "#fff",
  };
};

/**
 * Samples the image for a chroma-weighted average color (skips near-white / near-black).
 * Requires CORS-friendly image URL (crossOrigin anonymous).
 */
export const extractDominantRgb = (imageUrl) =>
  new Promise((resolve) => {
    if (!imageUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let totalW = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 200) continue;

          const lum = luminance(r, g, b);
          const sat = saturation(r, g, b);
          // Ignore washed-out white / pure black; favor saturated brand colors.
          if (lum > 0.92 || lum < 0.08) continue;
          if (sat < 0.12 && lum > 0.7) continue;

          const weight = 0.35 + sat * 2.2 + (lum > 0.2 && lum < 0.85 ? 0.4 : 0);
          totalW += weight;
          sumR += r * weight;
          sumG += g * weight;
          sumB += b * weight;
        }

        if (totalW < 1) {
          resolve(null);
          return;
        }

        resolve({
          r: Math.round(sumR / totalW),
          g: Math.round(sumG / totalW),
          b: Math.round(sumB / totalW),
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });

export const getAnnouncementImageUrl = (baseUrl, filePath) => {
  if (!filePath) return null;
  return `${baseUrl}/uploads/Announcement/${filePath}`;
};

/**
 * Builds a map of slideId -> detail theme by sampling each slide image.
 */
export const buildDetailThemesForSlides = async (slides, baseUrl) => {
  const entries = await Promise.all(
    (slides || []).map(async (slide) => {
      const key = slide?.id ?? slide?.file_path;
      if (!key) return null;
      const url = getAnnouncementImageUrl(baseUrl, slide.file_path);
      if (!url) return [key, FALLBACK_DETAIL_THEME];
      const rgb = await extractDominantRgb(url);
      if (!rgb) return [key, FALLBACK_DETAIL_THEME];
      return [key, buildDetailThemeFromRgb(rgb.r, rgb.g, rgb.b)];
    }),
  );

  const map = {};
  for (const entry of entries) {
    if (!entry) continue;
    map[entry[0]] = entry[1];
  }
  return map;
};
