"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecipeWithDetails } from "@/types/recipe";

type IngredientRow = { amount: string; unit: string; name: string; notes: string };
type StepRow = { body: string; photo_url: string };

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
        notes: i.notes ?? "",
      })) ?? [{ amount: "", unit: "", name: "", notes: "" }]
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.recipe_steps
      ?.sort((a, b) => a.position - b.position)
      .map((s) => ({ body: s.body, photo_url: s.photo_url ?? "" })) ?? [
      { body: "", photo_url: "" },
    ]
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    initial?.recipe_photos?.sort((a, b) => a.position - b.position).map((p) => p.url) ?? []
  );
  const [uploading, setUploading] = useState(false);

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
            Prep (min)
            <input
              type="number"
              name="prep_minutes"
              min={0}
              defaultValue={initial?.prep_minutes ?? ""}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cook (min)
            <input
              type="number"
              name="cook_minutes"
              min={0}
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
        <div className="flex flex-wrap gap-3">
          {photoUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={url} className="relative">
              <img src={url} alt="" className="h-24 w-24 rounded-lg object-cover" />
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
        <div className="flex flex-col gap-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="grid grid-cols-[5rem_5rem_1fr_1fr_auto] gap-2">
              <input
                placeholder="Amt"
                value={ing.amount}
                onChange={(e) =>
                  setIngredients((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r))
                  )
                }
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Unit"
                value={ing.unit}
                onChange={(e) =>
                  setIngredients((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r))
                  )
                }
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Ingredient"
                value={ing.name}
                onChange={(e) =>
                  setIngredients((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r))
                  )
                }
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Notes"
                value={ing.notes}
                onChange={(e) =>
                  setIngredients((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, notes: e.target.value } : r))
                  )
                }
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setIngredients((rows) => rows.filter((_, idx) => idx !== i))}
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
            setIngredients((rows) => [...rows, { amount: "", unit: "", name: "", notes: "" }])
          }
          className="mt-3 text-sm text-[var(--accent)] hover:underline"
        >
          + Add ingredient
        </button>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold">Steps</h2>
        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2">
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
                <div className="flex items-center gap-2">
                  {step.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={step.photo_url} alt="" className="h-12 w-12 rounded object-cover" />
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
          onClick={() => setSteps((rows) => [...rows, { body: "", photo_url: "" }])}
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
