// Finds which ingredients are mentioned by name in a step's body text, so
// Cook Mode can highlight them contextually. Deliberately simple
// (case-insensitive substring match) rather than NLP-grade extraction.
export function findMentionedIngredients<T extends { id: string; name: string }>(
  stepBody: string,
  ingredients: T[]
): T[] {
  const lowerBody = stepBody.toLowerCase();
  return ingredients.filter((ing) => {
    const name = ing.name.trim();
    return name.length > 0 && lowerBody.includes(name.toLowerCase());
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
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");

  return text.split(pattern).map((part, i) => ({ text: part, matched: i % 2 === 1 }));
}
