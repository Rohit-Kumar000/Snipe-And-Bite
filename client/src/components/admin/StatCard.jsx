import { motion, useReducedMotion } from "framer-motion";

// Icon tiles use the brand palette and a soft tint of the current theme, so they read well in light and dark.
const TONES = {
  brand: { fg: "#ff7a00", bg: "color-mix(in srgb, #ff7a00 16%, transparent)" },
  leaf: { fg: "#22a06b", bg: "color-mix(in srgb, #22a06b 16%, transparent)" },
  accent: { fg: "#ffa94d", bg: "color-mix(in srgb, #ffa94d 20%, transparent)" },
  choco: { fg: "var(--heading)", bg: "var(--surface-2)" },
};

export default function StatCard({ icon: Icon, label, value, hint, tone = "brand" }) {
  const reduce = useReducedMotion();
  const colors = TONES[tone] || TONES.brand;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -3 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="card relative flex items-center gap-4 overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-60 blur-2xl" style={{ background: colors.bg }} />
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: colors.bg, color: colors.fg }}>
        {Icon && <Icon size={22} />}
      </div>
      <div className="relative min-w-0">
        <p className="text-sm" style={{ color: "var(--muted)" }}>{label}</p>
        <p className="truncate text-2xl font-bold text-choco">{value}</p>
        {hint && <p className="text-xs" style={{ color: "var(--muted)" }}>{hint}</p>}
      </div>
    </motion.div>
  );
}
