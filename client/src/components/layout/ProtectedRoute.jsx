import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth } from '../../features/auth/authSlice';

export default function ProtectedRoute({ children }) {
  const isAuth = useSelector(selectIsAuth);
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to={`/?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}
