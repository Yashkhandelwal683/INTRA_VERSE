const PDFDocument = require('pdfkit');

function generateTicketPDF({ attendee, event, subEvent, ticket, booking, qrImage }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [400, 700], margin: 20 });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primaryColor = '#4f46e5';
    const lightBg = '#f8f9fc';

    // Background
    doc.rect(0, 0, 400, 700).fill(lightBg);

    // Header Banner
    doc.rect(0, 0, 400, 140).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold')
      .text('EVENT FIESTA', 20, 30, { align: 'center' });
    doc.fontSize(12).font('Helvetica')
      .text('Premium Event Ticket', 20, 65, { align: 'center' });
    doc.fontSize(9).font('Helvetica')
      .text('Digital Entry Pass', 20, 85, { align: 'center' });

    // Divider line
    doc.moveTo(20, 145).lineTo(380, 145).strokeColor('#e2e8f0').stroke();

    // Event Title
    doc.fillColor('#1e293b').fontSize(18).font('Helvetica-Bold')
      .text(event.title || 'Event', 20, 160, { align: 'center' });

    // Details
    let yPos = 190;
    const leftX = 40;
    const rightX = 220;
    const lineHeight = 18;

    doc.fontSize(10).font('Helvetica');
    const details = [
      ['Ticket ID', ticket.ticketCode || 'N/A'],
      ['Booking Ref', booking.bookingRef || 'N/A'],
      ['Attendee', attendee.name || 'N/A'],
      ['Phone', attendee.phone || 'N/A'],
      ['Email', attendee.email || 'N/A'],
      ['Event', event.title || 'N/A'],
    ];
    if (subEvent) details.push(['Sub Event', subEvent.title]);
    details.push(
      ['Ticket Type', ticket.tierName || 'General'],
      ['Date', event.startDate ? new Date(event.startDate).toDateString() : 'N/A'],
      ['Venue', event.venue ? `${event.venue.name || ''}, ${event.venue.city || ''}` : 'N/A'],
      ['Amount Paid', booking.totalAmount ? `₹${booking.totalAmount}` : 'Free'],
    );

    details.forEach(([label, value]) => {
      doc.fillColor('#64748b').font('Helvetica').text(label, leftX, yPos);
      doc.fillColor('#1e293b').font('Helvetica-Bold').text(String(value), rightX, yPos);
      yPos += lineHeight;
    });

    // QR Code
    if (qrImage) {
      yPos += 10;
      const qrSize = 140;
      const qrX = (400 - qrSize) / 2;
      doc.rect(qrX - 5, yPos - 5, qrSize + 10, qrSize + 10).fillColor('#ffffff').fill();
      doc.rect(qrX - 5, yPos - 5, qrSize + 10, qrSize + 10).strokeColor('#e2e8f0').stroke();

      const base64Data = qrImage.replace(/^data:image\/png;base64,/, '');
      doc.image(Buffer.from(base64Data, 'base64'), qrX, yPos, { width: qrSize, height: qrSize });
      yPos += qrSize + 15;
    }

    // Terms
    yPos += 10;
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
      .text('• Valid for one-time entry only. Non-transferable. • Present QR at venue entrance.', 20, yPos, { align: 'center' });
    yPos += 14;
    doc.text('• This ticket is digitally verified and cannot be duplicated. • In case of issues, contact support@eventfiesta.com', 20, yPos, { align: 'center' });

    // Footer
    doc.rect(0, 660, 400, 40).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica')
      .text('Powered by Event Fiesta © 2026 | Secure Digital Ticketing', 20, 672, { align: 'center' });

    doc.end();
  });
}

function generateInvoicePDF({ booking, event, payment, attendee, ticket }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primaryColor = '#4f46e5';
    const grayColor = '#64748b';

    // Header
    doc.rect(0, 0, 595, 120).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(30).font('Helvetica-Bold')
      .text('INVOICE', 40, 30);
    doc.fontSize(10).font('Helvetica')
      .text('Event Fiesta Platform', 40, 70);
    doc.text(`Invoice #: INV-${booking.bookingRef || 'N/A'}`, 40, 90);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 40, 105);

    // Billing Section
    let yPos = 150;
    doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Bill To:', 40, yPos);
    yPos += 20;
    doc.fillColor(grayColor).fontSize(10).font('Helvetica');
    doc.text(attendee.name || 'N/A', 40, yPos); yPos += 14;
    doc.text(attendee.email || 'N/A', 40, yPos); yPos += 14;
    doc.text(attendee.phone || 'N/A', 40, yPos); yPos += 14;
    if (attendee.address) doc.text(attendee.address, 40, yPos);

    // Event Details
    yPos = 150;
    doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Event Details:', 300, yPos);
    yPos += 20;
    doc.fillColor(grayColor).fontSize(10).font('Helvetica');
    doc.text(`Event: ${event.title || 'N/A'}`, 300, yPos); yPos += 14;
    doc.text(`Date: ${event.startDate ? new Date(event.startDate).toDateString() : 'N/A'}`, 300, yPos); yPos += 14;
    if (event.venue) doc.text(`Venue: ${event.venue.name || ''}, ${event.venue.city || ''}`, 300, yPos);

    // Line Items Table
    yPos = 250;
    doc.rect(40, yPos, 515, 25).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, yPos + 6);
    doc.text('Qty', 350, yPos + 6);
    doc.text('Price', 420, yPos + 6);
    doc.text('Total', 490, yPos + 6, { width: 60, align: 'right' });

    yPos += 30;
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica');
    const ticketName = ticket?.tierName || 'General Admission';
    doc.text(ticketName, 50, yPos);
    doc.text('1', 350, yPos);
    doc.text(`₹${booking.totalAmount || 0}`, 420, yPos);
    doc.text(`₹${booking.totalAmount || 0}`, 490, yPos, { width: 60, align: 'right' });

    yPos += 25;
    doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor('#e2e8f0').stroke();

    // Totals
    yPos += 20;
    const subtotal = booking.totalAmount || 0;
    const gst = Math.round(subtotal * 0.18);
    const platformFee = Math.round(subtotal * 0.05);
    const total = subtotal + gst + platformFee;

    doc.fillColor(grayColor).fontSize(10).font('Helvetica');
    doc.text('Subtotal:', 420, yPos); doc.text(`₹${subtotal}`, 490, yPos, { width: 60, align: 'right' }); yPos += 18;
    doc.text('GST (18%):', 420, yPos); doc.text(`₹${gst}`, 490, yPos, { width: 60, align: 'right' }); yPos += 18;
    doc.text('Platform Fee:', 420, yPos); doc.text(`₹${platformFee}`, 490, yPos, { width: 60, align: 'right' }); yPos += 18;
    doc.moveTo(420, yPos).lineTo(550, yPos).strokeColor('#e2e8f0').stroke(); yPos += 10;
    doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 420, yPos); doc.text(`₹${total}`, 490, yPos, { width: 60, align: 'right' });

    // Payment Info
    yPos = Math.max(yPos + 40, 450);
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text('Payment Information', 40, yPos);
    yPos += 20;
    doc.fillColor(grayColor).fontSize(10).font('Helvetica');
    doc.text(`Payment Status: ${payment?.status || 'Completed'}`, 40, yPos); yPos += 16;
    doc.text(`Transaction ID: ${payment?.razorpayPaymentId || 'N/A'}`, 40, yPos); yPos += 16;
    doc.text(`Payment Method: Razorpay`, 40, yPos); yPos += 16;
    doc.text(`Booking Ref: ${booking.bookingRef || 'N/A'}`, 40, yPos); yPos += 16;
    doc.text(`Ticket ID: ${ticket?.ticketCode || 'N/A'}`, 40, yPos);

    // Footer
    doc.rect(0, 780, 595, 60).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica')
      .text('Thank you for choosing Event Fiesta! | support@eventfiesta.com | Invoice is valid without signature', 40, 800, { align: 'center' });

    doc.end();
  });
}

module.exports = { generateTicketPDF, generateInvoicePDF };
