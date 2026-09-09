"use client";

import { useMemo, useState } from "react";
import type { Ingredient } from "@/types/recipe";

function formatAmount(n: number) {
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

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

  return (
    <div className="flex flex-col gap-4">
      {showServings && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-base font-medium">Servings</span>
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
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-3">
        {scaled.map((ing) => (
          <li key={ing.id} className="flex flex-wrap items-baseline gap-2 text-base before:mr-1 before:text-[var(--text-muted)] before:content-['·']">
            <span className="min-w-[4.5rem] font-medium text-[var(--accent)]">
              {ing.amount != null ? formatAmount(ing.amount) : ""} {ing.unit ?? ""}
            </span>
            <span>{ing.name}</span>
            {ing.notes && (
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--accent)] shadow-[0_0_8px_var(--accent)]">
                {ing.notes}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
