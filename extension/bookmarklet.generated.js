
function recipeBoxedExtract() {
  const UNIT_WORDS = [
    "tablespoons", "tablespoon", "teaspoons", "teaspoon", "tbsps", "tbsp",
    "tbs", "tsps", "tsp", "cups", "cup", "fluid ounces", "fluid ounce",
    "fl oz", "pints", "pint", "quarts", "quart", "gallons", "gallon",
    "ounces", "ounce", "oz", "pounds", "pound", "lbs", "lb",
    "milliliters", "milliliters", "millilitres", "ml", "liters", "litres",
    "l", "grams", "gram", "g", "kilograms", "kilogram", "kg",
    "cloves", "clove", "pinches", "pinch", "cans", "can", "packages",
    "package", "pkg", "slices", "slice", "heads", "head", "bunches",
    "bunch", "sprigs", "sprig", "sticks", "stick", "pieces", "piece",
    "dashes", "dash", "handfuls", "handful", "jars", "jar", "boxes", "box",
  ].sort((a, b) => b.length - a.length);

  const FRACTIONS = {
    "¼": "1/4", "½": "1/2", "¾": "3/4", "⅓": "1/3", "⅔": "2/3",
    "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8", "⅕": "1/5", "⅖": "2/5",
    "⅗": "3/5", "⅘": "4/5", "⅙": "1/6", "⅚": "5/6",
  };

  // Leading bullet/checkbox glyphs recipe plugins commonly prepend to each
  // ingredient line (WP Recipe Maker uses "▢", others use "•"/"-"/"*").
  const LEADING_MARKER_RE = /^[\s▢☐◻□•‣▪\-*·]+/;

  function stripTags(text) {
    return String(text).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  function decodeHtmlEntities(text) {
    if (!text) return text;
    const el = document.createElement("textarea");
    el.innerHTML = text;
    return el.value;
  }

  function cleanText(text) {
    return decodeHtmlEntities(stripTags(text)).replace(/\s+/g, " ").trim();
  }

  function fractionToNumber(text) {
    const parts = text.trim().split(/\s+/);
    let total = 0;
    for (const part of parts) {
      if (part.includes("/")) {
        const [n, d] = part.split("/").map(Number);
        if (d) total += n / d;
      } else {
        total += Number(part) || 0;
      }
    }
    return total;
  }

  // "2 to 3 cups" / "2-3 cups" -> averages the range (4-6 servings style
  // ranges are handled separately in parseYield). Returns null if `text`
  // isn't a plain number/fraction/range at all.
  function parseAmountToken(text) {
    const rangeMatch = text.match(
      /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)$/i
    );
    if (rangeMatch) {
      return (fractionToNumber(rangeMatch[1]) + fractionToNumber(rangeMatch[2])) / 2;
    }
    if (/^(?:\d+\s+)?\d+\/\d+$/.test(text) || /^\d+(?:\.\d+)?$/.test(text)) {
      return fractionToNumber(text);
    }
    return null;
  }

  function parseIngredientLine(rawLine) {
    let line = cleanText(String(rawLine)).replace(LEADING_MARKER_RE, "").trim();
    for (const [glyph, ascii] of Object.entries(FRACTIONS)) {
      line = line.split(glyph).join(` ${ascii} `);
    }
    line = line.replace(/\s+/g, " ").trim();

    // Match a leading amount, which may itself be a range ("2 to 3", "2-3").
    const qtyMatch = line.match(
      /^((?:(?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)(?:\s*(?:-|–|—|to)\s*(?:(?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?))?)\s*/i
    );
    let amount = null;
    let rest = line;
    if (qtyMatch && qtyMatch[1]) {
      const parsed = parseAmountToken(qtyMatch[1].trim());
      if (parsed != null) {
        amount = parsed;
        rest = line.slice(qtyMatch[0].length).trim();
      }
    }

    let unit = null;
    for (const word of UNIT_WORDS) {
      const re = new RegExp(`^${word}\\b\\.?`, "i");
      if (re.test(rest)) {
        unit = word;
        rest = rest.replace(re, "").trim();
        break;
      }
    }

    // "8 tablespoons of salted butter" -> drop the "of" so it doesn't leak
    // into the ingredient name as "of salted butter".
    rest = rest.replace(/^of\s+/i, "");

    // A parenthetical right after the amount/unit is almost always a
    // metric-equivalent aside ("3/4 cup (12 Tbsp; 170g) unsalted butter")
    // rather than part of the ingredient name — move it into the note.
    let leadingParenNote = null;
    const leadingParenMatch = rest.match(/^\(([^)]+)\)\s*/);
    if (leadingParenMatch) {
      leadingParenNote = leadingParenMatch[1].trim();
      rest = rest.slice(leadingParenMatch[0].length).trim();
    }

    let name = rest;
    let note = null;
    const commaIndex = rest.indexOf(",");
    if (commaIndex !== -1) {
      name = rest.slice(0, commaIndex).trim();
      note = rest.slice(commaIndex + 1).trim() || null;
    }
    const parenMatch = name.match(/^(.*)\(([^)]+)\)\s*$/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      note = note ? `${parenMatch[2].trim()}, ${note}` : parenMatch[2].trim();
    }
    if (leadingParenNote) {
      note = note ? `${leadingParenNote}, ${note}` : leadingParenNote;
    }

    return {
      amount: amount,
      unit: unit,
      name: name || rest || rawLine,
      category: null,
      note: note,
    };
  }

  function parseIsoDurationToMinutes(iso) {
    if (!iso || typeof iso !== "string") return null;
    if (/^P/.test(iso)) {
      const match = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return null;
      const days = Number(match[1] || 0);
      const hours = Number(match[2] || 0);
      const minutes = Number(match[3] || 0);
      const total = days * 24 * 60 + hours * 60 + minutes;
      return total > 0 ? String(total) : null;
    }
    // Some sites put plain text here instead of an ISO 8601 duration, e.g.
    // "1 hour 30 minutes" or "45 mins".
    const hourMatch = iso.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/i);
    const minMatch = iso.match(/(\d+)\s*m(?:in(?:ute)?s?)?/i);
    const total = (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minMatch ? Number(minMatch[1]) : 0);
    return total > 0 ? String(Math.round(total)) : null;
  }

  // Splits one long blob of instruction text into individual steps when a
  // site (or a recipe plugin) dumps the whole method as a single string
  // with embedded numbering, e.g. "1. Preheat oven. 2. Mix everything."
  function splitNumberedBlob(text) {
    const parts = text.split(/(?:^|\s)(\d{1,2})[.)]\s+(?=[A-Z])/).filter(Boolean);
    if (parts.length < 4) return [text];
    // split() with a capturing group interleaves the numbers themselves
    // into the array — drop those, keep the text chunks.
    const steps = [];
    for (let i = 0; i < parts.length; i++) {
      if (/^\d{1,2}$/.test(parts[i])) continue;
      steps.push(parts[i].trim());
    }
    return steps.filter(Boolean);
  }

  function flattenInstructions(instructions) {
    if (!instructions) return [];
    if (typeof instructions === "string") {
      const lines = instructions.split(/\r?\n+/).map((s) => cleanText(s)).filter(Boolean);
      if (lines.length > 1) return lines;
      return lines.length === 1 ? splitNumberedBlob(lines[0]) : [];
    }
    if (!Array.isArray(instructions)) return [];
    const steps = [];
    for (const item of instructions) {
      if (typeof item === "string") {
        steps.push(cleanText(item));
      } else if (item && item["@type"] === "HowToSection" && Array.isArray(item.itemListElement)) {
        steps.push(...flattenInstructions(item.itemListElement));
      } else if (item && typeof item.text === "string") {
        steps.push(cleanText(item.text));
      } else if (item && typeof item.name === "string") {
        steps.push(cleanText(item.name));
      }
    }
    return steps.filter(Boolean);
  }

  function parseYield(recipeYield) {
    const value = Array.isArray(recipeYield) ? recipeYield[recipeYield.length - 1] : recipeYield;
    if (value == null) return { servings: null, serving_unit: null };
    const str = String(value).trim();
    // Match a full leading quantity, which may be a fraction ("1 1/2"), a
    // decimal, or a range ("4-6" / "4 to 6 servings") — same shape as an
    // ingredient amount — so the remainder left for serving_unit is clean
    // (e.g. "1 1/2 cups guacamole" -> 2 servings, "cups guacamole", not a
    // half-eaten "/2 cups guacamole").
    const qtyRe =
      /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)(?:\s*(?:-|–|—|to)\s*((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?))?/i;
    const match = str.match(qtyRe);
    if (!match) {
      // The number isn't at the very start (e.g. "Serves 4") — fall back
      // to the first number anywhere in the string.
      const anywhere = str.match(/\d+(?:\.\d+)?/);
      if (!anywhere) return { servings: null, serving_unit: str || null };
      const servings = Math.round(Number(anywhere[0]));
      const unitText = (str.slice(0, anywhere.index) + str.slice(anywhere.index + anywhere[0].length))
        .replace(/\s+/g, " ")
        .trim();
      return { servings, serving_unit: unitText || null };
    }
    const first = fractionToNumber(match[1]);
    const second = match[2] ? fractionToNumber(match[2]) : null;
    const servings = Math.round(second != null ? (first + second) / 2 : first);
    const unitText = str.slice(match[0].length).trim();
    return { servings, serving_unit: unitText || null };
  }

  function firstString(value) {
    const found = Array.isArray(value) ? value.find((v) => typeof v === "string") : value;
    return typeof found === "string" ? cleanText(found) : null;
  }

  function tagsFrom(recipe) {
    const tags = new Set();
    const addAll = (value) => {
      if (!value) return;
      const arr = Array.isArray(value) ? value : String(value).split(",");
      for (const v of arr) {
        const trimmed = cleanText(String(v));
        if (trimmed) tags.add(trimmed);
      }
    };
    addAll(recipe.recipeCategory);
    addAll(recipe.recipeCuisine);
    if (typeof recipe.keywords === "string") addAll(recipe.keywords.split(","));
    else addAll(recipe.keywords);
    return Array.from(tags).slice(0, 12);
  }

  // Equipment isn't a standard schema.org Recipe field, but several
  // popular recipe plugins (Yoast, Tasty Recipes, WPRM) emit a
  // non-standard "tool"/"equipment" array of HowToTool-like objects or
  // plain strings — pick it up when present, best-effort.
  function equipmentFrom(recipe) {
    const source = recipe.tool || recipe.equipment || recipe.supply;
    if (!source) return [];
    const arr = Array.isArray(source) ? source : [source];
    return arr
      .map((item) => (typeof item === "string" ? item : item?.name))
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => cleanText(s));
  }

  function videoUrlFrom(recipe) {
    const video = Array.isArray(recipe.video) ? recipe.video[0] : recipe.video;
    if (!video) return null;
    if (typeof video === "string") return video;
    return video.contentUrl || video.embedUrl || video.url || null;
  }

  function toImportShape(recipe) {
    const { servings, serving_unit } = parseYield(recipe.recipeYield);
    const ingredientLines = recipe.recipeIngredient || recipe.ingredients || [];
    const ingredients = ingredientLines.map(parseIngredientLine).filter((i) => i.name);
    const steps = flattenInstructions(recipe.recipeInstructions).map((body) => ({
      body,
      photo_urls: [],
      is_pinned: false,
      timer_minutes: null,
    }));

    return {
      format: "recipe-boxed/v1",
      title: firstString(recipe.name) || cleanText(document.title) || "Imported recipe",
      description: firstString(recipe.description),
      servings,
      serving_unit,
      prep_minutes: parseIsoDurationToMinutes(recipe.prepTime),
      cook_minutes: parseIsoDurationToMinutes(recipe.cookTime),
      total_minutes: parseIsoDurationToMinutes(recipe.totalTime),
      tags: tagsFrom(recipe),
      equipment: equipmentFrom(recipe),
      video_url: videoUrlFrom(recipe),
      ingredients,
      steps,
      source_url: typeof location !== "undefined" ? location.href : null,
    };
  }

  function findRecipeInJsonLd(node) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findRecipeInJsonLd(item);
        if (found) return found;
      }
      return null;
    }
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("Recipe")) return node;
    if (node["@graph"]) return findRecipeInJsonLd(node["@graph"]);
    // Some sites nest the Recipe inside a "mainEntity" or "mainEntityOfPage".
    if (node.mainEntity) {
      const found = findRecipeInJsonLd(node.mainEntity);
      if (found) return found;
    }
    return null;
  }

  function fromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const candidates = [];
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const recipe = findRecipeInJsonLd(data);
        if (recipe) candidates.push(recipe);
      } catch {
        // Malformed JSON-LD on the page — skip it and keep looking.
      }
    }
    if (candidates.length === 0) return null;
    // Prefer whichever candidate actually has ingredients/instructions —
    // some sites emit a second, sparser Recipe stub for SEO purposes.
    candidates.sort(
      (a, b) =>
        (b.recipeIngredient?.length || 0) - (a.recipeIngredient?.length || 0) ||
        (b.recipeInstructions?.length || 0) - (a.recipeInstructions?.length || 0)
    );
    return candidates[0];
  }

  function textFromMicrodata(el, prop) {
    const node = el.querySelector(`[itemprop="${prop}"]`);
    if (!node) return null;
    return node.getAttribute("content") || node.textContent.trim() || null;
  }

  function fromMicrodata() {
    const scope = document.querySelector('[itemscope][itemtype*="Recipe"]');
    if (!scope) return null;
    const ingredientEls = scope.querySelectorAll('[itemprop="recipeIngredient"], [itemprop="ingredients"]');
    const instructionEls = scope.querySelectorAll('[itemprop="recipeInstructions"]');
    return {
      name: textFromMicrodata(scope, "name"),
      description: textFromMicrodata(scope, "description"),
      recipeYield: textFromMicrodata(scope, "recipeYield"),
      prepTime: scope.querySelector('[itemprop="prepTime"]')?.getAttribute("datetime") || null,
      cookTime: scope.querySelector('[itemprop="cookTime"]')?.getAttribute("datetime") || null,
      totalTime: scope.querySelector('[itemprop="totalTime"]')?.getAttribute("datetime") || null,
      recipeIngredient: Array.from(ingredientEls).map((el) => el.textContent.trim()),
      recipeInstructions: Array.from(instructionEls).map((el) => el.textContent.trim()),
      keywords: null,
      recipeCategory: null,
      recipeCuisine: null,
    };
  }

  const raw = fromJsonLd() || fromMicrodata();
  if (!raw) return { found: false };

  const imported = toImportShape(raw);
  if (imported.ingredients.length === 0 && imported.steps.length === 0) {
    return { found: false };
  }
  return { found: true, recipe: imported };
}

(function(){
  var result = recipeBoxedExtract();
  if (!result.found) {
    alert("Recipe Boxed: couldn't find a recipe on this page.");
    return;
  }
  var json = JSON.stringify(result.recipe);
  var encoded = btoa(unescape(encodeURIComponent(json)));
  window.open("https://recipeboxed.com" + "/dashboard/import#data=" + encoded, "_blank");
})();
