"use client";

import { useMemo, useState } from "react";
import type { Ingredient } from "@/types/recipe";
import { formatIngredientQuantity } from "@/lib/ingredients";
import { convertQuantity, isConvertibleUnit } from "@/lib/unitConversion";

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
  highlightedIds,
  highlightedCategories,
}: {
  baseServings: number;
  servingUnit?: string;
  ingredients: Ingredient[];
  showServings?: boolean;
  // Ingredient ids to visually call out — e.g. ones mentioned in the
  // current Cook Mode step — rendered bigger and highlighted.
  highlightedIds?: Set<string>;
  // Category names to call out the same way — e.g. the step says "cheese"
  // and there's no specific matching ingredient, but there's a "Cheese
  // Options" category.
  highlightedCategories?: Set<string>;
}) {
  const [servings, setServings] = useState(baseServings || 1);
  const factor = servings / (baseServings || 1);
  const [unitSystem, setUnitSystem] = useState<"us" | "metric">("us");
  const hasConvertibleUnits = useMemo(
    () => ingredients.some((ing) => isConvertibleUnit(ing.unit)),
    [ingredients]
  );

  const scaled = useMemo(
    () =>
      ingredients.map((ing) => {
        const amount = ing.amount != null ? ing.amount * factor : null;
        if (amount == null) return { ...ing, amount };
        const converted = convertQuantity(amount, ing.unit, unitSystem);
        return { ...ing, amount: converted.amount, unit: converted.unit };
      }),
    [ingredients, factor, unitSystem]
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
          <div className="flex flex-wrap items-center gap-3">
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
            {hasConvertibleUnits && (
              <select
                value={unitSystem}
                onChange={(e) => setUnitSystem(e.target.value as "us" | "metric")}
                aria-label="Unit system"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-sm text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              >
                <option value="us">US units</option>
                <option value="metric">Metric</option>
              </select>
            )}
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
                className={`mb-2 border-b pb-1 font-serif font-semibold uppercase tracking-[0.08em] transition-colors ${
                  highlightedCategories?.has(category)
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--text-muted)]"
                }`}
                style={{ fontSize: "clamp(0.75rem, 3.6cqw, 0.95rem)" }}
              >
                {category}
              </h3>
            )}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] items-start gap-x-6 gap-y-2">
              {items.map((ing) => {
                const quantity = formatIngredientQuantity(ing);
                const isHighlighted = highlightedIds?.has(ing.id);
                return (
                  <li
                    key={ing.id}
                    className={`min-w-0 break-words rounded transition-all before:mr-1 before:text-[var(--text-muted)] before:content-['·'] ${
                      isHighlighted
                        ? "-mx-1.5 bg-[var(--accent-soft)] px-1.5 py-0.5 text-lg font-medium"
                        : "text-base"
                    }`}
                  >
                    {quantity && (
                      <span className="font-medium text-[var(--accent)]">{quantity} </span>
                    )}
                    {ing.name}
                    {ing.note && (
                      <span className="block break-words text-xs font-normal text-[var(--text-muted)]">
                        {ing.note}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
