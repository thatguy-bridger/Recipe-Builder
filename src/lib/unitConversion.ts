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
export function convertQuantity(
  amount: number,
  unit: string | null,
  targetSystem: System
): { amount: number; unit: string | null } {
  const key = unit ? resolveUnitKey(unit) : undefined;
  const info = key ? UNITS[key] : undefined;
  if (!info) return { amount, unit };
  // Already in the target system: leave it exactly as the recipe author
  // wrote it. Re-deriving a "nicer" unit here would second-guess their
  // judgment — e.g. rewriting "5 cups" of marshmallows as "1 1/4 quart",
  // which is a technically-equal but unnatural way to measure them.
  if (info.system === targetSystem) return { amount, unit };

  const baseAmount = amount * info.toBase;
  const targetUnit = DISPLAY_UNIT[targetSystem][info.kind];
  return { amount: baseAmount / UNITS[targetUnit].toBase, unit: targetUnit };
}
