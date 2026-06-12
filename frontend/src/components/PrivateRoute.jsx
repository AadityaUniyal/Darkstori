import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null; // Let the top-level loading screen handle it
  }

  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
}
