// Regional cooking-vocabulary swaps applied on top of a base machine
// translation, for language variants Google Translate doesn't already
// distinguish (see languages.ts). Kept deliberately small: every entry is a
// near-universal swap, not a single country's slang, so it stays accurate
// rather than guessing at country-by-country variation within "Latin
// America" (which is itself not one dialect).
//
// Keys are the term as it comes out of the base translation (Spain-flavored
// Spanish, since that's what Google's plain "es" defaults to); values are
// the widely-understood Latin American equivalent.
const GLOSSARIES: Record<string, Record<string, string>> = {
  "es-LA": {
    patatas: "papas",
    patata: "papa",
    melocotones: "duraznos",
    melocotón: "durazno",
    "judías verdes": "ejotes",
    "judía verde": "ejote",
    alubias: "frijoles",
    alubia: "frijol",
    guisantes: "arvejas",
    guisante: "arveja",
    zumo: "jugo",
    nata: "crema",
    beicon: "tocino",
    tarta: "pastel",
  },
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchCase(source: string, target: string): string {
  if (source === source.toUpperCase() && source !== source.toLowerCase()) return target.toUpperCase();
  if (source[0] && source[0] === source[0].toUpperCase() && source[0] !== source[0].toLowerCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

function wholeWordReplace(text: string, from: string, to: string): string {
  const escaped = escapeRegExp(from);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped})(?![\\p{L}\\p{N}])`, "giu");
  return text.replace(re, (match) => matchCase(match, to));
}

export function applyGlossary(text: string, glossaryName: string): string {
  const glossary = GLOSSARIES[glossaryName];
  if (!glossary || !text) return text;
  const entries = Object.entries(glossary).sort((a, b) => b[0].length - a[0].length);
  let result = text;
  for (const [from, to] of entries) result = wholeWordReplace(result, from, to);
  return result;
}
