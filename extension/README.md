# Recipe Boxed Exporter (browser extension)

Detects a recipe on the current page (via schema.org `Recipe` structured
data — JSON-LD first, microdata as a fallback) and exports it as JSON in
the same shape Recipe Boxed's **Import JSON** page (`/dashboard/import`)
accepts. Works on most modern recipe sites, since schema.org Recipe
markup is what gives them the rich Google Search recipe card.

No page content is sent anywhere — everything happens locally in the
popup and the injected content script. The only permissions are
`activeTab` (read the current tab, only when you click the button),
`scripting` (inject the one-time extraction script), and `downloads`
(save the JSON file when you click Download).

## Load it for development

**Chrome / Edge / Brave (Chromium):**
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this `extension/` folder

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on…"
3. Select `manifest.json` inside this folder

(Firefox temporary add-ons unload when the browser restarts — reload
them from the same page during development. Signed, permanent
installation requires packaging and submitting to Mozilla, which isn't
needed for personal/local use.)

## Use it

1. Open a recipe page (e.g. a blog post, AllRecipes, Serious Eats, NYT
   Cooking, etc.)
2. Click the Recipe Boxed Exporter toolbar icon
3. Click "Detect recipe on this page" — a confirmation toast also appears
   on the page itself, not just in the popup
4. Copy the JSON or download it, then paste/upload it on Recipe Boxed's
   [Import page](/dashboard/import)

## Bookmarklet (no install needed)

Prefer not to install an extension? Recipe Boxed has a one-click
bookmarklet at `/bookmarklet` (sign in first) that does the same
detection and opens the Import page pre-filled automatically — drag it to
your bookmarks bar, click it on any recipe page, review, and hit Import.
It's built from `extractor.js` too (`build-bookmarklet.mjs`), so both
stay in sync with the same parsing logic.

## Smart parsing

`extractor.js` handles a fair amount of real-world messiness in recipe
markup, verified against 10 real sites (AllRecipes, Budget Bytes, Cookie
and Kate, Sally's Baking Addiction, Simply Recipes, Food Network,
Epicurious, Pinch of Yum, Food.com, Bon Appétit):

- Unicode fractions (½ ¼ ⅓ …), mixed numbers ("1 1/2"), and ranges
  ("2-3 cups", "2 to 3 cups", en/em-dash ranges) — ranges average to a
  single number
- A wide unit vocabulary with abbreviations and plurals (tbsp/tbs/tblsp,
  tsp/tspn, oz/ounce, g/gram/gramme, ml/millilitre/cc, …)
- Bullet/checkbox markers some recipe plugins prepend to each ingredient
  line (WP Recipe Maker's "▢", "•", "-", "*")
- Metric-equivalent asides right after the amount ("3/4 cup (12 Tbsp;
  170g) unsalted butter") moved into a note instead of polluting the name
- "2 cups of flour" — the stray "of" dropped
- Instructions given as one unsplit blob with embedded numbering ("1.
  Preheat oven. 2. Mix...") split into individual steps
- Plain-text durations ("1 hour 30 minutes") in addition to ISO 8601
  ("PT1H30M")
- HTML entities and stray tags in scraped text, decoded/stripped
- Picks the richer of multiple JSON-LD Recipe blocks when a page emits
  more than one (some sites emit a sparse SEO stub alongside the real one)

## Limitations

- Only works on pages that publish schema.org Recipe structured data.
  Most recipe blogs and major recipe sites do this (it's what powers
  Google's recipe rich results), but a hand-written page without it
  won't be detected. Some sites (e.g. The Kitchn) actively block
  automated access and will show "no recipe detected" even though they
  do publish the markup.
- Ingredient parsing (amount/unit/name/note) is a best-effort regex over
  each ingredient line — unusual phrasing may end up entirely in the
  "name" field rather than split out. Review the imported draft before
  publishing.
- Equipment extraction only works on the handful of recipe plugins that
  emit a non-standard "tool"/"equipment" field — schema.org Recipe has no
  standard field for it. Photos aren't extracted; re-upload through the
  app's image picker for cropping.
