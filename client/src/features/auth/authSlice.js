import { createSlice } from '@reduxjs/toolkit';

const TOKEN_KEY = 'accessToken';
const USER_KEY  = 'authUser';

const loadUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialState = {
  user: loadUser(),
  accessToken: localStorage.getItem(TOKEN_KEY) || null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, { payload }) {
      if (payload.accessToken !== undefined) {
        state.accessToken = payload.accessToken;
        state.isAuthenticated = !!payload.accessToken;
        if (payload.accessToken) {
          localStorage.setItem(TOKEN_KEY, payload.accessToken);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
      if (payload.user !== undefined) {
        state.user = payload.user;
        if (payload.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
        } else {
          localStorage.removeItem(USER_KEY);
        }
      }
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

// Selectors
export const selectCurrentUser  = (s) => s.auth.user;
export const selectAccessToken  = (s) => s.auth.accessToken;
export const selectIsAuth       = (s) => s.auth.isAuthenticated;
export const selectUserRole     = (s) => s.auth.user?.role;

export default authSlice.reducer;
