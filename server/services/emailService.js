const nodemailer = require('nodemailer');

/** Reusable SMTP transporter — created once and reused across requests. */
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify SMTP connection on startup
transporter.verify()
  .then(() => console.log('✅ SMTP transporter verified — emails will work'))
  .catch((err) => console.error('❌ SMTP transporter verification failed:', err.message));

/**
 * Sends a booking confirmation email with QR code embedded (CID attachment).
 *
 * Accepts EITHER the old flat params shape OR the new { user, event, ticket, qrImage } shape
 * so existing callers don't break.
 *
 * New shape: { user: { name, email }, event: { title, startDate, venue }, ticket: { tierName, ticketCode }, qrImage }
 * Old shape: { to, attendeeName, bookingRef, eventTitle, eventDate, venueName, totalAmount, qrCode }
 */
const sendBookingConfirmation = async (params) => {
  // ── Normalise into a single shape ──────────────────────────────────────────
  let to, holderName, ticketCode, tierName, eventTitle, eventDate, venueName, totalAmount, qrImage, eventId;

  if (params.user && params.event && params.ticket) {
    // New shape
    to          = params.user.email;
    holderName  = params.user.name || 'Attendee';
    ticketCode  = params.ticket.ticketCode || '';
    tierName    = params.ticket.tierName   || 'General';
    eventTitle  = params.event.title       || 'Event';
    eventDate   = params.event.startDate
      ? new Date(params.event.startDate).toDateString()
      : 'TBD';
    venueName   = params.event.venue
      ? `${params.event.venue.name || ''}, ${params.event.venue.city || ''}`.trim().replace(/^,|,$/g, '')
      : 'TBD';
    totalAmount = params.totalAmount ?? 0;
    qrImage     = params.qrImage || null;
    eventId     = params.event._id || params.event.id || '';
  } else {
    // Legacy flat shape
    to          = params.to;
    holderName  = params.attendeeName  || 'Attendee';
    ticketCode  = params.bookingRef    || '';
    tierName    = 'General';
    eventTitle  = params.eventTitle    || 'Event';
    eventDate   = params.eventDate     || 'TBD';
    venueName   = params.venueName     || 'TBD';
    totalAmount = params.totalAmount   ?? 0;
    qrImage     = params.qrCode        || params.qrImage || null;
    eventId     = params.eventId       || '';
  }

  // ── Build HTML ──────────────────────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Booking Confirmed — ${eventTitle}</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f4f6fb;margin:0;padding:0">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden">

    <div style="background:linear-gradient(135deg,#0A1931,#1a1a4e);padding:32px 24px;text-align:center">
      <h1 style="color:#00B4D8;margin:0;font-size:26px">🎉 Event Fiesta</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0">Booking Confirmed!</p>
    </div>

    <div style="padding:32px 24px;background:#f9f9f9">
      <p style="font-size:16px">Hi <strong>${holderName}</strong>,</p>
      <p>Your ticket has been confirmed. Show the QR code below at the venue entrance.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
        <tr style="background:#e8f4fd">
          <td style="padding:10px 12px;font-weight:bold;color:#333;width:35%">Event</td>
          <td style="padding:10px 12px;color:#333">${eventTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:bold;color:#333">Date</td>
          <td style="padding:10px 12px;color:#333">${eventDate}</td>
        </tr>
        <tr style="background:#e8f4fd">
          <td style="padding:10px 12px;font-weight:bold;color:#333">Venue</td>
          <td style="padding:10px 12px;color:#333">${venueName}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:bold;color:#333">Tier</td>
          <td style="padding:10px 12px;color:#333">${tierName}</td>
        </tr>
        <tr style="background:#e8f4fd">
          <td style="padding:10px 12px;font-weight:bold;color:#333">Ticket ID</td>
          <td style="padding:10px 12px;color:#333;font-family:monospace">${ticketCode}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:bold;color:#333">Event ID</td>
          <td style="padding:10px 12px;color:#333;font-family:monospace;font-size:12px">${eventId}</td>
        </tr>
        ${totalAmount > 0 ? `
        <tr style="background:#e8f4fd">
          <td style="padding:10px 12px;font-weight:bold;color:#333">Amount Paid</td>
          <td style="padding:10px 12px;color:#333">₹${Number(totalAmount).toLocaleString('en-IN')}</td>
        </tr>` : ''}
      </table>

      ${qrImage ? `
      <div style="text-align:center;margin:28px 0;padding:20px;background:#fff;border-radius:8px;border:1px solid #e2e8f0">
        <h3 style="color:#0A1931;margin:0 0 8px">Your Entry QR Code</h3>
        <p style="color:#dc2626;font-weight:bold;font-size:13px;margin:0 0 16px">
          ⚠️ Valid for ONE entry only. Do not share this QR code.
        </p>
        <img src="cid:entry_qr_code" alt="Entry QR Code"
             style="width:220px;height:220px;border:3px solid #0A1931;border-radius:8px;display:block;margin:0 auto"/>
      </div>` : ''}
    </div>

    <div style="background:#0A1931;padding:14px;text-align:center">
      <p style="color:#64748b;margin:0;font-size:12px">
        Event Fiesta 2026
      </p>
    </div>
  </div>
</body>
</html>`;

  // ── Send ────────────────────────────────────────────────────────────────────
  const mailOptions = {
    from:    process.env.EMAIL_FROM,
    to,
    subject: `🎟️ Booking Confirmed — ${eventTitle} (${ticketCode})`,
    html,
  };

  // Embed QR as CID attachment — works in Gmail / Outlook without being blocked
  if (qrImage) {
    const base64Data = qrImage.includes('base64,')
      ? qrImage.split('base64,')[1]
      : qrImage;

    mailOptions.attachments = [
      {
        filename:    'entry-qr.png',
        content:     base64Data,
        encoding:    'base64',
        contentType: 'image/png',
        cid:         'entry_qr_code', // matches cid: in html img src
      },
    ];
  }

  await transporter.sendMail(mailOptions);
};

/**
 * Generic email sender for custom notifications.
 */
const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

// ── Cancellation Email Templates ──────────────────────────────────────────────

/**
 * Sends a cancellation request notification to the admin.
 */
const sendCancellationRequestToAdmin = async ({ booking, user, event, refundAmount, refundPercent, hoursUntilEvent }) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      adminEmail,
    subject: `Cancellation Request — ${event.title} — ${user.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0A1931;padding:24px;text-align:center">
          <h1 style="color:#00B4D8;margin:0">Event Fiesta Admin</h1>
          <p style="color:#94a3b8;margin:8px 0 0">Cancellation Request Received</p>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <h2 style="color:#dc2626">New Cancellation Request</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">User</td><td style="padding:10px">${user.name} (${user.email})</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Event</td><td style="padding:10px">${event.title}</td></tr>
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Booking Ref</td><td style="padding:10px;font-family:monospace">${booking.bookingRef}</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Booking Amount</td><td style="padding:10px">₹${booking.totalAmount}</td></tr>
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Refund Eligible</td><td style="padding:10px;color:#16a34a;font-weight:bold">₹${refundAmount} (${refundPercent}%)</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Hours Until Event</td><td style="padding:10px">${hoursUntilEvent} hours</td></tr>
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Reason</td><td style="padding:10px">${booking.cancellationReason}</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Requested At</td><td style="padding:10px">${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
          <div style="text-align:center;margin:24px 0">
            <p style="font-size:16px;font-weight:bold;margin-bottom:16px">Take Action:</p>
            <a href="${process.env.CLIENT_URL}/admin/cancellations"
              style="background:#16a34a;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;margin-right:12px">
              ✓ Review Request
            </a>
          </div>
          <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-top:16px">
            <p style="margin:0;color:#92400e;font-size:13px">
              <strong>Refund Policy:</strong> User requested ${hoursUntilEvent}h before event.
              Eligible for ${refundPercent}% refund = ₹${refundAmount}.
              Please review and approve or reject within 24 hours.
            </p>
          </div>
        </div>
        <div style="background:#0A1931;padding:12px;text-align:center">
          <p style="color:#94a3b8;margin:0;font-size:12px">Event Fiesta Admin Panel</p>
        </div>
      </div>
    `,
  });
};

/**
 * Sends a cancellation approved email to the user with refund details.
 */
const sendCancellationApprovedEmail = async ({ user, event, booking, refundAmount, refundPercent }) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      user.email,
    subject: `Cancellation Approved — Refund of ₹${refundAmount} Initiated — ${event.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0A1931;padding:24px;text-align:center">
          <h1 style="color:#00B4D8;margin:0">Event Fiesta</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <div style="background:#dcfce7;border:2px solid #16a34a;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
            <h2 style="color:#16a34a;margin:0">✓ Cancellation Approved</h2>
            <p style="color:#15803d;margin:8px 0 0">Your refund has been initiated</p>
          </div>
          <p style="font-size:16px">Hi <strong>${user.name}</strong>,</p>
          <p>Your cancellation request for <strong>${event.title}</strong> has been approved by our admin team.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Booking Ref</td><td style="padding:10px;font-family:monospace">${booking.bookingRef}</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Event</td><td style="padding:10px">${event.title}</td></tr>
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Original Amount</td><td style="padding:10px">₹${booking.totalAmount}</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Refund Amount</td><td style="padding:10px;color:#16a34a;font-weight:bold;font-size:18px">₹${refundAmount} (${refundPercent}%)</td></tr>
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Refund Status</td><td style="padding:10px;color:#16a34a">Processing</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Cancellation Date</td><td style="padding:10px">${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
          <div style="background:#dbeafe;border:1px solid #3b82f6;border-radius:8px;padding:16px;margin:16px 0">
            <h3 style="color:#1e40af;margin:0 0 8px">Refund Timeline</h3>
            <p style="color:#1e40af;margin:0">Your refund of <strong>₹${refundAmount}</strong> will be credited to your original payment method within <strong>7 business days</strong>.</p>
            <ul style="color:#1e40af;margin:8px 0 0;padding-left:20px">
              <li>Credit/Debit Card: 5-7 business days</li>
              <li>UPI: 2-3 business days</li>
              <li>Net Banking: 5-7 business days</li>
              <li>Wallet: 1-2 business days</li>
            </ul>
          </div>
          <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px">
            <p style="margin:0;color:#92400e;font-size:13px">
              If you do not receive the refund within 7 business days, please contact us at ${process.env.EMAIL_USER}
            </p>
          </div>
        </div>
        <div style="background:#0A1931;padding:12px;text-align:center">
          <p style="color:#94a3b8;margin:0;font-size:12px">Event Fiesta 2026</p>
        </div>
      </div>
    `,
  });
};

/**
 * Sends a cancellation rejected email to the user.
 */
const sendCancellationRejectedEmail = async ({ user, event, booking, reason }) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      user.email,
    subject: `Cancellation Request Rejected — ${event.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0A1931;padding:24px;text-align:center">
          <h1 style="color:#00B4D8;margin:0">Event Fiesta</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <div style="background:#fee2e2;border:2px solid #dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
            <h2 style="color:#dc2626;margin:0">✗ Cancellation Request Rejected</h2>
          </div>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Unfortunately, your cancellation request for <strong>${event.title}</strong> has been reviewed and rejected.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Booking Ref</td><td style="padding:10px;font-family:monospace">${booking.bookingRef}</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Event</td><td style="padding:10px">${event.title}</td></tr>
            <tr style="background:#fee2e2"><td style="padding:10px;font-weight:bold">Reason</td><td style="padding:10px;color:#dc2626">${reason}</td></tr>
          </table>
          <p>Your booking remains <strong>confirmed</strong>. We look forward to seeing you at the event!</p>
          <p style="color:#64748b;font-size:13px">If you believe this decision is incorrect, please contact us at ${process.env.EMAIL_USER}</p>
        </div>
        <div style="background:#0A1931;padding:12px;text-align:center">
          <p style="color:#94a3b8;margin:0;font-size:12px">Event Fiesta 2026</p>
        </div>
      </div>
    `,
  });
};

// ── Organizer Approval Emails ─────────────────────────────────────────────────

/**
 * Sends organizer registration request notification to admin.
 */
const sendOrganizerRequestToAdmin = async ({ organizer }) => {
  const adminEmail = process.env.ADMIN_MAIL || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: adminEmail,
    subject: `New Organizer Registration — ${organizer.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0A1931;padding:24px;text-align:center">
          <h1 style="color:#00B4D8;margin:0">Event Fiesta Admin</h1>
          <p style="color:#94a3b8;margin:8px 0 0">New Organizer Registration Request</p>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <h2 style="color:#0A1931">New Organizer Wants to Join</h2>
          <p>A new organizer has registered and is waiting for your approval.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Name</td><td style="padding:10px">${organizer.name}</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Email</td><td style="padding:10px">${organizer.email}</td></tr>
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">Organization</td><td style="padding:10px">${organizer.organizationName || 'N/A'}</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Phone</td><td style="padding:10px">${organizer.phone || 'N/A'}</td></tr>
            <tr style="background:#e8f4fd"><td style="padding:10px;font-weight:bold">City</td><td style="padding:10px">${organizer.city || 'N/A'}</td></tr>
            <tr><td style="padding:10px;font-weight:bold">Registered At</td><td style="padding:10px">${new Date().toLocaleString('en-IN')}</td></tr>
          </table>
          <div style="text-align:center;margin:24px 0">
            <a href="${process.env.CLIENT_URL}/admin/organizer-approvals"
              style="background:#16a34a;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">
              Review Request
            </a>
          </div>
        </div>
        <div style="background:#0A1931;padding:12px;text-align:center">
          <p style="color:#94a3b8;margin:0;font-size:12px">Event Fiesta Admin Panel</p>
        </div>
      </div>
    `,
  });
};

/**
 * Sends organizer approval email to the organizer.
 */
const sendOrganizerApprovedEmail = async ({ user }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: `Congratulations! Your Organizer Account Has Been Approved`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0A1931;padding:24px;text-align:center">
          <h1 style="color:#00B4D8;margin:0">Event Fiesta</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <div style="background:#dcfce7;border:2px solid #16a34a;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
            <h2 style="color:#16a34a;margin:0">Account Approved!</h2>
            <p style="color:#15803d;margin:8px 0 0">You can now create and manage events</p>
          </div>
          <p style="font-size:16px">Hi <strong>${user.name}</strong>,</p>
          <p>Great news! Your organizer account has been approved by our admin team. You can now log in and start creating events on Event Fiesta.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${process.env.CLIENT_URL}/login"
              style="background:#0A1931;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">
              Login to Dashboard
            </a>
          </div>
          <div style="background:#dbeafe;border:1px solid #3b82f6;border-radius:8px;padding:16px;margin:16px 0">
            <h3 style="color:#1e40af;margin:0 0 8px">What's Next?</h3>
            <ul style="color:#1e40af;margin:0;padding-left:20px">
              <li>Create your first event</li>
              <li>Set up ticket tiers and pricing</li>
              <li>Manage bookings and attendees</li>
              <li>Track your revenue and analytics</li>
            </ul>
          </div>
        </div>
        <div style="background:#0A1931;padding:12px;text-align:center">
          <p style="color:#94a3b8;margin:0;font-size:12px">Event Fiesta 2026</p>
        </div>
      </div>
    `,
  });
};

/**
 * Sends organizer rejection email to the organizer.
 */
const sendOrganizerRejectedEmail = async ({ user, reason }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: `Organizer Application Update`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0A1931;padding:24px;text-align:center">
          <h1 style="color:#00B4D8;margin:0">Event Fiesta</h1>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <div style="background:#fee2e2;border:2px solid #dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
            <h2 style="color:#dc2626;margin:0">Application Not Approved</h2>
          </div>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Thank you for your interest in becoming an organizer on Event Fiesta. Unfortunately, your application has not been approved at this time.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:10px;font-weight:bold">Reason</td><td style="padding:10px;color:#dc2626">${reason || 'No specific reason provided.'}</td></tr>
          </table>
          <p>You can register again with a new account if you wish to reapply.</p>
          <p style="color:#64748b;font-size:13px">If you believe this is an error, please contact us at ${process.env.EMAIL_USER}</p>
        </div>
        <div style="background:#0A1931;padding:12px;text-align:center">
          <p style="color:#94a3b8;margin:0;font-size:12px">Event Fiesta 2026</p>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendBookingConfirmation,
  sendEmail,
  sendCancellationRequestToAdmin,
  sendCancellationApprovedEmail,
  sendCancellationRejectedEmail,
  sendOrganizerRequestToAdmin,
  sendOrganizerApprovedEmail,
  sendOrganizerRejectedEmail,
};
