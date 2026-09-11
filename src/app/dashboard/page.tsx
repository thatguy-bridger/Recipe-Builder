import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeCard } from "@/components/RecipeCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "approved") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-serif text-2xl font-semibold">Account pending approval</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          An admin needs to approve your account before you can add or edit recipes.
        </p>
      </div>
    );
  }

  const { data: owned } = await supabase
    .from("recipes")
    .select("*, recipe_photos(url, position)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const { data: collabRows } = await supabase
    .from("recipe_collaborators")
    .select("recipe_id")
    .eq("user_id", user.id);

  const collabIds = (collabRows ?? []).map((c) => c.recipe_id);
  let shared: typeof owned = [];
  if (collabIds.length > 0) {
    const { data } = await supabase
      .from("recipes")
      .select("*, recipe_photos(url, position)")
      .in("id", collabIds);
    shared = data ?? [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold">My Recipes</h1>
        <Link
          href="/dashboard/new"
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          + New recipe
        </Link>
      </div>

      {!owned || owned.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-6 py-16 text-center text-[var(--text-muted)]">
          You haven&apos;t added any recipes yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {owned.map((recipe) => {
            const photos = (recipe.recipe_photos ?? []).sort(
              (a: { position: number }, b: { position: number }) => a.position - b.position
            );
            return (
              <RecipeCard key={recipe.id} recipe={recipe} photoUrl={photos[0]?.url} canEdit />
            );
          })}
        </div>
      )}

      {shared.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 font-serif text-2xl font-semibold">Shared with me</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shared.map((recipe) => {
              const photos = (recipe.recipe_photos ?? []).sort(
                (a: { position: number }, b: { position: number }) => a.position - b.position
              );
              return (
              <RecipeCard key={recipe.id} recipe={recipe} photoUrl={photos[0]?.url} canEdit />
            );
            })}
          </div>
        </>
      )}
    </div>
  );
}
