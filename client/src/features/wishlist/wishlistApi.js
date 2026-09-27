import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/wishlist` }),
  tagTypes: ['Wishlist'],
  endpoints: (build) => ({
    getWishlist: build.query({
      query: (params) => ({ url: '/', params }),
      providesTags: ['Wishlist'],
    }),
    addToWishlist: build.mutation({
      query: (eventId) => ({ url: '/', method: 'POST', body: { eventId } }),
      invalidatesTags: ['Wishlist'],
    }),
    removeFromWishlist: build.mutation({
      query: (eventId) => ({ url: `/${eventId}`, method: 'DELETE' }),
      invalidatesTags: ['Wishlist'],
    }),
    checkWishlist: build.query({
      query: (eventId) => `/check/${eventId}`,
    }),
    toggleWishlist: build.mutation({
      query: (eventId) => ({ url: '/toggle', method: 'POST', body: { eventId } }),
      invalidatesTags: ['Wishlist'],
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useCheckWishlistQuery,
  useToggleWishlistMutation,
} = wishlistApi;
