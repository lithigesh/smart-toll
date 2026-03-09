"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Vehicle, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Calendar, X, Car, AlertCircle, ExternalLink, Wallet, Edit2, Trash2, MapPin, ArrowRightLeft } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";
import { PasswordVerificationDialog } from "./PasswordVerificationDialog";
import { cn } from "@/lib/utils";

interface UserDetailsDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedUser: User, password: string) => Promise<void>;
  onDelete?: (user: User) => Promise<void>;
}

export function UserDetailsDialog({ user, isOpen, onClose, onSave, onDelete }: UserDetailsDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detailedUser, setDetailedUser] = useState<User | null>(user);
  const [editedUser, setEditedUser] = useState<User | null>(user);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPasswordVerificationOpen, setIsPasswordVerificationOpen] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<"vehicles" | "transactions">("vehicles");

  // Update editedUser when user prop changes
  const displayUser = isEditing ? editedUser : detailedUser;

  // Sync editedUser with the user prop when it changes
  useEffect(() => {
    setDetailedUser(user);
    setEditedUser(user);
    setActiveTab("vehicles");
  }, [user]);

  // Fetch user's latest details and vehicles when dialog opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUserDetails();
      fetchUserVehicles();
      fetchUserTransactions();
    }
  }, [isOpen, user?.id]);

  const fetchUserDetails = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      if (token?.startsWith("local-admin-token-")) {
        setDetailedUser(user);
        return;
      }

      const response = await fetch(API_ENDPOINTS.admin.userDetails(user!.id), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setDetailedUser(user);
        return;
      }

      const data = await response.json();
      const detailed = data.user || user;
      const rawWallets = detailed.wallets;
      const walletBalance = detailed.wallet_balance ?? (Array.isArray(rawWallets)
        ? rawWallets[0]?.balance
        : rawWallets?.balance);

      setDetailedUser({
        ...user,
        ...detailed,
        wallet_balance: walletBalance != null ? Number(walletBalance) : null,
      });
    } catch {
      setDetailedUser(user);
    }
  };

  const fetchUserVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const token = localStorage.getItem("adminToken");
      
      // If using local auth token, show empty data
      if (token?.startsWith("local-admin-token-")) {
        setVehicles([]);
        setLoadingVehicles(false);
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.admin.vehicles}?user_id=${user?.id}&limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchUserTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const token = localStorage.getItem("adminToken");

      if (token?.startsWith("local-admin-token-")) {
        setTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.admin.transactions}?user_id=${user?.id}&limit=6`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch user transactions:", error);
    } finally {
      setLoadingTransactions(false);
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

  if (!isOpen || !user) return null;

  const handleVehicleClick = (vehicle: Vehicle) => {
    // Navigate to vehicles page with vehicle ID filter parameter
    onClose();
    router.push(`/dashboard/vehicles?vehicleId=${vehicle.id}`);
  };

  const handleEdit = () => {
    setEditedUser(user);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser(null);
  };

  const handleSaveClick = async () => {
    // Show password verification dialog instead of saving directly
    setVerificationError(null);
    setIsPasswordVerificationOpen(true);
  };

  const handlePasswordVerify = async (password: string) => {
    if (editedUser && onSave) {
      setIsVerifying(true);
      setVerificationError(null);
      try {
        await onSave(editedUser, password);
        setIsEditing(false);
        setEditedUser(null);
        setIsPasswordVerificationOpen(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save user';
        setVerificationError(errorMessage);
        console.error('Failed to save user:', error);
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleInputChange = (field: keyof User, value: string) => {
    if (editedUser) {
      setEditedUser({ ...editedUser, [field]: value });
    }
  };

  const formattedWalletBalance =
    displayUser?.wallet_balance != null ? `₹${Number(displayUser.wallet_balance).toFixed(2)}` : "-";

  const tabButtonClass = (tab: "vehicles" | "transactions") =>
    cn(
      "h-auto min-w-[180px] justify-start rounded-xl border px-4 py-3 text-left transition-all",
      activeTab === tab
        ? "border-primary/30 bg-background text-foreground shadow-sm"
        : "border-transparent bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground"
    );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b shrink-0">
          <div>
            <CardTitle>User Details</CardTitle>
            <CardDescription>View and manage user information</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 overflow-y-auto">
          {/* Error Message */}
          {saveError && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {saveError}
            </div>
          )}

          {/* User Avatar & Basic Info */}
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {displayUser?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{displayUser?.name || "N/A"}</h3>
              <p className="text-sm text-muted-foreground">{displayUser?.email}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              {isEditing ? (
                <Input
                  value={editedUser?.name || ""}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter name"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {displayUser?.name || "-"}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editedUser?.email || ""}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {displayUser?.email || "-"}
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              {isEditing ? (
                <Input
                  value={editedUser?.phone || ""}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {displayUser?.phone || "-"}
                </div>
              )}
            </div>

            {/* Joined Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Joined
              </label>
              <div className="p-2 bg-muted rounded text-sm">
                {displayUser?.created_at ? new Date(displayUser.created_at).toLocaleDateString() : "-"}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet Balance
              </label>
              <div className="p-2 bg-muted rounded text-sm">
                {formattedWalletBalance}
              </div>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="grid grid-cols-1 gap-2 rounded-2xl border bg-muted/30 p-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="ghost"
                className={tabButtonClass("vehicles")}
                onClick={() => setActiveTab("vehicles")}
              >
                <div className="flex flex-col items-start">
                  <span className="flex items-center gap-2 font-medium">
                    <Car className="h-4 w-4" />
                    Registered Vehicles
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
                  </span>
                </div>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={tabButtonClass("transactions")}
                onClick={() => setActiveTab("transactions")}
              >
                <div className="flex flex-col items-start">
                  <span className="flex items-center gap-2 font-medium">
                    <ArrowRightLeft className="h-4 w-4" />
                    Recent Transactions
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
                  </span>
                </div>
              </Button>
            </div>

            {activeTab === "vehicles" ? (
          <div className="space-y-4 rounded-2xl border bg-background/70 p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Car className="h-5 w-5" />
              Registered Vehicles ({vehicles.length || 0})
            </h3>
            
            {loadingVehicles ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : vehicles.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No vehicles registered</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => handleVehicleClick(vehicle)}
                    className="p-3 border rounded-md hover:bg-muted/50 transition cursor-pointer hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                          <Car className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold font-mono">{vehicle.vehicle_number}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.vehicle_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={vehicle.is_active ? "default" : "secondary"}>
                          {vehicle.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : (
            <div className="space-y-4 rounded-2xl border bg-background/70 p-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Recent Transactions ({transactions.length || 0})
              </h3>

              {loadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No recent transactions for this user</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 border rounded-md hover:bg-muted/50 transition">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <Car className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold font-mono truncate">
                                {transaction.vehicle?.vehicle_number || "Unknown Vehicle"}
                              </p>
                              <Badge variant="outline" className="text-xs capitalize">
                                {transaction.vehicle?.vehicle_type || "Vehicle"}
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
                          <p className="text-base font-bold text-orange-600">₹{transaction.amount}</p>
                          <Badge variant={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        </CardContent>

        <div className="border-t flex gap-2 justify-end p-4 shrink-0 bg-background">
          {!isEditing ? (
            <>
              <Button onClick={handleEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {onDelete ? (
                <Button
                  variant="destructive"
                  onClick={() => onDelete(user)}
                  className="shadow-sm hover:shadow-md"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete User
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveClick} 
                disabled={
                  isSaving || 
                  !editedUser?.name || 
                  !editedUser?.email ||
                  (editedUser?.name === user?.name && 
                   editedUser?.email === user?.email && 
                   editedUser?.phone === user?.phone)
                }
                title={
                  !editedUser?.name || !editedUser?.email 
                    ? "Name and email are required" 
                    : editedUser?.name === user?.name && 
                      editedUser?.email === user?.email && 
                      editedUser?.phone === user?.phone
                    ? "No changes made"
                    : ""
                }
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Password Verification Dialog */}
      <PasswordVerificationDialog
        isOpen={isPasswordVerificationOpen}
        onClose={() => {
          setIsPasswordVerificationOpen(false);
          setVerificationError(null);
        }}
        onVerify={handlePasswordVerify}
        isLoading={isVerifying}
        error={verificationError}
      />
    </div>
  );
}
