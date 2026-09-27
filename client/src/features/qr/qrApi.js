import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const qrApi = createApi({
  reducerPath: 'qrApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/qr` }),
  tagTypes: ['Attendees'],
  endpoints: (build) => ({
    generateEventQR: build.query({ query: (eventId) => `/event/${eventId}` }),
    scanTicket: build.mutation({ query: (body) => ({ url: '/scan', method: 'POST', body }) }),
    confirmEntry: build.mutation({ query: (body) => ({ url: '/confirm-entry', method: 'POST', body }) }),
    getAttendeesByEvent: build.query({
      query: ({ eventId, ...params }) => ({ url: `/attendees/event/${eventId}`, params }),
      providesTags: ['Attendees'],
    }),
    getAttendeesByOrganizer: build.query({
      query: () => '/attendees',
      providesTags: ['Attendees'],
    }),
    exportAttendees: build.query({
      query: (params) => ({ url: '/attendees/export', params }),
    }),
  }),
});

export const {
  useGenerateEventQRQuery,
  useScanTicketMutation,
  useConfirmEntryMutation,
  useGetAttendeesByEventQuery,
  useGetAttendeesByOrganizerQuery,
  useExportAttendeesQuery,
  useLazyExportAttendeesQuery,
} = qrApi;
