import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/payments` }),
  endpoints: (build) => ({
    createOrder: build.mutation({
      query: (body) => ({ url: '/create-order', method: 'POST', body }),
      transformResponse: (res) => res.data || res,
    }),
    verifyPayment: build.mutation({
      query: (body) => ({ url: '/verify', method: 'POST', body }),
      transformResponse: (res) => res.data || res,
    }),
    getPaymentById: build.query({
      query: (id) => `/${id}`,
      transformResponse: (res) => res.data || res,
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  useGetPaymentByIdQuery,
} = paymentsApi;
