import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import Fleet from './pages/Fleet';
import Customers from './pages/Customers';
import Carriers from './pages/Carriers';
import Customs from './pages/Customs';
import Warehouse from './pages/Warehouse';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import Accounting from './pages/Accounting';
import RiskCenter from './pages/RiskCenter';
import Compliance from './pages/Compliance';
import Border from './pages/Border';
import AIAgents from './pages/AIAgents';
import Quotes from './pages/Quotes';

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
        <Route path="/carriers" element={<Carriers />} />
        <Route path="/customs" element={<Customs />} />
        <Route path="/warehouse" element={<Warehouse />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/accounting" element={<Accounting />} />
        <Route path="/risk" element={<RiskCenter />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/border" element={<Border />} />
        <Route path="/ai-agents" element={<AIAgents />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/dispatch" element={<Shipments />} />
      </Route>
    </Routes>
  );
}
