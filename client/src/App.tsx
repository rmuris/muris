import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import Fleet from './pages/Fleet';
import Customers from './pages/Customers';
import Companies from './pages/Companies';
import Users from './pages/Users';
import Tasks from './pages/Tasks';
import Documents from './pages/Documents';
import Updates from './pages/Updates';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/shipments/:id" element={<ShipmentDetail />} />
          <Route path="/fleet" element={
            <ProtectedRoute resource="FLEET" action="canRead"><Fleet /></ProtectedRoute>
          } />
          <Route path="/customers" element={<Customers />} />
          <Route path="/companies" element={
            <ProtectedRoute resource="COMPANIES" action="canRead"><Companies /></ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><Users /></ProtectedRoute>
          } />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/updates" element={<Updates />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
