import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/forms/LoginForm";
import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";

type LoginPageProps = {
  searchParams: Promise<{
    verified?: string | string[];
    password_reset?: string | string[];
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

  return (
    <RedirectIfAuthenticated>
      <div className="min-h-screen flex items-center justify-center bg-primary p-4 pb-8">
        <div className="flex w-full max-w-md flex-col items-center px-6 sm:px-12 py-8 bg-white rounded-lg shadow-md">
          <div className="flex space-x-2 items-center">
            <Image
              src="/Tol-Logo-White-Bg.png"
              alt="Logo"
              height={40}
              width={40}
              className="rounded-lg"
            />
            <h1 className="font-bold text-primary text-xl ">TOL Barbershop</h1>
          </div>
          <h2 className="text-2xl font-semibold mt-2 text-center">
            Login to Your Account
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            Enter your credentials to access your account.
          </p>

          {statusMessage && (
            <div
              className="mb-6 w-full rounded-md border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-700"
              role="status"
            >
              {statusMessage}
            </div>
          )}

          <LoginForm />
          <p className="text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-accent hover:underline">
              Create one.
            </Link>
          </p>
          <nav
            aria-label="Legal documents"
            className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500"
          >
            <Link href="/privacy-policy" className="hover:text-accent">Privacy</Link>
            <Link href="/terms-of-use" className="hover:text-accent">Terms</Link>
          </nav>
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
