import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/auth` }),
  endpoints: (build) => ({
    register: build.mutation({
      query: (body) => ({ url: '/register', method: 'POST', body }),
      transformResponse: (res) => res.data || res,
    }),
    login: build.mutation({
      query: (body) => ({ url: '/login', method: 'POST', body }),
      transformResponse: (res) => res.data || res,
    }),
    logout: build.mutation({
      query: () => ({ url: '/logout', method: 'POST' }),
      transformResponse: (res) => res.data || res,
    }),
    refreshToken: build.mutation({
      query: () => ({ url: '/refresh-token', method: 'POST' }),
      transformResponse: (res) => res.data || res,
    }),
    getMe: build.query({
      // Use full URL to reach /api/users/profile (different base from /api/auth)
      query: () => ({ url: `${BASE}/api/users/profile` }),
      transformResponse: (res) => res.data || res,
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useGetMeQuery,
} = authApi;
