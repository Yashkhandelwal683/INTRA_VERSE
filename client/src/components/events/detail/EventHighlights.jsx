import { motion } from 'framer-motion';
import {
  Music, Mic, UtensilsCrossed, Gift, Camera,
  Gamepad2, Sparkles, Headphones, Star, Award,
  Users, BookOpen, Laptop, Coffee, Monitor,
  PenTool, TrendingUp, ChefHat, Zap,
} from 'lucide-react';

const iconMap = {
  Music, Mic, UtensilsCrossed, Gift, Camera,
  Gamepad2, Sparkles, Headphones, Star, Award,
  Users, BookOpen, Laptop, Coffee, Monitor,
  PenTool, TrendingUp, ChefHat, Zap,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4 } },
};

export default function EventHighlights({ highlights }) {
  if (!highlights || highlights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="font-display font-bold text-xl text-white mb-5">Event Highlights</h2>
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {highlights.map((h, i) => {
          const IconComp = iconMap[h.icon] || Star;
          return (
            <motion.div
              key={i}
              variants={item}
              whileHover={{ y: -4, scale: 1.03, boxShadow: '0 0 30px -5px rgba(99,102,241,0.3)' }}
              className="glass-sm p-5 text-center cursor-default group transition-all duration-300"
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary-500/20 to-violet-500/20 flex items-center justify-center group-hover:from-primary-500/30 group-hover:to-violet-500/30 transition-all duration-300">
                <IconComp className="w-7 h-7 text-primary-400 group-hover:text-primary-300 transition-colors" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-primary-300 transition-colors">{h.title}</h3>
              {h.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{h.description}</p>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
