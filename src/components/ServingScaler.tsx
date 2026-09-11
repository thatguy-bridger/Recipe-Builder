"use client";

import { useMemo, useState } from "react";
import type { Ingredient } from "@/types/recipe";
import { formatIngredientLine } from "@/lib/ingredients";

function pluralize(unit: string, count: number) {
  if (!unit) return unit;
  if (count === 1) return unit;
  return unit.toLowerCase().endsWith("s") ? unit : `${unit}s`;
}

export function ServingScaler({
  baseServings,
  servingUnit = "Serving",
  ingredients,
  showServings = true,
}: {
  baseServings: number;
  servingUnit?: string;
  ingredients: Ingredient[];
  showServings?: boolean;
}) {
  const [servings, setServings] = useState(baseServings || 1);
  const factor = servings / (baseServings || 1);

  const scaled = useMemo(
    () =>
      ingredients.map((ing) => ({
        ...ing,
        amount: ing.amount != null ? ing.amount * factor : null,
      })),
    [ingredients, factor]
  );

  // Group by category. Categories appear in the order they're first seen;
  // uncategorized items are listed last with no heading at all.
  const groups = useMemo(() => {
    const byCategory = new Map<string, typeof scaled>();
    const uncategorized: typeof scaled = [];
    for (const ing of scaled) {
      const category = ing.category?.trim();
      if (!category) {
        uncategorized.push(ing);
        continue;
      }
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category)!.push(ing);
    }
    const result: { category: string | null; items: typeof scaled }[] = Array.from(
      byCategory.entries()
    ).map(([category, items]) => ({ category, items }));
    if (uncategorized.length > 0) result.push({ category: null, items: uncategorized });
    return result;
  }, [scaled]);

  return (
    <div className="flex flex-col gap-4">
      {showServings && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="font-serif text-base font-medium">Servings</span>
            <input
              type="range"
              min={1}
              max={Math.max(baseServings * 4, 12)}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="w-32 accent-[var(--accent)]"
            />
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-base"
            />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            = {servings} {pluralize(servingUnit, servings)}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-4">
        {groups.map(({ category, items }) => (
          <div key={category ?? "__uncategorized"}>
            {category && (
              <h3
                className="mb-2 border-b border-[var(--border)] pb-1 font-serif font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
                style={{ fontSize: "clamp(0.75rem, 3.6cqw, 0.95rem)" }}
              >
                {category}
              </h3>
            )}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] items-start gap-x-6 gap-y-2">
              {items.map((ing) => (
                <li
                  key={ing.id}
                  className="flex min-w-0 break-words text-base before:mr-1 before:shrink-0 before:text-[var(--text-muted)] before:content-['·']"
                >
                  {formatIngredientLine(ing)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
