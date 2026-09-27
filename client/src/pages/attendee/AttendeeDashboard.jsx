import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Ticket, CalendarDays, CheckCircle2, XCircle, IndianRupee, Heart,
  Clock, MapPin, Bell, ChevronRight, Compass, QrCode, Bookmark,
  Sparkles, ArrowUpRight, Eye, TrendingUp, Zap, Star, Megaphone,
  CircleCheck, CircleDollarSign, CalendarHeart,
} from 'lucide-react';

import { selectCurrentUser } from '../../features/auth/authSlice';
import { useGetDashboardQuery } from '../../features/attendee/attendeeApi';
import useCountdown, { useGreeting } from '../../hooks/useCountdown';
import StatCard from '../../components/attendee/StatCard';
import EmptyState from '../../components/attendee/EmptyState';
import { Panel, PanelHeader, ViewAllLink, Skeleton, SkeletonRows } from '../../components/attendee/Panel';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const MotionLink = motion(Link);

const STATUS = {
  confirmed: { label: 'Confirmed', cls: 'border-mint-500/25 bg-mint-500/10 text-mint-300' },
  pending: { label: 'Pending', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  cancelled: { label: 'Cancelled', cls: 'border-red-500/25 bg-red-500/10 text-red-300' },
  completed: { label: 'Completed', cls: 'border-blue-500/25 bg-blue-500/10 text-blue-300' },
  refunded: { label: 'Refunded', cls: 'border-blue-500/25 bg-blue-500/10 text-blue-300' },
};

const NOTIF_TONE = {
  new_booking: { icon: Ticket, cls: 'bg-mint-500/10 text-mint-400' },
  refund: { icon: CircleDollarSign, cls: 'bg-amber-500/10 text-amber-400' },
  cancellation: { icon: XCircle, cls: 'bg-red-500/10 text-red-400' },
  event_reminder: { icon: Bell, cls: 'bg-sky-500/10 text-sky-400' },
  ticket_checked_in: { icon: CircleCheck, cls: 'bg-emerald-500/10 text-emerald-400' },
  event_update: { icon: Megaphone, cls: 'bg-violet-500/10 text-violet-400' },
  review: { icon: Star, cls: 'bg-yellow-500/10 text-yellow-400' },
  default: { icon: Bell, cls: 'bg-white/[0.05] text-zinc-500' },
};

const QUICK_ACTIONS = [
  { label: 'Browse Events', to: '/events', icon: Compass, tone: 'mint' },
  { label: 'My Passes', to: '/dashboard/tickets', icon: QrCode, tone: 'emerald' },
  { label: 'Wishlist', to: '/dashboard/wishlist', icon: Heart, tone: 'rose' },
  { label: 'Bookings', to: '/dashboard/bookings', icon: Ticket, tone: 'blue' },
];

const ACTION_TONES = {
  mint: 'from-mint-500 to-mint-600 shadow-mint-500/25',
  emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
  rose: 'from-rose-500 to-pink-600 shadow-rose-500/25',
  blue: 'from-blue-500 to-cyan-600 shadow-blue-500/25',
};

function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shortDate(date) {
  if (!date) return 'TBD';
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm">
        <span className="font-display text-xl font-black tabular-nums text-white">{String(value).padStart(2, '0')}</span>
      </div>
      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">{label}</p>
    </div>
  );
}

function NextEventCard({ booking, onViewAll }) {
  const countdown = useCountdown(booking?.event?.startDate);
  const ev = booking?.event || {};
  const live = countdown && !countdown.passed;

  return (
    <Panel className="relative overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0">
        {ev.bannerImage ? (
          <img src={ev.bannerImage} alt="" className="h-full w-full object-cover opacity-[0.18]" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-mint-600/12 via-transparent to-teal-500/8" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08110f] via-[#08110f]/95 to-[#08110f]/65" />
      </div>

      <div className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <span className="chip border-mint-500/25 bg-mint-500/10 text-mint-300">
              <Zap className="h-3 w-3" />
              Next Event
            </span>
            {booking.status && <StatusChip status={booking.status} />}
            {booking.bookingRef && (
              <span className="font-mono text-[10px] text-zinc-600">#{booking.bookingRef}</span>
            )}
          </div>

          <h2 className="truncate font-display text-2xl font-bold text-white">{ev.title || 'Upcoming Event'}</h2>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
            {ev.startDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-mint-400/70" />
                {shortDate(ev.startDate)}
              </span>
            )}
            {(ev.venue?.name || ev.venue?.city || ev.location) && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-mint-400/70" />
                <span className="truncate">{ev.venue?.name || ev.location || ev.venue?.city}</span>
              </span>
            )}
          </div>

          {ev.startDate && (
            <div className="mt-5 flex items-center gap-3">
              <CountdownUnit value={countdown?.days ?? 0} label="Days" />
              <CountdownUnit value={countdown?.hours ?? 0} label="Hours" />
              <CountdownUnit value={countdown?.minutes ?? 0} label="Mins" />
              <CountdownUnit value={countdown?.seconds ?? 0} label="Secs" />
              <span
                className={`chip ml-1 ${live ? 'border-mint-500/25 bg-mint-500/10 text-mint-300' : 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400'}`}
              >
                <TrendingUp className="h-3 w-3" />
                {live ? 'Counting down' : 'Live now'}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-44">
          <Link
            to={`/events/${ev._id || ''}`}
            className="btn-mint btn-mint-sm w-full"
          >
            <Eye className="h-3.5 w-3.5" />
            View Event
          </Link>
          <Link to="/dashboard/tickets" className="btn-quiet w-full">
            <QrCode className="h-3.5 w-3.5" />
            Open Pass
          </Link>
          <button type="button" onClick={onViewAll} className="btn-quiet w-full">
            All bookings
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Panel>
  );
}

function HeroCard({ name, greeting, today, upcoming, total }) {
  return (
    <Panel className="relative overflow-hidden bg-gradient-to-br from-mint-600/[0.14] via-transparent to-teal-500/[0.08] p-6 lg:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-mint-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="panel-label mb-1.5">{today}</p>
          <h1 className="font-display text-3xl font-black tracking-tight text-white lg:text-4xl">
            {greeting}, <span className="bg-gradient-to-r from-mint-300 to-teal-400 bg-clip-text text-transparent">{name}</span>
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
            {upcoming > 0
              ? `You have ${upcoming} upcoming event${upcoming !== 1 ? 's' : ''} lined up. Your next one is waiting below.`
              : total > 0
                ? `No events on the horizon right now. Time to find your next one.`
                : 'Your pass wallet is empty. Explore live events and grab your first ticket.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-center sm:block">
            <p className="font-display text-xl font-black tabular-nums text-white">{upcoming}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">Upcoming</p>
          </div>
          <Link to="/events" className="btn-mint">
            <Compass className="h-4 w-4" />
            Explore Events
          </Link>
        </div>
      </div>
    </Panel>
  );
}

function QuickActions() {
  return (
    <Panel className="p-4">
      <PanelHeader icon={Zap} title="Quick Actions" className="mb-4" />
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(({ label, to, icon: Icon, tone }) => (
          <MotionLink
            key={to + label}
            to={to}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="panel panel-hover group flex items-center gap-2.5 p-3"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-md ${ACTION_TONES[tone]}`}
            >
              <Icon className="h-4 w-4 text-white" />
            </span>
            <span className="truncate text-[11px] font-semibold text-zinc-300 transition-colors group-hover:text-white">
              {label}
            </span>
          </MotionLink>
        ))}
      </div>
    </Panel>
  );
}

export default function AttendeeDashboard() {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const { data, isLoading } = useGetDashboardQuery();

  const d = data?.data;
  const counts = d?.counts || {};
  const upcomingBookings = d?.upcomingBookings || [];
  const recentBookings = d?.recentBookings || [];
  const recentTickets = d?.recentTickets || [];
  const recommendedEvents = d?.recommendedEvents || [];
  const wishlistItems = d?.wishlistItems || [];
  const notifications = d?.recentNotifications || [];

  const displayName = user?.name?.split(' ')[0] || 'there';
  const greeting = useGreeting();
  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    []
  );

  const totalBookings = counts.totalBookings || 0;
  const upcoming = counts.upcomingEvents || 0;
  const completed = counts.completedEvents || 0;
  const nextEvent = upcomingBookings[0] || null;

  const statCards = [
    { label: 'Total Bookings', value: totalBookings, icon: Ticket, tone: 'mint' },
    { label: 'Upcoming', value: upcoming, icon: CalendarDays, tone: 'emerald', progress: totalBookings ? upcoming / totalBookings : 0 },
    { label: 'Completed', value: completed, icon: CheckCircle2, tone: 'blue', progress: totalBookings ? completed / totalBookings : 0 },
    { label: 'Cancelled', value: counts.cancelledBookings || 0, icon: XCircle, tone: 'rose' },
    { label: 'Total Spent', value: counts.totalSpent || 0, icon: IndianRupee, tone: 'amber', prefix: '₹' },
    { label: 'Wishlist', value: counts.wishlistCount || 0, icon: Heart, tone: 'rose' },
  ];

  const hasActivity = upcomingBookings.length + recentBookings.length + recentTickets.length > 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 pb-10">
      {/* Hero */}
      <motion.div variants={fadeUp}>
        <HeroCard name={displayName} greeting={greeting} today={today} upcoming={upcoming} total={totalBookings} />
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.05} />
        ))}
      </div>

      {/* Next event / empty state */}
      <motion.div variants={fadeUp}>
        {isLoading ? (
          <Skeleton className="h-56" />
        ) : nextEvent ? (
          <NextEventCard booking={nextEvent} onViewAll={() => navigate('/dashboard/bookings')} />
        ) : (
          <Panel className="relative overflow-hidden bg-gradient-to-br from-mint-600/[0.07] via-transparent to-teal-500/[0.04] p-10 text-center lg:p-14">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-mint-500/[0.07] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-teal-500/[0.07] blur-3xl" />
            <div className="relative">
              <div className="relative mx-auto mb-6 w-fit">
                <div className="absolute inset-0 -z-10 rounded-3xl bg-mint-500/15 blur-2xl" />
                <span className="flex h-24 w-24 items-center justify-center rounded-3xl border border-mint-500/15 bg-mint-500/[0.08]">
                  <CalendarHeart className="h-10 w-10 text-mint-400" />
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-white">Your pass wallet is empty</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                Nothing booked yet — that&apos;s about to change. Browse live events, grab your seat, and watch this
                dashboard come alive.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/events" className="btn-mint">
                  <Compass className="h-4 w-4" />
                  Browse Events
                </Link>
                <Link to="/dashboard/wishlist" className="btn-quiet">
                  <Heart className="h-4 w-4" />
                  My Wishlist
                </Link>
              </div>
            </div>
          </Panel>
        )}
      </motion.div>

      {/* Two-column body */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: bookings + activity */}
        <div className="space-y-5 lg:col-span-2">
          {/* Upcoming bookings */}
          <motion.div variants={fadeUp}>
            <Panel className="p-4 sm:p-5">
              <PanelHeader
                icon={Clock}
                title="Upcoming Bookings"
                subtitle={upcomingBookings.length ? `${upcomingBookings.length} confirmed` : 'Nothing scheduled yet'}
                action={upcomingBookings.length ? <ViewAllLink to="/dashboard/bookings" /> : null}
              />

              <div className="mt-4">
                {isLoading ? (
                  <SkeletonRows count={3} />
                ) : upcomingBookings.length === 0 ? (
                  <EmptyState
                    compact
                    icon={CalendarDays}
                    title="No upcoming bookings"
                    description="Your next adventure is waiting to be booked."
                    action={{ label: 'Browse Events', to: '/events' }}
                  />
                ) : (
                  <div className="space-y-2">
                    {upcomingBookings.map((b) => {
                      const ev = b.event || {};
                      return (
                        <button
                          key={b._id}
                          type="button"
                          onClick={() => navigate('/dashboard/bookings')}
                          className="panel panel-hover group flex w-full items-center gap-4 p-3.5 text-left"
                        >
                          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-mint-600/25 to-teal-600/20">
                            {ev.bannerImage ? (
                              <img src={ev.bannerImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center">
                                <CalendarDays className="h-5 w-5 text-mint-400" />
                              </span>
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white transition-colors group-hover:text-mint-300">
                              {ev.title || 'Event'}
                            </span>
                            <span className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                              {ev.startDate && <span>{shortDate(ev.startDate)}</span>}
                              {(ev.venue?.name || ev.venue?.city) && (
                                <span className="inline-flex min-w-0 items-center gap-0.5">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{ev.venue.name || ev.venue.city}</span>
                                </span>
                              )}
                            </span>
                          </span>

                          <span className="shrink-0 text-right">
                            <StatusChip status={b.status} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>

          {/* Booking history */}
          <motion.div variants={fadeUp}>
            <Panel className="p-4 sm:p-5">
              <PanelHeader
                icon={Ticket}
                title="Booking History"
                subtitle="Your most recent reservations"
                action={recentBookings.length ? <ViewAllLink to="/dashboard/bookings" /> : null}
              />

              <div className="mt-4">
                {isLoading ? (
                  <SkeletonRows count={4} className="h-16" />
                ) : recentBookings.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Ticket}
                    title="No booking history"
                    description="Your bookings appear here once you register for an event."
                  />
                ) : (
                  <div className="relative space-y-1.5">
                    {recentBookings.slice(0, 5).map((b, i) => {
                      const ev = b.event || {};
                      return (
                        <div key={b._id || i} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.02]">
                          <span className="relative shrink-0">
                            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03]">
                              {ev.bannerImage ? (
                                <img src={ev.bannerImage} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Ticket className="h-4 w-4 text-zinc-600" />
                              )}
                            </span>
                            {i < Math.min(recentBookings.length, 5) - 1 && (
                              <span className="absolute left-1/2 top-full h-3 w-px -translate-x-1/2 bg-white/[0.06]" />
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-white">{ev.title || 'Event'}</span>
                            <span className="mt-0.5 block text-[10px] text-zinc-600">
                              {shortDate(b.createdAt)}
                              {b.totalAmount ? ` · ₹${Number(b.totalAmount).toLocaleString('en-IN')}` : ''}
                            </span>
                          </span>

                          <StatusChip status={b.status} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <motion.div variants={fadeUp}>
            <QuickActions />
          </motion.div>

          {/* Latest pass */}
          <motion.div variants={fadeUp}>
            <Panel className="p-4">
              <PanelHeader
                icon={QrCode}
                title="Latest Pass"
                action={recentTickets.length ? <ViewAllLink to="/dashboard/tickets" label="All" /> : null}
              />

              <div className="mt-4">
                {isLoading ? (
                  <Skeleton className="h-28" />
                ) : recentTickets.length === 0 ? (
                  <EmptyState compact icon={QrCode} title="No passes yet" description="Passes appear after you book." />
                ) : (
                  (() => {
                    const ticket = recentTickets[0];
                    const qr = ticket.qrImage || ticket.ticket?.qrImage;
                    return (
                      <div className="panel-inset p-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg">
                            {qr ? (
                              <img src={qr} alt="Pass QR" className="h-full w-full object-contain" />
                            ) : (
                              <QrCode className="h-6 w-6 text-zinc-300" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                              {ticket.event?.title || 'Event'}
                            </p>
                            <p className="mt-1 text-[11px] text-zinc-500">{shortDate(ticket.event?.startDate)}</p>
                            {ticket.ticketCode && (
                              <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{ticket.ticketCode}</p>
                            )}
                          </div>
                        </div>
                        <Link to="/dashboard/tickets" className="btn-quiet mt-3 w-full">
                          View pass
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    );
                  })()
                )}
              </div>
            </Panel>
          </motion.div>

          {/* Wishlist preview */}
          <motion.div variants={fadeUp}>
            <Panel className="p-4">
              <PanelHeader
                icon={Bookmark}
                title="Saved Events"
                action={wishlistItems.length ? <ViewAllLink to="/dashboard/wishlist" label="All" /> : null}
              />

              <div className="mt-4">
                {isLoading ? (
                  <SkeletonRows count={3} className="h-14" />
                ) : wishlistItems.length === 0 ? (
                  <EmptyState compact icon={Heart} title="Nothing saved" description="Tap the heart on events you love." />
                ) : (
                  <div className="space-y-1.5">
                    {wishlistItems.slice(0, 4).map((w, i) => (
                      <Link
                        key={w._id || i}
                        to={`/events/${w.event?._id || ''}`}
                        className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-gradient-to-br from-rose-500/20 to-pink-500/15">
                          {w.event?.bannerImage ? (
                            <img src={w.event.bannerImage} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Heart className="h-4 w-4 text-rose-400" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-white transition-colors group-hover:text-mint-300">
                            {w.event?.title || 'Event'}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-zinc-600">
                            {w.event?.category || 'Event'}
                            {w.event?.startDate ? ` · ${shortDate(w.event.startDate)}` : ''}
                          </span>
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-700 transition-colors group-hover:text-mint-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>

          {/* Activity */}
          <motion.div variants={fadeUp}>
            <Panel className="p-4">
              <PanelHeader icon={Bell} title="Recent Activity" subtitle={notifications.length ? `${notifications.length} updates` : undefined} />

              <div className="mt-4">
                {isLoading ? (
                  <SkeletonRows count={4} className="h-14" />
                ) : notifications.length === 0 ? (
                  <EmptyState compact icon={Sparkles} title="All quiet" description="Activity shows up here as it happens." />
                ) : (
                  <div className="space-y-1.5">
                    {notifications.slice(0, 6).map((n, i) => {
                      const tone = NOTIF_TONE[n.type] || NOTIF_TONE.default;
                      const Icon = tone.icon;
                      return (
                        <div
                          key={n._id || i}
                          className={`flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.02] ${
                            n.isRead ? '' : 'bg-mint-500/[0.04]'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.cls}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[11px] font-medium ${n.isRead ? 'text-zinc-400' : 'text-white'}`}>
                              {n.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] text-zinc-600">{n.message}</span>
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-[10px] text-zinc-700">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>
        </div>
      </div>

      {/* Recommended */}
      {recommendedEvents.length > 0 && (
        <motion.div variants={fadeUp}>
          <Panel className="p-4 sm:p-5">
            <PanelHeader
              icon={Sparkles}
              title="Recommended For You"
              subtitle="Based on the categories you explore"
              action={<ViewAllLink to="/events" label="Explore all" />}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {recommendedEvents.slice(0, 4).map((e, i) => (
                <Link
                  key={e._id || i}
                  to={`/events/${e._id}`}
                  className="group panel panel-hover overflow-hidden"
                >
                  <span className="relative block h-24 overflow-hidden bg-gradient-to-br from-mint-600/20 to-teal-600/10">
                    {e.bannerImage ? (
                      <img
                        src={e.bannerImage}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <CalendarDays className="h-6 w-6 text-mint-400/50" />
                      </span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-[#08110f] to-transparent" />
                    {e.category && (
                      <span className="chip absolute left-2 top-2 border-mint-500/25 bg-mint-500/15 capitalize text-mint-200 backdrop-blur-sm">
                        {e.category}
                      </span>
                    )}
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-1 block text-xs font-semibold text-white transition-colors group-hover:text-mint-300">
                      {e.title}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-zinc-600">
                      <CalendarDays className="h-3 w-3" />
                      {shortDate(e.startDate)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </motion.div>
      )}

      {/* Footer stats */}
      {!isLoading && hasActivity && (
        <motion.div variants={fadeUp}>
          <Panel className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 p-4">
            {[
              { icon: Ticket, value: totalBookings, label: 'Bookings', tone: 'text-mint-400' },
              { icon: CalendarDays, value: upcoming, label: 'Upcoming', tone: 'text-emerald-400' },
              { icon: CheckCircle2, value: completed, label: 'Completed', tone: 'text-blue-400' },
              { icon: IndianRupee, value: `₹${(counts.totalSpent || 0).toLocaleString('en-IN')}`, label: 'Spent', tone: 'text-amber-400' },
              { icon: Heart, value: counts.wishlistCount || 0, label: 'Saved', tone: 'text-rose-400' },
            ].map(({ icon: Icon, value, label, tone }) => (
              <div key={label} className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${tone}`} />
                <div>
                  <p className="text-sm font-bold tabular-nums text-white">{value}</p>
                  <p className="text-[10px] text-zinc-500">{label}</p>
                </div>
              </div>
            ))}
          </Panel>
        </motion.div>
      )}
    </motion.div>
  );
}
