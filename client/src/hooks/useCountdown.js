import { useEffect, useState } from "react";

const calculate = (endsAt) => {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (!endsAt || Number.isNaN(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
};

// Counts down to a date and updates every second.
export default function useCountdown(endsAt) {
  const [time, setTime] = useState(() => calculate(endsAt));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(calculate(endsAt));
    const timer = setInterval(() => setTime(calculate(endsAt)), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return time;
}
