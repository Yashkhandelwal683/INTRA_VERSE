const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Registration = require('../models/Registration');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const mongoose = require('mongoose');
const { createNotification } = require('./notificationController');
const { invalidatePattern } = require('../config/redis');

const COMMISSION_RATE = parseFloat(process.env.COMMISSION_RATE || '10');

/** Pre-upload validation: fail fast before Cloudinary uploads */
const validateEventBody = (req, _res, next) => {
  const required = ['title', 'description', 'category', 'startDate'];
  const missing = required.filter((f) => !req.body[f] || (typeof req.body[f] === 'string' && !req.body[f].trim()));
  if (missing.length) {
    return next(new ApiError(422, 'Validation failed', missing.map((f) => ({ field: f, message: `${f} is required` }))));
  }
  next();
};

const createEvent = async (req, res) => {
  const rawTags = req.body.tags ? (() => { try { return JSON.parse(req.body.tags); } catch { return []; } })() : [];
  const rawTickets = req.body.tickets ? (() => { try { return JSON.parse(req.body.tickets); } catch { return []; } })() : [];

  const body = {
    title: req.body.title,
    description: req.body.description,
    shortDescription: req.body.shortDescription || '',
    category: req.body.category,
    organizer: req.user.id,
    status: req.body.status || 'published',
    price: Number(req.body.price) || 0,
    teamSize: req.body.teamSize ? Number(req.body.teamSize) : null,
    minTeamSize: req.body.minTeamSize ? Number(req.body.minTeamSize) : null,
    maxParticipants: req.body.maxParticipants ? Number(req.body.maxParticipants) : null,
    totalCapacity: req.body.maxParticipants ? Number(req.body.maxParticipants) : null,
    eventType: req.body.eventType || 'solo',
    visibility: req.body.visibility || 'public',
    location: req.body.location || req.body.city || '',
    startDate: new Date(req.body.startDate),
    endDate: req.body.endDate ? new Date(req.body.endDate) : new Date(req.body.startDate),
    registrationDeadline: req.body.registrationDeadline ? new Date(req.body.registrationDeadline) : null,
    tags: rawTags.filter((t) => typeof t === 'string' && t.trim()),
  };

  // Parse premium fields if provided
  if (req.body.venue) {
    try {
      const parsed = typeof req.body.venue === 'string' ? JSON.parse(req.body.venue) : req.body.venue;
      body.venue = parsed;
    } catch {
      // Plain string venue — wrap as object
      body.venue = { name: req.body.venue };
    }
  }
  if (req.body.schedule) {
    try { body.schedule = typeof req.body.schedule === 'string' ? JSON.parse(req.body.schedule) : req.body.schedule; } catch { /* ignore */ }
  }
  if (req.body.highlights) {
    try { body.highlights = typeof req.body.highlights === 'string' ? JSON.parse(req.body.highlights) : req.body.highlights; } catch { /* ignore */ }
  }
  if (req.body.facilities) {
    try { body.facilities = typeof req.body.facilities === 'string' ? JSON.parse(req.body.facilities) : req.body.facilities; } catch { /* ignore */ }
  }
  if (req.body.rules) {
    try { body.rules = typeof req.body.rules === 'string' ? JSON.parse(req.body.rules) : req.body.rules; } catch { /* ignore */ }
  }
  if (req.body.faqs) {
    try { body.faqs = typeof req.body.faqs === 'string' ? JSON.parse(req.body.faqs) : req.body.faqs; } catch { /* ignore */ }
  }
  if (req.body.organizerDetails) {
    try { body.organizerDetails = typeof req.body.organizerDetails === 'string' ? JSON.parse(req.body.organizerDetails) : req.body.organizerDetails; } catch { /* ignore */ }
  }

  if (req.files?.bannerImage?.[0]?.path) {
    body.poster = req.files.bannerImage[0].path;
    body.bannerImage = req.files.bannerImage[0].path;
  }

  if (req.files?.gallery?.length > 0) {
    body.gallery = req.files.gallery.map((f) => f.path);
  }

  if (body.endDate && body.endDate <= body.startDate) {
    throw new ApiError(400, 'End date must be after start date');
  }
  if (body.registrationDeadline && body.registrationDeadline >= body.startDate) {
    throw new ApiError(400, 'Registration deadline cannot be after event start date');
  }
  if (body.eventType === 'team' && (!body.teamSize || body.teamSize < 2)) {
    throw new ApiError(400, 'Team size must be at least 2 for team events');
  }

  const event = await Event.create(body);

  const validTickets = rawTickets.filter((t) => t && t.name?.trim());
  if (validTickets.length > 0) {
    const ticketDocs = validTickets.map((t) => ({
      event: event._id,
      name: t.name.trim(),
      type: t.type || 'general',
      description: t.description || '',
      price: Number(t.price) || 0,
      totalQuantity: Number(t.quantity) || 50,
      soldQuantity: 0,
    }));
    await Ticket.insertMany(ticketDocs);
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`event:${event._id}`).emit('event:created', { eventId: event._id, title: event.title });
  }

  await invalidatePattern('admin');
  await invalidatePattern('org');
  await invalidatePattern('events');
  await invalidatePattern('analytics');

  res.status(201).json(new ApiResponse(201, event, 'Event created successfully'));
};

const getEvents = async (req, res) => {
  const {
    page = 1, limit = 12, category, search,
    sortBy = 'startDate', order = 'asc', organizer, visibility,
  } = req.query;

  const filter = {};

  if (organizer === 'me') {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    filter.organizer = req.user.id;
  } else {
    filter.status = 'published';
    filter.visibility = 'public';
  }

  if (visibility) filter.visibility = visibility;
  if (category) filter.category = category;
  if (search) filter.title = { $regex: search, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const sortOrder = order === 'desc' ? -1 : 1;

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('organizer', 'name email avatar')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Event.countDocuments(filter),
  ]);

  const eventIds = events.map((e) => e._id);
  const regCounts = await Registration.aggregate([
    { $match: { event: { $in: eventIds } } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ]);
  const regMap = {};
  regCounts.forEach((r) => { regMap[r._id.toString()] = r.count; });

  const enriched = events.map((e) => ({
    ...e,
    registrations: regMap[e._id.toString()] || 0,
    remainingSeats: e.maxParticipants ? Math.max(0, e.maxParticipants - (regMap[e._id.toString()] || 0)) : null,
  }));

  res.json(new ApiResponse(200, {
    events: enriched,
    pagination: {
      total, page: Number(page), limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }));
};

const getPublicEvents = async (req, res) => {
  const { page = 1, limit = 12, category, search } = req.query;
  const filter = { status: 'published', visibility: 'public' };
  if (category) filter.category = category;
  if (search) filter.title = { $regex: search, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('organizer', 'name email avatar')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Event.countDocuments(filter),
  ]);

  const eventIds = events.map((e) => e._id);
  const regCounts = await Registration.aggregate([
    { $match: { event: { $in: eventIds } } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ]);
  const regMap = {};
  regCounts.forEach((r) => { regMap[r._id.toString()] = r.count; });

  const enriched = events.map((e) => ({
    ...e,
    registrations: regMap[e._id.toString()] || 0,
    remainingSeats: e.maxParticipants ? Math.max(0, e.maxParticipants - (regMap[e._id.toString()] || 0)) : null,
  }));

  res.json(new ApiResponse(200, {
    events: enriched,
    pagination: {
      total, page: Number(page), limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }));
};

const getFeaturedEvents = async (_req, res) => {
  const events = await Event.find({ isFeatured: true, status: 'published', visibility: 'public' })
    .populate('organizer', 'name email avatar')
    .sort({ startDate: 1 })
    .limit(8)
    .lean();
  res.json(new ApiResponse(200, events, 'Featured events fetched'));
};

const getEventById = async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'name email avatar organizationName aboutOrganization');
  if (!event) throw new ApiError(404, 'Event not found');

  const regCount = await Registration.countDocuments({ event: event._id });

  // Fetch ticket types for this event
  const ticketTypes = await Ticket.find({ event: event._id, isActive: true }).lean();

  const eventData = {
    ...event.toObject(),
    ticketTypes,
    registrations: regCount,
    remainingSeats: event.maxParticipants ? Math.max(0, event.maxParticipants - regCount) : null,
  };

  // Fetch related events (same category, excluding current)
  const relatedEvents = await Event.find({
    _id: { $ne: event._id },
    category: event.category,
    status: 'published',
    visibility: 'public',
  })
    .populate('organizer', 'name email avatar')
    .sort({ startDate: 1 })
    .limit(6)
    .lean();

  // Enrich related events with registration counts
  const relatedIds = relatedEvents.map((e) => e._id);
  const relatedRegCounts = await Registration.aggregate([
    { $match: { event: { $in: relatedIds } } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ]);
  const relatedRegMap = {};
  relatedRegCounts.forEach((r) => { relatedRegMap[r._id.toString()] = r.count; });

  const enrichedRelated = relatedEvents.map((e) => ({
    ...e,
    registrations: relatedRegMap[e._id.toString()] || 0,
    remainingSeats: e.maxParticipants ? Math.max(0, e.maxParticipants - (relatedRegMap[e._id.toString()] || 0)) : null,
  }));

  eventData.relatedEvents = enrichedRelated;

  res.json(new ApiResponse(200, eventData, 'Event fetched successfully'));
};

const updateEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You are not authorized to update this event');
  }

  const rawTags = req.body.tags ? (() => { try { return JSON.parse(req.body.tags); } catch { return []; } })() : undefined;
  const rawTickets = req.body.tickets ? (() => { try { return JSON.parse(req.body.tickets); } catch { return []; } })() : undefined;

  const updates = { ...req.body };
  delete updates.tickets;
  delete updates.tags;
  if (rawTags !== undefined) updates.tags = rawTags.filter((t) => typeof t === 'string' && t.trim());
  if (req.files?.bannerImage?.[0]?.path) {
    updates.poster = req.files.bannerImage[0].path;
    updates.bannerImage = req.files.bannerImage[0].path;
  }
  if (req.files?.gallery?.length > 0) {
    updates.gallery = req.files.gallery.map((f) => f.path);
  }
  if (updates.price !== undefined) updates.price = Number(updates.price);
  if (updates.teamSize !== undefined) updates.teamSize = updates.teamSize ? Number(updates.teamSize) : null;
  if (updates.minTeamSize !== undefined) updates.minTeamSize = updates.minTeamSize ? Number(updates.minTeamSize) : null;
  if (updates.maxParticipants !== undefined) updates.maxParticipants = updates.maxParticipants ? Number(updates.maxParticipants) : null;
  if (updates.startDate) updates.startDate = new Date(updates.startDate);
  if (updates.endDate) updates.endDate = new Date(updates.endDate);
  if (updates.registrationDeadline) updates.registrationDeadline = new Date(updates.registrationDeadline);

  // Parse premium fields if provided as strings
  for (const field of ['venue', 'schedule', 'highlights', 'facilities', 'rules', 'faqs', 'organizerDetails']) {
    if (updates[field] && typeof updates[field] === 'string') {
      try { updates[field] = JSON.parse(updates[field]); } catch { /* ignore */ }
    }
  }

  const updated = await Event.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('organizer', 'name email avatar');

  if (rawTickets && Array.isArray(rawTickets)) {
    const validTickets = rawTickets.filter((t) => t && t.name?.trim());
    await Ticket.deleteMany({ event: event._id });
    if (validTickets.length > 0) {
      const ticketDocs = validTickets.map((t) => ({
        event: event._id,
        name: t.name.trim(),
        type: t.type || 'general',
        description: t.description || '',
        price: Number(t.price) || 0,
        totalQuantity: Number(t.quantity) || 50,
        soldQuantity: 0,
      }));
      await Ticket.insertMany(ticketDocs);
    }
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`event:${req.params.id}`).emit('event:updated', { eventId: req.params.id, event: updated });
  }

  await invalidatePattern('admin');
  await invalidatePattern('org');
  await invalidatePattern('events');
  await invalidatePattern('analytics');

  res.json(new ApiResponse(200, updated, 'Event updated successfully'));
};

const deleteEvent = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'You are not authorized to delete this event');
  }

  await Registration.deleteMany({ event: event._id });
  await event.deleteOne();

  await invalidatePattern('admin');
  await invalidatePattern('org');
  await invalidatePattern('events');
  await invalidatePattern('analytics');

  res.json(new ApiResponse(200, null, 'Event deleted successfully'));
};

const registerForEvent = async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.status !== 'published') throw new ApiError(400, 'Event is not accepting registrations');
  if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
    throw new ApiError(400, 'Registration deadline has passed');
  }

  const { name, email, phone, teamName, members } = req.body;

  const existingReg = await Registration.findOne({ event: id, 'members.email': email });
  if (existingReg) throw new ApiError(400, 'You have already registered for this event');

  let currentRegs;
  if (event.eventType === 'team') {
    const allRegs = await Registration.find({ event: id }).select('members').lean();
    currentRegs = allRegs.reduce((sum, r) => sum + (r.members?.length || 1), 0);
  } else {
    currentRegs = await Registration.countDocuments({ event: id });
  }
  if (event.maxParticipants && currentRegs >= event.maxParticipants) {
    throw new ApiError(400, 'Event is fully booked');
  }

  let registrationData = {
    event: id,
    organizer: event.organizer,
    attendee: req.user?.id || null,
    registrationType: event.eventType,
  };

  if (event.eventType === 'solo') {
    if (!name || !email) throw new ApiError(400, 'Name and email are required');
    registrationData.members = [{ name, email, phone: phone || '' }];
    registrationData.quantity = 1;
    registrationData.amountPaid = event.price || 0;
  } else {
    if (!teamName) throw new ApiError(400, 'Team name is required');
    if (!members || members.length < 2) throw new ApiError(400, 'Team must have at least 2 members');
    if (event.teamSize && members.length > event.teamSize) {
      throw new ApiError(400, `Team size cannot exceed ${event.teamSize}`);
    }
    if (event.minTeamSize && members.length < event.minTeamSize) {
      throw new ApiError(400, `Team must have at least ${event.minTeamSize} members`);
    }
    registrationData.teamName = teamName;
    registrationData.members = members.map((m) => ({
      name: m.name,
      email: m.email,
      phone: m.phone || '',
    }));
    // Team fee is charged per member (e.g. team of 2 pays 2 × ticket price)
    registrationData.quantity = members.length;
    registrationData.amountPaid = (event.price || 0) * members.length;
  }
  registrationData.grandTotal = registrationData.amountPaid;
  registrationData.paymentStatus = event.price > 0 ? 'pending' : 'completed';

  const registration = await Registration.create(registrationData);

  await Event.findByIdAndUpdate(id, { $inc: { totalBookings: 1 } });

  await invalidatePattern('admin');
  await invalidatePattern('org');
  await invalidatePattern('attendee');
  await invalidatePattern('analytics');

  res.status(201).json(new ApiResponse(201, registration, 'Registration successful'));
};

const getEventRegistrations = async (req, res) => {
  const { id } = req.params;
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [registrations, total] = await Promise.all([
    Registration.find({ event: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Registration.countDocuments({ event: id }),
  ]);

  res.json(new ApiResponse(200, {
    registrations,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  }));
};

const getOrganizerEvents = async (req, res) => {
  const oid = new mongoose.Types.ObjectId(req.user.id);
  const { status, page = 1, limit = 20 } = req.query;
  const query = { organizer: oid };
  if (status) query.status = status;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [events, total] = await Promise.all([
    Event.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Event.countDocuments(query),
  ]);

  const eventIds = events.map((e) => e._id);
  const regStats = await Registration.aggregate([
    { $match: { event: { $in: eventIds }, paymentStatus: 'paid' } },
    {
      $group: {
        _id: '$event',
        total: { $sum: 1 },
        solo: { $sum: { $cond: [{ $eq: ['$registrationType', 'solo'] }, 1, 0] } },
        team: { $sum: { $cond: [{ $eq: ['$registrationType', 'team'] }, 1, 0] } },
        revenue: { $sum: '$grandTotal' },
      },
    },
  ]);

  const regMap = {};
  regStats.forEach((r) => { regMap[r._id.toString()] = r; });

  const enriched = events.map((e) => {
    const stats = regMap[e._id.toString()] || { total: 0, solo: 0, team: 0, revenue: 0 };
    return {
      ...e,
      registrations: stats.total,
      soloRegistrations: stats.solo,
      teamRegistrations: stats.team,
      totalRevenue: stats.revenue,
    };
  });

  res.json(new ApiResponse(200, {
    events: enriched,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  }));
};

module.exports = {
  createEvent,
  validateEventBody,
  getEvents,
  getPublicEvents,
  getFeaturedEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getEventRegistrations,
  getOrganizerEvents,
};
