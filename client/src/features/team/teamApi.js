import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../../api/baseQuery';

const BASE = import.meta.env.VITE_API_URL;

export const teamApi = createApi({
  reducerPath: 'teamApi',
  baseQuery: createBaseQuery({ baseUrl: `${BASE}/api/team` }),
  tagTypes: ['TeamMember', 'TeamStats'],
  endpoints: (build) => ({
    getEventTeam: build.query({
      query: (eventId) => `/event/${eventId}`,
      providesTags: ['TeamMember'],
    }),
    getTeamStats: build.query({
      query: (eventId) => `/event/${eventId}/stats`,
      providesTags: ['TeamStats'],
    }),
    getMyStaffedEvents: build.query({
      query: () => '/my-events',
      providesTags: ['TeamMember'],
    }),
    inviteMember: build.mutation({
      query: ({ eventId, email, role }) => ({
        url: `/event/${eventId}/invite`,
        method: 'POST',
        body: { email, role },
      }),
      invalidatesTags: ['TeamMember', 'TeamStats'],
    }),
    updateMemberRole: build.mutation({
      query: ({ eventId, memberId, role }) => ({
        url: `/event/${eventId}/${memberId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: ['TeamMember', 'TeamStats'],
    }),
    removeMember: build.mutation({
      query: ({ eventId, memberId }) => ({
        url: `/event/${eventId}/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TeamMember', 'TeamStats'],
    }),
    acceptInvite: build.mutation({
      query: (memberId) => ({
        url: `/${memberId}/accept`,
        method: 'PATCH',
      }),
      invalidatesTags: ['TeamMember'],
    }),
    declineInvite: build.mutation({
      query: (memberId) => ({
        url: `/${memberId}/decline`,
        method: 'PATCH',
      }),
      invalidatesTags: ['TeamMember'],
    }),
  }),
});

export const {
  useGetEventTeamQuery,
  useGetTeamStatsQuery,
  useGetMyStaffedEventsQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
} = teamApi;
