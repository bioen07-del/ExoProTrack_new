import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMediaQuery } from 'framer-motion';
import {
  LayoutDashboard,
  FlaskConical,
  FileText,
  Package,
  Warehouse,
  Users,
  Settings,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Moon,
  Sun,
  Home,
  Search,
  Plus,
  Menu as MenuIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';
import { useNotifications } from '@/services/notification-service';

// Navigation items
const NAV_ITEMS = [
  { path: '/', label: 'Дашборд', icon: LayoutDashboard, roles: ['Production', 'QC', 'QA', 'Manager', 'Admin'] },
  { path: '/cm-lots', label: 'CM Лоты', icon: FlaskConical, roles: ['Production', 'QC', 'QA', 'Manager'] },
  { path: '/requests', label: 'Заявки', icon: FileText, roles: ['Production', 'QC', 'QA', 'Manager'] },
  { path: '/pack-lots', label: 'Фасовка', icon: Package, roles: ['Production', 'QC', 'QA', 'Manager'] },
  { path: '/warehouse', label: 'Склад', icon: Warehouse, roles: ['Production', 'QC', 'QA', 'Manager', 'Admin'] },
  { path: '/cultures', label: 'Культуры', icon: Users, roles: ['Production', 'QC', 'QA'] },
  { path: '/admin', label: 'Админ', icon: Settings, roles: ['Admin'] },
] as const;

// Mobile bottom navigation items
const MOBILE_NAV_ITEMS = [
  { path: '/', label: 'Главная', icon: Home },
  { path: '/cm-lots', label: 'CM', icon: FlaskConical },
  { path: '/requests', label: 'Заявки', icon: FileText },
  { path: '/warehouse', label: 'Склад', icon: Warehouse },
] as const;

interface LayoutProps {
  children: React.ReactNode;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

// Reusable components for better code organization
const MobileHeader = ({
  pageTitle,
  unreadCount,
  onMenuOpen,
  toggleTheme,
  theme,
}: {
  pageTitle: string;
  unreadCount: number;
  onMenuOpen: () => void;
  toggleTheme: () => void;
  theme: string;
}) => (
  <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b">
    <div className="flex items-center justify-between h-14 px-4">
      <button
        onClick={onMenuOpen}
        className="p-2 -ml-2 rounded-lg hover:bg-muted touch-manipulation"
        aria-label="Открыть меню"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      <h1 className="text-sm font-semibold truncate">{pageTitle}</h1>

      <div className="flex items-center gap-1">
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg hover:bg-muted touch-manipulation"
          aria-label="Уведомления"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-error rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted touch-manipulation"
          aria-label="Сменить тему"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  </header>
);

const MobileMenu = ({
  isOpen,
  onClose,
  navItems,
  userName,
  userRole,
  location,
}: {
  isOpen: boolean;
  onClose: () => void;
  navItems: typeof NAV_ITEMS;
  userName?: string;
  userRole?: string;
  location: { pathname: string };
}) => (
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
          className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[80vw] bg-background border-r lg:hidden"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between h-14 px-4 border-b">
              <span className="text-lg font-bold text-primary">EXO ProTrack</span>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: onClose ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="w-5 h-5"
                    animate={{ rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    ✕
                  </motion.div>
                </motion.div>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        location.pathname === item.path
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {userName && (
                <div className="mt-6 pt-4 border-t">
                  <div className="px-3 mb-2">
                    <p className="text-sm font-medium">{userName}</p>
                    {userRole && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {userRole.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </nav>

            <div className="p-4 border-t">
              <button
                onClick={() => {
                  // Handle logout - TODO: implement logout logic
                  console.log('Logout clicked');
                }}
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

const DesktopSidebar = ({
  isOpen,
  navItems,
  userName,
  userRole,
  userMenuOpen,
  onUserMenuToggle,
  theme,
  toggleTheme,
  location,
}: {
  isOpen: boolean;
  navItems: typeof NAV_ITEMS;
  userName?: string;
  userRole?: string;
  userMenuOpen: boolean;
  onUserMenuToggle: () => void;
  theme: string;
  toggleTheme: () => void;
  location: { pathname: string };
}) => (
  <aside
    className={cn(
      'fixed top-0 left-0 z-30 h-screen bg-sidebar-background border-r transition-all duration-300 ease-in-out',
      isOpen ? 'w-64' : 'w-16'
    )}
  >
    <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-bold text-lg"
          >
            EXO ProTrack
          </motion.span>
        )}
      </Link>
    </div>

    <nav className="flex-1 overflow-y-auto p-2">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-sidebar-accent text-sidebar-foreground'
                )}
                title={isOpen ? undefined : item.label}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span>{item.label}</span>}
                {isActive && isOpen && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-current"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>

    <div className="p-2 border-t border-sidebar-border">
      <div className="relative">
        <button
          onClick={onUserMenuToggle}
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
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{userName || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{userRole || 'Guest'}</p>
              </div>
              <ChevronDown
                className={cn('w-4 h-4 transition-transform duration-200', userMenuOpen && 'rotate-180')}
              />
            </>
          )}
        </button>

        <AnimatePresence>
          {userMenuOpen && isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-card rounded-lg border shadow-lg"
            >
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
              </button>
              <button
                onClick={() => {
                  // Handle logout - TODO: implement logout logic
                  console.log('Logout clicked');
                }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-muted text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => {
          // Toggle sidebar - will be controlled by parent
          console.log('Toggle sidebar');
        }}
        className="flex items-center justify-center w-full mt-2 p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        aria-label={isOpen ? 'Свернуть' : 'Развернуть'}
      >
        <MenuIcon
          className={cn('w-5 h-5 transition-transform duration-300', !isOpen && 'rotate-180')}
        />
      </button>
    </div>
  </aside>
);

const DesktopHeader = ({
  pageTitle,
  unreadCount,
}: {
  pageTitle: string;
  unreadCount: number;
}) => (
  <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b mb-6 -mt-4 -mx-4 px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Поиск..."
            className="input input-with-icon w-64"
            aria-label="Поиск"
          />
        </div>

        <Link
          to="/notifications"
          className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Уведомления"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-error rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/cm-lots/create"
          className="btn-primary btn-sm hidden sm:flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Новый лот
        </Link>
      </div>
    </div>
  </header>
);

const MobileBottomNav = ({
  items,
  location,
}: {
  items: typeof MOBILE_NAV_ITEMS;
  location: { pathname: string };
}) => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-lg border-t safe-area-pb">
    <div className="flex items-center justify-around h-16">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
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
                className="absolute bottom-0 w-8 h-0.5 bg-primary"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  </nav>
);

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

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
      className="fixed bottom-0 left-0 right-0 z-50 bg-warning text-warning-foreground text-center py-2 text-sm font-medium"
    >
      Вы не подключены к интернету. Некоторые функции могут быть недоступны.
    </motion.div>
  );
};

export function Layout({ children, userRole, userName, userEmail }: LayoutProps) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isMobile = useMediaQuery('(max-width: 640px)');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { unreadCount } = useNotifications(userEmail);

  // Memoized filtered navigation items
  const filteredNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !userRole || item.roles.includes(userRole)),
    [userRole]
  );

  // Memoized page title
  const pageTitle = useMemo(() => {
    const currentItem = filteredNavItems.find((item) => item.path === location.pathname);
    return currentItem?.label || 'EXO ProTrack';
  }, [filteredNavItems, location.pathname]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    }
  }, [isMobile, mobileMenuOpen]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Calculate main content margin
  const mainMargin = !isMobile
    ? sidebarOpen
      ? 'ml-64'
      : 'ml-16'
    : 'pt-14';

  return (
    <div className="min-h-screen bg-background">
      {isMobile && (
        <MobileHeader
          pageTitle={pageTitle}
          unreadCount={unreadCount}
          onMenuOpen={() => setMobileMenuOpen(true)}
          toggleTheme={toggleTheme}
          theme={theme}
        />
      )}

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navItems={filteredNavItems}
        userName={userName}
        userRole={userRole}
        location={location}
      />

      {!isMobile && (
        <DesktopSidebar
          isOpen={sidebarOpen}
          navItems={filteredNavItems}
          userName={userName}
          userRole={userRole}
          userMenuOpen={userMenuOpen}
          onUserMenuToggle={() => setUserMenuOpen(!userMenuOpen)}
          theme={theme}
          toggleTheme={toggleTheme}
          location={location}
        />
      )}

      <main className={cn('min-h-screen transition-all duration-300 ease-in-out', mainMargin)}>
        <div className="container-padding">
          {!isMobile && <DesktopHeader pageTitle={pageTitle} unreadCount={unreadCount} />}

          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {isMobile && <MobileBottomNav items={MOBILE_NAV_ITEMS} location={location} />}

      <OfflineIndicator />
    </div>
  );
}

export default Layout;
