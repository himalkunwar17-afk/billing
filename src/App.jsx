import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';
import SalesList from './pages/SalesList';
import SalesCreate from './pages/SalesCreate';
import SalesView from './pages/SalesView';
import PurchasesList from './pages/PurchasesList';
import PurchasesCreate from './pages/PurchasesCreate';
import PurchasesView from './pages/PurchasesView';

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#f8fafc', fontSize: '14px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#f8fafc' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' }, duration: 5000 },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<SalesList />} />
          <Route path="/sales/new" element={<SalesCreate />} />
          <Route path="/sales/:id" element={<SalesView />} />
          <Route path="/purchases" element={<PurchasesList />} />
          <Route path="/purchases/new" element={<PurchasesCreate />} />
          <Route path="/purchases/:id" element={<PurchasesView />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
