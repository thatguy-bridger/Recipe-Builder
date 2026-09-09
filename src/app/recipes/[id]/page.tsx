import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServingScaler } from "@/components/ServingScaler";
import { toEmbedUrl } from "@/lib/video";
import type { RecipeWithDetails } from "@/types/recipe";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "*, recipe_ingredients(*), recipe_steps(*), recipe_photos(*), profiles!recipes_owner_id_fkey(display_name)"
    )
    .eq("id", id)
    .single<RecipeWithDetails & { profiles: { display_name: string | null } | null }>();

  if (!recipe) notFound();

  let canEdit = false;
  if (user) {
    const { data } = await supabase.rpc("can_edit_recipe", { rid: id });
    canEdit = Boolean(data);
  }

  const ingredients = [...recipe.recipe_ingredients].sort((a, b) => a.position - b.position);
  const steps = [...recipe.recipe_steps].sort((a, b) => a.position - b.position);
  const photos = [...recipe.recipe_photos].sort((a, b) => a.position - b.position);
  const embedUrl = recipe.video_url ? toEmbedUrl(recipe.video_url) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          &larr; Back to recipes
        </Link>
        <div className="flex gap-3">
          <Link
            href={`/recipes/${id}/cook`}
            className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Cook mode
          </Link>
          {canEdit && (
            <Link
              href={`/recipes/${id}/edit`}
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--bg-muted)]"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <h1 className="mt-4 font-serif text-3xl font-semibold sm:text-4xl">{recipe.title}</h1>
      {recipe.description && (
        <p className="mt-2 text-[var(--text-muted)]">{recipe.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
        {recipe.prep_minutes != null && <span>Prep: {recipe.prep_minutes} min</span>}
        {recipe.cook_minutes != null && <span>Cook: {recipe.cook_minutes} min</span>}
        {recipe.profiles?.display_name && <span>By {recipe.profiles.display_name}</span>}
      </div>

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]"
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
          className="mt-6 aspect-video w-full rounded-[var(--radius)] object-cover shadow-[var(--shadow)]"
        />
      )}

      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {photos.slice(1).map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className="aspect-square rounded-lg object-cover" />
          ))}
        </div>
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

      <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-[1fr_1.4fr]">
        <section>
          <h2 className="font-serif text-xl font-semibold">Ingredients</h2>
          <div className="mt-3">
            <ServingScaler
              baseServings={recipe.servings ?? 1}
              servingUnit={recipe.serving_unit}
              ingredients={ingredients}
            />
          </div>

          {recipe.equipment.length > 0 && (
            <div className="mt-8">
              <h2 className="font-serif text-xl font-semibold">Equipment</h2>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {recipe.equipment.map((eq) => (
                  <li key={eq}>{eq}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-serif text-xl font-semibold">Steps</h2>
          <ol className="mt-3 flex flex-col gap-6">
            {steps.map((step, i) => (
              <li key={step.id} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="leading-relaxed">{step.body}</p>
                  {step.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={step.photo_url}
                      alt=""
                      className="mt-2 max-w-xs rounded-lg object-cover"
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
