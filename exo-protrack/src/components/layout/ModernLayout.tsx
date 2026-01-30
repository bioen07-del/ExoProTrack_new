import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../../hooks/use-media-query';
import {
  LayoutDashboard,
  FlaskConical,
  FileText,
  Package,
  Warehouse,
  ClipboardCheck,
  ShieldCheck,
  Beaker,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Moon,
  Sun,
  Monitor,
  Home,
  Search,
  Plus,
  Menu as MenuIcon,
  QrCode,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../providers/ThemeProvider';
import { useUnreadCount } from '../../hooks/use-notifications';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../shared/NotificationBell';
import { PWAInstallPrompt } from '../shared/PWAInstallPrompt';
import { PWAUpdateBanner } from '../shared/PWAUpdateBanner';

// Navigation items — match App.tsx routes and Sidebar.tsx structure
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { path: '/', label: 'Дашборд', icon: LayoutDashboard, roles: ['Production', 'QC', 'QA', 'Manager', 'Admin'] },
    ],
  },
  {
    label: 'СЫРЬЁ',
    items: [
      { path: '/cm', label: 'CM Лоты', icon: FlaskConical, roles: ['Production', 'QC', 'QA', 'Manager', 'Admin'] },
    ],
  },
  {
    label: 'ПРОДУКТ',
    items: [
      { path: '/products', label: 'Готовая продукция', icon: Package, roles: ['Production', 'QC', 'QA', 'Manager', 'Admin'] },
      { path: '/requests', label: 'Заявки', icon: FileText, roles: ['Production', 'Manager', 'Admin'] },
      { path: '/warehouse', label: 'Склад', icon: Warehouse, roles: ['Production', 'Manager', 'Admin'] },
    ],
  },
  {
    label: 'КОНТРОЛЬ',
    items: [
      { path: '/qc', label: 'QC', icon: ClipboardCheck, roles: ['QC', 'QA', 'Admin'] },
      { path: '/qa', label: 'QA', icon: ShieldCheck, roles: ['QA', 'Admin'] },
    ],
  },
  {
    label: 'СПРАВОЧНИКИ',
    items: [
      { path: '/culture', label: 'Культуры', icon: Beaker, roles: ['Production', 'QC', 'QA', 'Admin'] },
      { path: '/admin', label: 'Администрирование', icon: Settings, roles: ['Admin'] },
    ],
  },
] as const;

// Flat list for page title lookup
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// Mobile bottom navigation items
const MOBILE_NAV_ITEMS = [
  { path: '/', label: 'Главная', icon: Home },
  { path: '/cm', label: 'CM', icon: FlaskConical },
  { path: '/requests', label: 'Заявки', icon: FileText },
  { path: '/warehouse', label: 'Склад', icon: Warehouse },
] as const;

// --- Sub-components ---

function MobileHeader({
  pageTitle,
  unreadCount,
  onMenuOpen,
}: {
  pageTitle: string;
  unreadCount: number;
  onMenuOpen: () => void;
}) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <button
          onClick={onMenuOpen}
          className="p-2 -ml-2 rounded-lg hover:bg-muted touch-manipulation"
          aria-label="Открыть меню"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-semibold truncate text-foreground">{pageTitle}</h1>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted touch-manipulation"
            aria-label="Сменить тему"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <NotificationBell />
        </div>
      </div>
    </header>
  );
}

function MobileMenu({
  isOpen,
  onClose,
  location,
}: {
  isOpen: boolean;
  onClose: () => void;
  location: { pathname: string };
}) {
  const { user, logout, hasRole } = useAuth();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[80vw] bg-background border-r border-border lg:hidden"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between h-14 px-4 border-b border-border">
                <span className="text-lg font-bold text-primary">EXO ProTrack</span>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                  ✕
                </button>
              </div>

              <Link
                to="/scan"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 mx-3 mt-3 bg-primary hover:bg-primary/90 rounded-lg text-sm text-primary-foreground"
              >
                <QrCode className="w-5 h-5" />
                Сканировать QR
              </Link>

              <nav className="flex-1 overflow-y-auto p-3">
                {NAV_GROUPS.map((group, groupIdx) => {
                  const filtered = group.items.filter(item => hasRole(item.roles as any[]));
                  if (filtered.length === 0) return null;
                  return (
                    <div key={groupIdx} className="mb-2">
                      {group.label && (
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.label}
                        </div>
                      )}
                      {filtered.map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]',
                            location.pathname === item.path
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-border">
                {user && (
                  <div className="px-3 mb-3">
                    <p className="text-sm font-medium text-foreground">{user.full_name || user.email}</p>
                    <span className="text-xs text-muted-foreground">{user.role}</span>
                  </div>
                )}
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-muted text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DesktopSidebar({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cycleTheme = useCallback(() => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  }, [theme, setTheme]);

  const themeIcon = theme === 'light' ? <Sun className="w-4 h-4" /> :
                    theme === 'dark' ? <Moon className="w-4 h-4" /> :
                    <Monitor className="w-4 h-4" />;
  const themeLabel = theme === 'light' ? 'Светлая' :
                     theme === 'dark' ? 'Тёмная' : 'Системная';

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-30 h-screen bg-sidebar-background border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex items-center h-14 px-3 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap">EXO ProTrack</span>
            </motion.div>
          )}
        </Link>
      </div>

      {isOpen ? (
        <Link
          to="/scan"
          className="flex items-center gap-3 px-3 py-2.5 mx-2 mt-3 bg-primary hover:bg-primary/90 rounded-lg text-sm text-primary-foreground"
        >
          <QrCode className="w-5 h-5" />
          Сканировать QR
        </Link>
      ) : (
        <Link
          to="/scan"
          className="flex items-center justify-center p-2 mx-2 mt-3 bg-primary hover:bg-primary/90 rounded-lg text-primary-foreground"
          title="Сканировать QR"
        >
          <QrCode className="w-5 h-5" />
        </Link>
      )}

      <nav className="flex-1 overflow-y-auto p-2 mt-2">
        {NAV_GROUPS.map((group, groupIdx) => {
          const filtered = group.items.filter(item => hasRole(item.roles as any[]));
          if (filtered.length === 0) return null;
          return (
            <div key={groupIdx} className="mb-1">
              {group.label && isOpen && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              {!isOpen && group.label && <div className="my-1 mx-2 border-t border-sidebar-border" />}
              {filtered.map(item => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all min-h-[40px]',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-sidebar-accent text-sidebar-foreground'
                    )}
                    title={isOpen ? undefined : item.label}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span className="text-sm">{item.label}</span>}
                    {isActive && isOpen && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-current"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors',
              userMenuOpen && 'bg-sidebar-accent'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            {isOpen && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate text-sidebar-foreground">
                    {user?.full_name || user?.email || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.role || 'Guest'}</p>
                </div>
                <ChevronDown
                  className={cn('w-4 h-4 transition-transform duration-200 text-muted-foreground', userMenuOpen && 'rotate-180')}
                />
              </>
            )}
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-card rounded-lg border border-border shadow-lg"
              >
                <button
                  onClick={cycleTheme}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm text-foreground"
                >
                  {themeIcon}
                  <span>Тема: {themeLabel}</span>
                </button>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-muted text-destructive transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full mt-2 p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground"
          aria-label={isOpen ? 'Свернуть' : 'Развернуть'}
        >
          {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}

function DesktopHeader({
  pageTitle,
  unreadCount,
}: {
  pageTitle: string;
  unreadCount: number;
}) {
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border mb-6 -mt-6 -mx-6 px-6 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Поиск..."
              className="pl-9 pr-4 py-1.5 w-64 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Поиск"
            />
          </div>

          <NotificationBell />

          <Link
            to="/cm/new"
            className="btn btn-primary btn-sm hidden sm:flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Новый лот
          </Link>
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav({ location }: { location: { pathname: string } }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {MOBILE_NAV_ITEMS.map(item => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors relative',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs mt-1">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-20 left-4 right-4 z-50 bg-warning text-warning-foreground text-center py-2 px-4 text-sm font-medium rounded-lg shadow-lg"
    >
      Нет подключения к интернету
    </motion.div>
  );
}

// --- Main Layout Component ---

export default function ModernLayout() {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { count: unreadCount } = useUnreadCount();

  const pageTitle = useMemo(() => {
    const current = ALL_NAV_ITEMS.find(item =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.path)
    );
    return current?.label || 'EXO ProTrack';
  }, [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const mainClass = isMobile
    ? 'pt-14 pb-20'
    : sidebarOpen ? 'ml-64' : 'ml-16';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isMobile && (
        <MobileHeader
          pageTitle={pageTitle}
          unreadCount={unreadCount}
          onMenuOpen={() => setMobileMenuOpen(true)}
        />
      )}

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        location={location}
      />

      {!isMobile && (
        <DesktopSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      <main className={cn('min-h-screen transition-all duration-300 ease-in-out', mainClass)}>
        <div className="p-6">
          {!isMobile && (
            <DesktopHeader pageTitle={pageTitle} unreadCount={unreadCount} />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {isMobile && <MobileBottomNav location={location} />}

      <OfflineIndicator />
      <PWAInstallPrompt />
      <PWAUpdateBanner />
    </div>
  );
}
