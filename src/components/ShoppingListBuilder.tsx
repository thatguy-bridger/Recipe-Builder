"use client";

import { useEffect, useMemo, useState } from "react";
import { formatFraction } from "@/lib/fractions";

type ShoppingIngredient = { amount: number | null; unit: string | null; name: string };
type ShoppingRecipe = {
  id: string;
  title: string;
  servings: number;
  serving_unit: string;
  recipe_ingredients: ShoppingIngredient[];
};

type SelectionState = Record<string, { checked: boolean; servings: number }>;

function titleCaseWord(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ShoppingListBuilder({ recipes }: { recipes: ShoppingRecipe[] }) {
  const [selection, setSelection] = useState<SelectionState>(() =>
    Object.fromEntries(recipes.map((r) => [r.id, { checked: false, servings: r.servings || 1 }]))
  );
  const [gathered, setGathered] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("shopping-list-gathered");
      if (stored) setGathered(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("shopping-list-gathered", JSON.stringify(gathered));
    } catch {
      // ignore
    }
  }, [gathered]);

  const selectedRecipes = recipes.filter((r) => selection[r.id]?.checked);

  const aggregated = useMemo(() => {
    const byKey = new Map<
      string,
      { name: string; unit: string | null; amount: number | null; usedIn: { title: string; amount: string }[] }
    >();

    for (const recipe of selectedRecipes) {
      const sel = selection[recipe.id];
      if (!sel) continue;
      const factor = sel.servings / (recipe.servings || 1);
      for (const ing of recipe.recipe_ingredients) {
        const scaledAmount = ing.amount != null ? ing.amount * factor : null;
        const name = ing.name.trim();
        const unit = ing.unit?.trim() || null;
        const key = `${name.toLowerCase()}__${(unit || "").toLowerCase()}`;
        if (!byKey.has(key)) {
          byKey.set(key, { name, unit, amount: scaledAmount, usedIn: [] });
        } else {
          const existing = byKey.get(key)!;
          if (scaledAmount != null && existing.amount != null) {
            existing.amount += scaledAmount;
          } else if (scaledAmount != null && existing.amount == null) {
            existing.amount = scaledAmount;
          }
        }
        byKey.get(key)!.usedIn.push({
          title: recipe.title,
          amount: scaledAmount != null ? `${formatFraction(scaledAmount)}${unit ? ` ${unit}` : ""}` : "",
        });
      }
    }

    return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedRecipes, selection]);

  function copyAsText() {
    const lines = aggregated.map((item) => {
      const qty = item.amount != null ? `${formatFraction(item.amount)}${item.unit ? ` ${item.unit}` : ""} ` : "";
      return `- ${qty}${item.name}`;
    });
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold">Recipes</h2>
        <div className="flex flex-col gap-2">
          {recipes.map((r) => {
            const sel = selection[r.id];
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  sel.checked ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sel.checked}
                  onChange={(e) =>
                    setSelection((s) => ({ ...s, [r.id]: { ...s[r.id], checked: e.target.checked } }))
                  }
                />
                <span className="flex-1 text-sm">{r.title}</span>
                {sel.checked && (
                  <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    Servings
                    <input
                      type="number"
                      min={1}
                      value={sel.servings}
                      onChange={(e) =>
                        setSelection((s) => ({
                          ...s,
                          [r.id]: { ...s[r.id], servings: Math.max(1, Number(e.target.value) || 1) },
                        }))
                      }
                      className="w-14 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Shopping list</h2>
          {aggregated.length > 0 && (
            <button
              type="button"
              onClick={copyAsText}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--bg-muted)]"
            >
              Copy as text
            </button>
          )}
        </div>
        {aggregated.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-6 py-16 text-center text-sm text-[var(--text-muted)]">
            Select recipes on the left to build a combined shopping list.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {aggregated.map((item) => {
              const key = `${item.name.toLowerCase()}__${(item.unit || "").toLowerCase()}`;
              const checked = !!gathered[key];
              return (
                <li
                  key={key}
                  className={`flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 ${
                    checked ? "opacity-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setGathered((g) => ({ ...g, [key]: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <span className={checked ? "line-through" : ""}>
                      {item.amount != null && (
                        <span className="font-medium text-[var(--accent)]">
                          {formatFraction(item.amount)} {item.unit ?? ""}{" "}
                        </span>
                      )}
                      {titleCaseWord(item.name)}
                    </span>
                    {item.usedIn.length > 1 && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.usedIn.map((u) => u.title).join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
