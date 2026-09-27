import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { canCancelBooking, getRefundAmount } from '../../utils/cancellationPolicy';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const POLICY_TIERS = [
  { window: 'More than 7 days before event', outcome: '100% refund', cls: 'text-emerald-400' },
  { window: '3–7 days before event', outcome: '75% refund', cls: 'text-amber-400' },
  { window: '48–72 hours before event', outcome: '50% refund', cls: 'text-orange-400' },
  { window: 'Less than 48 hours', outcome: 'No cancellation', cls: 'text-red-400' },
];

export default function CancelModal({ booking, onClose, onConfirm, isLoading }) {
  const [reason, setReason] = useState('');

  const policy = canCancelBooking(booking?.event?.startDate, booking?.status);
  const refundInfo = policy.canCancel
    ? getRefundAmount(booking?.totalAmount ?? 0, policy.hoursUntilEvent)
    : null;

  // Safety guard — this modal should only open when cancellation is allowed.
  if (!policy.canCancel) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Request cancellation"
          className="panel max-h-[88vh] w-full max-w-md overflow-y-auto p-6"
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-white">Request cancellation</h2>
                <p className="text-[10px] text-zinc-500">An admin reviews this within 24 hours</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Booking summary */}
          <div className="panel-inset mb-4 space-y-1 p-3.5 text-xs">
            <p className="truncate font-medium text-white">{booking?.event?.title}</p>
            <p className="text-zinc-500">
              Booking ref{' '}
              <span className="font-mono text-mint-300">{booking?.bookingRef}</span>
            </p>
            <p className="text-zinc-500">
              Amount paid <span className="font-semibold text-white">₹{booking?.totalAmount}</span>
            </p>
          </div>

          {/* Refund policy */}
          <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <h3 className="panel-label mb-3">Refund policy</h3>
            <div className="space-y-1.5 text-[11px] text-zinc-400">
              {POLICY_TIERS.map(({ window, outcome, cls }) => (
                <div key={window} className="flex items-center justify-between gap-3">
                  <span>{window}</span>
                  <span className={`shrink-0 font-semibold ${cls}`}>{outcome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Eligible refund */}
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3.5">
            <div className="mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Your eligible refund
              </span>
            </div>
            <p className="font-display text-xl font-black text-emerald-300">
              ₹{refundInfo?.refund?.toFixed(2)}{' '}
              <span className="text-sm">({refundInfo?.percent}%)</span>
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              {refundInfo?.label} · Credited within 7 business days after admin approval
            </p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[10px] text-amber-400/90">
              <Info className="mt-px h-3 w-3 shrink-0" />
              Refund is processed only after an admin approves your request.
            </p>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <label htmlFor="cancel-modal-reason" className="panel-label mb-1.5 block">
              Reason <span className="normal-case tracking-normal text-zinc-700">(optional)</span>
            </label>
            <textarea
              id="cancel-modal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Let us know why you need to cancel…"
              className="ap-input"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={isLoading} className="btn-quiet flex-1">
              Keep booking
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason)}
              disabled={isLoading}
              className="btn-mint btn-mint-sm flex-1 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? 'Submitting…' : 'Confirm request'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
