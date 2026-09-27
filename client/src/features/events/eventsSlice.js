import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  filters: {
    category: '',
    city: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    page: 1,
  },
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setFilters(state, { payload }) {
      state.filters = { ...state.filters, ...payload, page: 1 };
    },
    setPage(state, { payload }) {
      state.filters.page = payload;
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
  },
});

export const { setFilters, setPage, resetFilters } = eventsSlice.actions;
export const selectFilters = (s) => s.events.filters;
export default eventsSlice.reducer;
