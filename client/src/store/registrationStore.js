import { create } from 'zustand';

const STORAGE_KEY = 'eventfiesta_registration';

const createEmptyAttendee = (ticketId = '', ticketType = '') => ({
  ticketId,
  ticketType,
  name: '',
  email: '',
  phone: '',
  gender: '',
  college: '',
  department: '',
  year: '',
  emergencyContact: '',
  specialRequest: '',
});

const emptyState = {
  step: 1,
  eventId: null,
  event: null,
  selections: {},
  tickets: [],
  booker: { fullName: '', email: '', phone: '', college: '' },
  useBookerForFirst: false,
  attendees: [],
};

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.eventId || !parsed.selections) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state) {
  try {
    const toSave = {
      step: state.step,
      eventId: state.eventId,
      event: state.event
        ? { _id: state.event._id, title: state.event.title, bannerImage: state.event.bannerImage, poster: state.event.poster, startDate: state.event.startDate, venue: state.event.venue, organizer: state.event.organizer }
        : null,
      selections: state.selections,
      tickets: state.tickets,
      booker: state.booker,
      useBookerForFirst: state.useBookerForFirst,
      attendees: state.attendees,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* ignore quota errors */ }
}

const persisted = loadPersisted();

const useRegistrationStore = create((set, get) => ({
  ...(persisted || emptyState),

  initRegistration: (event, tickets, selections, user) => {
    const totalTickets = Object.values(selections).reduce((s, q) => s + q, 0);
    const attendeeList = [];

    for (const ticket of tickets) {
      const qty = selections[ticket._id] || 0;
      for (let i = 0; i < qty; i++) {
        attendeeList.push(createEmptyAttendee(ticket._id, ticket.name));
      }
    }

    const newState = {
      eventId: event._id,
      event,
      tickets,
      selections,
      attendees: attendeeList,
      booker: {
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        college: user?.college || '',
      },
      useBookerForFirst: false,
      step: 1,
    };
    set(newState);
    persist({ ...get(), ...newState });
  },

  setStep: (step) => {
    set({ step });
    persist({ ...get(), step });
  },

  updateBooker: (field, value) => {
    set((state) => {
      const booker = { ...state.booker, [field]: value };
      persist({ ...state, booker });
      return { booker };
    });
  },

  setUseBookerForFirst: (checked) => {
    const state = get();
    set({ useBookerForFirst: checked });
    if (checked && state.attendees.length > 0) {
      const updated = [...state.attendees];
      updated[0] = {
        ...updated[0],
        name: state.booker.fullName,
        email: state.booker.email,
        phone: state.booker.phone,
        college: state.booker.college,
      };
      set({ attendees: updated });
      persist({ ...get(), attendees: updated, useBookerForFirst: checked });
    } else {
      persist({ ...get(), useBookerForFirst: checked });
    }
  },

  updateAttendee: (index, field, value) =>
    set((state) => {
      const updated = [...state.attendees];
      updated[index] = { ...updated[index], [field]: value };
      persist({ ...state, attendees: updated });
      return { attendees: updated };
    }),

  syncBookerToFirst: () => {
    const state = get();
    if (state.attendees.length > 0) {
      const updated = [...state.attendees];
      updated[0] = {
        ...updated[0],
        name: state.booker.fullName,
        email: state.booker.email,
        phone: state.booker.phone,
        college: state.booker.college,
      };
      set({ attendees: updated });
      persist({ ...state, attendees: updated });
    }
  },

  adjustAttendees: (newSelections) => {
    const state = get();
    const newAttendees = [];

    for (const ticket of state.tickets) {
      const qty = newSelections[ticket._id] || 0;
      const existingForTicket = state.attendees.filter((a) => a.ticketId === ticket._id);

      for (let i = 0; i < qty; i++) {
        if (i < existingForTicket.length) {
          newAttendees.push(existingForTicket[i]);
        } else {
          newAttendees.push(createEmptyAttendee(ticket._id, ticket.name));
        }
      }
    }

    set({ attendees: newAttendees, selections: newSelections });
    persist({ ...get(), attendees: newAttendees, selections: newSelections });
  },

  validateBooker: () => {
    const { booker } = get();
    const errors = {};
    if (!booker.fullName.trim()) errors.fullName = 'Full name is required';
    if (!booker.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(booker.email)) errors.email = 'Invalid email address';
    if (!booker.phone.trim()) errors.phone = 'Phone number is required';
    else if (!/^[+]?[\d\s-]{7,15}$/.test(booker.phone)) errors.phone = 'Invalid phone number';
    return errors;
  },

  validateAttendees: () => {
    const { attendees } = get();
    const errors = {};
    attendees.forEach((a, i) => {
      const errs = {};
      if (!a.name.trim()) errs.name = 'Name is required';
      if (!a.email.trim()) errs.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(a.email)) errs.email = 'Invalid email';
      if (!a.phone.trim()) errs.phone = 'Phone is required';
      else if (!/^[+]?[\d\s-]{7,15}$/.test(a.phone)) errs.phone = 'Invalid phone';
      if (Object.keys(errs).length > 0) errors[i] = errs;
    });
    return errors;
  },

  getTotalTickets: () => get().attendees.length,

  getSubtotal: () => {
    const { tickets, selections } = get();
    return tickets.reduce((sum, t) => sum + (selections[t._id] || 0) * t.price, 0);
  },

  isInitialized: () => {
    const s = get();
    return !!(s.eventId && s.selections && Object.keys(s.selections).length > 0);
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ ...emptyState });
  },
}));

export default useRegistrationStore;
