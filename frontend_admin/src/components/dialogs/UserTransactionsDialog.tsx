"use client";

import { useState, useEffect } from "react";
import { User, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Calendar, AlertCircle, Car } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";

interface UserTransactionsDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserTransactionsDialog({ user, isOpen, onClose }: UserTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's transactions when dialog opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUserTransactions();
    }
  }, [isOpen, user?.id]);

  const fetchUserTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      
      // If using local auth token, show empty data
      if (token?.startsWith("local-admin-token-")) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.admin.transactions}?user_id=${user?.id}&limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return colors[status] || "secondary";
  };

  const totalRevenue = transactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b shrink-0">
          <div>
            <CardTitle>User Transactions</CardTitle>
            <CardDescription>
              Toll transactions for {user.name}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactions.length}</div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Spent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{totalRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {transactions.filter((t) => t.status === "completed").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 border rounded-md hover:bg-muted/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold font-mono">
                            {transaction.vehicle?.vehicle_number || "Unknown"}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {transaction.vehicle?.vehicle_type || ""}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{transaction.toll_location || "Toll Zone"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(transaction.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-orange-600 mb-2">
                        ₹{transaction.amount}
                      </p>
                      <Badge variant={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="border-t flex gap-2 justify-end p-4 shrink-0 bg-background">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
