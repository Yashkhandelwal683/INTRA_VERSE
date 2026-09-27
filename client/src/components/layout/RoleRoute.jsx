import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../features/auth/authSlice';
import ProtectedRoute from './ProtectedRoute';

const roleDashboard = {
  attendee: '/dashboard',
  organizer: '/organizer/dashboard',
  admin: '/admin',
};

export default function RoleRoute({ children, roles = [] }) {
  const role = useSelector(selectUserRole);

  return (
    <ProtectedRoute>
      {roles.length === 0 || roles.includes(role) ? (
        children
      ) : (
        <Navigate to={roleDashboard[role] || '/'} replace />
      )}
    </ProtectedRoute>
  );
}
