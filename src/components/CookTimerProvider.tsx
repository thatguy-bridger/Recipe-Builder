"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "cookTimer";
// A brief interruption (accidental tab close, phone lock, refresh) resumes
// the running timer; anything longer is treated as a fresh cooking session.
const RESUME_WINDOW_MS = 5 * 60 * 1000;

type StoredTimer = {
  recipeId: string;
  recipeTitle: string;
  elapsedSeconds: number;
  running: boolean;
  lastActiveAt: number;
};

type CookTimerState = {
  recipeId: string | null;
  recipeTitle: string | null;
  elapsedSeconds: number;
  running: boolean;
};

const initialState: CookTimerState = {
  recipeId: null,
  recipeTitle: null,
  elapsedSeconds: 0,
  running: false,
};

const CookTimerContext = createContext<{
  timer: CookTimerState;
  startFor: (recipeId: string, recipeTitle: string) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}>({
  timer: initialState,
  startFor: () => {},
  pause: () => {},
  resume: () => {},
  reset: () => {},
});

function readStored(): StoredTimer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredTimer) : null;
  } catch {
    return null;
  }
}

function writeStored(state: StoredTimer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — the timer still works for this tab session.
  }
}

export function CookTimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<CookTimerState>(initialState);

  // On first load (e.g. a page refresh), restore an in-progress timer from
  // localStorage if it's still within the resume window.
  useEffect(() => {
    const stored = readStored();
    if (!stored) return;
    if (Date.now() - stored.lastActiveAt <= RESUME_WINDOW_MS) {
      setTimer({
        recipeId: stored.recipeId,
        recipeTitle: stored.recipeTitle,
        elapsedSeconds: stored.elapsedSeconds,
        running: stored.running,
      });
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  // Tick once a second while running, persisting as it goes so the next
  // resume/reset check has an accurate "last active" timestamp.
  useEffect(() => {
    if (!timer.running || !timer.recipeId) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        const nextSeconds = t.elapsedSeconds + 1;
        if (t.recipeId) {
          writeStored({
            recipeId: t.recipeId,
            recipeTitle: t.recipeTitle ?? "",
            elapsedSeconds: nextSeconds,
            running: true,
            lastActiveAt: Date.now(),
          });
        }
        return { ...t, elapsedSeconds: nextSeconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.running, timer.recipeId]);

  const startFor = useCallback((recipeId: string, recipeTitle: string) => {
    const stored = readStored();
    const withinWindow = stored ? Date.now() - stored.lastActiveAt <= RESUME_WINDOW_MS : false;

    if (stored && stored.recipeId === recipeId && withinWindow) {
      setTimer({
        recipeId: stored.recipeId,
        recipeTitle: stored.recipeTitle,
        elapsedSeconds: stored.elapsedSeconds,
        running: true,
      });
      writeStored({ ...stored, running: true, lastActiveAt: Date.now() });
    } else {
      setTimer({ recipeId, recipeTitle, elapsedSeconds: 0, running: true });
      writeStored({ recipeId, recipeTitle, elapsedSeconds: 0, running: true, lastActiveAt: Date.now() });
    }
  }, []);

  const pause = useCallback(() => {
    setTimer((t) => {
      if (!t.recipeId) return t;
      writeStored({
        recipeId: t.recipeId,
        recipeTitle: t.recipeTitle ?? "",
        elapsedSeconds: t.elapsedSeconds,
        running: false,
        lastActiveAt: Date.now(),
      });
      return { ...t, running: false };
    });
  }, []);

  const resume = useCallback(() => {
    setTimer((t) => {
      if (!t.recipeId) return t;
      writeStored({
        recipeId: t.recipeId,
        recipeTitle: t.recipeTitle ?? "",
        elapsedSeconds: t.elapsedSeconds,
        running: true,
        lastActiveAt: Date.now(),
      });
      return { ...t, running: true };
    });
  }, []);

  const reset = useCallback(() => {
    setTimer((t) => {
      if (!t.recipeId) return t;
      writeStored({
        recipeId: t.recipeId,
        recipeTitle: t.recipeTitle ?? "",
        elapsedSeconds: 0,
        running: true,
        lastActiveAt: Date.now(),
      });
      return { ...t, elapsedSeconds: 0, running: true };
    });
  }, []);

  return (
    <CookTimerContext.Provider value={{ timer, startFor, pause, resume, reset }}>
      {children}
    </CookTimerContext.Provider>
  );
}

export function useCookTimer() {
  return useContext(CookTimerContext);
}
