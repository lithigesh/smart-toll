"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, MoreHorizontal, Mail, Phone, Calendar, SlidersHorizontal, X, Wallet } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_ENDPOINTS } from "@/config/api";
import { User } from "@/types";
import { UserDetailsDialog } from "@/components/dialogs/UserDetailsDialog";
import { UserTransactionsDialog } from "@/components/dialogs/UserTransactionsDialog";

type UserWithWalletResponse = {
  user?: {
    wallet_balance?: number | string | null;
    wallets?: Array<{
      balance?: number | string | null;
    }> | {
      balance?: number | string | null;
    };
  };
};

const normalizeWalletBalance = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [phoneFilter, setPhoneFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isTransactionsDialogOpen, setIsTransactionsDialogOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      
      // If using local auth token, show empty data with warning
      if (token?.startsWith("local-admin-token-")) {
        setUsers([]);
        setError("Using local auth - connect to backend for real data");
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.admin.users, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      const baseUsers = data.users || data.data || data || [];

      const usersWithWallets = await Promise.all(
        baseUsers.map(async (user: User) => {
          const listWalletBalance = normalizeWalletBalance(user.wallet_balance);

          if (listWalletBalance != null) {
            return {
              ...user,
              wallet_balance: listWalletBalance,
            };
          }

          try {
            const detailsResponse = await fetch(API_ENDPOINTS.admin.userDetails(user.id), {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!detailsResponse.ok) {
              return user;
            }

            const detailsData: UserWithWalletResponse = await detailsResponse.json();

            const rawWallets = detailsData.user?.wallets;
            const detailsWalletBalance = Array.isArray(rawWallets)
              ? rawWallets[0]?.balance
              : rawWallets?.balance;
            const walletBalance = normalizeWalletBalance(
              detailsData.user?.wallet_balance ?? detailsWalletBalance
            );

            return {
              ...user,
              wallet_balance: walletBalance,
            };
          } catch {
            return user;
          }
        })
      );

      setUsers(usersWithWallets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const now = new Date();
    return users
      .filter((user) => {
        const matchSearch =
          !searchQuery ||
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone?.includes(searchQuery);
        const matchPhone =
          phoneFilter === "all" ||
          (phoneFilter === "with" && !!user.phone) ||
          (phoneFilter === "without" && !user.phone);
        let matchDate = true;
        if (dateFilter !== "all") {
          const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
          const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          matchDate = new Date(user.created_at) >= cutoff;
        }
        return matchSearch && matchPhone && matchDate;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === "name-az") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "name-za") return (b.name || "").localeCompare(a.name || "");
        return 0;
      });
  }, [users, searchQuery, dateFilter, phoneFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isLocalAuth = error?.includes("local auth");

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsDialogOpen(true);
  };

  const handleViewTransactions = (user: User) => {
    setSelectedUser(user);
    setIsTransactionsDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return false;
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(API_ENDPOINTS.admin.deleteUser(user.id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete user");
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
      throw err;
    }
  };

  const handleDeleteUserFromDetails = async (user: User) => {
    const deleted = await handleDeleteUser(user);
    if (deleted) {
      setIsDetailsDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleSaveUser = async (updatedUser: User, adminPassword: string) => {
    try {
      const token = localStorage.getItem("adminToken");
      
      // Validate required fields
      if (!updatedUser.name || !updatedUser.email) {
        setError("Name and email are required");
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updatedUser.email)) {
        setError("Please enter a valid email address");
        return;
      }
      
      // If using local auth token, show error
      if (token?.startsWith("local-admin-token-")) {
        setError("Cannot update user while using local auth - connect to backend");
        return;
      }

      const response = await fetch(API_ENDPOINTS.admin.updateUser(updatedUser.id), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          adminPassword: adminPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      // Update local state with the updated user
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      setIsDetailsDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      setError(errorMessage);
      console.error('Error updating user:', error);
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
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">
          Manage all registered users in the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {filteredUsers.length} of {users.length} users
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger size="sm" className="w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={phoneFilter} onValueChange={setPhoneFilter}>
              <SelectTrigger size="sm" className="w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any phone</SelectItem>
                <SelectItem value="with">Has phone</SelectItem>
                <SelectItem value="without">No phone</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger size="sm" className="w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name-az">Name A→Z</SelectItem>
                <SelectItem value="name-za">Name Z→A</SelectItem>
              </SelectContent>
            </Select>
            {(dateFilter !== "all" || phoneFilter !== "all" || sortBy !== "newest") && (
              <button
                onClick={() => { setDateFilter("all"); setPhoneFilter("all"); setSortBy("newest"); }}
                className="flex items-center gap-1 h-8 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {(searchQuery || phoneFilter !== "all" || dateFilter !== "all") ? "No users match the active filters" : "No users found"}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(user)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <span className="font-medium">{user.name || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        ) : (
                          <Badge variant="secondary">Not provided</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wallet className="h-3 w-3 text-muted-foreground" />
                          {user.wallet_balance != null
                            ? <span>₹{Number(user.wallet_balance).toFixed(2)}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewTransactions(user)}>
                              View Transactions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteUser(user)}
                            >
                              Delete User
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

      <UserDetailsDialog
        user={selectedUser}
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        onSave={handleSaveUser}
        onDelete={handleDeleteUserFromDetails}
      />

      <UserTransactionsDialog
        user={selectedUser}
        isOpen={isTransactionsDialogOpen}
        onClose={() => setIsTransactionsDialogOpen(false)}
      />
    </div>
  );
}

