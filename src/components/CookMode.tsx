"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import type { Ingredient, Step } from "@/types/recipe";
import { ServingScaler } from "./ServingScaler";

export function CookMode({
  recipeId,
  title,
  baseServings,
  ingredients,
  equipment,
  steps,
}: {
  recipeId: string;
  title: string;
  baseServings: number;
  ingredients: Ingredient[];
  equipment: string[];
  steps: Step[];
}) {
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [current, setCurrent] = useState(0);
  const [windowSize, setWindowSize] = useState(3); // how many upcoming steps to show
  const dragging = useRef(false);

  const onDrag = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    setSidebarWidth(Math.min(560, Math.max(260, e.clientX)));
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

  const visibleSteps = steps.slice(
    Math.max(0, current - 1),
    Math.min(steps.length, current + windowSize)
  );

  return (
    <div className="flex h-[calc(100vh-57px)] w-full overflow-hidden">
      <aside
        style={{ width: sidebarWidth }}
        className="flex shrink-0 flex-col gap-8 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-elevated)] p-6"
      >
        <div>
          <Link
            href={`/recipes/${recipeId}`}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            &larr; Exit cook mode
          </Link>
          <h1 className="mt-2 font-serif text-xl font-semibold">{title}</h1>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Ingredients
          </h2>
          <ServingScaler baseServings={baseServings} ingredients={ingredients} />
        </div>

        {equipment.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Equipment
            </h2>
            <ul className="flex flex-col gap-1 text-sm">
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
            <span className="text-sm text-[var(--text-muted)]">
              Step {current + 1} of {steps.length}
            </span>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              Show
              <select
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1"
              >
                <option value={1}>1 step</option>
                <option value={2}>2 steps</option>
                <option value={3}>3 steps</option>
                <option value={5}>5 steps</option>
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
                  className={`cursor-pointer rounded-[var(--radius)] border p-6 transition-all ${
                    isCurrent
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow)]"
                      : "border-[var(--border)] bg-[var(--bg-elevated)] opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isCurrent
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-muted)] text-[var(--text-muted)]"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <p className={isCurrent ? "text-lg leading-relaxed" : "leading-relaxed"}>
                      {step.body}
                    </p>
                  </div>
                  {step.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={step.photo_url}
                      alt=""
                      className="mt-4 max-h-64 w-full rounded-lg object-cover"
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
