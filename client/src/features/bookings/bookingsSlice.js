import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentBooking: null,
};

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setCurrentBooking(state, { payload }) {
      state.currentBooking = payload;
    },
    clearCurrentBooking(state) {
      state.currentBooking = null;
    },
  },
});

export const { setCurrentBooking, clearCurrentBooking } = bookingsSlice.actions;
export const selectCurrentBooking = (s) => s.bookings.currentBooking;
export default bookingsSlice.reducer;
