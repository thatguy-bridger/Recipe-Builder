"use client";

import { useEffect } from "react";
import { saveOfflineRecipe, type OfflineRecipe } from "@/lib/offlineCache";

// Invisible — just persists the recipe it's given to the offline cache on
// mount, so Cook Mode can be reopened later without a connection.
export function OfflineCacheWriter({ recipe }: { recipe: Omit<OfflineRecipe, "cachedAt"> }) {
  useEffect(() => {
    saveOfflineRecipe(recipe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  return null;
}
