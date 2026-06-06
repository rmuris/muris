import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const INTERNAL_NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', resource: '' },
  { to: '/orders', label: 'Orders', icon: '📦', resource: 'ORDERS' },
  { to: '/shipments', label: 'Shipments', icon: '🚛', resource: 'SHIPMENTS' },
  { to: '/fleet', label: 'Fleet', icon: '🚚', resource: 'FLEET' },
  { to: '/customers', label: 'Customers', icon: '👥', resource: 'CUSTOMERS' },
  { to: '/companies', label: 'Companies', icon: '🏢', resource: 'COMPANIES' },
  { to: '/tasks', label: 'Tasks', icon: '✅', resource: 'TASKS' },
  { to: '/documents', label: 'Documents', icon: '📄', resource: 'DOCUMENTS' },
  { to: '/updates', label: 'Updates', icon: '📡', resource: 'UPDATES' },
  { to: '/users', label: 'Users', icon: '🔐', resource: 'USERS' },
];

const PORTAL_NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', resource: '' },
  { to: '/shipments', label: 'Shipments', icon: '🚛', resource: 'SHIPMENTS' },
  { to: '/orders', label: 'Orders', icon: '📦', resource: 'ORDERS' },
  { to: '/tasks', label: 'Tasks', icon: '✅', resource: 'TASKS' },
  { to: '/documents', label: 'Documents', icon: '📄', resource: 'DOCUMENTS' },
  { to: '/updates', label: 'Updates', icon: '📡', resource: 'UPDATES' },
];

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500',
  ADMIN: 'bg-blue-500',
  MANAGER: 'bg-indigo-500',
  STAFF: 'bg-green-500',
  PORTAL_USER: 'bg-yellow-500',
  VIEWER: 'bg-gray-500',
};

export default function Layout() {
  const { user, logout, can, isInternal } = useAuth();
  const navigate = useNavigate();

  const nav = isInternal() ? INTERNAL_NAV : PORTAL_NAV;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const visibleNav = nav.filter(({ resource }) => {
    if (!resource) return true;
    return can(resource, 'canRead');
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-gray-700">
          <h1 className="text-xl font-bold tracking-tight">Muris TMS</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {user?.company?.name || 'Logistics Management'}
          </p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        {user && (
          <div className="border-t border-gray-700 px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-full ${ROLE_BADGE[user.role] || 'bg-gray-500'} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-white truncate">{user.name}</div>
                <div className="text-xs text-gray-400 truncate">{user.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left text-xs text-gray-400 hover:text-white transition-colors py-1"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
