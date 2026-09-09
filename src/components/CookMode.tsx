"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { Ingredient, Step } from "@/types/recipe";
import { ServingScaler } from "./ServingScaler";

export function CookMode({
  recipeId,
  title,
  baseServings,
  servingUnit,
  ingredients,
  equipment,
  steps,
}: {
  recipeId: string;
  title: string;
  baseServings: number;
  servingUnit: string;
  ingredients: Ingredient[];
  equipment: string[];
  steps: Step[];
}) {
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [current, setCurrent] = useState(0);
  const [extraSteps, setExtraSteps] = useState(1); // additional steps beyond the guaranteed neighbors
  const dragging = useRef(false);

  const onDrag = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    setSidebarWidth(Math.min(640, Math.max(300, e.clientX)));
  }, []);

  const startDrag = () => {
    dragging.current = true;
    const stop = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", stop);
    };
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stop);
  };

  // Always guarantee the previous and next step are visible, no matter the
  // window size setting — extraSteps only adds further out from that floor.
  const start = Math.max(0, current - 1 - Math.floor(extraSteps / 2));
  const end = Math.min(steps.length, current + 2 + Math.ceil(extraSteps / 2));
  const visibleSteps = steps.slice(start, end);

  return (
    <div className="flex h-[calc(100vh-57px)] w-full overflow-hidden">
      <aside
        style={{ width: sidebarWidth }}
        className="flex shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-elevated)] text-base"
      >
        <div
          className={`flex min-h-0 flex-col overflow-y-auto p-6 ${
            equipment.length > 0 ? "flex-[2]" : "flex-1"
          }`}
        >
          <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Ingredients
          </h2>
          <ServingScaler baseServings={baseServings} servingUnit={servingUnit} ingredients={ingredients} />
        </div>

        {equipment.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-[var(--border)] p-6">
            <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Equipment
            </h2>
            <ul className="flex flex-col gap-1.5 text-base">
              {equipment.map((eq) => (
                <li key={eq}>{eq}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <div
        onMouseDown={startDrag}
        className="w-1.5 shrink-0 cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)]"
      />

      <section className="flex flex-1 flex-col overflow-y-auto p-8">
        <div className="flex w-full flex-1 flex-col gap-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/recipes/${recipeId}`}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                &larr; Exit cook mode
              </Link>
              <h1 className="font-serif text-xl font-semibold">{title}</h1>
              <span className="text-sm text-[var(--text-muted)]">
                Step {current + 1} of {steps.length}
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              Show
              <select
                value={extraSteps}
                onChange={(e) => setExtraSteps(Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1"
              >
                <option value={0}>Just neighbors</option>
                <option value={1}>+1 more</option>
                <option value={3}>+3 more</option>
                <option value={5}>+5 more</option>
              </select>
            </label>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            {visibleSteps.map((step) => {
              const idx = steps.indexOf(step);
              const isCurrent = idx === current;
              return (
                <div
                  key={step.id}
                  onClick={() => setCurrent(idx)}
                  className={`cursor-pointer rounded-[var(--radius)] border transition-all ${
                    isCurrent
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] p-8 shadow-[var(--shadow)]"
                      : "border-[var(--border)] bg-[var(--bg-elevated)] p-4 opacity-60"
                  }`}
                >
                  <div className={`flex items-start ${isCurrent ? "gap-5" : "gap-3"}`}>
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${
                        isCurrent
                          ? "h-11 w-11 bg-[var(--accent)] text-xl text-white"
                          : "h-7 w-7 bg-[var(--bg-muted)] text-sm text-[var(--text-muted)]"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <p className={isCurrent ? "text-2xl leading-relaxed" : "text-base leading-relaxed"}>
                      {step.body}
                    </p>
                  </div>
                  {step.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={step.photo_url}
                      alt=""
                      className={`mt-4 w-full rounded-lg object-cover ${
                        isCurrent ? "max-h-96" : "max-h-40"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
              disabled={current === steps.length - 1}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              Next step
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
