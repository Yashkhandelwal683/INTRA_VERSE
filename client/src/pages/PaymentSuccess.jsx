import { Link, useLocation } from 'react-router-dom';
import { useGetBookingByIdQuery } from '../features/bookings/bookingsApi';
import Spinner from '../components/ui/Spinner';
import Button  from '../components/ui/Button';
import { formatDateTime } from '../utils/formatDate';
import { formatCurrency }  from '../utils/formatCurrency';
import { CheckCircleIcon, QrCodeIcon } from '@heroicons/react/24/solid';
import { XCircleIcon } from '@heroicons/react/24/outline';

export default function PaymentSuccess() {
  const { state }   = useLocation();
  const bookingId   = state?.bookingId;

  const { data: booking, isLoading } = useGetBookingByIdQuery(bookingId, { skip: !bookingId });

  // Use the real JWT-signed QR image from IssuedTicket (attached by bookingController)
  const issuedTicket = booking?.issuedTicket;
  const qrImage      = issuedTicket?.qrImage || booking?.qrCode || null;

  const downloadQR = () => {
    if (!qrImage) return;
    const a      = document.createElement('a');
    a.href       = qrImage;
    a.download   = `ticket-${issuedTicket?.ticketCode ?? booking?.bookingRef ?? 'qr'}.png`;
    a.click();
  };

  if (!bookingId) {
    return (
      <div className="container-app py-20 text-center">
        <p className="text-slate-400 mb-4">No booking information found.</p>
        <Link to="/events" className="btn-md btn-primary">Browse Events</Link>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="container-app py-16 max-w-lg text-center">
      {/* Success badge */}
      <div className="flex flex-col items-center gap-4 mb-8 animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircleIcon className="w-9 h-9 text-emerald-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-3xl text-white">Booking Confirmed!</h1>
          <p className="text-slate-400 mt-2">
            {qrImage
              ? 'Your QR ticket is ready. Show it at the venue entrance.'
              : 'Your booking is confirmed. QR ticket will appear shortly.'}
          </p>
        </div>
      </div>

      {/* Booking details */}
      {booking && (
        <div className="glass p-6 mb-6 text-left space-y-3 animate-fade-in">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Event</span>
            <span className="text-white font-medium">{booking.event?.title}</span>
          </div>
          {booking.event?.startDate && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Date</span>
              <span className="text-white">{formatDateTime(booking.event.startDate)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Booking Ref</span>
            <span className="font-mono text-primary-300 font-semibold">{booking.bookingRef}</span>
          </div>
          {issuedTicket?.ticketCode && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Ticket ID</span>
              <span className="font-mono text-sm text-white">{issuedTicket.ticketCode}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Amount Paid</span>
            <span className="text-emerald-400 font-semibold">{formatCurrency(booking.totalAmount)}</span>
          </div>
        </div>
      )}

      {/* QR Code — real JWT-signed PNG */}
      <div className="flex justify-center mb-4">
        {qrImage ? (
          <div className="p-4 bg-white rounded-2xl shadow-card animate-fade-in">
            <img
              src={qrImage}
              alt="Entry QR Code"
              className="w-[200px] h-[200px] object-contain"
            />
          </div>
        ) : (
          <div className="w-[220px] h-[220px] glass border-dashed border-2 border-surface-border rounded-2xl flex flex-col items-center justify-center gap-3 animate-pulse-slow">
            <QrCodeIcon className="w-12 h-12 text-primary-400/40" />
            <p className="text-slate-400 text-sm">Generating QR ticket…</p>
            <p className="text-slate-500 text-xs px-4">
              Your QR code will also be emailed to you shortly.
            </p>
          </div>
        )}
      </div>

      {qrImage && (
        <p className="text-xs text-red-400 font-semibold mb-6">
          ⚠️ Valid for ONE entry only. Do not share this QR code.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {qrImage && (
          <Button onClick={downloadQR} variant="secondary" size="lg" className="w-full">
            ⬇ Download QR Ticket (PNG)
          </Button>
        )}
        <Link to="/profile" className="btn-lg btn-ghost w-full">
          View My Bookings
        </Link>
        <Link to="/events" className="btn-lg btn-ghost w-full text-slate-500">
          Browse More Events
        </Link>
      </div>
    </div>
  );
}
