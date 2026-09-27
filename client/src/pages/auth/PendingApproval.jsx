import { motion } from 'framer-motion';
import { ClockIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-hero-glow bg-surface">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6"
        >
          <ClockIcon className="w-10 h-10 text-amber-400" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white font-display mb-3">Account Pending Approval</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Thank you for registering as an organizer! Your account is currently under review by our team.
          You'll receive a notification once your account has been approved. This usually takes 24-48 hours.
        </p>

        <div className="glass p-5 rounded-xl mb-8 text-left space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">What happens next?</p>
          <ul className="space-y-2">
            {[
              'Our admin team reviews your application',
              'You get a notification when approved/rejected',
              'Once approved, you can log in and start creating events',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-primary-500/10 text-primary-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => navigate('/login?role=organizer')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-all"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Login
        </button>
      </motion.div>
    </div>
  );
}
