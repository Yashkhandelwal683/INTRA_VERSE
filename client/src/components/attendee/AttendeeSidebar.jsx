import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, QrCode, Heart, Compass, User,
  ChevronLeft, ChevronRight, LogOut, TicketCheck, Sparkles,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Overview',
    links: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'My Events',
    links: [
      { to: '/dashboard/bookings', label: 'Bookings', icon: Ticket },
      { to: '/dashboard/tickets', label: 'Tickets & Passes', icon: QrCode },
      { to: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
    ],
  },
  {
    label: 'Discover',
    links: [{ to: '/events', label: 'Browse Events', icon: Compass, featured: true }],
  },
  {
    label: 'Account',
    links: [{ to: '/profile', label: 'My Profile', icon: User }],
  },
];

function NavItem({ link, collapsed }) {
  const { to, label, icon: Icon, featured, end } = link;

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
          featured
            ? isActive
              ? 'border-mint-500/25 bg-gradient-to-r from-mint-600/25 to-teal-600/20 text-white'
              : 'border-transparent text-mint-400/90 hover:border-mint-500/10 hover:bg-mint-500/10'
            : isActive
              ? 'border-white/[0.06] bg-white/[0.06] text-white'
              : 'border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !featured && (
            <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-mint-300 to-mint-600" />
          )}
          <Icon className={`w-[18px] h-[18px] shrink-0 ${featured ? 'text-mint-400' : ''}`} />
          {!collapsed && <span className="truncate">{label}</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-white/[0.06] bg-slate-800 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function AttendeeSidebar({ collapsed, onToggleCollapse, user, onLogout, counts }) {
  const upcoming = counts?.upcomingEvents ?? 0;
  const saved = counts?.wishlistCount ?? 0;

  return (
    <aside
      className={`fixed left-0 top-0 z-50 h-full border-r border-white/[0.04] bg-[#07100f]/95 backdrop-blur-2xl transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[248px]'
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div
          className={`flex h-16 items-center border-b border-white/[0.04] ${
            collapsed ? 'justify-center px-0' : 'gap-3 px-5'
          }`}
        >
          <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint-400 to-mint-600 shadow-lg shadow-mint-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </span>
          {!collapsed && (
            <span className="truncate font-display text-base font-black tracking-tight text-white">
              Event Fiesta
              <span className="ml-1.5 align-middle text-[9px] font-bold uppercase tracking-widest text-mint-400">
                Pass
              </span>
            </span>
          )}
        </div>

        {/* Member card */}
        {!collapsed && (
          <div className="px-3 py-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-gradient-to-br from-mint-500/[0.08] to-transparent px-3 py-2.5">
              <span className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-mint-400 to-mint-600 text-xs font-bold text-white shadow-lg shadow-mint-500/20">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{user?.name || 'Guest'}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-mint-400">
                    Attendee
                  </span>
                  {user?.email && (
                    <>
                      <span className="text-[9px] text-slate-700">·</span>
                      <span className="truncate text-[9px] text-slate-500">{user.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className={`mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-700 ${
                  collapsed ? 'text-center' : 'px-3'
                }`}
              >
                {collapsed ? '—' : group.label}
              </p>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <NavItem key={link.to} link={link} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Pass summary */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <div className="rounded-xl border border-mint-500/15 bg-gradient-to-br from-mint-600/10 to-teal-600/5 p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <TicketCheck className="w-3.5 h-3.5 text-mint-400" />
                <p className="text-[11px] font-bold text-mint-300">Your Pass Wallet</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
                  <p className="font-display text-lg font-black tabular-nums text-white">{upcoming}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Upcoming</p>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-black/20 px-2.5 py-2">
                  <p className="font-display text-lg font-black tabular-nums text-white">{saved}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Saved</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="space-y-1 border-t border-white/[0.04] px-3 py-3">
          <button
            type="button"
            onClick={onLogout}
            className={`group relative flex w-full items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-400/60 transition-all hover:bg-red-500/5 hover:text-red-400`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Sign Out</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg border border-white/[0.06] bg-slate-800 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                Sign Out
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden w-full items-center justify-center rounded-xl px-3 py-2 text-slate-600 transition-all hover:bg-white/[0.03] hover:text-slate-400 lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
