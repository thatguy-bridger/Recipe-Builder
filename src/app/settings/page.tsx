import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesignLanguageForm } from "@/components/DesignLanguageForm";
import { updateDesignLanguage } from "@/app/actions/settings";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme_accent, theme_radius, theme_font, theme_watermark_url, theme_apply_to_app")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Design language</h1>
      <p className="mb-8 text-sm text-[var(--text-muted)]">
        A personal skin for the recipes you own — anyone viewing one of your recipes sees it,
        whether or not they&apos;re signed in. It never changes how the app works, only how your
        recipes look.
      </p>

      {saved && (
        <p className="mb-6 rounded-lg bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
          Saved.
        </p>
      )}
      {error && (
        <p className="mb-6 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          Couldn&apos;t save: {error}
        </p>
      )}

      <DesignLanguageForm
        action={updateDesignLanguage}
        initial={
          profile ?? {
            theme_accent: null,
            theme_radius: null,
            theme_font: null,
            theme_watermark_url: null,
            theme_apply_to_app: false,
          }
        }
      />
    </div>
  );
}
