import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials, logout } from '../features/auth/authSlice';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

export const createBaseQuery = ({ baseUrl }) => {
  const baseQuery = fetchBaseQuery({
    baseUrl,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  });

  return async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          return baseQuery(args, api, extraOptions);
        }).catch((err) => ({ error: err }));
      }

      isRefreshing = true;

      try {
        const refreshResult = await baseQuery('/refresh', api, extraOptions);
        const newToken = refreshResult?.data?.data?.accessToken || refreshResult?.data?.accessToken;

        if (newToken) {
          api.dispatch(setCredentials({ accessToken: newToken }));
          processQueue(null, newToken);
          return baseQuery(args, api, extraOptions);
        } else {
          processQueue(new Error('Refresh failed'), null);
          api.dispatch(logout());
          window.location.href = '/login';
          return result;
        }
      } catch {
        processQueue(new Error('Refresh failed'), null);
        api.dispatch(logout());
        window.location.href = '/login';
        return result;
      } finally {
        isRefreshing = false;
      }
    }

    return result;
  };
};
