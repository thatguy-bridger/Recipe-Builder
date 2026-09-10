"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecipeWithDetails } from "@/types/recipe";
import { EditableImage } from "./EditableImage";

type IngredientRow = { amount: string; unit: string; name: string; category: string; note: string };
type StepRow = { body: string; photo_url: string; is_pinned: boolean };
type DragPayload = { type: "ingredient" | "step"; index: number };

async function uploadPhoto(file: File): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("recipe-photos").upload(path, file);
  if (error) {
    alert(`Upload failed: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from("recipe-photos").getPublicUrl(path);
  return data.publicUrl;
}

function setDragPayload(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", JSON.stringify(payload));
}

function readDragPayload(e: React.DragEvent): DragPayload | null {
  try {
    const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
    if (data && (data.type === "ingredient" || data.type === "step")) return data;
    return null;
  } catch {
    return null;
  }
}

// Give the dragged element a real drag preview (the whole card, not just the
// tiny grip glyph) by pointing the browser's drag image at an ancestor.
function useCardDragImage() {
  return (e: React.DragEvent, selector: string) => {
    const card = (e.target as HTMLElement).closest(selector) as HTMLElement | null;
    if (card) {
      const rect = card.getBoundingClientRect();
      e.dataTransfer.setDragImage(card, e.clientX - rect.left, e.clientY - rect.top);
    }
  };
}

function GripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="2" r="1.4" />
      <circle cx="8" cy="2" r="1.4" />
      <circle cx="2" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="2" cy="14" r="1.4" />
      <circle cx="8" cy="14" r="1.4" />
    </svg>
  );
}

export function RecipeForm({
  action,
  initial,
}: {
  action: (formData: FormData) => void;
  initial?: RecipeWithDetails;
}) {
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.recipe_ingredients
      ?.sort((a, b) => a.position - b.position)
      .map((i) => ({
        amount: i.amount != null ? String(i.amount) : "",
        unit: i.unit ?? "",
        name: i.name,
        category: i.category ?? "",
        note: i.note ?? "",
      })) ?? [{ amount: "", unit: "", name: "", category: "", note: "" }]
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.recipe_steps
      ?.sort((a, b) => a.position - b.position)
      .map((s) => ({ body: s.body, photo_url: s.photo_url ?? "", is_pinned: s.is_pinned })) ?? [
      { body: "", photo_url: "", is_pinned: false },
    ]
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    initial?.recipe_photos?.sort((a, b) => a.position - b.position).map((p) => p.url) ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<string[]>(() =>
    Array.from(
      new Set((initial?.recipe_ingredients ?? []).map((i) => i.category?.trim()).filter(Boolean))
    ) as string[]
  );
  const [newCategory, setNewCategory] = useState("");
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [draggingIngredient, setDraggingIngredient] = useState<number | null>(null);
  const [dragOverStep, setDragOverStep] = useState<number | null>(null);
  const [draggingStep, setDraggingStep] = useState<number | null>(null);
  const setCardDragImage = useCardDragImage();

  function addCategory() {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) {
      setNewCategory("");
      return;
    }
    setCategories((c) => [...c, name]);
    setNewCategory("");
  }

  function removeCategory(name: string) {
    setCategories((c) => c.filter((cat) => cat !== name));
    setIngredients((rows) => rows.map((r) => (r.category === name ? { ...r, category: "" } : r)));
  }

  // Moves ingredient `from` to just before ingredient `to`, and assigns it
  // to `category` (dropping it "into" that category's card).
  function moveIngredient(from: number, to: number | null, category: string) {
    setIngredients((rows) => {
      const next = [...rows];
      const [moved] = next.splice(from, 1);
      moved.category = category;
      if (to == null) {
        next.push(moved);
      } else {
        const insertAt = to > from ? to - 1 : to;
        next.splice(insertAt, 0, moved);
      }
      return next;
    });
  }

  function reorderStep(from: number, to: number) {
    if (from === to) return;
    setSteps((rows) => {
      const next = [...rows];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <form
      action={(formData) => {
        formData.set("ingredients", JSON.stringify(ingredients.filter((i) => i.name.trim())));
        formData.set("steps", JSON.stringify(steps.filter((s) => s.body.trim())));
        formData.set("photo_urls", photoUrls.join(","));
        action(formData);
      }}
      className="flex flex-col gap-10"
    >
      <section className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            name="title"
            required
            defaultValue={initial?.title}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            rows={2}
            defaultValue={initial?.description ?? ""}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Servings
            <input
              type="number"
              name="servings"
              min={1}
              defaultValue={initial?.servings ?? 4}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Serving unit
            <input
              name="serving_unit"
              placeholder="e.g. Bonker Bread"
              defaultValue={initial?.serving_unit ?? "Serving"}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Prep time
            <input
              name="prep_minutes"
              placeholder="e.g. 15 or 10-12 min"
              defaultValue={initial?.prep_minutes ?? ""}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cook time
            <input
              name="cook_minutes"
              placeholder="e.g. 15 or 10-12 min"
              defaultValue={initial?.cook_minutes ?? ""}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Tags (comma separated)
          <input
            name="tags"
            defaultValue={initial?.tags.join(", ")}
            placeholder="Dessert, Italian, Quick"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Equipment (comma separated)
          <input
            name="equipment"
            defaultValue={initial?.equipment.join(", ")}
            placeholder="Stand mixer, 9-inch pan"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Video URL (YouTube or Vimeo)
          <input
            name="video_url"
            defaultValue={initial?.video_url ?? ""}
            placeholder="https://youtube.com/watch?v=..."
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={initial?.is_published ?? true} />
          Published (visible to everyone)
        </label>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold">Photos</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          The first photo is the recipe&apos;s icon — it&apos;s what shows up on cards and in
          search. Use the pencil on any photo to reposition or crop it.
        </p>
        <div className="flex flex-wrap gap-3">
          {photoUrls.map((url, i) => (
            <div key={url} className="relative h-24 w-24">
              <EditableImage
                src={url}
                aspect={i === 0 ? 4 / 3 : 1}
                className="h-24 w-24"
                onChange={(newUrl) =>
                  setPhotoUrls((urls) => urls.map((u, idx) => (idx === i ? newUrl : u)))
                }
              />
              {i === 0 && (
                <span className="pointer-events-none absolute left-1 top-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Icon
                </span>
              )}
              <button
                type="button"
                onClick={() => setPhotoUrls((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--danger)] text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)]">
            {uploading ? "..." : "+ Add"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                const url = await uploadPhoto(file);
                if (url) setPhotoUrls((p) => [...p, url]);
                setUploading(false);
              }}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold">Ingredients</h2>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Drag an ingredient by its grip and drop it anywhere inside a category card to move it
          there. New ingredients start out in Uncategorized.
        </p>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {["", ...categories].map((cat) => {
            const items = ingredients
              .map((ing, i) => ({ ing, i }))
              .filter(({ ing }) => (ing.category || "") === cat);

            return (
              <div
                key={cat || "__uncat"}
                data-category-card={cat || "__uncat"}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCategory(cat);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCategory((c) => (c === cat ? null : c));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCategory(null);
                  const payload = readDragPayload(e);
                  if (payload?.type === "ingredient") moveIngredient(payload.index, null, cat);
                }}
                className={`flex flex-col gap-2 rounded-[var(--radius)] border-2 p-3 transition-colors ${
                  dragOverCategory === cat
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--bg-muted)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {cat || "Uncategorized"}
                  </h3>
                  {cat && (
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      aria-label={`Remove category ${cat}`}
                      className="text-[var(--danger)]"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {items.map(({ ing, i }) => (
                    <div
                      key={i}
                      data-ingredient-card
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverCategory(cat);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverCategory(null);
                        const payload = readDragPayload(e);
                        if (payload?.type === "ingredient") moveIngredient(payload.index, i, cat);
                      }}
                      className={`flex flex-col gap-1.5 rounded-lg border p-2 transition-opacity ${
                        draggingIngredient === i
                          ? "border-[var(--accent)] opacity-40"
                          : "border-[var(--border)] bg-[var(--bg-elevated)]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          draggable
                          onDragStart={(e) => {
                            setCardDragImage(e, "[data-ingredient-card]");
                            setDraggingIngredient(i);
                            setDragPayload(e, { type: "ingredient", index: i });
                          }}
                          onDragEnd={() => setDraggingIngredient(null)}
                          className="flex shrink-0 cursor-grab items-center rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] active:cursor-grabbing"
                          aria-label="Drag to move or reorder"
                          title="Drag to move between categories or reorder"
                        >
                          <GripIcon />
                        </span>
                        <input
                          placeholder="Amt (e.g. 1 1/2)"
                          value={ing.amount}
                          onChange={(e) =>
                            setIngredients((rows) =>
                              rows.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r))
                            )
                          }
                          className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-sm"
                        />
                        <input
                          placeholder="Unit"
                          value={ing.unit}
                          onChange={(e) =>
                            setIngredients((rows) =>
                              rows.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r))
                            )
                          }
                          className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setIngredients((rows) => rows.filter((_, idx) => idx !== i))}
                          className="ml-auto shrink-0 text-[var(--danger)]"
                        >
                          ×
                        </button>
                      </div>
                      <input
                        placeholder="Ingredient"
                        value={ing.name}
                        onChange={(e) =>
                          setIngredients((rows) =>
                            rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r))
                          )
                        }
                        className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Quick note (optional)"
                        value={ing.note}
                        onChange={(e) =>
                          setIngredients((rows) =>
                            rows.map((r, idx) => (idx === i ? { ...r, note: e.target.value } : r))
                          )
                        }
                        className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-xs"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIngredients((rows) => [
                      ...rows,
                      { amount: "", unit: "", name: "", category: cat, note: "" },
                    ])
                  }
                  className="mt-1 text-sm text-[var(--accent)] hover:underline"
                >
                  + Add ingredient
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            placeholder="New category name, e.g. Bread, Topping"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={addCategory}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-muted)]"
          >
            + Add category
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold">Steps</h2>
        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div
              key={i}
              data-step-card
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStep(i);
              }}
              onDragLeave={() => setDragOverStep((idx) => (idx === i ? null : idx))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStep(null);
                const payload = readDragPayload(e);
                if (payload?.type === "step") reorderStep(payload.index, i);
              }}
              className={`flex gap-2 rounded-lg border p-1 transition-opacity ${
                draggingStep === i
                  ? "border-[var(--accent)] opacity-40"
                  : dragOverStep === i
                    ? "border-[var(--accent)]"
                    : "border-transparent"
              }`}
            >
              <span
                draggable
                onDragStart={(e) => {
                  setCardDragImage(e, "[data-step-card]");
                  setDraggingStep(i);
                  setDragPayload(e, { type: "step", index: i });
                }}
                onDragEnd={() => setDraggingStep(null)}
                className="mt-2 flex shrink-0 cursor-grab items-center rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-muted)] active:cursor-grabbing"
                aria-label="Drag to reorder"
                title="Drag to reorder"
              >
                <GripIcon />
              </span>
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                {i + 1}
              </span>
              <div className="flex flex-1 flex-col gap-2">
                <textarea
                  value={step.body}
                  onChange={(e) =>
                    setSteps((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, body: e.target.value } : r))
                    )
                  }
                  rows={2}
                  placeholder="Describe this step..."
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-3">
                  {step.photo_url && (
                    <EditableImage
                      src={step.photo_url}
                      aspect={1}
                      className="h-12 w-12"
                      onChange={(newUrl) =>
                        setSteps((rows) =>
                          rows.map((r, idx) => (idx === i ? { ...r, photo_url: newUrl } : r))
                        )
                      }
                    />
                  )}
                  <label className="cursor-pointer text-xs text-[var(--accent)] hover:underline">
                    {step.photo_url ? "Replace photo" : "+ Add photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadPhoto(file);
                        if (url)
                          setSteps((rows) =>
                            rows.map((r, idx) => (idx === i ? { ...r, photo_url: url } : r))
                          );
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSteps((rows) =>
                        rows.map((r, idx) => (idx === i ? { ...r, is_pinned: !r.is_pinned } : r))
                      )
                    }
                    className={`rounded-full border px-2 py-1 text-xs ${
                      step.is_pinned
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    {step.is_pinned ? "📌 Always shown" : "Always show this step ▾"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSteps((rows) => rows.filter((_, idx) => idx !== i))}
                className="text-[var(--danger)]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setSteps((rows) => [...rows, { body: "", photo_url: "", is_pinned: false }])
          }
          className="mt-3 text-sm text-[var(--accent)] hover:underline"
        >
          + Add step
        </button>
      </section>

      <button
        type="submit"
        className="self-start rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
      >
        {initial ? "Save changes" : "Create recipe"}
      </button>
    </form>
  );
}
