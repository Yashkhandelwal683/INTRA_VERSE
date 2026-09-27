import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const ticketsApi = createApi({
  reducerPath: 'ticketsApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/tickets` }),
  endpoints: (build) => ({
    /** POST /api/tickets/validate — organizer/admin validates a QR token at the gate */
    validateTicket: build.mutation({
      query: (body) => ({ url: '/validate', method: 'POST', body }),
      transformResponse: (res) => res,  // return full envelope {statusCode, data, message}
    }),
    /** GET /api/tickets/fraud-report?eventId=xxx — admin only */
    getFraudReport: build.query({
      query: (eventId) => `/fraud-report?eventId=${eventId}`,
      transformResponse: (res) => res.data || res,
    }),
    /** GET /api/tickets/event/:eventId — public */
    getTicketsByEvent: build.query({
      query: (eventId) => `/event/${eventId}`,
      transformResponse: (res) => res.data || res,
    }),
  }),
});

export const {
  useValidateTicketMutation,
  useGetFraudReportQuery,
  useGetTicketsByEventQuery,
} = ticketsApi;
