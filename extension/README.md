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
3. Click "Detect recipe on this page"
4. Copy the JSON or download it, then paste/upload it on Recipe Boxed's
   [Import page](/dashboard/import)

## Limitations

- Only works on pages that publish schema.org Recipe structured data.
  Most recipe blogs and major recipe sites do this (it's what powers
  Google's recipe rich results), but a hand-written page without it
  won't be detected.
- Ingredient parsing (amount/unit/name/note) is a best-effort regex over
  each ingredient line — unusual phrasing may end up entirely in the
  "name" field rather than split out. Review the imported draft before
  publishing.
- Equipment and photos aren't extracted (schema.org Recipe has no
  standard equipment field, and photos require re-uploading through the
  app's image picker for cropping anyway).
