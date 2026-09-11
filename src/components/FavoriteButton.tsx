"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/recipes";

export function FavoriteButton({
  recipeId,
  initialFavorite,
}: {
  recipeId: string;
  initialFavorite: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      disabled={isPending}
      onClick={() => {
        const next = !isFavorite;
        setIsFavorite(next);
        startTransition(async () => {
          await toggleFavorite(recipeId, isFavorite);
        });
      }}
      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur hover:bg-black/80"
    >
      {isFavorite ? "★" : "☆"}
    </button>
  );
}
