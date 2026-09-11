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

const UNITS: Record<string, UnitInfo> = {
  tsp: { system: "us", kind: "volume", toBase: 4.92892 },
  teaspoon: { system: "us", kind: "volume", toBase: 4.92892 },
  tbsp: { system: "us", kind: "volume", toBase: 14.7868 },
  tablespoon: { system: "us", kind: "volume", toBase: 14.7868 },
  cup: { system: "us", kind: "volume", toBase: 236.588 },
  "fl oz": { system: "us", kind: "volume", toBase: 29.5735 },
  pint: { system: "us", kind: "volume", toBase: 473.176 },
  quart: { system: "us", kind: "volume", toBase: 946.353 },
  gallon: { system: "us", kind: "volume", toBase: 3785.41 },
  oz: { system: "us", kind: "weight", toBase: 28.3495 },
  ounce: { system: "us", kind: "weight", toBase: 28.3495 },
  lb: { system: "us", kind: "weight", toBase: 453.592 },
  pound: { system: "us", kind: "weight", toBase: 453.592 },
  ml: { system: "metric", kind: "volume", toBase: 1 },
  milliliter: { system: "metric", kind: "volume", toBase: 1 },
  l: { system: "metric", kind: "volume", toBase: 1000 },
  liter: { system: "metric", kind: "volume", toBase: 1000 },
  g: { system: "metric", kind: "weight", toBase: 1 },
  gram: { system: "metric", kind: "weight", toBase: 1 },
  kg: { system: "metric", kind: "weight", toBase: 1000 },
  kilogram: { system: "metric", kind: "weight", toBase: 1000 },
};

// Preferred display unit for each (kind, system) pair, in ascending order —
// pick the largest one where the amount is still >= 1, so 750ml doesn't
// render as "0.75 l".
const DISPLAY_UNITS: Record<System, Record<"volume" | "weight", { unit: string; toBase: number }[]>> = {
  us: {
    volume: [
      { unit: "tsp", toBase: UNITS.tsp.toBase },
      { unit: "tbsp", toBase: UNITS.tbsp.toBase },
      { unit: "cup", toBase: UNITS.cup.toBase },
      { unit: "quart", toBase: UNITS.quart.toBase },
      { unit: "gallon", toBase: UNITS.gallon.toBase },
    ],
    weight: [
      { unit: "oz", toBase: UNITS.oz.toBase },
      { unit: "lb", toBase: UNITS.lb.toBase },
    ],
  },
  metric: {
    volume: [
      { unit: "ml", toBase: UNITS.ml.toBase },
      { unit: "l", toBase: UNITS.l.toBase },
    ],
    weight: [
      { unit: "g", toBase: UNITS.g.toBase },
      { unit: "kg", toBase: UNITS.kg.toBase },
    ],
  },
};

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase().replace(/\.$/, "").replace(/s$/, "");
}

export function isConvertibleUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  return normalizeUnit(unit) in UNITS;
}

// Converts an amount+unit into the equivalent in the target system, picking
// a sensible display unit (e.g. 3 tbsp -> not 0.19 cup, stays as tbsp;
// 500g -> stays g, 1500g -> 1.5 kg). Returns the original amount/unit
// unchanged if the unit isn't one we recognize.
export function convertQuantity(
  amount: number,
  unit: string | null,
  targetSystem: System
): { amount: number; unit: string | null } {
  const key = unit ? normalizeUnit(unit) : null;
  const info = key ? UNITS[key] : undefined;
  if (!info) return { amount, unit };

  const baseAmount = amount * info.toBase;
  const candidates = DISPLAY_UNITS[targetSystem][info.kind];
  let best = candidates[0];
  for (const candidate of candidates) {
    if (baseAmount / candidate.toBase >= 1) best = candidate;
  }
  return { amount: baseAmount / best.toBase, unit: best.unit };
}
