import Image from "next/image";
import Link from "next/link";

import { RegisterForm } from "@/forms/RegisterForm";
import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";

export default function RegisterPage() {
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
            Create an Account
          </h2>
          <p className="text-gray-600 mb-6">
            Fill in the details to create your account.
          </p>

          <RegisterForm />
          <p className="text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Login
            </Link>
          </p>
          <nav
            aria-label="Legal documents"
            className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500"
          >
            <Link href="/privacy-policy" className="hover:text-accent">Privacy</Link>
            <Link href="/terms-of-use" className="hover:text-accent">Terms</Link>
            <Link href="/data-compliance" className="hover:text-accent">Data Compliance</Link>
          </nav>
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
