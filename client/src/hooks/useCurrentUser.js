import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectAccessToken, selectCurrentUser, setCredentials, logout } from '../features/auth/authSlice';
import axiosClient from '../api/axiosClient';

export function useCurrentUser() {
  const dispatch      = useDispatch();
  const accessToken   = useSelector(selectAccessToken);
  const storedUser    = useSelector(selectCurrentUser);
  const [loading, setLoading] = useState(!storedUser && !!accessToken);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    if (storedUser?.phone !== undefined) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axiosClient.get('/api/users/profile');
        const raw = data?.data ?? data;
        if (cancelled) return;

        if (raw?._id || raw?.id) {
          const userData = {
            id:         raw._id ?? raw.id,
            name:       raw.name,
            email:      raw.email,
            role:       raw.role,
            avatar:     raw.avatar ?? null,
            phone:      raw.phone ?? '',
            bio:        raw.bio ?? '',
            college:    raw.college ?? '',
            department: raw.department ?? '',
            gender:     raw.gender ?? '',
          };
          dispatch(setCredentials({ user: userData }));
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.response?.status === 401) {
          dispatch(logout());
          setError('Session expired');
        } else {
          setError('Failed to fetch user data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [accessToken, storedUser, dispatch]);

  return { user: storedUser, loading, error };
}
