import { Link } from 'react-router-dom';

export function Panel({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`panel ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function PanelHeader({ icon: Icon, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-lg border border-mint-500/15 bg-mint-500/10">
            <Icon className="w-4 h-4 text-mint-400" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="panel-title truncate">{title}</h2>
          {subtitle && <p className="text-[11px] text-zinc-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function ViewAllLink({ to, label = 'View all' }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-mint-400 transition-colors hover:text-mint-300"
    >
      {label}
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`ap-skeleton ${className}`} />;
}

export function SkeletonRows({ count = 3, className = 'h-20' }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}
