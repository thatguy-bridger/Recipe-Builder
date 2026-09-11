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
