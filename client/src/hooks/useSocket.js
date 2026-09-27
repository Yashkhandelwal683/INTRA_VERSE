import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { selectCurrentUser, selectIsAuth, selectUserRole } from '../features/auth/authSlice';
import { eventsApi } from '../features/events/eventsApi';
import { bookingsApi } from '../features/bookings/bookingsApi';
import { notificationsApi } from '../features/notifications/notificationsApi';
import { useNotificationStore } from '../store/notificationStore';
import { useAdminDashboardStore } from '../store/adminDashboardStore';

export function useSocket() {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const isAuth = useSelector(selectIsAuth);
  const user = useSelector(selectCurrentUser);
  const role = useSelector(selectUserRole);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!isAuth || !user) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinUser', user.id || user._id);
      if (role === 'admin') socket.emit('joinAdmin');
    });

    socket.on('ticketUpdate', ({ eventId, ticketTypeId, soldQuantity }) => {
      dispatch(
        eventsApi.util.updateQueryData('getEventById', eventId, (draft) => {
          if (!draft) return;
          const tickets = draft.ticketTypes || draft.tickets || [];
          const tkt = tickets.find(
            (t) => t._id === ticketTypeId || String(t._id) === String(ticketTypeId),
          );
          if (tkt) tkt.soldQuantity = soldQuantity;
        }),
      );
    });

    socket.on('notification:new', (notification) => {
      dispatch(notificationsApi.util.invalidateTags(['Notification']));
      addNotification(notification);
      toast(notification.title || 'New notification', {
        icon: getNotificationIcon(notification?.type),
        duration: 4000,
      });
    });

    socket.on('booking:new', ({ eventId }) => {
      dispatch(eventsApi.util.invalidateTags(['Event']));
    });

    socket.on('cancellation:request', ({ bookingId }) => {
      dispatch(bookingsApi.util.invalidateTags(['CancellationRequest']));
      toast('New cancellation request', { icon: '📋' });
    });

    socket.on('cancellation:decision', ({ decision, refundAmount }) => {
      dispatch(bookingsApi.util.invalidateTags(['Booking']));
      if (decision === 'approved') {
        toast.success(`Cancellation approved. Refund: ₹${refundAmount}`);
      } else {
        toast.error('Cancellation request rejected');
      }
    });

    socket.on('cancellation:resolved', () => {
      dispatch(bookingsApi.util.invalidateTags(['CancellationRequest']));
    });

    socket.on('organizer:approval', ({ name, status }) => {
      toast(`${name} ${status === 'approved' ? 'approved' : 'rejected'} as organizer`, {
        icon: status === 'approved' ? '✅' : '❌',
      });
      useAdminDashboardStore.getState().bumpRefresh();
    });

    socket.on('payment:confirmed', ({ bookingId, amount }) => {
      dispatch(bookingsApi.util.invalidateTags(['Booking']));
      toast.success(`Payment confirmed: ₹${amount}`);
    });

    socket.on('event:created', () => {
      dispatch(eventsApi.util.invalidateTags(['Event']));
    });

    socket.on('event:updated', ({ eventId }) => {
      dispatch(eventsApi.util.invalidateTags([{ type: 'Event', id: eventId }, 'Event']));
    });

    socket.on('ticket:approved', ({ registrationId, ticketCode }) => {
      dispatch(notificationsApi.util.invalidateTags(['Notification']));
      toast.success(`Your ticket has been approved! Code: ${ticketCode}`);
    });

    socket.on('ticket:rejected', ({ registrationId, reason }) => {
      dispatch(notificationsApi.util.invalidateTags(['Notification']));
      toast.error(`Ticket rejected: ${reason || 'No reason provided'}`);
    });

    socket.on('disconnect', () => {});

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dispatch, isAuth, user, role, addNotification]);

  return socketRef;
}

function getNotificationIcon(type) {
  const icons = {
    new_booking: '🎫',
    refund: '💰',
    cancellation: '❌',
    review: '⭐',
    payment_failed: '⚠️',
    new_registration: '📝',
    event_reminder: '⏰',
    ticket_checked_in: '✅',
    event_update: '📢',
    organizer_approved: '🎉',
    organizer_rejected: '🚫',
  };
  return icons[type] || '🔔';
}
