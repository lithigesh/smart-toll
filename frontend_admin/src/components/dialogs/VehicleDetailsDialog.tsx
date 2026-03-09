"use client";

import { useEffect, useState } from "react";
import { Vehicle, Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, AlertCircle, X, Edit2, PowerOff, Trash2, ArrowRightLeft, Calendar, MapPin } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";
import { PasswordVerificationDialog } from "./PasswordVerificationDialog";
import { cn } from "@/lib/utils";

interface VehicleDetailsDialogProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedVehicle: Vehicle, password: string) => Promise<void>;
  onStatusChange?: (vehicleId: string, isActive: boolean, password: string) => Promise<void>;
  onDelete?: (vehicle: Vehicle) => Promise<void>;
}

export function VehicleDetailsDialog({
  vehicle,
  isOpen,
  onClose,
  onSave,
  onStatusChange,
  onDelete,
}: VehicleDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedVehicle, setEditedVehicle] = useState<Vehicle | null>(vehicle);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPasswordVerificationOpen, setIsPasswordVerificationOpen] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "transactions">("details");
  const [pendingAction, setPendingAction] = useState<{
    type: "save" | "activate" | "deactivate";
    data?: any;
  } | null>(null);

  const displayVehicle = isEditing ? editedVehicle : vehicle;

  useEffect(() => {
    setEditedVehicle(vehicle);
    setActiveTab("details");
  }, [vehicle]);

  useEffect(() => {
    if (isOpen && vehicle?.id) {
      fetchVehicleTransactions();
    }
  }, [isOpen, vehicle?.id]);

  if (!isOpen || !vehicle) return null;

  const handleEdit = () => {
    setEditedVehicle(vehicle);
    setIsEditing(true);
    setActiveTab("details");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedVehicle(null);
    setSaveError(null);
  };

  const handleSaveClick = async () => {
    setVerificationError(null);
    setPendingAction({ type: "save" });
    setIsPasswordVerificationOpen(true);
  };

  const handleActivateClick = async () => {
    setVerificationError(null);
    setPendingAction({ type: vehicle.is_active ? "deactivate" : "activate" });
    setIsPasswordVerificationOpen(true);
  };

  const handlePasswordVerify = async (password: string) => {
    setIsVerifying(true);
    setVerificationError(null);
    try {
      if (pendingAction?.type === "save" && editedVehicle && onSave) {
        await onSave(editedVehicle, password);
        setIsEditing(false);
        setEditedVehicle(null);
        setIsPasswordVerificationOpen(false);
        setSaveError(null);
      } else if (
        (pendingAction?.type === "activate" || pendingAction?.type === "deactivate") &&
        onStatusChange
      ) {
        const newStatus = pendingAction.type === "activate";
        await onStatusChange(vehicle.id, newStatus, password);
        setIsPasswordVerificationOpen(false);
        setVerificationError(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Operation failed";
      if (pendingAction?.type === "save") {
        setSaveError(errorMessage);
      } else {
        setVerificationError(errorMessage);
      }
      console.error("Error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInputChange = (field: keyof Vehicle, value: string) => {
    if (editedVehicle) {
      setEditedVehicle({ ...editedVehicle, [field]: value });
    }
  };

  const fetchVehicleTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const token = localStorage.getItem("adminToken");

      if (token?.startsWith("local-admin-token-")) {
        setTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.admin.transactions}?vehicle_id=${vehicle?.id}&limit=6`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch vehicle transactions:", error);
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

  const tabButtonClass = (tab: "details" | "transactions") =>
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
            <CardTitle>Vehicle Details</CardTitle>
            <CardDescription>View and manage vehicle information</CardDescription>
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

          {/* Vehicle Info Header */}
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              <Car className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {displayVehicle?.vehicle_number || "N/A"}
              </h3>
              <Badge variant={displayVehicle?.is_active ? "default" : "secondary"} className="mt-1">
                {displayVehicle?.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-2xl border bg-muted/30 p-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="ghost"
              className={tabButtonClass("details")}
              onClick={() => setActiveTab("details")}
            >
              <div className="flex flex-col items-start">
                <span className="flex items-center gap-2 font-medium">
                  <Car className="h-4 w-4" />
                  Vehicle Details
                </span>
                <span className="text-xs text-muted-foreground">
                  Registration, owner and device info
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

          {activeTab === "details" ? (
          <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-background/70 p-4 md:grid-cols-2">
            {/* Vehicle Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle Number</label>
              {isEditing ? (
                <Input
                  value={editedVehicle?.vehicle_number || ""}
                  onChange={(e) => handleInputChange("vehicle_number", e.target.value)}
                  placeholder="Enter vehicle number"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm font-mono">
                  {displayVehicle?.vehicle_number || "-"}
                </div>
              )}
            </div>

            {/* Vehicle Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle Type</label>
              {isEditing ? (
                <select
                  value={editedVehicle?.vehicle_type || ""}
                  onChange={(e) => handleInputChange("vehicle_type", e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select vehicle type</option>
                  <option value="car">Car</option>
                  <option value="bike">Bike</option>
                  <option value="bus">Bus</option>
                  <option value="truck">Truck</option>
                </select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {displayVehicle?.vehicle_type || "-"}
                </div>
              )}
            </div>

            {/* Device ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Device ID (MAC Address)</label>
              {isEditing ? (
                <Input
                  value={editedVehicle?.device_id || ""}
                  onChange={(e) => handleInputChange("device_id", e.target.value)}
                  placeholder="Enter device ID or MAC address"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm font-mono">
                  {displayVehicle?.device_id || "-"}
                </div>
              )}
            </div>

            {/* Owner Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner</label>
              <div className="p-2 bg-muted rounded text-sm">
                {displayVehicle?.user?.name || "-"}
              </div>
            </div>

            {/* Owner Email */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Owner Email</label>
              <div className="p-2 bg-muted rounded text-sm">
                {displayVehicle?.user?.email || "-"}
              </div>
            </div>

            {/* Registration Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Registered</label>
              <div className="p-2 bg-muted rounded text-sm">
                {displayVehicle?.created_at
                  ? new Date(displayVehicle.created_at).toLocaleDateString()
                  : "-"}
              </div>
            </div>
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
                  <p className="text-sm text-muted-foreground">No recent transactions for this vehicle</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="rounded-xl border bg-card p-4 transition hover:bg-muted/40">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Car className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getStatusColor(transaction.status)}>
                                {transaction.status}
                              </Badge>
                              {transaction.type ? (
                                <Badge variant="outline" className="capitalize">
                                  {transaction.type.replace(/_/g, " ")}
                                </Badge>
                              ) : null}
                              {transaction.payment_method ? (
                                <Badge variant="outline" className="capitalize">
                                  {transaction.payment_method}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{transaction.toll_location || "Toll Zone"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(transaction.created_at).toLocaleString()}</span>
                              </div>
                              {transaction.distance_km ? (
                                <div className="text-xs">Distance: {transaction.distance_km} km</div>
                              ) : null}
                            </div>
                            {transaction.description ? (
                              <p className="text-sm text-foreground/80">{transaction.description}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-lg bg-orange-50 px-3 py-2 text-right sm:min-w-30">
                          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Amount</p>
                          <p className="text-lg font-bold text-orange-600">₹{transaction.amount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <div className="border-t flex gap-2 justify-end p-4 shrink-0 bg-background">
          {!isEditing ? (
            <>
              <Button onClick={handleEdit} disabled={isSaving}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {vehicle.is_active ? (
                <Button
                  variant="destructive"
                  onClick={handleActivateClick}
                  disabled={isSaving}
                  className="shadow-sm hover:shadow-md"
                >
                  <PowerOff className="h-4 w-4" />
                  Deactivate Vehicle
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handleActivateClick}
                  disabled={isSaving}
                >
                  Activate Vehicle
                </Button>
              )}
              {onDelete ? (
                <Button
                  variant="destructive"
                  onClick={() => onDelete(vehicle)}
                  disabled={isSaving}
                  className="shadow-sm hover:shadow-md"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Vehicle
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
                  !editedVehicle?.vehicle_number ||
                  !editedVehicle?.vehicle_type ||
                  !editedVehicle?.device_id ||
                  (editedVehicle?.vehicle_number === vehicle?.vehicle_number &&
                   editedVehicle?.vehicle_type === vehicle?.vehicle_type &&
                   editedVehicle?.device_id === vehicle?.device_id)
                }
                title={
                  !editedVehicle?.vehicle_number ||
                  !editedVehicle?.vehicle_type ||
                  !editedVehicle?.device_id
                    ? "All fields are required"
                    : editedVehicle?.vehicle_number === vehicle?.vehicle_number &&
                      editedVehicle?.vehicle_type === vehicle?.vehicle_type &&
                      editedVehicle?.device_id === vehicle?.device_id
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
          setPendingAction(null);
        }}
        onVerify={handlePasswordVerify}
        isLoading={isVerifying}
        error={verificationError}
      />
    </div>
  );
}
