import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGetEventByIdQuery } from '../features/events/eventsApi';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import CountdownTimer from '../components/events/CountdownTimer';
import EventDetailSkeleton from '../components/events/detail/EventDetailSkeleton';
import HeroCarousel from '../components/events/detail/HeroCarousel';
import StickyBookingCard from '../components/events/detail/StickyBookingCard';
import EventInfoCards from '../components/events/detail/EventInfoCards';
import AboutEvent from '../components/events/detail/AboutEvent';
import EventHighlights from '../components/events/detail/EventHighlights';
import EventScheduleTimeline from '../components/events/detail/EventScheduleTimeline';
import Gallery from '../components/events/detail/Gallery';
import LocationMap from '../components/events/detail/LocationMap';
import OrganizerSection from '../components/events/detail/OrganizerSection';
import AvailableTickets from '../components/events/detail/AvailableTickets';
import IncludedFacilities from '../components/events/detail/IncludedFacilities';
import RulesGuidelines from '../components/events/detail/RulesGuidelines';
import FAQs from '../components/events/detail/FAQs';
import Reviews from '../components/events/detail/Reviews';
import SimilarEvents from '../components/events/detail/SimilarEvents';
import MobileBookingBar from '../components/events/detail/MobileBookingBar';
import RegistrationDrawer from '../components/events/detail/RegistrationDrawer';

export default function EventDetailPremium() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuth } = useAuth();
  const { data: event, isLoading, error } = useGetEventByIdQuery(id);
  useSocket();

  const [selections, setSelections] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`sel_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showDrawer, setShowDrawer] = useState(false);

  const handleSelectionChange = useCallback((ticketId, delta) => {
    setSelections((prev) => {
      const current = prev[ticketId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [ticketId]: next };
    });
  }, []);

  const handleContinue = useCallback(() => {
    const totalQuantity = Object.values(selections).reduce((s, q) => s + q, 0);
    if (totalQuantity === 0) return;

    if (!isAuth) {
      try { sessionStorage.setItem(`sel_${id}`, JSON.stringify(selections)); } catch { /* ignore */ }
      navigate(`/register?next=/events/${id}`);
      return;
    }

    try { sessionStorage.removeItem(`sel_${id}`); } catch { /* ignore */ }
    setShowDrawer(true);
  }, [selections, isAuth, id, navigate]);

  if (isLoading) return <EventDetailSkeleton />;

  if (error || !event) {
    return (
      <div className="container-app py-20 text-center">
        <div className="glass p-8 max-w-md mx-auto">
          <div className="text-5xl mb-4">😢</div>
          <h2 className="font-display font-bold text-xl text-white mb-2">Event Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Link to="/events" className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all">
            ← Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const tickets = event.ticketTypes || [];
  const totalLeft = tickets.reduce((s, t) => s + (t.totalQuantity - t.soldQuantity), 0);
  const soldOut = tickets.length > 0 && totalLeft <= 0;
  const totalQuantity = Object.values(selections).reduce((s, q) => s + q, 0);

  return (
    <div className="min-h-screen pb-24 lg:pb-10">
      <div className="container-app py-6 lg:py-10">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-slate-500 mb-6"
        >
          <Link to="/events" className="hover:text-primary-400 transition-colors">Events</Link>
          <span>/</span>
          <span className="text-slate-300 truncate">{event.title}</span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Carousel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <HeroCarousel event={event} />
            </motion.div>

            {/* Title + Countdown (visible on mobile, hidden on desktop since sticky card shows it) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:hidden"
            >
              <h1 className="font-display font-black text-2xl md:text-3xl text-white mb-2">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                {event.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-600/20 text-primary-300 border border-primary-600/30">
                    {event.category}
                  </span>
                )}
                {event.startDate && new Date(event.startDate) > new Date() && (
                  <CountdownTimer targetDate={event.startDate} />
                )}
              </div>
            </motion.div>

            {/* Event Info Cards */}
            <EventInfoCards event={event} />

            {/* About Event */}
            <AboutEvent event={event} />

            {/* Event Highlights */}
            <EventHighlights highlights={event.highlights} />

            {/* Event Schedule */}
            <EventScheduleTimeline schedule={event.schedule} />

            {/* Gallery */}
            <Gallery gallery={event.gallery} title={event.title} />

            {/* Available Tickets */}
            <AvailableTickets
              tickets={tickets}
              selections={selections}
              onSelectionChange={handleSelectionChange}
            />

            {/* Included Facilities */}
            <IncludedFacilities facilities={event.facilities} />

            {/* Location */}
            <LocationMap event={event} />

            {/* Organizer */}
            <OrganizerSection event={event} />

            {/* Rules & Guidelines */}
            <RulesGuidelines rules={event.rules} />

            {/* FAQs */}
            <FAQs faqs={event.faqs} />

            {/* Reviews */}
            <Reviews eventId={id} eventRating={event.rating} />

            {/* Similar Events */}
            <SimilarEvents event={event} />
          </div>

          {/* Right Sidebar - Desktop Sticky Booking Card */}
          <div className="hidden lg:block">
            <StickyBookingCard
              event={event}
              tickets={tickets}
              selections={selections}
              onSelectionChange={handleSelectionChange}
              onContinue={handleContinue}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Booking Bar */}
      <div className="lg:hidden">
        <MobileBookingBar
          totalAmount={tickets.reduce((sum, t) => sum + (selections[t._id] || 0) * t.price, 0)}
          totalQuantity={totalQuantity}
          onContinue={handleContinue}
          soldOut={soldOut}
        />
      </div>

      {/* Registration Drawer */}
      <RegistrationDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        event={event}
        tickets={tickets}
        selections={selections}
      />
    </div>
  );
}
