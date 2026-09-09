import { RecipeForm } from "@/components/RecipeForm";
import { createRecipe } from "@/app/actions/recipes";

export default async function NewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 font-serif text-3xl font-semibold">New recipe</h1>
      {error && (
        <p className="mb-6 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <RecipeForm action={createRecipe} />
    </div>
  );
}
