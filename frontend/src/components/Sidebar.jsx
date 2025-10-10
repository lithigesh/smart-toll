import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Car, 
  Wallet, 
  History, 
  CreditCard, 
  LogOut, 
  Menu,
  X,
  Plus
} from 'lucide-react';
import { Button } from './ui/Button';
import { Separator } from './ui/separator';
import { useAuth } from '../hooks/useAuth';

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Vehicles',
    href: '/vehicles',
    icon: Car
  },
  {
    title: 'Wallet',
    href: '/wallet',
    icon: Wallet
  },
  {
    title: 'Recharge',
    href: '/recharge',
    icon: CreditCard
  },
  {
    title: 'Transaction History',
    href: '/history',
    icon: History
  }
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out shadow-lg
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:fixed md:h-screen md:shadow-none
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <h1 className="text-xl font-bold text-gray-900">
              Smart Toll
            </h1>
            {user && (
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {user.name}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 bg-white">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}

            <Separator className="my-4" />

            <Separator className="my-4" />

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quick Actions
              </p>
              <Link
                to="/vehicles/add"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              >
                <Plus className="mr-3 h-4 w-4" />
                Add Vehicle
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <Button
              variant="outline"
              className="w-full justify-start border-red-500 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}