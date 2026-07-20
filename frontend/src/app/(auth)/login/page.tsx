import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/forms/LoginForm";
import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";

type LoginPageProps = {
  searchParams: Promise<{
    verified?: string | string[];
    password_reset?: string | string[];
    session_expired?: string | string[];
    account_disabled?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const verified =
    params.verified === "1"
      ? "Your email has been verified. You can now log in."
      : params.verified === "already"
        ? "Your email is already verified. You can log in."
        : null;
  const statusMessage =
    params.password_reset === "1"
      ? "Your password has been reset. You can now log in."
      : verified;
  const authMessage =
    params.account_disabled === "1"
      ? "Your account is disabled. Contact the barbershop for assistance."
      : params.session_expired === "1"
        ? "Your session expired. Please log in again."
        : null;

  return (
    <RedirectIfAuthenticated>
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="flex w-full max-w-sm flex-col items-center px-8 py-6 bg-white rounded-lg shadow-md animate-auth-card">
          <div className="flex items-center gap-2">
            <Image
              src="/Tol-Logo-White-Bg.png"
              alt="Logo"
              height={32}
              width={32}
              className="rounded-lg"
            />
            <h1 className="font-bold text-primary text-lg">TOL Barbershop</h1>
          </div>
          <h2 className="text-lg font-semibold mt-2 text-center">
            Login to Your Account
          </h2>
          <p className="text-gray-600 text-sm mb-4 text-center">
            Enter your credentials to access your account.
          </p>

          {statusMessage && (
            <div
              className="mb-4 w-full rounded-md border border-green-200 bg-green-50 p-3 text-center text-xs font-medium text-green-700"
              role="status"
            >
              {statusMessage}
            </div>
          )}

          {authMessage && (
            <div
              className="mb-4 w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-center text-xs font-medium text-amber-800"
              role="alert"
            >
              {authMessage}
            </div>
          )}

          <LoginForm />
          <p className="text-xs mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-accent hover:underline">
              Create one.
            </Link>
          </p>
          <nav
            aria-label="Legal documents"
            className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500"
          >
            <Link href="/privacy-policy" className="hover:text-accent">Privacy</Link>
            <Link href="/terms-of-use" className="hover:text-accent">Terms</Link>
          </nav>
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
