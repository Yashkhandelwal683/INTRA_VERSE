import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Menu, LogOut, User, Compass, LayoutDashboard,
  Ticket, QrCode, Heart, CheckCheck, CornerDownLeft,
} from 'lucide-react';
import {
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
} from '../../features/notifications/notificationsApi';

const COMMANDS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Navigate' },
  { to: '/dashboard/bookings', label: 'My Bookings', icon: Ticket, group: 'Navigate' },
  { to: '/dashboard/tickets', label: 'My Tickets', icon: QrCode, group: 'Navigate' },
  { to: '/dashboard/wishlist', label: 'Wishlist', icon: Heart, group: 'Navigate' },
  { to: '/profile', label: 'My Profile', icon: User, group: 'Navigate' },
  { to: '/events', label: 'Browse Events', icon: Compass, group: 'Discover' },
];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/dashboard/bookings': 'My Bookings',
  '/dashboard/tickets': 'My Tickets',
  '/dashboard/wishlist': 'Wishlist',
  '/profile': 'My Profile',
};

const NOTIF_TONE = {
  new_booking: 'bg-mint-500/10 text-mint-400',
  refund: 'bg-amber-500/10 text-amber-400',
  cancellation: 'bg-red-500/10 text-red-400',
  event_reminder: 'bg-sky-500/10 text-sky-400',
  ticket_checked_in: 'bg-emerald-500/10 text-emerald-400',
  event_update: 'bg-violet-500/10 text-violet-400',
  review: 'bg-yellow-500/10 text-yellow-400',
};

function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function useDismiss(ref, onDismiss) {
  const handler = useRef(onDismiss);

  useEffect(() => {
    handler.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler.current();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref]);
}

function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      const id = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const results = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  const groups = results.reduce((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[14vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -16 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1513] shadow-2xl shadow-black/60"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <Search className="w-4 h-4 text-mint-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results[0]) {
                navigate(results[0].to);
                onClose();
              }
            }}
            placeholder="Jump to a page…"
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
          />
          <kbd className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-zinc-600">No matching pages</p>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-700">
                  {group}
                </p>
                {items.map(({ to, label, icon: Icon }) => (
                  <button
                    key={to}
                    type="button"
                    onClick={() => {
                      navigate(to);
                      onClose();
                    }}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className="flex w-7 h-7 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.03] text-zinc-500 transition-colors group-hover:border-mint-500/20 group-hover:bg-mint-500/10 group-hover:text-mint-400">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    {label}
                    <CornerDownLeft className="ml-auto w-3 h-3 text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { data } = useGetNotificationsQuery({ limit: 8 });
  const [markAllRead] = useMarkAllAsReadMutation();

  useDismiss(ref, () => setOpen(false));

  const items = data?.notifications || data?.data?.notifications || [];
  const unread = data?.unreadCount ?? data?.data?.unreadCount ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={`relative rounded-xl p-2.5 transition-all ${
          open ? 'bg-white/[0.06] text-white' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-mint-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-mint-500/40">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1513] shadow-2xl shadow-black/60"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <p className="text-xs font-bold text-white">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-mint-400 transition-colors hover:text-mint-300"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-zinc-600">You&apos;re all caught up</p>
              ) : (
                items.map((n) => (
                  <div
                    key={n._id}
                    className={`flex gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0 transition-colors hover:bg-white/[0.02] ${
                      n.isRead ? 'opacity-60' : ''
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        NOTIF_TONE[n.type] || 'bg-white/[0.05] text-zinc-500'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-white">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[9px] font-medium text-zinc-700">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint-400" />}
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                navigate('/dashboard/bookings');
                setOpen(false);
              }}
              className="w-full border-t border-white/[0.06] py-2.5 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-white/[0.03] hover:text-mint-400"
            >
              View activity
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useDismiss(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-all ${
          open ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
        }`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-mint-400 to-mint-600 text-xs font-bold text-white shadow-lg shadow-mint-500/20">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[130px] truncate text-xs font-semibold text-slate-200">
            {user?.name || 'Guest'}
          </span>
          <span className="block text-[10px] text-zinc-500">Attendee</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1513] shadow-2xl shadow-black/60"
          >
            <div className="border-b border-white/[0.06] px-4 py-3">
              <p className="truncate text-xs font-bold text-white">{user?.name || 'Guest'}</p>
              <p className="mt-0.5 truncate text-[10px] text-zinc-500">{user?.email || '—'}</p>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/profile');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-white"
              >
                <User className="w-3.5 h-3.5" />
                My Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate('/events');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-white"
              >
                <Compass className="w-3.5 h-3.5" />
                Browse Events
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-400/80 transition-all hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AttendeeTopbar({ user, onMenuClick, onLogout }) {
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Event Fiesta';

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-white/[0.04] bg-[#060d0c]/85 backdrop-blur-2xl">
        <div className="flex h-full items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Open navigation"
              className="rounded-xl p-2 text-slate-500 transition-all hover:bg-white/5 hover:text-slate-200 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-display text-sm font-bold text-white">{pageTitle}</p>
              <p className="truncate text-[10px] text-zinc-600">Event Fiesta · Attendee Panel</p>
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group ml-1 hidden items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2 text-xs text-zinc-600 transition-all hover:border-mint-500/25 hover:bg-white/[0.05] hover:text-zinc-300 md:flex"
            >
              <Search className="w-3.5 h-3.5" />
              Quick jump
              <kbd className="ml-3 rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              className="rounded-xl p-2.5 text-slate-500 transition-all hover:bg-white/5 hover:text-slate-200 md:hidden"
            >
              <Search className="w-5 h-5" />
            </button>

            <NotificationBell />

            <span className="mx-1 hidden h-6 w-px bg-white/[0.06] sm:block" />

            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {paletteOpen && <CommandPalette open onClose={() => setPaletteOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
