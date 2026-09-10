"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "auto";

export const SCALE_MIN = 80;
export const SCALE_MAX = 140;
export const SCALE_STEP = 10;

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  scale: number;
  setScale: (s: number) => void;
}>({ theme: "auto", setTheme: () => {}, scale: 100, setScale: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("auto");
  const [scale, setScaleState] = useState(100);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    if (storedTheme) setThemeState(storedTheme);
    const storedScale = localStorage.getItem("contentScale");
    if (storedScale) setScaleState(Number(storedScale));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${scale}%`;
    localStorage.setItem("contentScale", String(scale));
  }, [scale]);

  const setScale = (s: number) =>
    setScaleState(Math.min(SCALE_MAX, Math.max(SCALE_MIN, s)));

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, scale, setScale }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
