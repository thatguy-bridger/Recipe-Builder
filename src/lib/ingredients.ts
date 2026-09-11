import { formatFraction } from "./fractions";

// Combines amount + unit into one clean string (e.g. "1 1/2 cups"), instead
// of interpolating the two raw values next to each other in JSX (which
// produces stray whitespace whenever either piece is missing). Recompute
// this whenever the scaled amount changes.
export function formatIngredientQuantity(ingredient: {
  amount: number | null;
  unit: string | null;
}): string {
  const amount = ingredient.amount != null ? formatFraction(ingredient.amount) : "";
  const unit = ingredient.unit?.trim() ?? "";
  return [amount, unit].filter(Boolean).join(" ");
}

// Builds the full single line of text for an ingredient (e.g. "1 1/2 cups
// All-Purpose Flour, sifted"), for contexts (shopping lists, print, copy)
// that want one flat string rather than a styled quantity + name + note.
export function formatIngredientLine(ingredient: {
  amount: number | null;
  unit: string | null;
  name: string;
  note: string | null;
}): string {
  const quantity = formatIngredientQuantity(ingredient);
  const line = [quantity, ingredient.name].filter(Boolean).join(" ");
  const note = ingredient.note?.trim();
  return note ? `${line}, ${note}` : line;
}
