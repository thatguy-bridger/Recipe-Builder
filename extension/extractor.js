// Runs inside the page (injected via chrome.scripting.executeScript).
// Finds a schema.org Recipe (JSON-LD first, microdata as a fallback) and
// returns it reshaped into the same JSON the Recipe Boxed app's
// "Import JSON" page accepts — see src/app/actions/recipes.ts
// (importRecipeJson) for the authoritative shape.

(function extractRecipe() {
  const UNIT_WORDS = [
    "tablespoons", "tablespoon", "teaspoons", "teaspoon", "tbsps", "tbsp",
    "tbs", "tsps", "tsp", "cups", "cup", "fluid ounces", "fluid ounce",
    "fl oz", "pints", "pint", "quarts", "quart", "gallons", "gallon",
    "ounces", "ounce", "oz", "pounds", "pound", "lbs", "lb",
    "milliliters", "millililiters", "millilitres", "ml", "liters", "litres",
    "l", "grams", "gram", "g", "kilograms", "kilogram", "kg",
    "cloves", "clove", "pinches", "pinch", "cans", "can", "packages",
    "package", "pkg", "slices", "slice", "heads", "head", "bunches",
    "bunch", "sprigs", "sprig", "sticks", "stick", "pieces", "piece",
    "dashes", "dash",
  ].sort((a, b) => b.length - a.length);

  const FRACTIONS = {
    "¼": "1/4", "½": "1/2", "¾": "3/4", "⅓": "1/3", "⅔": "2/3",
    "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
  };

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

  function parseIngredientLine(rawLine) {
    let line = decodeHtmlEntities(String(rawLine)).trim();
    for (const [glyph, ascii] of Object.entries(FRACTIONS)) {
      line = line.split(glyph).join(` ${ascii} `);
    }
    line = line.replace(/\s+/g, " ").trim();

    const qtyMatch = line.match(/^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)\s*/);
    let amount = null;
    let rest = line;
    if (qtyMatch) {
      amount = fractionToNumber(qtyMatch[1]);
      rest = line.slice(qtyMatch[0].length).trim();
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
    const match = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return null;
    const days = Number(match[1] || 0);
    const hours = Number(match[2] || 0);
    const minutes = Number(match[3] || 0);
    const total = days * 24 * 60 + hours * 60 + minutes;
    return total > 0 ? String(total) : null;
  }

  function flattenInstructions(instructions) {
    if (!instructions) return [];
    if (typeof instructions === "string") {
      return instructions
        .split(/\r?\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (!Array.isArray(instructions)) return [];
    const steps = [];
    for (const item of instructions) {
      if (typeof item === "string") {
        steps.push(item.trim());
      } else if (item && item["@type"] === "HowToSection" && Array.isArray(item.itemListElement)) {
        steps.push(...flattenInstructions(item.itemListElement));
      } else if (item && typeof item.text === "string") {
        steps.push(item.text.trim());
      } else if (item && typeof item.name === "string") {
        steps.push(item.name.trim());
      }
    }
    return steps.filter(Boolean);
  }

  function parseYield(recipeYield) {
    const value = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
    if (value == null) return { servings: null, serving_unit: null };
    const str = String(value);
    const numMatch = str.match(/\d+/);
    const servings = numMatch ? Number(numMatch[0]) : null;
    const unitMatch = str.replace(/\d+/, "").trim();
    return { servings, serving_unit: unitMatch || null };
  }

  function decodeHtmlEntities(text) {
    if (!text) return text;
    const el = document.createElement("textarea");
    el.innerHTML = text;
    return el.value;
  }

  function firstString(value) {
    const found = Array.isArray(value) ? value.find((v) => typeof v === "string") : value;
    return typeof found === "string" ? decodeHtmlEntities(found) : null;
  }

  function tagsFrom(recipe) {
    const tags = new Set();
    const addAll = (value) => {
      if (!value) return;
      const arr = Array.isArray(value) ? value : String(value).split(",");
      for (const v of arr) {
        const trimmed = decodeHtmlEntities(String(v)).trim();
        if (trimmed) tags.add(trimmed);
      }
    };
    addAll(recipe.recipeCategory);
    addAll(recipe.recipeCuisine);
    if (typeof recipe.keywords === "string") addAll(recipe.keywords.split(","));
    else addAll(recipe.keywords);
    return Array.from(tags).slice(0, 12);
  }

  function toImportShape(recipe) {
    const { servings, serving_unit } = parseYield(recipe.recipeYield);
    const ingredients = (recipe.recipeIngredient || recipe.ingredients || []).map(parseIngredientLine);
    const steps = flattenInstructions(recipe.recipeInstructions).map((body) => ({
      body: decodeHtmlEntities(body),
      photo_urls: [],
      is_pinned: false,
      timer_minutes: null,
    }));

    return {
      format: "recipe-boxed/v1",
      title: firstString(recipe.name) || document.title || "Imported recipe",
      description: firstString(recipe.description),
      servings,
      serving_unit,
      prep_minutes: parseIsoDurationToMinutes(recipe.prepTime),
      cook_minutes: parseIsoDurationToMinutes(recipe.cookTime),
      total_minutes: parseIsoDurationToMinutes(recipe.totalTime),
      tags: tagsFrom(recipe),
      equipment: [],
      video_url: null,
      ingredients,
      steps,
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
    return null;
  }

  function fromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const recipe = findRecipeInJsonLd(data);
        if (recipe) return recipe;
      } catch {
        // Malformed JSON-LD on the page — skip it and keep looking.
      }
    }
    return null;
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
})();
