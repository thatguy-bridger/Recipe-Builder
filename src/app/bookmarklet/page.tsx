import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookmarkletLink } from "@/components/BookmarkletLink";
import { EXTRACTOR_SOURCE } from "@/generated/extractorSource";

// Builds the "Import to Recipe Boxed" bookmarklet from extension/extractor.js
// (the exact same extraction logic the browser extension's popup uses) so
// there's a single source of truth. EXTRACTOR_SOURCE is generated from that
// file at config-evaluation time (see next.config.ts) rather than read off
// disk here — this app deploys to Cloudflare Workers, which have no
// filesystem at runtime, so a request-time fs.readFileSync can never work
// there no matter how the file is bundled.
function buildBookmarkletHref(siteOrigin: string): string {
  const functionBody = EXTRACTOR_SOURCE
    .replace(/^\/\/.*\n/gm, "")
    .replace(/\n?recipeBoxedExtract\(\);\s*$/, "");

  const driver = `
(function(){
  var result = recipeBoxedExtract();
  if (!result.found) {
    alert("Recipe Boxed: couldn't find a recipe on this page.");
    return;
  }
  var json = JSON.stringify(result.recipe);
  var encoded = btoa(unescape(encodeURIComponent(json)));
  window.open(${JSON.stringify(siteOrigin)} + "/dashboard/import#data=" + encoded, "_blank");
})();
`;

  const minified = (functionBody + driver)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .join(" ")
    .replace(/\s+/g, " ");

  return "javascript:" + encodeURIComponent(minified);
}

export default async function BookmarkletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const href = buildBookmarkletHref(origin);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 font-serif text-3xl font-semibold">Import from the web</h1>
      <p className="mb-6 text-[var(--text-muted)]">
        Drag the button below to your bookmarks bar. It works on any recipe site, in any
        browser — no extension to install, nothing to keep updated. On any recipe page, click
        it to detect the recipe and open Recipe Boxed&apos;s{" "}
        <a href="/dashboard/import" className="text-[var(--accent)] underline">
          Import page
        </a>{" "}
        with the fields already filled in — nothing is sent to a server in between, the recipe
        data travels only in the URL your browser opens.
      </p>

      <BookmarkletLink href={href}>📥 Import to Recipe Boxed</BookmarkletLink>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Already dragged this before and it just opens a blank page instead of running? Delete
        that bookmark and drag this one again — it was generated before a fix and won&apos;t work.
      </p>

      <ol className="mt-8 flex list-decimal flex-col gap-2 pl-5 text-sm text-[var(--text-muted)]">
        <li>Drag the button above onto your browser&apos;s bookmarks bar (show it first if it&apos;s hidden).</li>
        <li>Open any recipe page on another site.</li>
        <li>Click the bookmark — it opens a new tab on Recipe Boxed&apos;s Import page, pre-filled.</li>
        <li>Review the recipe, then click Import.</li>
      </ol>

      <p className="mt-6 text-xs text-[var(--text-muted)]">
        This bookmarklet is the recommended way to import — it needs no installation, works in
        every browser, and updates automatically since it&apos;s generated fresh from this page
        each time you visit. The old{" "}
        <a
          href="https://github.com/thatguy-bridger/Recipe-Builder/tree/main/extension"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--accent)] underline"
        >
          browser extension
        </a>{" "}
        still works if you&apos;d rather have a toolbar button, but isn&apos;t needed anymore.
      </p>
    </div>
  );
}
