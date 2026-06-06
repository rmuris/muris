import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import Fleet from './pages/Fleet';
import Customers from './pages/Customers';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/shipments/:id" element={<ShipmentDetail />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/customers" element={<Customers />} />
      </Route>
    </Routes>
  );
}
