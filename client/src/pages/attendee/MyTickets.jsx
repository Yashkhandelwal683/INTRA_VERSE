import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, CalendarDays, MapPin, IndianRupee, QrCode, Download, Eye,
  ChevronDown, CheckCircle2, Hourglass, XCircle, BadgeCheck, Clock,
} from 'lucide-react';

import { useGetMyTicketsQuery } from '../../features/checkout/checkoutApi';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime, formatDate } from '../../utils/formatDate';
import { Panel, Skeleton } from '../../components/attendee/Panel';
import { Tabs, SearchField } from '../../components/attendee/Controls';
import EmptyState from '../../components/attendee/EmptyState';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const STATUS = {
  pending_approval: { label: 'Pending approval', cls: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  approved: { label: 'Approved', cls: 'border-mint-500/25 bg-mint-500/10 text-mint-300' },
  rejected: { label: 'Rejected', cls: 'border-red-500/25 bg-red-500/10 text-red-300' },
  cancelled: { label: 'Cancelled', cls: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400' },
};

const TABS = [
  { key: 'upcoming', label: 'Upcoming', icon: CalendarDays },
  { key: 'past', label: 'Past', icon: CheckCircle2 },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

function DetailCell({ label, children, mono = false, className = '' }) {
  return (
    <div className={`panel-inset px-2.5 py-2 ${className}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">{label}</p>
      <div className={`mt-0.5 truncate text-[10px] text-zinc-300 ${mono ? 'font-mono' : ''}`}>{children}</div>
    </div>
  );
}

export default function MyTickets() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useGetMyTicketsQuery({ status: activeTab });
  const tickets = data?.tickets || [];

  const filtered = tickets.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.event?.title?.toLowerCase().includes(term) ||
      t.registrationId?.toLowerCase().includes(term)
    );
  });

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const downloadPDF = async (ticket) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 180] });

      const BRAND = [13, 148, 136];

      doc.setFillColor(...BRAND);
      doc.rect(0, 0, 100, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EVENT FIESTA', 50, 10, { align: 'center' });
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('Premium Event Pass', 50, 16, { align: 'center' });
      doc.text('Digital Entry Ticket', 50, 21, { align: 'center' });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const title = ticket.event?.title || 'Event';
      doc.text(title.length > 20 ? `${title.substring(0, 18)}..` : title, 50, 32, { align: 'center' });

      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      let y = 40;
      const leftX = 10;
      const rightX = 55;
      const lineH = 4;

      const details = [
        ['Pass ID', ticket.ticket?.ticketCode || ticket.registrationId || 'N/A'],
        ['Attendee', ticket.attendeeDetails?.fullName || 'N/A'],
        ['Email', ticket.attendeeDetails?.email || 'N/A'],
        ['Phone', ticket.attendeeDetails?.phone || 'N/A'],
        ['Event', ticket.event?.title || 'N/A'],
        ['Date', ticket.event?.startDate ? formatDate(ticket.event.startDate, 'dd MMM yyyy') : 'N/A'],
      ];

      details.forEach(([label, value]) => {
        doc.setTextColor(100, 116, 139);
        doc.text(label, leftX, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        const valStr = String(value);
        doc.text(valStr.length > 18 ? `${valStr.substring(0, 16)}..` : valStr, rightX, y);
        doc.setFont('helvetica', 'normal');
        y += lineH;
      });

      y += 3;
      const qrData = ticket.ticket?.qrImage || ticket.issuedTicket?.qrImage;
      if (qrData?.startsWith('data:')) {
        doc.addImage(qrData, 'PNG', 25, y, 20, 20);
        y += 22;
      } else {
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 250);
        doc.roundedRect(30, y, 15, 15, 2, 2, 'FD');
        doc.setTextColor(150, 150, 180);
        doc.setFontSize(4);
        doc.text('QR', 37.5, y + 8, { align: 'center' });
        y += 18;
      }

      doc.setFontSize(4);
      doc.setTextColor(148, 163, 184);
      doc.text('Valid for one-time entry only. Non-transferable.', 50, y + 2, { align: 'center' });
      doc.text('Powered by Event Fiesta', 50, 178, { align: 'center' });

      doc.save(`pass-${ticket.registrationId || 'download'}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-10">
      {/* Header */}
      <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="panel-label mb-1.5">Pass Wallet</p>
          <h1 className="font-display text-3xl font-black tracking-tight text-white">My Tickets</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Every entry pass you hold, ready to scan at the gate.
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={TABS}
          value={activeTab}
          onChange={(key) => { setActiveTab(key); setExpandedId(null); }}
          layoutId="ticket-tabs"
        />
        <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Search passes…" />
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={searchTerm ? Ticket : activeTab === 'cancelled' ? XCircle : Hourglass}
          title={
            searchTerm
              ? 'No matching passes'
              : activeTab === 'upcoming'
                ? 'No upcoming passes'
                : activeTab === 'past'
                  ? 'No past passes'
                  : 'Nothing cancelled'
          }
          description={
            searchTerm
              ? 'Try a different event name or registration ID.'
              : activeTab === 'upcoming'
                ? 'Register for an event and your pass will show up here instantly.'
                : activeTab === 'past'
                  ? 'Passes from events you have already attended will appear here.'
                  : 'You have no cancelled passes — nice and clean.'
          }
          action={!searchTerm && activeTab === 'upcoming' ? { label: 'Browse Events', to: '/events' } : null}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ticket) => {
            const ev = ticket.event || {};
            const expanded = expandedId === ticket._id;
            const status = STATUS[ticket.ticketStatus] || STATUS.pending_approval;
            const qr = ticket.ticket?.qrImage || ticket.issuedTicket?.qrImage;
            const downloadable = ticket.ticketStatus === 'approved';

            return (
              <motion.div
                key={ticket._id}
                variants={item}
                layout
                className={`panel group overflow-hidden transition-shadow ${
                  expanded ? 'border-mint-500/30 shadow-glow-mint-sm' : ''
                }`}
              >
                {/* Stub header */}
                <div className="relative h-28 overflow-hidden bg-gradient-to-br from-mint-800/50 to-teal-900/50">
                  {ev.bannerImage ? (
                    <img
                      src={ev.bannerImage}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <CalendarDays className="h-8 w-8 text-mint-400/30" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#08110f] via-[#08110f]/40 to-transparent" />

                  <span className="absolute right-3 top-3">
                    <span className={`chip backdrop-blur-sm ${status.cls}`}>{status.label}</span>
                  </span>

                  <div className="absolute inset-x-3 bottom-2.5">
                    <p className="line-clamp-1 font-display text-sm font-bold text-white">{ev.title || 'Event'}</p>
                  </div>
                </div>

                {/* Perforation */}
                <div className="relative flex items-center">
                  <span className="-ml-2.5 h-5 w-5 rounded-full border border-white/[0.06] bg-[#060d0c]" />
                  <span className="h-px flex-1 border-t border-dashed border-white/[0.08]" />
                  <span className="-mr-2.5 h-5 w-5 rounded-full border border-white/[0.06] bg-[#060d0c]" />
                </div>

                {/* Body */}
                <div className="space-y-3 p-4">
                  <div className="space-y-1.5 text-[11px] text-zinc-400">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0 text-zinc-600" />
                      <span className="truncate">
                        {ev.venue?.name || 'Venue'}
                        {ev.venue?.city ? `, ${ev.venue.city}` : ''}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0 text-zinc-600" />
                      <span className="truncate">{ev.startDate ? formatDateTime(ev.startDate) : 'TBD'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <IndianRupee className="h-3 w-3 shrink-0 text-zinc-600" />
                        <span className="font-semibold text-mint-300">{formatCurrency(ticket.grandTotal)}</span>
                      </span>
                      <span className="text-zinc-600">
                        {ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* QR strip */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white p-1">
                      {qr ? (
                        <img src={qr} alt="Pass QR" className="h-full w-full object-contain" />
                      ) : (
                        <QrCode className="h-5 w-5 text-zinc-400" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Entry QR</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-400">
                        {ticket.ticket?.ticketCode || 'Generated on approval'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpand(ticket._id)}
                      className="btn-quiet flex-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                      <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPDF(ticket)}
                      disabled={!downloadable}
                      title={downloadable ? 'Download PDF' : 'Available once approved'}
                      className="btn-mint btn-mint-sm flex-1 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>

                  {/* Expanded */}
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="panel-hairline grid grid-cols-2 gap-2 pt-3">
                          <DetailCell label="Registration ID" mono>{ticket.registrationId || '—'}</DetailCell>
                          <DetailCell label="Transaction" mono>{ticket.transactionId || '—'}</DetailCell>
                          <DetailCell label="Attendee">{ticket.attendeeDetails?.fullName || '—'}</DetailCell>
                          <DetailCell label="Payment">
                            <span
                              className={`chip ${
                                ticket.paymentStatus === 'paid'
                                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                                  : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                              }`}
                            >
                              {ticket.paymentStatus || 'pending'}
                            </span>
                          </DetailCell>
                          <DetailCell label="Entry status">
                            <span
                              className={`chip ${
                                ticket.issuedTicket?.isUsed
                                  ? 'border-mint-500/25 bg-mint-500/10 text-mint-300'
                                  : 'border-white/[0.08] bg-white/[0.04] text-zinc-400'
                              }`}
                            >
                              {ticket.issuedTicket?.isUsed ? 'Checked in' : 'Not used'}
                            </span>
                          </DetailCell>
                          {ticket.attendeeDetails?.college && (
                            <DetailCell label="College" className="col-span-2">
                              {ticket.attendeeDetails.college}
                            </DetailCell>
                          )}
                        </div>

                        {ticket.ticketStatus === 'approved' && (
                          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-zinc-600">
                            <BadgeCheck className="mt-px h-3 w-3 shrink-0 text-mint-500" />
                            Show this QR at the entry gate. Each pass admits one person and can only be used once.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {data?.pagination?.totalPages > 1 && (
        <Panel className="p-3 text-center text-[11px] text-zinc-500">
          Page 1 of {data.pagination.totalPages}
        </Panel>
      )}
    </motion.div>
  );
}
