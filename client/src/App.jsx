import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth, selectUserRole } from './features/auth/authSlice';
import { useSessionRestore } from './hooks/useSessionRestore';
import { useSocket } from './hooks/useSocket';

import MainLayout       from './layouts/MainLayout';
import AttendeeLayout   from './layouts/AttendeeLayout';

import ProtectedRoute   from './components/layout/ProtectedRoute';
import RoleRoute        from './components/layout/RoleRoute';

import Events           from './pages/Events';
import EventDetail      from './pages/EventDetailPremium';
import Checkout         from './pages/Checkout';
import PaymentPage      from './pages/PaymentPage';
import PaymentSuccess   from './pages/PaymentSuccess';
import Profile          from './pages/profile/Profile';
import MyTickets        from './pages/attendee/MyTickets';
import MyBookings       from './pages/attendee/MyBookings';
import Wishlist         from './pages/attendee/Wishlist';
import AttendeeDashboard from './pages/attendee/AttendeeDashboard';

import Login           from './pages/auth/Login';
import Register        from './pages/auth/Register';
import AuthCallback    from './pages/auth/AuthCallback';
import PendingApproval from './pages/auth/PendingApproval';

// This build ships the attendee (user) panel only. Organizer and admin
// surfaces are intentionally not part of this repository.
const roleDashboard = {
  attendee: '/dashboard',
};

function AuthGate({ children }) {
  const isAuth = useSelector(selectIsAuth);
  const role = useSelector(selectUserRole);
  if (isAuth) return <Navigate to={roleDashboard[role] || '/dashboard'} replace />;
  return children;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  useSessionRestore();
  useSocket();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* ── Landing ───────────────────────────────────────── */}
        {/* The user panel is the front door of this build. */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── Public Routes (unauthenticated) ────────────────── */}
        <Route element={<MainLayout />}>
          <Route path="/login" element={<AuthGate><Login /></AuthGate>} />
          <Route path="/register" element={<AuthGate><Register /></AuthGate>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
        </Route>

        {/* ── Protected Attendee Routes ──────────────────────── */}
        <Route
          path="/dashboard"
          element={<RoleRoute roles={['attendee']}><AttendeeLayout /></RoleRoute>}
        >
          <Route index element={<AttendeeDashboard />} />
          <Route path="bookings" element={<MyBookings />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="tickets" element={<MyTickets />} />
        </Route>

        {/* ── Booking / payment flow ─────────────────────────── */}
        <Route path="/checkout/:eventId" element={<ProtectedRoute><MainLayout /><Checkout /></ProtectedRoute>} />
        <Route path="/payment/:eventId" element={<ProtectedRoute><MainLayout /><PaymentPage /></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><MainLayout /><PaymentSuccess /></ProtectedRoute>} />

        <Route path="/profile" element={<ProtectedRoute><AttendeeLayout /></ProtectedRoute>}>
          <Route index element={<Profile />} />
        </Route>

        {/* ── Fallback ───────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
