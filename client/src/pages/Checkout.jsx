import { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetEventByIdQuery } from '../features/events/eventsApi';
import { useAuth } from '../hooks/useAuth';
import useRegistrationStore from '../store/registrationStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';
import {
  UserCircleIcon, UsersIcon, CreditCardIcon, TagIcon,
  ShieldCheckIcon, TicketIcon, ChevronRightIcon,
  CheckIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon,
  ArrowLeftIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const STEPS = [
  { id: 1, label: 'Booker Info', icon: UserCircleIcon },
  { id: 2, label: 'Attendees', icon: UsersIcon },
  { id: 3, label: 'Summary', icon: TicketIcon },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 mb-6 sm:mb-8">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = currentStep === s.id;
        const completed = currentStep > s.id;
        return (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                completed
                  ? 'bg-emerald-500 text-white'
                  : active
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-glow-sm'
                  : 'bg-white/[0.06] text-zinc-500 border border-white/[0.08]'
              }`}>
                {completed ? <CheckIcon className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block transition-colors ${
                active ? 'text-white' : completed ? 'text-emerald-400' : 'text-zinc-500'
              }`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full transition-all duration-500 ${
                completed ? 'bg-emerald-500' : 'bg-white/[0.06]'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressBar({ step }) {
  const pct = ((step - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="w-full h-1 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </div>
  );
}

function BookerStep({ booker, errors, useBookerForFirst, onChange, onToggleCopy }) {
  const handleChange = (field) => (e) => onChange(field, e.target.value);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={fadeUp}>
        <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <UserCircleIcon className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Booker Information</h3>
              <p className="text-xs text-zinc-500">Person making this booking</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Full Name <span className="text-red-400">*</span></label>
              <input
                type="text" value={booker.fullName} onChange={handleChange('fullName')}
                placeholder="Enter full name"
                className={`input ${errors.fullName ? 'input-error' : ''}`}
              />
              {errors.fullName && <p className="error-msg">{errors.fullName}</p>}
            </div>
            <div>
              <label className="label">Email <span className="text-red-400">*</span></label>
              <input
                type="email" value={booker.email} onChange={handleChange('email')}
                placeholder="you@example.com"
                className={`input ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Phone <span className="text-red-400">*</span></label>
              <input
                type="tel" value={booker.phone} onChange={handleChange('phone')}
                placeholder="+91 98765 43210"
                className={`input ${errors.phone ? 'input-error' : ''}`}
              />
              {errors.phone && <p className="error-msg">{errors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">College / Organization</label>
              <input
                type="text" value={booker.college} onChange={handleChange('college')}
                placeholder="College or organization name"
                className="input"
              />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <label className="flex items-center gap-3 p-4 glass-sm rounded-xl cursor-pointer hover:border-violet-500/30 transition-all">
          <input
            type="checkbox"
            checked={useBookerForFirst}
            onChange={(e) => onToggleCopy(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-surface-input text-violet-500 focus:ring-violet-500/50"
          />
          <div>
            <span className="text-sm font-medium text-white">Use booker details for Attendee #1</span>
            <p className="text-xs text-zinc-500 mt-0.5">Auto-fill the first attendee with your information</p>
          </div>
        </label>
      </motion.div>
    </motion.div>
  );
}

const AttendeeCard = forwardRef(function AttendeeCard({ attendee, index, errors, ticketTypes, isExpanded, onToggle, onChange }, ref) {
  const ticket = ticketTypes.find((t) => t._id === attendee.ticketId);
  const ticketName = ticket?.name || attendee.ticketType || 'Ticket';
  const ticketType = ticket?.type || '';

  const getBadgeClass = (type) => {
    switch (type) {
      case 'vip': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'earlyBird': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'group': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    }
  };

  const hasErrors = errors && Object.keys(errors).length > 0;

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      layout
      className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${
        hasErrors ? 'border-red-500/40 ring-1 ring-red-500/20' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            hasErrors
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 text-violet-300 border border-violet-500/20'
          }`}>
            {index + 1}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">Ticket #{index + 1}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getBadgeClass(ticketType)}`}>
                {ticketName}
              </span>
            </div>
            {attendee.name && (
              <p className="text-xs text-zinc-500 mt-0.5">{attendee.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasErrors && (
            <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
          )}
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-white/[0.06] pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Full Name <span className="text-red-400">*</span></label>
                  <input
                    type="text" value={attendee.name} onChange={(e) => onChange(index, 'name', e.target.value)}
                    placeholder="Attendee full name"
                    className={`input ${errors?.name ? 'input-error' : ''}`}
                  />
                  {errors?.name && <p className="error-msg">{errors.name}</p>}
                </div>
                <div>
                  <label className="label">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email" value={attendee.email} onChange={(e) => onChange(index, 'email', e.target.value)}
                    placeholder="email@example.com"
                    className={`input ${errors?.email ? 'input-error' : ''}`}
                  />
                  {errors?.email && <p className="error-msg">{errors.email}</p>}
                </div>
                <div>
                  <label className="label">Phone <span className="text-red-400">*</span></label>
                  <input
                    type="tel" value={attendee.phone} onChange={(e) => onChange(index, 'phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`input ${errors?.phone ? 'input-error' : ''}`}
                  />
                  {errors?.phone && <p className="error-msg">{errors.phone}</p>}
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    value={attendee.gender} onChange={(e) => onChange(index, 'gender', e.target.value)}
                    className="input appearance-none"
                  >
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">College / Organization</label>
                  <input
                    type="text" value={attendee.college} onChange={(e) => onChange(index, 'college', e.target.value)}
                    placeholder="College or organization"
                    className="input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Special Requests <span className="text-zinc-500 text-[10px]">(optional)</span></label>
                  <textarea
                    value={attendee.specialRequest} onChange={(e) => onChange(index, 'specialRequest', e.target.value)}
                    placeholder="Accessibility needs, dietary restrictions, etc."
                    rows={2}
                    className="input resize-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

function AttendeesStep({ attendees, ticketTypes, errors, expandedCard, onToggleCard, onChange, cardRefs }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {attendees.map((a, i) => (
        <AttendeeCard
          key={`${a.ticketId}-${i}`}
          ref={(el) => { if (cardRefs) cardRefs.current[i] = el; }}
          attendee={a}
          index={i}
          errors={errors[i]}
          ticketTypes={ticketTypes}
          isExpanded={expandedCard === i}
          onToggle={() => onToggleCard(i)}
          onChange={onChange}
        />
      ))}
    </motion.div>
  );
}

function SummaryStep({ event, booker, attendees, tickets, selections }) {
  const PLATFORM_FEE_RATE = 0.05;
  const subtotal = tickets.reduce((sum, t) => sum + (selections[t._id] || 0) * t.price, 0);
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const gst = 0;
  const grandTotal = subtotal + platformFee + gst;

  const ticketCounts = useMemo(() => {
    const counts = {};
    for (const t of tickets) {
      const qty = selections[t._id] || 0;
      if (qty > 0) counts[t.name] = { qty, price: t.price, type: t.type };
    }
    return counts;
  }, [tickets, selections]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={fadeUp} className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <UserCircleIcon className="w-4 h-4 text-violet-400" />
          Primary Booker
        </h3>
        <div className="glass-sm p-4 rounded-xl space-y-1">
          <p className="text-white font-medium">{booker.fullName}</p>
          <p className="text-zinc-400 text-sm">{booker.email}</p>
          <p className="text-zinc-400 text-sm">{booker.phone}</p>
          {booker.college && <p className="text-zinc-400 text-sm">{booker.college}</p>}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-violet-400" />
          Attendees ({attendees.length})
        </h3>
        <div className="space-y-2">
          {attendees.map((a, i) => {
            const ticket = tickets.find((t) => t._id === a.ticketId);
            return (
              <div key={`${a.ticketId}-${i}`} className="glass-sm p-3 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 flex items-center justify-center text-xs font-bold text-violet-300 border border-violet-500/20 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.name || `Attendee ${i + 1}`}</p>
                  <p className="text-xs text-zinc-500">{ticket?.name || 'Ticket'}</p>
                </div>
                <span className="text-xs text-zinc-400">{a.email}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="glass rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <TicketIcon className="w-4 h-4 text-violet-400" />
          Ticket Breakdown
        </h3>
        {Object.entries(ticketCounts).map(([name, { qty, price }]) => (
          <div key={name} className="flex justify-between text-sm">
            <span className="text-zinc-400">{name} × {qty}</span>
            <span className="text-white font-medium">{formatCurrency(price * qty)}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function BookingSidebar({ event, tickets, selections, booker, attendees, step, onPay }) {
  const PLATFORM_FEE_RATE = 0.05;
  const totalTickets = attendees.length;
  const subtotal = tickets.reduce((sum, t) => sum + (selections[t._id] || 0) * t.price, 0);
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const gst = 0;
  const grandTotal = subtotal + platformFee + gst;

  const ticketCounts = useMemo(() => {
    const counts = {};
    for (const t of tickets) {
      const qty = selections[t._id] || 0;
      if (qty > 0) {
        if (!counts[t.name]) counts[t.name] = { qty: 0, price: t.price };
        counts[t.name].qty += qty;
      }
    }
    return counts;
  }, [tickets, selections]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-2xl p-5 sticky top-24 space-y-5"
    >
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <CreditCardIcon className="w-4 h-4 text-violet-400" />
        Booking Summary
      </h3>

      <div className="pb-3 border-b border-white/[0.06]">
        <p className="text-sm font-medium text-white truncate">{event.title}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{formatDateTime(event.startDate)}</p>
      </div>

      <div className="space-y-2">
        {Object.entries(ticketCounts).map(([name, { qty, price }]) => (
          <div key={name} className="flex justify-between text-sm">
            <span className="text-zinc-400">{name} × {qty}</span>
            <span className="text-white">{formatCurrency(price * qty)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.06] pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Total Tickets</span>
          <span className="text-white font-medium">{totalTickets}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Subtotal</span>
          <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400 flex items-center gap-1">
            <TagIcon className="w-3.5 h-3.5 text-zinc-500" />
            Platform Fee
          </span>
          <span className="text-zinc-300">{formatCurrency(platformFee)}</span>
        </div>
        {gst > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">GST</span>
            <span className="text-zinc-300">{formatCurrency(gst)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] pt-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-300">Grand Total</span>
          <span className="text-xl font-bold text-primary-300 font-display">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {booker.fullName && (
        <div className="glass-sm p-3 rounded-xl">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Primary Booker</p>
          <p className="text-sm text-white font-medium">{booker.fullName}</p>
        </div>
      )}

      {step === 3 && (
        <button
          onClick={onPay}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-glow-sm hover:shadow-glow"
        >
          Proceed to Payment — {formatCurrency(grandTotal)}
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-600 pt-1">
        <span className="flex items-center gap-1"><ShieldCheckIcon className="w-3 h-3 text-emerald-500" /> Secure</span>
        <span className="flex items-center gap-1"><ShieldCheckIcon className="w-3 h-3 text-emerald-500" /> Encrypted</span>
        <span className="flex items-center gap-1"><ShieldCheckIcon className="w-3 h-3 text-emerald-500" /> Trusted</span>
      </div>
    </motion.div>
  );
}

export default function Checkout() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: event, isLoading } = useGetEventByIdQuery(eventId);

  const attendeeRefs = useRef({});

  const {
    step, setStep, booker, useBookerForFirst, attendees, tickets, selections, eventId: storeEventId,
    initRegistration, updateBooker, setUseBookerForFirst, updateAttendee,
    adjustAttendees, validateBooker, validateAttendees, syncBookerToFirst, reset,
  } = useRegistrationStore();

  const [expandedCard, setExpandedCard] = useState(0);
  const [bookerErrors, setBookerErrors] = useState({});
  const [attendeeErrors, setAttendeeErrors] = useState({});

  const hasStoreData = !!(storeEventId && selections && Object.keys(selections).length > 0);
  const stateSelections = location.state?.selections;

  useEffect(() => {
    if (!event) return;

    // Case 1: Store already has data (from drawer init or localStorage persistence) — use it
    if (hasStoreData && storeEventId === eventId) return;

    // Case 2: Coming from drawer with location.state — initialize store
    if (stateSelections && Object.keys(stateSelections).length > 0) {
      initRegistration(event, event.ticketTypes || [], stateSelections, user);
      return;
    }

    // Case 3: No data anywhere (direct URL access / stale store) — redirect back
    navigate(`/events/${eventId}`, { replace: true });
  }, [event, hasStoreData, storeEventId, eventId]);

  const ticketTypes = useMemo(() => event?.ticketTypes || [], [event]);
  const totalTickets = attendees.length;

  const PLATFORM_FEE_RATE = 0.05;
  const subtotal = ticketTypes.reduce((sum, t) => sum + (selections[t._id] || 0) * t.price, 0);
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const grandTotal = subtotal + platformFee;

  const handleBookerChange = useCallback((field, value) => {
    updateBooker(field, value);
    if (bookerErrors[field]) setBookerErrors((prev) => ({ ...prev, [field]: undefined }));
  }, [updateBooker, bookerErrors]);

  const handleAttendeeChange = useCallback((index, field, value) => {
    updateAttendee(index, field, value);
    if (attendeeErrors[index]?.[field]) {
      setAttendeeErrors((prev) => {
        const next = { ...prev };
        if (next[index]) {
          const updated = { ...next[index] };
          delete updated[field];
          if (Object.keys(updated).length === 0) delete next[index];
          else next[index] = updated;
        }
        return next;
      });
    }
  }, [updateAttendee, attendeeErrors]);

  const handleToggleBookerCopy = useCallback((checked) => {
    setUseBookerForFirst(checked);
    if (checked) {
      syncBookerToFirst();
    }
  }, [setUseBookerForFirst, syncBookerToFirst]);

  const scrollToCard = (index) => {
    const ref = attendeeRefs.current[index];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const errors = validateBooker();
      if (Object.keys(errors).length > 0) {
        setBookerErrors(errors);
        toast.error('Please fill all required fields');
        return;
      }
      setBookerErrors({});
      if (useBookerForFirst) syncBookerToFirst();
      setStep(2);
    } else if (step === 2) {
      if (useBookerForFirst) syncBookerToFirst();
      const errors = validateAttendees();
      if (Object.keys(errors).length > 0) {
        setAttendeeErrors(errors);
        const firstErrorIdx = parseInt(Object.keys(errors)[0]);
        setExpandedCard(firstErrorIdx);
        setTimeout(() => scrollToCard(firstErrorIdx), 100);
        const count = Object.keys(errors).length;
        toast.error(`${count} attendee${count > 1 ? 's have' : ' has'} missing fields`);
        return;
      }
      setAttendeeErrors({});
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePay = () => {
    navigate(`/payment/${eventId}`, {
      state: {
        event,
        tickets: ticketTypes
          .filter((t) => (selections[t._id] || 0) > 0)
          .map((t) => ({
            ticketId: t._id,
            name: t.name,
            type: t.type,
            unitPrice: t.price,
            quantity: selections[t._id],
          })),
        attendeeInfo: {
          name: booker.fullName,
          email: booker.email,
          phone: booker.phone,
          college: booker.college,
        },
        attendees,
        totalAmount: grandTotal,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
        <div className="glass p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">Event not found.</p>
          <button onClick={() => navigate('/events')} className="btn btn-secondary">Back to Events</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070d]">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">

          <motion.div variants={fadeUp} className="flex items-center gap-2 text-sm text-zinc-500">
            <button onClick={() => navigate('/events')} className="hover:text-zinc-300 transition-colors">Events</button>
            <ChevronRightIcon className="w-3 h-3" />
            <button onClick={() => navigate(`/events/${eventId}`)} className="hover:text-zinc-300 transition-colors truncate max-w-[200px]">{event.title}</button>
            <ChevronRightIcon className="w-3 h-3" />
            <span className="text-violet-400">Checkout</span>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Complete Your Registration</h1>
            <p className="text-zinc-400 mt-1 text-sm sm:text-base">
              {totalTickets} ticket{totalTickets !== 1 ? 's' : ''} selected — Book for yourself and your group
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <ProgressBar step={step} />
            <StepIndicator currentStep={step} />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="booker" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                    <BookerStep
                      booker={booker}
                      errors={bookerErrors}
                      useBookerForFirst={useBookerForFirst}
                      onChange={handleBookerChange}
                      onToggleCopy={handleToggleBookerCopy}
                    />
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="attendees" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                    <AttendeesStep
                      attendees={attendees}
                      ticketTypes={ticketTypes}
                      errors={attendeeErrors}
                      expandedCard={expandedCard}
                      onToggleCard={(i) => setExpandedCard(expandedCard === i ? -1 : i)}
                      onChange={handleAttendeeChange}
                      cardRefs={attendeeRefs}
                    />
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="summary" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                    <SummaryStep
                      event={event}
                      booker={booker}
                      attendees={attendees}
                      tickets={ticketTypes}
                      selections={selections}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={fadeUp} className="flex items-center justify-between pt-2">
                {step > 1 ? (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back
                  </button>
                ) : <div />}

                {step < 3 ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all shadow-glow-sm hover:shadow-glow"
                  >
                    {step === 1 ? 'Continue to Attendees' : 'Review Booking'}
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handlePay}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all shadow-glow-sm hover:shadow-glow lg:hidden"
                  >
                    Pay {formatCurrency(grandTotal)}
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            </div>

            <div className="lg:col-span-1">
              <BookingSidebar
                event={event}
                tickets={ticketTypes}
                selections={selections}
                booker={booker}
                attendees={attendees}
                step={step}
                onPay={handlePay}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
