import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

export default function EventScheduleTimeline({ schedule }) {
  if (!schedule || schedule.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-violet-400" />
        </div>
        <h2 className="font-display font-bold text-xl text-white">Event Schedule</h2>
      </div>

      <div className="relative pl-8">
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-500 via-violet-500 to-accent-500 rounded-full" />

        <div className="space-y-1">
          {schedule.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative group"
            >
              <div className="absolute -left-[1.85rem] top-4 w-3 h-3 rounded-full bg-primary-500 border-2 border-surface-card group-hover:scale-125 transition-transform z-10" />

              <div className="glass-sm p-4 mb-3 hover:border-primary-500/30 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <span className="inline-block px-3 py-1 rounded-lg bg-primary-500/10 text-primary-300 text-xs font-bold font-display tracking-wide">
                      {item.time}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm mb-0.5 group-hover:text-primary-300 transition-colors">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
