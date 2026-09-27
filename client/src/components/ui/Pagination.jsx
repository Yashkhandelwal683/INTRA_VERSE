import clsx from 'clsx';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  const items = [];
  let prev = null;
  for (const p of visible) {
    if (prev && p - prev > 1) items.push('…');
    items.push(p);
    prev = p;
  }

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-sm btn-secondary disabled:opacity-40"
      >
        ← Prev
      </button>

      {items.map((item, i) =>
        item === '…' ? (
          <span key={`ellip-${i}`} className="w-9 text-center text-slate-500">…</span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={clsx(
              'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
              item === page
                ? 'bg-primary-600 text-white shadow-glow-sm'
                : 'text-slate-300 hover:bg-white/10',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-sm btn-secondary disabled:opacity-40"
      >
        Next →
      </button>
    </nav>
  );
}
