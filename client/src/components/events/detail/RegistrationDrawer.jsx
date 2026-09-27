import { motion, AnimatePresence } from 'framer-motion';
import { X, Ticket, ArrowRight, Check, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useAuth } from '../../../hooks/useAuth';
import useRegistrationStore from '../../../store/registrationStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function RegistrationDrawer({ isOpen, onClose, event, tickets, selections }) {
  const { user: fullUser } = useCurrentUser();
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const initRegistration = useRegistrationStore((s) => s.initRegistration);

  const totalQuantity = Object.values(selections).reduce((s, q) => s + q, 0);
  const subtotal = tickets.reduce((sum, t) => sum + (selections[t._id] || 0) * t.price, 0);
  const PLATFORM_FEE_RATE = 0.05;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const totalAmount = subtotal + platformFee;

  const handleContinue = () => {
    if (!isAuth) {
      onClose();
      navigate(`/register?next=/events/${event._id}`);
      return;
    }

    if (totalQuantity === 0) {
      toast.error('Please select at least one ticket');
      return;
    }

    initRegistration(event, tickets, selections, fullUser);
    onClose();
    navigate(`/checkout/${event._id}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[85] w-full max-w-md bg-surface-card border-l border-surface-border overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-surface-card/95 backdrop-blur-xl border-b border-surface-border p-4 flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-violet-400" />
                Ticket Selection
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-border flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="glass-sm p-4 space-y-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-violet-400" />
                  Selected Tickets
                </h3>
                {tickets.map((t) => {
                  const qty = selections[t._id] || 0;
                  if (qty === 0) return null;
                  return (
                    <div key={t._id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">{t.name}</span>
                        <span className="text-zinc-500">× {qty}</span>
                      </div>
                      <span className="text-white font-medium">{formatCurrency(t.price * qty)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-surface-border pt-2 flex justify-between text-sm">
                  <span className="text-slate-400">Total Tickets</span>
                  <span className="text-white font-semibold">{totalQuantity}</span>
                </div>
              </div>

              <div className="glass-sm p-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Platform Fee</span>
                  <span>{formatCurrency(platformFee)}</span>
                </div>
                <div className="flex justify-between font-display font-bold text-white pt-2 border-t border-surface-border">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-xs text-violet-300">
                  You'll enter attendee details for each ticket on the next step. Each attendee will receive their own QR ticket.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-surface-card/95 backdrop-blur-xl border-t border-surface-border p-4">
              <button
                onClick={handleContinue}
                disabled={totalQuantity === 0}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  totalQuantity === 0
                    ? 'bg-surface-border text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-glow-sm'
                }`}
              >
                {totalQuantity === 0 ? (
                  'Select Tickets First'
                ) : (
                  <>
                    Continue to Checkout ({totalQuantity} ticket{totalQuantity > 1 ? 's' : ''})
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
