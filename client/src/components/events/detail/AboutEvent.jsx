import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, BookOpen } from 'lucide-react';

export default function AboutEvent({ event }) {
  const [expanded, setExpanded] = useState(false);
  const description = event.description || '';
  const isLong = description.length > 400;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass p-6 md:p-8"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-400" />
        </div>
        <h2 className="font-display font-bold text-xl text-white">About This Event</h2>
      </div>

      <div className="relative">
        <AnimatePresence initial={false}>
          <motion.div
            key={expanded ? 'expanded' : 'collapsed'}
            initial={{ height: expanded ? 'auto' : 200 }}
            animate={{ height: expanded ? 'auto' : 200 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="text-slate-300 leading-relaxed space-y-4 whitespace-pre-line text-sm">
              {description}
            </div>
          </motion.div>
        </AnimatePresence>

        {isLong && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface-card to-transparent" />
        )}
      </div>

      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
        >
          {expanded ? 'Show Less' : 'Read More'}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>
      )}

      {event.shortDescription && event.shortDescription !== event.description && (
        <div className="mt-5 p-4 glass-sm rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Quick Summary</p>
          <p className="text-sm text-slate-300">{event.shortDescription}</p>
        </div>
      )}
    </motion.div>
  );
}
