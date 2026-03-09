"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MoreHorizontal, Car, Calendar, SlidersHorizontal, X } from "lucide-react";
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
import { Vehicle } from "@/types";
import { UserDetailsDialog } from "@/components/dialogs/UserDetailsDialog";
import { VehicleDetailsDialog } from "@/components/dialogs/VehicleDetailsDialog";

export default function VehiclesPage() {
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isOwnerDetailsOpen, setIsOwnerDetailsOpen] = useState(false);
  const [isVehicleDetailsOpen, setIsVehicleDetailsOpen] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      
      // If using local auth token, show empty data with warning
      if (token?.startsWith("local-admin-token-")) {
        setVehicles([]);
        setError("Using local auth - connect to backend for real data");
        setLoading(false);
        return;
      }

      // Get vehicleId from query params if present
      const vehicleId = searchParams.get('vehicleId');
      const apiUrl = vehicleId 
        ? `${API_ENDPOINTS.admin.vehicles}?vehicle_id=${vehicleId}&limit=1`
        : `${API_ENDPOINTS.admin.vehicles}?limit=1000`;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch vehicles");
      }

      const data = await response.json();
      setVehicles(data.vehicles || data.data || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Check if a vehicle should be auto-opened
  useEffect(() => {
    if (!loading && vehicles.length > 0) {
      const vehicleId = searchParams.get('vehicleId');
      
      if (vehicleId) {
        // Find the vehicle in the loaded list
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (vehicle) {
          setSelectedVehicle(vehicle);
          setIsVehicleDetailsOpen(true);
        }
      }
    }
  }, [loading, vehicles, searchParams]);

  const handleViewOwner = (vehicle: Vehicle) => {
    if (vehicle.user) {
      setSelectedUser(vehicle.user);
      setIsOwnerDetailsOpen(true);
    }
  };

  const handleViewVehicleDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsVehicleDetailsOpen(true);
  };

  const handleSaveVehicle = async (updatedVehicle: Vehicle, adminPassword: string) => {
    try {
      const token = localStorage.getItem("adminToken");

      if (!updatedVehicle.vehicle_number || !updatedVehicle.vehicle_type || !updatedVehicle.device_id) {
        throw new Error("All fields are required");
      }

      if (token?.startsWith("local-admin-token-")) {
        throw new Error("Cannot update vehicle while using local auth - connect to backend");
      }

      const response = await fetch(`${API_ENDPOINTS.admin.vehicles}/${updatedVehicle.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicle_number: updatedVehicle.vehicle_number,
          vehicle_type: updatedVehicle.vehicle_type,
          device_id: updatedVehicle.device_id,
          adminPassword: adminPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update vehicle");
      }

      // Update local state
      setVehicles(vehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
      setIsVehicleDetailsOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update vehicle";
      throw new Error(errorMessage);
    }
  };

  const handleVehicleStatusChange = async (vehicleId: string, isActive: boolean, adminPassword: string) => {
    try {
      const token = localStorage.getItem("adminToken");

      if (token?.startsWith("local-admin-token-")) {
        throw new Error("Cannot update vehicle status while using local auth - connect to backend");
      }

      const response = await fetch(`${API_ENDPOINTS.admin.vehicles}/${vehicleId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: isActive,
          adminPassword: adminPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update vehicle status");
      }

      const data = await response.json();
      setVehicles(
        vehicles.map(v =>
          v.id === vehicleId ? { ...v, is_active: isActive } : v
        )
      );

      // Update selected vehicle if it's the one being modified
      if (selectedVehicle?.id === vehicleId) {
        setSelectedVehicle({ ...selectedVehicle, is_active: isActive });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to change vehicle status";
      throw new Error(errorMessage);
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((vehicle) => {
        const matchSearch =
          !searchQuery ||
          vehicle.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vehicle.vehicle_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          vehicle.device_id?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchType = typeFilter === "all" || vehicle.vehicle_type?.toLowerCase() === typeFilter;
        const matchStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && vehicle.is_active) ||
          (statusFilter === "inactive" && !vehicle.is_active);
        return matchSearch && matchType && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === "number-az") return (a.vehicle_number || "").localeCompare(b.vehicle_number || "");
        return 0;
      });
  }, [vehicles, searchQuery, typeFilter, statusFilter, sortBy]);

  const getVehicleTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      car: "bg-blue-100 text-blue-700",
      bike: "bg-green-100 text-green-700",
      bus: "bg-purple-100 text-purple-700",
      truck: "bg-orange-100 text-orange-700",
    };
    return colors[type?.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

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
        <h2 className="text-2xl font-bold tracking-tight">Vehicles</h2>
        <p className="text-muted-foreground">
          Manage all registered vehicles in the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Vehicles</CardTitle>
              <CardDescription>
                {filteredVehicles.length} of {vehicles.length} vehicles registered
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by number, type, device..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All types</option>
              <option value="car">Car</option>
              <option value="bike">Bike</option>
              <option value="bus">Bus</option>
              <option value="truck">Truck</option>
              <option value="auto">Auto</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="number-az">Number A→Z</option>
            </select>
            {(typeFilter !== "all" || statusFilter !== "all" || sortBy !== "newest") && (
              <button
                onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setSortBy("newest"); }}
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
          ) : filteredVehicles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {(searchQuery || typeFilter !== "all" || statusFilter !== "all") ? "No vehicles match the active filters" : "No vehicles found"}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                            <Car className="h-4 w-4" />
                          </div>
                          <span className="font-medium font-mono">
                            {vehicle.vehicle_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getVehicleTypeColor(vehicle.vehicle_type)}>
                          {vehicle.vehicle_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vehicle.device_id ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {vehicle.device_id}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={vehicle.is_active ? "default" : "secondary"}>
                          {vehicle.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(vehicle.created_at).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => handleViewVehicleDetails(vehicle)}>
                              View & Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewOwner(vehicle)}>
                              View Owner
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
        isOpen={isOwnerDetailsOpen}
        onClose={() => setIsOwnerDetailsOpen(false)}
      />

      <VehicleDetailsDialog
        vehicle={selectedVehicle}
        isOpen={isVehicleDetailsOpen}
        onClose={() => setIsVehicleDetailsOpen(false)}
        onSave={handleSaveVehicle}
        onStatusChange={handleVehicleStatusChange}
      />
    </div>
  );
}
