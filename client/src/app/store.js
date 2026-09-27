import { configureStore } from '@reduxjs/toolkit';
import authReducer    from '../features/auth/authSlice';
import eventsReducer  from '../features/events/eventsSlice';
import bookingsReducer from '../features/bookings/bookingsSlice';
import { authApi }    from '../features/auth/authApi';
import { eventsApi }  from '../features/events/eventsApi';
import { bookingsApi } from '../features/bookings/bookingsApi';
import { paymentsApi } from '../features/payments/paymentsApi';
import { ticketsApi }  from '../features/tickets/ticketsApi';
import { analyticsApi } from '../features/analytics/analyticsApi';
import { qrApi }        from '../features/qr/qrApi';
import { notificationsApi } from '../features/notifications/notificationsApi';
import { reviewsApi }      from '../features/reviews/reviewsApi';
import { subEventsApi }    from '../features/subEvents/subEventsApi';
import { organizerApi }    from '../features/organizer/organizerApi';
import { attendeeApi }     from '../features/attendee/attendeeApi';
import { checkoutApi }     from '../features/checkout/checkoutApi';
import { wishlistApi }     from '../features/wishlist/wishlistApi';
import { teamApi }          from '../features/team/teamApi';

export const store = configureStore({
  reducer: {
    auth:      authReducer,
    events:    eventsReducer,
    bookings:  bookingsReducer,
    [authApi.reducerPath]:     authApi.reducer,
    [eventsApi.reducerPath]:   eventsApi.reducer,
    [bookingsApi.reducerPath]: bookingsApi.reducer,
    [paymentsApi.reducerPath]: paymentsApi.reducer,
    [ticketsApi.reducerPath]:  ticketsApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [qrApi.reducerPath]:        qrApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [reviewsApi.reducerPath]:      reviewsApi.reducer,
    [subEventsApi.reducerPath]:    subEventsApi.reducer,
    [organizerApi.reducerPath]:    organizerApi.reducer,
    [attendeeApi.reducerPath]:     attendeeApi.reducer,
    [checkoutApi.reducerPath]:     checkoutApi.reducer,
    [wishlistApi.reducerPath]:     wishlistApi.reducer,
    [teamApi.reducerPath]:         teamApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      eventsApi.middleware,
      bookingsApi.middleware,
      paymentsApi.middleware,
      ticketsApi.middleware,
      analyticsApi.middleware,
      qrApi.middleware,
      notificationsApi.middleware,
      reviewsApi.middleware,
      subEventsApi.middleware,
      organizerApi.middleware,
      attendeeApi.middleware,
      checkoutApi.middleware,
      wishlistApi.middleware,
      teamApi.middleware,
    ),
});

export default store;
