import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div className={`panel flex flex-col items-center justify-center text-center ${compact ? 'p-6' : 'p-10'}`}>
      <div className="relative mb-4">
        <div className="absolute inset-0 -z-10 rounded-2xl bg-mint-500/10 blur-xl" />
        <span
          className={`flex items-center justify-center rounded-2xl border border-mint-500/15 bg-mint-500/[0.07] ${
            compact ? 'w-12 h-12' : 'w-16 h-16'
          }`}
        >
          {Icon ? <Icon className="w-6 h-6 text-mint-400/80" /> : <Sparkles className="w-6 h-6 text-mint-400/80" />}
        </span>
      </div>

      <p className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-500">{description}</p>}

      {action && (
        <Link to={action.to} className="btn-mint btn-mint-sm mt-4">
          {action.label}
        </Link>
      )}
    </div>
  );
}
