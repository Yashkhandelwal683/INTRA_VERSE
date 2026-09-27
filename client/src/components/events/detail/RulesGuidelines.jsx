import { motion } from 'framer-motion';
import { ShieldAlert, Ban, IdCard, XCircle, ClipboardList, AlertTriangle } from 'lucide-react';

const iconMap = {
  Ban, IdCard, XCircle, ClipboardList, AlertTriangle, ShieldAlert,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export default function RulesGuidelines({ rules }) {
  if (!rules || rules.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <h2 className="font-display font-bold text-xl text-white">Rules & Guidelines</h2>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="space-y-2"
      >
        {rules.map((rule, i) => {
          const IconComp = iconMap[rule.icon] || AlertTriangle;
          return (
            <motion.div
              key={i}
              variants={item}
              className="flex items-center gap-3 p-3 glass-sm hover:border-red-500/20 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <IconComp className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-sm text-slate-300">{rule.text}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
