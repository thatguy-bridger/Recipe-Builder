// Shared key format for a single ingredient-to-step highlight instance, used
// both when storing a vote and when deciding whether to render one.
export function matchFeedbackKey(stepId: string, ingredientId: string, word: string): string {
  return `${stepId}::${ingredientId}::${word.toLowerCase()}`;
}

// Once the same word has been thumbed down this many times across different
// recipes, treat it as unreliable everywhere going forward — no manual
// curation needed, the blocklist grows on its own as feedback comes in.
export const GLOBAL_BLOCKLIST_THRESHOLD = 2;

export function buildFeedbackSets(
  rows: { step_id: string; ingredient_id: string; word: string; recipe_id: string }[]
): { suppressed: Set<string>; globalBlocklist: Set<string> } {
  const suppressed = new Set<string>();
  const recipesByWord = new Map<string, Set<string>>();

  for (const row of rows) {
    suppressed.add(matchFeedbackKey(row.step_id, row.ingredient_id, row.word));
    const word = row.word.toLowerCase();
    if (!recipesByWord.has(word)) recipesByWord.set(word, new Set());
    recipesByWord.get(word)!.add(row.recipe_id);
  }

  const globalBlocklist = new Set<string>();
  for (const [word, recipeIds] of recipesByWord) {
    if (recipeIds.size >= GLOBAL_BLOCKLIST_THRESHOLD) globalBlocklist.add(word);
  }

  return { suppressed, globalBlocklist };
}
