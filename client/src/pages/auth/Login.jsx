import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../../utils/validators';
import { useLoginMutation } from '../../features/auth/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../features/auth/authSlice';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDaysIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuth, user: authedUser } = useAuth();
  const role = params.get('role') || localStorage.getItem('selectedRole') || 'attendee';
  const isOrganizer = role === 'organizer';
  const isAdmin = role === 'admin';
  const isAttendee = role === 'attendee';
  const prefilledEmail = sessionStorage.getItem('regEmail') || '';

  const [loginApi, { isLoading }] = useLoginMutation();
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (prefilledEmail) setValue('email', prefilledEmail);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuth) {
      if (authedUser?.role === 'admin') navigate('/admin', { replace: true });
      else if (authedUser?.role === 'organizer') navigate('/organizer/dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  useEffect(() => {
    if (params.get('error') === 'pending_approval') {
      navigate('/pending-approval', { replace: true });
    } else if (params.get('error')) {
      toast.error('Google sign-in failed.');
    }
  }, [params, navigate]);

  const getRedirect = (user) => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'organizer') return '/organizer/dashboard';
    return '/dashboard';
  };

  const onSubmit = async (values) => {
    try {
      const data = await loginApi(values).unwrap();
      const rawUser = data.user ?? data;
      const user = {
        id: rawUser._id ?? rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role: rawUser.role,
        avatar: rawUser.avatar ?? null,
      };
      dispatch(setCredentials({ accessToken: data.accessToken, user }));
      sessionStorage.removeItem('regEmail');
      toast.success(`Welcome back, ${user.name}!`);
      navigate(getRedirect(user), { replace: true });
    } catch (err) {
      const msg = err?.data?.message || 'Login failed. Check your credentials.';
      if (msg.toLowerCase().includes('pending')) {
        navigate('/pending-approval', { replace: true });
      } else {
        toast.error(msg);
      }
    }
  };

  const baseUrl = import.meta.env.VITE_API_URL || '';
  const googleUrl = `${baseUrl}/api/auth/google?state=${role}`;

  const accentGradient = isAdmin
    ? 'from-red-600 to-rose-600'
    : isOrganizer
    ? 'from-violet-600 to-fuchsia-600'
    : 'from-primary-500 to-violet-600';
  const accentGlow = isOrganizer ? 'shadow-violet-600/20' : isAdmin ? 'shadow-red-600/20' : 'shadow-primary-600/20';
  const roleLabel = isAdmin ? 'Administrator' : isOrganizer ? 'Organizer' : 'Attendee';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-hero-glow bg-surface relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={role}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </button>

          {/* Logo & Heading */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accentGradient} flex items-center justify-center shadow-lg ${accentGlow}`}>
              <CalendarDaysIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl gradient-text">Welcome Back</h1>
            <p className="text-slate-400 text-sm">
              Sign in as {roleLabel}
            </p>
          </div>

          <div className={`glass p-8 space-y-5 ${isOrganizer ? 'border-violet-500/20' : isAdmin ? 'border-red-500/20' : ''}`}>
            {!isAdmin && (
              <>
                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={() => window.location.href = googleUrl}
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-surface-border hover:border-primary-500/50 hover:bg-white/5 transition-all text-sm font-medium text-slate-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 4.9c1.84 0 3.5.67 4.79 1.76L20.16 3.3A11.95 11.95 0 0 0 12 .5C8.15.5 4.8 2.63 2.96 5.76l2.31 4z" />
                    <path fill="#34A853" d="M16.04 18.01A7.06 7.06 0 0 1 12 19.1a7.08 7.08 0 0 1-6.72-4.82L3 18.25A11.94 11.94 0 0 0 12 23.5c3.18 0 6.05-1.17 8.22-3.1l-4.18-2.39z" />
                    <path fill="#FBBC05" d="M19.1 12c0-.65-.07-1.29-.18-1.9H12v3.6h3.96a3.38 3.38 0 0 1-1.47 2.22l4.18 2.39C20.35 16.63 21.1 14.44 19.1 12z" />
                    <path fill="#4285F4" d="M5.28 14.28A7.1 7.1 0 0 1 4.9 12c0-.79.14-1.55.38-2.24L3 5.76A11.9 11.9 0 0 0 .5 12c0 1.93.46 3.75 1.27 5.36l3.51-3.08z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-surface-border" />
                  <span className="text-xs text-slate-500">or</span>
                  <div className="flex-1 h-px bg-surface-border" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder={isAdmin ? 'admin@example.com' : 'you@example.com'}
                  {...register('email')}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Sign In
              </button>
            </form>

            {!isAdmin && (
              <p className="text-center text-sm text-slate-400">
                Don't have an account?{' '}
                <Link to={`/register?role=${role}`} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  Register
                </Link>
              </p>
            )}

            {isOrganizer && (
              <div className="border-t border-white/[0.06] pt-4 mt-2">
                <Link to="/login?role=admin" className="block text-center text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Administrator Login
                </Link>
              </div>
            )}
            {isAttendee && (
              <div className="border-t border-white/[0.06] pt-4 mt-2">
                <Link to="/login?role=organizer" className="block text-center text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Organizer Login
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
