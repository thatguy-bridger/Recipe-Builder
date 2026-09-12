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

// Cheap, local singular/plural stemming (no dictionary, no AI — just the
// common English patterns) so "egg" in an ingredient name still matches a
// step that says "eggs", and "tomatoes" in a step still matches an
// ingredient named "Tomato". Deliberately conservative: only ever adds or
// strips a trailing "s"/"es", and never shortens below 3 letters.
function wordVariants(word: string): string[] {
  const variants = new Set([word]);
  if (word.endsWith("es") && word.length > 4) variants.add(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) variants.add(word.slice(0, -1));
  if (!word.endsWith("s")) {
    variants.add(word + "s");
    if (/(?:[sxz]|[cs]h)$/.test(word)) variants.add(word + "es");
  }
  return Array.from(variants);
}

// Finds whether (a singular/plural variant of) `word` appears in the text,
// returning the exact substring that actually matched — so a caller that
// needs to highlight or key off the real text (not the ingredient's own
// spelling) gets the right string.
function findWordMatch(word: string, lowerHaystack: string): string | null {
  for (const variant of wordVariants(word)) {
    const match = lowerHaystack.match(new RegExp(`\\b${escapeRegExp(variant)}\\b`, "i"));
    if (match) return match[0];
  }
  return null;
}

function wordAppears(word: string, lowerHaystack: string): boolean {
  return findWordMatch(word, lowerHaystack) != null;
}

// Tries a sequence of words as one contiguous phrase (allowing the last
// word to be singular/plural), returning the actual matched substring.
function tryPhrase(words: string[], lowerHaystack: string): string | null {
  if (words.length < 2) return null;
  const last = words[words.length - 1].toLowerCase();
  const lead = words
    .slice(0, -1)
    .map((w) => escapeRegExp(w.toLowerCase()))
    .join("\\s+");
  for (const variant of wordVariants(last)) {
    const pattern = `${lead}\\s+${escapeRegExp(variant)}`;
    const match = lowerHaystack.match(new RegExp(`\\b${pattern}\\b`, "i"));
    if (match) return match[0];
  }
  return null;
}

// For a multi-word ingredient name, tries to find it (or a meaningful
// trailing chunk of it) together in the text as one phrase, so it
// highlights as a single match instead of each word lighting up on its
// own. Two cases this fixes:
//   - "Baking Powder" and "Baking Soda" both in a recipe, step says
//     "baking powder" — without this, "baking" alone could get credited to
//     whichever of the two the matching loop reaches first.
//   - "Boneless, Skinless Chicken Breast" — the full name never appears
//     verbatim, but "chicken breast" does, and that trailing pair should
//     highlight together rather than "chicken" and "breast" separately.
// Tries the full name first, then progressively shorter trailing runs of
// its significant words (longest first), stopping at the first hit.
function findPhraseMatch(name: string, lowerHaystack: string): string | null {
  const full = tryPhrase(name.trim().split(/\s+/), lowerHaystack);
  if (full) return full;

  const sig = significantWords(name);
  for (let start = 0; start <= sig.length - 2; start++) {
    const match = tryPhrase(sig.slice(start), lowerHaystack);
    if (match) return match;
  }
  return null;
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
//
// Shares its resolution with mentionedWordMap below, so an ingredient whose
// name is a full phrase found together in the text ("Baking Powder") isn't
// ALSO credited to a different ingredient that merely shares one of those
// words ("Baking Soda") — see mentionedWordMap for why that matters.
export function findMentionedIngredients<T extends { id: string; name: string }>(
  stepBody: string,
  ingredients: T[]
): T[] {
  return Array.from(new Set(mentionedWordMap(stepBody, ingredients).values()));
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
// not just in the sidebar list. Keyed by the lowercased matched text.
//
// Two passes: first, every multi-word ingredient name gets a chance to
// match as a whole phrase ("baking powder" as one unit, not "baking" and
// "powder" separately) — otherwise a step that says "baking powder" would
// highlight it as two disconnected words, and if another ingredient in the
// same recipe happens to be "Baking Soda", that word would wrongly get
// credited to it too. Words consumed by a phrase match are then off-limits
// for the second pass, which does the existing single-significant-word
// matching for every ingredient that didn't match as a phrase.
export function mentionedWordMap<T extends { id: string; name: string }>(
  stepBody: string,
  ingredients: T[]
): Map<string, T> {
  const lowerBody = stepBody.toLowerCase();
  const map = new Map<string, T>();
  const consumedWords = new Set<string>();
  const unresolved: T[] = [];

  for (const ing of ingredients) {
    const phrase = findPhraseMatch(ing.name, lowerBody);
    if (phrase) {
      map.set(phrase, ing);
      for (const w of phrase.toLowerCase().split(/\s+/)) consumedWords.add(w);
    } else {
      unresolved.push(ing);
    }
  }

  for (const ing of unresolved) {
    // Only the first significant word that matches — an ingredient whose
    // words appear in the text but not contiguously (so findPhraseMatch
    // above couldn't merge them into one phrase, e.g. "Salt and Pepper"
    // with the "and" in the way) should still only light up once, not once
    // per word.
    for (const w of significantWords(ing.name)) {
      const matched = findWordMatch(w, lowerBody);
      if (matched && !consumedWords.has(matched) && !map.has(matched)) {
        map.set(matched, ing);
        break;
      }
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
