"use client";

import { useEffect, useState } from "react";
import { CookMode } from "@/components/CookMode";
import { listOfflineRecipes, type OfflineRecipe } from "@/lib/offlineCache";

export default function OfflinePage() {
  const [recipes, setRecipes] = useState<OfflineRecipe[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setRecipes(listOfflineRecipes());
  }, []);

  const open = recipes?.find((r) => r.id === openId);
  if (open) {
    return (
      <CookMode
        recipeId={open.id}
        title={open.title}
        baseServings={open.baseServings}
        servingUnit={open.servingUnit}
        totalMinutes={open.totalMinutes}
        ownerTheme={open.ownerTheme}
        ingredients={open.ingredients}
        equipment={open.equipment}
        steps={open.steps}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Offline recipes</h1>
      <p className="mb-6 text-[var(--text-muted)]">
        Recipes you&apos;ve opened Cook Mode for are saved here, so you can still cook from them
        without a connection.
      </p>

      {recipes == null ? null : recipes.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-6 py-16 text-center text-[var(--text-muted)]">
          Nothing cached yet — open a recipe&apos;s Cook Mode once while online and it&apos;ll show up
          here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setOpenId(r.id)}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-left hover:bg-[var(--bg-muted)]"
              >
                <span className="font-serif font-medium">{r.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
