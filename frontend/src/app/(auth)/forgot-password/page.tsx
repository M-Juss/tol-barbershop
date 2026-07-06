import Image from "next/image";

import { ForgotPasswordForm } from "@/forms/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4 pb-8">
      <div className="flex w-full max-w-md flex-col items-center px-6 sm:px-12 py-8 bg-white rounded-lg shadow-md">
        <div className="flex space-x-2 items-center">
          <Image src="/logo.svg" alt="Logo" height={40} width={40} />
          <h1 className="font-bold text-primary text-xl ">Tol Barbershop</h1>
        </div>
        <h2 className="text-2xl font-semibold mt-2 text-center">Forgot Password</h2>
        <p className="text-gray-600 mb-6 text-center">
          Enter your account email to generate a reset token.
        </p>

        <ForgotPasswordForm />
        <p>
          Back to{" "}
          <a href="/login" className="text-accent hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
