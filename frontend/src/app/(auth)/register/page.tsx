import Image from "next/image";
import Link from "next/link";

import { RegisterForm } from "@/forms/RegisterForm";
import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";

export default function RegisterPage() {
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
              className="rounded-3xl shadow-md shadow-black/20"
            />
            <h1 className="font-bold text-primary text-lg">TOL Barbershop</h1>
          </div>
          <h2 className="text-lg font-semibold mt-2 text-center">
            Create an Account
          </h2>
          <p className="text-gray-600 text-sm mb-4 text-center">
            Fill in the details to create your account.
          </p>

          <RegisterForm />
          <p className="text-xs mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Login
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
