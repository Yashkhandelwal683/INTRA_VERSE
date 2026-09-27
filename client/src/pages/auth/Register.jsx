import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, organizerRegisterSchema } from '../../utils/validators';
import { useRegisterMutation } from '../../features/auth/authApi';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDaysIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuth, user: authedUser } = useAuth();
  const role = params.get('role') || localStorage.getItem('selectedRole') || 'attendee';
  const next = params.get('next') || '';
  const isOrganizer = role === 'organizer';

  const [registerApi, { isLoading }] = useRegisterMutation();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const schema = isOrganizer ? organizerRegisterSchema : registerSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isAuth) {
      if (authedUser?.role === 'admin') navigate('/admin', { replace: true });
      else if (authedUser?.role === 'organizer') navigate('/organizer/dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        name: values.name,
        email: values.email,
        password: values.password,
        role,
      };
      if (isOrganizer) {
        payload.organizationName = values.organizationName;
        payload.phone = values.phone;
        payload.city = values.city;
      }
      await registerApi(payload).unwrap();
      sessionStorage.setItem('regEmail', values.email);
      setSuccess(true);
      if (isOrganizer) {
        toast.success('Registration submitted for approval!');
        setTimeout(() => {
          navigate('/pending-approval', { replace: true });
        }, 2000);
      } else {
        toast.success('Registration Successful!');
        setTimeout(() => {
          navigate(next || `/login?role=${role}`, { replace: true });
        }, 2000);
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const accentGradient = isOrganizer
    ? 'from-violet-600 to-fuchsia-600'
    : 'from-primary-500 to-violet-600';

  if (success) {
    const isOrgSuccess = isOrganizer;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-hero-glow bg-surface">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`w-20 h-20 rounded-full ${isOrgSuccess ? 'bg-amber-500/20' : 'bg-emerald-500/20'} flex items-center justify-center mx-auto mb-6`}
          >
            <CheckCircleIcon className={`w-10 h-10 ${isOrgSuccess ? 'text-amber-400' : 'text-emerald-400'}`} />
          </motion.div>
          <h2 className="text-2xl font-bold text-white font-display mb-2">
            {isOrgSuccess ? 'Application Submitted' : 'Registration Successful'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {isOrgSuccess ? 'Your organizer account is pending admin approval.' : 'Please sign in to continue.'}
          </p>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mt-6"
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-hero-glow bg-surface">
      <AnimatePresence mode="wait">
        <motion.div
          key={role}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <button
            onClick={() => navigate(`/login?role=${role}`)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Back to login
          </button>

          <div className="flex flex-col items-center mb-8 gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accentGradient} flex items-center justify-center shadow-lg`}>
              <CalendarDaysIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-bold text-2xl gradient-text">
              Create Your {isOrganizer ? 'Organizer' : 'Attendee'} Account
            </h1>
            <p className="text-slate-400 text-sm">
              {isOrganizer ? 'Start hosting amazing events' : 'Discover and book great events'}
            </p>
          </div>

          <div className="glass p-8 space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Full Name</label>
                <input
                  type="text" placeholder="John Doe"
                  {...register('name')}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Email</label>
                <input
                  type="email" placeholder="you@example.com"
                  {...register('email')}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
              </div>

              {isOrganizer && (
                <>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Organization Name</label>
                    <input
                      type="text" placeholder="Acme Corp"
                      {...register('organizationName')}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                    />
                    {errors.organizationName && <p className="text-xs text-red-400 mt-1">{errors.organizationName.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Phone Number</label>
                    <input
                      type="tel" placeholder="+91 98765 43210"
                      {...register('phone')}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                    />
                    {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">City</label>
                    <input
                      type="text" placeholder="Mumbai"
                      {...register('city')}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                    />
                    {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city.message}</p>}
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min 8 chars + digit"
                    {...register('password')}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    {...register('confirmPassword')}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Create Account
              </button>
            </form>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to={`/login?role=${role}`} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
