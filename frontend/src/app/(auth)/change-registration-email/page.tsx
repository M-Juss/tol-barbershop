import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";
import { ChangeRegistrationEmailForm } from "@/forms/ChangeRegistrationEmailForm";
import { verifyEmailSchema } from "@/validations/auth.validation";

type ChangeRegistrationEmailPageProps = {
  searchParams: Promise<{
    email?: string | string[];
  }>;
};

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export const revalidate = 0;

export default async function ChangeRegistrationEmailPage({
  searchParams,
}: ChangeRegistrationEmailPageProps) {
  const params = await searchParams;
  const emailResult = verifyEmailSchema.safeParse({
    email: typeof params.email === "string" ? params.email : "",
  });
  const email = emailResult.success ? emailResult.data.email : "";
  const verificationHref = email
    ? `/verify-email?email=${encodeURIComponent(email)}`
    : "/verify-email";

  return (
    <RedirectIfAuthenticated>
      <div className="flex min-h-screen items-center justify-center bg-primary p-4 py-8">
        <div className="mobile-modal-surface flex w-full max-w-md flex-col items-center rounded-lg bg-white px-6 py-8 shadow-md sm:px-12">
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
            Change Registration Email
          </h2>
          <p className="mb-6 mt-2 text-center text-sm text-gray-600">
            Correct your email address and send verification to the new inbox.
          </p>

          {email ? (
            <ChangeRegistrationEmailForm currentEmail={email} />
          ) : (
            <div
              className="w-full rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800"
              role="alert"
            >
              Your current registration email is missing. Return to
              verification and try again.
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            <Link
              href={verificationHref}
              className="font-medium text-accent hover:underline"
            >
              Back to verification
            </Link>
            <Link href="/" className="text-gray-600 hover:text-accent hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
