import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const attendeeApi = createApi({
  reducerPath: 'attendeeApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/attendee` }),
  tagTypes: ['Dashboard'],
  endpoints: (build) => ({
    getDashboard: build.query({
      query: () => '/dashboard',
      keepUnusedDataFor: 900,
      refetchOnMountOrArgChange: true,
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardQuery } = attendeeApi;
