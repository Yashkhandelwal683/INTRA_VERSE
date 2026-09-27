import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const checkoutApi = createApi({
  reducerPath: 'checkoutApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api` }),
  tagTypes: ['Registration', 'MyTickets'],
  endpoints: (build) => ({
    getMyTickets: build.query({
      query: (params) => ({ url: '/attendee/tickets', params }),
      transformResponse: (res) => res.data || res,
      providesTags: ['MyTickets'],
    }),
    getTicketById: build.query({
      query: (id) => `/attendee/tickets/${id}`,
      transformResponse: (res) => res.data || res,
      providesTags: (_r, _e, id) => [{ type: 'MyTickets', id }],
    }),
    getOrganizerRegistrations: build.query({
      query: (params) => ({ url: '/ticket-management/registrations', params }),
      transformResponse: (res) => res.data || res,
      providesTags: ['Registration'],
    }),
    getRegistrationById: build.query({
      query: (id) => `/ticket-management/registrations/${id}`,
      transformResponse: (res) => res.data || res,
    }),
    approveTicket: build.mutation({
      query: ({ id, ...body }) => ({ url: `/ticket-management/registrations/${id}/approve`, method: 'PATCH', body }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Registration', 'MyTickets'],
    }),
    rejectTicket: build.mutation({
      query: ({ id, reason }) => ({ url: `/ticket-management/registrations/${id}/reject`, method: 'PATCH', body: { reason } }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Registration', 'MyTickets'],
    }),
    getAdminTicketRequests: build.query({
      query: (params) => ({ url: '/admin/ticket-requests', params }),
      transformResponse: (res) => res.data || res,
      providesTags: ['Registration'],
    }),
    getAdminTicketRequestStats: build.query({
      query: () => '/admin/ticket-requests/stats',
      transformResponse: (res) => res.data || res,
      providesTags: ['Registration'],
    }),
    getAdminBookings: build.query({
      query: (params) => ({ url: '/admin/bookings', params }),
      transformResponse: (res) => res.data || res,
      providesTags: ['Registration'],
    }),
    getAdminBookingStats: build.query({
      query: () => '/admin/bookings/stats',
      transformResponse: (res) => res.data || res,
      providesTags: ['Registration'],
    }),
    getAdminEvents: build.query({
      query: (params) => ({ url: '/admin/events', params }),
      transformResponse: (res) => res.data || res,
      providesTags: ['Event'],
    }),
  }),
});

export const {
  useGetMyTicketsQuery,
  useGetTicketByIdQuery,
  useGetOrganizerRegistrationsQuery,
  useGetRegistrationByIdQuery,
  useApproveTicketMutation,
  useRejectTicketMutation,
  useGetAdminTicketRequestsQuery,
  useGetAdminTicketRequestStatsQuery,
  useGetAdminBookingsQuery,
  useGetAdminBookingStatsQuery,
  useGetAdminEventsQuery,
} = checkoutApi;
