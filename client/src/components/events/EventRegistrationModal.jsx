import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegisterForEventMutation } from '../../features/events/eventsApi';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function EventRegistrationModal({ event, isOpen, onClose }) {
  const [register, { isLoading }] = useRegisterForEventMutation();
  const isTeam = event?.eventType === 'team';
  const teamSize = event?.teamSize || 2;

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    teamName: '',
    members: Array.from({ length: teamSize }, () => ({ name: '', email: '', phone: '' })),
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleMemberChange = (idx, field, value) => {
    const members = [...form.members];
    members[idx] = { ...members[idx], [field]: value };
    setForm((prev) => ({ ...prev, members }));
  };

  const validate = () => {
    const errs = {};
    if (!isTeam) {
      if (!form.name.trim()) errs.name = 'Name is required';
      if (!form.email.trim()) errs.email = 'Email is required';
    } else {
      if (!form.teamName.trim()) errs.teamName = 'Team name is required';
      form.members.forEach((m, i) => {
        if (!m.name.trim()) errs[`m${i}name`] = 'Required';
        if (!m.email.trim()) errs[`m${i}email`] = 'Required';
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = isTeam
      ? { teamName: form.teamName.trim(), members: form.members.map((m) => ({ name: m.name.trim(), email: m.email.trim(), phone: m.phone.trim() })) }
      : { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() };

    try {
      await register({ id: event._id, data: payload }).unwrap();
      toast.success(isTeam ? 'Team registered successfully!' : 'Registration successful!');
      onClose();
      setForm({
        name: '', email: '', phone: '', teamName: '',
        members: Array.from({ length: teamSize }, () => ({ name: '', email: '', phone: '' })),
      });
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#12121a] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-[#12121a] z-10 flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isTeam ? '👥 Team Registration' : '👤 Solo Registration'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">{event?.title}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {isTeam && (
                <div>
                  <label className="label">Team Name <span className="text-red-400">*</span></label>
                  <input
                    type="text" value={form.teamName} onChange={(e) => handleChange('teamName', e.target.value)}
                    placeholder="Enter your team name"
                    className={`input ${errors.teamName ? 'input-error' : ''}`}
                  />
                  {errors.teamName && <p className="error-msg">{errors.teamName}</p>}
                </div>
              )}

              {!isTeam ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Full Name <span className="text-red-400">*</span></label>
                    <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Your name" className={`input ${errors.name ? 'input-error' : ''}`} />
                    {errors.name && <p className="error-msg">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="label">Email <span className="text-red-400">*</span></label>
                    <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="your@email.com" className={`input ${errors.email ? 'input-error' : ''}`} />
                    {errors.email && <p className="error-msg">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <input type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+91 98765 43210" className="input" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">Team Size: <span className="text-white font-semibold">{teamSize}</span></p>
                  {Array.from({ length: teamSize }).map((_, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-xs font-medium text-zinc-400 mb-2">Member {idx + 1}{idx === 0 ? ' (Leader)' : ''}</p>
                      <div className="space-y-2">
                        <input type="text" value={form.members[idx]?.name || ''} onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                          placeholder="Full name" className={`input text-sm ${errors[`m${idx}name`] ? 'input-error' : ''}`} />
                        <input type="email" value={form.members[idx]?.email || ''} onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                          placeholder="Email" className={`input text-sm ${errors[`m${idx}email`] ? 'input-error' : ''}`} />
                        <input type="tel" value={form.members[idx]?.phone || ''} onChange={(e) => handleMemberChange(idx, 'phone', e.target.value)}
                          placeholder="Phone (optional)" className="input text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {event?.price > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm text-center">
                  {isTeam ? (
                    <>
                      💰 Ticket Price: ₹{event.price.toLocaleString('en-IN')} per member
                      <div className="mt-1 text-amber-200">
                        Total for {teamSize} member{teamSize > 1 ? 's' : ''}: ₹{(event.price * teamSize).toLocaleString('en-IN')}
                      </div>
                    </>
                  ) : (
                    <>💰 Ticket Price: ₹{event.price.toLocaleString('en-IN')}</>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registering...
                  </span>
                ) : (
                  `✅ ${isTeam ? 'Register Team' : 'Register Now'}`
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
