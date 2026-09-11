// Builds the "Import to Recipe Boxed" bookmarklet from extractor.js (the
// same extraction logic the extension popup uses — see that file's header
// comment) plus a small driver that opens the app's Import page with the
// extracted recipe attached.
//
// Run: node extension/build-bookmarklet.mjs [siteUrl]
// Writes extension/bookmarklet.html (a page with a draggable bookmarklet
// link) and prints the raw javascript: URI.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteUrl = (process.argv[2] || "https://recipeboxed.com").replace(/\/$/, "");

const extractorSource = readFileSync(join(__dirname, "extractor.js"), "utf8");

// Drop the header comment and the trailing `recipeBoxedExtract();` call —
// the driver below calls it itself once it's decided what to do with the
// result.
const functionBody = extractorSource
  .replace(/^\/\/.*\n/gm, "")
  .replace(/\n?recipeBoxedExtract\(\);\s*$/, "");

const driver = `
(function(){
  var result = recipeBoxedExtract();
  if (!result.found) {
    alert("Recipe Boxed: couldn't find a recipe on this page.");
    return;
  }
  var json = JSON.stringify(result.recipe);
  var encoded = btoa(unescape(encodeURIComponent(json)));
  window.open(${JSON.stringify(siteUrl)} + "/dashboard/import#data=" + encoded, "_blank");
})();
`;

const combined = functionBody + driver;

// Light minification: strip line comments and collapse blank lines/
// indentation so the resulting javascript: URI stays a reasonable size.
// Not a real minifier — just enough to keep this readable to maintain
// while producing a compact bookmarklet.
const minified = combined
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("//"))
  .join(" ")
  .replace(/\s+/g, " ");

const bookmarkletHref = "javascript:" + encodeURIComponent(minified);

writeFileSync(join(__dirname, "bookmarklet.generated.js"), combined, "utf8");

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Import to Recipe Boxed — bookmarklet</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 560px; margin: 60px auto; padding: 0 20px; color: #1a1a1a; }
      a.bookmarklet { display: inline-block; padding: 10px 18px; border-radius: 999px; background: #ed894a; color: white; font-weight: 600; text-decoration: none; cursor: grab; }
      code { background: #f2ece4; padding: 2px 6px; border-radius: 4px; }
      ol { line-height: 1.8; }
    </style>
  </head>
  <body>
    <h1>Import to Recipe Boxed</h1>
    <p>Drag this button to your bookmarks bar:</p>
    <p><a class="bookmarklet" href="${bookmarkletHref}">📥 Import to Recipe Boxed</a></p>
    <ol>
      <li>Drag the button above onto your browser's bookmarks bar (if it's hidden, show it first).</li>
      <li>Open any recipe page.</li>
      <li>Click the bookmark. It detects the recipe and opens Recipe Boxed's Import page with the fields already filled in.</li>
      <li>Review the recipe, then click Import.</li>
    </ol>
    <p>Configured for <code>${siteUrl}</code>. If your Recipe Boxed instance runs elsewhere, rebuild with
    <code>node extension/build-bookmarklet.mjs https://your-domain</code> and regenerate this page.</p>
  </body>
</html>
`;

writeFileSync(join(__dirname, "bookmarklet.html"), html, "utf8");

console.log(`Built bookmarklet for ${siteUrl}`);
console.log(`- extension/bookmarklet.html (drag-to-install page)`);
console.log(`- extension/bookmarklet.generated.js (readable source, for reference)`);
console.log(`- javascript: URI length: ${bookmarkletHref.length} chars`);
