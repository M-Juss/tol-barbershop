import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/forms/LoginForm";
import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";

type LoginPageProps = {
  searchParams: Promise<{
    password_reset?: string | string[];
    account_disabled?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const statusMessage =
    params.password_reset === "1"
      ? "Your password has been reset. You can now log in."
      : null;
  const authMessage =
    params.account_disabled === "1"
      ? "Your account is disabled. Contact the barbershop for assistance."
      : null;

  return (
    <RedirectIfAuthenticated>
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="mobile-modal-surface flex w-full max-w-sm flex-col items-center rounded-lg bg-white px-5 py-6 shadow-md animate-auth-card sm:px-8">
          <div className="flex items-center gap-2">
            <Image
              src="/tol-rounded-logo.png"
              alt="TOL Barbershop logo"
              height={32}
              width={32}
              priority
              className="rounded-3xl shadow-md shadow-black/20"
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
            <Link href="/privacy-policy" prefetch={false} className="hover:text-accent">Privacy</Link>
            <Link href="/terms-of-use" prefetch={false} className="hover:text-accent">Terms</Link>
          </nav>
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
