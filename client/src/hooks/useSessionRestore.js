import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectAccessToken, selectCurrentUser, setCredentials, logout } from '../features/auth/authSlice';
import axiosClient from '../api/axiosClient';

/**
 * useSessionRestore — called once at app root.
 * If a token exists in state (from localStorage) but the user object is
 * missing (e.g. stale session from before we added user persistence),
 * silently fetches GET /api/users/profile to restore full user data.
 * If the token is expired/invalid, the 401 will be caught and the user
 * will be logged out cleanly.
 */
export function useSessionRestore() {
  const dispatch     = useDispatch();
  const accessToken  = useSelector(selectAccessToken);
  const currentUser  = useSelector(selectCurrentUser);

  useEffect(() => {
    // Only run if we have a token but no user data
    if (!accessToken || currentUser) return;

    const restore = async () => {
      try {
        const { data } = await axiosClient.get('/api/users/profile');
        // ApiResponse shape: { success, data: <Mongoose user doc>, message }
        const raw = data?.data ?? data;
        if (raw?._id || raw?.id) {
          // Store the full profile so registration forms can auto-fill
          const userData = {
            id:        raw._id ?? raw.id,
            name:      raw.name,
            email:     raw.email,
            role:      raw.role,
            avatar:    raw.avatar ?? null,
            phone:     raw.phone ?? '',
            bio:       raw.bio ?? '',
            college:   raw.college ?? '',
            department: raw.department ?? '',
            gender:    raw.gender ?? '',
          };
          dispatch(setCredentials({ user: userData }));
        }
      } catch (err) {
        // 401 = expired token — log out cleanly
        if (err?.response?.status === 401) {
          dispatch(logout());
        }
        // Other errors (network etc.) — keep the token, do nothing
      }
    };

    restore();
  }, [accessToken, currentUser, dispatch]);
}
