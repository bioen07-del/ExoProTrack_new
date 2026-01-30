import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { RealtimeNotificationListener } from './hooks/use-notifications';
import ModernLayout from './components/layout/ModernLayout';

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CmLotList = lazy(() => import('./pages/CmLotList'));
const CmLotCreate = lazy(() => import('./pages/CmLotCreate'));
const CmLotDetail = lazy(() => import('./pages/CmLotDetail'));
const CultureList = lazy(() => import('./pages/CultureList'));
const CultureDetail = lazy(() => import('./pages/CultureDetail'));
const RequestList = lazy(() => import('./pages/RequestList'));
const RequestDetail = lazy(() => import('./pages/RequestDetail'));
const Warehouse = lazy(() => import('./pages/Warehouse'));
const PackLotDetail = lazy(() => import('./pages/PackLotDetail'));
const PackLotList = lazy(() => import('./pages/PackLotList'));
const QcPage = lazy(() => import('./pages/QcPage'));
const QaPage = lazy(() => import('./pages/QaPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-muted-foreground">Загрузка страницы...</div>
      </div>
    </div>
  );
}

// Full-screen loading for initial auth check
function AuthLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-lg text-muted-foreground">Загрузка...</div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      {/* Realtime notification listener */}
      <RealtimeNotificationListener />

      <Suspense fallback={<AuthLoader />}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <ModernLayout />
            </ProtectedRoute>
          }>
            <Route index element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="cm" element={
              <Suspense fallback={<PageLoader />}>
                <CmLotList />
              </Suspense>
            } />
            <Route path="cm/new" element={
              <Suspense fallback={<PageLoader />}>
                <CmLotCreate />
              </Suspense>
            } />
            <Route path="cm/:id" element={
              <Suspense fallback={<PageLoader />}>
                <CmLotDetail />
              </Suspense>
            } />
            <Route path="culture" element={
              <Suspense fallback={<PageLoader />}>
                <CultureList />
              </Suspense>
            } />
            <Route path="culture/:id" element={
              <Suspense fallback={<PageLoader />}>
                <CultureDetail />
              </Suspense>
            } />
            <Route path="requests" element={
              <Suspense fallback={<PageLoader />}>
                <RequestList />
              </Suspense>
            } />
            <Route path="requests/:id" element={
              <Suspense fallback={<PageLoader />}>
                <RequestDetail />
              </Suspense>
            } />
            <Route path="products" element={
              <Suspense fallback={<PageLoader />}>
                <PackLotList />
              </Suspense>
            } />
            <Route path="products/:id" element={
              <Suspense fallback={<PageLoader />}>
                <PackLotDetail />
              </Suspense>
            } />
            <Route path="packlot/:id" element={
              <Suspense fallback={<PageLoader />}>
                <PackLotDetail />
              </Suspense>
            } />
            <Route path="warehouse" element={
              <Suspense fallback={<PageLoader />}>
                <Warehouse />
              </Suspense>
            } />
            <Route path="qc" element={
              <Suspense fallback={<PageLoader />}>
                <QcPage />
              </Suspense>
            } />
            <Route path="qa" element={
              <Suspense fallback={<PageLoader />}>
                <QaPage />
              </Suspense>
            } />
            <Route path="admin" element={
              <Suspense fallback={<PageLoader />}>
                <AdminPage />
              </Suspense>
            } />
            <Route path="scan" element={
              <Suspense fallback={<PageLoader />}>
                <ScanPage />
              </Suspense>
            } />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReactQueryProvider>
          <AppRoutes />
        </ReactQueryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
