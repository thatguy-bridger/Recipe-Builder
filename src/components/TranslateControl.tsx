"use client";

import { useState } from "react";
import { SUPPORTED_LANGUAGES, findLanguage } from "@/lib/translation/languages";
import { getRecipeTranslation, type RecipeTranslation } from "@/app/actions/translate";

// Language + optional sublanguage picker. Fires `onChange` with the
// translated recipe (or null for "back to original"/on error). Kept as a
// self-contained control so both the recipe detail page and Cook Mode can
// drop it in without duplicating the fetch/caching logic.
//
// Fetches are triggered directly from the select handlers rather than an
// effect keyed on state — recipeId is fixed for the component's lifetime
// (each page remounts per recipe), so there's nothing else that needs to
// re-trigger a fetch reactively.
export function TranslateControl({
  recipeId,
  onChange,
  className = "",
}: {
  recipeId: string;
  onChange: (translation: RecipeTranslation | null) => void;
  className?: string;
}) {
  const [languageCode, setLanguageCode] = useState("");
  const [variantCode, setVariantCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const language = languageCode ? findLanguage(languageCode) : null;

  async function runTranslate(nextLanguageCode: string, nextVariantCode: string) {
    if (!nextLanguageCode) {
      setError(null);
      setLoading(false);
      onChange(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getRecipeTranslation(recipeId, nextLanguageCode, nextVariantCode || null);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      onChange(null);
    } else {
      onChange(result.data);
    }
  }

  function handleLanguageChange(code: string) {
    setLanguageCode(code);
    const next = findLanguage(code);
    const variant = next?.variants?.[0]?.code ?? "";
    setVariantCode(variant);
    runTranslate(code, variant);
  }

  function handleVariantChange(code: string) {
    setVariantCode(code);
    runTranslate(languageCode, code);
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)] ${className}`}>
      <label className="flex items-center gap-2">
        Translate
        <select
          value={languageCode}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1"
        >
          <option value="">Original</option>
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      {language?.variants && (
        <select
          value={variantCode}
          onChange={(e) => handleVariantChange(e.target.value)}
          aria-label="Regional variant"
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1"
        >
          {language.variants.map((v) => (
            <option key={v.code} value={v.code}>
              {v.label}
            </option>
          ))}
        </select>
      )}
      {loading && <span className="text-xs italic">Translating…</span>}
      {error && (
        <span className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
