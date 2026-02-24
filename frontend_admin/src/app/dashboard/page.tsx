"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Car, Receipt, IndianRupee } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_ENDPOINTS } from "@/config/api";
import { Analytics, Transaction } from "@/types";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      
      // If using local auth token, show demo data
      if (token?.startsWith("local-admin-token-")) {
        setAnalytics({
          totalUsers: 0,
          totalVehicles: 0,
          totalTransactions: 0,
          totalRevenue: 0,
          recentTransactions: [],
          recentUsers: [],
        });
        setError("Using local auth - connect to backend for real data");
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.admin.analytics, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      // Map backend response format to frontend format
      setAnalytics({
        totalUsers: data.users || data.totalUsers || 0,
        totalVehicles: data.vehicles || data.totalVehicles || 0,
        totalTransactions: data.transactions || data.totalTransactions || 0,
        totalRevenue: data.revenue || data.totalRevenue || 0,
        recentTransactions: data.recentTransactions || [],
        recentUsers: data.recentUsers || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isLocalAuth = error?.includes("local auth");

  return (
    <div className="space-y-6">
      {error && (
        <div className={`rounded-md p-4 ${isLocalAuth ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200" : "bg-destructive/10 text-destructive"}`}>
          {error}
        </div>
      )}
      
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Smart Toll System Overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={analytics?.totalUsers || 0}
          icon={<Users className="h-4 w-4" />}
          description="Registered users"
        />
        <StatCard
          title="Total Vehicles"
          value={analytics?.totalVehicles || 0}
          icon={<Car className="h-4 w-4" />}
          description="Registered vehicles"
        />
        <StatCard
          title="Toll Transactions"
          value={analytics?.totalTransactions || 0}
          icon={<Receipt className="h-4 w-4" />}
          description="Total toll deductions"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${(analytics?.totalRevenue || 0).toLocaleString()}`}
          icon={<IndianRupee className="h-4 w-4" />}
          description="Total toll collected"
        />
      </div>

      {/* Recent Toll Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Toll Deductions</CardTitle>
          <CardDescription>Latest toll transactions from vehicles</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.recentTransactions && analytics.recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {analytics.recentTransactions.map((transaction: Transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-orange-100 text-orange-600">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.description || transaction.toll_location || "Toll Deduction"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-600">
                      -₹{transaction.amount}
                    </p>
                    <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No recent transactions
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
