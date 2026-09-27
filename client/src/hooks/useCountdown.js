import { useEffect, useState } from 'react';

function diff(target) {
  const ms = new Date(target).getTime() - Date.now();
  return {
    ms,
    passed: ms <= 0,
    days: Math.max(0, Math.floor(ms / 86400000)),
    hours: Math.max(0, Math.floor(ms / 3600000) % 24),
    minutes: Math.max(0, Math.floor(ms / 60000) % 60),
    seconds: Math.max(0, Math.floor(ms / 1000) % 60),
  };
}

export default function useCountdown(target) {
  const [state, setState] = useState(() => (target ? diff(target) : null));
  const [tracked, setTracked] = useState(target);

  // Reset synchronously when the target changes so the panel never shows a stale countdown.
  if (tracked !== target) {
    setTracked(target);
    setState(target ? diff(target) : null);
  }

  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => setState(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return state;
}

export function useGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Winding down';
}
