import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
  hover: {
    y: -8,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export default function AuthModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleAttendee = (path) => {
    localStorage.setItem('selectedRole', 'attendee');
    onClose();
    navigate(path);
  };

  const handleOrganizer = (path) => {
    localStorage.setItem('selectedRole', 'organizer');
    onClose();
    navigate(path);
  };

  const handleAdmin = (path) => {
    localStorage.setItem('selectedRole', 'admin');
    onClose();
    navigate(path);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-8"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-8"
            >
              <Dialog.Panel className="w-full max-w-3xl bg-surface-card/90 backdrop-blur-2xl border border-surface-border/60 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-2xl font-display font-bold text-white">
                    Choose Your Experience
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-slate-400 mb-8 text-sm">
                  Continue as an attendee to discover events or as an organizer to create and manage events.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Attendee Card */}
                  <motion.div
                    custom={0}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    variants={cardVariants}
                    className="group relative overflow-hidden rounded-2xl border border-surface-border/60 bg-gradient-to-br from-primary-600/10 to-primary-900/20 p-6 backdrop-blur-xl cursor-pointer transition-colors hover:border-primary-500/40"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="text-4xl mb-4">👤</div>
                      <h3 className="text-xl font-display font-bold text-white mb-3">Attendee</h3>
                      <ul className="space-y-2 mb-6">
                        {['Browse events', 'Book tickets', 'Save favourites', 'View bookings', 'Download tickets'].map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleAttendee(`/login?role=attendee`)}
                          className="w-full py-3 px-6 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-all shadow-glow-sm hover:shadow-glow"
                        >
                          Continue as Attendee
                        </button>
                        <div className="flex gap-2 text-xs text-slate-500">
                          <button
                            onClick={() => handleAttendee(`/register?role=attendee`)}
                            className="flex-1 py-2 rounded-lg border border-surface-border hover:border-primary-500/40 hover:text-primary-300 transition-colors"
                          >
                            Register
                          </button>
                          <button
                            onClick={() => handleAttendee(`/login?role=attendee`)}
                            className="flex-1 py-2 rounded-lg border border-surface-border hover:border-primary-500/40 hover:text-primary-300 transition-colors"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Organizer Card */}
                  <motion.div
                    custom={1}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    variants={cardVariants}
                    className="group relative overflow-hidden rounded-2xl border border-surface-border/60 bg-gradient-to-br from-violet-600/10 to-violet-900/20 p-6 backdrop-blur-xl cursor-pointer transition-colors hover:border-violet-500/40"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="text-4xl mb-4">🎤</div>
                      <h3 className="text-xl font-display font-bold text-white mb-3">Organizer</h3>
                      <ul className="space-y-2 mb-6">
                        {['Create events', 'Sell tickets', 'Manage attendees', 'View analytics', 'Revenue dashboard'].map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleOrganizer(`/login?role=organizer`)}
                          className="w-full py-3 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-glow-sm hover:shadow-glow"
                        >
                          Continue as Organizer
                        </button>
                        <div className="flex gap-2 text-xs text-slate-500">
                          <button
                            onClick={() => handleOrganizer(`/register?role=organizer`)}
                            className="flex-1 py-2 rounded-lg border border-surface-border hover:border-violet-500/40 hover:text-violet-300 transition-colors"
                          >
                            Register
                          </button>
                          <button
                            onClick={() => handleOrganizer(`/login?role=organizer`)}
                            className="flex-1 py-2 rounded-lg border border-surface-border hover:border-violet-500/40 hover:text-violet-300 transition-colors"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Admin Card */}
                  <motion.div
                    custom={2}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    variants={cardVariants}
                    className="group relative overflow-hidden rounded-2xl border border-surface-border/60 bg-gradient-to-br from-red-600/10 to-red-900/20 p-6 backdrop-blur-xl cursor-pointer transition-colors hover:border-red-500/40"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="text-4xl mb-4">⚙️</div>
                      <h3 className="text-xl font-display font-bold text-white mb-3">Admin</h3>
                      <ul className="space-y-2 mb-6">
                        {['Manage users', 'Oversee events', 'Approvals', 'Platform reports', 'System settings'].map((item) => (
                          <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleAdmin(`/login?role=admin`)}
                          className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-all shadow-glow-sm hover:shadow-glow"
                        >
                          Continue as Admin
                        </button>
                        <div className="flex gap-2 text-xs text-slate-500">
                          <button
                            onClick={() => handleAdmin(`/login?role=admin`)}
                            className="flex-1 py-2 rounded-lg border border-surface-border hover:border-red-500/40 hover:text-red-300 transition-colors"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
