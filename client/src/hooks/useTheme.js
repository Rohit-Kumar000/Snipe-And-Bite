import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "sb_theme";
const listeners = new Set();

const readTheme = () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#fff8ef" : "#1f1d2b");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked in private mode. The theme still applies for this visit.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Returns the current theme ("dark" or "light") and helpers to change it. The choice is saved in localStorage.
export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark");
  const setTheme = useCallback((next) => applyTheme(next === "light" ? "light" : "dark"), []);
  const toggleTheme = useCallback(() => applyTheme(readTheme() === "light" ? "dark" : "light"), []);
  return { theme, setTheme, toggleTheme };
}
