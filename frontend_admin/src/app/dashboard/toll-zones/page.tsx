"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit, MapPin, Plus, Save, Search, Trash2, X } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";
import { TollZone } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TollZoneForm = {
  name: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
};

const emptyForm: TollZoneForm = {
  name: "",
  latitude: "",
  longitude: "",
  is_active: true,
};

export default function TollZonesPage() {
  const [zones, setZones] = useState<TollZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createForm, setCreateForm] = useState<TollZoneForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<TollZoneForm>(emptyForm);

  const fetchZones = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");

      if (token?.startsWith("local-admin-token-")) {
        setZones([]);
        setError("Using local auth - connect to backend for real toll zone data");
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.admin.tollZones, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => ({}));
        throw new Error(responseBody.message || "Failed to fetch toll zones");
      }

      const data = await response.json();
      setZones(data.data || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load toll zones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const filteredZones = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return zones;

    return zones.filter((zone) =>
      zone.name.toLowerCase().includes(query) ||
      zone.latitude.toString().includes(query) ||
      zone.longitude.toString().includes(query)
    );
  }, [zones, searchQuery]);

  const updateCreateForm = (field: keyof TollZoneForm, value: string | boolean) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const updateEditForm = (field: keyof TollZoneForm, value: string | boolean) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const submitCreate = async () => {
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(API_ENDPOINTS.admin.tollZones, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createForm.name,
          latitude: Number(createForm.latitude),
          longitude: Number(createForm.longitude),
          is_active: createForm.is_active,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to create toll zone");
      }

      setCreateForm(emptyForm);
      await fetchZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create toll zone");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (zone: TollZone) => {
    setEditingId(zone.id);
    setEditForm({
      name: zone.name,
      latitude: String(zone.latitude),
      longitude: String(zone.longitude),
      is_active: zone.is_active,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const submitEdit = async (zoneId: string | number) => {
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(API_ENDPOINTS.admin.updateTollZone(zoneId), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          latitude: Number(editForm.latitude),
          longitude: Number(editForm.longitude),
          is_active: editForm.is_active,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update toll zone");
      }

      setEditingId(null);
      setEditForm(emptyForm);
      await fetchZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update toll zone");
    } finally {
      setSaving(false);
    }
  };

  const deleteZone = async (zone: TollZone) => {
    if (!window.confirm(`Delete toll zone "${zone.name}"?`)) return;

    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(API_ENDPOINTS.admin.deleteTollZone(zone.id), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete toll zone");
      }

      if (editingId === zone.id) {
        cancelEditing();
      }

      await fetchZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete toll zone");
    } finally {
      setSaving(false);
    }
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
        <h2 className="text-2xl font-bold tracking-tight">Toll Zones</h2>
        <p className="text-muted-foreground">Manage toll gate names and coordinates used for transaction tagging.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Toll Zone</CardTitle>
          <CardDescription>Create a toll gate entry with its exact coordinates.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2 xl:col-span-2">
            <Label htmlFor="zone-name">Zone Name</Label>
            <Input
              id="zone-name"
              value={createForm.name}
              onChange={(event) => updateCreateForm("name", event.target.value)}
              placeholder="Amrita AB2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone-latitude">Latitude</Label>
            <Input
              id="zone-latitude"
              type="number"
              step="0.000001"
              value={createForm.latitude}
              onChange={(event) => updateCreateForm("latitude", event.target.value)}
              placeholder="10.903697"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone-longitude">Longitude</Label>
            <Input
              id="zone-longitude"
              type="number"
              step="0.000001"
              value={createForm.longitude}
              onChange={(event) => updateCreateForm("longitude", event.target.value)}
              placeholder="76.899331"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone-status">Status</Label>
            <Select
              value={createForm.is_active ? "active" : "inactive"}
              onValueChange={(value) => updateCreateForm("is_active", value === "active")}
            >
              <SelectTrigger id="zone-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 xl:col-span-5 flex justify-end">
            <Button onClick={submitCreate} disabled={saving} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Toll Zone
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Configured Toll Zones</CardTitle>
              <CardDescription>{filteredZones.length} zone{filteredZones.length === 1 ? "" : "s"} available</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or coordinate"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredZones.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No toll zones found.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredZones.map((zone) => {
                    const isEditing = editingId === zone.id;

                    return (
                      <TableRow key={zone.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editForm.name}
                              onChange={(event) => updateEditForm("name", event.target.value)}
                            />
                          ) : (
                            <div className="flex items-center gap-2 font-medium">
                              <MapPin className="h-4 w-4 text-orange-500" />
                              {zone.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="grid gap-2 md:grid-cols-2">
                              <Input
                                type="number"
                                step="0.000001"
                                value={editForm.latitude}
                                onChange={(event) => updateEditForm("latitude", event.target.value)}
                              />
                              <Input
                                type="number"
                                step="0.000001"
                                value={editForm.longitude}
                                onChange={(event) => updateEditForm("longitude", event.target.value)}
                              />
                            </div>
                          ) : (
                            <div className="space-y-1 text-sm">
                              <p>Lat: {Number(zone.latitude).toFixed(6)}</p>
                              <p>Lon: {Number(zone.longitude).toFixed(6)}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={editForm.is_active ? "active" : "inactive"}
                              onValueChange={(value) => updateEditForm("is_active", value === "active")}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={zone.is_active ? "default" : "secondary"}>
                              {zone.is_active ? "Active" : "Inactive"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {zone.updated_at ? new Date(zone.updated_at).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="ghost" onClick={() => submitEdit(zone.id)} disabled={saving}>
                                <Save className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={cancelEditing} disabled={saving}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="ghost" onClick={() => startEditing(zone)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteZone(zone)} disabled={saving}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}