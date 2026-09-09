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
