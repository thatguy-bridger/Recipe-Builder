import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { importRecipeJson } from "@/app/actions/recipes";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ImportRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Import a recipe</h1>
      <p className="mb-2 text-[var(--text-muted)]">
        Paste JSON exported from Recipe Boxed (or matching the same shape). The recipe is created
        as a draft under your account, so you can review it before publishing.
      </p>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Grabbing a recipe from another site? The{" "}
        <a
          href="https://github.com/thatguy-bridger/Recipe-Builder/tree/main/extension"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent)] underline"
        >
          Recipe Boxed Exporter browser extension
        </a>{" "}
        detects a recipe on the page and produces JSON in this exact shape for you.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <form action={importRecipeJson} className="flex flex-col gap-4">
        <textarea
          name="json"
          required
          rows={16}
          placeholder='{"title": "...", "ingredients": [...], "steps": [...]}'
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 font-mono text-xs outline-none focus:border-[var(--accent)]"
        />
        <SubmitButton
          pendingLabel="Importing…"
          className="self-start rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Import
        </SubmitButton>
      </form>
    </div>
  );
}
