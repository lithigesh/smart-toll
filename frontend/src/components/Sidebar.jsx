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
        fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:fixed md:h-screen
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-xl font-bold text-sidebar-foreground">
              Smart Toll
            </h1>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">
                Welcome, {user.name}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }
                  `}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}

            <Separator className="my-4" />

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </p>
              <Link
                to="/vehicles/add"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <Plus className="mr-3 h-4 w-4" />
                Add Vehicle
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="outline"
              className="w-full justify-start border-red-600 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600"
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