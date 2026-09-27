import { useState, useEffect, Fragment } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useGetNotificationsQuery, useMarkAsReadMutation, useMarkAllAsReadMutation } from '../../features/notifications/notificationsApi';
import { Menu, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon, XMarkIcon, CalendarDaysIcon,
  UserCircleIcon, Squares2X2Icon, BellIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import AuthModal from '../Auth/AuthModal';

const navLinks = [
  { to: '/',       label: 'Home'   },
  { to: '/events', label: 'Events' },
];

const TYPE_EMOJIS = {
  new_booking: '🎟️', refund: '💰', cancellation: '❌', review: '⭐',
  payment_failed: '⚠️', new_registration: '📝', event_reminder: '🔔',
  ticket_checked_in: '✅', event_update: '📢', organizer_approved: '🎉',
  organizer_rejected: '😞',
};

export default function Navbar() {
  const { user, isAuth, isOrganizer, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const { data: notifData } = useGetNotificationsQuery(
    { limit: 20 },
    { skip: !isAuth }
  );
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => setAuthModalOpen(false);

  const dashboardLink = isAdmin ? '/admin' : isOrganizer ? '/organizer/dashboard' : '/dashboard';

  const handleNotifClick = async (notif) => {
    if (!notif.isRead) {
      try { await markAsRead(notif._id).unwrap(); } catch {}
    }
    setBellOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-surface/80 backdrop-blur-2xl border-b border-surface-border/60 shadow-card'
            : 'bg-transparent'
        }`}
      >
        <div className="container-app">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
                <CalendarDaysIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl gradient-text">Event Fiesta</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-600/20 text-primary-300 shadow-glow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {!isAuth ? (
                <button onClick={openAuthModal} className="btn-sm btn-primary">Get Started</button>
              ) : (
                <>
                  <Link to={dashboardLink} className="btn-sm btn-secondary gap-1.5">
                    <Squares2X2Icon className="w-4 h-4" /> Dashboard
                  </Link>

                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setBellOpen(!bellOpen)}
                      className="relative p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                    >
                      <BellIcon className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-500 text-[10px] font-bold text-white flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {bellOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden glass-sm shadow-card z-50"
                          >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
                              <span className="text-sm font-semibold text-white">Notifications</span>
                              {unreadCount > 0 && (
                                <button
                                  onClick={async () => { try { await markAllAsRead().unwrap(); } catch {} }}
                                  className="text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
                                >
                                  Mark all read
                                </button>
                              )}
                            </div>
                            <div className="overflow-y-auto max-h-72 divide-y divide-surface-border/50">
                              {notifications.length === 0 ? (
                                <div className="p-6 text-center">
                                  <BellIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                                  <p className="text-xs text-zinc-500">No notifications yet</p>
                                </div>
                              ) : (
                                notifications.slice(0, 10).map((notif) => (
                                  <button
                                    key={notif._id}
                                    onClick={() => handleNotifClick(notif)}
                                    className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors ${
                                      !notif.isRead ? 'bg-primary-600/5' : ''
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <span className="text-sm mt-0.5 flex-shrink-0">
                                        {TYPE_EMOJIS[notif.type] || '📌'}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <p className={`text-xs truncate ${notif.isRead ? 'text-slate-400' : 'text-white font-medium'}`}>
                                            {notif.title}
                                          </p>
                                          {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />}
                                        </div>
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{notif.message}</p>
                                        <p className="text-[9px] text-slate-600 mt-0.5">
                                          {new Date(notif.createdAt).toLocaleString('en-IN', {
                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                            {notifications.length > 0 && (
                              <div className="border-t border-surface-border p-2">
                                <button
                                  onClick={() => { setBellOpen(false); navigate(isAdmin ? '/admin' : isOrganizer ? '/organizer/notifications' : '/dashboard'); }}
                                  className="w-full text-center text-xs text-primary-400 hover:text-primary-300 py-2 rounded-lg hover:bg-white/[0.03] transition-all"
                                >
                                  View all notifications
                                </button>
                              </div>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-500/50" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-sm font-semibold text-white">
                          {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <span className="text-sm text-slate-300 max-w-[120px] truncate">{user?.name}</span>
                    </Menu.Button>

                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 mt-2 w-48 glass-sm shadow-card focus:outline-none overflow-hidden">
                        <div className="py-1">
                          <Menu.Item>
                            {({ active }) => (
                              <Link to="/profile" className={`flex items-center gap-2.5 px-4 py-2.5 text-sm ${active ? 'bg-white/5 text-white' : 'text-slate-300'}`}>
                                <UserCircleIcon className="w-4 h-4" /> My Profile
                              </Link>
                            )}
                          </Menu.Item>
                          <div className="border-t border-surface-border my-1" />
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={logout}
                                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 ${active ? 'bg-red-500/10' : ''}`}
                              >
                                Sign Out
                              </button>
                            )}
                          </Menu.Item>
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-xl hover:bg-white/5 text-slate-300"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-surface-border bg-surface/95 backdrop-blur-2xl animate-slide-down">
            <div className="container-app py-4 flex flex-col gap-1">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl text-sm font-medium ${isActive ? 'bg-primary-600/20 text-primary-300' : 'text-slate-300'}`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <div className="border-t border-surface-border my-2" />
              {!isAuth ? (
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setMobileOpen(false); openAuthModal(); }} className="btn-md btn-secondary">Sign In</button>
                  <button onClick={() => { setMobileOpen(false); openAuthModal(); }} className="btn-md btn-primary">Get Started</button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to={dashboardLink} onClick={() => setMobileOpen(false)} className="btn-md btn-secondary">Dashboard</Link>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="btn-md btn-secondary">Profile</Link>
                  {unreadCount > 0 && (
                    <span className="px-4 py-2 text-xs text-primary-400">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</span>
                  )}
                  <button onClick={() => { logout(); setMobileOpen(false); }} className="btn-md btn-danger">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.header>

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} />
    </>
  );
}
