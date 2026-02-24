"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Calendar, MapPin, Car, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_ENDPOINTS } from "@/config/api";
import { Transaction, User } from "@/types";
import { TransactionDetailsDialog } from "@/components/dialogs/TransactionDetailsDialog";
import { UserDetailsDialog } from "@/components/dialogs/UserDetailsDialog";
import { UserTransactionsDialog } from "@/components/dialogs/UserTransactionsDialog";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [analytics, setAnalytics] = useState({ totalTransactions: 0, totalRevenue: 0 });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isOwnerDetailsOpen, setIsOwnerDetailsOpen] = useState(false);
  const [isOwnerTransactionsOpen, setIsOwnerTransactionsOpen] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      
      // If using local auth token, show empty data with warning
      if (token?.startsWith("local-admin-token-")) {
        setTransactions([]);
        setError("Using local auth - connect to backend for real data");
        setLoading(false);
        return;
      }

      // Fetch analytics for total counts
      const analyticsResponse = await fetch(API_ENDPOINTS.admin.analytics, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics({
          totalTransactions: analyticsData.transactions || 0,
          totalRevenue: analyticsData.revenue || 0,
        });
      }

      const response = await fetch(API_ENDPOINTS.admin.transactions + "?limit=1000", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data.transactions || data.data || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.toll_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.vehicle?.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.id?.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return colors[status] || "secondary";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Total revenue and completed count from analytics (database totals)
  const totalRevenue = analytics.totalRevenue;
  const completedCount = analytics.totalTransactions; // Approximation - ideally we'd have completed count from analytics
  
  // For now, calculate from current page data for more accurate display
  const pageCompletedCount = transactions.filter((t) => t.status === "completed").length;
  const pageTotalRevenue = transactions
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);

  const isLocalAuth = error?.includes("local auth");

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsTransactionDetailsOpen(true);
  };

  const handleViewOwner = (transaction: Transaction) => {
    if (transaction.user) {
      setSelectedUser(transaction.user);
      setIsOwnerDetailsOpen(true);
    }
  };

  const handleViewOwnerTransactions = (transaction: Transaction) => {
    if (transaction.user) {
      setSelectedUser(transaction.user);
      setIsOwnerTransactionsOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className={`rounded-md p-4 ${isLocalAuth ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200" : "bg-destructive/10 text-destructive"}`}>
          {error}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Toll Transactions</h2>
        <p className="text-muted-foreground">
          View all toll deductions from vehicles
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All transactions in system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total toll collected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Toll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{analytics.totalTransactions > 0 ? Math.round(totalRevenue / analytics.totalTransactions) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Toll Transactions</CardTitle>
              <CardDescription>
                {filteredTransactions.length} transactions
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by vehicle, location..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions found
            </p>
          ) : (
            <div className="rounded-md border overflow-y-auto max-h-96">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-orange-100 text-orange-600">
                            <Car className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium font-mono">
                              {transaction.vehicle?.vehicle_number || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.vehicle?.vehicle_type || ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {transaction.toll_location || transaction.description || "Toll Zone"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-orange-600">
                          ₹{transaction.amount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(transaction.created_at).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(transaction)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewOwner(transaction)}>
                              View Owner
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewOwnerTransactions(transaction)}>
                              View Owner's Transactions
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDetailsDialog
        transaction={selectedTransaction}
        isOpen={isTransactionDetailsOpen}
        onClose={() => setIsTransactionDetailsOpen(false)}
      />

      <UserDetailsDialog
        user={selectedUser}
        isOpen={isOwnerDetailsOpen}
        onClose={() => setIsOwnerDetailsOpen(false)}
      />

      <UserTransactionsDialog
        user={selectedUser}
        isOpen={isOwnerTransactionsOpen}
        onClose={() => setIsOwnerTransactionsOpen(false)}
      />
    </div>
  );
}
