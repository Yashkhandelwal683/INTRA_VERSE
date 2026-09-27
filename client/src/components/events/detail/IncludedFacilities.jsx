import { motion } from 'framer-motion';
import {
  Car, UtensilsCrossed, Wifi, Accessibility, HeartPulse,
  Camera, ShieldCheck, BatteryCharging, Bath, CheckCircle,
} from 'lucide-react';

const iconMap = {
  Car, UtensilsCrossed, Wifi, Accessibility, HeartPulse,
  Camera, ShieldCheck, BatteryCharging, Bath, CheckCircle,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
};

export default function IncludedFacilities({ facilities }) {
  if (!facilities || facilities.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="font-display font-bold text-xl text-white mb-5">Included Facilities</h2>
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
      >
        {facilities.map((f, i) => {
          const IconComp = iconMap[f.icon] || CheckCircle;
          return (
            <motion.div
              key={i}
              variants={item}
              whileHover={{ scale: 1.05, y: -2 }}
              className="glass-sm p-4 text-center cursor-default group"
            >
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <IconComp className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-300 font-medium">{f.name}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
