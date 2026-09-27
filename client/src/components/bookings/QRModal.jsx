import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDate } from '../../utils/formatDate';
import { CheckCircle2, XCircle, Download, ShieldAlert } from 'lucide-react';

/**
 * QRModal — displays the real JWT-signed QR code image from IssuedTicket.
 * Falls back to a styled placeholder if no issuedTicket yet (booking still pending).
 */
export default function QRModal({ isOpen, onClose, booking }) {
  // The real QR comes from the IssuedTicket attached to the booking by the API
  const issuedTicket = booking?.issuedTicket;
  const qrImage = issuedTicket?.qrImage || booking?.qrCode || null; // base64 PNG

  const downloadQR = () => {
    if (!qrImage) return;
    const a = document.createElement('a');
    a.href = qrImage; // data:image/png;base64,...
    a.download = `ticket-${issuedTicket?.ticketCode ?? booking?.bookingRef ?? 'qr'}.png`;
    a.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Entry QR Code" size="sm">
      <div className="flex flex-col items-center gap-5">
        {/* Ticket code + status */}
        <div className="text-center">
          <p className="font-mono text-lg font-bold tracking-widest text-mint-300">
            {issuedTicket?.ticketCode ?? booking?.bookingRef ?? '—'}
          </p>
          <p className="mt-0.5 text-sm text-zinc-400">{booking?.event?.title}</p>
          {booking?.event?.startDate && (
            <p className="mt-0.5 text-xs text-zinc-500">{formatDate(booking.event.startDate)}</p>
          )}
        </div>

        {/* QR Image */}
        {qrImage ? (
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <img
              src={qrImage}
              alt="Entry QR Code"
              className="h-[200px] w-[200px] object-contain"
            />
          </div>
        ) : (
          <div className="panel flex h-[220px] w-[220px] flex-col items-center justify-center gap-2 border-dashed border-2 border-mint-500/20 p-4 text-center">
            <XCircle className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">QR code not yet available</p>
            <p className="text-xs text-zinc-600">
              {booking?.status === 'pending'
                ? 'Complete payment to receive your QR code.'
                : 'QR generation may still be in progress. Check back shortly.'}
            </p>
          </div>
        )}

        {/* Tier + usage status */}
        {issuedTicket && (
          <div className="flex w-full items-center justify-between gap-3 px-1 text-sm">
            <span className="text-zinc-400">
              Tier: <span className="font-medium text-white">{issuedTicket.tierName ?? 'General'}</span>
            </span>
            {issuedTicket.isUsed ? (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                <XCircle className="h-3.5 w-3.5" />
                Used {issuedTicket.usedAt ? `· ${formatDate(issuedTicket.usedAt)}` : ''}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Valid — not yet scanned
              </span>
            )}
          </div>
        )}

        {/* Warning */}
        {qrImage && (
          <p className="flex items-start gap-1.5 text-center text-xs font-semibold text-red-400">
            <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
            Valid for ONE entry only. Do not share this QR code.
          </p>
        )}

        {/* Actions */}
        <div className="flex w-full flex-col gap-2">
          {qrImage && (
            <Button onClick={downloadQR} variant="secondary" className="w-full">
              <Download className="mr-1.5 inline h-3.5 w-3.5" />
              Download QR as PNG
            </Button>
          )}
          <Button onClick={onClose} variant="ghost" className="w-full">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
