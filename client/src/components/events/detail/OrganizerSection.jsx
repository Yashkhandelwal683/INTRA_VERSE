import { motion } from 'framer-motion';
import { BadgeCheck, Star, Calendar, Users, UserPlus } from 'lucide-react';

export default function OrganizerSection({ event }) {
  const organizer = event.organizer;
  const details = event.organizerDetails;

  if (!organizer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass p-6"
    >
      <h2 className="font-display font-bold text-xl text-white mb-5">Organized By</h2>

      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
          {organizer.avatar ? (
            <img src={organizer.avatar} alt={organizer.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-display font-bold text-white">
              {(organizer.name || 'O').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">
              {organizer.organizationName || organizer.name}
            </h3>
            <BadgeCheck className="w-5 h-5 text-primary-400 flex-shrink-0" />
          </div>

          {organizer.aboutOrganization && (
            <p className="text-sm text-slate-400 line-clamp-2 mb-3">{organizer.aboutOrganization}</p>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            {details?.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-white font-medium">{details.rating.toFixed(1)}</span>
                <span>rating</span>
              </div>
            )}
            {details?.totalEvents > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-white font-medium">{details.totalEvents}</span>
                <span>events</span>
              </div>
            )}
            {details?.followers > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-white font-medium">{details.followers.toLocaleString()}</span>
                <span>followers</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button className="flex-1 py-2.5 rounded-xl bg-primary-600/20 border border-primary-600/30 text-primary-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary-600/30 transition-all">
          <UserPlus className="w-4 h-4" />
          Follow
        </button>
        <button className="flex-1 py-2.5 rounded-xl bg-surface-input border border-surface-border text-slate-300 text-sm font-medium flex items-center justify-center gap-2 hover:border-primary-500/30 hover:text-primary-400 transition-all">
          View Profile
        </button>
      </div>
    </motion.div>
  );
}
