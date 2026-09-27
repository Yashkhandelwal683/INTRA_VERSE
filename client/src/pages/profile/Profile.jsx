import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { profileSchema } from '../../utils/validators';
import { useAuth } from '../../hooks/useAuth';
import {
  useGetUserBookingsQuery,
  useRequestCancellationMutation,
  useCancelBookingMutation,
} from '../../features/bookings/bookingsApi';
import axiosClient from '../../api/axiosClient';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../features/auth/authSlice';
import BookingCard from '../../components/bookings/BookingCard';
import CancelModal from '../../components/bookings/CancelModal';
import QRModal from '../../components/bookings/QRModal';
import { Panel, PanelHeader, Skeleton } from '../../components/attendee/Panel';
import EmptyState from '../../components/attendee/EmptyState';
import { UserCog, Ticket, AlertTriangle, RefreshCw, Save, Mail, Phone, AtSign } from 'lucide-react';
import toast from 'react-hot-toast';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

function Field({ id, label, icon: Icon, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="panel-label mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedBk, setSelectedBk] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const {
    data: bookingsData,
    isLoading: bkLoading,
    isError: bkError,
    error: bkErrorDetail,
    refetch,
    isFetching,
  } = useGetUserBookingsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [requestCancellation, { isLoading: cancelling }] = useRequestCancellationMutation();
  const [cancelBooking] = useCancelBookingMutation();

  const bookings = Array.isArray(bookingsData) ? bookingsData : bookingsData?.bookings ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '', bio: user?.bio ?? '' },
  });

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const { data } = await axiosClient.get('/api/users/profile', {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        const raw = data?.data ?? data;
        if (cancelled || !(raw?._id || raw?.id)) return;

        const savedUser = {
          id: raw._id ?? raw.id,
          name: raw.name,
          email: raw.email,
          role: raw.role,
          avatar: raw.avatar ?? null,
          phone: raw.phone ?? '',
          bio: raw.bio ?? '',
        };
        dispatch(setCredentials({ user: savedUser }));
        reset({ name: savedUser.name, phone: savedUser.phone, bio: savedUser.bio });
      } catch {
        // Keep the locally stored values available if the profile cannot load.
      }
    };

    loadProfile();
    return () => { cancelled = true; };
  }, [dispatch, reset]);

  const onSave = async (values) => {
    setSaving(true);
    try {
      const { data } = await axiosClient.patch('/api/users/profile', values);
      const raw = data?.data ?? data?.user ?? data;
      const updatedUser = {
        id:     raw._id ?? raw.id,
        name:   raw.name,
        email:  raw.email,
        role:   raw.role,
        avatar: raw.avatar ?? null,
        phone:  raw.phone ?? '',
        bio:    raw.bio ?? '',
      };
      dispatch(setCredentials({ user: updatedUser }));
      reset({ name: updatedUser.name, phone: updatedUser.phone, bio: updatedUser.bio });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDirectCancel = async (bookingId) => {
    try {
      await cancelBooking(bookingId).unwrap();
      toast.success('Booking cancelled successfully.');
    } catch (err) {
      toast.error(err?.data?.message ?? 'Failed to cancel booking.');
    }
  };

  const handleConfirmCancel = async (reason) => {
    if (!cancelTarget) return;
    try {
      await requestCancellation({
        bookingId: cancelTarget._id,
        cancellationReason: reason,
      }).unwrap();
      toast.success('Cancellation request submitted! Admin will review within 24 hours.');
      setCancelTarget(null);
    } catch (err) {
      toast.error(err?.data?.message ?? 'Failed to submit cancellation request.');
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-10">
      {/* Header */}
      <motion.div variants={item}>
        <p className="panel-label mb-1.5">Account</p>
        <h1 className="font-display text-3xl font-black tracking-tight text-white">My Profile</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Manage your details and review every booking you&apos;ve made.
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Identity + form */}
        <motion.div variants={item} className="space-y-5">
          <Panel className="relative overflow-hidden p-6 text-center">
            <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-mint-500/10 blur-3xl" />

            <div className="relative">
              <div className="relative mx-auto mb-4 w-fit">
                <div className="absolute inset-0 -z-10 rounded-full bg-mint-500/25 blur-xl" />
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-mint-400 to-mint-600 font-display text-2xl font-black text-white shadow-glow-mint">
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </span>
              </div>

              <p className="font-display text-lg font-bold text-white">{user?.name}</p>
              <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                <Mail className="h-3 w-3" />
                {user?.email}
              </p>
              <span className="chip mt-3 border-mint-500/25 bg-mint-500/10 capitalize text-mint-300">
                {user?.role ?? 'user'}
              </span>
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader icon={UserCog} title="Personal details" className="mb-4" />

            <form onSubmit={handleSubmit(onSave)} className="space-y-4" noValidate>
              <Field id="prof-name" label="Name" icon={UserCog} error={errors.name?.message}>
                <input id="prof-name" type="text" className="ap-input" {...register('name')} />
              </Field>

              <Field id="prof-email" label="Email" icon={AtSign}>
                <input
                  id="prof-email"
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  className="ap-input cursor-not-allowed opacity-60"
                />
              </Field>

              <Field id="prof-phone" label="Phone" icon={Phone} error={errors.phone?.message}>
                <input
                  id="prof-phone"
                  type="tel"
                  placeholder="10 digits"
                  className="ap-input"
                  {...register('phone')}
                />
              </Field>

              <Field id="prof-bio" label="Bio" error={errors.bio?.message}>
                <textarea
                  id="prof-bio"
                  rows={3}
                  placeholder="Tell us about yourself…"
                  className="ap-input"
                  {...register('bio')}
                />
              </Field>

              <button type="submit" disabled={saving} className="btn-mint w-full">
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </Panel>
        </motion.div>

        {/* Bookings */}
        <motion.div variants={item} className="lg:col-span-2">
          <Panel className="p-4 sm:p-5">
            <PanelHeader
              icon={Ticket}
              title="My Bookings"
              subtitle={bkLoading ? undefined : `${bookings.length} reservation${bookings.length === 1 ? '' : 's'}`}
              action={
                <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn-quiet">
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? 'Syncing' : 'Refresh'}
                </button>
              }
            />

            <div className="mt-4 space-y-3">
              {bkLoading && (
                <>
                  <Skeleton className="h-36" />
                  <Skeleton className="h-36" />
                </>
              )}

              {!bkLoading && bkError && (
                <div className="panel border-red-500/20 p-8 text-center">
                  <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
                  <p className="mb-1 font-medium text-red-400">Failed to load bookings</p>
                  <p className="mb-4 text-xs text-zinc-500">
                    {bkErrorDetail?.data?.message ?? bkErrorDetail?.error ?? 'Please try again'}
                  </p>
                  <button type="button" onClick={() => refetch()} className="btn-mint btn-mint-sm">
                    Retry
                  </button>
                </div>
              )}

              {!bkLoading && !bkError && bookings.length === 0 && (
                <EmptyState
                  icon={Ticket}
                  title="No bookings yet"
                  description="Browse events and book your first ticket — it only takes a minute."
                  action={{ label: 'Browse Events', to: '/events' }}
                />
              )}

              {!bkLoading && !bkError && bookings.length > 0 && (
                <>
                  {bookings.map((bk) => (
                    <BookingCard
                      key={bk._id}
                      booking={bk}
                      onDirectCancel={handleDirectCancel}
                      onRequestCancel={setCancelTarget}
                      onViewQr={setSelectedBk}
                    />
                  ))}
                  <div className="pt-1 text-center">
                    <Link to="/dashboard/bookings" className="btn-quiet">
                      Open full booking manager
                    </Link>
                  </div>
                </>
              )}
            </div>
          </Panel>
        </motion.div>
      </div>

      <QRModal isOpen={!!selectedBk} onClose={() => setSelectedBk(null)} booking={selectedBk} />

      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleConfirmCancel}
          isLoading={cancelling}
        />
      )}
    </motion.div>
  );
}
