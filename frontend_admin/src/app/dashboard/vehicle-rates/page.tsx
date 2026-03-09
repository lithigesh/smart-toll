"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Bike, BusFront, CarFront, IndianRupee, Edit, Save, Truck, X, Search, SlidersHorizontal } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ENDPOINTS } from "@/config/api";
import { VehicleTypeRate } from "@/types";

export default function VehicleRatesPage() {
  const [rates, setRates] = useState<VehicleTypeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("type-az");

  const fetchRates = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      
      // If using local auth token, show demo rates
      if (token?.startsWith("local-admin-token-")) {
        setRates([
          { id: "1", vehicle_type: "car", rate: 50, description: "Standard car toll" },
          { id: "2", vehicle_type: "bike", rate: 20, description: "Two-wheeler toll" },
          { id: "3", vehicle_type: "bus", rate: 100, description: "Bus/heavy vehicle toll" },
          { id: "4", vehicle_type: "truck", rate: 120, description: "Truck toll" },
        ]);
        setError("Using local auth - these are demo rates");
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.admin.vehicleRates, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to fetch vehicle rates (${response.status})`
        );
      }

      const data = await response.json();
      console.log('Vehicle rates fetched:', data);
      setRates(data.vehicleTypes || data.data || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicle rates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const startEditing = (rate: VehicleTypeRate) => {
    setEditingId(rate.id);
    setEditValue(rate.rate);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue(0);
  };

  const saveRate = async (id: string) => {
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("adminToken");
      
      // Validate input
      if (editValue <= 0) {
        setError("Rate must be greater than 0");
        setSaving(false);
        return;
      }
      
      // If using local auth token, show error
      if (token?.startsWith("local-admin-token-")) {
        setError("Cannot update rates while using local auth - connect to backend");
        setSaving(false);
        return;
      }

      console.log(`Updating rate ${id} to ${editValue}`);
      
      const response = await fetch(`${API_ENDPOINTS.admin.vehicleRates}/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rate: editValue }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to update rate (${response.status})`
        );
      }

      const data = await response.json();
      console.log('Rate updated successfully:', data);

      // Update local state
      setRates((prev) =>
        prev.map((rate) =>
          rate.id === id ? { ...rate, rate: editValue } : rate
        )
      );
      setEditingId(null);
      setError(""); // Clear any previous errors
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update rate";
      setError(errorMessage);
      console.error('Error updating rate:', err);
    } finally {
      setSaving(false);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "bike":
        return <Bike className="h-4 w-4" />;
      case "bus":
        return <BusFront className="h-4 w-4" />;
      case "truck":
        return <Truck className="h-4 w-4" />;
      case "car":
      default:
        return <CarFront className="h-4 w-4" />;
    }
  };

  const getVehicleColor = (type: string) => {
    const colors: Record<string, string> = {
      car: "bg-blue-100 text-blue-600",
      bike: "bg-green-100 text-green-600",
      bus: "bg-purple-100 text-purple-600",
      truck: "bg-orange-100 text-orange-600",
    };
    return colors[type?.toLowerCase()] || "bg-gray-100 text-gray-600";
  };

  const filteredRates = useMemo(() => {
    return rates
      .filter((r) =>
        !searchQuery ||
        r.vehicle_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "type-az") return a.vehicle_type.localeCompare(b.vehicle_type);
        if (sortBy === "rate-high") return b.rate - a.rate;
        if (sortBy === "rate-low") return a.rate - b.rate;
        return 0;
      });
  }, [rates, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isLocalAuth = error?.includes("local auth") || error?.includes("demo rates");

  return (
    <div className="space-y-6">
      {error && (
        <div className={`rounded-md p-4 ${isLocalAuth ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200" : "bg-destructive/10 text-destructive"}`}>
          {error}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Vehicle Rates</h2>
        <p className="text-muted-foreground">
          Manage toll rates for different vehicle types
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle>Toll Rates</CardTitle>
              <CardDescription>Set the toll amount for each vehicle type</CardDescription>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vehicle type..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger size="sm" className="w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type-az">Type A→Z</SelectItem>
                <SelectItem value="rate-high">Rate high→low</SelectItem>
                <SelectItem value="rate-low">Rate low→high</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || sortBy !== "type-az") && (
              <button
                onClick={() => { setSearchQuery(""); setSortBy("type-az"); }}
                className="flex items-center gap-1 h-8 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-destructive mb-4">
              {error}
            </div>
          ) : null}

          {rates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No vehicle rates configured
            </p>
          ) : filteredRates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No rates match your search
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Toll Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center ${getVehicleColor(
                              rate.vehicle_type
                            )}`}
                          >
                            {getVehicleIcon(rate.vehicle_type)}
                          </div>
                          <span className="font-medium capitalize">
                            {rate.vehicle_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {rate.description || (
                          <span className="text-muted-foreground">
                            Standard {rate.vehicle_type} toll rate
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === rate.id ? (
                          <div className="flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) =>
                                setEditValue(Number(e.target.value))
                              }
                              className="w-24"
                              min={0}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-semibold">
                            <IndianRupee className="h-4 w-4" />
                            {rate.rate}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === rate.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={() => saveRate(rate.id)}
                              disabled={saving}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={cancelEditing}
                              disabled={saving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditing(rate)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
