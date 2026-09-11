// Metric <-> imperial conversion for cooking measurements. Deliberately
// narrow: only units we actually recognize get converted; anything else
// (a count like "cloves", a brand-specific unit, etc.) passes through
// unchanged, since guessing would produce a wrong number silently.

type System = "us" | "metric";

type UnitInfo = {
  system: System;
  kind: "volume" | "weight";
  // Factor to convert one of this unit into the base unit for its kind
  // (milliliters for volume, grams for weight).
  toBase: number;
};

// Canonical units only — every other spelling/abbreviation/plural is
// resolved down to one of these keys by resolveUnitKey() below.
const UNITS: Record<string, UnitInfo> = {
  tsp: { system: "us", kind: "volume", toBase: 4.92892 },
  tbsp: { system: "us", kind: "volume", toBase: 14.7868 },
  cup: { system: "us", kind: "volume", toBase: 236.588 },
  "fl oz": { system: "us", kind: "volume", toBase: 29.5735 },
  pint: { system: "us", kind: "volume", toBase: 473.176 },
  quart: { system: "us", kind: "volume", toBase: 946.353 },
  gallon: { system: "us", kind: "volume", toBase: 3785.41 },
  oz: { system: "us", kind: "weight", toBase: 28.3495 },
  lb: { system: "us", kind: "weight", toBase: 453.592 },
  ml: { system: "metric", kind: "volume", toBase: 1 },
  l: { system: "metric", kind: "volume", toBase: 1000 },
  g: { system: "metric", kind: "weight", toBase: 1 },
  kg: { system: "metric", kind: "weight", toBase: 1000 },
};

// One fixed display unit per (system, kind) — always the same unit no
// matter how large or small the amount ends up. Converting never bumps to
// a bigger or smaller unit (200 cups stays "200 cup", never "12.5
// gallon"); only the number changes.
const DISPLAY_UNIT: Record<System, Record<"volume" | "weight", string>> = {
  us: { volume: "cup", weight: "oz" },
  metric: { volume: "ml", weight: "g" },
};

// Case-sensitive first: "T" and "t" are the one genuine ambiguity in
// cooking abbreviations (tablespoon vs. teaspoon), so they must be checked
// before anything gets lowercased.
const CASE_SENSITIVE_ALIASES: Record<string, string> = {
  T: "tbsp",
  t: "tsp",
};

// Every other spelling/abbreviation/plural we accept, case-insensitively
// (and after stripping a trailing period and a trailing "s"). Keys here
// are already run through that same normalization, so e.g. "Cups" and
// "cup." and "C" all resolve the same way.
const ALIASES: Record<string, string> = {
  tsp: "tsp",
  teaspoon: "tsp",
  tspn: "tsp",
  tbsp: "tbsp",
  tbs: "tbsp",
  tblsp: "tbsp",
  tablespoon: "tbsp",
  cup: "cup",
  c: "cup",
  "fl oz": "fl oz",
  floz: "fl oz",
  "fluid ounce": "fl oz",
  pint: "pint",
  pt: "pint",
  quart: "quart",
  qt: "quart",
  gallon: "gallon",
  gal: "gallon",
  oz: "oz",
  ounce: "oz",
  lb: "lb",
  pound: "lb",
  ml: "ml",
  milliliter: "ml",
  millilitre: "ml",
  cc: "ml",
  l: "l",
  liter: "l",
  litre: "l",
  g: "g",
  gram: "g",
  gramme: "g",
  kg: "kg",
  kilogram: "kg",
  kilogramme: "kg",
};

// Grams per US cup for common dry/baking ingredients, so converting a
// volume measurement (cup/tbsp/tsp) to metric can produce the weight a
// real metric recipe would actually use, instead of an unhelpful ml
// figure for something nobody measures by volume in grams-using kitchens.
// Approximate by nature — cooking ingredient density varies by brand,
// how packed it is, etc. Matched by substring against the ingredient
// name, longest match first so e.g. "brown sugar" wins over "sugar".
const DRY_DENSITY_G_PER_CUP: [string, number][] = [
  ["powdered sugar", 120],
  ["confectioners sugar", 120],
  ["brown sugar", 220],
  ["granulated sugar", 200],
  ["sugar", 200],
  ["all-purpose flour", 120],
  ["bread flour", 127],
  ["cake flour", 114],
  ["whole wheat flour", 120],
  ["flour", 120],
  ["cocoa powder", 85],
  ["baking soda", 220],
  ["baking powder", 220],
  ["salt", 273],
  ["rice krispies", 30],
  ["cereal", 40],
  ["rolled oats", 90],
  ["oats", 90],
  ["mini marshmallow", 50],
  ["marshmallow", 50],
  ["chocolate chips", 170],
  ["shredded cheese", 110],
  ["parmesan", 100],
  ["breadcrumbs", 108],
  ["panko", 60],
  ["chopped nuts", 120],
  ["walnuts", 100],
  ["pecans", 100],
  ["almonds", 140],
  ["butter", 227],
  ["cream cheese", 232],
  ["rice", 185],
  ["shredded coconut", 80],
];

// Ingredients that are clearly liquid always stay in ml when converting
// to metric, even though many of them also have a well-known density —
// nobody weighs a cup of milk in grams.
const LIQUID_KEYWORDS = [
  "water", "milk", "cream", "broth", "stock", "juice", "oil", "wine",
  "vinegar", "buttermilk", "syrup",
];

function dryDensityGramsPerCup(ingredientName: string | undefined): number | null {
  if (!ingredientName) return null;
  const lower = ingredientName.toLowerCase();
  if (LIQUID_KEYWORDS.some((kw) => lower.includes(kw))) return null;
  const match = DRY_DENSITY_G_PER_CUP.find(([kw]) => lower.includes(kw));
  return match ? match[1] : null;
}

function resolveUnitKey(unit: string): string | undefined {
  const trimmed = unit.trim().replace(/\.$/, "");
  if (trimmed in CASE_SENSITIVE_ALIASES) return CASE_SENSITIVE_ALIASES[trimmed];

  // Try the exact (lowercased) spelling first — some abbreviations
  // genuinely end in "s" (tbs, oz doesn't but cc/tbs do), so only fall
  // back to stripping a trailing "s" (for plurals like "cups") once the
  // unstripped spelling doesn't match anything.
  const normalized = trimmed.toLowerCase();
  return ALIASES[normalized] ?? ALIASES[normalized.replace(/s$/, "")];
}

export function isConvertibleUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  return resolveUnitKey(unit) != null;
}

// Converts an amount+unit into the equivalent in the target system, always
// using that system's one fixed unit per kind (cup/oz for US, ml/g for
// metric) — never a bigger or smaller one, no matter the magnitude.
// Returns the original amount/unit unchanged if the unit isn't one we
// recognize, or if it's already in the target system.
//
// When converting a US *volume* measurement to metric, a real metric
// recipe almost always gives dry ingredients (flour, sugar, marshmallows,
// ...) by weight in grams, not by milliliters — nobody measures a cup of
// flour in ml. If `ingredientName` matches a known dry ingredient, this
// converts to grams using its approximate density instead. Liquids (milk,
// water, oil, ...) and anything unrecognized still convert to ml.
export function convertQuantity(
  amount: number,
  unit: string | null,
  targetSystem: System,
  ingredientName?: string
): { amount: number; unit: string | null } {
  const key = unit ? resolveUnitKey(unit) : undefined;
  const info = key ? UNITS[key] : undefined;
  if (!info) return { amount, unit };
  // Already in the target system: leave it exactly as the recipe author
  // wrote it. Re-deriving a "nicer" unit here would second-guess their
  // judgment — e.g. rewriting "5 cups" of marshmallows as "1 1/4 quart",
  // which is a technically-equal but unnatural way to measure them.
  if (info.system === targetSystem) return { amount, unit };

  if (targetSystem === "metric" && info.kind === "volume") {
    const gramsPerCup = dryDensityGramsPerCup(ingredientName);
    if (gramsPerCup != null) {
      const cups = (amount * info.toBase) / UNITS.cup.toBase;
      return { amount: cups * gramsPerCup, unit: "g" };
    }
  }

  const baseAmount = amount * info.toBase;
  const targetUnit = DISPLAY_UNIT[targetSystem][info.kind];
  return { amount: baseAmount / UNITS[targetUnit].toBase, unit: targetUnit };
}
