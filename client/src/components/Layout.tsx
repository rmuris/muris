import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const INTERNAL_NAV = [
  { to: '/',              label: 'Dashboard',     icon: '▦',  resource: '' },
  { to: '/orders',        label: 'Orders',         icon: '◈',  resource: 'ORDERS' },
  { to: '/shipments',     label: 'Shipments',      icon: '◉',  resource: 'SHIPMENTS' },
  { to: '/fleet',         label: 'Fleet',          icon: '◎',  resource: 'FLEET' },
  { to: '/customers',     label: 'Customers',      icon: '◐',  resource: 'CUSTOMERS' },
  { to: '/companies',     label: 'Companies',      icon: '◑',  resource: 'COMPANIES' },
  { to: '/tasks',         label: 'Tasks',          icon: '◻',  resource: 'TASKS' },
  { to: '/documents',     label: 'Documents',      icon: '◧',  resource: 'DOCUMENTS' },
  { to: '/updates',       label: 'Updates',        icon: '◌',  resource: 'UPDATES' },
  { to: '/custom-fields', label: 'Custom Fields',  icon: '◈',  resource: 'USERS' },
  { to: '/users',         label: 'Users',          icon: '◕',  resource: 'USERS' },
];

const PORTAL_NAV = [
  { to: '/',          label: 'Dashboard', icon: '▦', resource: '' },
  { to: '/shipments', label: 'Shipments', icon: '◉', resource: 'SHIPMENTS' },
  { to: '/orders',    label: 'Orders',    icon: '◈', resource: 'ORDERS' },
  { to: '/tasks',     label: 'Tasks',     icon: '◻', resource: 'TASKS' },
  { to: '/documents', label: 'Documents', icon: '◧', resource: 'DOCUMENTS' },
  { to: '/updates',   label: 'Updates',   icon: '◌', resource: 'UPDATES' },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'from-purple-500 to-pink-500',
  ADMIN:       'from-brand-500 to-accent',
  MANAGER:     'from-indigo-500 to-brand-400',
  STAFF:       'from-emerald-500 to-teal-400',
  PORTAL_USER: 'from-amber-500 to-orange-400',
  VIEWER:      'from-gray-500 to-gray-400',
};

export default function Layout() {
  const { user, logout, can, isInternal } = useAuth();
  const navigate = useNavigate();

  const nav = isInternal() ? INTERNAL_NAV : PORTAL_NAV;
  const visibleNav = nav.filter(({ resource }) => !resource || can(resource, 'canRead'));

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-gradient-dark overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-white/5 bg-brand-950/80 backdrop-blur-xl">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand flex-shrink-0">
              <span className="text-white font-heading font-bold text-base">M</span>
            </div>
            <div>
              <div className="font-heading font-bold text-white text-sm leading-tight">Muris TMS</div>
              <div className="text-brand-300 text-[10px] leading-tight mt-0.5">
                {user?.company?.name || 'Logistics Platform'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-0.5">
          {visibleNav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'text-brand-300 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-white/5 px-3 py-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${ROLE_COLORS[user.role] || 'from-gray-500 to-gray-400'} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-brand`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate leading-tight">{user.name}</div>
                <div className="text-[10px] text-brand-300 truncate mt-0.5">{user.role.replace(/_/g, ' ')}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left text-xs text-brand-400 hover:text-white transition-colors px-1 py-1 rounded-lg hover:bg-white/5"
            >
              Sign out →
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
