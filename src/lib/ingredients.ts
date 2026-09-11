import { formatFraction } from "./fractions";

// Builds the single line of text shown for an ingredient (e.g. "1 1/2 cups
// All-Purpose Flour, sifted") from its parts, so the view never juxtaposes
// separately-rendered amount/unit/name/note pieces.
export function formatIngredientLine(ingredient: {
  amount: number | null;
  unit: string | null;
  name: string;
  note: string | null;
}): string {
  const amount = ingredient.amount != null ? formatFraction(ingredient.amount) : "";
  const unit = ingredient.unit?.trim() ?? "";
  const quantity = [amount, unit].filter(Boolean).join(" ");
  const line = [quantity, ingredient.name].filter(Boolean).join(" ");
  const note = ingredient.note?.trim();
  return note ? `${line}, ${note}` : line;
}
