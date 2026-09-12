// Title-cases short label-like text (titles, tags, ingredient names) while
// leaving existing acronyms (BBQ, USDA) alone. Not meant for full sentences.
export function titleCase(input: string): string {
  if (!input) return input;
  return input
    .split(/(\s+)/)
    .map((word) => {
      if (/^\s+$/.test(word) || word.length === 0) return word;
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

// Capitalizes the first letter of every sentence in free-form text (step
// instructions, descriptions, notes) without touching the rest of the
// casing — unlike titleCase, this leaves mid-sentence words alone (an
// ingredient note like "room temperature, not cold" stays lowercase after
// its first letter). Splits on ". ", "! ", "? " plus start-of-string/
// start-of-line, and leaves everything else — including existing
// capitalization elsewhere in the sentence — untouched.
export function capitalizeSentences(input: string | null | undefined): string {
  if (!input) return input ?? "";
  return input.replace(
    /(^|[.!?]\s+|\n)([a-z])/g,
    (_match, boundary: string, letter: string) => boundary + letter.toUpperCase()
  );
}
