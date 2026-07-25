import type { Metadata } from "next";
import Image from "next/image";

import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";
import { VerifyEmailForm } from "@/forms/VerifyEmailForm";
import { verifyEmailSchema } from "@/validations/auth.validation";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    status?: string | string[];
  }>;
};

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export const revalidate = 0;

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const emailResult = verifyEmailSchema.safeParse({
    email: typeof params.email === "string" ? params.email : "",
  });
  const email = emailResult.success ? emailResult.data.email : "";
  const invalidLink = params.status === "invalid";

  return (
    <RedirectIfAuthenticated>
      <div className="flex min-h-screen items-center justify-center bg-primary p-4 pb-8">
        <div className="flex w-full max-w-md flex-col items-center rounded-lg bg-white px-6 py-8 shadow-md sm:px-12">
          <div className="flex items-center space-x-2">
            <Image
              src="/tol-rounded-logo.png"
              alt="TOL Barbershop logo"
              height={40}
              width={40}
              className="rounded-3xl shadow-md shadow-black/20"
            />
            <h1 className="text-xl font-bold text-primary">TOL Barbershop</h1>
          </div>

          <h2 className="mt-3 text-center text-2xl font-semibold">
            Verify Your Email
          </h2>
          <p className="mb-6 mt-2 text-center text-sm text-gray-600 sm:text-base">
            {email
              ? "Verify your email address to continue."
              : "Your registration email is missing. Return to login and enter your credentials again to continue."}
          </p>

          {email && invalidLink && (
            <div
              className="mb-6 w-full rounded-md border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700"
              role="alert"
            >
              This verification link is invalid or expired. Request a new link
              below.
            </div>
          )}

          {email ? (
            <VerifyEmailForm email={email} />
          ) : (
            <div
              className="w-full rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800"
              role="alert"
            >
              No email address was provided, so verification actions are not
              available.
            </div>
          )}
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
