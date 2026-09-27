import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/notifications` }),
  tagTypes: ['Notification'],
  endpoints: (build) => ({
    getNotifications: build.query({
      query: (params) => ({ url: '/', params }),
      providesTags: ['Notification'],
    }),
    markAsRead: build.mutation({
      query: (id) => ({ url: `/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
    markAllAsRead: build.mutation({
      query: () => ({ url: '/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} = notificationsApi;
