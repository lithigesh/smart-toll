"use client";

import { useState } from "react";
import { Transaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Car, DollarSign, Clock } from "lucide-react";

interface TransactionDetailsDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailsDialog({ transaction, isOpen, onClose }: TransactionDetailsDialogProps) {
  if (!isOpen || !transaction) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return colors[status] || "secondary";
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b shrink-0">
          <div>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>View transaction information</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 overflow-y-auto">
          {/* Transaction Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">Transaction #{transaction.id}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(transaction.created_at).toLocaleString()}
              </p>
            </div>
            <Badge variant={getStatusColor(transaction.status)}>
              {transaction.status}
            </Badge>
          </div>

          {/* Vehicle & User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle
              </label>
              <div className="font-semibold">
                {transaction.vehicle?.vehicle_number || "Unknown"}
              </div>
              <div className="text-xs text-muted-foreground">
                {transaction.vehicle?.vehicle_type || "N/A"}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <div className="font-semibold">{transaction.user_name || "Unknown"}</div>
              <div className="text-xs text-muted-foreground">{transaction.user_id}</div>
            </div>
          </div>

          {/* Transaction Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount
              </label>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg font-bold text-orange-600 dark:text-orange-400">
                ₹{transaction.amount}
              </div>
            </div>

            {/* Distance */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Distance</label>
              <div className="p-2 bg-muted rounded">
                {transaction.distance_km ? `${transaction.distance_km} km` : "N/A"}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <div className="p-2 bg-muted rounded">
                {transaction.toll_location || transaction.description || "Toll Zone"}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <div className="p-2 bg-muted rounded">
                {transaction.payment_method || "Wallet"}
              </div>
            </div>

            {/* Device ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Device ID</label>
              <div className="p-2 bg-muted rounded text-xs font-mono">
                {transaction.device_id || "N/A"}
              </div>
            </div>

            {/* Transaction Time */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Transaction Time
              </label>
              <div className="p-2 bg-muted rounded text-sm">
                {new Date(transaction.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>

        <div className="border-t flex gap-2 justify-end p-4 shrink-0 bg-background">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            Download Receipt
          </Button>
        </div>
      </Card>
    </div>
  );
}
