"use client";

import { useState } from "react";
import { Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, AlertCircle, X, Edit2 } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";
import { PasswordVerificationDialog } from "./PasswordVerificationDialog";

interface VehicleDetailsDialogProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedVehicle: Vehicle, password: string) => Promise<void>;
  onStatusChange?: (vehicleId: string, isActive: boolean, password: string) => Promise<void>;
}

export function VehicleDetailsDialog({
  vehicle,
  isOpen,
  onClose,
  onSave,
  onStatusChange,
}: VehicleDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedVehicle, setEditedVehicle] = useState<Vehicle | null>(vehicle);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPasswordVerificationOpen, setIsPasswordVerificationOpen] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "save" | "activate" | "deactivate";
    data?: any;
  } | null>(null);

  const displayVehicle = isEditing ? editedVehicle : vehicle;

  if (!isOpen || !vehicle) return null;

  const handleEdit = () => {
    setEditedVehicle(vehicle);
    setIsEditing(true);
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b flex-shrink-0">
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
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
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

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </CardContent>

        <div className="border-t flex gap-2 justify-end p-4 flex-shrink-0 bg-background">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {vehicle.is_active ? (
                <Button
                  variant="destructive"
                  onClick={handleActivateClick}
                  disabled={isSaving}
                >
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
              <Button onClick={handleEdit} disabled={isSaving}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
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
                  !editedVehicle?.device_id
                }
                title={
                  !editedVehicle?.vehicle_number ||
                  !editedVehicle?.vehicle_type ||
                  !editedVehicle?.device_id
                    ? "All fields are required"
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
