const detectBtn = document.getElementById("detect");
const copyBtn = document.getElementById("copy");
const downloadBtn = document.getElementById("download");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const jsonEl = document.getElementById("json");

let lastFilename = "recipe.json";

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.className = isError ? "error" : "";
}

// Injected into the page itself (not the popup) to show a small toast
// confirming what was found — so clicking Detect visibly does something
// on the actual page, not just inside the tiny popup.
function showOnPageToast(message, isError) {
  const existing = document.getElementById("__recipeBoxedToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "__recipeBoxedToast";
  toast.textContent = message;
  toast.style.cssText = [
    "position:fixed", "top:16px", "right:16px", "z-index:2147483647",
    "max-width:320px", "padding:10px 14px", "border-radius:10px",
    "font:600 13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "color:#fff", `background:${isError ? "#c0392b" : "#ed894a"}`,
    "box-shadow:0 4px 16px rgba(0,0,0,.25)", "transition:opacity .3s ease",
  ].join(";");
  document.documentElement.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

detectBtn.addEventListener("click", async () => {
  detectBtn.disabled = true;
  resultEl.style.display = "none";
  setStatus("Scanning the page…", false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["extractor.js"],
    });

    if (!result?.found) {
      setStatus("No recipe detected on this page.", true);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showOnPageToast,
        args: ["Recipe Boxed: no recipe detected on this page.", true],
      });
      detectBtn.disabled = false;
      return;
    }

    const recipe = result.recipe;
    jsonEl.value = JSON.stringify(recipe, null, 2);
    resultEl.style.display = "block";
    lastFilename = `${(recipe.title || "recipe").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "recipe"}.json`;
    const summary = `Found "${recipe.title}" — ${recipe.ingredients.length} ingredients, ${recipe.steps.length} steps.`;
    setStatus(summary, false);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showOnPageToast,
      args: [`✓ ${summary}`, false],
    });
  } catch (err) {
    setStatus(`Couldn't read this page: ${err.message}`, true);
  } finally {
    detectBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(jsonEl.value);
  setStatus("Copied to clipboard. Paste it into Recipe Boxed's Import page.", false);
});

downloadBtn.addEventListener("click", () => {
  const blob = new Blob([jsonEl.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: lastFilename }, () => URL.revokeObjectURL(url));
});
