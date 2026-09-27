import { useState, useEffect, useMemo } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetEventByIdQuery } from '../features/events/eventsApi';
import { useCreateOrderMutation, useVerifyPaymentMutation } from '../features/payments/paymentsApi';
import useRegistrationStore from '../store/registrationStore';
import Button from '../components/ui/Button';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';
import loadRazorpay from '../utils/loadRazorpay';
import {
  CreditCardIcon, CheckCircleIcon, XCircleIcon,
  ArrowPathIcon, ShieldCheckIcon, TicketIcon,
  DocumentTextIcon, UsersIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

function ProcessingAnimation() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 animate-pulse flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center">
            <ArrowPathIcon className="w-8 h-8 text-violet-300 animate-spin-slow" />
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white font-display mb-2">Processing Payment{dots}</h3>
      <p className="text-sm text-zinc-400">Please wait while we process your payment securely</p>
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-violet-500"
            style={{
              animation: `bounce 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SuccessScreen({ paymentData, event, navigate }) {
  return (
    <div className="text-center py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-emerald-500/20 mx-auto mb-6 flex items-center justify-center"
      >
        <CheckCircleIcon className="w-10 h-10 text-emerald-400" />
      </motion.div>

      <h2 className="text-2xl font-bold text-white font-display mb-2">Payment Successful!</h2>
      <p className="text-zinc-400 text-sm mb-6">Your booking has been confirmed</p>

      <div className="glass rounded-2xl p-5 max-w-sm mx-auto space-y-3 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Booking Reference</span>
          <span className="text-violet-300 font-mono text-xs font-medium">{paymentData.bookingRef || paymentData.bookingId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Amount Paid</span>
          <span className="text-zinc-300">{formatCurrency(paymentData.totalAmount || paymentData.amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Status</span>
          <span className="text-emerald-400 font-medium capitalize">{paymentData.status || 'confirmed'}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-8">
        <Button onClick={() => navigate('/dashboard/bookings')} variant="primary" className="px-6">
          <TicketIcon className="w-4 h-4 mr-1.5" />
          View My Bookings
        </Button>
        <Button onClick={() => navigate('/events')} variant="secondary">
          Browse More Events
        </Button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const { event: storeEvent, tickets: storeTickets, booker, attendees: storeAttendees, selections } = useRegistrationStore();
  const { data: event } = useGetEventByIdQuery(eventId);

  const [processing, setProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [createOrder] = useCreateOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();

  // Prefer location.state (fresh navigation), fall back to store (page refresh)
  const effectiveEvent = state?.event || storeEvent || event;
  const effectiveTickets = state?.tickets || storeTickets || [];
  const effectiveAttendeeInfo = state?.attendeeInfo || {
    name: booker?.fullName || '',
    email: booker?.email || '',
    phone: booker?.phone || '',
    college: booker?.college || '',
  };
  const effectiveAttendees = state?.attendees || storeAttendees || [];
  const effectiveTotalAmount = state?.totalAmount || (() => {
    const subtotal = effectiveTickets.reduce((sum, t) => sum + (t.unitPrice || t.price || 0) * (t.quantity || selections[t._id] || 0), 0);
    return subtotal + Math.round(subtotal * 0.05);
  })();

  useEffect(() => {
    if (!state && !storeEvent && !event) {
      navigate(`/events/${eventId}`, { replace: true });
    }
  }, [state, storeEvent, event, eventId, navigate]);

  const handlePayNow = async () => {
    setProcessing(true);
    setError(null);

    try {
      await loadRazorpay();
      const orderResult = await createOrder({ eventId, tickets: effectiveTickets, attendeeInfo: effectiveAttendeeInfo }).unwrap();

      if (window.Razorpay) {
        const options = {
          key: orderResult.keyId,
          amount: orderResult.amount,
          currency: orderResult.currency || 'INR',
          name: 'Event Fiesta',
          description: `Booking for ${effectiveEvent?.title}`,
          order_id: orderResult.orderId,
          handler: async (response) => {
            try {
              const verifyResult = await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                eventId,
                tickets: effectiveTickets,
                attendeeInfo: effectiveAttendeeInfo,
                attendees: effectiveAttendees,
              }).unwrap();

              setPaymentData(verifyResult);
              setPaymentDone(true);
              toast.success('Payment successful!');
            } catch (verifyErr) {
              const msg = verifyErr?.data?.message || 'Payment verification failed';
              setError(msg);
              toast.error(msg);
              setProcessing(false);
            }
          },
          prefill: {
            name: effectiveAttendeeInfo?.name || '',
            email: effectiveAttendeeInfo?.email || '',
            contact: effectiveAttendeeInfo?.phone || '',
          },
          theme: { color: '#7c3aed' },
          modal: {
            ondismiss: () => {
              setProcessing(false);
              toast.error('Payment cancelled');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          const msg = response?.error?.description || 'Payment failed';
          setError(msg);
          toast.error(msg);
          setProcessing(false);
        });
        rzp.open();
      } else {
        setError('Payment gateway not available. Please try again later.');
        setProcessing(false);
      }
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Payment failed. Please try again.';
      setError(msg);
      toast.error(msg);
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    navigate(`/checkout/${eventId}`, { replace: true });
  };

  if (!effectiveEvent) return null;

  return (
    <div className="min-h-screen bg-[#07070d]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

          <motion.div variants={item}>
            <h1 className="text-2xl font-bold text-white font-display">Payment</h1>
            <p className="text-zinc-400 text-sm mt-1">Complete your payment to confirm booking</p>
          </motion.div>

          <motion.div variants={item} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-900 to-violet-900 flex-shrink-0 overflow-hidden">
                {effectiveEvent.bannerImage ? (
                  <img src={effectiveEvent.bannerImage} alt="" className="w-full h-full object-cover" />
                ) : effectiveEvent.poster ? (
                  <img src={effectiveEvent.poster} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <TicketIcon className="w-6 h-6 text-primary-400/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{effectiveEvent.title}</p>
                <p className="text-xs text-zinc-500">{formatDateTime(effectiveEvent.startDate)}</p>
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {processing ? (
              <motion.div key="processing" variants={item} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-8">
                <ProcessingAnimation />
              </motion.div>
            ) : paymentDone ? (
              <motion.div key="success" variants={item} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-8">
                <SuccessScreen paymentData={paymentData} event={effectiveEvent} navigate={navigate} />
              </motion.div>
            ) : (
              <motion.div key="payment" variants={item} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-6 space-y-5">

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4 text-violet-400" />
                    Order Summary
                  </h3>
                  <div className="space-y-2.5">
                    {effectiveTickets?.map((t, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-zinc-400">{t.name || `Ticket × ${t.quantity}`}</span>
                        <span className="text-zinc-300">{formatCurrency((t.unitPrice || 0) * (t.quantity || 1))}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center">
                      <span className="text-sm text-zinc-300">Total</span>
                      <span className="text-xl font-bold text-primary-300 font-display">{formatCurrency(effectiveTotalAmount)}</span>
                    </div>
                  </div>
                </div>

                {effectiveAttendeeInfo && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-xs text-zinc-500 mb-1">Booking for:</p>
                    <p className="text-sm font-medium text-white">{effectiveAttendeeInfo.name}</p>
                    <p className="text-xs text-zinc-400">{effectiveAttendeeInfo.email}{effectiveAttendeeInfo.phone ? ` · ${effectiveAttendeeInfo.phone}` : ''}</p>
                  </div>
                )}

                {effectiveAttendees && effectiveAttendees.length > 0 && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                      <UsersIcon className="w-3 h-3" />
                      Attendees ({effectiveAttendees.length})
                    </p>
                    <div className="space-y-1.5">
                      {effectiveAttendees.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300 flex-shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-zinc-300 truncate">{a.name}</span>
                          <span className="text-zinc-500">·</span>
                          <span className="text-zinc-500 truncate">{a.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                    <XCircleIcon className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button onClick={handlePayNow} className="flex-1 btn-lg btn-primary" size="lg">
                    <CreditCardIcon className="w-4 h-4 mr-1.5" />
                    Pay {formatCurrency(effectiveTotalAmount)}
                  </Button>
                  <Button onClick={handleCancel} variant="ghost" className="px-6">
                    <XCircleIcon className="w-4 h-4 mr-1.5" />
                    Cancel
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-600">
                  <ShieldCheckIcon className="w-3 h-3 text-emerald-500" />
                  Secured with 256-bit encryption · Razorpay
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
