import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDaysIcon, EnvelopeIcon, PaperAirplaneIcon, HeartIcon } from '@heroicons/react/24/outline';

const QUICK_LINKS = [
  { to: '/events', label: 'Browse Events' },
  { to: '/login?role=organizer', label: 'Become Organizer' },
  { to: '/auth/login', label: 'Sign In' },
  { to: '/auth/register', label: 'Create Account' },
];

const SUPPORT = [
  { to: '#', label: 'Help Center' },
  { to: '#', label: 'Contact Us' },
  { to: '#', label: 'Privacy Policy' },
  { to: '#', label: 'Terms of Service' },
];

const SOCIAL_LINKS = [
  { label: 'Twitter', icon: '𝕏', href: '#' },
  { label: 'LinkedIn', icon: 'in', href: '#' },
  { label: 'Instagram', icon: '📷', href: '#' },
  { label: 'GitHub', icon: 'GH', href: 'https://github.com/ShubhamChaudhary0/bridgelabz-event-management-ticket-booking-system' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-surface-card border-t border-surface-border mt-auto">
      <div className="container-app py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand + Newsletter */}
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-glow-sm">
                <CalendarDaysIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl gradient-text">Event Fiesta</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              Discover, create, and manage unforgettable events. Your all-in-one platform for event management and ticket booking.
            </p>

            {/* Newsletter */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Stay in the loop</h4>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <div className="relative flex-1">
                  <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-input border border-surface-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-all flex-shrink-0"
                >
                  {subscribed ? (
                    <span className="text-xs">✓</span>
                  ) : (
                    <PaperAirplaneIcon className="w-4 h-4" />
                  )}
                </button>
              </form>
              {subscribed && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-emerald-400 mt-2"
                >
                  Thanks for subscribing!
                </motion.p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-white mb-5 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-white mb-5 uppercase tracking-wider">Support</h4>
            <ul className="space-y-3">
              {SUPPORT.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.to}
                    className="text-sm text-slate-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-white mb-5 uppercase tracking-wider">Connect</h4>
            <div className="flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-surface-input border border-surface-border flex items-center justify-center text-sm text-slate-400 hover:border-primary-500/40 hover:text-primary-300 hover:bg-primary-600/10 transition-all"
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="divider mt-12 mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 text-center lg:text-left">
            © 2026 Event Fiesta. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            Made with <HeartIcon className="w-3 h-3 text-red-400" /> by the Event Fiesta team
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Privacy</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Terms</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
