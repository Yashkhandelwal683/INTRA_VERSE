import { useState } from 'react';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import { canCancelBooking, getRefundAmount } from '../../utils/cancellationPolicy';
import {
  CalendarDays, MapPin, Ticket, Clock, CheckCircle2, XCircle, RefreshCw,
  QrCode, Trash2, AlertTriangle,
} from 'lucide-react';

const STATUS = {
  confirmed: { label: 'Confirmed', cls: 'border-mint-500/25 bg-mint-500/10 text-mint-300' },
  pending: { label: 'Pending', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  cancelled: { label: 'Cancelled', cls: 'border-red-500/25 bg-red-500/10 text-red-300' },
  refunded: { label: 'Refunded', cls: 'border-blue-500/25 bg-blue-500/10 text-blue-300' },
};

const CANCELLATION = {
  requested: { label: 'Awaiting admin review', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  approved: { label: 'Refund pending', cls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
  rejected: { label: 'Cancel rejected', cls: 'border-red-500/25 bg-red-500/10 text-red-300' },
};

function Notice({ tone, icon: Icon, children }) {
  const tones = {
    amber: 'border-amber-500/20 bg-amber-500/[0.07] text-amber-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300',
    red: 'border-red-500/20 bg-red-500/[0.07] text-red-300',
    mint: 'border-mint-500/20 bg-mint-500/[0.07] text-mint-300',
  };
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] ${tones[tone]}`}>
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function BookingCard({ booking, onRequestCancel, onDirectCancel, onViewQr }) {
  const [cancellingLocal, setCancellingLocal] = useState(false);
  const event = booking?.event || {};

  const isPending = booking?.status === 'pending';
  const isConfirmed = booking?.status === 'confirmed';
  const isCancelled = booking?.status === 'cancelled';

  const isCancelRequested = booking?.cancellationStatus === 'requested';
  const isCancelApproved = booking?.cancellationStatus === 'approved';

  const policy = canCancelBooking(event.startDate, booking?.status);
  const refundInfo = policy.canCancel
    ? getRefundAmount(booking?.totalAmount ?? 0, policy.hoursUntilEvent)
    : null;

  const status = STATUS[booking?.status] || STATUS.pending;
  const cancelState = CANCELLATION[booking?.cancellationStatus];
  const ticketCount = booking?.tickets?.length ?? 1;

  const handleDirectCancel = async () => {
    if (!confirm('Cancel this booking? (No payment was taken for pending bookings.)')) return;
    setCancellingLocal(true);
    try {
      await onDirectCancel?.(booking._id);
    } finally {
      setCancellingLocal(false);
    }
  };

  return (
    <div className="panel panel-hover flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      {/* Thumb */}
      {event.bannerImage ? (
        <img
          src={event.bannerImage}
          alt={event.title}
          className="h-24 w-full shrink-0 rounded-xl border border-white/[0.06] object-cover sm:h-20 sm:w-28"
        />
      ) : (
        <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-mint-800/50 to-teal-900/50 sm:h-20 sm:w-28">
          <CalendarDays className="h-8 w-8 text-mint-400/40" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="truncate font-display text-base font-semibold text-white">
            {event.title || 'Event'}
          </h3>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className={`chip ${status.cls}`}>{status.label}</span>
            {cancelState && <span className={`chip ${cancelState.cls}`}>{cancelState.label}</span>}
            {booking?.bookingRef && (
              <span className="font-mono text-[10px] uppercase text-zinc-600">#{booking.bookingRef}</span>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-1 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-mint-400/70" />
            {event.startDate ? formatDate(event.startDate) : 'Date TBD'}
          </div>
          {(event.venue?.city || event.venue?.name) && (
            <div className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
              <span className="truncate">{event.venue?.city || event.venue?.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
            <span className="font-medium text-zinc-300">
              {ticketCount} ticket{ticketCount === 1 ? '' : 's'} · {formatCurrency(booking?.totalAmount ?? 0)}
            </span>
          </div>
        </div>

        {isPending && (
          <Notice tone="amber" icon={Clock}>
            Payment not yet verified. Complete payment or cancel this reservation.
          </Notice>
        )}

        {isConfirmed && !isCancelRequested && policy.canCancel && refundInfo && (
          <Notice tone="emerald" icon={CheckCircle2}>
            {refundInfo.label} eligible if cancelled now
          </Notice>
        )}

        {isConfirmed && !isCancelRequested && !policy.canCancel && policy.reason === 'within_48_hours' && (
          <Notice tone="red" icon={XCircle}>
            Cancellation locked — event starts in less than 48 hours
          </Notice>
        )}

        {isCancelRequested && (
          <Notice tone="mint" icon={RefreshCw}>
            Cancellation request is being reviewed by admin
          </Notice>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onViewQr?.(booking)} className="btn-quiet">
            <QrCode className="h-3.5 w-3.5" />
            View QR
          </button>

          {isCancelled ? (
            <span className="text-[11px] text-zinc-600">
              {isCancelApproved ? 'Cancelled — refund pending' : 'This booking was cancelled'}
            </span>
          ) : isCancelRequested ? (
            <span className="text-[11px] text-amber-400/80">Awaiting admin review</span>
          ) : isPending ? (
            <button
              type="button"
              onClick={handleDirectCancel}
              disabled={cancellingLocal}
              className="btn-quiet border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {cancellingLocal ? 'Cancelling…' : 'Cancel reservation'}
            </button>
          ) : policy.canCancel ? (
            <button
              type="button"
              onClick={() => onRequestCancel?.(booking)}
              className="btn-quiet border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Request cancellation
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
