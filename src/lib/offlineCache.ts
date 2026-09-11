// Client-only cache of recently-viewed recipes, so Cook Mode still works
// without a network connection for anything you've already opened once.
// Not a full PWA (no service worker, no offline app-shell install) — this
// only caches recipe *data* in localStorage; the page itself still needs to
// load from the network or the browser's own HTTP cache first.

export type OfflineRecipe = {
  id: string;
  title: string;
  baseServings: number;
  servingUnit: string;
  totalMinutes: string | null;
  ownerTheme: {
    theme_accent: string | null;
    theme_radius: string | null;
    theme_font: string | null;
    theme_watermark_url: string | null;
  } | null;
  ingredients: {
    id: string;
    recipe_id: string;
    position: number;
    amount: number | null;
    unit: string | null;
    name: string;
    category: string | null;
    note: string | null;
  }[];
  equipment: string[];
  steps: {
    id: string;
    recipe_id: string;
    position: number;
    body: string;
    photo_urls: string[];
    is_pinned: boolean;
    timer_minutes: string | null;
  }[];
  cachedAt: number;
};

const STORAGE_KEY = "offlineRecipes";
const MAX_CACHED = 20;

function readAll(): Record<string, OfflineRecipe> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOfflineRecipe(recipe: Omit<OfflineRecipe, "cachedAt">) {
  try {
    const all = readAll();
    all[recipe.id] = { ...recipe, cachedAt: Date.now() };
    const entries = Object.values(all).sort((a, b) => b.cachedAt - a.cachedAt);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_CACHED).map((r) => [r.id, r]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage unavailable (private mode, quota) — offline cache is a
    // nice-to-have, so just skip caching rather than breaking the page.
  }
}

export function listOfflineRecipes(): OfflineRecipe[] {
  return Object.values(readAll()).sort((a, b) => b.cachedAt - a.cachedAt);
}

export function getOfflineRecipe(id: string): OfflineRecipe | null {
  return readAll()[id] ?? null;
}
