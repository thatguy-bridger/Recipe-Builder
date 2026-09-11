"use client";

import { usePathname, useRouter } from "next/navigation";
import { formatDuration } from "@/lib/duration";
import { useCookTimer } from "./CookTimerProvider";

// A persistent top-bar indicator for the Cook Mode session timer — visible
// everywhere (not just inside Cook Mode itself), and flagged with a warning
// style if it's still running while the cook has navigated away from it.
export function CookTimerBadge() {
  const { timer } = useCookTimer();
  const pathname = usePathname();
  const router = useRouter();

  if (!timer.recipeId) return null;

  const onCookPage = pathname === `/recipes/${timer.recipeId}/cook`;
  const warn = timer.running && !onCookPage;

  return (
    <button
      type="button"
      onClick={() => router.push(`/recipes/${timer.recipeId}/cook`)}
      title={
        warn
          ? `${timer.recipeTitle ?? "A recipe"} timer is still running — back to Cook Mode`
          : (timer.recipeTitle ?? "Cook Mode timer")
      }
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
        warn
          ? "animate-pulse border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]"
          : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      ⏱ {formatDuration(timer.elapsedSeconds)}
    </button>
  );
}
