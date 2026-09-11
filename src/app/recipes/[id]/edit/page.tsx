import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/RecipeForm";
import { SubmitButton } from "@/components/SubmitButton";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { RestoreVersionButton } from "@/components/RestoreVersionButton";
import {
  updateRecipe,
  deleteRecipe,
  duplicateRecipe,
  restoreVersion,
  inviteCollaborator,
  removeCollaborator,
} from "@/app/actions/recipes";
import { ShareLinkControl } from "@/components/ShareLinkControl";
import type { RecipeWithDetails } from "@/types/recipe";

type ProfileRef = { display_name: string | null } | null;

// Supabase's untyped client returns a joined to-one relation as either a
// single object or (depending on how it infers the FK) a one-element array
// — normalize both shapes here instead of casting through `unknown` at each
// call site.
function oneProfile(p: unknown): ProfileRef {
  if (Array.isArray(p)) return (p[0] as ProfileRef) ?? null;
  return (p as ProfileRef) ?? null;
}

export default async function EditRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invited?: string; error?: string }>;
}) {
  const { id } = await params;
  const { invited, error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*), recipe_steps(*), recipe_photos(*)")
    .eq("id", id)
    .single<RecipeWithDetails & { share_token: string | null }>();

  if (!recipe) notFound();

  const { data: canEdit } = await supabase.rpc("can_edit_recipe", { rid: id });
  if (!canEdit) redirect(`/recipes/${id}`);

  const isOwner = recipe.owner_id === user.id;

  const { data: collaborators } = await supabase
    .from("recipe_collaborators")
    .select("user_id, permission, profiles(display_name, email)")
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
  const boundDuplicate = duplicateRecipe.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-semibold">Edit recipe</h1>
        <div className="flex items-center gap-4">
          <form action={boundDuplicate}>
            <SubmitButton
              pendingLabel="Duplicating…"
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm hover:bg-[var(--bg-muted)]"
            >
              Duplicate
            </SubmitButton>
          </form>
          <a
            href={`/api/recipes/${id}/export`}
            className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm hover:bg-[var(--bg-muted)]"
          >
            Export JSON
          </a>
          {isOwner && <DeleteRecipeButton action={boundDelete} />}
        </div>
      </div>

      <RecipeForm action={boundUpdate} initial={recipe} />

      {isOwner && (
        <section className="mt-12 border-t border-[var(--border)] pt-8">
          <h2 className="mb-3 font-serif text-lg font-semibold">Collaborators</h2>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Invite another approved account to co-edit this recipe with you.
          </p>
          {invited && (
            <p className="mb-3 rounded-lg bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
              Invitation sent.
            </p>
          )}
          {error && (
            <p className="mb-3 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          <ul className="mb-4 flex flex-col gap-2 text-sm">
            {(collaborators ?? []).map((c) => (
              <li key={c.user_id} className="flex items-center justify-between gap-3">
                <span>
                  {oneProfile(c.profiles)?.display_name ?? "Unknown"}{" "}
                  <span className="text-xs text-[var(--text-muted)]">
                    ({c.permission === "edit" ? "editor" : "viewer"})
                  </span>
                </span>
                <form action={removeCollaborator.bind(null, id, c.user_id)}>
                  <button
                    type="submit"
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form action={boundInvite} className="flex flex-wrap gap-2">
            <input
              name="email"
              type="email"
              placeholder="their@email.com"
              required
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
            <select
              name="permission"
              defaultValue="edit"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="edit">Editor</option>
              <option value="view">Viewer</option>
            </select>
            <SubmitButton
              pendingLabel="Inviting…"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Invite
            </SubmitButton>
          </form>

          <div className="mt-8">
            <h2 className="mb-3 font-serif text-lg font-semibold">Share link</h2>
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Anyone with this link can view the recipe (read-only), even if it isn&apos;t
              published.
            </p>
            <ShareLinkControl
              recipeId={id}
              initialToken={recipe.share_token}
            />
          </div>
        </section>
      )}

      {versions && versions.length > 0 && (
        <section className="mt-10 border-t border-[var(--border)] pt-8">
          <h2 className="mb-3 font-serif text-lg font-semibold">Version history</h2>
          <ul className="flex flex-col gap-2 text-sm text-[var(--text-muted)]">
            {versions.map((v) => {
              const label = new Date(v.created_at).toLocaleString();
              const editor = oneProfile(v.profiles)?.display_name ?? "Unknown";
              return (
                <li key={v.id} className="flex items-center justify-between gap-3">
                  <span>
                    {label} — {editor}
                  </span>
                  <RestoreVersionButton
                    action={restoreVersion.bind(null, id, v.id)}
                    label={label}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
