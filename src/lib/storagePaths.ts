// Recovers the storage object path from a recipe-photos public URL (as
// produced by supabase.storage.from("recipe-photos").getPublicUrl(path)),
// so it can be passed to .remove(). Returns null for anything that isn't
// actually a recipe-photos URL (e.g. an externally hosted image).
export function extractRecipePhotoStoragePath(url: string): string | null {
  const marker = "/recipe-photos/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}
