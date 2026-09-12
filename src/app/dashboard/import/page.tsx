import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { importRecipeJson } from "@/app/actions/recipes";
import { SubmitButton } from "@/components/SubmitButton";
import { ImportPrefill } from "@/components/ImportPrefill";

export default async function ImportRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; imported?: string; failed?: string }>;
}) {
  const { error, imported, failed } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Import a recipe</h1>
      <p className="mb-6 rounded-lg bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text)]">
        Grabbing a recipe from another site? Use the{" "}
        <a href="/bookmarklet" className="font-medium text-[var(--accent)] underline">
          import bookmarklet
        </a>{" "}
        — it detects the recipe on any site and fills in the form below automatically. No
        install needed, and it works in any browser.
      </p>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Prefer to paste JSON by hand? You can do that below too — either exported from Recipe
        Boxed elsewhere, or matching the same shape. Paste a single recipe object, a bare array of
        them, or <code className="rounded bg-[var(--bg-muted)] px-1 py-0.5">{`{ "recipes": [...] }`}</code>{" "}
        to import many at once (handy after asking Claude to digest a whole PDF of recipes into
        this shape). Everything is created as a draft under your account, so you can review before
        publishing.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {imported && (
        <p className="mb-4 rounded-lg bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
          Imported {imported} recipe{imported === "1" ? "" : "s"} as draft
          {imported === "1" ? "" : "s"}.{" "}
          <Link href="/dashboard" className="underline">
            View them on your dashboard
          </Link>
          .
        </p>
      )}

      {failed && (
        <div className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          <p className="mb-1 font-medium">Some recipes couldn&apos;t be imported:</p>
          <ul className="list-disc pl-5">
            {failed.split(" | ").map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      <ImportPrefill />

      <form action={importRecipeJson} className="flex flex-col gap-4">
        <textarea
          name="json"
          required
          rows={16}
          placeholder='{"title": "...", "ingredients": [...], "steps": [...]}  — or an array of these to import many at once'
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
