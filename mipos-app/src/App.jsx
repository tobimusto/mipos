import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CountryProvider } from './context/CountryContext';
import { ROLES } from './constants/enums';
import { ThemeProvider } from './context/ThemeContext';
import { initOfflineSync } from './lib/offlineSync';
import DashboardLayout from './layouts/DashboardLayout';
const POS = lazy(() => import('./pages/POS'));
const Inventory = lazy(() => import('./pages/Inventory'));
const NewProduct = lazy(() => import('./pages/NewProduct'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Clients = lazy(() => import('./pages/Clients'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Movements = lazy(() => import('./pages/Movements'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Providers = lazy(() => import('./pages/Providers'));
const OnlineStore = lazy(() => import('./pages/OnlineStore'));
const FAQ = lazy(() => import('./pages/FAQ'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const Profile = lazy(() => import('./pages/Profile'));
const SupplierDebts = lazy(() => import('./pages/SupplierDebts'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const RoleGuard = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();
  
  if (loading) return null;

  const userRole = profile?.role || ROLES.PROPIETARIO;

  if (!allowedRoles.includes(userRole) && userRole !== ROLES.SUPERADMIN) {
    return <Navigate to="/pos" replace />;
  }

  return children;
};

initOfflineSync();

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CountryProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            },
            success: {
              iconTheme: { primary: '#00D68F', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#FF4D6D', secondary: '#fff' },
            },
          }}
        />
        <BrowserRouter>
          <Suspense fallback={
            <div className="flex items-center justify-center h-screen w-full bg-bg">
            <Loader2 className="animate-spin text-brand" size={40} />
          </div>
        }>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/c/:slugOrId" element={<Catalog />} />
            <Route path="/online-store/:storeId" element={<OnlineStore />} />
            
            <Route path="/superadmin" element={
              <ProtectedRoute>
                <SuperAdmin />
              </ProtectedRoute>
            } />

            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/pos" replace />} />
              
              {/* Rutas de acceso global para cualquier rol autenticado */}
              <Route path="pos" element={<POS />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="profile" element={<Profile />} />
              <Route path="support" element={<div>Soporte (Construcción)</div>} />

              {/* Rutas: Empleado, Empleado PLUS, Gerente, Propietario */}
              <Route path="inventory" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE, ROLES.EMPLEADO_PLUS, ROLES.EMPLEADO]}><Inventory /></RoleGuard>} />
              <Route path="inventory/new" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE, ROLES.EMPLEADO_PLUS, ROLES.EMPLEADO]}><NewProduct /></RoleGuard>} />
              <Route path="clients" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE, ROLES.EMPLEADO_PLUS, ROLES.EMPLEADO]}><Clients /></RoleGuard>} />
              <Route path="purchases" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE, ROLES.EMPLEADO_PLUS, ROLES.EMPLEADO]}><Purchases /></RoleGuard>} />

              {/* Rutas: Empleado PLUS, Gerente, Propietario */}
              <Route path="reports" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE, ROLES.EMPLEADO_PLUS]}><Reports /></RoleGuard>} />
              <Route path="movements" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE, ROLES.EMPLEADO_PLUS]}><Movements /></RoleGuard>} />

              {/* Rutas Administrativas: Gerente, Propietario */}
              <Route path="users" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE]}><Users /></RoleGuard>} />
              <Route path="providers" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE]}><Providers /></RoleGuard>} />
              <Route path="debts" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE, ROLES.EMPLEADO_PLUS]}><SupplierDebts /></RoleGuard>} />
              <Route path="settings" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE]}><Settings /></RoleGuard>} />
              <Route path="store" element={<RoleGuard allowedRoles={[ROLES.PROPIETARIO, ROLES.GERENTE]}><OnlineStore /></RoleGuard>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
        </CountryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
