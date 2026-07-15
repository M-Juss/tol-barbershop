"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Lock, Trash2 } from "lucide-react";

import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordForm } from "@/forms/ChangePasswordForm";
import { AccountInformationForm } from "@/forms/AccountInformationForm";
import {
  changePassword,
  deleteAccount,
} from "@/services/customer/user.api";
import { toast } from "sonner";

export default function Profile() {
  const { logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeactivateAccount, setShowDeactivateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivateAccount = async () => {
    if (!password) {
      toast.error("Enter your current password");
      return;
    }

    setIsDeactivating(true);
    try {
      await deleteAccount(password);
      toast.success("Account deactivated");
      await logout();
    } catch {
      toast.error("Account could not be deactivated. Check your password.");
      setIsDeactivating(false);
    }
  };

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-24 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Profile
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <AccountInformationForm />

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Account Control</h2>
        <p className="text-gray-500 text-sm mt-0.5 ">
          Manage your account settings and security
        </p>

        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-3 py-5 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">Password</p>
            <p className="text-gray-500 text-sm mt-0.5">
              Update your password to keep your account secure
            </p>
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <Lock className="w-4 h-4" strokeWidth={2} />
            Change Password
          </button>
        </div>

        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-3 pt-5">
          <div>
            <p className="text-sm font-bold text-red-500">Deactivate Account</p>
            <p className="text-gray-500 text-sm mt-0.5">
              End account access and submit your account for deactivation
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeactivateAccount(true)}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" strokeWidth={2} />
            Deactivate Account
          </button>
        </div>
      </div>

      <Dialog
        open={showDeactivateAccount}
        onOpenChange={(open) => {
          if (isDeactivating) return;
          setShowDeactivateAccount(open);
          if (!open) setPassword("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Deactivate account
            </DialogTitle>
            <DialogDescription className="text-left leading-6">
              You will be signed out immediately. Sessions, access tokens, push
              subscriptions will be removed. Booking, walk-in, support,
              feedback, notification, and consent records may be retained where
              needed for operations, transparency, disputes, or legal
              obligations.
            </DialogDescription>
          </DialogHeader>
          <PasswordInputWithLabel
            id="deactivate-password"
            label="Current password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={isDeactivating}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            See the{" "}
            <Link href="/privacy-policy" target="_blank" className="text-accent hover:underline">
              Privacy Policy
            </Link>{" "}
            or contact support for a specific data request.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeactivating}
              onClick={() => setShowDeactivateAccount(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeactivating || !password}
              onClick={handleDeactivateAccount}
            >
              {isDeactivating ? "Deactivating..." : "Deactivate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChangePasswordForm
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSubmit={async (payload) => {
          try {
            await changePassword(payload);
            toast.success("Password updated successfully");
          } catch {
            toast.error("Failed to update password");
          }
        }}
      />
      <div className="my-10" />
    </div>
  );
}
