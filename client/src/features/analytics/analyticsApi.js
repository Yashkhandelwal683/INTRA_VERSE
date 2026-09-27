import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/analytics` }),
  tagTypes: ['Analytics'],
  endpoints: (build) => ({
    getOverview: build.query({
      query: () => '/overview',
      keepUnusedDataFor: 3600,
      providesTags: ['Analytics'],
    }),
    getRevenueChart: build.query({
      query: (months = 12) => `/revenue-chart?months=${months}`,
      keepUnusedDataFor: 3600,
      providesTags: ['Analytics'],
    }),
    getTicketSales: build.query({
      query: (months = 6) => `/ticket-sales?months=${months}`,
      keepUnusedDataFor: 3600,
      providesTags: ['Analytics'],
    }),
    getTopEvents: build.query({
      query: () => '/top-events',
      keepUnusedDataFor: 3600,
      providesTags: ['Analytics'],
    }),
    getRecentBookings: build.query({
      query: () => '/recent-bookings',
      keepUnusedDataFor: 300,
      providesTags: ['Analytics'],
    }),
    getCategoryDistribution: build.query({
      query: () => '/category-distribution',
      keepUnusedDataFor: 3600,
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetOverviewQuery,
  useGetRevenueChartQuery,
  useGetTicketSalesQuery,
  useGetTopEventsQuery,
  useGetRecentBookingsQuery,
  useGetCategoryDistributionQuery,
} = analyticsApi;
