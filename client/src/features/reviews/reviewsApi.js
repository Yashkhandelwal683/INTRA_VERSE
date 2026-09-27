import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const reviewsApi = createApi({
  reducerPath: 'reviewsApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/reviews` }),
  tagTypes: ['Review'],
  endpoints: (build) => ({
    getEventReviews: build.query({ query: (eventId) => `/event/${eventId}` }),
    getOrganizerReviews: build.query({ query: () => '/organizer' }),
    createReview: build.mutation({ query: (body) => ({ url: '/', method: 'POST', body }) }),
    replyToReview: build.mutation({ query: ({ id, reply }) => ({ url: `/${id}/reply`, method: 'PUT', body: { reply } }) }),
    toggleReviewVisibility: build.mutation({ query: (id) => ({ url: `/${id}/toggle`, method: 'PATCH' }) }),
  }),
});

export const {
  useGetEventReviewsQuery,
  useGetOrganizerReviewsQuery,
  useCreateReviewMutation,
  useReplyToReviewMutation,
  useToggleReviewVisibilityMutation,
} = reviewsApi;
