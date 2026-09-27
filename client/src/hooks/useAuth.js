import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  selectCurrentUser,
  selectIsAuth,
  selectUserRole,
  logout as logoutAction,
} from '../features/auth/authSlice';
import { useLogoutMutation } from '../features/auth/authApi';

export function useAuth() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const user       = useSelector(selectCurrentUser);
  const isAuth     = useSelector(selectIsAuth);
  const role       = useSelector(selectUserRole);
  const [logoutApi] = useLogoutMutation();

  const logout = async () => {
    try { await logoutApi().unwrap(); } catch { /* ignore */ }
    dispatch(logoutAction());
    navigate('/');
  };

  const isOrganizer = role === 'organizer' || role === 'admin';
  const isAdmin     = role === 'admin';

  return { user, isAuth, role, isOrganizer, isAdmin, logout };
}
