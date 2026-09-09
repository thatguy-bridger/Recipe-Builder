import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/RecipeForm";
import { updateRecipe, deleteRecipe, inviteCollaborator } from "@/app/actions/recipes";
import type { RecipeWithDetails } from "@/types/recipe";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*), recipe_steps(*), recipe_photos(*)")
    .eq("id", id)
    .single<RecipeWithDetails>();

  if (!recipe) notFound();

  const { data: canEdit } = await supabase.rpc("can_edit_recipe", { rid: id });
  if (!canEdit) redirect(`/recipes/${id}`);

  const isOwner = recipe.owner_id === user.id;

  const { data: collaborators } = await supabase
    .from("recipe_collaborators")
    .select("user_id, profiles(display_name, email)")
    .eq("recipe_id", id);

  const { data: versions } = await supabase
    .from("recipe_versions")
    .select("id, created_at, profiles(display_name)")
    .eq("recipe_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const boundUpdate = updateRecipe.bind(null, id);
  const boundInvite = inviteCollaborator.bind(null, id);
  const boundDelete = deleteRecipe.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold">Edit recipe</h1>
        {isOwner && (
          <form action={boundDelete}>
            <button className="text-sm text-[var(--danger)] hover:underline">
              Delete recipe
            </button>
          </form>
        )}
      </div>

      <RecipeForm action={boundUpdate} initial={recipe} />

      {isOwner && (
        <section className="mt-12 border-t border-[var(--border)] pt-8">
          <h2 className="mb-3 font-serif text-lg font-semibold">Collaborators</h2>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Invite another approved account to co-edit this recipe with you.
          </p>
          <ul className="mb-4 flex flex-col gap-1 text-sm">
            {(collaborators ?? []).map((c) => (
              <li key={c.user_id}>
                {(c.profiles as unknown as { display_name: string | null })?.display_name ??
                  "Unknown"}
              </li>
            ))}
          </ul>
          <form action={boundInvite} className="flex gap-2">
            <input
              name="email"
              type="email"
              placeholder="their@email.com"
              required
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Invite
            </button>
          </form>
        </section>
      )}

      {versions && versions.length > 0 && (
        <section className="mt-10 border-t border-[var(--border)] pt-8">
          <h2 className="mb-3 font-serif text-lg font-semibold">Version history</h2>
          <ul className="flex flex-col gap-2 text-sm text-[var(--text-muted)]">
            {versions.map((v) => (
              <li key={v.id}>
                {new Date(v.created_at).toLocaleString()} —{" "}
                {(v.profiles as unknown as { display_name: string | null })?.display_name ??
                  "Unknown"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
