import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/orders', label: 'Orders', icon: '📦' },
  { to: '/shipments', label: 'Shipments', icon: '🚛' },
  { to: '/fleet', label: 'Fleet', icon: '🚚' },
  { to: '/customers', label: 'Customers', icon: '👥' },
];

// The AI surfaces are visually distinct from the operational pages, so they
// sit in their own group at the foot of the nav.
const aiNav = [
  { to: '/jarvis', label: 'JARVIS', icon: '◎' },
  { to: '/agents', label: 'Agents', icon: '⬡' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-gray-700">
          <h1 className="text-xl font-bold tracking-tight">Muris TMS</h1>
          <p className="text-xs text-gray-400 mt-0.5">Logistics Management</p>
        </div>
        <nav className="flex-1 py-4">
          {nav.map(({ to, label, icon }) => (
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

          <div className="mt-4 pt-4 border-t border-gray-700/60">
            <p className="px-6 pb-2 text-[10px] tracking-[0.2em] uppercase text-gray-500">Intelligence</p>
            {aiNav.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300 border-l-2 border-cyan-400' : 'text-gray-300 hover:bg-gray-800'
                  }`
                }
              >
                <span className="text-cyan-400">{icon}</span>
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
