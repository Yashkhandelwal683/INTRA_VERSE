import { useEffect, useState } from 'react';
import { differenceInSeconds } from 'date-fns';
import { ClockIcon } from '@heroicons/react/24/outline';

export default function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const tick = () => {
      const diff = differenceInSeconds(new Date(targetDate), new Date());
      setTimeLeft(Math.max(0, diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (timeLeft === null) return null;

  if (timeLeft === 0) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
        <ClockIcon className="w-4 h-4" />
        Event has started!
      </div>
    );
  }

  const d = Math.floor(timeLeft / 86400);
  const h = Math.floor((timeLeft % 86400) / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const parts = d > 0
    ? [{ v: d, label: 'd' }, { v: h, label: 'h' }, { v: m, label: 'm' }]
    : [{ v: h, label: 'h' }, { v: m, label: 'm' }, { v: s, label: 's' }];

  return (
    <div className="flex items-center gap-2">
      <ClockIcon className="w-4 h-4 text-accent-400" />
      <span className="text-xs text-slate-400">Starts in</span>
      <div className="flex items-center gap-1.5">
        {parts.map(({ v, label }) => (
          <div key={label} className="flex items-center gap-0.5">
            <span className="font-display font-bold text-white text-sm bg-surface-input px-1.5 py-0.5 rounded-md tabular-nums">
              {pad(v)}
            </span>
            <span className="text-slate-500 text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
