import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials } from '../../features/auth/authSlice';
import axiosClient from '../../api/axiosClient';
import { FullPageSpinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

/**
 * AuthCallback Component
 * 
 * Handles Google OAuth callback from backend.
 * 
 * Flow:
 * 1. Backend redirects to: /auth/callback?token=JWT_TOKEN
 * 2. Extract token from URL params
 * 3. Store token in Redux auth state
 * 4. Fetch user profile from /api/users/profile
 * 5. Store user data
 * 6. Redirect to home page
 * 
 * On error: Redirect back to login with error message
 */
export default function AuthCallback() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Extract token from URL: /auth/callback?token=XYZ
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        console.log('[AuthCallback] Processing OAuth callback...');

        // 2. Validate token exists
        if (!token) {
          console.error('[AuthCallback] No token in URL');
          toast.error('Google authentication failed. No token received.');
          navigate('/login?error=auth_failed', { replace: true });
          return;
        }

        console.log('[AuthCallback] Token received from backend');

        // 3. Store token immediately in Redux
        dispatch(setCredentials({ accessToken: token }));

        try {
          // 4. Fetch user profile with the token
          console.log('[AuthCallback] Fetching user profile...');
          const { data } = await axiosClient.get('/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });

          // 5. Extract user data (handle different response formats)
          const userData = data.data ?? data.user ?? data;

          console.log('[AuthCallback] User profile received:', userData?.email);

          // 6. Store user in Redux
          dispatch(setCredentials({ user: userData }));

          // 7. Show success message
          toast.success(`Welcome back, ${userData?.name || 'User'}!`);

          // 8. Redirect based on role
          const redirect = userData.role === 'admin' ? '/admin' : userData.role === 'organizer' ? '/organizer/dashboard' : '/dashboard';
          console.log(`[AuthCallback] Redirecting to ${redirect}`);
          navigate(redirect, { replace: true });
        } catch (profileErr) {
          // Profile fetch failed
          console.error('[AuthCallback] Profile fetch failed:', profileErr?.message);

          // Clear bad token
          dispatch(setCredentials({ accessToken: null, user: null }));

          // Show error and redirect
          toast.error('Could not load user profile. Please try again.');
          navigate('/login?error=profile_failed', { replace: true });
        }
      } catch (err) {
        // Unexpected error
        console.error('[AuthCallback] Unexpected error:', err);
        toast.error('Authentication failed. Please try again.');
        navigate('/login?error=auth_error', { replace: true });
      }
    };

    handleCallback();
  }, [dispatch, navigate]);

  // Show loading spinner while processing callback
  return <FullPageSpinner />;
}
