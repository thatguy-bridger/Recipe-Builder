"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Ingredient, Step } from "@/types/recipe";
import { ServingScaler } from "./ServingScaler";
import { StepPhotos } from "./StepPhotos";
import { remainingSeconds, useCookTimer } from "./CookTimerProvider";
import { buildIsolatedThemeStyle } from "@/lib/designLanguage";
import { formatDuration, parseMinutesText } from "@/lib/duration";
import {
  findMentionedCategories,
  findMentionedIngredients,
  mentionedWords,
  splitByTerms,
} from "@/lib/ingredientMatch";

type SubTimer = { stepId: string; total: number; remaining: number; running: boolean };

export function CookMode({
  recipeId,
  title,
  baseServings,
  servingUnit,
  totalMinutes,
  ownerTheme,
  ingredients,
  equipment,
  steps,
}: {
  recipeId: string;
  title: string;
  baseServings: number;
  servingUnit: string;
  totalMinutes: string | null;
  ownerTheme?: {
    theme_accent: string | null;
    theme_radius: string | null;
    theme_font: string | null;
    theme_watermark_url: string | null;
  } | null;
  ingredients: Ingredient[];
  equipment: string[];
  steps: Step[];
}) {
  const splitStorageKey = `cookmode-split-${recipeId}`;
  const widthStorageKey = `cookmode-width-${recipeId}`;

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [ingredientsHeight, setIngredientsHeight] = useState(360);
  const [current, setCurrent] = useState(0);
  const [extraSteps, setExtraSteps] = useState(1); // additional steps beyond the guaranteed neighbors
  const [showServings, setShowServings] = useState(true);
  const dragging = useRef(false);
  const asideRef = useRef<HTMLElement>(null);
  const ingredientsContentRef = useRef<HTMLDivElement>(null);
  const equipmentContentRef = useRef<HTMLDivElement>(null);
  // Once the cook drags a handle, their choice sticks (and persists) instead
  // of being recalculated from content on every render.
  const heightManual = useRef(false);
  const widthManual = useRef(false);

  // Restore a cook's previous manual adjustments for this recipe, if any.
  useEffect(() => {
    try {
      const storedSplit = localStorage.getItem(splitStorageKey);
      if (storedSplit) {
        heightManual.current = true;
        setIngredientsHeight(Number(storedSplit));
      }
      const storedWidth = localStorage.getItem(widthStorageKey);
      if (storedWidth) {
        widthManual.current = true;
        setSidebarWidth(Number(storedWidth));
      }
    } catch {
      // localStorage unavailable — fall back to auto-sizing below.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  // Auto-fit the ingredients/equipment split to how much content each
  // actually has, instead of a fixed 50/50, unless the cook has manually
  // resized it (in which case that choice is kept).
  useLayoutEffect(() => {
    if (heightManual.current) return;
    if (!asideRef.current || !ingredientsContentRef.current) return;
    if (!equipmentContentRef.current) return;

    const total = asideRef.current.getBoundingClientRect().height;
    const ingredientsNatural = ingredientsContentRef.current.scrollHeight;
    const equipmentNatural = equipmentContentRef.current.scrollHeight;
    const combined = ingredientsNatural + equipmentNatural;
    if (combined === 0 || total === 0) return;

    const proportional = (ingredientsNatural / combined) * total;
    setIngredientsHeight(Math.min(total - 120, Math.max(120, proportional)));
  }, [ingredients, equipment, showServings]);

  const onDrag = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return;
    setSidebarWidth(Math.min(640, Math.max(300, e.clientX)));
  }, []);

  const startDrag = (e: ReactPointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const stopDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    widthManual.current = true;
    setSidebarWidth((w) => {
      try {
        localStorage.setItem(widthStorageKey, String(w));
      } catch {
        // ignore
      }
      return w;
    });
  };

  const onDragHeight = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current || !asideRef.current) return;
    const top = asideRef.current.getBoundingClientRect().top;
    const total = asideRef.current.getBoundingClientRect().height;
    setIngredientsHeight(Math.min(total - 120, Math.max(120, e.clientY - top)));
  }, []);

  const startDragHeight = (e: ReactPointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const stopDragHeight = () => {
    if (!dragging.current) return;
    dragging.current = false;
    heightManual.current = true;
    setIngredientsHeight((h) => {
      try {
        localStorage.setItem(splitStorageKey, String(h));
      } catch {
        // ignore
      }
      return h;
    });
  };

  // Always guarantee the previous and next step are visible, no matter the
  // window size setting — extraSteps only adds further out from that floor.
  const start = Math.max(0, current - 1 - Math.floor(extraSteps / 2));
  const end = Math.min(steps.length, current + 2 + Math.ceil(extraSteps / 2));
  // Pinned steps are informational and always shown, regardless of the
  // current step — kept out of the windowed list so they aren't duplicated.
  const pinnedSteps = steps.filter((s) => s.is_pinned);
  const visibleSteps = steps.slice(start, end).filter((s) => !s.is_pinned);
  // The current step is always full-width, which pushes whichever steps
  // land right before/after it onto their own row. If only 1 (or, at the
  // 3-column breakpoint, 2) steps land in that row, they'd sit alone next
  // to empty grid cells — so those lone neighbors go full-width too instead
  // of leaving a gap.
  const currentPosInWindow = visibleSteps.findIndex((s) => steps.indexOf(s) === current);
  const beforeGroupSize = currentPosInWindow;
  const afterGroupSize = visibleSteps.length - currentPosInWindow - 1;
  function orphanSpanClass(groupSize: number): string {
    if (groupSize === 1) return "col-span-full";
    if (groupSize === 2) return "lg:col-span-full";
    return "";
  }

  // The overall cook-session timer lives in a global provider (so it can
  // show as a warning badge in the top bar even after leaving this page).
  // Entering Cook Mode claims/starts it for this recipe, counting down from
  // the recipe's total time when one is set.
  const { timer: mainTimer, startFor, pause: pauseMain, resume: resumeMain, reset: resetMain } = useCookTimer();
  const totalSeconds = totalMinutes ? (() => {
    const minutes = parseMinutesText(totalMinutes);
    return minutes != null ? Math.round(minutes * 60) : null;
  })() : null;
  useEffect(() => {
    startFor(recipeId, title, totalSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId, totalSeconds]);
  const mainRemaining = remainingSeconds(mainTimer);
  const mainDone = mainTimer.totalSeconds != null && mainRemaining === 0;

  // A separate, page-local countdown for whichever step is current, if that
  // step has an optional timer set. Restarts fresh every time the current
  // step changes (however you got there — Next, Previous, or a card click).
  const [subTimer, setSubTimer] = useState<SubTimer | null>(null);
  useEffect(() => {
    const step = steps[current];
    const minutes = step?.timer_minutes ? parseMinutesText(step.timer_minutes) : null;
    if (!step || minutes == null) {
      setSubTimer(null);
      return;
    }
    const total = Math.round(minutes * 60);
    setSubTimer({ stepId: step.id, total, remaining: total, running: true });
  }, [current, steps]);

  useEffect(() => {
    if (!subTimer?.running) return;
    const interval = setInterval(() => {
      setSubTimer((t) => (t && t.running && t.remaining > 0 ? { ...t, remaining: t.remaining - 1 } : t));
    }, 1000);
    return () => clearInterval(interval);
  }, [subTimer?.running, subTimer?.stepId]);

  const router = useRouter();
  const goNext = useCallback(
    () => setCurrent((c) => Math.min(steps.length - 1, c + 1)),
    [steps.length]
  );
  const goPrevious = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);

  // Keyboard shortcuts: ←/→ (or p/n) to move between steps, space to
  // pause/resume the overall timer, Escape to exit Cook Mode. Ignored while
  // typing in a field (e.g. the servings input) so normal typing still works.
  useEffect(() => {
    function isTextField(el: Element | null) {
      const tag = (el?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    }
    function onKeyDown(e: KeyboardEvent) {
      if (isTextField(document.activeElement)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowRight" || e.key.toLowerCase() === "n") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        goPrevious();
      } else if (e.key === " ") {
        e.preventDefault();
        if (mainTimer.running) pauseMain();
        else resumeMain();
      } else if (e.key === "Escape") {
        e.preventDefault();
        router.push(`/recipes/${recipeId}`);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrevious, mainTimer.running, pauseMain, resumeMain, router, recipeId]);

  // Contextual ingredient highlighting: which ingredients does the current
  // step's text mention (matching on any single significant word, not the
  // whole name), so they can be called out both in the step itself and
  // (bigger) in the sidebar list. Categories get the same treatment, but
  // only when none of their own ingredients already matched — an individual
  // ingredient match is more specific/accurate and takes priority.
  const currentStep = steps[current];
  const mentionedIngredients = useMemo(
    () => (currentStep ? findMentionedIngredients(currentStep.body, ingredients) : []),
    [currentStep, ingredients]
  );
  const highlightedIds = useMemo(
    () => new Set(mentionedIngredients.map((i) => i.id)),
    [mentionedIngredients]
  );
  const highlightedCategories = useMemo(
    () =>
      currentStep
        ? new Set(findMentionedCategories(currentStep.body, ingredients, highlightedIds))
        : new Set<string>(),
    [currentStep, ingredients, highlightedIds]
  );
  const highlightTerms = useMemo(
    () => (currentStep ? mentionedWords(currentStep.body, ingredients) : []),
    [currentStep, ingredients]
  );

  return (
    <div className="relative flex w-full" style={buildIsolatedThemeStyle(ownerTheme)}>
      {ownerTheme?.theme_watermark_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ownerTheme.theme_watermark_url}
          alt=""
          className="pointer-events-none fixed bottom-6 left-6 z-40 h-9 w-9 rounded-full object-cover opacity-80 shadow-[var(--shadow)]"
        />
      )}
      <aside
        ref={asideRef}
        style={{ width: sidebarWidth }}
        className="sticky top-[57px] flex h-[calc(100vh-57px)] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-elevated)] text-base [container-type:inline-size]"
      >
        <div
          style={equipment.length > 0 ? { height: ingredientsHeight } : undefined}
          className={`flex min-h-0 flex-col overflow-y-auto p-6 ${equipment.length > 0 ? "shrink-0" : "flex-1"}`}
        >
          <div ref={ingredientsContentRef} className="flex min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h2 className="font-serif text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Ingredients
            </h2>
            <button
              type="button"
              onClick={() => setShowServings((v) => !v)}
              className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              {showServings ? "Hide servings ▴" : "Show servings ▾"}
            </button>
          </div>
          <ServingScaler
            baseServings={baseServings}
            servingUnit={servingUnit}
            ingredients={ingredients}
            showServings={showServings}
            highlightedIds={highlightedIds}
            highlightedCategories={highlightedCategories}
          />
          </div>
        </div>

        {equipment.length > 0 && (
          <>
            <div
              onPointerDown={startDragHeight}
              onPointerMove={onDragHeight}
              onPointerUp={stopDragHeight}
              onPointerCancel={stopDragHeight}
              className="h-2.5 shrink-0 touch-none cursor-row-resize border-t border-[var(--border)] bg-[var(--border)] hover:bg-[var(--accent)]"
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
            <div ref={equipmentContentRef} className="flex min-h-0 flex-col">
            <h2 className="mb-3 shrink-0 font-serif text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Equipment
            </h2>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] items-start gap-x-4 gap-y-1.5 text-base">
              {equipment.map((eq) => (
                <li
                  key={eq}
                  className="min-w-0 break-words before:mr-1 before:text-[var(--text-muted)] before:content-['·']"
                >
                  {eq}
                </li>
              ))}
            </ul>
            </div>
            </div>
          </>
        )}
      </aside>

      <div
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        className="sticky top-[57px] h-[calc(100vh-57px)] w-2.5 shrink-0 touch-none cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)]"
      />

      <section className="flex h-[calc(100vh-57px)] flex-1 flex-col overflow-hidden p-8 pb-24">
        <div className="flex w-full flex-1 flex-col gap-8 overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href={`/recipes/${recipeId}`}
                title="Esc"
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                &larr; Exit cook mode
              </Link>
              <h1 className="font-serif text-xl font-semibold">{title}</h1>
              <span className="text-sm text-[var(--text-muted)]">
                Step {current + 1} of {steps.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`flex items-center gap-3 rounded-[var(--radius)] border-2 px-4 py-2 shadow-[var(--shadow)] ${
                  mainDone
                    ? "border-[var(--danger)] bg-[var(--danger)]/10"
                    : "border-[var(--accent)] bg-[var(--accent-soft)]"
                }`}
              >
                <span
                  className={`text-3xl font-bold leading-none tabular-nums ${
                    mainDone ? "text-[var(--danger)]" : "text-[var(--accent)]"
                  }`}
                >
                  {mainDone ? "Time's up!" : formatDuration(mainRemaining)}
                </span>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={mainTimer.running ? pauseMain : resumeMain}
                    title="Space"
                    className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-0.5 text-xs font-medium hover:bg-[var(--bg-muted)]"
                  >
                    {mainTimer.running ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={resetMain}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-0.5 text-xs font-medium hover:bg-[var(--bg-muted)]"
                  >
                    Reset
                  </button>
                </div>
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
                  <option value={9999}>All steps</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {pinnedSteps.length > 0 && (
              <div className="flex flex-col gap-3">
                {pinnedSteps.map((step) => {
                  const idx = steps.indexOf(step);
                  return (
                    <div
                      key={step.id}
                      onClick={() => setCurrent(idx)}
                      className="cursor-pointer rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent-soft)] p-3 shadow-[var(--shadow)]"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0 text-sm" aria-label="Always shown">
                          📌
                        </span>
                        <p className="text-sm leading-relaxed">{step.body}</p>
                      </div>
                      <StepPhotos
                        urls={step.photo_urls}
                        singleMaxHeightClass="max-h-28"
                        multiMaxHeightClass="max-h-20"
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSteps.map((step, posInWindow) => {
                const idx = steps.indexOf(step);
                const isCurrent = idx === current;
                const spanClass = isCurrent
                  ? "col-span-full"
                  : posInWindow < currentPosInWindow
                    ? orphanSpanClass(beforeGroupSize)
                    : orphanSpanClass(afterGroupSize);
                return (
                  <div
                    key={step.id}
                    onClick={() => setCurrent(idx)}
                    className={`cursor-pointer rounded-[var(--radius)] border transition-all ${spanClass} ${
                      isCurrent
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] p-5 shadow-[var(--shadow)]"
                        : "border-[var(--border)] bg-[var(--bg-elevated)] p-3 opacity-60"
                    }`}
                  >
                    <div className={`flex items-start ${isCurrent ? "gap-4" : "gap-2.5"}`}>
                      <span
                        className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${
                          isCurrent
                            ? "h-8 w-8 bg-[var(--accent)] text-base text-white"
                            : "h-6 w-6 bg-[var(--bg-muted)] text-xs text-[var(--text-muted)]"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <p className={isCurrent ? "text-lg leading-relaxed" : "text-sm leading-relaxed"}>
                        {isCurrent
                          ? splitByTerms(step.body, highlightTerms).map((seg, si) =>
                              seg.matched ? (
                                <mark
                                  key={si}
                                  className="rounded bg-[var(--accent-soft)] px-0.5 text-[var(--accent)]"
                                >
                                  {seg.text}
                                </mark>
                              ) : (
                                <span key={si}>{seg.text}</span>
                              )
                            )
                          : step.body}
                      </p>
                    </div>
                    <StepPhotos
                      urls={step.photo_urls}
                      singleMaxHeightClass={isCurrent ? "max-h-[38vh]" : "max-h-28"}
                      multiMaxHeightClass={isCurrent ? "max-h-[20vh]" : "max-h-20"}
                    />
                    {isCurrent && subTimer && (
                      <div
                        className={`mt-3 flex items-center gap-3 rounded-[var(--radius)] border-2 px-4 py-2 ${
                          subTimer.remaining === 0
                            ? "border-[var(--danger)] bg-[var(--danger)]/10"
                            : "border-[var(--accent)] bg-[var(--bg-elevated)]"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Step timer
                        </span>
                        <span
                          className={`text-2xl font-bold leading-none tabular-nums ${
                            subTimer.remaining === 0 ? "text-[var(--danger)]" : "text-[var(--accent)]"
                          }`}
                        >
                          {subTimer.remaining === 0 ? "Timer done" : formatDuration(subTimer.remaining)}
                        </span>
                        <div className="ml-auto flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSubTimer((t) => (t ? { ...t, running: !t.running } : t))}
                            className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--bg-muted)]"
                          >
                            {subTimer.running ? "Pause" : "Resume"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSubTimer((t) => (t ? { ...t, remaining: t.total, running: true } : t))
                            }
                            className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--bg-muted)]"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-40 flex gap-2">
        <button
          onClick={goPrevious}
          disabled={current === 0}
          title="← or P"
          className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-2 text-sm font-medium shadow-[var(--shadow)] disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={goNext}
          disabled={current === steps.length - 1}
          title="→ or N"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white shadow-[var(--shadow)] hover:bg-[var(--accent-hover)] disabled:opacity-40"
        >
          Next step
        </button>
      </div>
    </div>
  );
}
