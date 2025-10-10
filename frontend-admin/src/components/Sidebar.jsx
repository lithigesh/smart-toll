import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  CreditCard, 
  LogOut,
  Search,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/admin/dashboard', 
      icon: LayoutDashboard,
      current: location.pathname === '/admin/dashboard'
    },
    { 
      name: 'Users', 
      href: '/admin/users', 
      icon: Users,
      current: location.pathname === '/admin/users'
    },
    { 
      name: 'Vehicles', 
      href: '/admin/vehicles', 
      icon: Car,
      current: location.pathname === '/admin/vehicles'
    },
    { 
      name: 'Transactions', 
      href: '/admin/transactions', 
      icon: CreditCard,
      current: location.pathname === '/admin/transactions'
    }
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <LayoutDashboard className="h-4 w-4" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold text-sidebar-foreground">
            Admin Panel
          </span>
          <span className="truncate text-xs text-sidebar-foreground/70">
            Smart Toll System
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto">
        <nav className="grid gap-1 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                  ${item.current 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;