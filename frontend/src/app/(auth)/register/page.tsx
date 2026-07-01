import Image from "next/image";

import { RegisterForm } from "@/forms/RegisterForm";
import { RedirectIfAuthenticated } from "@/components/common/RedirectIfAuthenticated";

export default function RegisterPage() {
  return (
    <RedirectIfAuthenticated>
      <div className="min-h-screen flex items-center justify-center bg-primary p-4 pb-8">
        <div className="flex w-full max-w-md flex-col items-center px-6 sm:px-12 py-8 bg-white rounded-lg shadow-md">
          <div className="flex space-x-2 items-center">
            <Image src="/logo.svg" alt="Logo" height={40} width={40} />
            <h1 className="font-bold text-primary text-xl ">Tols Barbershop</h1>
          </div>
          <h2 className="text-2xl font-semibold mt-2 text-center">
            Create an Account
          </h2>
          <p className="text-gray-600 mb-6">
            Fill in the details to create your account.
          </p>

          <RegisterForm />
          <p>
            Already have an account?{" "}
            <a href="/login" className="text-accent hover:underline">
              Login
            </a>
          </p>
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
