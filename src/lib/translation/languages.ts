// The supported target languages, each keyed by a short code we control
// (not necessarily the same as the Google Translate code we send). A
// language can list "sublanguages" (regional variants) two different ways:
//
// - `googleCode` differs from the parent's: Google Translate itself has a
//   distinct regional model for it (Brazilian vs. European Portuguese,
//   Simplified vs. Traditional Chinese, France vs. Québec French all
//   genuinely translate differently).
// - `glossary` on top of the parent's own googleCode: Google doesn't offer
//   a distinct model, so a curated word-swap is applied to its output
//   instead (Spain vs. Latin American Spanish food vocabulary).
export type LanguageVariant = {
  code: string;
  label: string;
  googleCode?: string;
  glossaryName?: string;
};

export type Language = {
  code: string;
  label: string;
  googleCode: string;
  variants?: LanguageVariant[];
};

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: "es",
    label: "Spanish",
    googleCode: "es",
    variants: [
      { code: "es-ES", label: "Spain" },
      { code: "es-LA", label: "Latin America", glossaryName: "es-LA" },
    ],
  },
  {
    code: "fr",
    label: "French",
    googleCode: "fr",
    variants: [
      { code: "fr-FR", label: "France" },
      { code: "fr-CA", label: "Québec", googleCode: "fr-CA" },
    ],
  },
  {
    code: "pt",
    label: "Portuguese",
    googleCode: "pt",
    variants: [
      { code: "pt-BR", label: "Brazil" },
      { code: "pt-PT", label: "Portugal", googleCode: "pt-PT" },
    ],
  },
  {
    code: "zh",
    label: "Chinese",
    googleCode: "zh-CN",
    variants: [
      { code: "zh-CN", label: "Simplified" },
      { code: "zh-TW", label: "Traditional", googleCode: "zh-TW" },
    ],
  },
  { code: "de", label: "German", googleCode: "de" },
  { code: "it", label: "Italian", googleCode: "it" },
  { code: "ja", label: "Japanese", googleCode: "ja" },
  { code: "ko", label: "Korean", googleCode: "ko" },
  { code: "ar", label: "Arabic", googleCode: "ar" },
  { code: "hi", label: "Hindi", googleCode: "hi" },
  { code: "ru", label: "Russian", googleCode: "ru" },
  { code: "vi", label: "Vietnamese", googleCode: "vi" },
  { code: "pl", label: "Polish", googleCode: "pl" },
];

export function findLanguage(code: string | null | undefined): Language | null {
  if (!code) return null;
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? null;
}

export function findVariant(language: Language, variantCode: string | null | undefined): LanguageVariant | null {
  if (!variantCode) return null;
  return language.variants?.find((v) => v.code === variantCode) ?? null;
}

// The actual Google Translate target code to request, and the glossary (if
// any) to apply on top of its output for the chosen sublanguage.
export function resolveTarget(
  languageCode: string,
  variantCode: string | null
): { googleCode: string; glossaryName: string | null } | null {
  const language = findLanguage(languageCode);
  if (!language) return null;
  const variant = findVariant(language, variantCode);
  if (variantCode && !variant) return null;
  return {
    googleCode: variant?.googleCode ?? language.googleCode,
    glossaryName: variant?.glossaryName ?? null,
  };
}
