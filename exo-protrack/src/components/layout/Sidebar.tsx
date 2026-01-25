import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FlaskConical, 
  Beaker, 
  ClipboardCheck, 
  ShieldCheck,
  FileText,
  Warehouse,
  Settings,
  LogOut,
  QrCode,
  Menu,
  X,
  Package,
  Droplets
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Структура меню с группами
const menuGroups = [
  {
    label: null, // Без заголовка
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Дашборд', roles: ['Production', 'QA', 'Admin', 'Manager'] },
    ]
  },
  {
    label: 'СЫРЬЁ',
    items: [
      { path: '/cm', icon: FlaskConical, label: 'CM Лоты', roles: ['Production', 'QA', 'Admin', 'Manager'] },
    ]
  },
  {
    label: 'ПРОДУКТ',
    items: [
      { path: '/products', icon: Package, label: 'Готовая продукция', roles: ['Production', 'QA', 'Admin', 'Manager'] },
      { path: '/requests', icon: FileText, label: 'Заявки', roles: ['Manager', 'Production', 'Admin'] },
      { path: '/warehouse', icon: Warehouse, label: 'Склад', roles: ['Manager', 'Production', 'Admin'] },
    ]
  },
  {
    label: 'КОНТРОЛЬ',
    items: [
      { path: '/qc', icon: ClipboardCheck, label: 'QC', roles: ['QC', 'QA', 'Admin'] },
      { path: '/qa', icon: ShieldCheck, label: 'QA', roles: ['QA', 'Admin'] },
    ]
  },
  {
    label: 'СПРАВОЧНИКИ',
    items: [
      { path: '/culture', icon: Beaker, label: 'Культуры', roles: ['Production', 'Admin'] },
      { path: '/admin', icon: Settings, label: 'Администрирование', roles: ['Admin'] },
    ]
  },
];

export default function Sidebar() {
  const { user, logout, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">EXO ProTrack</h1>
          <p className="text-xs text-slate-400 mt-1">Система мониторинга производства</p>
          <p className="text-xs text-slate-500 mt-0.5">v3.4.0 | 24.01.2026</p>
        </div>
        <button className="md:hidden text-slate-400" onClick={() => setMobileOpen(false)}>
          <X size={24} />
        </button>
      </div>

      {/* QR Scan Button */}
      <Link
        to="/scan"
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-3 px-4 py-3 mx-2 mt-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white"
      >
        <QrCode size={20} />
        Сканировать QR
      </Link>
      
      <nav className="flex-1 overflow-y-auto py-4">
        {menuGroups.map((group, groupIdx) => {
          const filteredItems = group.items.filter(item => hasRole(item.roles as any[]));
          if (filteredItems.length === 0) return null;
          
          return (
            <div key={groupIdx} className="mb-2">
              {group.label && (
                <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              {filteredItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm transition-colors min-h-[44px] ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`
                  }
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="text-sm mb-2">
          <p className="font-medium">{user?.full_name || user?.email}</p>
          <p className="text-xs text-slate-400">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm min-h-[44px]"
        >
          <LogOut size={16} />
          Выход
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg md:hidden"
      >
        <Menu size={24} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col h-screen fixed left-0 top-0">
        {sidebarContent}
      </aside>

      {/* Sidebar - mobile */}
      <aside className={`md:hidden fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col z-50 transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
