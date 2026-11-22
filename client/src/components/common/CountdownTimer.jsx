import useCountdown from "../../hooks/useCountdown";

const pad = (n) => String(n).padStart(2, "0");

// Shows the time left until endsAt. compact renders a single inline line.
export default function CountdownTimer({ endsAt, compact = false }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(endsAt);

  if (expired) return <span className="text-xs font-semibold text-gray-500">Deal ended</span>;

  if (compact) {
    return (
      <span className="font-mono text-xs font-semibold">
        {days > 0 && `${days}d `}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  const boxes = [
    ...(days > 0 ? [["Days", days]] : []),
    ["Hours", hours],
    ["Mins", minutes],
    ["Secs", seconds],
  ];

  return (
    <div className="flex gap-2">
      {boxes.map(([label, value]) => (
        <div key={label} className="min-w-14 rounded-xl bg-choco px-2 py-2 text-center text-white">
          <div className="font-mono text-xl font-bold leading-none">{pad(value)}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/70">{label}</div>
        </div>
      ))}
    </div>
  );
}
