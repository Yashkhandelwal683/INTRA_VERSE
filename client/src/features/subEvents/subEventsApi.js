import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const subEventsApi = createApi({
  reducerPath: 'subEventsApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/sub-events` }),
  tagTypes: ['SubEvent'],
  endpoints: (build) => ({
    getSubEvents: build.query({
      query: (eventId) => `/event/${eventId}`,
      providesTags: ['SubEvent'],
    }),
    getOrganizerSubEvents: build.query({
      query: () => '/organizer',
      providesTags: ['SubEvent'],
    }),
    getSubEvent: build.query({ query: (id) => `/${id}` }),
    createSubEvent: build.mutation({
      query: ({ eventId, ...body }) => ({ url: `/event/${eventId}`, method: 'POST', body }),
      invalidatesTags: ['SubEvent'],
    }),
    updateSubEvent: build.mutation({
      query: ({ id, ...body }) => ({ url: `/${id}`, method: 'PUT', body }),
      invalidatesTags: ['SubEvent'],
    }),
    deleteSubEvent: build.mutation({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SubEvent'],
    }),
  }),
});

export const {
  useGetSubEventsQuery,
  useGetOrganizerSubEventsQuery,
  useGetSubEventQuery,
  useCreateSubEventMutation,
  useUpdateSubEventMutation,
  useDeleteSubEventMutation,
} = subEventsApi;
