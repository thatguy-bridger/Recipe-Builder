const STOP_WORDS = new Set([
  "a", "an", "and", "or", "of", "the", "to", "in", "on", "for", "with", "from", "at", "by", "as",
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Words worth matching on their own: alphanumeric, at least 3 letters (skips
// "a", "of", unit-ish noise), and not a common stop word. Deduped.
function significantWords(name: string): string[] {
  return Array.from(
    new Set(
      name
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    )
  );
}

function wordAppears(word: string, lowerHaystack: string): boolean {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(lowerHaystack);
}

function labelIsMentioned(label: string, lowerBody: string): boolean {
  return significantWords(label).some((w) => wordAppears(w, lowerBody));
}

// Whether any significant word of `label` (an ingredient name, a category
// name, anything) appears in the step body. The shared building block
// behind findMentionedIngredients and mentionedWords below — exported on
// its own so a plain label (e.g. a category heading like "Cheese Options")
// can be checked the same way.
export function textIsMentioned(stepBody: string, label: string): boolean {
  return labelIsMentioned(label, stepBody.toLowerCase());
}

// Finds which ingredients are mentioned in a step's body text, so Cook Mode
// can highlight them contextually. Matches on any single significant word
// from the ingredient's name (case-insensitive) rather than requiring the
// full name — "Large Strawberries" still counts as mentioned by a step that
// just says "strawberries". Deliberately simple rather than NLP-grade.
export function findMentionedIngredients<T extends { id: string; name: string }>(
  stepBody: string,
  ingredients: T[]
): T[] {
  const lowerBody = stepBody.toLowerCase();
  return ingredients.filter((ing) => labelIsMentioned(ing.name, lowerBody));
}

// The specific words (not full ingredient names) that actually matched in
// the step body, deduped — used to drive inline highlighting so only the
// word that's really there gets marked, not the ingredient's whole name.
export function mentionedWords<T extends { id: string; name: string }>(
  stepBody: string,
  ingredients: T[]
): string[] {
  const lowerBody = stepBody.toLowerCase();
  const words = new Set<string>();
  for (const ing of ingredients) {
    for (const w of significantWords(ing.name)) {
      if (wordAppears(w, lowerBody)) words.add(w);
    }
  }
  return Array.from(words);
}

// Which categories are worth highlighting, given a step body and the set of
// ingredient ids already highlighted individually. A category is only
// highlighted when its own name is mentioned AND none of its ingredients
// are already highlighted — an individual ingredient match is more
// accurate/specific, so it takes priority over the broader category (e.g.
// if "cheese" matched the "Ricotta" ingredient, don't also light up a
// "Cheese Options" category heading for the same word).
export function findMentionedCategories<T extends { id: string; category: string | null }>(
  stepBody: string,
  ingredients: T[],
  highlightedIngredientIds: Set<string>
): string[] {
  const categories = Array.from(
    new Set(
      ingredients.map((i) => i.category?.trim()).filter((c): c is string => Boolean(c))
    )
  );
  return categories.filter((category) => {
    const hasHighlightedIngredient = ingredients.some(
      (i) => i.category?.trim() === category && highlightedIngredientIds.has(i.id)
    );
    if (hasHighlightedIngredient) return false;
    return textIsMentioned(stepBody, category);
  });
}

// Splits text into segments tagging which ones matched one of the given
// terms (case-insensitive, longest term first so multi-word names win over
// partial overlaps), so the caller can render matches highlighted inline
// without needing its own regex handling.
export function splitByTerms(text: string, terms: string[]): { text: string; matched: boolean }[] {
  const cleaned = terms.filter((t) => t.trim().length > 0);
  if (cleaned.length === 0) return [{ text, matched: false }];

  const escaped = cleaned
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");

  return text.split(pattern).map((part, i) => ({ text: part, matched: i % 2 === 1 }));
}
