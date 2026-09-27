const express = require('express');

const authRoutes        = require('./authRoutes');
const eventRoutes       = require('./eventRoutes');
const ticketRoutes      = require('./ticketRoutes');
const bookingRoutes     = require('./bookingRoutes');
const paymentRoutes     = require('./paymentRoutes');
const userRoutes        = require('./userRoutes');
const adminRoutes       = require('./adminRoutes');
const subEventRoutes    = require('./subEventRoutes');
const analyticsRoutes   = require('./analyticsRoutes');
const qrRoutes          = require('./qrRoutes');
const notificationRoutes = require('./notificationRoutes');
const reviewRoutes      = require('./reviewRoutes');
const organizerRoutes   = require('./organizerRoutes');
const approvalRoutes    = require('./approvalRoutes');
const attendeeRoutes    = require('./attendeeRoutes');
const ticketManagementRoutes = require('./ticketManagementRoutes');
const adminTicketRoutes       = require('./adminTicketRoutes');
const attendeeTicketRoutes    = require('./attendeeTicketRoutes');
const wishlistRoutes          = require('./wishlistRoutes');
const eventStaffRoutes        = require('./eventStaffRoutes');

const router = express.Router();

router.use('/auth',          authRoutes);
router.use('/events',        eventRoutes);
router.use('/tickets',       ticketRoutes);
router.use('/bookings',      bookingRoutes);
router.use('/payments',      paymentRoutes);
router.use('/users',         userRoutes);
router.use('/admin',         adminTicketRoutes);  // must come before generic adminRoutes
router.use('/admin',         adminRoutes);
router.use('/sub-events',    subEventRoutes);
router.use('/analytics',     analyticsRoutes);
router.use('/qr',            qrRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reviews',       reviewRoutes);
router.use('/organizer',     organizerRoutes);
router.use('/approval',      approvalRoutes);
router.use('/attendee',      attendeeRoutes);
router.use('/attendee',      attendeeTicketRoutes);
router.use('/ticket-management', ticketManagementRoutes);
router.use('/wishlist',         wishlistRoutes);
router.use('/team',             eventStaffRoutes);

module.exports = router;
