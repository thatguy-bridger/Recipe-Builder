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
      detectBtn.disabled = false;
      return;
    }

    const recipe = result.recipe;
    jsonEl.value = JSON.stringify(recipe, null, 2);
    resultEl.style.display = "block";
    lastFilename = `${(recipe.title || "recipe").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "recipe"}.json`;
    setStatus(
      `Found "${recipe.title}" — ${recipe.ingredients.length} ingredients, ${recipe.steps.length} steps.`,
      false
    );
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
