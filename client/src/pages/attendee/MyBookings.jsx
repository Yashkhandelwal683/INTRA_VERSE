import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Ticket, CalendarDays, CheckCircle2, XCircle, IndianRupee, MapPin,
  RefreshCw, QrCode, ChevronDown, AlertTriangle, Eye, Trash2, ArrowUpRight,
  Hourglass, Ban, Sparkles, SearchX,
} from 'lucide-react';

import {
  useGetUserBookingsQuery,
  useRequestCancellationMutation,
  useCancelBookingMutation,
} from '../../features/bookings/bookingsApi';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import QRModal from '../../components/bookings/QRModal';
import { Panel, SkeletonRows } from '../../components/attendee/Panel';
import { Tabs, SearchField, Pager } from '../../components/attendee/Controls';
import EmptyState from '../../components/attendee/EmptyState';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const STATUS = {
  pending: { label: 'Pending', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  confirmed: { label: 'Confirmed', cls: 'border-mint-500/25 bg-mint-500/10 text-mint-300' },
  cancelled: { label: 'Cancelled', cls: 'border-red-500/25 bg-red-500/10 text-red-300' },
  refunded: { label: 'Refunded', cls: 'border-blue-500/25 bg-blue-500/10 text-blue-300' },
};

const CANCELLATION = {
  requested: { label: 'Cancel requested', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  approved: { label: 'Cancel approved', cls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
  rejected: { label: 'Cancel rejected', cls: 'border-red-500/25 bg-red-500/10 text-red-300' },
};

function matchesTab(booking, tab) {
  const start = booking.event?.startDate;
  const future = start ? new Date(start) > new Date() : false;
  if (tab === 'upcoming') return booking.status === 'confirmed' && future;
  if (tab === 'completed') return booking.status === 'confirmed' && !future;
  if (tab === 'cancelled') return booking.status === 'cancelled' || booking.status === 'refunded';
  return true;
}

function DetailCell({ label, children, mono = false, className = '' }) {
  return (
    <div className={`panel-inset px-2.5 py-2 ${className}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">{label}</p>
      <div className={`mt-0.5 truncate text-[10px] text-zinc-300 ${mono ? 'font-mono' : ''}`}>{children}</div>
    </div>
  );
}

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [qrTarget, setQrTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, refetch } = useGetUserBookingsQuery({ page, limit: 20 });
  const [requestCancellation, { isLoading: cancelling }] = useRequestCancellationMutation();
  const [cancelBookingDirect, { isLoading: directCancelling }] = useCancelBookingMutation();

  const bookings = data?.bookings || [];
  const pagination = data?.pagination;

  const searched = bookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.event?.title?.toLowerCase().includes(term) ||
      b.bookingRef?.toLowerCase().includes(term)
    );
  });

  const filtered = searched.filter((b) => matchesTab(b, activeTab));

  const tabCounts = {
    all: bookings.length,
    upcoming: bookings.filter((b) => matchesTab(b, 'upcoming')).length,
    completed: bookings.filter((b) => matchesTab(b, 'completed')).length,
    cancelled: bookings.filter((b) => matchesTab(b, 'cancelled')).length,
  };

  const tabs = [
    { key: 'all', label: 'All', icon: Ticket, count: tabCounts.all },
    { key: 'upcoming', label: 'Upcoming', icon: CalendarDays, count: tabCounts.upcoming },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, count: tabCounts.completed },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle, count: tabCounts.cancelled },
  ];

  const handleRequestCancel = async () => {
    if (!cancelTarget) return;
    try {
      await requestCancellation({
        bookingId: cancelTarget._id,
        cancellationReason: cancelReason || 'No reason provided',
      }).unwrap();
      toast.success('Cancellation request submitted! Admin will review within 24 hours.');
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      toast.error(err?.data?.message ?? 'Failed to submit cancellation request.');
    }
  };

  const handleDirectCancel = async (bookingId) => {
    try {
      await cancelBookingDirect(bookingId).unwrap();
      toast.success('Booking cancelled successfully.');
    } catch (err) {
      toast.error(err?.data?.message ?? 'Failed to cancel booking.');
    }
  };

  const isUpcoming = (b) => b.status === 'confirmed' && new Date(b.event?.startDate) > new Date();
  const canRequestCancel = (b) => b.status === 'confirmed' && b.cancellationStatus !== 'requested';
  const canDirectCancel = (b) => b.status === 'pending';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-10">
      {/* Page header */}
      <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="panel-label mb-1.5">Booking Management</p>
          <h1 className="font-display text-3xl font-black tracking-tight text-white">My Bookings</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Track, review and manage every reservation you&apos;ve made.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="btn-quiet"
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Syncing' : 'Refresh'}
        </button>
      </motion.div>

      {/* Summary strip */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'All bookings', value: tabCounts.all, icon: Ticket, tone: 'text-mint-400' },
          { label: 'Upcoming', value: tabCounts.upcoming, icon: Hourglass, tone: 'text-emerald-400' },
          { label: 'Completed', value: tabCounts.completed, icon: CheckCircle2, tone: 'text-blue-400' },
          { label: 'Cancelled', value: tabCounts.cancelled, icon: Ban, tone: 'text-red-400' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <Panel key={label} className="flex items-center gap-3 p-3.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] ${tone}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-xl font-black tabular-nums text-white">{value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
            </div>
          </Panel>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
        <Tabs items={tabs} value={activeTab} onChange={(key) => { setActiveTab(key); setPage(1); }} />
        <SearchField
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by event or ref…"
        />
      </motion.div>

      {/* List */}
      {isLoading ? (
        <SkeletonRows count={4} className="h-40" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={searchTerm ? SearchX : Ticket}
          title={searchTerm ? 'No matching bookings' : activeTab === 'all' ? 'No bookings yet' : `No ${activeTab} bookings`}
          description={
            searchTerm
              ? 'Try a different event name or booking reference.'
              : activeTab === 'all'
                ? 'Browse events and book your first ticket — it only takes a minute.'
                : 'Nothing in this bucket right now. Try another filter.'
          }
          action={!searchTerm && activeTab === 'all' ? { label: 'Browse Events', to: '/events' } : null}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const ev = booking.event || {};
            const expanded = expandedId === booking._id;
            const status = STATUS[booking.status] || STATUS.pending;
            const cancelState = CANCELLATION[booking.cancellationStatus];
            const ticketCount = booking.tickets?.reduce((s, t) => s + t.quantity, 0) || 0;

            return (
              <motion.div
                key={booking._id}
                variants={item}
                layout
                className={`panel overflow-hidden transition-shadow ${expanded ? 'border-mint-500/30 shadow-glow-mint-sm' : ''}`}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Poster */}
                  <div className="relative h-36 w-full shrink-0 overflow-hidden bg-gradient-to-br from-mint-800/50 to-teal-900/50 sm:h-auto sm:w-44">
                    {ev.bannerImage || ev.poster ? (
                      <img src={ev.bannerImage || ev.poster} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <CalendarDays className="h-9 w-9 text-mint-400/30" />
                      </span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-[#08110f] via-[#08110f]/25 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#08110f]" />

                    {booking.status === 'confirmed' && isUpcoming(booking) && (
                      <span className="chip absolute left-3 top-3 border-mint-500/30 bg-mint-500/20 text-mint-200 backdrop-blur-sm">
                        <Sparkles className="h-3 w-3" />
                        Going soon
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1 space-y-3 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-base font-semibold text-white">
                          {ev.title || 'Event'}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`chip ${status.cls}`}>{status.label}</span>
                          {cancelState && <span className={`chip ${cancelState.cls}`}>{cancelState.label}</span>}
                          {booking.bookingRef && (
                            <span className="font-mono text-[10px] text-zinc-600">REF {booking.bookingRef}</span>
                          )}
                        </div>
                      </div>

                      {booking.issuedTicket?.qrImage && (
                        <button
                          type="button"
                          onClick={() => setQrTarget(booking)}
                          aria-label="View QR pass"
                          className="shrink-0 rounded-xl border border-mint-500/20 bg-mint-500/10 p-2 text-mint-400 transition-all hover:bg-mint-500/20"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { icon: CalendarDays, label: ev.startDate ? formatDate(ev.startDate, 'dd MMM yyyy') : 'TBD' },
                        { icon: MapPin, label: ev.location || ev.venue?.name || ev.venue?.city || 'Online' },
                        { icon: IndianRupee, label: formatCurrency(booking.totalAmount) },
                        { icon: Ticket, label: `${ticketCount} ticket${ticketCount === 1 ? '' : 's'}` },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-400">
                          <Icon className="h-3 w-3 shrink-0 text-zinc-600" />
                          <span className="truncate">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : booking._id)}
                        className="btn-quiet"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {expanded ? 'Hide details' : 'Details'}
                        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>

                      <Link to={`/events/${ev._id}`} className="btn-quiet">
                        View event
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>

                      {canDirectCancel(booking) && (
                        <button
                          type="button"
                          onClick={() => handleDirectCancel(booking._id)}
                          disabled={directCancelling}
                          className="btn-quiet border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      )}

                      {canRequestCancel(booking) && isUpcoming(booking) && (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(booking)}
                          className="btn-quiet border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Request cancel
                        </button>
                      )}
                    </div>

                    {/* Expanded */}
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="panel-hairline space-y-3 pt-3">
                            {booking.tickets?.length > 0 && (
                              <div>
                                <p className="panel-label mb-2">Tickets</p>
                                <div className="space-y-1">
                                  {booking.tickets.map((t, i) => (
                                    <div
                                      key={i}
                                      className="panel-inset flex items-center justify-between px-3 py-2 text-[11px]"
                                    >
                                      <span className="truncate text-zinc-300">
                                        {t.ticket?.name || t.ticket?.type || 'Ticket'}
                                      </span>
                                      <span className="flex shrink-0 items-center gap-3">
                                        <span className="text-zinc-500">×{t.quantity}</span>
                                        <span className="font-semibold text-white">
                                          {formatCurrency(t.unitPrice * t.quantity)}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              <DetailCell label="Booking ref" mono>{booking.bookingRef || '—'}</DetailCell>
                              <DetailCell label="Booked on">{formatDateTime(booking.createdAt)}</DetailCell>
                              <DetailCell label="Attendee">{booking.attendeeInfo?.name || '—'}</DetailCell>
                              {booking.issuedTicket?.ticketCode && (
                                <DetailCell label="Pass code" mono>{booking.issuedTicket.ticketCode}</DetailCell>
                              )}
                              {booking.issuedTicket && (
                                <DetailCell label="Entry status">
                                  <span
                                    className={`chip ${
                                      booking.issuedTicket.isUsed
                                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                                        : 'border-white/[0.08] bg-white/[0.04] text-zinc-400'
                                    }`}
                                  >
                                    {booking.issuedTicket.isUsed ? 'Checked in' : 'Not used'}
                                  </span>
                                </DetailCell>
                              )}
                              {cancelState && (
                                <DetailCell label="Cancellation">
                                  <span className={`chip ${cancelState.cls}`}>{cancelState.label}</span>
                                </DetailCell>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Pager page={page} totalPages={pagination?.totalPages} onChange={setPage} />

      <QRModal isOpen={!!qrTarget} onClose={() => setQrTarget(null)} booking={qrTarget} />

      {/* Cancellation request */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setCancelTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="panel w-full max-w-md space-y-4 p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Request cancellation</h3>
                  <p className="text-[10px] text-zinc-500">An admin reviews this within 24 hours</p>
                </div>
              </div>

              <div className="panel-inset space-y-1 p-3 text-[11px]">
                <p className="truncate font-medium text-zinc-200">{cancelTarget.event?.title}</p>
                <p className="text-zinc-500">REF {cancelTarget.bookingRef}</p>
                <p className="text-zinc-500">Amount {formatCurrency(cancelTarget.totalAmount)}</p>
              </div>

              <div>
                <label htmlFor="cancel-reason" className="panel-label mb-1.5 block">
                  Reason
                </label>
                <textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Tell us why you need to cancel…"
                  className="ap-input"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setCancelTarget(null); setCancelReason(''); }}
                  className="btn-quiet"
                >
                  Keep booking
                </button>
                <button
                  type="button"
                  onClick={handleRequestCancel}
                  disabled={cancelling}
                  className="btn-mint btn-mint-sm disabled:pointer-events-none disabled:opacity-50"
                >
                  {cancelling ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
