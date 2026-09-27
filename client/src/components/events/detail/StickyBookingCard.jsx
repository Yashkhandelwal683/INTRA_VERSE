import { motion } from 'framer-motion';
import { Heart, Share2, MapPin, Calendar, Users, Tag } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function StickyBookingCard({ event, tickets, selections, onSelectionChange, onContinue }) {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const [wishlisted, setWishlisted] = useState(false);
  const PLATFORM_FEE_RATE = 0.05;

  const totalLeft = tickets.reduce((s, t) => s + (t.totalQuantity - t.soldQuantity), 0);
  const soldOut = tickets.length > 0 && totalLeft <= 0;

  const totalQuantity = Object.values(selections).reduce((s, q) => s + q, 0);
  const subtotal = tickets.reduce((sum, t) => sum + (selections[t._id] || 0) * t.price, 0);
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const totalAmount = subtotal + platformFee;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url: window.location.href });
      } catch { /* ignore */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleWishlist = () => {
    if (!isAuth) {
      navigate(`/register?next=/events/${event._id}`);
      return;
    }
    setWishlisted(!wishlisted);
    toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass p-6 sticky top-24 space-y-5"
    >
      <div>
        <h2 className="font-display font-bold text-xl text-white mb-1">{event.title}</h2>
        {event.category && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-600/20 text-primary-300 border border-primary-600/30">
            <Tag className="w-3 h-3" />
            {event.category}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg key={star} className={`w-4 h-4 ${star <= Math.round(event.rating?.average || 0) ? 'text-amber-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-sm text-slate-400 ml-1">
          {(event.rating?.average || 0).toFixed(1)} ({event.rating?.count || 0})
        </span>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-4 h-4 text-primary-400 flex-shrink-0" />
          <span>{formatDate(event.startDate, 'EEE, MMM dd yyyy')}</span>
        </div>
        {event.venue?.name && (
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-accent-400 flex-shrink-0" />
            <span>{event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ''}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-slate-300">
          <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            {totalLeft > 0 ? (
              <>{totalLeft} seats left</>
            ) : (
              <span className="text-red-400">Sold Out</span>
            )}
          </span>
        </div>
      </div>

      <div className="divider !my-4" />

      <div className="text-center">
        {event.price === 0 ? (
          <span className="text-2xl font-display font-bold text-emerald-400">Free</span>
        ) : (
          <div>
            <span className="text-2xl font-display font-bold text-white">{formatCurrency(event.price)}</span>
            <span className="text-xs text-slate-400 ml-1">onwards</span>
          </div>
        )}
      </div>

      <div className="divider !my-4" />

      <div>
        <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Select Tickets</p>
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const remaining = ticket.totalQuantity - ticket.soldQuantity;
            const soldOut = remaining <= 0;
            const qty = selections[ticket._id] || 0;

            return (
              <div
                key={ticket._id}
                className={`glass-sm p-3 flex items-center justify-between gap-3 transition-all ${
                  soldOut ? 'opacity-40' : 'hover:border-primary-500/40'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{ticket.name}</p>
                  <p className="text-xs text-primary-300 font-semibold">
                    {ticket.price === 0 ? 'Free' : formatCurrency(ticket.price)}
                  </p>
                  <p className={`text-xs ${remaining < 10 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {soldOut ? 'Sold out' : `${remaining} left`}
                  </p>
                </div>
                {!soldOut && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectionChange(ticket._id, -1)}
                      disabled={qty === 0}
                      className="w-7 h-7 rounded-lg bg-surface-border hover:bg-primary-600/30 disabled:opacity-30 flex items-center justify-center transition-colors text-white text-sm"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-white">{qty}</span>
                    <button
                      onClick={() => onSelectionChange(ticket._id, 1)}
                      disabled={qty >= remaining || qty >= 10}
                      className="w-7 h-7 rounded-lg bg-surface-border hover:bg-primary-600/30 disabled:opacity-30 flex items-center justify-center transition-colors text-white text-sm"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {totalQuantity > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2 text-sm"
        >
          <div className="flex justify-between text-slate-400">
            <span>Subtotal ({totalQuantity} ticket{totalQuantity > 1 ? 's' : ''})</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Platform Fee</span>
            <span>{formatCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between font-display font-bold text-white text-base pt-2 border-t border-surface-border">
            <span>Total</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </motion.div>
      )}

      <button
        onClick={onContinue}
        disabled={soldOut || totalQuantity === 0}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
          soldOut
            ? 'bg-slate-600/30 text-slate-400 cursor-not-allowed'
            : totalQuantity === 0
            ? 'bg-surface-border text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-glow-sm hover:shadow-glow'
        }`}
      >
        {soldOut ? '🚫 Sold Out' : totalQuantity === 0 ? 'Select Tickets' : 'Continue Registration →'}
      </button>

      <div className="flex gap-2">
        <button
          onClick={handleWishlist}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all border ${
            wishlisted
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-surface-input border-surface-border text-slate-300 hover:border-red-500/30 hover:text-red-400'
          }`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
          {wishlisted ? 'Wishlisted' : 'Wishlist'}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-surface-input border border-surface-border text-slate-300 hover:border-primary-500/30 hover:text-primary-400 transition-all"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {!isAuth && !soldOut && (
        <p className="text-center text-xs text-slate-500">You'll be asked to sign in to complete registration</p>
      )}
    </motion.div>
  );
}
