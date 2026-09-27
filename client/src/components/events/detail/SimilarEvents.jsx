import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetPublicEventsQuery } from '../../../features/events/eventsApi';
import { formatDate } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';
import { CalendarDaysIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';

export default function SimilarEvents({ event }) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const { data } = useGetPublicEventsQuery({ category: event.category, limit: 6 });
  const events = (data?.events || []).filter((e) => e._id !== event._id);

  if (events.length === 0) return null;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-white">Similar Events</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            className="w-8 h-8 rounded-lg bg-surface-border hover:bg-primary-600/30 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-8 h-8 rounded-lg bg-surface-border hover:bg-primary-600/30 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {events.map((evt) => {
          const remaining = evt.remainingSeats ?? (evt.maxParticipants ? Math.max(0, evt.maxParticipants - (evt.registrations || 0)) : null);
          return (
            <motion.div
              key={evt._id}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/events/${evt._id}`)}
              className="flex-shrink-0 w-72 glass hover:border-primary-500/40 transition-all duration-300 overflow-hidden cursor-pointer snap-start group"
            >
              <div className="relative h-36 overflow-hidden bg-surface-border">
                {(evt.poster || evt.bannerImage) ? (
                  <img src={evt.poster || evt.bannerImage} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-900/60 to-violet-900/60 flex items-center justify-center">
                    <CalendarDaysIcon className="w-10 h-10 text-primary-400/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {evt.category && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-600/80 text-white backdrop-blur-sm">
                    {evt.category}
                  </span>
                )}
              </div>

              <div className="p-3 space-y-2">
                <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-primary-300 transition-colors">
                  {evt.title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <CalendarDaysIcon className="w-3 h-3 text-primary-400 flex-shrink-0" />
                  <span>{formatDate(evt.startDate)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <UsersIcon className="w-3 h-3" />
                    <span>{remaining !== null ? `${remaining} left` : 'Open'}</span>
                  </div>
                  <span className="font-display font-bold text-primary-300 text-sm">
                    {evt.price === 0 ? 'Free' : formatCurrency(evt.price)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
