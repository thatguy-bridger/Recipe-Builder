"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "./SubmitButton";

type ImportedIngredient = {
  amount?: number | null;
  unit?: string | null;
  name: string;
  category?: string | null;
  note?: string | null;
};
type ImportedStep = { body: string; timer_minutes?: string | null };
type ImportedRecipe = {
  title?: string;
  description?: string | null;
  servings?: number | null;
  serving_unit?: string | null;
  tags?: string[];
  ingredients?: ImportedIngredient[];
  steps?: ImportedStep[];
};

// Mirrors extractRecipeList() in src/app/actions/recipes.ts — accepts one
// recipe object, a bare array of them, or { recipes: [...] }.
function extractRecipeList(parsed: unknown): ImportedRecipe[] {
  if (Array.isArray(parsed)) return parsed as ImportedRecipe[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { recipes?: unknown }).recipes)) {
    return (parsed as { recipes: ImportedRecipe[] }).recipes;
  }
  return [parsed as ImportedRecipe];
}

function formatAmount(ing: ImportedIngredient): string {
  const parts = [ing.amount != null ? String(ing.amount) : "", ing.unit ?? ""].filter(Boolean);
  return parts.join(" ");
}

function RecipePreviewCard({ recipe }: { recipe: ImportedRecipe }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <h3 className="font-serif text-lg font-semibold">{recipe.title || "(untitled)"}</h3>
      {recipe.description && (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{recipe.description}</p>
      )}
      <div className="mt-1 text-xs text-[var(--text-muted)]">
        {recipe.servings ? `${recipe.servings} ${recipe.serving_unit ?? "Serving"}${recipe.servings === 1 ? "" : "s"}` : null}
      </div>
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs uppercase text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="mt-3">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Ingredients
          </h4>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="before:mr-1 before:text-[var(--text-muted)] before:content-['·']">
                {formatAmount(ing) && <span className="font-medium">{formatAmount(ing)} </span>}
                {ing.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.steps && recipe.steps.length > 0 && (
        <div className="mt-3">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Steps
          </h4>
          <ol className="flex flex-col gap-1 text-sm">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-medium text-[var(--text-muted)]">{i + 1}.</span>
                <span>{step.body}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function ImportJsonForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [text, setText] = useState("");

  const { recipes, parseError } = useMemo(() => {
    if (!text.trim()) return { recipes: [] as ImportedRecipe[], parseError: null as string | null };
    try {
      const parsed = JSON.parse(text);
      return { recipes: extractRecipeList(parsed), parseError: null };
    } catch {
      return { recipes: [] as ImportedRecipe[], parseError: "Not valid JSON yet…" };
    }
  }, [text]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <textarea
        name="json"
        required
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"title": "...", "ingredients": [...], "steps": [...]}  — or an array of these to import many at once'
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 font-mono text-xs outline-none focus:border-[var(--accent)]"
      />

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Preview
        </h2>
        <div className="flex h-[50vh] flex-col gap-3 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-muted)]/30 p-3">
          {parseError ? (
            <p className="text-sm text-[var(--text-muted)]">{parseError}</p>
          ) : recipes.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Paste JSON above to see a preview here.</p>
          ) : (
            recipes.map((recipe, i) => <RecipePreviewCard key={i} recipe={recipe} />)
          )}
        </div>
      </div>

      <SubmitButton
        pendingLabel="Importing…"
        className="self-start rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
      >
        Import
      </SubmitButton>
    </form>
  );
}
