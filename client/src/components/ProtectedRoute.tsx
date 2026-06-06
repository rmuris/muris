import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface Props {
  children: JSX.Element;
  roles?: UserRole[];
  resource?: string;
  action?: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete';
}

export default function ProtectedRoute({ children, roles, resource, action }: Props) {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role as UserRole)) {
    return <Navigate to="/" replace />;
  }

  if (resource && action && !can(resource, action)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
