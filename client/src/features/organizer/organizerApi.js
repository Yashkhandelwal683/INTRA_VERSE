import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const organizerApi = createApi({
  reducerPath: 'organizerApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/organizer` }),
  tagTypes: ['Dashboard', 'Events', 'Attendees', 'Revenue', 'EventDetail'],
  endpoints: (build) => ({
    getDashboard: build.query({
      query: () => '/dashboard',
      keepUnusedDataFor: 1800,
      refetchOnMountOrArgChange: true,
      providesTags: ['Dashboard', 'Event'],
    }),
    getEvents: build.query({
      query: (params) => ({ url: '/events', params }),
      keepUnusedDataFor: 300,
      providesTags: ['Events'],
    }),
    getEventDetail: build.query({
      query: (eventId) => `/events/${eventId}`,
      transformResponse: (res) => res.data || res,
      keepUnusedDataFor: 300,
      providesTags: (_r, _e, id) => [{ type: 'EventDetail', id }],
    }),
    exportRegistrations: build.query({
      query: ({ eventId, format }) => `/events/${eventId}/export?format=${format || 'csv'}`,
      providesTags: [],
    }),
    getAttendees: build.query({
      query: (params) => ({ url: '/attendees', params }),
      keepUnusedDataFor: 300,
      providesTags: ['Attendees'],
    }),
    getRevenue: build.query({
      query: (period) => `/revenue?period=${period || 'monthly'}`,
      keepUnusedDataFor: 1800,
      providesTags: ['Revenue'],
    }),
    getAnalytics: build.query({
      query: () => '/analytics',
      keepUnusedDataFor: 3600,
      providesTags: ['Dashboard'],
    }),
    exportAttendees: build.query({
      query: (params) => ({ url: '/attendees', params: { ...params, export: 'true' }, responseHandler: (res) => res.blob() }),
      providesTags: [],
    }),
  }),
});

export const {
  useGetDashboardQuery,
  useGetEventsQuery,
  useGetEventDetailQuery,
  useLazyExportRegistrationsQuery,
  useGetAttendeesQuery,
  useGetRevenueQuery,
  useGetAnalyticsQuery,
  useLazyExportAttendeesQuery,
} = organizerApi;
