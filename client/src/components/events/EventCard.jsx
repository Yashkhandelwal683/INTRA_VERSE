import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDaysIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../utils/formatDate';
import Badge from '../ui/Badge';
import EventRegistrationModal from './EventRegistrationModal';

const categoryColors = {
  music:       'primary',
  tech:        'success',
  sports:      'accent',
  food:        'warning',
  art:         'neutral',
  business:    'primary',
  education:   'success',
  default:     'neutral',
};

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  if (!event) return null;

  const priceDisplay = event.price === 0 ? 'Free' : `₹${event.price.toLocaleString('en-IN')}`;
  const remaining = event.remainingSeats !== null && event.remainingSeats !== undefined
    ? event.remainingSeats
    : event.maxParticipants
      ? event.maxParticipants - (event.registrations || 0)
      : null;
  const soldOut = remaining !== null && remaining <= 0;

  const color = categoryColors[event.category?.toLowerCase()] ?? categoryColors.default;

  return (
    <>
      <div className="group glass hover:border-primary-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow overflow-hidden flex flex-col">
        <div className="relative h-44 overflow-hidden rounded-t-2xl bg-surface-border">
          {(event.poster || event.bannerImage) ? (
            <img src={event.poster || event.bannerImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-900/60 to-violet-900/60 flex items-center justify-center">
              <CalendarDaysIcon className="w-12 h-12 text-primary-400/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            {event.eventType === 'team' && <Badge variant="primary">👥 Team</Badge>}
            {event.eventType === 'solo' && <Badge variant="neutral">👤 Solo</Badge>}
            {soldOut && <Badge variant="danger">Sold Out</Badge>}
          </div>
          {event.category && (
            <div className="absolute top-3 right-3">
              <Badge variant={color}>{event.category}</Badge>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="font-display font-semibold text-white line-clamp-2 group-hover:text-primary-300 transition-colors">
            {event.title}
          </h3>

          <div className="flex flex-col gap-1.5 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <CalendarDaysIcon className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
              <span>{formatDate(event.startDate)}</span>
            </div>
            {(event.location || event.venue?.city || event.venue?.name) && (
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-accent-400 flex-shrink-0" />
                <span className="truncate">{event.location || event.venue?.city || event.venue?.name}</span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-3 border-t border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <UsersIcon className="w-3.5 h-3.5" />
              <span>{remaining !== null ? `${remaining} left` : 'Open'}</span>
            </div>
            <span className="font-display font-bold text-primary-300 text-sm">{priceDisplay}</span>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              navigate(`/events/${event._id}`);
            }}
            disabled={soldOut}
            className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {soldOut ? 'Sold Out' : 'Register Now'}
          </button>
        </div>
      </div>

      <EventRegistrationModal event={event} isOpen={showRegister} onClose={() => setShowRegister(false)} />
    </>
  );
}
