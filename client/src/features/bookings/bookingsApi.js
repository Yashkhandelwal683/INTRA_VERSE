import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const bookingsApi = createApi({
  reducerPath: 'bookingsApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/bookings` }),
  tagTypes: ['Booking', 'CancellationRequest'],
  endpoints: (build) => ({
    createBooking: build.mutation({
      query: (body) => ({ url: '/', method: 'POST', body }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Booking'],
    }),
    getUserBookings: build.query({
      query: () => '/my',
      transformResponse: (res) => res.data || res,
      keepUnusedDataFor: 300,
      providesTags: ['Booking'],
    }),
    getBookingById: build.query({
      query: (id) => `/${id}`,
      transformResponse: (res) => res.data || res,
      providesTags: (_r, _e, id) => [{ type: 'Booking', id }],
    }),
    cancelBooking: build.mutation({
      query: (id) => ({ url: `/${id}/cancel`, method: 'PATCH' }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Booking'],
    }),

    requestCancellation: build.mutation({
      query: ({ bookingId, cancellationReason }) => ({
        url: `/${bookingId}/cancel-request`,
        method: 'POST',
        body: { cancellationReason },
      }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Booking'],
    }),

    getPendingCancellations: build.query({
      query: () => '/cancellation-requests',
      transformResponse: (res) => res.data || res,
      providesTags: ['CancellationRequest'],
    }),

    adminCancellationDecision: build.mutation({
      query: ({ bookingId, decision, reason }) => ({
        url: `/${bookingId}/admin-decision`,
        method: 'POST',
        body: { decision, reason },
      }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Booking', 'CancellationRequest'],
    }),
  }),
});

export const {
  useCreateBookingMutation,
  useGetUserBookingsQuery,
  useGetBookingByIdQuery,
  useCancelBookingMutation,
  useRequestCancellationMutation,
  useGetPendingCancellationsQuery,
  useAdminCancellationDecisionMutation,
} = bookingsApi;
