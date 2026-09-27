import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api` }),
  tagTypes: ['Event', 'Registration'],
  endpoints: (build) => ({
    getEvents: build.query({
      query: (params = {}) => ({ url: '/events', params }),
      transformResponse: (res) => res.data || res,
      keepUnusedDataFor: 300,
      providesTags: ['Event'],
    }),
    getPublicEvents: build.query({
      query: (params = {}) => ({ url: '/events/public', params }),
      transformResponse: (res) => res.data || res,
      keepUnusedDataFor: 600,
      providesTags: ['Event'],
    }),
    getFeaturedEvents: build.query({
      query: () => '/events/featured',
      transformResponse: (res) => res.data || res,
      keepUnusedDataFor: 1800,
      providesTags: ['Event'],
    }),
    getEventById: build.query({
      query: (id) => `/events/${id}`,
      transformResponse: (res) => res.data || res,
      keepUnusedDataFor: 300,
      providesTags: (_r, _e, id) => [{ type: 'Event', id }],
    }),
    createEvent: build.mutation({
      query: (formData) => ({
        url: '/events',
        method: 'POST',
        body: formData,
      }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Event'],
    }),
    updateEvent: build.mutation({
      query: ({ id, formData }) => ({
        url: `/events/${id}`,
        method: 'PUT',
        body: formData,
      }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Event', id }, 'Event'],
    }),
    deleteEvent: build.mutation({
      query: (id) => ({ url: `/events/${id}`, method: 'DELETE' }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Event'],
    }),
    registerForEvent: build.mutation({
      query: ({ id, data }) => ({
        url: `/events/${id}/register`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (res) => res.data || res,
      invalidatesTags: ['Registration', 'Event'],
    }),
    getEventRegistrations: build.query({
      query: ({ id, params }) => ({
        url: `/events/${id}/registrations`,
        params,
      }),
      transformResponse: (res) => res.data || res,
      providesTags: (_r, _e, { id }) => [{ type: 'Registration', id }],
    }),
  }),
});

export const {
  useGetEventsQuery,
  useGetPublicEventsQuery,
  useGetFeaturedEventsQuery,
  useGetEventByIdQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useRegisterForEventMutation,
  useGetEventRegistrationsQuery,
} = eventsApi;
