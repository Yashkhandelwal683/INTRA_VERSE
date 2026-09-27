import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Heart, CalendarDays, MapPin, IndianRupee, Trash2, ArrowUpRight,
  SearchX, Flame, Bookmark,
} from 'lucide-react';

import { useGetWishlistQuery, useRemoveFromWishlistMutation } from '../../features/wishlist/wishlistApi';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Panel, Skeleton } from '../../components/attendee/Panel';
import { SearchField, Pager } from '../../components/attendee/Controls';
import EmptyState from '../../components/attendee/EmptyState';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function CapacityBar({ capacity, sold }) {
  const total = capacity || 0;
  if (!total) return null;

  const ratio = Math.min(1, (sold || 0) / total);
  const nearlyFull = ratio >= 0.8 && ratio < 1;
  const soldOut = ratio >= 1;

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px]">
        <span className="font-medium text-zinc-500">
          {total - (sold || 0)} of {total} spots left
        </span>
        <span className="font-bold tabular-nums text-zinc-600">{Math.round(ratio * 100)}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full bg-gradient-to-r ${
            soldOut
              ? 'from-red-500 to-rose-500'
              : nearlyFull
                ? 'from-amber-400 to-orange-500'
                : 'from-mint-400 to-mint-600'
          }`}
        />
      </div>
    </div>
  );
}

export default function Wishlist() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useGetWishlistQuery({ page, limit: 20 });
  const [removeFromWishlist, { isLoading: removing }] = useRemoveFromWishlistMutation();

  const items = data?.items || [];
  const pagination = data?.pagination;

  const filtered = items.filter((w) => {
    const term = searchTerm.toLowerCase();
    return (
      w.event?.title?.toLowerCase().includes(term) ||
      w.event?.category?.toLowerCase().includes(term)
    );
  });

  const handleRemove = async (eventId) => {
    try {
      await removeFromWishlist(eventId).unwrap();
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error(err?.data?.message ?? 'Failed to remove');
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-10">
      {/* Header */}
      <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="panel-label mb-1.5">Saved For Later</p>
          <h1 className="font-display text-3xl font-black tracking-tight text-white">My Wishlist</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            {isLoading
              ? 'Loading your saved events…'
              : `${items.length} event${items.length === 1 ? '' : 's'} you're keeping an eye on.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => refetch()} className="btn-quiet" disabled={isFetching}>
            <Bookmark className="h-3.5 w-3.5" />
            {isFetching ? 'Syncing' : `${items.length} saved`}
          </button>
          <Link to="/events" className="btn-mint btn-mint-sm">
            Browse more
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex justify-end">
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Search saved events…" />
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={searchTerm ? SearchX : Heart}
          title={searchTerm ? 'No matching events' : 'Your wishlist is empty'}
          description={
            searchTerm
              ? 'Try a different title or category.'
              : 'Browse events and tap the heart on anything you want to remember. We will keep it here for you.'
          }
          action={!searchTerm ? { label: 'Browse Events', to: '/events' } : null}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => {
            const ev = w.event || {};
            const spotsLeft = (ev.totalCapacity || 0) - (ev.soldCount || 0);
            const soldOut = ev.totalCapacity > 0 && spotsLeft <= 0;

            return (
              <motion.div
                key={w._id}
                variants={item}
                layout
                className="panel group overflow-hidden transition-all duration-300 hover:border-mint-500/25"
              >
                {/* Cover */}
                <div className="relative h-36 overflow-hidden bg-gradient-to-br from-mint-800/50 to-teal-900/50">
                  {ev.poster || ev.bannerImage ? (
                    <img
                      src={ev.poster || ev.bannerImage}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <CalendarDays className="h-9 w-9 text-mint-400/30" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#08110f] via-[#08110f]/25 to-transparent" />

                  {ev.category && (
                    <span className="chip absolute left-3 top-3 border-mint-500/30 bg-mint-500/20 capitalize text-mint-200 backdrop-blur-sm">
                      {ev.category}
                    </span>
                  )}

                  {soldOut && (
                    <span className="chip absolute right-3 top-3 border-red-500/30 bg-red-500/20 text-red-200 backdrop-blur-sm">
                      Sold out
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemove(ev._id)}
                    disabled={removing}
                    aria-label="Remove from wishlist"
                    className="absolute right-3 top-3 rounded-lg border border-white/[0.08] bg-black/50 p-1.5 text-zinc-300 opacity-0 backdrop-blur-sm transition-all hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Body */}
                <div className="space-y-3 p-4">
                  <div>
                    <Link
                      to={`/events/${ev._id}`}
                      className="line-clamp-2 font-display text-sm font-bold leading-snug text-white transition-colors hover:text-mint-300"
                    >
                      {ev.title || 'Untitled Event'}
                    </Link>
                    {ev.description && (
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-[11px] text-zinc-400">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <CalendarDays className="h-3 w-3 shrink-0 text-zinc-600" />
                      <span className="truncate">{ev.startDate ? formatDate(ev.startDate, 'dd MMM yyyy') : 'TBD'}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0 text-zinc-600" />
                      <span className="truncate">{ev.location || ev.venue?.name || 'Online'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
                    <span className="flex items-center gap-1.5 text-sm">
                      <IndianRupee className="h-3.5 w-3.5 text-zinc-600" />
                      <span className="font-display font-bold text-mint-300">
                        {ev.price === 0 ? 'Free' : formatCurrency(ev.price)}
                      </span>
                    </span>
                    {ev.totalCapacity > 0 && !soldOut && spotsLeft <= 20 && (
                      <span className="chip border-amber-500/25 bg-amber-500/10 text-amber-300">
                        <Flame className="h-3 w-3" />
                        {spotsLeft} left
                      </span>
                    )}
                  </div>

                  <CapacityBar capacity={ev.totalCapacity} sold={ev.soldCount} />

                  <div className="flex items-center gap-2 pt-1">
                    <Link to={`/events/${ev._id}`} className="btn-mint btn-mint-sm flex-1">
                      View event
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(ev._id)}
                      disabled={removing}
                      aria-label="Remove from wishlist"
                      className="btn-quiet border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Pager page={page} totalPages={pagination?.totalPages} onChange={setPage} />
    </motion.div>
  );
}
