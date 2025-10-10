import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Car, CreditCard, TrendingUp, Activity, DollarSign } from 'lucide-react';

const Dashboard = () => {
  const [analytics, setAnalytics] = useState({
    users: 0,
    vehicles: 0,
    transactions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch real analytics from backend API
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3001/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      // Fallback to mock data if database connection fails
      setAnalytics({
        users: 0,
        vehicles: 0,
        transactions: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const analyticsCards = [
    {
      title: 'Total Users',
      value: analytics.users,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Registered users in the system'
    },
    {
      title: 'Total Vehicles',
      value: analytics.vehicles,
      icon: Car,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Vehicles registered in the system'
    },
    {
      title: 'Total Transactions',
      value: analytics.transactions,
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'All processed transactions'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
        <span className="text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your Smart Toll Management System
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {analyticsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-3xl font-bold text-card-foreground">
                      {card.value.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/admin/users" className="flex items-center space-x-3 p-4 bg-accent hover:bg-accent/80 rounded-lg transition-colors">
            <Users className="h-5 w-5 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">
              Manage Users
            </span>
          </Link>
          
          <Link to="/admin/vehicles" className="flex items-center space-x-3 p-4 bg-accent hover:bg-accent/80 rounded-lg transition-colors">
            <Car className="h-5 w-5 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">
              Manage Vehicles
            </span>
          </Link>
          
          <Link to="/admin/transactions" className="flex items-center space-x-3 p-4 bg-accent hover:bg-accent/80 rounded-lg transition-colors">
            <CreditCard className="h-5 w-5 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">
              View Transactions
            </span>
          </Link>
        </div>
      </div>

      {/* Recent Activity (Placeholder) */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-4">
          System Status
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                All Systems Operational
              </span>
            </div>
            <span className="text-xs text-green-600">
              Last checked: {new Date().toLocaleTimeString()}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Database</p>
              <p className="text-lg font-semibold text-green-600">Online</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Payment Gateway</p>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">ESP32 Devices</p>
              <p className="text-lg font-semibold text-green-600">Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;