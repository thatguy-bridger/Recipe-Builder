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
  return Array.from(mentionedWordMap(stepBody, ingredients).keys());
}

// Same matching as mentionedWords, but keeps which ingredient each matched
// word came from — so a caller (e.g. Cook Mode's inline highlighting) can
// show that ingredient's quantity right next to the word in the step text,
// not just in the sidebar list. Keyed by the lowercased matched word.
export function mentionedWordMap<T extends { id: string; name: string }>(
  stepBody: string,
  ingredients: T[]
): Map<string, T> {
  const lowerBody = stepBody.toLowerCase();
  const map = new Map<string, T>();
  for (const ing of ingredients) {
    for (const w of significantWords(ing.name)) {
      if (!map.has(w) && wordAppears(w, lowerBody)) map.set(w, ing);
    }
  }
  return map;
}

// Which categories are worth highlighting, given a step body and the set of
// ingredient ids already highlighted individually.
//
// An individual ingredient match is usually more accurate/specific than its
// category, so it normally takes priority: if "ricotta" matched the
// "Ricotta" ingredient, don't also light up "Cheese Options" for the same
// word — "ricotta" isn't a word in "Cheese Options" at all, so the match is
// genuinely about that one ingredient.
//
// But that only holds when the matching word is actually specific to the
// ingredient. If the word is shared with the category's own name — "cheese"
// matching "Whipped Cream Cheese" inside "Cheese Options" — the match is too
// generic to say it means THAT one ingredient rather than the category (or
// mixture) as a whole, so the category stays highlighted alongside it.
export function findMentionedCategories<T extends { id: string; name: string; category: string | null }>(
  stepBody: string,
  ingredients: T[],
  highlightedIngredientIds: Set<string>
): string[] {
  const lowerBody = stepBody.toLowerCase();
  const categories = Array.from(
    new Set(ingredients.map((i) => i.category?.trim()).filter((c): c is string => Boolean(c)))
  );

  return categories.filter((category) => {
    const categoryWords = new Set(significantWords(category));
    const highlightedInCategory = ingredients.filter(
      (i) => i.category?.trim() === category && highlightedIngredientIds.has(i.id)
    );

    if (highlightedInCategory.length === 0) {
      return textIsMentioned(stepBody, category);
    }

    return highlightedInCategory.some((i) =>
      significantWords(i.name).some((w) => categoryWords.has(w) && wordAppears(w, lowerBody))
    );
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
