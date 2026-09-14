"use client";

import { useMemo, useState } from "react";
import type { Ingredient, Step } from "@/types/recipe";
import { ServingScaler } from "./ServingScaler";
import { StepPhotos } from "./StepPhotos";
import { TranslateControl } from "./TranslateControl";
import type { RecipeTranslation } from "@/app/actions/translate";

// Wraps the recipe detail page's title/description/equipment/ingredients/
// steps in a translation overlay. Only display text changes — amounts and
// units stay exactly as authored, since those are a measurement
// convention, not language, and this page does no interactive matching
// that translated text could break (unlike Cook Mode, which keeps the
// original English as the source of truth for its ingredient-mention
// highlighting and only glosses translated text alongside it).
export function TranslatableRecipeView({
  recipeId,
  title,
  description,
  baseServings,
  servingUnit,
  ingredients,
  equipment,
  steps,
}: {
  recipeId: string;
  title: string;
  description: string | null;
  baseServings: number;
  servingUnit: string;
  ingredients: Ingredient[];
  equipment: string[];
  steps: Step[];
}) {
  const [translation, setTranslation] = useState<RecipeTranslation | null>(null);

  const displayIngredients = useMemo(() => {
    if (!translation) return ingredients;
    const byId = new Map(translation.ingredients.map((t) => [t.id, t]));
    return ingredients.map((ing) => {
      const t = byId.get(ing.id);
      if (!t) return ing;
      return { ...ing, name: t.name, category: t.category, note: t.note };
    });
  }, [ingredients, translation]);

  const displaySteps = useMemo(() => {
    if (!translation) return steps;
    const byId = new Map(translation.steps.map((t) => [t.id, t]));
    return steps.map((step) => {
      const t = byId.get(step.id);
      return t ? { ...step, body: t.body } : step;
    });
  }, [steps, translation]);

  const displayEquipment = translation?.equipment ?? equipment;

  return (
    <>
      <div className="mt-4">
        <TranslateControl recipeId={recipeId} onChange={setTranslation} />
      </div>

      <h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">{translation?.title ?? title}</h1>
      {(translation?.description ?? description) && (
        <p className="mt-2 text-[var(--text-muted)]">{translation?.description ?? description}</p>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Ingredients</h2>
        <div className="mt-3">
          <ServingScaler baseServings={baseServings} servingUnit={servingUnit} ingredients={displayIngredients} />
        </div>

        {displayEquipment.length > 0 && (
          <div className="mt-6">
            <h2 className="font-serif text-xl font-semibold">Equipment</h2>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {displayEquipment.map((eq, i) => (
                <li key={equipment[i] ?? eq}>{eq}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Steps</h2>
        <ol className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displaySteps.map((step, i) => (
            <li
              key={step.id}
              className="flex gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="leading-relaxed">{step.body}</p>
                <StepPhotos urls={step.photo_urls} />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
