"use client";

import { useState } from "react";
import { Lock, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PasswordVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function PasswordVerificationDialog({
  isOpen,
  onClose,
  onVerify,
  isLoading = false,
  error = null,
}: PasswordVerificationDialogProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      await onVerify(password);
      setPassword("");
    }
  };

  const handleClose = () => {
    setPassword("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle>Verify Your Password</CardTitle>
              <CardDescription>
                Confirm your admin password to save changes
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Password</label>
              <Input
                type="password"
                placeholder="Enter your admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This is a security measure to prevent unauthorized changes.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!password.trim() || isLoading}
              >
                {isLoading ? "Verifying..." : "Verify & Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
