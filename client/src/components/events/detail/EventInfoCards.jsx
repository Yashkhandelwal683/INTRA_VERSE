import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Tag, Mic, Ticket } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function EventInfoCards({ event }) {
  const totalLeft = event.remainingSeats ?? (event.maxParticipants ? Math.max(0, event.maxParticipants - (event.registrations || 0)) : null);

  const cards = [
    {
      icon: <Calendar className="w-5 h-5" />,
      label: 'Date',
      value: formatDate(event.startDate, 'EEE, MMM dd yyyy'),
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'Time',
      value: `${formatDate(event.startDate, 'hh:mm a')} - ${formatDate(event.endDate, 'hh:mm a')}`,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      label: 'Venue',
      value: event.venue?.name || event.location || 'TBA',
      color: 'text-accent-400',
      bg: 'bg-accent-500/10',
    },
    {
      icon: <Ticket className="w-5 h-5" />,
      label: 'Event Type',
      value: event.eventType === 'team' ? `Team (${event.teamSize || '?'} members)` : 'Individual',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Capacity',
      value: totalLeft !== null ? `${totalLeft} of ${event.maxParticipants} left` : 'Open',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: <Tag className="w-5 h-5" />,
      label: 'Category',
      value: event.category?.charAt(0).toUpperCase() + event.category?.slice(1) || 'Other',
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
    },
    ...(event.organizer
      ? [
          {
            icon: <Mic className="w-5 h-5" />,
            label: 'Organizer',
            value: event.organizer.organizationName || event.organizer.name || 'EventPro',
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
          },
        ]
      : []),
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          whileHover={{ y: -2, scale: 1.02 }}
          className="glass-sm p-4 flex items-start gap-3 cursor-default"
        >
          <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color} flex-shrink-0`}>
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{card.label}</p>
            <p className="text-sm text-white font-medium truncate">{card.value}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
