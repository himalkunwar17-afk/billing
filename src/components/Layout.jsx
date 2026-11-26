import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, ShoppingCart, Package,
  Users, Truck, Settings, Menu, X, FileText
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', labelNp: 'ड्यासबोर्ड', icon: LayoutDashboard },
  { path: '/sales', label: 'Sales', labelNp: 'बिक्री', icon: Receipt },
  { path: '/purchases', label: 'Purchases', labelNp: 'खरिद', icon: ShoppingCart },
  { path: '/products', label: 'Products', labelNp: 'सामान', icon: Package },
  { path: '/customers', label: 'Customers', labelNp: 'ग्राहक', icon: Users },
  { path: '/suppliers', label: 'Suppliers', labelNp: 'आपूर्तिकर्ता', icon: Truck },
  { path: '/settings', label: 'Settings', labelNp: 'सेटिङ', icon: Settings },
];

const pageTitles = {
  '/': 'Dashboard',
  '/sales': 'Sales Invoices',
  '/sales/new': 'Create Sales Invoice',
  '/purchases': 'Purchase Invoices',
  '/purchases/new': 'Create Purchase Invoice',
  '/products': 'Products & Inventory',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/settings': 'Settings',
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] ||
    (location.pathname.startsWith('/sales/') ? 'Invoice Details' :
     location.pathname.startsWith('/purchases/') ? 'Purchase Details' : 'Nepal VAT Billing');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-indigo-900 to-indigo-800 
          transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} sidebar no-print`}
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-indigo-700/50">
          <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-lg">
            <FileText className="w-6 h-6 text-indigo-200" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">VAT Billing</h1>
            <p className="text-xs text-indigo-300">नेपाल भ्याट बिलिङ</p>
          </div>
          <button
            className="ml-auto lg:hidden text-indigo-300 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-indigo-700/50 text-white shadow-sm'
                  : 'text-indigo-300 hover:bg-indigo-700/30 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-indigo-700/50">
          <p className="text-xs text-indigo-400 text-center">Nepal VAT Billing v1.0</p>
          <p className="text-xs text-indigo-500 text-center mt-1">IRD Compliant</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 no-print shadow-sm">
          <button
            className="lg:hidden text-gray-600 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">{pageTitle}</h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
