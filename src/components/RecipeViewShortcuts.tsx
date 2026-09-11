"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keyboard shortcuts for the recipe view page: C to jump into Cook Mode, E
// to edit (if allowed), Escape to go back. Renders nothing — just wires up
// the listener. Ignored while typing in a field.
export function RecipeViewShortcuts({
  recipeId,
  canEdit,
}: {
  recipeId: string;
  canEdit: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    function isTextField(el: Element | null) {
      const tag = (el?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTextField(document.activeElement)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "c") {
        e.preventDefault();
        router.push(`/recipes/${recipeId}/cook`);
      } else if (key === "e" && canEdit) {
        e.preventDefault();
        router.push(`/recipes/${recipeId}/edit`);
      } else if (e.key === "Escape") {
        e.preventDefault();
        router.push("/");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [recipeId, canEdit, router]);

  return null;
}
