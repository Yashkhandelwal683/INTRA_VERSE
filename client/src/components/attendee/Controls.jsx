import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export function Tabs({ items, value, onChange, layoutId = 'attendee-tabs' }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map(({ key, label, icon: Icon, count }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`pill relative ${active ? 'pill-active' : 'pill-idle'}`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="pill-indicator"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {Icon && <Icon className="relative w-4 h-4" />}
            <span className="relative">{label}</span>
            {count !== undefined && (
              <span
                className={`relative rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  active ? 'bg-mint-500/20 text-mint-200' : 'bg-white/[0.06] text-zinc-500'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-zinc-600" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search"
      />
    </div>
  );
}

export function Pager({ page, totalPages, onChange }) {
  if (!totalPages || totalPages < 2) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="btn-quiet disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Previous
      </button>
      <span className="text-[11px] font-medium text-zinc-500 tabular-nums">
        Page <span className="text-zinc-300">{page}</span> of{' '}
        <span className="text-zinc-300">{totalPages}</span>
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="btn-quiet disabled:pointer-events-none disabled:opacity-30"
      >
        Next
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
