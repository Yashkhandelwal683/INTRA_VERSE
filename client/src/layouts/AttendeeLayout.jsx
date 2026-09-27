import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { logout, selectCurrentUser } from '../features/auth/authSlice';
import { useGetDashboardQuery } from '../features/attendee/attendeeApi';
import AttendeeSidebar from '../components/attendee/AttendeeSidebar';
import AttendeeTopbar from '../components/attendee/AttendeeTopbar';

export default function AttendeeLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  const { data } = useGetDashboardQuery();
  const counts = data?.data?.counts;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#060d0c] text-white">
      {/* Ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-mint-600/[0.07] blur-3xl" />
        <div className="absolute -bottom-48 -right-24 h-[26rem] w-[26rem] rounded-full bg-teal-500/[0.05] blur-3xl" />
      </div>

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AttendeeSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          user={user}
          onLogout={handleLogout}
          counts={counts}
        />
      </div>

      {/* Mobile sidebar */}
      {mobileNavOpen && (
        <div className="lg:hidden">
          <AttendeeSidebar
            collapsed={false}
            onToggleCollapse={() => setMobileNavOpen(false)}
            user={user}
            onLogout={handleLogout}
            counts={counts}
          />
        </div>
      )}

      {/* Content column */}
      <div
        className={`relative z-10 flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-[248px]'
        }`}
      >
        <AttendeeTopbar
          user={user}
          onMenuClick={() => setMobileNavOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
