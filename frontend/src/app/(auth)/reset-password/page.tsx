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
      <div className="mobile-modal-surface flex w-full max-w-md flex-col items-center rounded-lg bg-white px-6 py-8 shadow-md animate-auth-card sm:px-12">
        <div className="flex space-x-2 items-center">
          <Image
            src="/tol-rounded-logo.png"
            alt="TOL Barbershop logo"
            height={40}
            width={40}
            className="rounded-3xl shadow-md shadow-black/20"
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
