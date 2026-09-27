import { motion } from 'framer-motion';
import { formatCurrency } from '../../../utils/formatCurrency';

export default function MobileBookingBar({ totalAmount, totalQuantity, onContinue, soldOut }) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
    >
      <div className="bg-surface-card/95 backdrop-blur-xl border-t border-surface-border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              {totalAmount > 0 ? (
                <>
                  <span className="font-display font-bold text-lg text-white">{formatCurrency(totalAmount)}</span>
                  {totalQuantity > 1 && (
                    <span className="text-xs text-slate-400">({totalQuantity} tickets)</span>
                  )}
                </>
              ) : (
                <span className="font-display font-bold text-lg text-emerald-400">Free</span>
              )}
            </div>
          </div>
          <button
            onClick={onContinue}
            disabled={soldOut || totalQuantity === 0}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
              soldOut
                ? 'bg-slate-600/30 text-slate-400 cursor-not-allowed'
                : totalQuantity === 0
                ? 'bg-surface-border text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-glow-sm'
            }`}
          >
            {soldOut ? 'Sold Out' : 'Continue'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
