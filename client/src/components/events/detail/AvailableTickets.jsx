import { motion } from 'framer-motion';
import { Ticket, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AvailableTickets({ tickets, selections, onSelectionChange }) {
  if (!tickets || tickets.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="font-display font-bold text-xl text-white">Available Tickets</h2>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid gap-3"
      >
        {tickets.map((ticket) => {
          const remaining = ticket.totalQuantity - ticket.soldQuantity;
          const soldOut = remaining <= 0;
          const isLow = remaining > 0 && remaining < 20;
          const qty = selections[ticket._id] || 0;

          return (
            <motion.div
              key={ticket._id}
              variants={item}
              whileHover={!soldOut ? { scale: 1.01 } : {}}
              className={`glass-sm p-5 transition-all duration-300 ${
                soldOut ? 'opacity-50' : 'hover:border-primary-500/30'
              } ${qty > 0 ? 'border-primary-500/50 ring-1 ring-primary-500/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{ticket.name}</h3>
                    {ticket.type === 'vip' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        VIP
                      </span>
                    )}
                    {ticket.type === 'earlyBird' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Early Bird
                      </span>
                    )}
                  </div>
                  {ticket.description && (
                    <p className="text-sm text-slate-400 mb-2">{ticket.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-lg text-primary-300">
                      {ticket.price === 0 ? 'Free' : formatCurrency(ticket.price)}
                    </span>
                    {isLow && (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <AlertCircle className="w-3 h-3" />
                        Only {remaining} left!
                      </span>
                    )}
                    {soldOut && (
                      <span className="text-xs text-red-400 font-medium">Sold Out</span>
                    )}
                  </div>
                </div>

                {!soldOut && (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-surface rounded-xl px-1 py-1">
                      <button
                        onClick={() => onSelectionChange(ticket._id, -1)}
                        disabled={qty === 0}
                        className="w-8 h-8 rounded-lg bg-surface-border hover:bg-primary-600/30 disabled:opacity-30 flex items-center justify-center transition-colors text-white text-sm font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-white tabular-nums">{qty}</span>
                      <button
                        onClick={() => onSelectionChange(ticket._id, 1)}
                        disabled={qty >= remaining || qty >= 10}
                        className="w-8 h-8 rounded-lg bg-surface-border hover:bg-primary-600/30 disabled:opacity-30 flex items-center justify-center transition-colors text-white text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
