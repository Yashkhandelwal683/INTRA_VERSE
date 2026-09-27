import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';

export default function LocationMap({ event }) {
  const venue = event.venue;
  const address = venue
    ? [venue.name, venue.address, venue.city, venue.state, venue.country].filter(Boolean).join(', ')
    : event.location || '';

  const mapQuery = venue?.lat && venue?.lng
    ? `${venue.lat},${venue.lng}`
    : encodeURIComponent(address);

  const directionsUrl = venue?.lat && venue?.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

  if (!address) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass overflow-hidden"
    >
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-accent-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-white">Location</h2>
        </div>
      </div>

      <div className="relative h-64 md:h-80 mx-4 mb-4 rounded-xl overflow-hidden bg-surface-border">
        <iframe
          src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Event Location"
          className="grayscale-[30%] hover:grayscale-0 transition-all duration-500"
        />
      </div>

      <div className="px-6 pb-6 space-y-4">
        <div>
          {venue?.name && <p className="font-semibold text-white text-sm">{venue.name}</p>}
          <p className="text-sm text-slate-400">{address}</p>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-white text-sm font-medium transition-all shadow-md hover:shadow-lg"
        >
          <Navigation className="w-4 h-4" />
          Navigate Here
        </a>
      </div>
    </motion.div>
  );
}
