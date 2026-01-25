import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { RealtimeNotificationListener } from './hooks/use-notifications';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CmLotList from './pages/CmLotList';
import CmLotCreate from './pages/CmLotCreate';
import CmLotDetail from './pages/CmLotDetail';
import CultureList from './pages/CultureList';
import CultureDetail from './pages/CultureDetail';
import RequestList from './pages/RequestList';
import RequestDetail from './pages/RequestDetail';
import Warehouse from './pages/Warehouse';
import PackLotDetail from './pages/PackLotDetail';
import PackLotList from './pages/PackLotList';
import QcPage from './pages/QcPage';
import QaPage from './pages/QaPage';
import AdminPage from './pages/AdminPage';
import ScanPage from './pages/ScanPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-lg text-muted-foreground">Загрузка...</div>
        </div>
      </div>
    );
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
      
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="cm" element={<CmLotList />} />
          <Route path="cm/new" element={<CmLotCreate />} />
          <Route path="cm/:id" element={<CmLotDetail />} />
          <Route path="culture" element={<CultureList />} />
          <Route path="culture/:id" element={<CultureDetail />} />
          <Route path="requests" element={<RequestList />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="products" element={<PackLotList />} />
          <Route path="products/:id" element={<PackLotDetail />} />
          <Route path="packlot/:id" element={<PackLotDetail />} />
          <Route path="warehouse" element={<Warehouse />} />
          <Route path="qc" element={<QcPage />} />
          <Route path="qa" element={<QaPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="scan" element={<ScanPage />} />
        </Route>
      </Routes>
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
