const SubEvent = require('../models/SubEvent');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const mongoose = require('mongoose');

exports.createSubEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to add sub-events to this event');
    }
    const subEvent = await SubEvent.create({ ...req.body, event: eventId, organizer: req.user.id });
    res.status(201).json(new ApiResponse(201, { subEvent }, 'Sub-event created'));
  } catch (err) { next(err); }
};

exports.getSubEvents = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const subEvents = await SubEvent.find({ event: eventId });
    res.json(new ApiResponse(200, { subEvents }));
  } catch (err) { next(err); }
};

exports.getSubEvent = async (req, res, next) => {
  try {
    const subEvent = await SubEvent.findById(req.params.id).populate('event', 'title');
    if (!subEvent) throw new ApiError(404, 'Sub-event not found');
    res.json(new ApiResponse(200, { subEvent }));
  } catch (err) { next(err); }
};

exports.updateSubEvent = async (req, res, next) => {
  try {
    const subEvent = await SubEvent.findById(req.params.id);
    if (!subEvent) throw new ApiError(404, 'Sub-event not found');
    if (subEvent.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized');
    }
    Object.assign(subEvent, req.body);
    await subEvent.save();
    res.json(new ApiResponse(200, { subEvent }, 'Sub-event updated'));
  } catch (err) { next(err); }
};

exports.deleteSubEvent = async (req, res, next) => {
  try {
    const subEvent = await SubEvent.findById(req.params.id);
    if (!subEvent) throw new ApiError(404, 'Sub-event not found');
    if (subEvent.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized');
    }
    await subEvent.deleteOne();
    res.json(new ApiResponse(200, null, 'Sub-event deleted'));
  } catch (err) { next(err); }
};

exports.getOrganizerSubEvents = async (req, res, next) => {
  try {
    const subEvents = await SubEvent.find({ organizer: req.user.id })
      .populate('event', 'title bannerImage')
      .sort({ createdAt: -1 });
    res.json(new ApiResponse(200, { subEvents }));
  } catch (err) { next(err); }
};
