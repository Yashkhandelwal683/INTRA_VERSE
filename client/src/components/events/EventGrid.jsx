import EventCard from './EventCard';
import Spinner from '../ui/Spinner';

export default function EventGrid({ events = [], isLoading, error }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass overflow-hidden animate-pulse">
            <div className="h-44 skeleton rounded-t-2xl" />
            <div className="p-4 space-y-3">
              <div className="skeleton h-5 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-4 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-red-400">Failed to load events. Please try again.</p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="glass p-16 text-center">
        <div className="text-5xl mb-4">🎭</div>
        <h3 className="text-lg font-semibold text-white mb-2">No events found</h3>
        <p className="text-slate-400">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {events.map((event) => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
}
