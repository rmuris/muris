import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';

const navGroups = [
  {
    label: 'COMMAND CENTER',
    items: [
      { to: '/', label: 'AI Command Center', icon: '⚡' },
      { to: '/ai-agents', label: 'AI Agents', icon: '🤖' },
      { to: '/risk', label: 'Risk Center', icon: '🛡️' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/orders', label: 'Orders', icon: '📦' },
      { to: '/shipments', label: 'Shipments', icon: '🚛' },
      { to: '/quotes', label: 'Quotes', icon: '💰' },
      { to: '/dispatch', label: 'Dispatch Map', icon: '🗺️' },
    ],
  },
  {
    label: 'FLEET & CARRIERS',
    items: [
      { to: '/fleet', label: 'Fleet', icon: '🚚' },
      { to: '/carriers', label: 'Carriers', icon: '🏢' },
    ],
  },
  {
    label: 'CUSTOMS & COMPLIANCE',
    items: [
      { to: '/customs', label: 'Customs', icon: '🛃' },
      { to: '/compliance', label: 'CTPAT / OEA', icon: '✅' },
      { to: '/border', label: 'Border Intelligence', icon: '🌎' },
    ],
  },
  {
    label: 'WAREHOUSE',
    items: [
      { to: '/warehouse', label: 'Warehouses', icon: '🏭' },
      { to: '/inventory', label: 'Inventory', icon: '📋' },
    ],
  },
  {
    label: 'ACCOUNTING',
    items: [
      { to: '/invoices', label: 'Invoices / AR', icon: '🧾' },
      { to: '/accounting', label: 'CFO Dashboard', icon: '📈' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { to: '/customers', label: 'Customers', icon: '👥' },
    ],
  },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-14' : 'w-60'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-200 flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          {!collapsed && (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xl">⚡</span>
                <span className="font-bold text-white tracking-tight">MURIS OS</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 ml-7">AI Logistics Platform</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white p-1 rounded"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {navGroups.map(group => (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 tracking-widest">
                  {group.label}
                </p>
              )}
              {group.items.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                    }`
                  }
                  title={collapsed ? label : undefined}
                >
                  <span className="text-base flex-shrink-0">{icon}</span>
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">AI Systems Online</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  );
}
