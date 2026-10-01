import type { AppState } from "../engine/types";
import { createDemoState, createEmptyState } from "../data/demoData";

const KEY = "tandem.state.v1";

export function hasSavedState(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDemoState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1) {
      return createDemoState();
    }
    // Defensive defaults for forward-compat
    return {
      ...createEmptyState(),
      ...parsed,
      prefs: {
        weatherEnabled: parsed.prefs?.weatherEnabled ?? false,
        weatherCity: parsed.prefs?.weatherCity ?? "",
        remindersInApp: parsed.prefs?.remindersInApp ?? true,
        reducedMotion: parsed.prefs?.reducedMotion,
      },
      nudgeState: parsed.nudgeState ?? { countByDay: {}, seen: [], dismissed: [] },
    };
  } catch {
    return createDemoState();
  }
}

export function saveState(state: AppState): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    const msg =
      err instanceof DOMException && /quota/i.test(err.name + err.message)
        ? "Storage is full. Try removing a photo or two — everything else is safe."
        : "Couldn't save locally. Your changes may not persist.";
    return { ok: false, error: msg };
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Compress an uploaded image client-side: downscale to a square-ish max
 * dimension and encode as JPEG. Returns a data URL.
 */
export async function compressImage(file: File, max = 512, quality = 0.78): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  try {
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}