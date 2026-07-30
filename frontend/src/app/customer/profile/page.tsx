"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Lock, LogOut, Trash2 } from "lucide-react";

import { PasswordInputWithLabel } from "@/components/common/PasswordInputWithLabel";
import { PushNotificationControl } from "@/components/common/PushNotificationControl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/api";
import { ChangePasswordForm } from "@/forms/ChangePasswordForm";
import { AccountInformationForm } from "@/forms/AccountInformationForm";
import {
  changePassword,
  deleteAccount,
} from "@/services/customer/user.api";
import {
  forgetBrowserPushEnabledForUser,
  unsubscribeBrowserPushLocally,
} from "@/services/shared/push.api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Profile() {
  const { logout, user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeactivateAccount, setShowDeactivateAccount] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleDeactivateAccount = async () => {
    if (!password) {
      toast.error("Enter your current password");
      return;
    }

    setIsDeactivating(true);
    try {
      await deleteAccount(password);
      await unsubscribeBrowserPushLocally().catch(() => {});
      if (user) {
        forgetBrowserPushEnabledForUser(user.id);
      }
      toast.success("Account deactivated");
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      window.location.replace("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Account could not be deactivated. Please check your password.");
      setIsDeactivating(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setIsLoggingOut(false);
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <div className="w-full h-fit bg-slate-100 p-4 sm:p-6 font-sans">
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

      <div className="mt-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:hidden">
        <h2 className="text-base font-bold text-gray-900">
          Preferences & Session
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage notifications and account access
        </p>

        <PushNotificationControl variant="settings" />

        <div className="border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowLogoutDialog(true)}
            className="flex w-full items-center gap-3 py-5 text-left text-gray-900 transition-colors hover:text-primary"
          >
            <LogOut className="size-5 shrink-0 text-red-500" />
            <span className="flex-1">
              <span className="block text-sm font-bold">Logout</span>
              <span className="mt-0.5 block text-sm font-normal text-gray-500">
                Sign out of your TOL Barbershop account
              </span>
            </span>
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
              Resolve every pending or current/upcoming approved appointment
              before deactivating. Past-due approved appointments do not block
              deactivation.{" "}
              You will be signed out immediately. Sessions, access tokens, push
              subscriptions will be removed. Booking, walk-in, support,
              feedback, notification, and consent records may be retained where
              needed for operations, transparency, disputes, or legal obligations.
              The email address on this account will remain reserved and cannot
              be used to log in or register again.
            </DialogDescription>
          </DialogHeader>
          <PasswordInputWithLabel
            id="deactivate-password"
            label="Current password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            maxLength={255}
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

      <Dialog
        open={showLogoutDialog}
        onOpenChange={(open) => {
          if (!isLoggingOut) setShowLogoutDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
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
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update password. Please try again.");
          }
        }}
      />
    </div>
  );
}
