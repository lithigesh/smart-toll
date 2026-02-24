"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, MoreHorizontal, Car, Calendar } from "lucide-react";
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

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isOwnerDetailsOpen, setIsOwnerDetailsOpen] = useState(false);

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

      const response = await fetch(API_ENDPOINTS.admin.vehicles + "?limit=1000", {
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
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleViewOwner = (vehicle: Vehicle) => {
    if (vehicle.user) {
      setSelectedUser(vehicle.user);
      setIsOwnerDetailsOpen(true);
    }
  };

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicle_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.device_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                {vehicles.length} total vehicles registered
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vehicles..."
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
          ) : filteredVehicles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchQuery ? "No vehicles found matching your search" : "No vehicles found"}
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
                            <DropdownMenuItem onClick={() => handleViewOwner(vehicle)}>
                              View Owner
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Deactivate
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
    </div>
  );
}
