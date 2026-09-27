import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const TONES = {
  mint:   { chip: 'border-mint-500/20 bg-mint-500/10',     text: 'text-mint-400',     bar: 'from-mint-400 to-mint-600' },
  amber:  { chip: 'border-amber-500/20 bg-amber-500/10',   text: 'text-amber-400',    bar: 'from-amber-400 to-orange-500' },
  emerald:{ chip: 'border-emerald-500/20 bg-emerald-500/10',text: 'text-emerald-400',  bar: 'from-emerald-400 to-teal-500' },
  blue:   { chip: 'border-blue-500/20 bg-blue-500/10',     text: 'text-blue-400',     bar: 'from-blue-400 to-cyan-500' },
  rose:   { chip: 'border-rose-500/20 bg-rose-500/10',     text: 'text-rose-400',     bar: 'from-rose-400 to-pink-500' },
  slate:  { chip: 'border-white/[0.08] bg-white/[0.04]',   text: 'text-zinc-400',     bar: 'from-zinc-400 to-zinc-600' },
};

function Counter({ value, prefix = '' }) {
  const target = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const from = display;
    const start = performance.now();
    const duration = 1100;

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <span>
      {prefix}
      {display.toLocaleString('en-IN')}
    </span>
  );
}

export default function StatCard({ label, value, icon: Icon, tone = 'mint', prefix = '', caption, progress, delay = 0 }) {
  const t = TONES[tone] || TONES.mint;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      <div className="panel panel-hover relative h-full overflow-hidden p-4">
        <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${t.chip} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`} />

        <div className="relative flex items-start justify-between gap-2">
          <span className={`flex w-9 h-9 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110 ${t.chip}`}>
            <Icon className={`w-4 h-4 ${t.text}`} />
          </span>
          {caption && <span className="text-[10px] font-medium text-zinc-600">{caption}</span>}
        </div>

        <p className="relative mt-3 font-display text-2xl font-black tabular-nums text-white">
          <Counter value={value} prefix={prefix} />
        </p>
        <p className="panel-label relative mt-0.5">{label}</p>

        {typeof progress === 'number' && (
          <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              transition={{ delay: delay + 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full bg-gradient-to-r ${t.bar}`}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
