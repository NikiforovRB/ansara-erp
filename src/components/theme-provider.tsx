"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeName = "light" | "dark";

type Ctx = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("light");

  useEffect(() => {
    const stored = localStorage.getItem("ansara-theme") as ThemeName | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
      return;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ansara-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "light" ? "dark" : "light")),
    [],
  );

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme outside ThemeProvider");
  return v;
}
