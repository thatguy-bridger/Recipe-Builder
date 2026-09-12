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
  mentionedWordMap,
  splitByTerms,
} from "@/lib/ingredientMatch";
import { formatIngredientQuantity } from "@/lib/ingredients";
import { manualAdditionKey, matchFeedbackKey } from "@/lib/matchFeedback";
import { submitIngredientMatchFeedback } from "@/app/actions/matchFeedback";

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
  initialSuppressed = [],
  initialGlobalBlocklist = [],
  initialCorrections = [],
  initialManualAdditions = [],
  initialPreferredNameByWord = [],
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
  initialSuppressed?: string[];
  initialGlobalBlocklist?: string[];
  initialCorrections?: [string, string][];
  initialManualAdditions?: [string, string][];
  initialPreferredNameByWord?: [string, string][];
}) {
  const splitStorageKey = `cookmode-split-${recipeId}`;
  const widthStorageKey = `cookmode-width-${recipeId}`;

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [ingredientsHeight, setIngredientsHeight] = useState(360);
  const [current, setCurrent] = useState(0);
  const [extraSteps, setExtraSteps] = useState(9999); // additional steps beyond the guaranteed neighbors; defaults to showing all
  const [showServings, setShowServings] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showInlineAmounts, setShowInlineAmounts] = useState(true);
  // Feedback-driven suppression: exact (step, ingredient, word) instances a
  // cook has thumbed down, plus words thumbed down often enough across
  // different recipes to auto-blocklist everywhere. Both start from what's
  // already in the database and grow as votes come in this session.
  const [suppressed, setSuppressed] = useState(() => new Set(initialSuppressed));
  const [globalBlocklist] = useState(() => new Set(initialGlobalBlocklist));
  const [voted, setVoted] = useState<Map<string, "up" | "down">>(new Map());
  // Corrections a cook has suggested: exact (step, ingredient, word) ->
  // ingredient id it should have matched instead. Plus, once enough recipes
  // agree the same word should point at an ingredient with a given name,
  // that preference applies automatically to any recipe with a
  // similarly-named ingredient — no per-recipe correction needed.
  const [corrections, setCorrections] = useState(() => new Map(initialCorrections));
  // Brand-new connections a cook has drawn themselves, for words the
  // algorithm never matched at all — keyed by step+word (no original
  // ingredient to tie it to). Merged on top of the algorithmic matches.
  const [manualAdditions, setManualAdditions] = useState(() => new Map(initialManualAdditions));
  // The servings-and-unit-scaled ingredient list, reported up by
  // ServingScaler — used for matching/highlighting so inline step
  // quantities track the current serving size, not just the sidebar list.
  const [scaledIngredients, setScaledIngredients] = useState<Ingredient[]>(ingredients);
  const [preferredNameByWord] = useState(() => new Map(initialPreferredNameByWord));
  // Which word currently has its picker open (only one at a time). `mode`
  // "correct" fixes an existing (already-downvoted) match; "new" suggests a
  // connection for a word the algorithm never highlighted.
  const [pendingCorrection, setPendingCorrection] = useState<{
    mode: "correct" | "new";
    stepId: string;
    ingredientId: string | null;
    word: string;
  } | null>(null);
  const [pickerValue, setPickerValue] = useState("");
  const openPicker = useCallback((next: NonNullable<typeof pendingCorrection>) => {
    setPendingCorrection(next);
    setPickerValue("");
  }, []);
  // The thumbs popover and the "+" suggestion button both only appear on
  // hover, which doesn't exist on a touchscreen — so a tap on the word
  // itself toggles the same visibility a mouse hover would give it.
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const dragging = useRef(false);
  const asideRef = useRef<HTMLElement>(null);
  const ingredientsScrollRef = useRef<HTMLDivElement>(null);
  const ingredientsContentRef = useRef<HTMLDivElement>(null);
  const equipmentContentRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLDivElement>(null);
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
  // the recipe's total time when one is set. When the recipe has no total
  // time, don't start a stopwatch on its own — leave a blank field so the
  // cook can type in a number of minutes to count down from instead.
  const {
    timer: mainTimer,
    startFor,
    pause: pauseMain,
    resume: resumeMain,
    reset: resetMain,
    setRemaining,
  } = useCookTimer();
  const totalSeconds = totalMinutes ? (() => {
    const minutes = parseMinutesText(totalMinutes);
    return minutes != null ? Math.round(minutes * 60) : null;
  })() : null;
  const [manualMinutes, setManualMinutes] = useState("");
  useEffect(() => {
    if (totalSeconds == null) return;
    startFor(recipeId, title, totalSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId, totalSeconds]);
  const timerActiveForThisRecipe = mainTimer.recipeId === recipeId;
  const needsManualTimer = totalSeconds == null && !timerActiveForThisRecipe;
  const startManualTimer = () => {
    const minutes = Number(manualMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    startFor(recipeId, title, Math.round(minutes * 60));
  };
  const mainRemaining = remainingSeconds(mainTimer);
  const mainDone = mainTimer.totalSeconds != null && mainRemaining === 0;

  // Clicking the running timer opens a plain "minutes left" edit — for
  // when a cook wants to correct it (misjudged, got interrupted, etc.)
  // without resetting the whole thing.
  const [editingTimer, setEditingTimer] = useState(false);
  const [timerEditValue, setTimerEditValue] = useState("");
  const openTimerEdit = () => {
    setTimerEditValue(String(Math.ceil(mainRemaining / 60)));
    setEditingTimer(true);
  };
  const commitTimerEdit = () => {
    const minutes = Number(timerEditValue);
    if (Number.isFinite(minutes) && minutes > 0) {
      setRemaining(Math.round(minutes * 60));
    }
    setEditingTimer(false);
  };

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
    () => (currentStep ? findMentionedIngredients(currentStep.body, scaledIngredients) : []),
    [currentStep, scaledIngredients]
  );
  const highlightedIds = useMemo(
    () => new Set(mentionedIngredients.map((i) => i.id)),
    [mentionedIngredients]
  );
  const highlightedCategories = useMemo(
    () =>
      currentStep
        ? new Set(findMentionedCategories(currentStep.body, scaledIngredients, highlightedIds))
        : new Set<string>(),
    [currentStep, scaledIngredients, highlightedIds]
  );

  // When the current step mentions an ingredient that isn't already visible
  // in the (possibly scrolled) ingredients list, bring it into view — a
  // cook shouldn't have to go hunting for it every time the step changes.
  useEffect(() => {
    const firstId = mentionedIngredients[0]?.id;
    if (!firstId || !ingredientsScrollRef.current) return;
    const el = ingredientsScrollRef.current.querySelector(`[data-ingredient-id="${firstId}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [mentionedIngredients]);

  // Keep the current step vertically centered as the cook moves through the
  // recipe, instead of it landing wherever it happens to fall in the grid.
  useEffect(() => {
    currentStepRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current]);
  // Which ingredient each highlighted word came from, so its quantity can
  // be shown right above the word in the step text — no need to glance
  // back at the sidebar list mid-step.
  const rawWordToIngredient = useMemo(
    () => (currentStep ? mentionedWordMap(currentStep.body, scaledIngredients) : new Map()),
    [currentStep, scaledIngredients]
  );
  // Apply feedback on top of the raw match: an exact correction wins first,
  // then a globally-learned preference (same word corrected/suggested to an
  // ingredient with this name on enough other recipes), and only then does
  // a plain thumbs-down/blocklisted word get dropped entirely. Finally,
  // brand-new connections a cook has drawn themselves are merged in — these
  // can add highlights for words the algorithm never matched at all.
  const highlightWordToIngredient = useMemo(() => {
    if (!currentStep) return rawWordToIngredient;
    const resolved = new Map(rawWordToIngredient);
    for (const [word, ing] of rawWordToIngredient) {
      const key = matchFeedbackKey(currentStep.id, ing.id, word);
      const correctedId = corrections.get(key);
      if (correctedId) {
        const correctedIngredient = scaledIngredients.find((i) => i.id === correctedId);
        if (correctedIngredient) {
          resolved.set(word, correctedIngredient);
          continue;
        }
      }
      if (suppressed.has(key) || globalBlocklist.has(word)) {
        // Keep it visible (as the original, wrong pairing) while its "what
        // should this be?" picker is still open — otherwise the mark it's
        // anchored to would vanish the instant the downvote lands.
        const isBeingCorrected =
          pendingCorrection?.mode === "correct" &&
          pendingCorrection.stepId === currentStep.id &&
          pendingCorrection.word === word;
        if (isBeingCorrected) continue;

        const preferredName = preferredNameByWord.get(word);
        const preferredIngredient = preferredName
          ? scaledIngredients.find((i) => i.name.trim().toLowerCase() === preferredName)
          : undefined;
        if (preferredIngredient) {
          resolved.set(word, preferredIngredient);
        } else {
          resolved.delete(word);
        }
      }
    }
    for (const [key, ingredientId] of manualAdditions) {
      const [stepId, word] = key.split("::");
      if (stepId !== currentStep.id) continue;
      const ingredient = scaledIngredients.find((i) => i.id === ingredientId);
      if (ingredient) resolved.set(word, ingredient);
    }
    return resolved;
  }, [
    rawWordToIngredient,
    currentStep,
    suppressed,
    globalBlocklist,
    corrections,
    manualAdditions,
    preferredNameByWord,
    scaledIngredients,
    pendingCorrection,
  ]);
  const highlightTerms = useMemo(
    () => Array.from(highlightWordToIngredient.keys()),
    [highlightWordToIngredient]
  );

  const handleVote = useCallback(
    (stepId: string, ingredientId: string, word: string, vote: "up" | "down") => {
      const key = matchFeedbackKey(stepId, ingredientId, word);
      setVoted((v) => new Map(v).set(key, vote));
      if (vote === "down") {
        setSuppressed((s) => new Set(s).add(key));
        openPicker({ mode: "correct", stepId, ingredientId, word });
      } else {
        setPendingCorrection(null);
      }
      submitIngredientMatchFeedback({
        recipeId,
        stepId,
        ingredientId,
        word,
        vote,
      }).catch(() => {
        // Best-effort: the local suppression already took effect for this
        // session even if the write fails; it'll just re-appear next visit.
      });
    },
    [recipeId, openPicker]
  );

  // A cook picked which ingredient a downvoted word should have matched
  // instead (or said "not an ingredient", which just leaves it suppressed).
  const handleCorrect = useCallback(
    (stepId: string, ingredientId: string, word: string, correctedIngredientId: string | null) => {
      const key = matchFeedbackKey(stepId, ingredientId, word);
      setPendingCorrection(null);
      if (correctedIngredientId) {
        setCorrections((c) => new Map(c).set(key, correctedIngredientId));
      }
      submitIngredientMatchFeedback({
        recipeId,
        stepId,
        ingredientId,
        word,
        vote: "down",
        correctedIngredientId,
      }).catch(() => {
        // Best-effort — same as handleVote above.
      });
    },
    [recipeId]
  );

  // A cook drew a brand-new connection for a word the algorithm never
  // matched at all — stored as a plain thumbs-up on that (step, ingredient,
  // word) triple, since as far as feedback is concerned it's just a match
  // that's confirmed good from the moment it's created.
  const handleSuggestNew = useCallback(
    (stepId: string, word: string, ingredientId: string) => {
      setPendingCorrection(null);
      setActiveControl(null);
      setManualAdditions((m) => new Map(m).set(manualAdditionKey(stepId, word), ingredientId));
      submitIngredientMatchFeedback({
        recipeId,
        stepId,
        ingredientId,
        word,
        vote: "up",
      }).catch(() => {
        // Best-effort — same as handleVote above.
      });
    },
    [recipeId]
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
          ref={ingredientsScrollRef}
          style={equipment.length > 0 ? { height: ingredientsHeight } : undefined}
          className={`flex min-h-0 flex-col overflow-y-auto p-6 ${equipment.length > 0 ? "shrink-0" : "flex-1"}`}
        >
          <div ref={ingredientsContentRef} className="flex min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h2 className="font-serif text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Ingredients
            </h2>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Recipe settings {settingsOpen ? "▴" : "▾"}
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 flex w-56 flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs shadow-[var(--shadow)]">
                  <label className="flex items-center justify-between gap-2">
                    <span>Show servings</span>
                    <input
                      type="checkbox"
                      checked={showServings}
                      onChange={(e) => setShowServings(e.target.checked)}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>Show amounts in steps</span>
                    <input
                      type="checkbox"
                      checked={showInlineAmounts}
                      onChange={(e) => setShowInlineAmounts(e.target.checked)}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          <ServingScaler
            baseServings={baseServings}
            servingUnit={servingUnit}
            ingredients={ingredients}
            showServings={showServings}
            highlightedIds={highlightedIds}
            highlightedCategories={highlightedCategories}
            onScaledIngredientsChange={setScaledIngredients}
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
              className="group flex h-5 shrink-0 touch-none cursor-row-resize items-center border-t border-[var(--border)]"
            >
              <div className="h-1.5 w-full bg-[var(--border)] group-hover:bg-[var(--accent)]" />
            </div>
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
        className="group sticky top-[57px] flex h-[calc(100vh-57px)] w-5 shrink-0 touch-none cursor-col-resize justify-center"
      >
        <div className="h-full w-1.5 bg-[var(--border)] group-hover:bg-[var(--accent)]" />
      </div>

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
              {needsManualTimer ? (
                <div className="flex items-center gap-2 rounded-[var(--radius)] border-2 border-[var(--border)] px-4 py-2 shadow-[var(--shadow)]">
                  <label className="text-sm text-[var(--text-muted)]" htmlFor="manual-timer-minutes">
                    Timer (min)
                  </label>
                  <input
                    id="manual-timer-minutes"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="—"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && startManualTimer()}
                    className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-sm tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={startManualTimer}
                    disabled={!manualMinutes}
                    className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Start
                  </button>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-3 rounded-[var(--radius)] border-2 px-4 py-2 shadow-[var(--shadow)] ${
                    mainDone
                      ? "border-[var(--danger)] bg-[var(--danger)]/10"
                      : "border-[var(--accent)] bg-[var(--accent-soft)]"
                  }`}
                >
                  {editingTimer ? (
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      autoFocus
                      value={timerEditValue}
                      onChange={(e) => setTimerEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitTimerEdit();
                        if (e.key === "Escape") setEditingTimer(false);
                      }}
                      onBlur={commitTimerEdit}
                      className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-2xl font-bold tabular-nums text-[var(--accent)]"
                    />
                  ) : (
                    <button
                      type="button"
                      title="Click to change the time left"
                      onClick={openTimerEdit}
                      className={`text-3xl font-bold leading-none tabular-nums hover:underline ${
                        mainDone ? "text-[var(--danger)]" : "text-[var(--accent)]"
                      }`}
                    >
                      {mainDone ? "Time's up!" : formatDuration(mainRemaining)}
                    </button>
                  )}
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
              )}

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

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-[30vh]">
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
                    ref={isCurrent ? currentStepRef : undefined}
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
                          ? (() => {
                              const segments = splitByTerms(step.body, highlightTerms);
                              // If a term is mentioned more than once in this step, its
                              // total amount would be split across those mentions — showing
                              // the full quantity at each occurrence would overstate it, so
                              // skip the quantity box for repeated terms entirely.
                              const termCounts = new Map<string, number>();
                              for (const seg of segments) {
                                if (!seg.matched) continue;
                                const key = seg.text.toLowerCase();
                                termCounts.set(key, (termCounts.get(key) ?? 0) + 1);
                              }
                              // A word repeated in the same step shares one correction
                              // (the fix is per word, not per occurrence) — but only its
                              // first occurrence should show the open picker, or every
                              // repeat would pop one up at once.
                              const seenForPicker = new Set<string>();
                              const seenForNewPicker = new Set<string>();
                              return segments.map((seg, si) => {
                                if (!seg.matched) {
                                  // Split out just the word-shaped runs (letters, plus
                                  // internal apostrophes/hyphens) so each real word can offer
                                  // its own "suggest a connection" affordance — surrounding
                                  // punctuation and spacing pass through untouched.
                                  const tokens = seg.text.split(/([A-Za-z][A-Za-z'-]*)/);
                                  return (
                                    <span key={si}>
                                      {tokens.map((tok, ti) => {
                                        if (!/^[A-Za-z][A-Za-z'-]{2,}$/.test(tok)) {
                                          return <span key={ti}>{tok}</span>;
                                        }
                                        const lower = tok.toLowerCase();
                                        const isFirstOccurrence = !seenForNewPicker.has(lower);
                                        seenForNewPicker.add(lower);
                                        const isPendingNew =
                                          isFirstOccurrence &&
                                          pendingCorrection?.mode === "new" &&
                                          pendingCorrection.stepId === step.id &&
                                          pendingCorrection.word === lower;
                                        const controlKey = `new:${step.id}:${lower}`;
                                        const isTapActive = activeControl === controlKey;
                                        return (
                                          <span
                                            key={ti}
                                            className="group/newword relative"
                                            onClick={(e) => {
                                              if (isPendingNew) return;
                                              e.stopPropagation();
                                              setActiveControl((c) => (c === controlKey ? null : controlKey));
                                            }}
                                          >
                                            {tok}
                                            {isPendingNew ? (
                                              <span
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute -top-9 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-1 text-xs shadow-[var(--shadow)]"
                                              >
                                                <select
                                                  autoFocus
                                                  value={pickerValue}
                                                  onChange={(e) => setPickerValue(e.target.value)}
                                                  className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-1 py-0.5 text-xs"
                                                >
                                                  <option value="">Link to…</option>
                                                  {ingredients.map((ing) => (
                                                    <option key={ing.id} value={ing.id}>
                                                      {ing.name}
                                                    </option>
                                                  ))}
                                                </select>
                                                <button
                                                  type="button"
                                                  disabled={!pickerValue}
                                                  onClick={() =>
                                                    pickerValue &&
                                                    handleSuggestNew(step.id, lower, pickerValue)
                                                  }
                                                  className="rounded-full bg-[var(--accent)] px-2 py-0.5 leading-none text-white disabled:opacity-40"
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setPendingCorrection(null);
                                                    setActiveControl(null);
                                                  }}
                                                  className="rounded-full px-1.5 py-0.5 leading-none hover:bg-[var(--bg-muted)]"
                                                >
                                                  ✕
                                                </button>
                                              </span>
                                            ) : (
                                              <button
                                                type="button"
                                                title="Suggest this should link to an ingredient"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActiveControl(null);
                                                  openPicker({
                                                    mode: "new",
                                                    stepId: step.id,
                                                    ingredientId: null,
                                                    word: lower,
                                                  });
                                                }}
                                                className={`absolute -top-4 left-1/2 h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[10px] leading-none text-[var(--text-muted)] shadow-[var(--shadow)] hover:text-[var(--accent)] group-hover/newword:flex ${
                                                  isTapActive ? "flex" : "hidden"
                                                }`}
                                              >
                                                +
                                              </button>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </span>
                                  );
                                }

                                const key = seg.text.toLowerCase();
                                const matchedIngredient = highlightWordToIngredient.get(key);
                                const quantity =
                                  showInlineAmounts && matchedIngredient && termCounts.get(key) === 1
                                    ? formatIngredientQuantity(matchedIngredient)
                                    : "";
                                const feedbackKey = matchedIngredient
                                  ? matchFeedbackKey(step.id, matchedIngredient.id, key)
                                  : null;
                                const vote = feedbackKey ? voted.get(feedbackKey) : undefined;
                                const isFirstOccurrence = !seenForPicker.has(key);
                                seenForPicker.add(key);
                                const isBeingCorrected =
                                  matchedIngredient &&
                                  isFirstOccurrence &&
                                  pendingCorrection?.mode === "correct" &&
                                  pendingCorrection.stepId === step.id &&
                                  pendingCorrection.word === key;
                                const markControlKey = matchedIngredient
                                  ? `mark:${step.id}:${key}`
                                  : null;
                                const isMarkTapActive = markControlKey !== null && activeControl === markControlKey;
                                return (
                                  <mark
                                    key={si}
                                    onClick={(e) => {
                                      if (isBeingCorrected || !markControlKey) return;
                                      e.stopPropagation();
                                      setActiveControl((c) => (c === markControlKey ? null : markControlKey));
                                    }}
                                    className="group/word relative inline-flex items-center gap-1 rounded border border-white/80 bg-[var(--accent-soft)] px-0.5 align-bottom text-[var(--accent)]"
                                  >
                                    {quantity && (
                                      <span className="whitespace-nowrap rounded bg-[var(--bg-muted)] px-1 py-0.5 text-[10px] font-semibold leading-none text-[var(--accent)]">
                                        {quantity}
                                      </span>
                                    )}
                                    <span>{seg.text}</span>
                                    {isBeingCorrected && matchedIngredient ? (
                                      <span
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute -top-9 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-1 text-xs normal-case text-[var(--text)] shadow-[var(--shadow)]"
                                      >
                                        <select
                                          autoFocus
                                          value={pickerValue}
                                          onChange={(e) => setPickerValue(e.target.value)}
                                          className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-1 py-0.5 text-xs"
                                        >
                                          <option value="">Not an ingredient</option>
                                          {ingredients
                                            .filter((i) => i.id !== matchedIngredient.id)
                                            .map((ing) => (
                                              <option key={ing.id} value={ing.id}>
                                                {ing.name}
                                              </option>
                                            ))}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleCorrect(step.id, matchedIngredient.id, key, pickerValue || null)
                                          }
                                          className="rounded-full bg-[var(--accent)] px-2 py-0.5 leading-none text-white"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setPendingCorrection(null)}
                                          className="rounded-full px-1.5 py-0.5 leading-none hover:bg-[var(--bg-muted)]"
                                        >
                                          ✕
                                        </button>
                                      </span>
                                    ) : (
                                      matchedIngredient && (
                                        <span
                                          className={`absolute -top-8 left-1/2 z-30 -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-1 text-xs shadow-[var(--shadow)] group-hover/word:pointer-events-auto group-hover/word:flex ${
                                            isMarkTapActive ? "flex" : "pointer-events-none hidden"
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            title="This is matching correctly"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveControl(null);
                                              handleVote(step.id, matchedIngredient.id, key, "up");
                                            }}
                                            className={`rounded-full px-1.5 py-0.5 leading-none hover:bg-[var(--bg-muted)] ${
                                              vote === "up" ? "bg-[var(--accent-soft)]" : ""
                                            }`}
                                          >
                                            👍
                                          </button>
                                          <button
                                            type="button"
                                            title="Stop matching this"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveControl(null);
                                              handleVote(step.id, matchedIngredient.id, key, "down");
                                            }}
                                            className={`rounded-full px-1.5 py-0.5 leading-none hover:bg-[var(--bg-muted)] ${
                                              vote === "down" ? "bg-[var(--accent-soft)]" : ""
                                            }`}
                                          >
                                            👎
                                          </button>
                                        </span>
                                      )
                                    )}
                                  </mark>
                                );
                              });
                            })()
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
