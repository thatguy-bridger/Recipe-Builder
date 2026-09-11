import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServingScaler } from "@/components/ServingScaler";
import { StepPhotos } from "@/components/StepPhotos";
import { RecipeThemeScope } from "@/components/RecipeThemeScope";
import { toEmbedUrl } from "@/lib/video";

type SharedRecipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  serving_unit: string;
  prep_minutes: string | null;
  cook_minutes: string | null;
  total_minutes: string | null;
  tags: string[];
  equipment: string[];
  video_url: string | null;
  recipe_ingredients: { id: string; name: string; amount: number | null; unit: string | null; category: string | null; note: string | null; position: number }[];
  recipe_steps: { id: string; body: string; photo_urls: string[]; position: number }[];
  recipe_photos: { url: string; position: number }[];
  owner: { display_name: string | null } | null;
};

export default async function SharedRecipePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_recipe_by_share_token", { p_token: token });
  const recipe = data as SharedRecipe | null;
  if (!recipe) notFound();

  const ingredients = [...recipe.recipe_ingredients]
    .sort((a, b) => a.position - b.position)
    .map((ing) => ({ ...ing, recipe_id: recipe.id }));
  const steps = [...recipe.recipe_steps].sort((a, b) => a.position - b.position);
  const photos = [...recipe.recipe_photos].sort((a, b) => a.position - b.position);
  const embedUrl = recipe.video_url ? toEmbedUrl(recipe.video_url) : null;

  return (
    <RecipeThemeScope className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="mb-2 rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent)]">
        You&apos;re viewing a shared, read-only link.
      </p>

      <h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">{recipe.title}</h1>
      {recipe.description && <p className="mt-2 text-[var(--text-muted)]">{recipe.description}</p>}

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
        {recipe.prep_minutes != null && <span>Prep: {recipe.prep_minutes} min</span>}
        {recipe.cook_minutes != null && <span>Cook: {recipe.cook_minutes} min</span>}
        {recipe.total_minutes != null && <span>Total: {recipe.total_minutes} min</span>}
        {recipe.owner?.display_name && <span>By {recipe.owner.display_name}</span>}
      </div>

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-serif text-xs text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {photos[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photos[0].url}
          alt={recipe.title}
          className="mx-auto mt-6 block max-h-[500px] w-auto max-w-full rounded-[var(--radius)] shadow-[var(--shadow)]"
        />
      )}

      {embedUrl && (
        <div className="mt-6 aspect-video w-full overflow-hidden rounded-[var(--radius)] shadow-[var(--shadow)]">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Ingredients</h2>
        <div className="mt-3">
          <ServingScaler
            baseServings={recipe.servings ?? 1}
            servingUnit={recipe.serving_unit}
            ingredients={ingredients}
          />
        </div>

        {recipe.equipment.length > 0 && (
          <div className="mt-6">
            <h2 className="font-serif text-xl font-semibold">Equipment</h2>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {recipe.equipment.map((eq) => (
                <li key={eq}>{eq}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Steps</h2>
        <ol className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
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
    </RecipeThemeScope>
  );
}
