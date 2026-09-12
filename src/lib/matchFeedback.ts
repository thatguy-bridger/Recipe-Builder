// Shared key format for a single ingredient-to-step highlight instance, used
// both when storing a vote and when deciding whether to render one.
export function matchFeedbackKey(stepId: string, ingredientId: string, word: string): string {
  return `${stepId}::${ingredientId}::${word.toLowerCase()}`;
}

// Key for a manually-suggested connection, which isn't tied to any original
// (wrong) ingredient the algorithm picked — just the step and the word.
export function manualAdditionKey(stepId: string, word: string): string {
  return `${stepId}::${word.toLowerCase()}`;
}

// Once the same word has been thumbed down this many times across different
// recipes, treat it as unreliable everywhere going forward — no manual
// curation needed, the blocklist grows on its own as feedback comes in.
export const GLOBAL_BLOCKLIST_THRESHOLD = 2;

// Once the same word has been pointed at the same ingredient name (via a
// correction or a brand-new suggested connection) on this many different
// recipes, prefer that ingredient by name whenever a new recipe's own words
// are ambiguous or unmatched — the fix generalizes on its own.
export const GLOBAL_PREFERENCE_THRESHOLD = 2;

export type FeedbackRow = {
  step_id: string;
  ingredient_id: string;
  word: string;
  recipe_id: string;
  vote: "up" | "down";
  corrected_ingredient_id: string | null;
};

export function buildFeedbackSets(
  rows: FeedbackRow[],
  ingredientNameById: Map<string, string>
): {
  suppressed: Set<string>;
  globalBlocklist: Set<string>;
  corrections: Map<string, string>;
  manualAdditions: Map<string, string>;
  preferredNameByWord: Map<string, string>;
} {
  const suppressed = new Set<string>();
  const corrections = new Map<string, string>();
  const manualAdditions = new Map<string, string>();
  const recipesByWord = new Map<string, Set<string>>();
  // word -> (normalized ingredient name -> set of recipe ids that agreed)
  const nameAgreementByWord = new Map<string, Map<string, Set<string>>>();

  for (const row of rows) {
    const word = row.word.toLowerCase();

    if (row.vote === "down") {
      suppressed.add(matchFeedbackKey(row.step_id, row.ingredient_id, word));
      if (!recipesByWord.has(word)) recipesByWord.set(word, new Set());
      recipesByWord.get(word)!.add(row.recipe_id);
      if (row.corrected_ingredient_id) {
        corrections.set(matchFeedbackKey(row.step_id, row.ingredient_id, word), row.corrected_ingredient_id);
      }
    } else {
      // An "up" vote's ingredient_id is either confirming an existing
      // algorithmic match, or — when the algorithm didn't match that word at
      // all — a brand-new connection the cook suggested themselves.
      manualAdditions.set(manualAdditionKey(row.step_id, word), row.ingredient_id);
    }

    const targetId = row.vote === "up" ? row.ingredient_id : row.corrected_ingredient_id;
    if (targetId) {
      const name = ingredientNameById.get(targetId);
      if (name) {
        const normalized = name.trim().toLowerCase();
        if (!nameAgreementByWord.has(word)) nameAgreementByWord.set(word, new Map());
        const byName = nameAgreementByWord.get(word)!;
        if (!byName.has(normalized)) byName.set(normalized, new Set());
        byName.get(normalized)!.add(row.recipe_id);
      }
    }
  }

  const globalBlocklist = new Set<string>();
  for (const [word, recipeIds] of recipesByWord) {
    if (recipeIds.size >= GLOBAL_BLOCKLIST_THRESHOLD) globalBlocklist.add(word);
  }

  const preferredNameByWord = new Map<string, string>();
  for (const [word, byName] of nameAgreementByWord) {
    for (const [name, recipeIds] of byName) {
      if (recipeIds.size >= GLOBAL_PREFERENCE_THRESHOLD) {
        preferredNameByWord.set(word, name);
        break;
      }
    }
  }

  return { suppressed, globalBlocklist, corrections, manualAdditions, preferredNameByWord };
}
