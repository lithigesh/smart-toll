"use client";

import { useState, useEffect } from "react";
import { User, Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Calendar, X, Car, AlertCircle } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";

interface UserDetailsDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedUser: User) => Promise<void>;
}

export function UserDetailsDialog({ user, isOpen, onClose, onSave }: UserDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedUser, setEditedUser] = useState<User | null>(user);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update editedUser when user prop changes
  const displayUser = isEditing ? editedUser : user;

  // Fetch user's vehicles when dialog opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUserVehicles();
    }
  }, [isOpen, user?.id]);

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

  if (!isOpen || !user) return null;

  const handleEdit = () => {
    setEditedUser(user);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser(null);
  };

  const handleSave = async () => {
    if (editedUser && onSave) {
      setIsSaving(true);
      setSaveError(null);
      try {
        await onSave(editedUser);
        setIsEditing(false);
        setEditedUser(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save user';
        setSaveError(errorMessage);
        console.error('Failed to save user:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleInputChange = (field: keyof User, value: string) => {
    if (editedUser) {
      setEditedUser({ ...editedUser, [field]: value });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 sticky top-0 bg-background z-10">
          <div>
            <CardTitle>User Details</CardTitle>
            <CardDescription>View and manage user information</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 flex-1">
          {/* Error Message */}
          {saveError && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {saveError}
            </div>
          )}

          {/* User Avatar & Basic Info */}
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
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
          </div>

          {/* Vehicles Section */}
          <div className="border-t pt-6">
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
                    className="p-3 border rounded-md hover:bg-muted/50 transition"
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
                      <Badge variant={vehicle.is_active ? "default" : "secondary"}>
                        {vehicle.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t sticky bottom-0 bg-background">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={handleEdit}>
                  Edit Details
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !editedUser?.name || !editedUser?.email}
                  title={!editedUser?.name || !editedUser?.email ? "Name and email are required" : ""}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
