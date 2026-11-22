import { FiMoon, FiSun } from "react-icons/fi";
import useTheme from "../../hooks/useTheme";

// Sun and moon switch. The icon rotates when the theme changes.
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition hover:border-brand hover:text-brand ${className}`}
      style={{ borderColor: "var(--line-strong)", color: "var(--heading)" }}
    >
      <FiSun className={`absolute transition-all duration-500 ${isLight ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"}`} size={18} />
      <FiMoon className={`absolute transition-all duration-500 ${isLight ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} size={18} />
    </button>
  );
}
