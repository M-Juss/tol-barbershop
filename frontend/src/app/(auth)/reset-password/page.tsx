import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ResetPasswordForm } from "@/forms/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    token?: string | string[];
  }>;
};

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export const revalidate = 0;

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4 pb-8">
      <div className="flex w-full max-w-md flex-col items-center px-6 sm:px-12 py-8 bg-white rounded-lg shadow-md animate-auth-card">
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
          Reset Password
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          Enter your new password below.
        </p>

        <ResetPasswordForm
          key={`${email}:${token}`}
          email={email}
          token={token}
        />
        <p>
          Back to{" "}
          <Link href="/login" className="text-accent hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
