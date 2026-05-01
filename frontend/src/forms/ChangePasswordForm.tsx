import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Lock, X } from "lucide-react";

interface ChangePasswordFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => void;
  title?: string;
  subtitle?: string;
}

export function ChangePasswordForm({
  open,
  onClose,
  onSubmit,
  title = "Change Password",
  subtitle = "Choose a strong password to protect your account.",
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!open) return null;

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const matchesConfirm = newPassword !== "" && newPassword === confirmPassword;
  const passwordsMatchError = confirmPassword !== "" && newPassword !== confirmPassword;

  const isValid = hasMinLength && hasUppercase && hasNumber && hasSymbol && matchesConfirm;

  const resetAndClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit?.({ currentPassword, newPassword, confirmPassword });
    resetAndClose();
  };

  const inputBase =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-11 pr-11 py-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={inputBase}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create new password"
                className={inputBase}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`${inputBase} ${passwordsMatchError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordsMatchError && (
              <p className="text-xs text-red-500 mt-1.5">Passwords do not match.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Password checklist</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
              {[hasMinLength, hasUppercase, hasNumber, hasSymbol].map((ok, index) => (
                <p key={index} className={`flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-slate-500"}`}>
                  {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {index === 0 && "At least 8 characters"}
                  {index === 1 && "One uppercase letter"}
                  {index === 2 && "One number"}
                  {index === 3 && "One special symbol"}
                </p>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
